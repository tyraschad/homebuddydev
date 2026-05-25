import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Settings, Mic, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Albert's Home" },
      { name: "description", content: "Albert's simple home screen." },
    ],
  }),
});

type Overlay = "chat" | "call" | null;

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
function formatDay(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "long" });
}
function formatTime(d: Date) {
  return d
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/\s/, " ");
}
function greeting(d: Date) {
  const h = d.getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

function Index() {
  const [now, setNow] = useState(() => new Date());
  const [overlay, setOverlay] = useState<Overlay>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 15);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-10">
      {/* Header */}
      <header className="flex items-center justify-between mb-6 md:mb-8 px-2">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          {greeting(now)}, Albert
        </h1>
        <button
          type="button"
          className="flex items-center gap-2 text-lg md:text-xl text-foreground/80 hover:text-foreground transition-colors"
        >
          <Settings className="size-6" strokeWidth={1.5} />
          <span>Settings</span>
        </button>
      </header>

      {/* Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5 md:gap-6">
        {/* Left column 40% */}
        <div className="md:col-span-2 flex flex-col gap-5 md:gap-6">
          <Card className="flex flex-col items-center justify-center text-center py-10 min-h-[220px]">
            <p className="text-sm md:text-base text-muted-foreground">
              {formatDate(now)}
            </p>
            <p
              className="font-serif font-bold text-foreground leading-none mt-3 text-6xl md:text-7xl"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {formatDay(now)}
            </p>
            <p className="font-bold text-5xl md:text-6xl mt-4 tracking-tight">
              {formatTime(now)}
            </p>
          </Card>

          <ClickableCard onClick={() => setOverlay("chat")}>
            <div className="flex flex-col items-center text-center py-6">
              <div className="size-28 md:size-32 rounded-full border-2 border-foreground/70 flex items-center justify-center">
                <Mic className="size-14 md:size-16" strokeWidth={1.5} />
              </div>
              <p className="mt-5 text-xl md:text-2xl font-medium">
                Tap to Ask a Question
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <OutlineButton>Change TV Input</OutlineButton>
                <OutlineButton>Go to Netflix</OutlineButton>
                <OutlineButton>Turn on Washer</OutlineButton>
              </div>
            </div>
          </ClickableCard>
        </div>

        {/* Right column 60% */}
        <div className="md:col-span-3 flex flex-col gap-5 md:gap-6">
          <Card className="min-h-[220px] flex flex-col">
            <h2 className="text-xl md:text-2xl font-semibold text-foreground">
              Today's Reminders
            </h2>
            <div className="flex-1 flex items-center justify-center">
              <p className="text-3xl md:text-4xl text-foreground/90 text-center">
                You're all clear for today
              </p>
            </div>
          </Card>

          <ClickableCard onClick={() => setOverlay("call")}>
            <div className="flex flex-col items-center justify-center text-center py-12">
              <Phone className="size-20 md:size-24" strokeWidth={1.5} />
              <p className="mt-5 text-2xl md:text-3xl font-medium">Make a call</p>
            </div>
          </ClickableCard>
        </div>
      </div>

      {/* Overlays */}
      {overlay && (
        <Overlay
          title={overlay === "chat" ? "Ask Albert a Question" : "Make a Call"}
          onClose={() => setOverlay(null)}
        >
          {overlay === "chat" ? (
            <div className="flex flex-col h-full">
              <div className="flex-1 min-h-[260px]" />
              <div className="border-t border-border pt-4">
                <input
                  type="text"
                  placeholder="Type or tap the mic to speak…"
                  className="w-full rounded-2xl border border-border bg-background px-5 py-4 text-lg outline-none focus:ring-2 focus:ring-foreground/20"
                />
              </div>
            </div>
          ) : (
            <div className="min-h-[320px]" />
          )}
        </Overlay>
      )}
    </main>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-card text-card-foreground rounded-3xl border border-border p-6 md:p-8 ${className}`}
    >
      {children}
    </div>
  );
}

function ClickableCard({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-card text-card-foreground rounded-3xl border border-border p-6 md:p-8 text-left transition-colors hover:bg-muted/50 active:bg-muted focus:outline-none focus:ring-2 focus:ring-foreground/20"
    >
      {children}
    </button>
  );
}

function OutlineButton({ children }: { children: React.ReactNode }) {
  return (
    <Button
      variant="outline"
      type="button"
      onClick={(e) => e.stopPropagation()}
      className="rounded-full border-foreground/40 bg-card text-foreground hover:bg-muted text-base md:text-lg px-5 py-5"
    >
      {children}
    </Button>
  );
}

function Overlay({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-card text-card-foreground rounded-3xl border border-border w-full max-w-2xl p-6 md:p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl md:text-3xl font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 hover:bg-muted transition-colors"
          >
            <X className="size-6" strokeWidth={1.5} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
