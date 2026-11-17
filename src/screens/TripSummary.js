import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useDriverSession } from "../context/DriverContext";
import { advanceTrip, formatCurrency, getPaymentStatusLabel } from "../services/driverRuntime";
import {
  DriverButton,
  DriverError,
  DriverPage,
  DriverValue,
  driverStyles,
} from "../components/driver/DriverComponents";
import { colors, spacing, typography } from "../themes";

export default function TripSummary({ navigation, route }) {
  const { activeTrip, setActiveTrip } = useDriverSession();
  const trip = activeTrip?.id === route.params?.tripId ? activeTrip : activeTrip;
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const settleCashPayment = useCallback(async () => {
    if (!trip || trip.payment_method !== "cash") {
      return;
    }
    setIsUpdating(true);
    setError(null);
    try {
      await advanceTrip(trip.id, "paid");
      setActiveTrip(null);
      navigation.replace("DriverHome");
    } catch (paymentError) {
      setError(paymentError.message);
    } finally {
      setIsUpdating(false);
    }
  }, [navigation, setActiveTrip, trip]);

  if (!trip) {
    return (
      <View style={styles.center}>
        <Text style={driverStyles.subtitle}>No se encontró el resumen del viaje.</Text>
        <DriverButton label="Volver al inicio" onPress={() => navigation.replace("DriverHome")} />
      </View>
    );
  }

  return (
    <DriverPage scroll>
      <Text style={driverStyles.title}>Resumen del viaje</Text>
      <View style={driverStyles.card}>
        <DriverValue label="Origen" value={trip.origin_label} />
        <DriverValue label="Destino" value={trip.destination_label} />
        <DriverValue label="Tarifa final" value={formatCurrency(trip.final_fare)} />
        <DriverValue label="Comisión" value={formatCurrency(trip.commission_amount)} />
        <DriverValue label="Ganancia neta" value={formatCurrency(trip.driver_net_amount)} />
        <DriverValue
          label="Estado del pago"
          value={getPaymentStatusLabel(trip.payment_status)}
        />
      </View>
      {trip.payment_status === "pending" ? (
        <Text style={styles.note}>
          El pago electrónico sigue pendiente de confirmación. El estado se actualizará cuando
          la pasarela notifique el resultado.
        </Text>
      ) : null}
      {trip.payment_status === "rejected" ? (
        <Text style={styles.note}>
          El pago fue rechazado. Sigue las instrucciones de soporte para resolverlo.
        </Text>
      ) : null}
      <DriverError>{error}</DriverError>
      {trip.payment_method === "cash" && trip.status === "completed" ? (
        <DriverButton
          label="Confirmar efectivo recibido"
          loading={isUpdating}
          onPress={settleCashPayment}
        />
      ) : trip.payment_method === "mercado_pago" &&
        trip.status === "completed" &&
        ["pending", "rejected"].includes(trip.payment_status) ? (
        <DriverButton
          label="Cambiar a pasajero para pagar"
          onPress={() =>
            navigation.navigate("DriverHome", { testPassengerMode: true })
          }
        />
      ) : (
        <DriverButton
          label="Volver al inicio"
          onPress={() => {
            setActiveTrip(null);
            navigation.replace("DriverHome");
          }}
        />
      )}
      {trip.payment_method === "cash" && trip.status === "completed" ? (
        <DriverButton
          label="Cambiar a pasajero"
          onPress={() =>
            navigation.navigate("DriverHome", { testPassengerMode: true })
          }
          secondary
        />
      ) : null}
    </DriverPage>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "stretch",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  note: {
    color: colors.secondaryText,
    fontSize: typography.bodySmall,
    lineHeight: 21,
    marginBottom: spacing.md,
  },
});
