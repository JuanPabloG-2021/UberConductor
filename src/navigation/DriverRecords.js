import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { DriverInfo } from "../screens/DriverInfo";
import { DriverVehicle } from "../screens/DriverVehicle";
import { DriverDocuments } from "../screens/DriverDocuments";
import {
  validateDriverDocuments,
  validateDriverInfo,
  validateDriverVehicle,
} from "../features/validations";
import {
  getDriverRegistration,
  isDriverRegistrationPendingError,
  saveDriverRegistration,
} from "../services/driverRegistration";
import { colors, spacing, typography } from "../themes";

const tabs = [
  { key: "info", label: "Datos", icon: "person-outline" },
  { key: "vehicle", label: "Vehículo", icon: "car-sport-outline" },
  { key: "documents", label: "Documentos", icon: "document-text-outline" },
];

function preservePreviousStoragePath(currentValue, nextValue) {
  if (
    !nextValue?.uri ||
    nextValue.storagePath ||
    (!currentValue?.storagePath && !currentValue?.replacedStoragePath)
  ) {
    return nextValue;
  }

  return {
    ...nextValue,
    replacedStoragePath:
      currentValue.storagePath || currentValue.replacedStoragePath,
  };
}

export default function DriverRecords({ navigation, route }) {
  const isEditing = route.params?.isEditing === true;
  const [activeTab, setActiveTab] = useState("info");
  const [driver, setDriver] = useState({ language: "es" });
  const [vehicle, setVehicle] = useState({});
  const [documents, setDocuments] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editLoadState, setEditLoadState] = useState(
    isEditing ? "loading" : "idle"
  );
  const [editLoadError, setEditLoadError] = useState(null);
  const isSubmittingRef = useRef(false);
  const isConfirmationOpenRef = useRef(false);

  const updateDriver = (field, value) => {
    setDriver((current) => ({
      ...current,
      [field]:
        field === "profilePhoto"
          ? preservePreviousStoragePath(current[field], value)
          : value,
      ...(field === "errors"
        ? {}
        : { errors: { ...current.errors, [field]: undefined } }),
    }));
  };
  const updateVehicle = (field, value) => {
    setVehicle((current) => ({
      ...current,
      [field]:
        field === "photo"
          ? preservePreviousStoragePath(current[field], value)
          : value,
      ...(field === "errors"
        ? {}
        : { errors: { ...current.errors, [field]: undefined }, isValid: false }),
    }));
  };
  const validateVehicle = () =>
    setVehicle((current) => ({ ...current, isValid: true }));
  const updateDocuments = (field, value) => {
    setDocuments((current) => ({
      ...current,
      [field]: [
        "licensePhoto",
        "soatPhoto",
        "technicalInspectionPhoto",
      ].includes(field)
        ? preservePreviousStoragePath(current[field], value)
        : value,
      ...(field === "errors"
        ? {}
        : { errors: { ...current.errors, [field]: undefined } }),
    }));
  };

  const loadExistingRegistration = useCallback(async () => {
    setEditLoadState("loading");
    setEditLoadError(null);

    try {
      const registration = await getDriverRegistration();
      if (!registration) {
        throw new Error(
          "No encontramos una solicitud pendiente para editar."
        );
      }

      setDriver({
        ...registration.driver,
        language: registration.driver.language || "es",
      });
      setVehicle(registration.vehicle);
      setDocuments(registration.documents);
      setEditLoadState("ready");
    } catch (error) {
      console.error("No se pudo cargar la solicitud del conductor.", error);
      setEditLoadError(
        error?.message || "No se pudo cargar la solicitud. Intenta nuevamente."
      );
      setEditLoadState("error");
    }
  }, []);

  useEffect(() => {
    if (isEditing) {
      loadExistingRegistration();
    }
  }, [isEditing, loadExistingRegistration]);

  const saveRegistration = async () => {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      await saveDriverRegistration({
        driver,
        vehicle,
        documents,
        isEditing,
      });
      navigation.replace("ApprovalPending");
    } catch (error) {
      if (isDriverRegistrationPendingError(error)) {
        Alert.alert(
          "Perfil pendiente de validación",
          error.message,
          [{ text: "Entendido" }]
        );
        return;
      }

      console.error("No se pudo guardar el registro del conductor.", error);
      Alert.alert(
        "No se pudo enviar",
        error?.message ||
          "Ocurrió un error al guardar el registro. Inténtalo de nuevo."
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const submitRegistration = () => {
    if (isSubmittingRef.current || isConfirmationOpenRef.current) {
      return;
    }

    const driverErrors = validateDriverInfo(driver);
    if (Object.keys(driverErrors).length > 0) {
      setDriver((current) => ({ ...current, errors: driverErrors }));
      setActiveTab("info");
      return;
    }

    const vehicleErrors = validateDriverVehicle(vehicle);
    if (Object.keys(vehicleErrors).length > 0) {
      setVehicle((current) => ({
        ...current,
        errors: vehicleErrors,
        isValid: false,
      }));
      setActiveTab("vehicle");
      return;
    }

    const documentErrors = validateDriverDocuments(
      documents,
      vehicle,
      driver
    );
    if (Object.keys(documentErrors).length > 0) {
      setDocuments((current) => ({
        ...current,
        errors: documentErrors,
      }));
      setActiveTab("documents");
      return;
    }

    isConfirmationOpenRef.current = true;
    Alert.alert(
      isEditing ? "Confirmar cambios" : "Confirmar envío",
      isEditing
        ? "¿Confirmas que deseas actualizar tu solicitud de registro?"
        : "¿Confirmas que deseas enviar tus datos para revisión?",
      [
        {
          text: "Cancelar",
          style: "cancel",
          onPress: () => {
            isConfirmationOpenRef.current = false;
          },
        },
        {
          text: isEditing ? "Guardar cambios" : "Enviar",
          onPress: () => {
            isConfirmationOpenRef.current = false;
            saveRegistration();
          },
        },
      ]
    );
  };

  if (isEditing && editLoadState === "loading") {
    return (
      <View style={styles.editState}>
        <ActivityIndicator color={colors.text} size="large" />
        <Text style={styles.editStateText}>Cargando tu solicitud...</Text>
      </View>
    );
  }

  if (isEditing && editLoadState === "error") {
    return (
      <View style={styles.editState}>
        <Text accessibilityRole="alert" style={styles.editLoadError}>
          {editLoadError}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={loadExistingRegistration}
          style={styles.editStateButton}
        >
          <Text style={styles.editStateButtonText}>Reintentar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.cancelEditButton}
        >
          <Text style={styles.cancelEditText}>Volver a espera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      {isEditing ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.editHeader}
        >
          <Text style={styles.cancelEditText}>‹ Volver a espera</Text>
          <Text style={styles.editHeaderTitle}>Editar solicitud pendiente</Text>
        </Pressable>
      ) : null}
      <KeyboardAvoidingView
        behavior="position"
        style={styles.screen}
        contentContainerStyle={styles.screenContent}
      >
        {activeTab === "info" ? (
          <DriverInfo
            driver={driver}
            onChange={updateDriver}
            onContinue={() => setActiveTab("vehicle")}
            isEditing={isEditing}
          />
        ) : null}
        {activeTab === "vehicle" ? (
          <DriverVehicle
            vehicle={vehicle}
            onChange={updateVehicle}
            onBack={() => setActiveTab("info")}
            onComplete={() => {
              validateVehicle();
              setActiveTab("documents");
            }}
          />
        ) : null}
        {activeTab === "documents" ? (
          <DriverDocuments
            driver={driver}
            documents={documents}
            vehicle={vehicle}
            onChange={updateDocuments}
            onBack={() => setActiveTab("vehicle")}
            onComplete={submitRegistration}
            isSubmitting={isSubmitting}
            isEditing={isEditing}
          />
        ) : null}
      </KeyboardAvoidingView>

      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.key;
          const color = isSelected ? colors.text : colors.placeholder;

          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={styles.tab}
            >
              <Ionicons name={tab.icon} size={24} color={color} />
              <Text
                style={[
                  styles.tabLabel,
                  isSelected ? styles.selectedTabLabel : null,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  screenContent: {
    flex: 1,
  },
  editHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  editHeaderTitle: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  cancelEditText: {
    color: colors.secondaryText,
    fontSize: typography.bodySmall,
    fontWeight: "600",
  },
  editState: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  editStateText: {
    color: colors.secondaryText,
    fontSize: typography.body,
    marginTop: spacing.md,
  },
  editLoadError: {
    color: colors.error,
    fontSize: typography.body,
    lineHeight: 24,
    textAlign: "center",
  },
  editStateButton: {
    alignItems: "center",
    backgroundColor: colors.text,
    borderRadius: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  editStateButtonText: {
    color: colors.surface,
    fontSize: typography.body,
    fontWeight: "600",
  },
  cancelEditButton: {
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 68,
    paddingBottom: spacing.xs,
    paddingTop: spacing.sm,
  },
  tab: {
    alignItems: "center",
    flex: 1,
    gap: spacing.xs,
    justifyContent: "center",
  },
  tabLabel: {
    color: colors.placeholder,
    fontSize: typography.caption,
  },
  selectedTabLabel: {
    color: colors.text,
    fontWeight: "700",
  },
});