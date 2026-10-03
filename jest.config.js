module.exports = {
  preset: '@react-native/jest-preset',
  // React Navigation ships untranspiled ESM, so Jest must transform it too.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation)/)',
  ],
};
