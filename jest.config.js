module.exports = {
  preset: '@react-native/jest-preset',
  // These packages ship untranspiled ESM, so Jest must transform them too.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native(-[^/]+)?|@react-native(-community)?|@react-navigation)/)',
  ],
  // "@/x" -> "src/x", same as tsconfig.json and metro.config.js.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Resolves the web build of Reanimated and Worklets instead of the native one.
  resolver: 'react-native-reanimated/jest/resolver',
  setupFiles: ['react-native-gesture-handler/jestSetup.js'],
  setupFilesAfterEnv: ['./jest-setup.js'],
};
