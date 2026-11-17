import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getDriverVerificationStatus } from "../services/driverRegistration";
import { colors, radius, spacing, typography } from "../themes";

export default function ApprovalPending({ navigation }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState(null);
  const [hasError, setHasError] = useState(false);

  const refreshStatus = async () => {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    setMessage(null);
    setHasError(false);

    try {
      const isVerified = await getDriverVerificationStatus();

      if (isVerified === true) {
        navigation.replace("DriverApp");
        return;
      }

      setMessage(
        isVerified === false
          ? "Tu perfil aún no ha sido validado. Intenta nuevamente más tarde."
          : "No encontramos un perfil asociado a esta sesión. Verifica tu conexión e inténtalo nuevamente."
      );
    } catch (error) {
      console.error("No se pudo consultar la aprobación del conductor.", error);
      setHasError(true);
      setMessage(
        error?.message ||
          "No se pudo consultar el estado del perfil. Intenta nuevamente."
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>⌛</Text>
      </View>
      <Text style={styles.title}>Perfil pendiente de aprobación</Text>
      <Text style={styles.description}>
        Recibimos tu información. Te avisaremos cuando el equipo termine de
        revisar tus datos.
      </Text>

      {message ? (
        <Text
          accessibilityRole="alert"
          style={[styles.message, hasError ? styles.errorMessage : null]}
        >
          {message}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={isRefreshing}
        onPress={refreshStatus}
        style={({ pressed }) => [
          styles.button,
          isRefreshing ? styles.disabledButton : null,
          pressed && !isRefreshing ? styles.pressedButton : null,
        ]}
      >
        {isRefreshing ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text style={styles.buttonText}>Actualizar estado</Text>
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          navigation.navigate("DriverRegistration", { isEditing: true })
        }
        style={({ pressed }) => [
          styles.editButton,
          pressed ? styles.pressedButton : null,
        ]}
      >
        <Text style={styles.editButtonText}>Editar solicitud</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  iconContainer: {
    alignItems: "center",
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.large,
    height: 80,
    justifyContent: "center",
    marginBottom: spacing.lg,
    width: 80,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "700",
    marginBottom: spacing.md,
    textAlign: "center",
  },
  description: {
    color: colors.secondaryText,
    fontSize: typography.body,
    lineHeight: 24,
    textAlign: "center",
  },
  message: {
    color: colors.secondaryText,
    fontSize: typography.bodySmall,
    lineHeight: 21,
    marginTop: spacing.lg,
    textAlign: "center",
  },
  errorMessage: {
    color: colors.error,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.text,
    borderRadius: radius.medium,
    justifyContent: "center",
    marginTop: spacing.xl,
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    width: "100%",
  },
  disabledButton: {
    opacity: 0.6,
  },
  pressedButton: {
    opacity: 0.8,
  },
  buttonText: {
    color: colors.surface,
    fontSize: typography.body,
    fontWeight: "600",
  },
  editButton: {
    alignItems: "center",
    borderColor: colors.inputBorder,
    borderRadius: radius.medium,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    width: "100%",
  },
  editButtonText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "600",
  },
});
