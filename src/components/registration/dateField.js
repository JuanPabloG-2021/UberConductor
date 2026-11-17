import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { colors, radius, spacing, typography } from "../../themes";

function isValidDate(date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

export default function DateField({
  label,
  value,
  onChangeDate,
  error,
  placeholder = "Selecciona una fecha",
  minimumDate,
  maximumDate,
  locale = "es-CO",
}) {
  const [isPickerVisible, setPickerVisible] = useState(false);
  const [draftDate, setDraftDate] = useState(null);
  const selectedDate = isValidDate(value) ? value : null;
  const pickerDate = selectedDate || maximumDate || minimumDate || new Date();
  const formattedDate = selectedDate
    ? selectedDate.toLocaleDateString(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : placeholder;

  const openPicker = () => {
    setDraftDate(pickerDate);
    setPickerVisible(true);
  };

  const performAndroidChange = (event, date) => {
    setPickerVisible(false);

    if (event.type === "set" && date) {
      onChangeDate(date);
    }
  };

  const closePicker = () => {
    setPickerVisible(false);
    setDraftDate(null);
  };

  const confirmDate = () => {
    if (draftDate) {
      onChangeDate(draftDate);
    }

    closePicker();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={openPicker}
        style={[styles.field, error ? styles.fieldWithError : null]}
      >
        <Text style={selectedDate ? styles.value : styles.placeholder}>
          {formattedDate}
        </Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {Platform.OS === "android" && isPickerVisible ? (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={performAndroidChange}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal
          animationType="slide"
          transparent
          visible={isPickerVisible}
          onRequestClose={closePicker}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <View style={styles.modalActions}>
                <Pressable onPress={closePicker}>
                  <Text style={styles.actionText}>Cancelar</Text>
                </Pressable>
                <Pressable onPress={confirmDate}>
                  <Text style={[styles.actionText, styles.confirmText]}>
                    Listo
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={draftDate || pickerDate}
                mode="date"
                display="spinner"
                locale={locale}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={(_, date) => {
                  if (date) {
                    setDraftDate(date);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      ) : null}
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
    paddingBottom: spacing.lg,
  },
  modalActions: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  actionText: {
    color: colors.secondaryText,
    fontSize: typography.body,
  },
  confirmText: {
    color: colors.text,
    fontWeight: "600",
  },
});