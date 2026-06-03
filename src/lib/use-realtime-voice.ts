import { useCallback, useEffect, useRef, useState } from "react";
import { useScribe } from "@elevenlabs/react";
import { useServerFn } from "@tanstack/react-start";
import { realtimeScribeToken } from "@/lib/talk.functions";

export type VoiceStatus = "idle" | "recording" | "transcribing" | "error";

/**
 * Real-time microphone transcription using ElevenLabs Scribe realtime.
 * Calls `onLiveText` with the full live transcript (committed + partial)
 * each time it changes — caller can use it to update an input field
 * word-by-word as the user speaks.
 *
 * `onFinal(text)` is called once when recording stops, with the complete
 * committed transcript (used to submit).
 */
export function useRealtimeVoice(opts: {
  onLiveText?: (text: string) => void;
  onFinal?: (text: string) => void;
}) {
  const { onLiveText, onFinal } = opts;
  const getToken = useServerFn(realtimeScribeToken);

  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const committedRef = useRef<string>("");
  const partialRef = useRef<string>("");
  const liveCbRef = useRef(onLiveText);
  const finalCbRef = useRef(onFinal);
  liveCbRef.current = onLiveText;
  finalCbRef.current = onFinal;

  const emitLive = useCallback(() => {
    const t = (committedRef.current + " " + partialRef.current).trim();
    liveCbRef.current?.(t);
  }, []);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: "vad",
    onPartialTranscript: (data: any) => {
      partialRef.current = String(data?.text || "");
      emitLive();
    },
    onCommittedTranscript: (data: any) => {
      const t = String(data?.text || "").trim();
      if (t) {
        committedRef.current = (committedRef.current ? committedRef.current + " " : "") + t;
      }
      partialRef.current = "";
      emitLive();
    },
  });

  const supported = typeof window !== "undefined"
    && !!navigator.mediaDevices?.getUserMedia
    && typeof window.MediaRecorder !== "undefined";

  const start = useCallback(async () => {
    if (!supported) {
      setError("Voice input is not supported on this browser.");
      setStatus("error");
      return;
    }
    setError(null);
    committedRef.current = "";
    partialRef.current = "";
    try {
      const { token } = await getToken();
      if (!token) throw new Error("No token received");
      await scribe.connect({
        token,
        microphone: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      } as any);
      setStatus("recording");
    } catch (e) {
      setStatus("error");
      const msg = e instanceof Error ? e.message : "Could not start voice input";
      setError(/permission|denied|notallowed/i.test(msg) ? "Microphone permission denied." : msg);
    }
  }, [getToken, scribe, supported]);

  const stop = useCallback(async () => {
    try {
      await scribe.disconnect();
    } catch {}
    const finalText = (committedRef.current + " " + partialRef.current).trim();
    partialRef.current = "";
    committedRef.current = finalText;
    if (finalText) {
      finalCbRef.current?.(finalText);
    } else {
      setStatus("error");
      setError("No speech detected. Please try again.");
      return;
    }
    setStatus("idle");
  }, [scribe]);

  const reset = useCallback(() => {
    committedRef.current = "";
    partialRef.current = "";
    setError(null);
    setStatus("idle");
  }, []);

  useEffect(() => () => { void scribe.disconnect().catch(() => {}); }, [scribe]);

  return { status, error, start, stop, reset, supported };
}
