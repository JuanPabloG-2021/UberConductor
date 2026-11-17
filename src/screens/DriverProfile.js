import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  DriverButton,
  DriverError,
  DriverField,
  DriverPage,
  driverStyles,
} from "../components/driver/DriverComponents";
import {
  getDriverProfile,
  updateDriverProfile,
} from "../services/driverRuntime";
import { hasValidVehicleYear } from "../features/validations";
import { colors, radius, spacing, typography } from "../themes";

function updateProfileField(setProfile, section, field, value) {
  setProfile((current) => ({
    ...current,
    [section]: { ...current[section], [field]: value },
  }));
}

function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function validateProfile(profile) {
  const { driver, vehicle, documents } = profile;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!driver.full_name?.trim()) {
    return "Ingresa tu nombre completo.";
  }
  if (!/^\d{10}$/.test(driver.phone_number || "")) {
    return "Ingresa un número de celular de 10 dígitos.";
  }
  if (!isValidDateString(driver.birth_date)) {
    return "La fecha de nacimiento debe tener formato AAAA-MM-DD.";
  }
  if (!driver.gender) {
    return "Ingresa el género registrado en tu perfil.";
  }
  if (!emailPattern.test(driver.email || "")) {
    return "Ingresa un correo electrónico válido.";
  }
  if (!vehicle.category?.trim() || !vehicle.brand?.trim() || !vehicle.model?.trim()) {
    return "Completa la categoría, marca y modelo del vehículo.";
  }
  if (!/^[A-Z]{3}\d{3}$/.test((vehicle.license_plate || "").toUpperCase())) {
    return "Ingresa una placa colombiana válida, por ejemplo ABC123.";
  }
  if (!hasValidVehicleYear(vehicle.year)) {
    return `El año del vehículo debe tener 4 dígitos y no superar ${
      new Date().getFullYear() + 1
    }.`;
  }
  if (
    !/^\d+$/.test(String(vehicle.passenger_capacity || "")) ||
    Number(vehicle.passenger_capacity) < 1
  ) {
    return "Ingresa una capacidad de pasajeros válida.";
  }
  if (!vehicle.color?.trim()) {
    return "Ingresa el color del vehículo.";
  }
  for (const [label, value] of [
    ["licencia", documents.license_expiration_date],
    ["SOAT", documents.insurance_expiration_date],
    ["revisión técnico-mecánica", documents.technical_inspection_expiration_date],
  ]) {
    if (value && !isValidDateString(value)) {
      return `La fecha de vencimiento de ${label} debe tener formato AAAA-MM-DD.`;
    }
  }
  if (!emailPattern.test(documents.mercado_pago_email || "")) {
    return "Ingresa un correo de Mercado Pago válido.";
  }
  return null;
}

