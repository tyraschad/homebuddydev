import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { transcribe } from "@/lib/talk.functions";

export type VoiceStatus = "idle" | "recording" | "transcribing" | "error";

function pickMime(): string {
  if (typeof window === "undefined" || !("MediaRecorder" in window)) return "audio/webm";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const c of candidates) {
    try { if ((MediaRecorder as any).isTypeSupported?.(c)) return c; } catch {}
  }
  return "audio/webm";
}

export function useVoiceRecorder(onTranscript: (text: string) => void) {
  const callTranscribe = useServerFn(transcribe);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeRef = useRef<string>("audio/webm");

  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      mimeRef.current = mime;
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeRef.current });
        cleanup();
        if (blob.size < 500) {
          setStatus("error");
          setError("No audio detected. Please try again.");
          return;
        }
        setStatus("transcribing");
        try {
          const buf = await blob.arrayBuffer();
          let bin = ""; const bytes = new Uint8Array(buf);
          for (let i = 0; i < bytes.length; i += 0x8000) {
            bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)) as any);
          }
          const base64 = btoa(bin);
          const { text } = await callTranscribe({ data: { audio: base64, mime: mimeRef.current } });
          if (!text) {
            setStatus("error");
            setError("Could not understand. Please try again.");
            return;
          }
          setStatus("idle");
          onTranscript(text);
        } catch (e) {
          setStatus("error");
          setError(e instanceof Error ? e.message : "Transcription failed");
        }
      };
      recRef.current = rec;
      rec.start();
      setStatus("recording");
    } catch (e) {
      cleanup();
      setStatus("error");
      setError(e instanceof Error && e.name === "NotAllowedError"
        ? "Microphone permission denied."
        : "Could not access microphone.");
    }
  }, [callTranscribe, cleanup, onTranscript, supported]);

  const stop = useCallback(() => {
    if (recRef.current && recRef.current.state !== "inactive") {
      recRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setStatus("idle");
    setError(null);
  }, [cleanup]);

  return { status, error, start, stop, reset, supported };
}
