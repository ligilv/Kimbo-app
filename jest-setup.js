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

// Native speech recognition doesn't exist in Jest.
jest.mock('@dbkable/react-native-speech-to-text', () => {
  const subscription = { remove: () => {} };
  return {
    start: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
    isAvailable: jest.fn(() => Promise.resolve(true)),
    requestPermissions: jest.fn(() => Promise.resolve(true)),
    addSpeechResultListener: jest.fn(() => subscription),
    addSpeechErrorListener: jest.fn(() => subscription),
    addSpeechEndListener: jest.fn(() => subscription),
  };
});
