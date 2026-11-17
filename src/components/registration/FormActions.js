import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, radius, spacing, typography } from "../../themes";

export default function FormActions({
  primaryLabel,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
  disabled = false,
  loading = false,
  loadingLabel = "Procesando...",
}) {
  const isDisabled = disabled || loading;

  return (
    <View style={styles.container}>
      {secondaryLabel && onSecondaryPress ? (
        <Pressable
          disabled={isDisabled}
          onPress={onSecondaryPress}
          style={({ pressed }) => [
            styles.button,
            styles.secondaryButton,
            isDisabled ? styles.disabledButton : null,
            pressed && !isDisabled ? styles.pressedButton : null,
          ]}
        >
          <Text style={styles.secondaryText}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}

      <Pressable
        disabled={isDisabled}
        onPress={onPrimaryPress}
        style={({ pressed }) => [
          styles.button,
          styles.primaryButton,
          isDisabled ? styles.disabledButton : null,
          pressed && !isDisabled ? styles.pressedButton : null,
        ]}
      >
        {loading ? (
          <View style={styles.loadingContent}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.primaryText}>{loadingLabel}</Text>
          </View>
        ) : (
          <Text style={styles.primaryText}>{primaryLabel}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  button: {
    alignItems: "center",
    borderRadius: radius.small,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.text,
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.text,
    borderWidth: 1,
    flex: 1,
  },
  disabledButton: {
    opacity: 0.5,
  },
  pressedButton: {
    opacity: 0.8,
  },
  primaryText: {
    color: colors.surface,
    fontSize: typography.body,
    fontWeight: "600",
  },
  secondaryText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "600",
  },
  loadingContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
});