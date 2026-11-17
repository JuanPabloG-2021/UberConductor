import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';


import DriverRecords from './src/navigation/DriverRecords';

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer style={styles.container}>
        <StatusBar style="dark" />
        <DriverRecords />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
