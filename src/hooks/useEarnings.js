import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

export function useEarnings(userId) {
  const [trips, setTrips] = useState([]);
  const [storedTotals, setStoredTotals] = useState({ day: 0, week: 0, month: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setTrips([]);
      setStoredTotals({ day: 0, week: 0, month: 0 });
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [tripResult, totalsResult] = await Promise.all([
        supabase
          .from("trips")
          .select(
            "id, origin_label, destination_label, distance_km, duration_minutes, category, payment_method, estimated_fare, estimated_commission, estimated_driver_net, final_fare, commission_amount, driver_net_amount, payment_status, status, requested_at, completed_at, paid_at"
          )
          .eq("driver_auth_user_id", userId)
          .in("status", ["completed", "paid"])
          .order("completed_at", { ascending: false })
          .limit(200),
        supabase.rpc("driver_get_earnings"),
      ]);
      if (tripResult.error) {
        throw tripResult.error;
      }
      if (totalsResult.error) {
        throw totalsResult.error;
      }
      setError(null);
      setTrips(tripResult.data || []);
      setStoredTotals(totalsResult.data || { day: 0, week: 0, month: 0 });
    } catch (queryError) {
      setError(queryError);
      throw queryError;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let isMounted = true;
    refresh().catch((queryError) => {
      if (isMounted) {
        console.error("No se pudieron cargar las ganancias del conductor.", queryError);
      }
    });
    const channel = userId
      ? supabase
          .channel(`driver-earnings-${userId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "trips",
              filter: `driver_auth_user_id=eq.${userId}`,
            },
            () =>
              refresh().catch((queryError) =>
                console.error("No se pudieron actualizar las ganancias.", queryError)
              )
          )
          .subscribe()
      : null;

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [refresh, userId]);

  const totals = useMemo(
    () => ({
      day: Number(storedTotals.day || 0),
      week: Number(storedTotals.week || 0),
      month: Number(storedTotals.month || 0),
    }),
    [storedTotals]
  );

  return { trips, totals, isLoading, error, refresh };
}
