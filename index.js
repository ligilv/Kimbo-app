/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { API_URL } from './src/config';
import notifee from 'react-native-notify-kit';
import { handleReminderEvent, startReminders } from './src/features/reminders/reminders';
import { startSync } from './src/features/sync/sync';

startSync();
startReminders();
// Taken / Snooze pressed on a reminder while the app is closed or in the background.
notifee.onBackgroundEvent(handleReminderEvent);
// The hosted server sleeps when idle and takes ~1 min to wake. Knock on launch so
// it's up by the time the first meal is sent. Errors don't matter here.
fetch(API_URL).catch(() => {});

AppRegistry.registerComponent(appName, () => App);
