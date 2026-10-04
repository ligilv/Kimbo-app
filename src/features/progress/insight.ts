import { useEffect, useState } from 'react';
import { API_URL } from '@/config';
import type { Profile } from '@/features/onboarding/types';
import type { Targets } from '@/features/onboarding/targets';
import { storage } from '@/storage';
import { ruleInsight, type Summary } from './summary';

const TIMEOUT_MS = 15_000;

// What the server's POST /insights takes: numbers only, no meal text.
export function insightRequest(s: Summary, profile: Profile, targets: Targets) {
  return {
    range: s.range,
    goal: profile.goal,
    diet: profile.diet,
    targets: { calories: targets.calories, proteinG: targets.proteinG },
    daysLogged: s.daysLogged,
    avgKcal: s.avgKcal,
    avgProtein: s.avgProtein,
    onTargetDays: s.onTargetDays,
    proteinHitDays: s.proteinHitDays,
    slotKcal: s.slotKcal,
    topFoods: s.topFoods,
  };
}

// Same summary on the same day -> same answer, so it's saved and reused: opening
// the screen again costs no Gemini call. Logging a meal changes the summary.
// ponytail: old days' keys stay behind (a few short strings a day); prune if it matters.
// Bump when the server's prompt changes, so old answers aren't reused.
const PROMPT_VERSION = 2;
const cacheKey = (body: string) =>
  `insight.v${PROMPT_VERSION}.${new Date().toDateString()}.${body}`;

async function fetchInsight(body: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}/insights`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { insight?: unknown };
    return typeof json.insight === 'string' && json.insight
      ? json.insight
      : null;
  } catch {
    return null; // offline, timeout
  } finally {
    clearTimeout(timer);
  }
}

// Kimbo's take for the summary: the rule line straight away, replaced by the
// AI one when it arrives. Never shows an error; the rule line is the fallback.
export function useInsight(s: Summary, profile: Profile, targets: Targets) {
  const body = JSON.stringify(insightRequest(s, profile, targets));
  const key = cacheKey(body);
  const [ai, setAi] = useState<{ key: string; text: string } | null>(() => {
    const cached = storage.getString(key);
    return cached ? { key, text: cached } : null;
  });
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const cached = ai?.key === key ? ai.text : storage.getString(key);
  useEffect(() => {
    if (cached || s.daysLogged === 0) return;
    let live = true;
    setLoadingKey(key);
    fetchInsight(body).then(text => {
      if (!live) return;
      setLoadingKey(null);
      if (text) {
        storage.set(key, text);
        setAi({ key, text });
      }
    });
    return () => {
      live = false;
    };
  }, [body, key, cached, s.daysLogged]);

  return {
    text: cached ?? ruleInsight(s),
    fromAI: !!cached,
    loading: loadingKey === key,
  };
}
