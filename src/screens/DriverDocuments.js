import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import FormActions from "../components/registration/FormActions";
import DateField from "../components/registration/dateField";
import FormField from "../components/registration/FormField";
import ImageField from "../components/registration/ImageField";
import {
  hasValidVehicleYear,
  requiresTechnicalInspection,
  validateDriverDocuments,
} from "../features/validations";
import { colors, radius, spacing, typography } from "../themes";

const COMMISSION_PERCENT = 20;

function getTomorrow() {
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

export function DriverDocuments({
  driver,
  documents,
  vehicle,
  onChange,
  onBack,
  onComplete,
  isSubmitting = false,
  isEditing = false,
}) {
  const errors = documents.errors || {};
  const isTechnicalInspectionRequired = requiresTechnicalInspection(
    vehicle.year
  );
  const shouldShowInspectionExemption =
    hasValidVehicleYear(vehicle.year) && !isTechnicalInspectionRequired;
  const minimumExpiryDate = getTomorrow();
  const update = (field, value) => onChange(field, value);

  const submit = () => {
    const validationErrors = validateDriverDocuments(
      documents,
      vehicle,
      driver
    );
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
          <Text style={styles.title}>Documentación</Text>
          <Text style={styles.description}>
            Comparte tus documentos vigentes y los datos para recibir tus pagos.
          </Text>
        </View>

        <FormField
          label="Número de licencia de conducción"
          value={documents.licenseNumber ?? ""}
          onChangeText={(value) =>
            update("licenseNumber", value.replace(/\D/g, "").slice(0, 20))
          }
          error={errors.licenseNumber}
          placeholder="Escribe el número de tu licencia"
          keyboardType="number-pad"
          autoCapitalize="none"
          maxLength={20}
          editable={!isEditing}
          helperText={
            isEditing
              ? "No se puede cambiar el número de licencia de una solicitud enviada."
              : undefined
          }
        />
        <ImageField
          label="Foto de la licencia de conducción"
          helperText="Asegúrate de que el número y la fecha se lean claramente."
          value={documents.licensePhoto}
          onChangeImage={(image) => update("licensePhoto", image)}
          error={errors.licensePhoto}
        />
        <DateField
          label="Vencimiento de la licencia"
          value={documents.licenseExpiration}
          onChangeDate={(value) => update("licenseExpiration", value)}
          minimumDate={minimumExpiryDate}
          error={errors.licenseExpiration}
        />

        <ImageField
          label="Foto del SOAT"
          helperText="Carga una imagen legible del documento."
          value={documents.soatPhoto}
          onChangeImage={(image) => update("soatPhoto", image)}
          error={errors.soatPhoto}
        />
        <DateField
          label="Vencimiento del SOAT"
          value={documents.soatExpiration}
          onChangeDate={(value) => update("soatExpiration", value)}
          minimumDate={minimumExpiryDate}
          error={errors.soatExpiration}
        />

        {isTechnicalInspectionRequired ? (
          <>
            <ImageField
              label="Foto de la revisión técnico-mecánica"
              helperText="Se solicita para vehículos con 5 años o más, según el año del modelo."
              value={documents.technicalInspectionPhoto}
              onChangeImage={(image) =>
                update("technicalInspectionPhoto", image)
              }
              error={errors.technicalInspectionPhoto}
            />
            <DateField
              label="Vencimiento de la revisión técnico-mecánica"
              value={documents.technicalInspectionExpiration}
              onChangeDate={(value) =>
                update("technicalInspectionExpiration", value)
              }
              minimumDate={minimumExpiryDate}
              error={errors.technicalInspectionExpiration}
            />
          </>
        ) : shouldShowInspectionExemption ? (
          <View style={styles.infoNotice}>
            <Text style={styles.infoNoticeText}>
              Por el año del modelo registrado, no necesitas adjuntar la
              revisión técnico-mecánica en este paso.
            </Text>
          </View>
        ) : null}

        <FormField
          label="Correo de la cuenta de Mercado Pago"
          value={documents.mercadoPagoEmail ?? ""}
          onChangeText={(value) => update("mercadoPagoEmail", value)}
          error={errors.mercadoPagoEmail}
          placeholder="nombre@correo.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: Boolean(documents.termsAccepted) }}
          onPress={() => update("termsAccepted", !documents.termsAccepted)}
          style={styles.termsRow}
        >
          <View
            style={[
              styles.checkbox,
              documents.termsAccepted ? styles.checkboxChecked : null,
              errors.termsAccepted ? styles.checkboxWithError : null,
            ]}
          >
            {documents.termsAccepted ? (
              <Text style={styles.checkmark}>✓</Text>
            ) : null}
          </View>
          <Text style={styles.termsText}>
            Acepto los términos y condiciones. Entiendo que la comisión por
            viaje es del {COMMISSION_PERCENT}%.
          </Text>
        </Pressable>
        {errors.termsAccepted ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {errors.termsAccepted}
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.actions}>
        <FormActions
          primaryLabel={isEditing ? "Guardar cambios" : "Finalizar registro"}
          onPrimaryPress={submit}
          loading={isSubmitting}
          loadingLabel={isEditing ? "Actualizando solicitud..." : "Guardando registro..."}
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
  infoNotice: {
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.small,
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  infoNoticeText: {
    color: colors.secondaryText,
    fontSize: typography.bodySmall,
    lineHeight: 21,
  },
  termsRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  checkbox: {
    alignItems: "center",
    borderColor: colors.inputBorder,
    borderRadius: radius.small,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    marginTop: 1,
    width: 24,
  },
  checkboxChecked: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  checkboxWithError: {
    borderColor: colors.error,
  },
  checkmark: {
    color: colors.surface,
    fontSize: typography.bodySmall,
    fontWeight: "700",
  },
  termsText: {
    color: colors.text,
    flex: 1,
    fontSize: typography.bodySmall,
    lineHeight: 21,
  },
  error: {
    color: colors.error,
    fontSize: typography.caption,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
});
