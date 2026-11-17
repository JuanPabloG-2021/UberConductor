import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DriverProvider } from "../context/DriverContext";
import ActiveTrip from "../screens/ActiveTrip";
import DriverHome from "../screens/DriverHome";
import DriverProfile from "../screens/DriverProfile";
import Earnings from "../screens/Earnings";
import IncomingRequest from "../screens/IncomingRequest";
import DriverSettings from "../screens/DriverSettings";
import TripHistory from "../screens/TripHistory";
import TripSummary from "../screens/TripSummary";

const Stack = createNativeStackNavigator();

export default function DriverNavigator() {
  return (
    <DriverProvider>
      <Stack.Navigator
        screenOptions={{
          headerBackTitle: "Atrás",
          headerStyle: { backgroundColor: "#FFFFFF" },
          headerTintColor: "#000000",
          headerTitleStyle: { fontWeight: "700" },
        }}
      >
        <Stack.Screen
          name="DriverHome"
          component={DriverHome}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="IncomingRequest"
          component={IncomingRequest}
          options={{ title: "Solicitud entrante", presentation: "modal" }}
        />
        <Stack.Screen
          name="ActiveTrip"
          component={ActiveTrip}
          options={{ title: "Viaje en curso", gestureEnabled: false }}
        />
        <Stack.Screen
          name="TripSummary"
          component={TripSummary}
          options={{ title: "Resumen del viaje", gestureEnabled: false }}
        />
        <Stack.Screen name="Earnings" component={Earnings} options={{ title: "Ganancias" }} />
        <Stack.Screen
          name="TripHistory"
          component={TripHistory}
          options={{ title: "Historial de carreras" }}
        />
        <Stack.Screen
          name="DriverProfile"
          component={DriverProfile}
          options={{ title: "Perfil" }}
        />
        <Stack.Screen
          name="DriverSettings"
          component={DriverSettings}
          options={{ title: "Configuración" }}
        />
      </Stack.Navigator>
    </DriverProvider>
  );
}
