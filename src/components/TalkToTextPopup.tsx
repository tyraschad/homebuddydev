import { useEffect, useState } from "react";
import { X, Mic, Keyboard, Send, Microwave, Clock, Phone } from "lucide-react";
import { useSettings } from "@/lib/settings-store";

type Action = { icon: React.ReactNode; label: string };

export function TalkToTextPopup({ onClose }: { onClose: () => void }) {
  const { theme, sizes, cardBorder, inputBorder, buttonBorder, highContrast } = useSettings();
  const [recording, setRecording] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const actions: Action[] = [
    { icon: <Microwave size={24} strokeWidth={2} color={theme.text} />, label: "Heat food for 30 seconds" },
    { icon: <Clock size={24} strokeWidth={2} color={theme.text} />, label: "Set cooking time" },
    { icon: <Phone size={24} strokeWidth={2} color={theme.text} />, label: "Call Sarah" },
  ];

  const circleBg = theme.bg === "#FFFFFF" ? "#1A1A2E" : "#E8E8E8";
  const circleIcon = theme.bg === "#FFFFFF" ? "#FFFFFF" : "#1A1A2E";
  const sendBg = circleBg;
  const sendIcon = circleIcon;

  const submit = () => {
    if (!text.trim()) return;
    // hook up later
    setText("");
  };

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 50,
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @keyframes ttt-pulse {
          0% { box-shadow: 0 0 0 0 rgba(220,38,38,0.5); }
          70% { box-shadow: 0 0 0 18px rgba(220,38,38,0); }
          100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); }
        }
        @keyframes ttt-dots {
          0%, 20% { opacity: 0.2; }
          50% { opacity: 1; }
          80%, 100% { opacity: 0.2; }
        }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          background: theme.card,
          border: cardBorder,
          borderRadius: 12,
          padding: 30,
          width: "90%",
          maxWidth: 700,
          maxHeight: "90vh",
          overflowY: "auto",
          color: theme.text,
          boxSizing: "border-box",
          lineHeight: 1.5,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 4,
            color: theme.text,
          }}
        >
          <X size={24} strokeWidth={2} color={theme.text} />
        </button>

        {/* Mic circle */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
          <button
            type="button"
            onClick={() => setRecording((r) => !r)}
            aria-label={recording ? "Stop recording" : "Start recording"}
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: circleBg,
              border: `3px solid ${theme.text}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              animation: recording ? "ttt-pulse 1.4s infinite" : undefined,
              padding: 0,
            }}
          >
            <Mic size={60} strokeWidth={2} color={circleIcon} />
          </button>
        </div>

        {/* Listening indicator */}
        <div
          style={{
            marginTop: 16,
            textAlign: "center",
            fontFamily: "'Trebuchet MS', sans-serif",
            fontWeight: 700,
            fontSize: 18,
            color: theme.text,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {recording ? (
            <>
              <span>Listening</span>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: theme.text,
                    display: "inline-block",
                    animation: `ttt-dots 1.2s ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </>
          ) : (
            <span>Tap to talk</span>
          )}
        </div>

        {/* Description */}
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <div style={{ fontFamily: "Verdana, sans-serif", fontSize: 20, color: theme.text }}>
            Ask me anything
          </div>
          <div
            style={{
              fontFamily: "Verdana, sans-serif",
              fontSize: 14,
              color: theme.muted,
              marginTop: 8,
            }}
          >
            How to use a device, your reminders, or to call someone.
          </div>
        </div>

        {/* Suggested actions */}
        <div
          style={{
            marginTop: 30,
            display: "flex",
            justifyContent: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                background: theme.card,
                color: theme.text,
                border: buttonBorder,
                borderRadius: 20,
                padding: "12px 20px",
                height: 48,
                fontFamily: "'Trebuchet MS', sans-serif",
                fontWeight: highContrast ? 800 : 700,
                fontSize: 14,
                cursor: "pointer",
                lineHeight: 1.2,
              }}
            >
              {a.icon}
              <span>{a.label}</span>
            </button>
          ))}
        </div>

        {/* Text input */}
        <div
          style={{
            marginTop: 30,
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: theme.card,
            border: inputBorder,
            borderRadius: 20,
            padding: 16,
            boxSizing: "border-box",
          }}
        >
          <Keyboard size={24} strokeWidth={2} color={theme.text} />
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="Type your request..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: "Verdana, sans-serif",
              fontSize: 16,
              color: theme.text,
              padding: 8,
              minWidth: 0,
            }}
          />
          <button
            type="button"
            onClick={submit}
            aria-label="Send"
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: sendBg,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Send size={20} strokeWidth={2} color={sendIcon} />
          </button>
        </div>

        {/* Silence unused sizes lint */}
        <span style={{ display: "none" }}>{sizes.body}</span>
      </div>
    </div>
  );
}
