/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { API_URL } from './src/config';
import { startSync } from './src/features/sync/sync';

startSync();
// The hosted server sleeps when idle and takes ~1 min to wake. Knock on launch so
// it's up by the time the first meal is sent. Errors don't matter here.
fetch(API_URL).catch(() => {});

AppRegistry.registerComponent(appName, () => App);
