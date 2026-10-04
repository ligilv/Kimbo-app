module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // zod 4 uses `export * as ns from`, which the React Native preset doesn't convert.
    '@babel/plugin-transform-export-namespace-from',
    // Reanimated 4 / Worklets. Must stay the last plugin.
    'react-native-worklets/plugin',
  ],
};
