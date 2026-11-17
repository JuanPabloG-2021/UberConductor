import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing, typography } from "../themes";
import { useDriverLocation } from "../hooks/useDriverLocation";
import { useDriverSession } from "../context/DriverContext";
import { useEarnings } from "../hooks/useEarnings";
import {
  createTestTripRequest,
  formatCurrency,
} from "../services/driverRuntime";
import { DriverError } from "../components/driver/DriverComponents";
import DriverDrawer from "../components/driver/DriverDrawer";
import PassengerTestMode from "./PassengerTestMode";

const DEFAULT_REGION = {
  latitude: 4.711,
  longitude: -74.0721,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

export default function DriverHome({ navigation, route }) {
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isPassengerModeSelected, setIsPassengerModeSelected] = useState(false);
  const isPassengerMode =
    isPassengerModeSelected || route.params?.testPassengerMode === true;
  const preserveAvailabilityOnBlur = useRef(false);
  const { location, isAvailable, isReady, error, setAvailability } =
    useDriverLocation(isFocused);
  const {
    requests,
    activeTrip,
    setActiveTrip,
    notification,
    notificationError,
    error: requestError,
    sessionError,
    setTripRequestsEnabled,
    registerDriverAvailabilityAction,
    user,
  } = useDriverSession();
  const {
    totals,
    isLoading: isEarningsLoading,
    error: earningsError,
  } = useEarnings(user?.id);
  const region = location
    ? {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : DEFAULT_REGION;

  useEffect(
    () => registerDriverAvailabilityAction(setAvailability),
    [registerDriverAvailabilityAction, setAvailability]
  );

  const openIncomingRequest = useCallback(
    (tripId) => {
      preserveAvailabilityOnBlur.current = true;
      navigation.navigate("IncomingRequest", { tripId });
    },
    [navigation]
  );

  useEffect(() => {
    setTripRequestsEnabled(isFocused && isReady && isAvailable);
  }, [isAvailable, isFocused, isReady, setTripRequestsEnabled]);

  useFocusEffect(
    useCallback(
      () => () => {
        const keepAvailable = preserveAvailabilityOnBlur.current;
        preserveAvailabilityOnBlur.current = false;
        setTripRequestsEnabled(false);
        if (keepAvailable) {
          return;
        }
        setAvailability(false).catch((availabilityError) =>
          console.error(
            "No se pudo detener el seguimiento al salir del inicio.",
            availabilityError
          )
        );
      },
      [setAvailability, setTripRequestsEnabled]
    )
  );

  useEffect(() => {
    if (!isFocused) {
      return;
    }
    if (activeTrip) {
      if (isPassengerMode && ["completed", "paid"].includes(activeTrip.status)) {
        return;
      }
      if (activeTrip.status === "paid") {
        setActiveTrip(null);
        return;
      }
      navigation.navigate(
        activeTrip.status === "completed" ? "TripSummary" : "ActiveTrip",
        { tripId: activeTrip.id }
      );
      return;
    }
    const notificationTrip = requests.find(
      (trip) => trip.id === notification?.data?.tripId
    );
    if (isAvailable && requests.length > 0) {
      openIncomingRequest((notificationTrip || requests[0]).id);
    }
  }, [
    activeTrip,
    isAvailable,
    isFocused,
    isPassengerMode,
    navigation,
    notification,
    openIncomingRequest,
    requests,
    setActiveTrip,
  ]);

  const toggleAvailability = async () => {
    try {
      await setAvailability(!isAvailable);
    } catch (availabilityError) {
      Alert.alert("Disponibilidad", availabilityError.message);
    }
  };

  const createPassengerTestTrip = useCallback(
    async (paymentMethod) => {
      if (!isReady || !location) {
        throw new Error("Se necesita una ubicación válida para crear el viaje.");
      }
      if (activeTrip?.status === "paid") {
        setActiveTrip(null);
      }
      if (!isAvailable) {
        await setAvailability(true);
      }
      await createTestTripRequest(location, paymentMethod);
    },
    [activeTrip, isAvailable, isReady, location, setActiveTrip, setAvailability]
  );

  const switchToDriverMode = useCallback(() => {
    setIsPassengerModeSelected(false);
    if (route.params?.testPassengerMode === true) {
      navigation.setParams({ testPassengerMode: undefined });
    }
  }, [navigation, route.params?.testPassengerMode]);

  if (isPassengerMode) {
    return (
      <PassengerTestMode
        isBusy={
          Boolean(activeTrip && activeTrip.status !== "paid") ||
          requests.length > 0
        }
        isReady={isReady}
        location={location}
        onCreateTrip={createPassengerTestTrip}
        onSwitchToDriver={switchToDriverMode}
        onTripUpdated={setActiveTrip}
        trip={activeTrip}
        userId={user?.id}
      />
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        initialRegion={region}
        region={region}
        showsUserLocation={Boolean(location)}
        showsMyLocationButton
        style={[
          StyleSheet.absoluteFill,
          { top: insets.top, bottom: insets.bottom },
        ]}
      >
        {location ? (
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title="Tu ubicación"
            description={isAvailable ? "Disponible" : "No disponible"}
          />
        ) : null}
      </MapView>

      <View
        pointerEvents="none"
        style={[styles.topMapFade, { top: insets.top }]}
      />

      <View style={[styles.topControls, { top: insets.top + spacing.md }]}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityLabel="Abrir menú"
            accessibilityRole="button"
            onPress={() => setIsDrawerVisible(true)}
            style={styles.menuButton}
          >
            <Ionicons color={colors.text} name="menu-outline" size={26} />
          </Pressable>
          <View style={styles.earningsBadge}>
            <Text style={styles.earningsLabel}>Ganancias de hoy</Text>
            <Text style={styles.earningsAmount}>
              {earningsError
                ? "$ —"
                : isEarningsLoading
                  ? "$ …"
                  : formatCurrency(totals.day)}
            </Text>
          </View>
        </View>
        <View style={styles.errors}>
          <DriverError>{error}</DriverError>
          <DriverError>{requestError?.message || sessionError}</DriverError>
          <DriverError>{notificationError}</DriverError>
          <DriverError>{earningsError?.message}</DriverError>
        </View>
      </View>

      <View
        style={[
          styles.bottomActionCard,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => setIsPassengerModeSelected(true)}
          style={({ pressed }) => [
            styles.testRequestButton,
            pressed && styles.connectionButtonPressed,
          ]}
        >
          <Text style={styles.testRequestText}>Cambiar a pasajero · Prueba</Text>
        </Pressable>
        {requests.length > 0 && isAvailable ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => openIncomingRequest(requests[0].id)}
            style={styles.requestButton}
          >
            <Text style={styles.requestText}>
              Ver solicitud ({requests.length})
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !isReady }}
          disabled={!isReady}
          onPress={toggleAvailability}
          style={({ pressed }) => [
            styles.connectionButton,
            isAvailable && styles.connectedButton,
            pressed && styles.connectionButtonPressed,
            !isReady && styles.disabledButton,
          ]}
        >
          <Text
            style={[
              styles.connectionButtonText,
              isAvailable && styles.connectedButtonText,
            ]}
          >
            {isAvailable ? "Desconectarse" : "Conectarse"}
          </Text>
        </Pressable>
      </View>
      <DriverDrawer
        onClose={() => setIsDrawerVisible(false)}
        onNavigate={(route) => navigation.navigate(route)}
        visible={isDrawerVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topControls: {
    left: 0,
    paddingHorizontal: spacing.md,
    position: "absolute",
    right: 0,
    zIndex: 1,
  },
  topMapFade: {
    backgroundImage:
      "linear-gradient(to bottom, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0))",
    height: 72,
    left: 0,
    position: "absolute",
    right: 0,
  },
  topRow: {
    alignItems: "center",
    height: 52,
    justifyContent: "center",
  },
  menuButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    elevation: 4,
    height: 46,
    left: 0,
    justifyContent: "center",
    position: "absolute",
    top: 0,
    width: 46,
  },
  earningsBadge: {
    alignItems: "center",
    backgroundColor: colors.text,
    borderRadius: 28,
    elevation: 4,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  earningsLabel: {
    color: "#D8D8D8",
    fontSize: typography.caption,
  },
  earningsAmount: {
    color: colors.surface,
    fontSize: typography.body,
    fontWeight: "700",
  },
  connectionButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderColor: colors.text,
    borderWidth: 1,
    borderRadius: 28,
    elevation: 4,
    justifyContent: "center",
    marginTop: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    width: "72%",
  },
  connectedButton: {
    backgroundColor: colors.text,
  },
  connectionButtonText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "700",
  },
  connectedButtonText: {
    color: colors.surface,
  },
  connectionButtonPressed: {
    opacity: 0.82,
  },
  disabledButton: {
    opacity: 0.6,
  },
  errors: {
    alignSelf: "stretch",
    marginTop: spacing.xs,
  },
  bottomActionCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.large,
    borderTopRightRadius: radius.large,
    elevation: 8,
    alignItems: "center",
    bottom: 0,
    left: 0,
    padding: spacing.md,
    position: "absolute",
    right: 0,
  },
  testRequestButton: {
    alignItems: "center",
    backgroundColor: colors.mutedSurface,
    borderColor: colors.text,
    borderRadius: radius.medium,
    borderWidth: 1,
    justifyContent: "center",
    marginBottom: spacing.xs,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    width: "100%",
  },
  testRequestText: {
    color: colors.text,
    fontSize: typography.bodySmall,
    fontWeight: "700",
  },
  requestButton: {
    alignItems: "center",
    backgroundColor: colors.text,
    borderRadius: radius.medium,
    padding: spacing.md,
    width: "100%",
  },
  requestText: {
    color: colors.surface,
    fontWeight: "700",
  },
});