export default function DriverProfile() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedProfile = await getDriverProfile();
      setProfile(loadedProfile);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const pickPhoto = useCallback(async (section, field) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Se necesita permiso para seleccionar fotos de documentos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled) {
      return;
    }
    const selectedPhoto = result.assets?.[0];
    if (!selectedPhoto?.uri) {
      setError("No se pudo leer la imagen seleccionada.");
      return;
    }
    setProfile((current) => {
      const currentPhoto = current[section][field];
      return {
        ...current,
        [section]: {
          ...current[section],
          [field]: {
            ...selectedPhoto,
            replacedPath:
              currentPhoto?.path || currentPhoto?.replacedPath,
          },
        },
      };
    });
    setError(null);
  }, []);

  const save = useCallback(async () => {
    const validationError = validateProfile(profile);
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await updateDriverProfile(profile);
      await loadProfile();
      Alert.alert("Perfil actualizado", "Tus cambios se guardaron correctamente.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  }, [loadProfile, profile]);

  if (isLoading) {
    return (
      <DriverPage>
        <Text style={driverStyles.subtitle}>Cargando perfil…</Text>
      </DriverPage>
    );
  }

  if (!profile) {
    return (
      <DriverPage>
        <DriverError>{error || "No se pudo cargar el perfil."}</DriverError>
        <DriverButton label="Reintentar" onPress={loadProfile} />
      </DriverPage>
    );
  }

  return (
    <DriverPage scroll>
      <Text style={driverStyles.title}>Perfil del conductor</Text>
      <DriverError>{error}</DriverError>
      <View style={driverStyles.card}>
        <Text style={driverStyles.sectionTitle}>Datos personales</Text>
        <DocumentPhoto
          label="Foto de perfil"
          photo={profile.driver.profile_photo}
          onPress={() => pickPhoto("driver", "profile_photo")}
        />
        <DriverField
          label="Nombre completo"
          value={profile.driver.full_name}
          onChangeText={(value) =>
            updateProfileField(setProfile, "driver", "full_name", value)
          }
        />
        <DriverField
          label="Teléfono"
          keyboardType="phone-pad"
          value={profile.driver.phone_number}
          onChangeText={(value) =>
            updateProfileField(setProfile, "driver", "phone_number", value)
          }
        />
        <DriverField
          label="Fecha de nacimiento (AAAA-MM-DD)"
          placeholder="AAAA-MM-DD"
          value={profile.driver.birth_date}
          onChangeText={(value) =>
            updateProfileField(setProfile, "driver", "birth_date", value)
          }
        />
        <DriverField
          label="Género"
          value={profile.driver.gender}
          onChangeText={(value) =>
            updateProfileField(setProfile, "driver", "gender", value)
          }
        />
        <DriverField
          label="Correo electrónico"
          keyboardType="email-address"
          value={profile.driver.email}
          onChangeText={(value) =>
            updateProfileField(setProfile, "driver", "email", value)
          }
        />
        <DriverField
          label="Documento"
          editable={false}
          value={profile.driver.document_number}
        />
      </View>

      <View style={driverStyles.card}>
        <Text style={driverStyles.sectionTitle}>Vehículo</Text>
        <DocumentPhoto
          label="Foto del vehículo"
          photo={profile.vehicle.photo}
          onPress={() => pickPhoto("vehicle", "photo")}
        />
        <DriverField
          label="Categoría"
          value={profile.vehicle.category}
          onChangeText={(value) =>
            updateProfileField(setProfile, "vehicle", "category", value)
          }
        />
        <DriverField
          label="Placa"
          value={profile.vehicle.license_plate}
          onChangeText={(value) =>
            updateProfileField(setProfile, "vehicle", "license_plate", value)
          }
        />
        <DriverField
          label="Marca"
          value={profile.vehicle.brand}
          onChangeText={(value) =>
            updateProfileField(setProfile, "vehicle", "brand", value)
          }
        />
        <DriverField
          label="Modelo"
          value={profile.vehicle.model}
          onChangeText={(value) =>
            updateProfileField(setProfile, "vehicle", "model", value)
          }
        />
        <DriverField
          label="Año"
          keyboardType="number-pad"
          value={profile.vehicle.year}
          onChangeText={(value) =>
            updateProfileField(setProfile, "vehicle", "year", value)
          }
        />
        <DriverField
          label="Capacidad de pasajeros"
          keyboardType="number-pad"
          value={profile.vehicle.passenger_capacity}
          onChangeText={(value) =>
            updateProfileField(
              setProfile,
              "vehicle",
              "passenger_capacity",
              value
            )
          }
        />
        <DriverField
          label="Color"
          value={profile.vehicle.color}
          onChangeText={(value) =>
            updateProfileField(setProfile, "vehicle", "color", value)
          }
        />
      </View>

      <View style={driverStyles.card}>
        <Text style={driverStyles.sectionTitle}>Documentos</Text>
        <DocumentPhoto
          label="Licencia de conducción"
          photo={profile.documents.license_photo}
          onPress={() => pickPhoto("documents", "license_photo")}
        />
        <DriverField
          label="Vencimiento de licencia (AAAA-MM-DD)"
          placeholder="AAAA-MM-DD"
          value={profile.documents.license_expiration_date}
          onChangeText={(value) =>
            updateProfileField(
              setProfile,
              "documents",
              "license_expiration_date",
              value
            )
          }
        />
        <DocumentPhoto
          label="Seguro obligatorio (SOAT)"
          photo={profile.documents.insurance_photo}
          onPress={() => pickPhoto("documents", "insurance_photo")}
        />
        <DriverField
          label="Vencimiento del SOAT (AAAA-MM-DD)"
          placeholder="AAAA-MM-DD"
          value={profile.documents.insurance_expiration_date}
          onChangeText={(value) =>
            updateProfileField(
              setProfile,
              "documents",
              "insurance_expiration_date",
              value
            )
          }
        />
        <DocumentPhoto
          label="Revisión técnico-mecánica"
          photo={profile.documents.technical_inspection_photo}
          onPress={() =>
            pickPhoto("documents", "technical_inspection_photo")
          }
        />
        <DriverField
          label="Vencimiento de revisión (AAAA-MM-DD)"
          placeholder="AAAA-MM-DD"
          value={profile.documents.technical_inspection_expiration_date}
          onChangeText={(value) =>
            updateProfileField(
              setProfile,
              "documents",
              "technical_inspection_expiration_date",
              value
            )
          }
        />
        <DriverField
          label="Correo de Mercado Pago"
          keyboardType="email-address"
          value={profile.documents.mercado_pago_email}
          onChangeText={(value) =>
            updateProfileField(setProfile, "documents", "mercado_pago_email", value)
          }
        />
      </View>

      <DriverButton label="Guardar cambios" loading={isSaving} onPress={save} />
    </DriverPage>
  );
}

function DocumentPhoto({ label, photo, onPress }) {
  return (
    <View style={styles.photoRow}>
      <View style={styles.photoPreview}>
        {photo?.uri ? (
          <Image source={{ uri: photo.uri }} style={styles.photo} />
        ) : (
          <Text style={styles.noPhoto}>Sin foto</Text>
        )}
      </View>
      <View style={styles.photoDetails}>
        <Text style={styles.photoLabel}>{label}</Text>
        <Pressable accessibilityRole="button" onPress={onPress}>
          <Text style={styles.changePhoto}>Cambiar foto</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  photoRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
  },
  photoPreview: {
    alignItems: "center",
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.small,
    height: 66,
    justifyContent: "center",
    overflow: "hidden",
    width: 90,
  },
  photo: {
    height: "100%",
    width: "100%",
  },
  noPhoto: {
    color: colors.secondaryText,
    fontSize: typography.caption,
  },
  photoDetails: {
    flex: 1,
    paddingLeft: spacing.md,
  },
  photoLabel: {
    color: colors.text,
    fontSize: typography.bodySmall,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  changePhoto: {
    color: colors.secondaryText,
    fontSize: typography.caption,
    textDecorationLine: "underline",
  },
});
