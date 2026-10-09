# Mira

A health assistant that tells you the one thing that matters right now. Mira knows your meal times, reads your blood report, and asks short questions ("Your Vitamin D is low. Seen a doctor about it?") instead of handing you a dashboard to fill in.

Built with React Native CLI (bare, new architecture, Hermes) and a small NestJS server.

## Reviewer feedback → what changed

| Feedback | What changed |
|---|---|
| "Feels like a 2016 data-logging app. If I drink less water, then what?" | Today is now a conversation, not a dashboard. Mira speaks first with the one next thing to do (log lunch, take a dose, follow up on a report value), with one-tap answers. Any number that didn't lead to an action was removed: no ring, no macro grid, no water, no week strip. |
| "Act like a personal assistant: Vitamin D is low → have you seen a doctor? → set up the medicine → remind." | Exactly that flow: upload a report → "3 of 24 values need attention" → "Seen a doctor about it?" → *Yes, got a prescription* opens a one-sheet medicine setup → Mira asks at that time each day. *Not yet* explains why it matters, suggests foods that fit your diet, and asks again in 2 days. |
| "STT detected wrong words; typing always threw an error." | Voice never logs anything directly: the words land in a **"Mira heard: …"** card you can edit, then *Looks right*. The typing error most likely came from the build pointing at `10.0.2.2`, an address that only works on the emulator; release builds now always use the deployed server, and every failure is a human sentence with *Try again*. |
| "Show what was understood before logging." | Every log goes through a review card: items, portion steppers, a dashed **Guessed portion** badge where the amount was assumed, totals, then *Save as dinner*. Nothing is saved before that. Vague input gets one tap-to-answer question (*Half a katori / 1 katori / A plate / Just guess*). |
| Header covering content; white band under the tab bar. | Solid headers, safe-area insets on the tab bar, and every surface is the same white, so there's no band. |
| Four repeated empty meal cards. | Gone. A new user sees one message: "Let's log your first meal", with *Snap it / Say it / Skip*. |
| Profile-update modal "weirdly loud". | Routine updates are a one-line toast ("Target updated to 1,390 kcal"). No celebration modals. |

## How it works

### The engine (`src/engine/nextAction.ts`)

A pure function, no React and no clock of its own, so every state of the Today screen is a unit test (`__tests__/nextAction.test.ts`). Given the time, your meal times, today's logs, medicines, open report follow-ups, skips and snoozes, it returns one action, in this order:

