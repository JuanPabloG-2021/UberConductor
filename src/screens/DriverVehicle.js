import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import FormActions from "../components/registration/FormActions";
import FormField from "../components/registration/FormField";
import ImageField from "../components/registration/ImageField";
import SelectField from "../components/registration/selectField";
import { validateDriverVehicle } from "../features/validations";
import { colors, spacing, typography } from "../themes";

const categoryOptions = [
  { label: "Económico", value: "economy" },
  { label: "XL", value: "xl" },
  { label: "Premium", value: "premium" },
];

const colorOptions = [
  { label: "Blanco", value: "white" },
  { label: "Negro", value: "black" },
  { label: "Gris", value: "gray" },
  { label: "Plateado", value: "silver" },
  { label: "Rojo", value: "red" },
  { label: "Azul", value: "blue" },
  { label: "Otro", value: "other" },
];

export function DriverVehicle({ vehicle, onChange, onBack, onComplete }) {
  const errors = vehicle.errors || {};
  const update = (field, value) => onChange(field, value);
  const validate = () => {
    const validationErrors = validateDriverVehicle(vehicle);
    onChange("errors", validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      onComplete();
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>PERFIL DEL CONDUCTOR</Text>
          <Text style={styles.title}>Información del vehículo</Text>
          <Text style={styles.description}>
            Cuéntanos sobre el vehículo con el que realizarás los viajes.
          </Text>
        </View>

        <SelectField
          label="Categoría"
          value={vehicle.category ?? ""}
          options={categoryOptions}
          onValueChange={(value) => update("category", value)}
          error={errors.category}
        />
        <FormField
          label="Placa"
          value={vehicle.plate ?? ""}
          onChangeText={(value) =>
            update(
              "plate",
              value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6)
            )
          }
          error={errors.plate}
          placeholder="Ej. ABC123"
          autoCapitalize="characters"
          maxLength={6}
        />
        <FormField
          label="Marca"
          value={vehicle.make ?? ""}
          onChangeText={(value) => update("make", value)}
          error={errors.make}
          placeholder="Marca del vehículo"
          maxLength={30}
        />
        <FormField
          label="Modelo"
          value={vehicle.model ?? ""}
          onChangeText={(value) => update("model", value)}
          error={errors.model}
          placeholder="Modelo del vehículo"
          maxLength={30}
        />
        <FormField
          label="Año"
          value={vehicle.year ?? ""}
          onChangeText={(value) =>
            update("year", value.replace(/\D/g, "").slice(0, 4))
          }
          error={errors.year}
          placeholder="Ej. 2022"
          keyboardType="number-pad"
          autoCapitalize="none"
          maxLength={4}
        />
        <SelectField
          label="Color"
          value={vehicle.color ?? ""}
          options={colorOptions}
          onValueChange={(value) => update("color", value)}
          error={errors.color}
        />
        <FormField
          label="Capacidad de pasajeros"
          value={vehicle.passengerCapacity ?? ""}
          onChangeText={(value) =>
            update("passengerCapacity", value.replace(/\D/g, "").slice(0, 2))
          }
          error={errors.passengerCapacity}
          placeholder={vehicle.category === "xl" ? "Mínimo 6 pasajeros" : "Ej. 4"}
          keyboardType="number-pad"
          autoCapitalize="none"
          maxLength={2}
        />
        <ImageField
          label="Foto del vehículo"
          helperText="Toma una foto donde se vea claramente la placa."
          value={vehicle.photo}
          onChangeImage={(image) => update("photo", image)}
          error={errors.photo}
        />
        {vehicle.isValid ? (
          <Text accessibilityRole="alert" style={styles.successMessage}>
            Los datos del vehículo cumplen con los requisitos.
          </Text>
        ) : null}
      </ScrollView>
      <View style={styles.actions}>
        <FormActions
          primaryLabel="Validar vehículo"
          onPrimaryPress={validate}
          secondaryLabel="Volver"
          onSecondaryPress={onBack}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  heading: {
    marginBottom: spacing.lg,
  },
  eyebrow: {
    color: colors.secondaryText,
    fontSize: typography.caption,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  description: {
    color: colors.secondaryText,
    fontSize: typography.body,
    lineHeight: 24,
  },
  successMessage: {
    color: colors.text,
    fontSize: typography.bodySmall,
    fontWeight: "600",
    marginTop: spacing.sm,
  },
});