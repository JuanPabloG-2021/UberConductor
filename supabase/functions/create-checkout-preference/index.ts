// AI-assisted: see docs/AI_LOG.md #2.
import { createClient } from "npm:@supabase/supabase-js@2";

type TripForPayment = {
  id: string;
  status: string;
  payment_method: string;
  payment_status: string;
  final_fare: number | string | null;
};

type CheckoutSession = {
  preference_id: string;
  checkout_url: string;
};

type MercadoPagoPreference = {
  id?: unknown;
  init_point?: unknown;
  sandbox_init_point?: unknown;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const tripId =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>).tripId
      : undefined;
  if (
    typeof tripId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      tripId
    )
  ) {
    return jsonResponse({ error: "A valid tripId is required." }, 400);
  }

  let supabaseUrl: string;
  let anonKey: string;
  let serviceRoleKey: string;
  let accessToken: string;
  let environment: string;
  try {
    supabaseUrl = requiredEnv("SUPABASE_URL");
    anonKey = requiredEnv("SUPABASE_ANON_KEY");
    serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    accessToken = requiredEnv("MERCADO_PAGO_ACCESS_TOKEN");
    environment = requiredEnv("MERCADO_PAGO_ENVIRONMENT");
  } catch (configurationError) {
    console.error("Checkout preference configuration is incomplete.", configurationError);
    return jsonResponse(
      { error: "El servicio de pago no está configurado." },
      503
    );
  }
  if (environment !== "test" && environment !== "production") {
    return jsonResponse(
      { error: "MERCADO_PAGO_ENVIRONMENT debe ser test o production." },
      503
    );
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: trip, error: tripError } = await adminClient
    .from("trips")
    .select("id, status, payment_method, payment_status, final_fare")
    .eq("id", tripId)
    .eq("requested_by", userData.user.id)
    .maybeSingle();

  if (tripError) {
    console.error("Could not load trip for checkout.", tripError);
    return jsonResponse({ error: "No se pudo consultar el viaje." }, 500);
  }
  if (!trip) {
    return jsonResponse({ error: "No se encontró el viaje." }, 404);
  }

  const typedTrip = trip as TripForPayment;
  if (
    typedTrip.status !== "completed" ||
    typedTrip.payment_method !== "mercado_pago" ||
    !["pending", "rejected"].includes(typedTrip.payment_status)
  ) {
    return jsonResponse(
      { error: "El viaje no está listo para iniciar este pago." },
      409
    );
  }

  const amount = Number(typedTrip.final_fare);
  if (!Number.isFinite(amount) || amount <= 0) {
    return jsonResponse(
      { error: "El viaje no tiene una tarifa final válida." },
      409
    );
  }

  const { data: existingSession, error: existingSessionError } = await adminClient
    .from("mercado_pago_checkout_sessions")
    .select("preference_id, checkout_url")
    .eq("trip_id", typedTrip.id)
    .maybeSingle();
  if (existingSessionError) {
    console.error("Could not load existing Mercado Pago checkout.", existingSessionError);
    return jsonResponse(
      { error: "No se pudo consultar el checkout existente." },
      500
    );
  }
  if (existingSession) {
    const typedSession = existingSession as CheckoutSession;
    return jsonResponse({
      preferenceId: typedSession.preference_id,
      checkoutUrl: typedSession.checkout_url,
    });
  }

  const returnUrl = "uberconductor://checkout/return";
  const preferenceBody: Record<string, unknown> = {
    items: [
      {
        id: typedTrip.id,
        title: "Servicio de transporte",
        quantity: 1,
        currency_id: "COP",
        unit_price: amount,
      },
    ],
    external_reference: typedTrip.id,
    back_urls: {
      success: returnUrl,
      pending: returnUrl,
      failure: returnUrl,
    },
    auto_return: "approved",
  };

  const notificationUrl =
    Deno.env.get("MERCADO_PAGO_NOTIFICATION_URL") ||
    `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/mercado-pago-webhook`;
  try {
    if (new URL(notificationUrl).protocol !== "https:") {
      throw new Error("Notification URL must use HTTPS.");
    }
  } catch (configurationError) {
    console.error("Invalid Mercado Pago notification URL.", configurationError);
    return jsonResponse(
      { error: "La URL del webhook debe ser HTTPS." },
      503
    );
  }
  preferenceBody.notification_url = notificationUrl;

  let mercadoPagoResponse: Response;
  try {
    mercadoPagoResponse = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferenceBody),
      }
    );
  } catch (requestError) {
    console.error("Could not reach Mercado Pago.", requestError);
    return jsonResponse(
      { error: "No se pudo conectar con Mercado Pago." },
      502
    );
  }

  let preferencePayload: unknown;
  try {
    preferencePayload = await mercadoPagoResponse.json();
  } catch (responseError) {
    console.error("Mercado Pago returned an invalid response.", responseError);
    return jsonResponse(
      { error: "Mercado Pago devolvió una respuesta inválida." },
      502
    );
  }

  if (
    !preferencePayload ||
    typeof preferencePayload !== "object" ||
    Array.isArray(preferencePayload)
  ) {
    console.error("Mercado Pago returned an invalid preference response.");
    return jsonResponse(
      { error: "Mercado Pago devolvió una respuesta inválida." },
      502
    );
  }
  const preference = preferencePayload as MercadoPagoPreference;

  if (!mercadoPagoResponse.ok) {
    console.error(
      `Mercado Pago preference creation failed with HTTP ${mercadoPagoResponse.status}.`
    );
    return jsonResponse(
      { error: "Mercado Pago no pudo crear la preferencia de pago." },
      502
    );
  }

  const checkoutUrl =
    environment === "test"
      ? preference.sandbox_init_point
      : preference.init_point;
  if (
    typeof preference.id !== "string" ||
    !preference.id ||
    typeof checkoutUrl !== "string"
  ) {
    console.error("Mercado Pago response is missing preference ID or checkout URL.");
    return jsonResponse(
      { error: "Mercado Pago no devolvió los datos del checkout." },
      502
    );
  }
  try {
    if (new URL(checkoutUrl).protocol !== "https:") {
      throw new Error("Checkout URL must use HTTPS.");
    }
  } catch (responseError) {
    console.error("Mercado Pago returned an invalid checkout URL.", responseError);
    return jsonResponse(
      { error: "Mercado Pago devolvió una URL de checkout inválida." },
      502
    );
  }

  const { error: saveSessionError } = await adminClient
    .from("mercado_pago_checkout_sessions")
    .insert({
      trip_id: typedTrip.id,
      preference_id: preference.id,
      checkout_url: checkoutUrl,
    });
  if (saveSessionError) {
    if (saveSessionError.code === "23505") {
      const { data: winningSession, error: winningSessionError } = await adminClient
        .from("mercado_pago_checkout_sessions")
        .select("preference_id, checkout_url")
        .eq("trip_id", typedTrip.id)
        .maybeSingle();
      if (!winningSessionError && winningSession) {
        const typedSession = winningSession as CheckoutSession;
        return jsonResponse({
          preferenceId: typedSession.preference_id,
          checkoutUrl: typedSession.checkout_url,
        });
      }
    }

    console.error("Could not save Mercado Pago checkout.", saveSessionError);
    return jsonResponse(
      { error: "No se pudo guardar la preferencia de pago." },
      500
    );
  }

  return jsonResponse({
    preferenceId: preference.id,
    checkoutUrl,
  });
});
