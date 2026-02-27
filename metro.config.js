const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// On web, redirect any import of expo-sqlite to our empty stub.
// This prevents Metro from ever touching expo-sqlite's .wasm files on web.
const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === "web" &&
    (moduleName === "expo-sqlite" || moduleName.startsWith("expo-sqlite/"))
  ) {
    return {
      filePath: path.resolve(__dirname, "app/data/expo-sqlite-stub.js"),
      type: "sourceFile",
    };
  }
  if (originalResolver) {
    return originalResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./app/global.css" });
