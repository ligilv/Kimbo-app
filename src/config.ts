import { Platform } from 'react-native';

// Where meal text gets turned into food items.
// 'mock'  : a small offline matcher (src/features/logMeal/mockParser.ts), for
//           building the app without the server.
// 'server': the NestJS backend's POST /meals/parse (needs GEMINI_API_KEY there).
export const MEAL_PARSER: 'mock' | 'server' = 'server';

// Your computer's Wi-Fi address, for debug builds on a real phone (same Wi-Fi).
// It can change when the router restarts: check with `ipconfig getifaddr en0`.
const DEV_LAN_IP = '192.168.1.4';

// Release builds use the deployed server (Render; it sleeps after 15 idle minutes,
// so the app pings it on launch). Debug builds use the server on your computer:
// the Android emulator reaches it at 10.0.2.2; iOS (simulator or phone) at the
// computer's Wi-Fi address, which works for both.
export const API_URL = __DEV__
  ? Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : `http://${DEV_LAN_IP}:3000`
  : 'https://mira-api.onrender.com';

// Send profile and meals to the server's database in the background. The phone
// stays the main copy, so the app works the same when this is off or offline.
export const SYNC_ENABLED = true;
