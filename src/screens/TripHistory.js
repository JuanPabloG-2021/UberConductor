import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useDriverSession } from "../context/DriverContext";
import { useEarnings } from "../hooks/useEarnings";
import { formatCurrency, getPaymentStatusLabel } from "../services/driverRuntime";
import {
  DriverError,
  DriverPage,
  driverStyles,
} from "../components/driver/DriverComponents";
import { colors, radius, spacing, typography } from "../themes";

const FILTERS = [
  { id: "all", label: "Todos" },
  { id: "day", label: "Hoy" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mes" },
];

function isWithinFilter(value, filter) {
  if (filter === "all") {
    return true;
  }
  const date = new Date(value);
  const now = new Date();
  if (filter === "day") {
    return date.toDateString() === now.toDateString();
  }
  if (filter === "week") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return date >= start;
  }
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

export default function TripHistory() {
  const { user } = useDriverSession();
  const { trips, isLoading, error } = useEarnings(user?.id);
  const [filter, setFilter] = useState("all");
  const filteredTrips = useMemo(
    () =>
      trips.filter((trip) =>
        isWithinFilter(trip.completed_at, filter)
      ),
    [filter, trips]
  );

  return (
    <DriverPage scroll>
      <Text style={driverStyles.title}>Historial de carreras</Text>
      <View style={styles.filters}>
        {FILTERS.map((item) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: filter === item.id }}
            key={item.id}
            onPress={() => setFilter(item.id)}
            style={[
              styles.filter,
              filter === item.id && styles.selectedFilter,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === item.id && styles.selectedFilterText,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {isLoading ? <ActivityIndicator color={colors.text} /> : null}
      <DriverError>{error?.message}</DriverError>
      {!isLoading && filteredTrips.length === 0 ? (
        <Text style={driverStyles.subtitle}>No hay viajes para este filtro.</Text>
      ) : null}
      {filteredTrips.map((trip) => (
        <View key={trip.id} style={driverStyles.card}>
          <Text style={driverStyles.sectionTitle}>
            {trip.origin_label} → {trip.destination_label}
          </Text>
          <Text style={styles.date}>
            {trip.completed_at
              ? new Date(trip.completed_at).toLocaleString("es-CO")
              : "Fecha no disponible"}
          </Text>
          <Text style={styles.details}>
            {trip.distance_km} km · {trip.duration_minutes} min · {trip.category}
          </Text>
          <Text style={styles.details}>
            Pago: {getPaymentStatusLabel(trip.payment_status)}
          </Text>
          <Text style={styles.amount}>
            Ganancia neta: {formatCurrency(trip.driver_net_amount)}
          </Text>
        </View>
      ))}
    </DriverPage>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.md,
  },
  filter: {
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.medium,
    marginBottom: spacing.xs,
    marginRight: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectedFilter: {
    backgroundColor: colors.text,
  },
  filterText: {
    color: colors.text,
    fontSize: typography.bodySmall,
    fontWeight: "600",
  },
  selectedFilterText: {
    color: colors.surface,
  },
  date: {
    color: colors.secondaryText,
    fontSize: typography.caption,
    marginBottom: spacing.xs,
  },
  details: {
    color: colors.secondaryText,
    fontSize: typography.bodySmall,
    marginTop: spacing.xs,
  },
  amount: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
});
