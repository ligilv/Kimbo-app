import { useCallback } from 'react';
import { useMMKVBoolean, useMMKVObject } from 'react-native-mmkv';
import { storage } from '@/storage';
import type { Answers } from './types';

const ANSWERS_KEY = 'onboarding.answers';
const COMPLETED_KEY = 'onboarding.completed';

// Answers are saved as soon as they're given, so a half-finished onboarding
// resumes at the next question after the app is closed.
export function useAnswers(): [Answers, (patch: Answers) => void] {
  const [answers, setAnswers] = useMMKVObject<Answers>(ANSWERS_KEY, storage);
  const update = useCallback(
    (patch: Answers) => setAnswers(prev => ({ ...prev, ...patch })),
    [setAnswers],
  );
  return [answers ?? {}, update];
}

// True once the first answer is saved. The welcome screen is only for people who haven't started.
export function useHasStartedOnboarding() {
  const [answers] = useAnswers();
  return Object.keys(answers).length > 0;
}

export function useIsOnboarded() {
  return useMMKVBoolean(COMPLETED_KEY, storage)[0] === true;
}

export function useCompleteOnboarding() {
  const [, setCompleted] = useMMKVBoolean(COMPLETED_KEY, storage);
  return useCallback(() => setCompleted(true), [setCompleted]);
}
