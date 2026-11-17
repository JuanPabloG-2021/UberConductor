import { createClient } from "npm:@supabase/supabase-js@2";

type Coordinates = { latitude: number; longitude: number };

function isValidCoordinates(value: Coordinates) {
  return (
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    value.longitude >= -180 &&
    value.longitude <= 180
  );
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const tripId = body.tripId;
  const origin = body.origin as Coordinates;
  if (typeof tripId !== "string" || !origin || !isValidCoordinates(origin)) {
    return Response.json({ error: "Invalid trip or coordinates." }, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data, error: tripError } = await supabase.rpc(
    "driver_get_active_trip"
  );
  if (tripError) {
    return Response.json({ error: tripError.message }, { status: 400 });
  }
  const trip = Array.isArray(data) ? data[0] : data;
  if (
    !trip ||
    trip.id !== tripId ||
    trip.driver_auth_user_id !== userData.user.id ||
    !["driver_arriving", "in_progress"].includes(trip.status)
  ) {
    return new Response("Trip not found or not active.", { status: 404 });
  }

  const destination =
    trip.status === "in_progress"
      ? {
          latitude: Number(trip.destination_latitude),
          longitude: Number(trip.destination_longitude),
        }
      : {
          latitude: Number(trip.origin_latitude),
          longitude: Number(trip.origin_longitude),
        };
  const apiKey = Deno.env.get("GOOGLE_MAPS_DIRECTIONS_API_KEY");
  if (!apiKey) {
    return Response.json(
      { error: "Google Routes no está configurado en Supabase." },
      { status: 503 }
    );
  }

  const routesResponse = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.polyline.encodedPolyline",
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: origin.latitude,
              longitude: origin.longitude,
            },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: destination.latitude,
              longitude: destination.longitude,
            },
          },
        },
        travelMode: "DRIVE",
      }),
    }
  );
  const routesResult = await routesResponse.json();
  if (!routesResponse.ok) {
    return Response.json(
      {
        error:
          routesResult.error?.message ||
          `Google Routes respondió HTTP ${routesResponse.status}.`,
      },
      { status: 502 }
    );
  }
  const points = routesResult.routes?.[0]?.polyline?.encodedPolyline;
  if (!points) {
    return Response.json(
      {
        error: "Google Maps no encontró una ruta para este trayecto.",
      },
      { status: 422 }
    );
  }

  return Response.json({ points });
});
