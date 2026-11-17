import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { colors, radius, spacing, typography } from "../../themes";

export default function ImageField({
  label,
  value,
  onChangeImage,
  error,
  helperText,
  onError,
  disabled = false,
  exampleSource,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [pickerError, setPickerError] = useState(null);
  const isDisabled = disabled || isLoading;

  const pickImage = async (source) => {
    setPickerError(null);
    setIsLoading(true);
    let selectedAsset = null;

    try {
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setPickerError(
          source === "camera"
            ? "Se necesita permiso para usar la cámara."
            : "Se necesita permiso para acceder a las fotos."
        );
        return;
      }

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });

      if (!result.canceled && result.assets?.[0]) {
        selectedAsset = result.assets[0];
      }
    } catch (pickerError) {
      setPickerError("No se pudo abrir la cámara o la galería. Inténtalo de nuevo.");
      onError?.(pickerError);
    } finally {
      setIsLoading(false);
    }

    if (selectedAsset) {
      onChangeImage(selectedAsset);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}

      <View style={[styles.preview, error ? styles.previewWithError : null]}>
        {value?.uri || exampleSource ? (
          <Image
            resizeMode="cover"
            source={value?.uri ? { uri: value.uri } : exampleSource}
            style={styles.image}
          />
        ) : (
          <Text style={styles.emptyText}>Aún no has seleccionado una imagen</Text>
        )}
        {!value?.uri && exampleSource ? (
          <View pointerEvents="none" style={styles.exampleBadge}>
            <Text style={styles.exampleBadgeText}>IMAGEN DE EJEMPLO</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          disabled={isDisabled}
          onPress={() => pickImage("camera")}
          style={({ pressed }) => [
            styles.button,
            styles.secondaryButton,
            isDisabled ? styles.disabledButton : null,
            pressed && !isDisabled ? styles.pressedButton : null,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Tomar foto</Text>
        </Pressable>

        <Pressable
          disabled={isDisabled}
          onPress={() => pickImage("library")}
          style={({ pressed }) => [
            styles.button,
            styles.primaryButton,
            isDisabled ? styles.disabledButton : null,
            pressed && !isDisabled ? styles.pressedButton : null,
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Elegir de galería</Text>
          )}
        </Pressable>
      </View>

      {pickerError ? (
        <Text style={styles.error}>
          {pickerError}
        </Text>
      ) : null}
      {error ? (
        <Text style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.text,
    fontSize: typography.bodySmall,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  helperText: {
    color: colors.secondaryText,
    fontSize: typography.bodySmall,
    marginBottom: spacing.sm,
  },
  preview: {
    alignItems: "center",
    backgroundColor: colors.mutedSurface,
    borderColor: colors.inputBorder,
    borderRadius: radius.small,
    borderWidth: 1,
    height: 200,
    justifyContent: "center",
    overflow: "hidden",
  },
  previewWithError: {
    borderColor: colors.error,
  },
  image: {
    height: "100%",
    width: "100%",
  },
  exampleBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderRadius: radius.small,
    bottom: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    position: "absolute",
  },
  exampleBadgeText: {
    color: colors.surface,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  emptyText: {
    color: colors.secondaryText,
    fontSize: typography.bodySmall,
    paddingHorizontal: spacing.md,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  button: {
    alignItems: "center",
    borderRadius: radius.small,
    flex: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.text,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.text,
    borderWidth: 1,
  },
  disabledButton: {
    opacity: 0.5,
  },
  pressedButton: {
    opacity: 0.8,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: typography.bodySmall,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: typography.bodySmall,
    fontWeight: "600",
  },
  error: {
    color: colors.error,
    fontSize: typography.caption,
    marginTop: spacing.sm,
  },
});