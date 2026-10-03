const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // "@/x" -> "src/x". Mirrors "paths" in tsconfig.json and moduleNameMapper in jest.config.js.
    // Can't clash with scoped packages: an npm scope can't be empty.
    resolveRequest: (context, moduleName, platform) =>
      context.resolveRequest(
        context,
        moduleName.startsWith('@/')
          ? path.join(__dirname, 'src', moduleName.slice(2))
          : moduleName,
        platform,
      ),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
