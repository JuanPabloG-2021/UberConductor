import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ApprovalPending from "../screens/ApprovalPending";
import DriverRecords from "./DriverRecords";
import DriverNavigator from "./DriverNavigator";
import { getDriverVerificationStatus } from "../services/driverRegistration";
import { colors, radius, spacing, typography } from "../themes";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadInitialRoute = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const isVerified = await getDriverVerificationStatus();
      setInitialRoute(
        isVerified === true
          ? "DriverApp"
          : isVerified === false
            ? "ApprovalPending"
            : "DriverRegistration"
      );
    } catch (error) {
      console.error("No se pudo cargar el estado del conductor.", error);
      setLoadError(
        error?.message ||
          "No se pudo verificar el estado del perfil. Comprueba tu conexión e inténtalo nuevamente."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialRoute();
  }, [loadInitialRoute]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.text} size="large" />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centered}>
        <Text accessibilityRole="alert" style={styles.error}>
          {loadError}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={loadInitialRoute}
          style={styles.retryButton}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="DriverRegistration" component={DriverRecords} />
      <Stack.Screen name="ApprovalPending" component={ApprovalPending} />
      <Stack.Screen name="DriverApp" component={DriverNavigator} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  error: {
    color: colors.error,
    fontSize: typography.body,
    lineHeight: 24,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: colors.text,
    borderRadius: radius.medium,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  retryButtonText: {
    color: colors.surface,
    fontSize: typography.body,
    fontWeight: "600",
  },
});
