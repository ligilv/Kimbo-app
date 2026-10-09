// Fixed timezone so date tests behave the same on every machine. India (UTC+5:30)
// also makes UTC-vs-local day mistakes show up as failures.
process.env.TZ = 'Asia/Kolkata';

module.exports = {
  preset: '@react-native/jest-preset',
  // These packages ship untranspiled ESM, so Jest must transform them too.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native(-[^/]+)?|@react-native(-community)?|@react-navigation)/)',
  ],
  // "@/x" -> "src/x", same as tsconfig.json and metro.config.js.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Jest resolves its untransformed .mjs build; use the CommonJS one instead.
    '^lucide-react-native$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
    '^lucide-react-native/icons/(.*)$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/icons/$1.js',
  },
  // Resolves the web build of Reanimated and Worklets instead of the native one.
  resolver: 'react-native-reanimated/jest/resolver',
  setupFiles: ['react-native-gesture-handler/jestSetup.js'],
  setupFilesAfterEnv: ['./jest-setup.js'],
};
