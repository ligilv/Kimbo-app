/* eslint-env jest */
// Worklets' official Jest mock. Its web build (used by the Reanimated resolver)
// throws on getUIRuntimeHolder, which Gesture Handler 3 calls on startup.
jest.mock('react-native-worklets', () =>
  require('react-native-worklets/src/mock'),
);

require('react-native-reanimated').setUpTests();

// MMKV swaps in its own in-memory mock under Jest, but merely importing
// react-native-nitro-modules looks up its native module and throws first.
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: () => {
      throw new Error('Nitro native modules are not available in Jest');
    },
  },
}));

jest.mock('react-native-permissions', () =>
  require('react-native-permissions/mock'),
);
