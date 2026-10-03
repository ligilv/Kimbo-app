module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Reanimated 4 / Worklets. Must stay the last plugin.
    'react-native-worklets/plugin',
  ],
};
