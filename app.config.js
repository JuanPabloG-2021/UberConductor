const fs = require("node:fs");
const path = require("node:path");

module.exports = ({ config }) => {
  const android = { ...config.android };
  const ios = { ...config.ios };
  const androidFirebaseConfig = path.join(__dirname, "google-services.json");
  const iosFirebaseConfig = path.join(__dirname, "GoogleService-Info.plist");
  const hasAndroidFirebaseConfig = fs.existsSync(androidFirebaseConfig);
  const hasIosFirebaseConfig = fs.existsSync(iosFirebaseConfig);
  const plugins = (config.plugins || []).filter((plugin) => {
    const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
    return ![
      "@react-native-firebase/app",
      "@react-native-firebase/messaging",
    ].includes(pluginName);
  });

  if (hasAndroidFirebaseConfig) {
    android.googleServicesFile = "./google-services.json";
  }
  if (hasIosFirebaseConfig) {
    ios.googleServicesFile = "./GoogleService-Info.plist";
  }
  if (hasAndroidFirebaseConfig && hasIosFirebaseConfig) {
    plugins.push(
      "@react-native-firebase/app",
      "@react-native-firebase/messaging"
    );
  }

  if (process.env.GOOGLE_MAPS_ANDROID_API_KEY) {
    android.config = {
      ...android.config,
      googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY },
    };
  }
  if (process.env.GOOGLE_MAPS_IOS_API_KEY) {
    ios.config = {
      ...ios.config,
      googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY,
    };
  }

  return { ...config, android, ios, plugins };
};
