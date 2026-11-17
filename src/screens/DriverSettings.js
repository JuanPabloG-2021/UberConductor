import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DriverButton,
  DriverError,
  DriverPage,
  driverStyles,
} from "../components/driver/DriverComponents";
import {
  getDriverProfile,
  signOutDriver,
  updateDriverProfile,
} from "../services/driverRuntime";
import { colors, radius, spacing, typography } from "../themes";

const LANGUAGE_KEY = "driver:language";
const LANGUAGES = [
  { id: "es", label: "Español" },
  { id: "en", label: "English" },
];

export default function DriverSettings({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [language, setLanguage] = useState("es");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState(null);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedProfile = await getDriverProfile();
      setProfile(loadedProfile);
      setLanguage(loadedProfile.driver.language || "es");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getDriverProfile()
      .then((loadedProfile) => {
        if (isMounted) {
          setProfile(loadedProfile);
          setLanguage(loadedProfile.driver.language || "es");
        }
      })
      .catch((loadError) => {
        if (isMounted) {
          setError(loadError.message);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const saveSettings = async () => {
    if (!profile) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const updatedProfile = {
        ...profile,
        driver: { ...profile.driver, language },
      };
      await updateDriverProfile(updatedProfile);
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
      setProfile(updatedProfile);
      Alert.alert("Configuración actualizada", "Tus cambios se guardaron.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert("Cerrar sesión", "¿Quieres cerrar la sesión del conductor?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: async () => {
          setIsSigningOut(true);
          setError(null);
          try {
            const pushCleanupWarning = await signOutDriver();
            const parent = navigation.getParent();
            if (!parent) {
              throw new Error("No se pudo volver a la pantalla de registro.");
            }
            parent.reset({
              index: 0,
              routes: [{ name: "DriverRegistration" }],
            });
            if (pushCleanupWarning) {
              Alert.alert(
                "Sesión cerrada",
                `No se pudo limpiar el registro de notificaciones push: ${pushCleanupWarning}`
              );
            }
          } catch (signOutError) {
            setError(signOutError.message);
            setIsSigningOut(false);
          }
        },
      },
    ]);
  };

  return (
    <DriverPage scroll>
      <Text style={driverStyles.title}>Configuración</Text>
      <DriverError>{error}</DriverError>
      {error && !profile ? (
        <DriverButton
          label="Reintentar"
          loading={isLoading}
          onPress={loadProfile}
        />
      ) : null}
      <View style={driverStyles.card}>
        <Text style={driverStyles.sectionTitle}>Idioma</Text>
        <Text style={driverStyles.subtitle}>
          Selecciona el idioma de preferencia de tu cuenta.
        </Text>
        <View style={styles.languages}>
          {LANGUAGES.map((item) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: language === item.id }}
              disabled={isLoading || !profile}
              key={item.id}
              onPress={() => setLanguage(item.id)}
              style={[
                styles.languageOption,
                language === item.id && styles.selectedLanguage,
              ]}
            >
              <Text
                style={[
                  styles.languageText,
                  language === item.id && styles.selectedLanguageText,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <DriverButton
        disabled={isLoading || !profile}
        label={isLoading ? "Cargando configuración…" : "Guardar cambios"}
        loading={isSaving}
        onPress={saveSettings}
      />
      <DriverButton
        danger
        label="Cerrar sesión"
        loading={isSigningOut}
        onPress={confirmSignOut}
      />
    </DriverPage>
  );
}

const styles = StyleSheet.create({
  languages: {
    flexDirection: "row",
  },
  languageOption: {
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.medium,
    marginRight: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectedLanguage: {
    backgroundColor: colors.text,
  },
  languageText: {
    color: colors.text,
    fontSize: typography.bodySmall,
  },
  selectedLanguageText: {
    color: colors.surface,
    fontWeight: "700",
  },
});
