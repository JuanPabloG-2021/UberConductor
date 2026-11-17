import { AppState } from "react-native";
import * as TaskManager from "expo-task-manager";
import { supabase } from "../lib/supabase";

export const DRIVER_LOCATION_TASK = "uber-conductor-driver-location";

if (!TaskManager.isTaskDefined(DRIVER_LOCATION_TASK)) {
  TaskManager.defineTask(DRIVER_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.error("Falló la tarea de ubicación en segundo plano.", error);
      return;
    }

    if (AppState.currentState === "active") {
      return;
    }

    const location = data?.locations?.[0];
    if (!location) {
      return;
    }

    try {
      const { error: saveError } = await supabase.rpc("driver_set_location", {
        p_latitude: location.coords.latitude,
        p_longitude: location.coords.longitude,
        p_is_available: true,
      });
      if (saveError) {
        throw saveError;
      }
    } catch (saveError) {
      console.error(
        "No se pudo sincronizar la ubicación en segundo plano.",
        saveError
      );
    }
  });
}
