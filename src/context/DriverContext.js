import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useTripRequests } from "../hooks/useTripRequests";
import { useDriverNotifications } from "../hooks/useDriverNotifications";

const DriverContext = createContext(null);

export function DriverProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState(null);
  const [tripRequestsEnabled, setTripRequestsEnabled] = useState(false);
  const driverAvailabilityAction = useRef(null);
  const tripRequests = useTripRequests(user?.id, tripRequestsEnabled);
  const notifications = useDriverNotifications(user?.id);

  const registerDriverAvailabilityAction = useCallback((action) => {
    driverAvailabilityAction.current = action;
    return () => {
      if (driverAvailabilityAction.current === action) {
        driverAvailabilityAction.current = null;
      }
    };
  }, []);

  const setDriverAvailability = useCallback((nextAvailability) => {
    if (!driverAvailabilityAction.current) {
      throw new Error("No está disponible la acción de disponibilidad del conductor.");
    }
    return driverAvailabilityAction.current(nextAvailability);
  }, []);

  const refreshActiveTrip = useCallback(async () => {
    const { data, error } = await supabase.rpc("driver_get_active_trip");
    if (error) {
      throw error;
    }

    setActiveTrip(Array.isArray(data) ? data[0] || null : data || null);
  }, []);

  useEffect(() => {
    let isMounted = true;
    let channel;

    const load = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          throw error;
        }
        if (!isMounted) {
          return;
        }

        const currentUser = data.session?.user || null;
        setUser(currentUser);
        if (currentUser) {
          const { data: tripData, error: tripError } = await supabase.rpc(
            "driver_get_active_trip"
          );
          if (tripError) {
            throw tripError;
          }
          if (isMounted) {
            setActiveTrip(
              Array.isArray(tripData) ? tripData[0] || null : tripData || null
            );
            channel = supabase
              .channel(`driver-active-trip-${currentUser.id}`)
              .on(
                "postgres_changes",
                {
                  event: "*",
                  schema: "public",
                  table: "trips",
                  filter: `driver_auth_user_id=eq.${currentUser.id}`,
                },
                (payload) => {
                  if (payload.new?.status === "paid") {
                    setActiveTrip((current) =>
                      current?.id === payload.new.id ? payload.new : current
                    );
                    return;
                  }
                  refreshActiveTrip().catch((refreshError) =>
                    console.error("No se pudo actualizar el viaje activo.", refreshError)
                  );
                }
              )
              .subscribe();
          }
        }
      } catch (error) {
        if (isMounted) {
          setSessionError(error.message);
        }
        console.error("No se pudo cargar la sesión del conductor.", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
        if (!session?.user) {
          setActiveTrip(null);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [refreshActiveTrip]);

  const value = useMemo(
    () => ({
      user,
      activeTrip,
      setActiveTrip,
      refreshActiveTrip,
      isLoading,
      sessionError,
      setTripRequestsEnabled,
      registerDriverAvailabilityAction,
      setDriverAvailability,
      ...tripRequests,
      ...notifications,
    }),
    [
      user,
      activeTrip,
      refreshActiveTrip,
      isLoading,
      sessionError,
      setTripRequestsEnabled,
      registerDriverAvailabilityAction,
      setDriverAvailability,
      tripRequests,
      notifications,
    ]
  );

  return <DriverContext.Provider value={value}>{children}</DriverContext.Provider>;
}

export function useDriverSession() {
  const context = useContext(DriverContext);
  if (!context) {
    throw new Error("useDriverSession debe usarse dentro de DriverProvider.");
  }
  return context;
}
