import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, radius, spacing, typography } from "../../themes";

export function DriverPage({ children, scroll = false, style }) {
  const content = <View style={[styles.pageContent, style]}>{children}</View>;
  return scroll ? (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {content}
    </ScrollView>
  ) : (
    <View style={styles.page}>{content}</View>
  );
}

export function DriverButton({
  label,
  onPress,
  disabled = false,
  secondary = false,
  danger = false,
  loading = false,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.secondaryButton,
        danger && styles.dangerButton,
        (disabled || loading) && styles.disabledButton,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.text : colors.surface} />
      ) : (
        <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function DriverField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  editable = true,
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        editable={editable}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        style={[styles.input, !editable && styles.readOnlyInput]}
        value={value == null ? "" : String(value)}
      />
    </View>
  );
}

export function DriverValue({ label, value }) {
  return (
    <View style={styles.valueRow}>
      <Text style={styles.valueLabel}>{label}</Text>
      <Text style={styles.value}>{value || "—"}</Text>
    </View>
  );
}

export function DriverError({ children }) {
  if (!children) {
    return null;
  }
  return <Text accessibilityRole="alert" style={styles.error}>{children}</Text>;
}

export const driverStyles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  subtitle: {
    color: colors.secondaryText,
    fontSize: typography.body,
    lineHeight: 23,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.large,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
});

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.background,
    flex: 1,
  },
  pageContent: {
    padding: spacing.md,
  },
  scrollContent: {
    flexGrow: 1,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.text,
    borderRadius: radius.medium,
    justifyContent: "center",
    marginTop: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryButton: {
    backgroundColor: colors.mutedSurface,
  },
  dangerButton: {
    backgroundColor: colors.error,
  },
  disabledButton: {
    opacity: 0.55,
  },
  buttonText: {
    color: colors.surface,
    fontSize: typography.body,
    fontWeight: "700",
  },
  secondaryButtonText: {
    color: colors.text,
  },
  field: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    color: colors.secondaryText,
    fontSize: typography.bodySmall,
    marginBottom: spacing.xs,
  },
  input: {
    borderColor: colors.inputBorder,
    borderRadius: radius.medium,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  readOnlyInput: {
    backgroundColor: colors.mutedSurface,
  },
  valueRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  valueLabel: {
    color: colors.secondaryText,
    flex: 1,
    fontSize: typography.bodySmall,
  },
  value: {
    color: colors.text,
    flex: 1,
    fontSize: typography.bodySmall,
    fontWeight: "600",
    textAlign: "right",
  },
  error: {
    color: colors.error,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    marginVertical: spacing.sm,
  },
});
