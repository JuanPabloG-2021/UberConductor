import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useDriverSession } from "../context/DriverContext";
import { useEarnings } from "../hooks/useEarnings";
import { formatCurrency } from "../services/driverRuntime";
import {
  DriverError,
  DriverPage,
  DriverValue,
  driverStyles,
} from "../components/driver/DriverComponents";
import { colors, spacing } from "../themes";

export default function Earnings() {
  const { user } = useDriverSession();
  const { totals, isLoading, error } = useEarnings(user?.id);

  return (
    <DriverPage scroll>
      <Text style={driverStyles.title}>Ganancias</Text>
      <Text style={driverStyles.subtitle}>
        Se calcula la ganancia neta de los viajes finalizados.
      </Text>
      <View style={driverStyles.card}>
        <DriverValue label="Hoy" value={formatCurrency(totals.day)} />
        <DriverValue label="Esta semana" value={formatCurrency(totals.week)} />
        <DriverValue label="Este mes" value={formatCurrency(totals.month)} />
      </View>
      {isLoading ? <ActivityIndicator color={colors.text} /> : null}
      <DriverError>{error?.message}</DriverError>
    </DriverPage>
  );
}
