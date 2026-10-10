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

// The mic library is native; its own mock stands in (useSpeech.test has a finer one).
jest.mock('react-native-audio-api', () =>
  require('react-native-audio-api/mock'),
);

jest.mock('react-native-notify-kit', () =>
  require('react-native-notify-kit/jest-mock'),
);

// The document picker is a native module (and ships ESM).
jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(),
  types: { pdf: 'application/pdf' },
}));
