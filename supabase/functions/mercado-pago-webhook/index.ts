import { createClient } from "npm:@supabase/supabase-js@2";

type PaymentEvent = {
  type?: unknown;
  data?: { id?: unknown };
};

type MercadoPagoPayment = {
  id?: unknown;
  status?: unknown;
  external_reference?: unknown;
  currency_id?: unknown;
  transaction_amount?: unknown;
  live_mode?: unknown;
};

type TripForPayment = {
  id: string;
  status: string;
  payment_method: string;
  final_fare: number | string | null;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status });
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function signatureParts(value: string) {
  const parts = new Map<string, string>();
  for (const part of value.split(",")) {
    const separator = part.indexOf("=");
    if (separator < 0) {
      parts.set(part.trim(), "");
    } else {
      parts.set(
        part.slice(0, separator).trim(),
        part.slice(separator + 1).trim()
      );
    }
  }
  return parts;
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function validateSignature(
  secret: string,
  signature: string,
  requestId: string,
  dataId: string
) {
  const parts = signatureParts(signature);
  const timestamp = parts.get("ts");
  const receivedHash = parts.get("v1");
  if (!timestamp || !receivedHash) {
    return false;
  }

  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest))
  );
  const expectedHash = Array.from(digest, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");

  return constantTimeEqual(expectedHash, receivedHash.toLowerCase());
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  let eventPayload: unknown;
  try {
    eventPayload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }
  if (
    !eventPayload ||
    typeof eventPayload !== "object" ||
    Array.isArray(eventPayload)
  ) {
    return jsonResponse({ error: "Invalid notification body." }, 400);
  }
  const event = eventPayload as PaymentEvent;

  const url = new URL(request.url);
  const eventType = url.searchParams.get("type") || event.type;
  if (eventType !== "payment") {
    return jsonResponse({ received: true, ignored: true });
  }

  const dataId = url.searchParams.get("data.id") || "";
  const bodyDataId = event.data?.id;
  const requestId = request.headers.get("x-request-id");
  const signature = request.headers.get("x-signature");
  if (
    !dataId ||
    !/^\d+$/.test(dataId) ||
    (bodyDataId != null && String(bodyDataId) !== dataId) ||
    !requestId ||
    !signature
  ) {
    return jsonResponse({ error: "Missing or invalid notification data." }, 400);
  }

  let supabaseUrl: string;
  let serviceRoleKey: string;
  let accessToken: string;
  let webhookSecret: string;
  let environment: string;
  try {
    supabaseUrl = requiredEnv("SUPABASE_URL");
    serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    accessToken = requiredEnv("MERCADO_PAGO_ACCESS_TOKEN");
    webhookSecret = requiredEnv("MERCADO_PAGO_WEBHOOK_SECRET");
    environment = requiredEnv("MERCADO_PAGO_ENVIRONMENT");
  } catch (configurationError) {
    console.error("Mercado Pago webhook configuration is incomplete.", configurationError);
    return jsonResponse({ error: "Webhook configuration is incomplete." }, 503);
  }
  if (environment !== "test" && environment !== "production") {
    return jsonResponse({ error: "Invalid Mercado Pago environment." }, 503);
  }

  let isSignatureValid: boolean;
  try {
    isSignatureValid = await validateSignature(
      webhookSecret,
      signature,
      requestId,
      dataId
    );
  } catch (signatureError) {
    console.error("Could not validate Mercado Pago webhook signature.", signatureError);
    return jsonResponse({ error: "Could not validate notification." }, 500);
  }
  if (!isSignatureValid) {
    return jsonResponse({ error: "Invalid notification signature." }, 401);
  }

  let paymentResponse: Response;
  try {
    paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (paymentRequestError) {
    console.error("Could not retrieve Mercado Pago payment.", paymentRequestError);
    return jsonResponse({ error: "Could not retrieve payment." }, 502);
  }
  if (!paymentResponse.ok) {
    console.error(
      `Mercado Pago payment lookup failed with HTTP ${paymentResponse.status}.`
    );
    return jsonResponse({ error: "Could not retrieve payment." }, 502);
  }

  let paymentPayload: unknown;
  try {
    paymentPayload = await paymentResponse.json();
  } catch (paymentResponseError) {
    console.error("Mercado Pago returned an invalid payment response.", paymentResponseError);
    return jsonResponse({ error: "Invalid payment response." }, 502);
  }
  if (
    !paymentPayload ||
    typeof paymentPayload !== "object" ||
    Array.isArray(paymentPayload)
  ) {
    return jsonResponse({ error: "Invalid payment response." }, 502);
  }
  const payment = paymentPayload as MercadoPagoPayment;

  if (String(payment.id) !== dataId) {
    return jsonResponse({ error: "Payment ID mismatch." }, 400);
  }
  if (
    (environment === "test" && payment.live_mode !== false) ||
    (environment === "production" && payment.live_mode !== true)
  ) {
    console.error("Mercado Pago payment mode does not match configured environment.");
    return jsonResponse({ received: true, applied: false }, 200);
  }

  if (payment.status !== "approved" && payment.status !== "rejected") {
    return jsonResponse({
      received: true,
      applied: false,
      status: payment.status,
    });
  }

  const tripId = payment.external_reference;
  if (
    typeof tripId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      tripId
    )
  ) {
    console.error("Mercado Pago payment has no valid trip reference.");
    return jsonResponse({ received: true, applied: false }, 200);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id, status, payment_method, final_fare")
    .eq("id", tripId)
    .maybeSingle();
  if (tripError) {
    console.error("Could not load trip for Mercado Pago payment.", tripError);
    return jsonResponse({ error: "Could not load trip." }, 500);
  }
  if (!trip) {
    console.error("Mercado Pago payment references a missing trip.");
    return jsonResponse({ received: true, applied: false }, 200);
  }

  const typedTrip = trip as TripForPayment;
  const paymentAmount = Number(payment.transaction_amount);
  const tripAmount = Number(typedTrip.final_fare);
  if (
    typedTrip.payment_method !== "mercado_pago" ||
    !["completed", "paid"].includes(typedTrip.status) ||
    payment.currency_id !== "COP" ||
    !Number.isFinite(paymentAmount) ||
    !Number.isFinite(tripAmount) ||
    Math.round(paymentAmount * 100) !== Math.round(tripAmount * 100)
  ) {
    console.error("Mercado Pago payment does not match the trip.");
    return jsonResponse({ received: true, applied: false }, 200);
  }

  const { error: updateError } = await supabase.rpc(
    "apply_mercado_pago_payment",
    {
      p_trip_id: tripId,
      p_payment_id: dataId,
      p_payment_status: payment.status,
    }
  );
  if (updateError) {
    console.error("Could not apply Mercado Pago payment to trip.", updateError);
    return jsonResponse({ error: "Could not update payment status." }, 500);
  }

  return jsonResponse({ received: true, applied: true });
});
