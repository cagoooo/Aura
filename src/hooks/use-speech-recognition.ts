"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

// Browser-prefixed and unprefixed names. Chrome / Edge use webkitSpeechRecognition.
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

type Listener = (text: string) => void;

export interface SpeechRecognitionState {
  supported: boolean;
  isListening: boolean;
  interim: string;          // partial transcript while user is still speaking
  start: (onFinal: Listener) => void;
  stop: () => void;
  toggle: (onFinal: Listener) => void;
  error: string | null;
}

/**
 * Wrap webkitSpeechRecognition in a tidy hook. zh-TW recognition; results are
 * appended (interim shown live, final fired via callback when user pauses).
 *
 * Browser support:
 * - Chrome / Edge desktop: full support
 * - Chrome Android: works
 * - Safari (macOS / iOS 14.5+): partial — needs explicit user gesture and
 *   single-shot mode (continuous=false)
 * - Firefox: NOT supported (no SpeechRecognition API at all)
 */
export function useSpeechRecognition(): SpeechRecognitionState {
  const [supported, setSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const onFinalRef = useRef<Listener | null>(null);

  useEffect(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    setSupported(true);

    const recognition = new Ctor();
    recognition.lang = 'zh-TW';
    recognition.interimResults = true;
    recognition.continuous = false;  // stop on natural pause; user can re-start

    recognition.onresult = (event: any) => {
      let interimText = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interimText += res[0].transcript;
      }
      if (interimText) setInterim(interimText);
      if (finalText) {
        setInterim('');
        onFinalRef.current?.(finalText.trim());
      }
    };

    recognition.onerror = (event: any) => {
      const code = event.error;
      // 'no-speech' is a normal silent stop, don't show as error
      if (code !== 'no-speech' && code !== 'aborted') {
        setError(`語音辨識錯誤：${code}`);
      }
      setIsListening(false);
      setInterim('');
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterim('');
    };

    recognitionRef.current = recognition;
    return () => {
      try { recognition.abort(); } catch { /* ignore */ }
    };
  }, []);

  const start = useCallback((onFinal: Listener) => {
    if (!recognitionRef.current) return;
    setError(null);
    onFinalRef.current = onFinal;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      // Calling start() while already running throws; safe to ignore
    }
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    try { recognitionRef.current.stop(); } catch { /* ignore */ }
    setIsListening(false);
  }, []);

  const toggle = useCallback((onFinal: Listener) => {
    if (isListening) stop();
    else start(onFinal);
  }, [isListening, start, stop]);

  return { supported, isListening, interim, start, stop, toggle, error };
}
