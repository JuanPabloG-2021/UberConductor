import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { supabase } from "../lib/supabase";
import { DRIVER_LOCATION_TASK } from "../services/driverLocationTask";

const AVAILABILITY_KEY = "driver:last-availability";

export function useDriverLocation(isFocused) {
  const [location, setLocation] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const setAvailability = useCallback(async (nextAvailability) => {
    setError(null);
    if (nextAvailability) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        throw new Error(
          "Se necesita permiso de ubicación para activar la disponibilidad."
        );
      }

      const backgroundPermission =
        await Location.requestBackgroundPermissionsAsync();
      if (backgroundPermission.status !== "granted") {
        throw new Error(
          "Permite el acceso a la ubicación en segundo plano para mantener la disponibilidad."
        );
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextLocation = current.coords;
      const { error: saveError } = await supabase.rpc("driver_set_location", {
        p_latitude: nextLocation.latitude,
        p_longitude: nextLocation.longitude,
        p_is_available: true,
      });
      if (saveError) {
        throw saveError;
      }
      setLocation(nextLocation);
    } else {
      const { error: saveError } = await supabase.rpc("driver_set_location", {
        p_latitude: locationRef.current?.latitude ?? null,
        p_longitude: locationRef.current?.longitude ?? null,
        p_is_available: false,
      });
      if (saveError) {
        throw saveError;
      }
    }

    setIsAvailable(nextAvailability);
    try {
      await AsyncStorage.setItem(AVAILABILITY_KEY, String(nextAvailability));
    } catch (storageError) {
      console.error("No se pudo guardar la preferencia de disponibilidad.", storageError);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const restoreAvailability = async () => {
      try {
        const savedAvailability = await AsyncStorage.getItem(AVAILABILITY_KEY);
        if (savedAvailability === "true") {
          try {
            await setAvailability(true);
          } catch (availabilityError) {
            console.error(
              "No se pudo restaurar la disponibilidad guardada.",
              availabilityError
            );
            if (isMounted) {
              setError(availabilityError.message);
              setIsAvailable(false);
            }
            try {
              const { error: syncError } = await supabase.rpc(
                "driver_set_location",
                {
                  p_latitude: null,
                  p_longitude: null,
                  p_is_available: false,
                }
              );
              if (syncError) {
                throw syncError;
              }
            } catch (syncError) {
              console.error(
                "No se pudo restaurar el estado no disponible.",
                syncError
              );
            }
            await AsyncStorage.setItem(AVAILABILITY_KEY, "false");
          }
        } else if (isMounted) {
          setIsAvailable(false);
        }
      } catch (storageError) {
        console.error(
          "No se pudo cargar la preferencia de disponibilidad.",
          storageError
        );
        if (isMounted) {
          setError(storageError.message);
        }
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    };
    restoreAvailability();

    return () => {
      isMounted = false;
    };
  }, [setAvailability]);

  useEffect(() => {
    if (!isFocused || !isReady || !isAvailable) {
      return undefined;
    }

    let isMounted = true;
    let subscription;
    const startWatching = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          throw new Error("Se revocó el permiso de ubicación.");
        }
        const backgroundPermission =
          await Location.getBackgroundPermissionsAsync();
        if (backgroundPermission.status !== "granted") {
          throw new Error(
            "Se necesita permiso de ubicación en segundo plano para estar disponible."
          );
        }
        if (!isMounted) {
          return;
        }
        const taskAlreadyStarted =
          await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
        if (!taskAlreadyStarted) {
          await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 5,
            timeInterval: 5000,
            pausesUpdatesAutomatically: false,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
              notificationTitle: "UberConductor",
              notificationBody: "Compartiendo ubicación mientras estás disponible.",
              notificationColor: "#000000",
            },
          });
        }
        if (!isMounted) {
          await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
          return;
        }
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 5,
          },
          async ({ coords }) => {
            if (!isMounted) {
              return;
            }
            setLocation(coords);
            try {
              const { error: saveError } = await supabase.rpc(
                "driver_set_location",
                {
                  p_latitude: coords.latitude,
                  p_longitude: coords.longitude,
                  p_is_available: true,
                }
              );
              if (saveError) {
                throw saveError;
              }
            } catch (saveError) {
              if (isMounted) {
                setError(saveError.message);
              }
            } finally {
              if (!isMounted) {
                subscription?.remove();
              }
            }
          }
        );
      } catch (locationError) {
        if (isMounted) {
          setError(locationError.message);
          setIsAvailable(false);
          const { error: stopError } = await supabase.rpc(
            "driver_set_location",
            {
              p_latitude: null,
              p_longitude: null,
              p_is_available: false,
            }
          );
          if (stopError) {
            console.error(
              "No se pudo marcar al conductor como no disponible.",
              stopError
            );
          }
          AsyncStorage.setItem(AVAILABILITY_KEY, "false").catch((storageError) =>
            console.error("No se pudo guardar la preferencia de disponibilidad.", storageError)
          );
        }
      }
    };
    startWatching();

    return () => {
      isMounted = false;
      subscription?.remove();
      Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK)
        .then((started) =>
          started ? Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK) : null
        )
        .catch((stopError) =>
          console.error("No se pudo detener la tarea de ubicación.", stopError)
        );
    };
  }, [isAvailable, isFocused, isReady]);

  return { location, isAvailable, isReady, error, setAvailability };
}
