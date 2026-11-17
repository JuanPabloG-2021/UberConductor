import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Location from "expo-location";
import { supabase } from "../lib/supabase";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useDriverSession } from "../context/DriverContext";
import { advanceTrip, cancelTrip } from "../services/driverRuntime";
import { decodeGooglePolyline } from "../utils/googlePolyline";
import {
  DriverButton,
  DriverError,
  driverStyles,
} from "../components/driver/DriverComponents";
import { colors, radius, spacing, typography } from "../themes";

function coordinate(latitude, longitude) {
  return { latitude: Number(latitude), longitude: Number(longitude) };
}

export default function ActiveTrip({ navigation, route }) {
  const { activeTrip, setActiveTrip } = useDriverSession();
  const [routePoints, setRoutePoints] = useState([]);
  const [routeError, setRouteError] = useState(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const trip = activeTrip;
  const isPassengerOnboard = trip?.status === "in_progress";
  const origin = useMemo(
    () =>
      trip &&
      coordinate(trip.origin_latitude, trip.origin_longitude),
    [trip?.origin_latitude, trip?.origin_longitude]
  );
  const destination = useMemo(
    () =>
      trip &&
      coordinate(trip.destination_latitude, trip.destination_longitude),
    [trip?.destination_latitude, trip?.destination_longitude]
  );

  useEffect(() => {
    if (!trip) {
      navigation.replace("DriverHome");
      return;
    }
    if (trip.status === "accepted") {
      advanceTrip(trip.id, "driver_arriving")
        .then(setActiveTrip)
        .catch((statusError) => setError(statusError.message));
    }
  }, [navigation, setActiveTrip, trip]);

  useEffect(() => {
    if (!trip || !origin || !destination) {
      return undefined;
    }
    let isMounted = true;
    setIsLoadingRoute(true);
    setRouteError(null);
    setRoutePoints([]);
    const loadRoute = async () => {
      try {
        const routeOrigin = isPassengerOnboard
          ? origin
          : (await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
              })).coords;
        const { data, error: directionsError } =
          await supabase.functions.invoke("get-trip-route", {
              body: {
                tripId: trip.id,
                origin: {
                  latitude: routeOrigin.latitude,
                  longitude: routeOrigin.longitude,
                },
              },
          });
        if (directionsError) {
          throw directionsError;
        }
        if (!data?.points) {
          throw new Error("Google Maps no devolvió una ruta válida.");
        }
        if (isMounted) {
          setRoutePoints(decodeGooglePolyline(data.points));
        }
      } catch (routeRequestError) {
        if (isMounted) {
          setRouteError(routeRequestError.message);
        }
      } finally {
        if (isMounted) {
          setIsLoadingRoute(false);
        }
      }
    };
    loadRoute();

    return () => {
      isMounted = false;
    };
  }, [destination, isPassengerOnboard, origin, trip?.id]);

  const advance = useCallback(
    async (status) => {
      if (!trip || isUpdating) {
        return;
      }
      setIsUpdating(true);
      setError(null);
      try {
        const updatedTrip = await advanceTrip(trip.id, status);
        setActiveTrip(updatedTrip);
        if (status === "completed") {
          navigation.replace("TripSummary", { tripId: updatedTrip.id });
        }
      } catch (statusError) {
        setError(statusError.message);
      } finally {
        setIsUpdating(false);
      }
    },
    [isUpdating, navigation, setActiveTrip, trip]
  );

  const confirmCancel = useCallback(() => {
    if (!trip) {
      return;
    }
    Alert.alert(
      "Cancelar viaje",
      "¿Quieres cancelar este viaje antes de recoger al pasajero?",
      [
        { text: "Seguir viaje", style: "cancel" },
        {
          text: "Cancelar viaje",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelTrip(trip.id);
              setActiveTrip(null);
              navigation.replace("DriverHome");
            } catch (cancelError) {
              setError(cancelError.message);
            }
          },
        },
      ]
    );
  }, [navigation, setActiveTrip, trip]);

  if (!trip || !origin || !destination) {
    return (
      <View style={styles.center}>
        <Text style={driverStyles.subtitle}>No hay un viaje activo para mostrar.</Text>
      </View>
    );
  }

  const mapRegion = {
    ...(isPassengerOnboard ? destination : origin),
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  return (
    <View style={styles.container}>
      <MapView initialRegion={mapRegion} region={mapRegion} style={StyleSheet.absoluteFill}>
        <Marker coordinate={origin} title="Punto de recogida" />
        <Marker coordinate={destination} title="Destino" pinColor="green" />
        {routePoints.length > 1 ? (
          <Polyline coordinates={routePoints} strokeColor={colors.text} strokeWidth={5} />
        ) : null}
      </MapView>
      <View style={styles.card}>
        <Text style={driverStyles.sectionTitle}>
          {isPassengerOnboard ? "Hacia el destino" : "Hacia el punto de recogida"}
        </Text>
        <Text style={styles.address}>{isPassengerOnboard ? trip.destination_label : trip.origin_label}</Text>
        {isLoadingRoute ? <ActivityIndicator color={colors.text} /> : null}
        <DriverError>{routeError || error}</DriverError>
        {trip.status === "driver_arriving" ? (
          <DriverButton
            label="Pasajero a bordo"
            loading={isUpdating}
            onPress={() => advance("in_progress")}
          />
        ) : trip.status === "in_progress" ? (
          <DriverButton
            label="Finalizar viaje"
            loading={isUpdating}
            onPress={() => advance("completed")}
          />
        ) : (
          <Text style={styles.status}>Actualizando el estado del viaje…</Text>
        )}
        {trip.status !== "in_progress" ? (
          <DriverButton
            danger
            disabled={isUpdating}
            label="Cancelar viaje"
            onPress={confirmCancel}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    bottom: spacing.md,
    elevation: 5,
    left: spacing.md,
    padding: spacing.md,
    position: "absolute",
    right: spacing.md,
  },
  address: {
    color: colors.text,
    fontSize: typography.body,
    marginBottom: spacing.sm,
  },
  status: {
    color: colors.secondaryText,
    fontSize: typography.bodySmall,
    marginTop: spacing.sm,
  },
  center: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
});
