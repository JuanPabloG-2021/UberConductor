import { createClient } from "npm:@supabase/supabase-js@2";
import { importPKCS8, SignJWT } from "npm:jose@5";

type TripRequest = {
  id: string;
  status: string;
  origin_label: string;
  destination_label: string;
  excluded_driver_ids: string[];
  offered_at: string;
};

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function getGoogleAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  const privateKey = await importPKCS8(
    serviceAccount.private_key.replace(/\\n/g, "\n"),
    "RS256"
  );
  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(serviceAccount.client_email)
    .setSubject(serviceAccount.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) {
    throw new Error(`Google OAuth failed with HTTP ${response.status}.`);
  }
  const result = await response.json();
  return result.access_token as string;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const webhookSecret = requiredEnv("PUSH_WEBHOOK_SECRET");
  if (request.headers.get("authorization") !== `Bearer ${webhookSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const tripId = body.record?.id || body.trip_id;
  if (typeof tripId !== "string") {
    return Response.json({ error: "Missing trip id." }, { status: 400 });
  }

  const supabase = createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select(
      "id, status, origin_label, destination_label, excluded_driver_ids, offered_at"
    )
    .eq("id", tripId)
    .maybeSingle();
  if (tripError) {
    throw tripError;
  }
  if (!trip || trip.status !== "requested") {
    return Response.json({ sent: 0, reason: "Trip is no longer requested." });
  }

  const typedTrip = trip as TripRequest;
  const { data: availableDrivers, error: driversError } = await supabase
    .from("driver_locations")
    .select("auth_user_id")
    .eq("is_available", true)
    .gt("updated_at", new Date(Date.now() - 30000).toISOString());
  if (driversError) {
    throw driversError;
  }
  const availableIds = (availableDrivers || [])
    .map((driver) => driver.auth_user_id)
    .filter((id) => !typedTrip.excluded_driver_ids.includes(id));
  let sent = 0;
  if (availableIds.length > 0) {
    const { data: tokens, error: tokensError } = await supabase
      .from("driver_push_tokens")
      .select("token")
      .in("auth_user_id", availableIds);
    if (tokensError) {
      throw tokensError;
    }

    if (tokens?.length) {
      const serviceAccount = JSON.parse(
        requiredEnv("FIREBASE_SERVICE_ACCOUNT")
      ) as { client_email: string; private_key: string; project_id: string };
      const accessToken = await getGoogleAccessToken(serviceAccount);
      const results = await Promise.all(
        tokens.map(async ({ token }) => {
          const response = await fetch(
            `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(
              serviceAccount.project_id
            )}/messages:send`,
            {
              method: "POST",
              headers: {
                authorization: `Bearer ${accessToken}`,
                "content-type": "application/json",
              },
              body: JSON.stringify({
                message: {
                  token,
                  notification: {
                    title: "Nueva solicitud de viaje",
                    body: "Abre la app para ver los detalles.",
                  },
                  data: { tripId: typedTrip.id, type: "trip_request" },
                  android: { priority: "HIGH" },
                  apns: { payload: { aps: { sound: "default" } } },
                },
              }),
            }
          );
          return response.ok;
        })
      );
      sent = results.filter(Boolean).length;
    }
  }

  const remainingMs = Math.max(
    0,
    new Date(typedTrip.offered_at).getTime() + 15000 - Date.now()
  );
  if (remainingMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, remainingMs));
  }
  const { data: expireResult, error: expireError } = await supabase.rpc(
    "driver_expire_trip_request",
    {
      p_trip_id: typedTrip.id,
      p_expected_offered_at: typedTrip.offered_at,
    }
  );
  if (expireError) {
    throw expireError;
  }

  return Response.json({ sent, expiration: expireResult });
});
