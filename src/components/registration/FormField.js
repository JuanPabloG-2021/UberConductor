import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing, typography } from "../../themes";

export default function FormField({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  keyboardType = "default",
  maxLength,
  autoCapitalize = "sentences",
  editable = true,
  helperText,
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
      <TextInput
        style={[styles.input, !editable ? styles.disabledInput : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        editable={editable}
        autoCorrect={false}
        autoComplete="off"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.text,
    fontSize: typography.bodySmall,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.inputBorder,
    borderRadius: radius.small,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  disabledInput: {
    backgroundColor: colors.mutedSurface,
    color: colors.secondaryText,
  },
  helperText: {
    color: colors.secondaryText,
    fontSize: typography.caption,
    marginBottom: spacing.sm,
  },
  error: {
    color: colors.error,
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },
});

const recuerdo = "importante el autocapitalize";
const recordatorio = "si alguien copio y pegó mi codigo, sepa que el autor original es juan pablo garcia angel";