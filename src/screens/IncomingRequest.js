import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useDriverSession } from "../context/DriverContext";
import {
  DriverButton,
  DriverError,
  DriverPage,
  DriverValue,
  driverStyles,
} from "../components/driver/DriverComponents";
import { advanceTrip, formatCurrency } from "../services/driverRuntime";
import { colors, spacing, typography } from "../themes";

export default function IncomingRequest({ navigation, route }) {
  const {
    requests,
    acceptRequest,
    rejectRequest,
    dismissRequest,
    setDriverAvailability,
    setActiveTrip,
    refreshActiveTrip,
  } = useDriverSession();
  const [secondsLeft, setSecondsLeft] = useState(15);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const timeoutStarted = useRef(false);
  const isProcessingRef = useRef(false);
  const expireRef = useRef(null);
  const trip = useMemo(
    () => requests.find((item) => item.id === route.params?.tripId) || requests[0],
    [requests, route.params?.tripId]
  );
  const tripId = trip?.id;
  const offeredAt = trip?.offered_at || trip?.requested_at;

  const reject = useCallback(async () => {
    if (!trip || isProcessingRef.current) {
      return;
    }
    isProcessingRef.current = true;
    setIsProcessing(true);
    try {
      await rejectRequest(trip.id);
      navigation.goBack();
    } catch (rejectError) {
      setError(rejectError.message);
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [navigation, rejectRequest, trip]);

  useEffect(() => {
    expireRef.current = async () => {
      if (!trip || isProcessingRef.current) {
        return;
      }
      isProcessingRef.current = true;
      setIsProcessing(true);
      dismissRequest(trip.id);

      let locationError;
      try {
        await setDriverAvailability(true);
      } catch (availabilityError) {
        locationError = availabilityError;
        try {
          await setDriverAvailability(false);
        } catch (syncError) {
          console.error(
            "No se pudo marcar al conductor como no disponible tras vencer la solicitud.",
            syncError
          );
        }
      }

      navigation.goBack();
      Alert.alert(
        "Solicitud vencida",
        locationError
          ? `La solicitud venció, pero no se pudo actualizar la ubicación: ${locationError.message}`
          : "No se alcanzó a responder a tiempo."
      );
    };
  }, [dismissRequest, navigation, setDriverAvailability, trip]);

  useEffect(() => {
    if (!trip && !isProcessing) {
      navigation.goBack();
    }
  }, [isProcessing, navigation, trip]);

  useEffect(() => {
    timeoutStarted.current = false;
    if (!tripId) {
      return undefined;
    }
    const deadline = new Date(offeredAt).getTime() + 15000;
    const updateTime = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (
        remaining === 0 &&
        !timeoutStarted.current &&
        !isProcessingRef.current
      ) {
        timeoutStarted.current = true;
        expireRef.current?.();
      }
    };
    updateTime();
    const timer = setInterval(updateTime, 250);
    return () => clearInterval(timer);
  }, [
    offeredAt,
    tripId,
  ]);

  const accept = useCallback(async () => {
    if (!trip || isProcessingRef.current) {
      return;
    }
    isProcessingRef.current = true;
    setIsProcessing(true);
    setError(null);
    try {
      const acceptedTrip = await acceptRequest(trip.id);
      let availabilityError;
      try {
        await setDriverAvailability(false);
      } catch (syncError) {
        availabilityError = syncError;
        console.error(
          "El viaje se aceptó, pero no se pudo desconectar al conductor.",
          syncError
        );
      }
      setActiveTrip(acceptedTrip);
      const arrivingTrip = await advanceTrip(acceptedTrip.id, "driver_arriving");
      setActiveTrip(arrivingTrip);
      await refreshActiveTrip();
      navigation.replace("ActiveTrip", { tripId: acceptedTrip.id });
      if (availabilityError) {
        Alert.alert(
          "Viaje aceptado",
          `No se pudo actualizar la disponibilidad: ${availabilityError.message}`
        );
      }
    } catch (acceptError) {
      setError(acceptError.message);
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [
    acceptRequest,
    navigation,
    refreshActiveTrip,
    setDriverAvailability,
    setActiveTrip,
    trip,
  ]);

  if (!trip) {
    return null;
  }

  return (
    <DriverPage scroll>
      <Text style={driverStyles.title}>Solicitud entrante</Text>
      <Text style={styles.timer}>Tiempo para responder: {secondsLeft}s</Text>
      <View style={driverStyles.card}>
        <Text style={driverStyles.sectionTitle}>Trayecto</Text>
        <DriverValue label="Origen" value={trip.origin_label} />
        <DriverValue label="Destino" value={trip.destination_label} />
        <DriverValue label="Distancia" value={`${trip.distance_km} km`} />
        <DriverValue label="Duración estimada" value={`${trip.duration_minutes} min`} />
      </View>
      <View style={driverStyles.card}>
        <Text style={driverStyles.sectionTitle}>Detalles</Text>
        <DriverValue label="Categoría" value={trip.category} />
        {/* AI-assisted: see docs/AI_LOG.md #3. */}
        <DriverValue
          label="Método de pago"
          value={trip.payment_method === "mercado_pago" ? "Mercado Pago" : "Efectivo"}
        />
        <DriverValue label="Tarifa estimada" value={formatCurrency(trip.estimated_fare)} />
        <DriverValue
          label="Ganancia neta estimada"
          value={formatCurrency(trip.estimated_driver_net)}
        />
      </View>
      <DriverError>{error}</DriverError>
      <DriverButton
        label="Aceptar solicitud"
        loading={isProcessing}
        onPress={accept}
      />
      <DriverButton
        danger
        disabled={isProcessing}
        label="Rechazar"
        onPress={reject}
      />
    </DriverPage>
  );
}

const styles = StyleSheet.create({
  timer: {
    color: colors.error,
    fontSize: typography.subtitle,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
});
