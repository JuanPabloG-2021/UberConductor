import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import {
  DriverButton,
  DriverError,
  DriverPage,
  DriverValue,
  driverStyles,
} from "../components/driver/DriverComponents";
import { formatCurrency, getPaymentStatusLabel } from "../services/driverRuntime";
import {
  createMercadoPagoCheckout,
  getPassengerTrip,
} from "../services/mercadoPago";
import { colors, spacing, typography } from "../themes";

const PAYMENT_RETURN_URL = "uberconductor://checkout/return";

// AI-assisted: see docs/AI_LOG.md #3.
export default function PassengerTestMode({
  trip,
  userId,
  location,
  isReady,
  isBusy,
  onCreateTrip,
  onTripUpdated,
  onSwitchToDriver,
}) {
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const canCreateTrip = isReady && Boolean(location) && !isBusy;
  const canPay =
    trip?.status === "completed" &&
    trip.payment_method === "mercado_pago" &&
    ["pending", "rejected"].includes(trip.payment_status);
  const paymentMethodLabel =
    trip?.payment_method === "mercado_pago" ? "Mercado Pago" : "Efectivo";

  const createTrip = useCallback(
    async (paymentMethod) => {
      setIsCreatingTrip(true);
      setError(null);
      try {
        await onCreateTrip(paymentMethod);
      } catch (createError) {
        setError(createError.message);
      } finally {
        setIsCreatingTrip(false);
      }
    },
    [onCreateTrip]
  );

  const refreshPayment = useCallback(async () => {
    if (!trip || !userId) {
      return;
    }
    setIsRefreshing(true);
    setError(null);
    try {
      const updatedTrip = await getPassengerTrip(trip.id, userId);
      onTripUpdated(updatedTrip);
    } catch (refreshError) {
      setError(refreshError.message);
    } finally {
      setIsRefreshing(false);
    }
  }, [onTripUpdated, trip, userId]);

  const payWithMercadoPago = useCallback(async () => {
    if (!trip || !canPay || isOpeningCheckout) {
      return;
    }
    setIsOpeningCheckout(true);
    setError(null);
    try {
      const { checkoutUrl } = await createMercadoPagoCheckout(trip.id);
      await WebBrowser.openAuthSessionAsync(checkoutUrl, PAYMENT_RETURN_URL);
      await refreshPayment();
    } catch (checkoutError) {
      setError(checkoutError.message);
    } finally {
      setIsOpeningCheckout(false);
    }
  }, [canPay, isOpeningCheckout, refreshPayment, trip]);

  return (
    <DriverPage scroll>
      <Text style={driverStyles.title}>Modo pasajero · Prueba</Text>
      <Text style={driverStyles.subtitle}>
        Solicitudes de prueba por $10.000 COP. El mismo usuario podrá tomar el
        rol de conductor; Mercado Pago se abrirá con credenciales de prueba.
      </Text>
      <Text style={styles.warning}>
        La solicitud se guarda en Supabase y puede llegar a cualquier conductor
        disponible. Usa solo conductores de prueba en este proyecto. El pago
        sandbox no representa dinero real ni un desembolso al conductor.
      </Text>

      {trip ? (
        <View style={driverStyles.card}>
          <Text style={driverStyles.sectionTitle}>Viaje de prueba</Text>
          <DriverValue label="Origen" value={trip.origin_label} />
          <DriverValue label="Destino" value={trip.destination_label} />
          <DriverValue
            label="Estado del viaje"
            value={
              trip.status === "paid"
                ? "Pagado"
                : trip.status === "completed"
                  ? "Completado"
                  : "En curso"
            }
          />
          <DriverValue label="Método de pago" value={paymentMethodLabel} />
          <DriverValue
            label="Tarifa"
            value={formatCurrency(trip.final_fare || trip.estimated_fare)}
          />
          <DriverValue
            label="Estado del pago"
            value={getPaymentStatusLabel(trip.payment_status)}
          />
        </View>
      ) : null}

      {!trip ? (
        <View style={driverStyles.card}>
          <Text style={driverStyles.sectionTitle}>Crear solicitud</Text>
          <DriverButton
            disabled={!canCreateTrip}
            label="Solicitar viaje · Efectivo · $10.000"
            loading={isCreatingTrip}
            onPress={() => createTrip("cash")}
          />
          <DriverButton
            disabled={!canCreateTrip}
            label="Solicitar viaje · Mercado Pago · $10.000"
            loading={isCreatingTrip}
            onPress={() => createTrip("mercado_pago")}
          />
          {!isReady || !location ? (
            <Text style={styles.hint}>
              Esperando una ubicación válida para crear la solicitud.
            </Text>
          ) : null}
        </View>
      ) : null}

      {canPay ? (
        <View style={driverStyles.card}>
          <Text style={driverStyles.sectionTitle}>Pago electrónico</Text>
          <Text style={styles.hint}>
            El pago solo se confirma cuando el webhook de Mercado Pago actualiza
            el viaje; volver desde el checkout no equivale a un pago aprobado.
          </Text>
          <DriverButton
            label={
              trip.payment_status === "rejected"
                ? "Intentar pago nuevamente"
                : "Pagar con Mercado Pago"
            }
            loading={isOpeningCheckout}
            onPress={payWithMercadoPago}
          />
          <DriverButton
            disabled={isRefreshing}
            label="Consultar estado del pago"
            loading={isRefreshing}
            onPress={refreshPayment}
            secondary
          />
        </View>
      ) : null}

      {trip?.status === "completed" && trip.payment_method === "cash" ? (
        <Text style={styles.hint}>
          Para completar la prueba en efectivo, cambia al modo conductor y
          confirma el efectivo recibido.
        </Text>
      ) : null}

      {trip?.payment_method === "mercado_pago" &&
      trip.payment_status === "approved" ? (
        <Text style={styles.success}>Pago de prueba aprobado.</Text>
      ) : null}

      {trip?.status === "paid" ? (
        <View style={driverStyles.card}>
          <Text style={driverStyles.sectionTitle}>Crear otra solicitud</Text>
          <DriverButton
            disabled={!canCreateTrip}
            label="Solicitar viaje · Efectivo · $10.000"
            loading={isCreatingTrip}
            onPress={() => createTrip("cash")}
          />
          <DriverButton
            disabled={!canCreateTrip}
            label="Solicitar viaje · Mercado Pago · $10.000"
            loading={isCreatingTrip}
            onPress={() => createTrip("mercado_pago")}
          />
        </View>
      ) : null}

      <DriverError>{error}</DriverError>
      <DriverButton
        label="Cambiar a conductor"
        onPress={onSwitchToDriver}
        secondary
      />
    </DriverPage>
  );
}

const styles = StyleSheet.create({
  hint: {
    color: colors.secondaryText,
    fontSize: typography.bodySmall,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  success: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  warning: {
    color: colors.secondaryText,
    fontSize: typography.bodySmall,
    lineHeight: 21,
    marginBottom: spacing.md,
  },
});
