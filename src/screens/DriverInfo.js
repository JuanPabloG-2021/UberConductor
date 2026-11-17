import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import FormActions from "../components/registration/FormActions";
import DateField from "../components/registration/dateField";
import FormField from "../components/registration/FormField";
import ImageField from "../components/registration/ImageField";
import SelectField from "../components/registration/selectField";
import {
  getEighteenthBirthdayLimit,
  validateDriverInfo,
} from "../features/validations";
import { colors, spacing, typography } from "../themes";

const genderOptions = [
  { label: "Femenino", value: "female" },
  { label: "Hincha de pereira", value: "trans" },
  { label: "Masculino", value: "male" },
  { label: "No binario", value: "nonBinary" },
  { label: "Prefiero no decirlo", value: "undisclosed" },
];

const languageOptions = [
  { label: "Español", value: "es" },
  { label: "English", value: "en" },
];

export function DriverInfo({ driver, onChange, onContinue, isEditing = false }) {
  // var errors = driver.errors || {}; :3 , :v
  const errors = driver.errors || {};
  const update = (field, value) => onChange(field, value);
  const continueToVehicle = () => {
    const validationErrors = validateDriverInfo(driver);
    onChange("errors", validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      onContinue();
    }
  };

  console.log(driver.fullName);
  console.log(driver.identificationNumber);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>PERFIL DEL CONDUCTOR</Text>
          <Text style={styles.title}>Datos personales</Text>
          <Text style={styles.description}>
            Ingresa los datos tal como aparecen en tu documento. Los campos son de caracter obligatorio. Esto me ayudará a verificar tu identidad.
          </Text>
        </View>

        <ImageField
          label="Foto de perfil"
          helperText="Imagen ilustrativa. Selecciona una foto clara y legible de tu documento."
          exampleSource={require("../../assets/Foto-perfil.jpg")}
          value={driver.profilePhoto}
          {...console.log(driver.profilePhoto)}
          onChangeImage={(image) => update("profilePhoto", image)}
          error={errors.profilePhoto}
        />
        <FormField
          label="Nombre completo"
          value={driver.fullName ?? ""}
          onChangeText={(value) =>
            update("fullName", value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]/g, ""))
          }
          error={errors.fullName}
          placeholder="Escribe tu nombre completo"
          autoCapitalize="words"
          maxLength={50}
          {...console.log(driver.fullName)}
        />
        <FormField
          label="Número de documento"
          value={driver.identificationNumber ?? ""}
          onChangeText={(value) =>
            update("identificationNumber", value.replace(/\D/g, "").slice(0, 10))
          }
          error={errors.identificationNumber}
          placeholder="Entre 6 y 10 dígitos"
          keyboardType="number-pad"
          autoCapitalize="none"
          maxLength={10}
          editable={!isEditing}
          helperText={
            isEditing
              ? "No se puede cambiar el número de documento de una solicitud enviada."
              : undefined
          }
        />
        <DateField
          label="Fecha de cumpleaños"
          value={driver.birthDate}
          onChangeDate={(value) => update("birthDate", value)}
          maximumDate={getEighteenthBirthdayLimit()}
          error={errors.birthDate}
        />
        <FormField
          label="Número de celular"
          value={driver.phone ?? ""}
          onChangeText={(value) =>
            update("phone", value.replace(/\D/g, "").slice(0, 10))
          }
          error={errors.phone}
          placeholder="10 dígitos"
          keyboardType="phone-pad"
          autoCapitalize="none"
          maxLength={10}
        />
        <SelectField
          label="Género"
          value={driver.gender ?? ""}
          options={genderOptions}
          onValueChange={(value) => update("gender", value)}
          error={errors.gender}
        />
        <FormField
          label="Correo electrónico"
          value={driver.email ?? ""}
          onChangeText={(value) => update("email", value)}
          error={errors.email}
          placeholder="nombre@correo.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <SelectField
          label="Idioma"
          value={driver.language ?? "es"}
          options={languageOptions}
          onValueChange={(value) => update("language", value)}
          error={errors.language}
        />
      </ScrollView>
      <View style={styles.actions}>
        <FormActions
          primaryLabel="Continuar"
          onPrimaryPress={continueToVehicle}
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
});