import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, radius, spacing, typography } from "../../themes";

export default function SelectField({
  label,
  value,
  options = [],
  onValueChange,
  error,
  placeholder = "Selecciona una opción",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  const selectOption = (optionValue) => {
    onValueChange(optionValue);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setIsOpen(true)}
        style={[styles.field, error ? styles.fieldWithError : null]}
      >
        <Text style={selectedOption ? styles.value : styles.placeholder}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Text style={styles.chevron}>▼</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal
        animationType="slide"
        transparent
        visible={isOpen}
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            onPress={() => setIsOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{label}</Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.optionsList}
            >
              {options.map((option) => {
                const isSelected = option.value === value;

                return (
                  <Pressable
                    key={String(option.value)}
                    onPress={() => selectOption(option.value)}
                    style={[
                      styles.option,
                      isSelected ? styles.selectedOption : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isSelected ? styles.selectedOptionText : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isSelected ? (
                      <Text style={styles.checkmark}>✓</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              onPress={() => setIsOpen(false)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  field: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.inputBorder,
    borderRadius: radius.small,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  fieldWithError: {
    borderColor: colors.error,
  },
  value: {
    color: colors.text,
    fontSize: typography.body,
  },
  placeholder: {
    color: colors.placeholder,
    fontSize: typography.body,
  },
  chevron: {
    color: colors.secondaryText,
    fontSize: typography.caption,
  },
  error: {
    color: colors.error,
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },
  modalBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.large,
    borderTopRightRadius: radius.large,
    maxHeight: "75%",
    paddingBottom: spacing.lg,
    paddingTop: spacing.lg,
  },
  modalTitle: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: "600",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  optionsList: {
    flexShrink: 1,
  },
  option: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  selectedOption: {
    backgroundColor: colors.selectedSurface,
  },
  optionText: {
    color: colors.text,
    fontSize: typography.body,
  },
  selectedOptionText: {
    color: colors.text,
    fontWeight: "600",
  },
  checkmark: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
  },
  cancelButton: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  cancelText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "600",
  },
});