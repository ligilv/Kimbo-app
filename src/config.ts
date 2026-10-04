// Where meal text gets turned into food items.
// 'mock'  : a small offline matcher (src/features/logMeal/mockParser.ts), for
//           building the app without the server.
// 'server': the NestJS backend's POST /meals/parse (needs GEMINI_API_KEY there).
export const MEAL_PARSER: 'mock' | 'server' = 'server';

// The Android emulator reaches your Mac's localhost at 10.0.2.2. On a real phone,
// use your Mac's LAN IP, or the deployed server URL for release builds.
export const API_URL = 'http://10.0.2.2:3000';
