import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

export function useTripRequests(userId, enabled = false) {
  const [requestState, setRequestState] = useState({
    userId: null,
    requests: [],
    error: null,
  });
  const refreshGeneration = useRef(0);

  const refreshRequests = useCallback(async () => {
    if (!userId || !enabled) {
      return [];
    }

    const generation = refreshGeneration.current;
    setRequestState((current) => ({
      userId,
      requests: current.userId === userId ? current.requests : [],
      error: null,
    }));
    const { data, error: requestError } = await supabase.rpc(
      "driver_get_trip_requests"
    );
    if (generation !== refreshGeneration.current) {
      return [];
    }
    if (requestError) {
      setRequestState((current) => ({
        userId,
        requests: current.userId === userId ? current.requests : [],
        error: requestError,
      }));
      throw requestError;
    }

    setRequestState({
      userId,
      requests: Array.isArray(data) ? data : [],
      error: null,
    });
    return Array.isArray(data) ? data : [];
  }, [enabled, userId]);

  useEffect(() => {
    if (!userId || !enabled) {
      refreshGeneration.current += 1;
      return undefined;
    }

    const generation = ++refreshGeneration.current;
    let isMounted = true;
    let refreshTimer;
    const refresh = async () => {
      try {
        await refreshRequests();
      } catch (requestError) {
        if (isMounted && generation === refreshGeneration.current) {
          console.error("No se pudieron consultar solicitudes.", requestError);
        }
      }
    };
    const channel = supabase
      .channel(`driver-trip-requests-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trips" },
        () => {
          clearTimeout(refreshTimer);
          refreshTimer = setTimeout(refresh, 250);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          refresh();
        }
      });

    return () => {
      isMounted = false;
      refreshGeneration.current += 1;
      clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [enabled, refreshRequests, userId]);

  const acceptRequest = useCallback(
    async (tripId) => {
      const { data, error: acceptError } = await supabase.rpc(
        "driver_accept_trip",
        { p_trip_id: tripId }
      );
      if (acceptError) {
        throw acceptError;
      }
      setRequestState((current) =>
        current.userId === userId
          ? {
              ...current,
              requests: current.requests.filter((trip) => trip.id !== tripId),
            }
          : current
      );
      return data;
    },
    [userId]
  );

  const rejectRequest = useCallback(
    async (tripId) => {
      const { data, error: rejectError } = await supabase.rpc(
        "driver_reject_trip",
        { p_trip_id: tripId }
      );
      if (rejectError) {
        throw rejectError;
      }
      setRequestState((current) =>
        current.userId === userId
          ? {
              ...current,
              requests: current.requests.filter((trip) => trip.id !== tripId),
            }
          : current
      );
      return data;
    },
    [userId]
  );

  const dismissRequest = useCallback(
    (tripId) => {
      setRequestState((current) =>
        current.userId === userId
          ? {
              ...current,
              requests: current.requests.filter((trip) => trip.id !== tripId),
            }
          : current
      );
    },
    [userId]
  );

  const isCurrentUser = requestState.userId === userId;
  return {
    requests: isCurrentUser ? requestState.requests : [],
    error: enabled && isCurrentUser ? requestState.error : null,
    refreshRequests,
    acceptRequest,
    rejectRequest,
    dismissRequest,
  };
}
