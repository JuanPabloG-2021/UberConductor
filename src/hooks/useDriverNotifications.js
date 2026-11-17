import { useEffect, useState } from "react";
import {
  PermissionsAndroid,
  Platform,
} from "react-native";
import { supabase } from "../lib/supabase";

export function useDriverNotifications(userId) {
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setNotification(null);
      return undefined;
    }

    let isMounted = true;
    let unsubscribeMessage;
    let unsubscribeToken;
    let unsubscribeOpened;
    const setup = async () => {
      const messaging = await import(
        "@react-native-firebase/messaging"
      );
      const client = messaging.getMessaging();
      if (Platform.OS === "android" && Number(Platform.Version) >= 33) {
        const permission = await PermissionsAndroid.request(
          "android.permission.POST_NOTIFICATIONS"
        );
        if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new Error("Permite las notificaciones para recibir solicitudes.");
        }
      }
      const permission = await messaging.requestPermission(client);
      const authorized =
        permission === messaging.AuthorizationStatus.AUTHORIZED ||
        permission === messaging.AuthorizationStatus.PROVISIONAL;
      if (!authorized) {
        throw new Error("Permite las notificaciones para recibir solicitudes.");
      }

      await messaging.registerDeviceForRemoteMessages(client);
      const token = await messaging.getToken(client);
      const { error: tokenError } = await supabase.rpc(
        "driver_register_push_token",
        { p_token: token }
      );
      if (tokenError) {
        throw tokenError;
      }
      if (!isMounted) {
        return;
      }

      unsubscribeMessage = messaging.onMessage(client, (message) => {
        setNotification(message);
      });
      unsubscribeToken = messaging.onTokenRefresh(client, (nextToken) => {
        supabase
          .rpc("driver_register_push_token", { p_token: nextToken })
          .then(({ error: refreshError }) => {
            if (refreshError) {
              console.error("No se pudo actualizar el token de notificaciones.", refreshError);
            }
          });
      });
      unsubscribeOpened = messaging.onNotificationOpenedApp(client, (message) => {
        setNotification(message);
      });
      const initialNotification = await messaging.getInitialNotification(client);
      if (initialNotification && isMounted) {
        setNotification(initialNotification);
      }
      setError(null);
    };

    setup().catch((setupError) => {
      if (isMounted) {
        setError(
          `No se pudieron activar las notificaciones push: ${setupError.message}`
        );
      }
      console.error("No se pudieron configurar las notificaciones FCM.", setupError);
    });

    return () => {
      isMounted = false;
      unsubscribeMessage?.();
      unsubscribeToken?.();
      unsubscribeOpened?.();
    };
  }, [userId]);

  return { notification, notificationError: error };
}
