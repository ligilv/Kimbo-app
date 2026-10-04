/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { startSync } from './src/features/sync/sync';

// Background sending of profile and meals to the server. Started here, not in
// App.tsx, so rendering App in tests never touches the network.
startSync();

AppRegistry.registerComponent(appName, () => App);
