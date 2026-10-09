// Where meal text gets turned into food items.
// 'mock'  : a small offline matcher (src/features/logMeal/mockParser.ts), for
//           building the app without the server.
// 'server': the NestJS backend's POST /meals/parse (needs GEMINI_API_KEY there).
export const MEAL_PARSER: 'mock' | 'server' = 'server';

// Release builds use the deployed server (Render; it sleeps after 15 idle minutes,
// so the app pings it on launch). Debug builds use the server on your computer,
// which the Android emulator reaches at 10.0.2.2.
export const API_URL = __DEV__
  ? 'http://10.0.2.2:3000'
  : 'https://mira-api.onrender.com';

// Send profile and meals to the server's database in the background. The phone
// stays the main copy, so the app works the same when this is off or offline.
export const SYNC_ENABLED = true;
