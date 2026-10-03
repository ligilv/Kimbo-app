/* eslint-env jest */
// Worklets' official Jest mock. Its web build (used by the Reanimated resolver)
// throws on getUIRuntimeHolder, which Gesture Handler 3 calls on startup.
jest.mock('react-native-worklets', () =>
  require('react-native-worklets/src/mock'),
);

require('react-native-reanimated').setUpTests();
