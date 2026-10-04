import {
  addSpeechEndListener,
  addSpeechErrorListener,
  addSpeechResultListener,
  type SpeechError,
  start,
  stop,
} from '@dbkable/react-native-speech-to-text';
import { useCallback, useEffect, useRef, useState } from 'react';

const LANGUAGE = 'en-IN';
const NOTHING_HEARD_MS = 6_000;
const MAX_LISTEN_MS = 30_000;
// Android sends "speech ended" a moment BEFORE the final words, and short
// phrases ("idli") have no live words first. Wait this long for late words
// before deciding nothing was heard.
const LATE_RESULT_MS = 1_000;

type Handlers = {
  onText: (text: string) => void; // live words while speaking, then the final words
  onNothingHeard: () => void;
  onError: (error: SpeechError | 'start-failed') => void;
};

// On-device speech-to-text (en-IN). Never sends anything by itself: the words
// go to onText, and the screen puts them in the text box to fix before sending.
export function useSpeech(handlers: Handlers) {
  const [listening, setListening] = useState(false);
  const latest = useRef(handlers);
  latest.current = handlers;
  const heard = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const stopListening = useCallback(async () => {
    clearTimers();
    try {
      await stop();
    } catch {
      setListening(false);
    }
  }, []);

  useEffect(() => {
    const result = addSpeechResultListener(({ transcript }) => {
      if (!transcript) return;
      heard.current = true;
      latest.current.onText(transcript);
    });
    const error = addSpeechErrorListener(err => {
      clearTimers();
      setListening(false);
      latest.current.onError(err);
    });
    const end = addSpeechEndListener(() => {
      clearTimers();
      setListening(false);
      if (heard.current) return;
      timers.current.push(
        setTimeout(() => {
          if (!heard.current) latest.current.onNothingHeard();
          heard.current = true; // report "nothing heard" once per try
        }, LATE_RESULT_MS),
      );
    });
    return () => {
      result.remove();
      error.remove();
      end.remove();
      clearTimers();
      stop().catch(() => {});
    };
  }, []);

  const startListening = useCallback(async () => {
    clearTimers(); // drop a pending "nothing heard" check from the last try
    heard.current = false;
    try {
      await start({ language: LANGUAGE });
    } catch {
      latest.current.onError('start-failed');
      return;
    }
    setListening(true);
    timers.current = [
      setTimeout(() => {
        if (!heard.current) stopListening();
      }, NOTHING_HEARD_MS),
      setTimeout(stopListening, MAX_LISTEN_MS),
    ];
  }, [stopListening]);

  return { listening, startListening, stopListening };
}
