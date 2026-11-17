import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { DriverError } from "./DriverComponents";
import { getDriverMenuProfile } from "../../services/driverRuntime";
import { colors, spacing, typography } from "../../themes";

const DRAWER_WIDTH = Math.min(Dimensions.get("window").width * 0.84, 360);

const MENU_ITEMS = [
  { label: "Perfil", icon: "person-outline", route: "DriverProfile" },
  { label: "Historial", icon: "time-outline", route: "TripHistory" },
  { label: "Ganancias", icon: "wallet-outline", route: "Earnings" },
  { label: "Configuración", icon: "settings-outline", route: "DriverSettings" },
];

export default function DriverDrawer({ visible, onClose, onNavigate }) {
  const [translateX] = useState(() => new Animated.Value(-DRAWER_WIDTH));
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const isLoading = visible && !profile && !error;

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    let isMounted = true;
    Animated.timing(translateX, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
    getDriverMenuProfile()
      .then((menuProfile) => {
        if (isMounted) {
          setProfile(menuProfile);
          setError(null);
        }
      })
      .catch((profileError) => {
        console.error("No se pudo cargar el perfil del menú.", profileError);
        if (isMounted) {
          setError(profileError.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [translateX, visible]);

  const closeDrawer = useCallback(
    (afterClose) => {
      Animated.timing(translateX, {
        toValue: -DRAWER_WIDTH,
        duration: 180,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          onClose();
          afterClose?.();
        }
      });
    },
    [onClose, translateX]
  );

  const initials = profile?.fullName
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => closeDrawer()}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Cerrar menú"
          accessibilityRole="button"
          onPress={() => closeDrawer()}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            styles.drawer,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
            <View style={styles.profileHeader}>
              <Pressable
                accessibilityLabel="Cerrar menú"
                accessibilityRole="button"
                onPress={() => closeDrawer()}
                style={styles.closeButton}
              >
                <Ionicons color={colors.surface} name="close" size={24} />
              </Pressable>
              <View style={styles.avatar}>
                {profile?.profilePhoto?.uri ? (
                  <Image
                    source={{ uri: profile.profilePhoto.uri }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.initials}>{initials || "C"}</Text>
                )}
              </View>
              {isLoading ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text numberOfLines={1} style={styles.profileName}>
                  {profile?.fullName || "Conductor"}
                </Text>
              )}
            </View>

            <DriverError>{error}</DriverError>
            <View style={styles.menu}>
              {MENU_ITEMS.map((item) => (
                <Pressable
                  accessibilityRole="button"
                  key={item.route}
                  onPress={() => closeDrawer(() => onNavigate(item.route))}
                  style={({ pressed }) => [
                    styles.menuItem,
                    pressed && styles.menuItemPressed,
                  ]}
                >
                  <Ionicons
                    color={colors.text}
                    name={item.icon}
                    size={21}
                    style={styles.menuIcon}
                  />
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Ionicons
                    color={colors.secondaryText}
                    name="chevron-forward"
                    size={18}
                  />
                </Pressable>
              ))}
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.42)",
    flex: 1,
  },
  drawer: {
    backgroundColor: colors.surface,
    elevation: 18,
    height: "100%",
    width: DRAWER_WIDTH,
  },
  safeArea: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "flex-start",
    backgroundColor: colors.text,
    minHeight: 208,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  closeButton: {
    alignItems: "center",
    alignSelf: "flex-end",
    height: 40,
    justifyContent: "center",
    marginBottom: spacing.sm,
    width: 40,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 38,
    borderWidth: 2,
    height: 76,
    justifyContent: "center",
    overflow: "hidden",
    width: 76,
  },
  avatarImage: {
    height: "100%",
    width: "100%",
  },
  initials: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: "700",
  },
  profileName: {
    color: colors.surface,
    fontSize: typography.body,
    fontWeight: "700",
    marginTop: spacing.sm,
    maxWidth: "100%",
  },
  menu: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  menuItem: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 56,
    paddingHorizontal: spacing.sm,
  },
  menuItemPressed: {
    backgroundColor: colors.mutedSurface,
  },
  menuIcon: {
    marginRight: spacing.md,
  },
  menuLabel: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    fontWeight: "600",
  },
});
