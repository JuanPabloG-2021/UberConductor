import { supabase } from "../lib/supabase";

// AI-assisted: see docs/AI_LOG.md #3.
export async function createMercadoPagoCheckout(tripId) {
  const { data, error } = await supabase.functions.invoke(
    "create-checkout-preference",
    { body: { tripId } }
  );
  if (error) {
    throw error;
  }
  if (
    typeof data?.preferenceId !== "string" ||
    typeof data?.checkoutUrl !== "string"
  ) {
    throw new Error("Supabase no devolvió una URL de checkout válida.");
  }
  return data;
}

export async function getPassengerTrip(tripId, userId) {
  const { data, error } = await supabase
    .from("trips")
    .select(
      "id, status, payment_method, payment_status, final_fare, commission_amount, driver_net_amount, origin_label, destination_label"
    )
    .eq("id", tripId)
    .eq("requested_by", userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error("No se encontró el viaje de prueba del pasajero.");
  }
  return data;
}
