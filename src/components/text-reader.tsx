import { useEffect } from "react";
import { useSettings } from "@/lib/settings-store";
import { useRouterState } from "@tanstack/react-router";

const HIGHLIGHT_CLASS = "tr-reading-highlight";

export function TextReader() {
  const { textReader } = useSettings();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;

    // Disabled, or on excluded routes
    const enabled = textReader && pathname !== "/" && !pathname.startsWith("/onboarding") && !pathname.startsWith("/carer");
    if (!enabled) {
      try { synth.cancel(); } catch {}
      document.querySelectorAll("." + HIGHLIGHT_CLASS).forEach((el) => el.classList.remove(HIGHLIGHT_CLASS));
      document.body.style.cursor = "";
      return;
    }

    let current: HTMLElement | null = null;
    const clearHighlight = () => {
      if (current) {
        current.classList.remove(HIGHLIGHT_CLASS);
        current = null;
      }
    };

    const stop = () => {
      try { synth.cancel(); } catch {}
      clearHighlight();
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Excluded surface: chat modal
      if (target.closest('[role="dialog"]')) return stop();
      const readable = target.closest('[data-readable="true"]') as HTMLElement | null;
      if (!readable) return stop();
      const text = (readable.innerText || readable.textContent || "").trim();
      if (!text) return stop();

      // Preempt surrounding click handlers (e.g. button wrappers)
      e.preventDefault();
      e.stopPropagation();
      (e as unknown as { stopImmediatePropagation: () => void }).stopImmediatePropagation?.();

      stop();
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.0;
        u.pitch = 1.0;
        u.onend = () => { if (current === readable) clearHighlight(); };
        u.onerror = () => { if (current === readable) clearHighlight(); };
        current = readable;
        readable.classList.add(HIGHLIGHT_CLASS);
        synth.speak(u);
      } catch {
        clearHighlight();
      }
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      stop();
      document.body.style.cursor = "";
    };
  }, [textReader, pathname]);

  return (
    <style>{`
      .${HIGHLIGHT_CLASS} { background-color: #FFF9C4 !important; transition: background-color 0.2s ease; }
      [data-readable="true"] { cursor: ${textReader ? "pointer" : "inherit"}; }
    `}</style>
  );
}