1. A medicine more than 30 min overdue (solid black message)
2. A report follow-up waiting for an answer
3. A meal more than an hour late (until the next meal's window opens, so a missed breakfast stops nagging at lunch)
4. A meal whose window is open (30 min before to 60 min after your usual time)
5. A medicine due within 30 min
6. After 6 pm and under 60 % of your protein target: one food suggestion that respects veg / egg / non-veg
7. Otherwise "All caught up. Next: lunch around 1:30 pm", or tomorrow's first meal

A skip counts as handled for the day; a snooze brings it back later. Urgency is shown by lightness, never colour: normal grey, overdue solid black.

### Reminders when the app is closed

Local notifications (`react-native-notify-kit`, the maintained fork of Notifee), scheduled on the phone with no server: each meal at your usual time unless already logged or skipped, each medicine at its time with **Taken** / **Snooze 30 min** buttons that work without opening the app, and "remind me in 2 days" report follow-ups. Which reminders should exist is a pure, tested function (`src/features/reminders/plan.ts`); every time a meal, dose or setting changes, the phone's list is replaced with the new plan, so a reminder for something already done never fires. Permission is asked once, after the first meal or medicine, never on first launch. No meal reminders when meal times "vary a lot".

### Milestones

Rare, earned moments from Mira in the conversation, never popups: 3 and 7 days of logging in a row (then every week, 30 and 90), a full week within 10% of the calorie target, and every dose of the day taken. Worked out from the logs, not stored (`src/features/today/milestones.ts`). Her greeting also mentions the current run ("Day 4 in a row.").

### Appearance

Light by default (a health app shouldn't open dark), with Dark and Match phone in Health → Settings. Mira stays black and white in both: the dark palette is the same greys swapped, so the urgency rule still holds (a late message is the solid "ink" bubble: black in light mode, white in dark). Colours are read through `colors` / `themedStyles` in `src/theme.ts`; switching redraws the app on the same screen.

### Today is rebuilt, not stored

The conversation isn't saved as chat history. It's rebuilt from what happened (meals, doses, skips, follow-up answers, each with its time) plus the engine's next message (`src/features/today/feed.ts`). Editing or deleting a meal can never leave a stale message behind.

### Logging a meal

Snap, say or type, all from the composer at the bottom of Today. Text and photos go to `POST /meals/parse`; the server asks Gemini for structured JSON (validated with zod on both sides) with Indian household units. "Took my vitamin D" in the same box marks the dose as taken instead of being sent as food.

### Reports

Photo or PDF → `POST /reports/extract` → Gemini reads the values, ranges and the test date, and writes one plain-language line, three short reasons and helpful foods for each flagged value. The result screen shows flagged values first with a range bar, the rest collapsed, and a trend line when the same value appears in more than one report ("14 Sep: 12.1 → 29 Sep: 14 · recheck ~28 Dec"). Each flagged value opens a follow-up that Mira asks about on Today. Not medical advice, and it says so.

### Targets

`src/features/onboarding/targets.ts`: Mifflin-St Jeor BMR × activity = what you burn on a normal day; −500 kcal to lose (~0.45 kg/week), +300 to gain, never below 1,200. Protein 1.6 g/kg (lose), 1.8 (gain), 1.2 (maintain). Recalculated from your answers every time, never stored.

## Cut, and why

- **Water tracker:** a number with no "then what".
- **Fitness / workouts:** out of scope for a food-and-health assistant; the activity level already shapes the target.
- **Progress screen:** charts you look at once. The useful bit (are you short on protein?) is now something Mira says at the right time.
- **Free-form chatbot:** an open chat box sets expectations it can't meet. The one input does food and "took my medicine"; everything else is a tap.
- **Separate Profile tab:** editing your plan is rare; it lives behind *Edit plan* on Health.
- **Always-visible 4-meal grid:** empty slots made new users feel behind. Logged meals appear as your replies in the conversation.
- **Celebration modals for routine updates:** replaced by toasts.
- **Login:** a device id keeps phones apart without a sign-up wall. Real accounts are the next step.

## Why React Native CLI over Expo

The app needs native modules that weren't available as Expo config plugins for RN 0.87 at the time (on-device speech recognition, MMKV via Nitro), and the bare project gives direct control over the APK (R8 shrinking, arm64-only).

## Data

- **Phone is the main copy** (MMKV): meals per local calendar day (`meals.YYYY-MM-DD`), medicines and per-day doses, reports and follow-ups, per-day skips/snoozes.
- **Server copy:** profile and meals sync to Supabase Postgres in the background through an outbox (retries every 30 s and on foreground). Medicines and reports stay on the phone.
- **Delete my data** (Health → Settings) removes the server copy, then wipes the phone.

## Project structure

```
src/
  engine/           nextAction (what Mira says next) + time helpers
  screens/          Welcome, Onboarding, Today, Health, ReportResult
  features/
    today/          feed builder, logging flow, review/heard cards, sheets
    reports/        report API, store + follow-ups, why-it-matters sheet
    medicines/      medicine store, setup sheet, "took my…" matcher
    onboarding/     question script, targets maths, meal times
    meals/          meal store (MMKV), dates
    logMeal/        meal parser client, photo, speech
    day/            per-day skips and snoozes
    sync/           outbox, device id, background sync
  components/       Mascot, Button, Toast, BottomSheet, chat bubbles
../server/          NestJS API: meals, reports, sync; Gemini + mock providers
```

## For reviewers: demo account

Health → Settings (gear) → tap **Mira v1.0.0** five times and confirm. You get a month of meals ending now, a report from ten days ago with three flagged values (one being treated, one asked about today, one coming back in two days) and a daily Vitamin D3 with a week of doses. Generated on the phone, so it always ends "today".

## Run locally

Requires Node ≥ 22.11 and a working [React Native environment](https://reactnative.dev/docs/set-up-your-environment).

```sh
npm install
npm start          # Metro
npm run android    # second terminal
npm run ios        # first time: cd ios && bundle exec pod install

# server (in ../server)
npm install
cp .env.example .env   # GEMINI_API_KEY, DATABASE_URL, DIRECT_URL; AI_PROVIDER=mock to skip Gemini
npm run start:dev      # http://localhost:3000
```

Debug builds talk to `http://10.0.2.2:3000` (your computer, from the Android emulator); release builds use **https://mira-api.onrender.com** (sleeps after 15 idle minutes; the app pings it on launch).

## Tests

```sh
npm test                    # engine, feed inputs, onboarding, targets, meal store, parser, sync, demo
cd ../server && npm test
```

## Known limitations

- **Voice** uses the phone's speech recogniser; some phones need internet for it. The editable "heard" card is the safety net for wrong words.
- **Reminders are planned two days ahead.** If the app isn't opened for longer than that, they stop until it is. On Android they may arrive a few minutes late (the phone batches alarms to save battery).
- **Numbers are AI estimates.** The review card exists so you can correct them. Report reading is not medical advice.
- **No restore after reinstall**, and a device id isn't login.
