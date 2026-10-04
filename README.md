# Kimbo

A calorie and protein tracker that feels like texting a friend. Tell Kimbo what you ate (type it, say it, or snap a photo) and it works out the calories and macros, then shows how your day is going against a target worked out from your body and goal.

Built with React Native CLI (bare, new architecture, Hermes) and a small NestJS server.

## Features

- **Chat onboarding.** Nine short questions (name, goal, body basics, activity, diet). Answers save as you go, so closing the app mid-way resumes with "welcome back" where you left off. Ends with your plan and why.
- **Home.** Week strip with a mini ring per day, a big calorie ring (turns turmeric when you go over), protein/carbs/fat bars, and the day's meals by slot. Swipe left/right to change day. Tap the ring for "how your target is worked out".
- **Log a meal three ways.** Type it ("2 chapati and dal"), say it (on-device speech-to-text, `en-IN`), or take/pick a photo. Kimbo replies with a confirmation card you can adjust (quantities, remove items) before saving. If the meal is vague it asks one follow-up question.
- **Edit later.** Tap any food to change the amount, move it to another meal or day, or delete it.
- **Kimbo nudge.** One message a day from simple rules: what to log next, a protein tip in the evening (matched to your diet), "on track", or a gentle note when you're over. Past days get a one-line recap.
- **First launch.** Until the first meal is saved, Home shows your plan ("3,030 kcal and 115 g protein a day") with a button to log the first meal.
- **Profile.** Your targets and every answer, grouped and editable. Saving recalculates the targets and shows a small celebration with the new numbers. "Delete my data" removes everything from the phone and the server.
- **Streak.** "🔥 6" on Home counts days in a row with at least one meal. One missed day per week is forgiven as a rest day 🌙. A small celebration after the first meal of each day.
- **Progress.** Last 7 or 30 days: average calories and protein against target, days on target, a bar per day, most-logged foods, and "Kimbo's take": two sentences from Gemini written from the summary (cached for the day; a rule-based line when offline).
- **First-time guide.** A three-step spotlight tour of the tab bar, with Skip.
- **Works offline.** Meals and the profile live on the phone; the server copy catches up in the background.

## How targets are calculated

All in `src/features/onboarding/targets.ts`, and recalculated from your answers every time (never stored), so editing your profile updates every screen at once.

1. **Calories burned at rest (BMR):** Mifflin-St Jeor: `10 × kg + 6.25 × cm − 5 × age + 5` (men) or `− 161` (women); `− 78` (the midpoint) for "prefer not to say".
2. **A normal day (TDEE):** BMR × activity (1.2 mostly sitting, 1.375 on your feet some, 1.55 active, 1.725 very active).
3. **Target:** TDEE − 500 to lose (about 0.45 kg a week), + 300 to build muscle, ± 0 to maintain. Never below 1,200 kcal.
4. **Protein:** 1.6 g/kg when losing, 1.8 when gaining, 1.2 when maintaining. **Fat:** 25 % of calories. **Carbs:** the rest.

Past days are compared against your *current* targets. If you change your goal, last week's rings redraw against the new numbers. Simplest to reason about; storing a target per day would be the upgrade.

These are estimates, not medical advice.

## How meal parsing works

The app never holds an AI key. It sends the text and/or a compressed photo (max 1024 px, JPEG 70 %) to the server's `POST /meals/parse`. The server asks Google Gemini for structured JSON (each item with quantity, unit, kcal, protein, carbs, fat), validates it with zod, and returns it. If the main model is slow or overloaded it retries once on a lighter backup model. The prompt is tuned for Indian food and household units (katori, roti, plate).

If the description is too vague, Gemini returns one short question instead ("How many chapatis?"); your answer is sent back with the original text/photo.

Timeouts: 15 s for text, 35 s for photos. Failures show a retry bubble; nothing is lost.

## Insights

`POST /insights` takes only numbers the app has already worked out (averages, days on target, calories per meal slot, top food names), never raw meal text. The server turns them into plain sentences ("Protein target reached on 0 of 6 logged days") before asking Gemini, so the model repeats facts instead of misreading numbers, and is told never to claim a target was met unless the facts say so.

## Data storage

- **On the phone (main copy):** MMKV key-value storage. Onboarding answers under one key; meals under one key per day (`meals.YYYY-MM-DD`, local calendar date, not UTC).
- **On the server (backup):** Supabase Postgres via Prisma. Every change goes into a small queue on the phone (the outbox) and is sent in the background; failed sends retry every 30 s and when the app comes back to the foreground. Last write wins by the app's `updatedAt`.
- **No accounts.** Each install gets a random device id, sent as `x-device-id`. It keeps phones apart; it is not authentication.
- **Delete my data** calls `DELETE /me` (the database cascades to profile, meals, items), then wipes the phone. If the server can't be reached, you choose whether to wipe the phone only.

## Project structure

```
src/
  screens/          Welcome, Onboarding, Home, LogMeal, Profile
  features/
    onboarding/     questions script, targets maths, units
    meals/          meal store (MMKV), dates, hooks
    home/           ring, bars, week strip, meals list, nudge rules
    logMeal/        chat hook, parser client, photo, speech
    kimbo/          the centre tab button's "log a meal" sheet
    profile/        plan-updated and delete-data modals
    sync/           outbox, device id, background sync
  components/       Text, BottomSheet, chat bubbles/input
  navigation/       static React Navigation 7 stack + tabs
../server/          NestJS API (parse, sync), Prisma schema
```

## For reviewers: demo account

On Profile, tap the version number (**Kimbo v1.0.0**) five times quickly and confirm. The app swaps in Ligil's profile and a month of meals ending today: a 23-day streak with one rest day 🌙, water history, and enough data for Progress and Kimbo's take. It works in release builds and replaces whatever was on the phone. The data is generated on the phone each time, so it always ends "today".

## Run locally

Requires Node ≥ 22.11 and a working [React Native environment](https://reactnative.dev/docs/set-up-your-environment).

```sh
# app
npm install
npm start          # Metro
npm run android    # second terminal
npm run ios        # first time: cd ios && bundle exec pod install

# server (in ../server)
npm install
cp .env.example .env   # GEMINI_API_KEY, GEMINI_MODEL, GEMINI_FALLBACK_MODEL, DATABASE_URL, DIRECT_URL
npx prisma migrate deploy --config prisma7.config.ts
npm run start:dev      # http://localhost:3000
```

`src/config.ts` points the app at the server. The default `http://10.0.2.2:3000` reaches your computer from the Android emulator only; a real phone needs your computer's LAN IP or a deployed URL. Set `MEAL_PARSER = 'mock'` to try logging with no server at all.

## Tests

```sh
npm test              # app: targets, dates, meal store, parser, sync, nudge, speech
cd ../server && npm test
```

## Known limitations

- **Voice** uses the phone's speech recogniser; some phones need internet for it, and the Android emulator gets no microphone audio unless started with host audio enabled.
- **Calorie numbers are AI estimates.** The confirmation card exists so you can correct them.
- **No restore after reinstall.** The server keeps a copy, but nothing downloads it back to a new install yet.
- **Device id isn't login.** Anyone with the id could read that device's data; real accounts would be next.
- **No manual food search** (needs a food database), weight tracking, progress charts, water, streaks or reminders.
