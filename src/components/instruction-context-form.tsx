import { useRef, useState, type CSSProperties } from "react";
import { Camera, Trash2, X, Edit, RefreshCw, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useSettings } from "@/lib/settings-store";
import type { Device } from "@/lib/carer-store";
import { identifyDevice } from "@/lib/identify-device.functions";

const GREEN = "#2F8F4E";

function uid() { return Math.random().toString(36).slice(2, 10); }

function defaultQuestions(name: string): string[] {
  const n = name.toLowerCase();
  if (/remote|tv/.test(n)) return ["How do I change the channel?", "How do I turn up the volume?", "How do I switch to Netflix?"];
  if (/phone/.test(n)) return ["How do I make a call?", "How do I answer a call?", "How do I save a contact?"];
  if (/microwave/.test(n)) return ["How do I heat up food?", "How do I set the timer?", "How do I stop it?"];
  return ["How do I turn it on?", "How do I use it?", "How do I get help?"];
}

export function DeviceListEditor({
  devices,
  onChange,
  elderName = "your loved one",
}: {
  devices: Device[];
  onChange: (devices: Device[]) => void;
  elderName?: string;
}) {
  const { theme, cardBorder, buttonBorder, inputBorder } = useSettings();
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [analyzing, setAnalyzing] = useState(false);
  const [identifyError, setIdentifyError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const identifyFn = useServerFn(identifyDevice);

  const inputStyle: CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "10px 12px",
    border: inputBorder, borderRadius: 6, background: theme.card, color: theme.text,
    fontFamily: "Verdana, sans-serif", fontSize: 14,
  };
  const btnSecondary: CSSProperties = {
    background: "transparent", color: theme.text, border: buttonBorder,
    height: 40, padding: "0 16px", borderRadius: 8,
    fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer",
  };
  const btnPrimary: CSSProperties = {
    background: GREEN, color: "#fff", border: "none",
    height: 40, padding: "0 18px", borderRadius: 8,
    fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer",
  };
  const card: CSSProperties = { background: theme.card, border: cardBorder, borderRadius: 8, padding: 16 };

  const reset = () => { setPhoto(undefined); setName(""); setQuestions([]); setAnalyzing(false); setIdentifyError(null); setEditingId(null); };

  const runIdentify = async (dataUrl: string) => {
    setAnalyzing(true);
    setIdentifyError(null);
    try {
      const { name: suggested } = await identifyFn({ data: { dataUrl } });
      const finalName = suggested || "";
      setName(finalName);
      if (finalName) setQuestions(defaultQuestions(finalName));
    } catch {
      setIdentifyError("Couldn't identify this device — try again or type the name manually");
    } finally {
      setAnalyzing(false);
    }
  };

  const onFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setPhoto(dataUrl);
      void runIdentify(dataUrl);
    };
    reader.readAsDataURL(f);
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const cleanQs = questions.map((q) => q.trim()).filter(Boolean);
    if (editingId) {
      onChange(devices.map((d) => d.id === editingId ? { ...d, name: trimmed, photo, questions: cleanQs } : d));
    } else {
      onChange([...devices, { id: uid(), name: trimmed, photo, questions: cleanQs }]);
    }
    reset();
  };

  const startEdit = (d: Device) => {
    setEditingId(d.id);
    setPhoto(d.photo);
    setName(d.name);
    setQuestions(d.questions.length ? d.questions : [""]);
    setAnalyzing(false);
  };

  const remove = (id: string) => onChange(devices.filter((d) => d.id !== id));

  return (
    <div>
      <p style={{ fontSize: 13, color: theme.muted, marginTop: 0, lineHeight: 1.5 }}>
        Add devices in {elderName}'s home. We'll create helpful shortcuts so they can ask things like "How do I change the channel?".
      </p>

      <div style={{ ...card, marginTop: 12 }}>
        {!photo && !editingId ? (
          <button type="button" onClick={() => fileRef.current?.click()} style={{ ...btnSecondary, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Camera size={16} /> Add a device photo
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {photo ? (
                <img src={photo} alt="" style={{ width: 64, height: 64, borderRadius: 6, objectFit: "cover", border: cardBorder }} />
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()} style={{
                  width: 64, height: 64, border: cardBorder, borderRadius: 6,
                  background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}>
                  <Camera size={20} color={theme.muted} />
                </button>
              )}
              {analyzing ? (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: theme.muted, marginBottom: 4 }}>Device name</div>
                <input
                  style={inputStyle}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={analyzing ? "Identifying…" : "e.g., TV Remote"}
                  disabled={analyzing}
                />
                {photo && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => photo && void runIdentify(photo)}
                      disabled={analyzing}
                      style={{
                        ...btnSecondary, height: 32, padding: "0 12px", fontSize: 13,
                        display: "inline-flex", alignItems: "center", gap: 6,
                        opacity: analyzing ? 0.6 : 1, cursor: analyzing ? "not-allowed" : "pointer",
                      }}
                      aria-label="Try identifying again"
                    >
                      {analyzing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      Try again
                    </button>
                    {analyzing && <span style={{ fontSize: 12, color: theme.muted }}>Identifying device…</span>}
                  </div>
                )}
                {identifyError && !analyzing && (
                  <div style={{ marginTop: 6, fontSize: 12, color: "#C0392B" }}>{identifyError}</div>
                )}
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>What might they ask about it?</div>
            {questions.map((q, i) => (
              <div key={i} style={{ display: "flex", gap: 8 }}>
                <input style={inputStyle} value={q}
                  onChange={(e) => setQuestions(questions.map((x, j) => j === i ? e.target.value : x))}
                  placeholder="Question…" />
                <button type="button" onClick={() => setQuestions(questions.filter((_, j) => j !== i))}
                  style={{ ...btnSecondary, width: 40, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                  aria-label="Remove"><X size={16} /></button>
              </div>
            ))}
            <button type="button" onClick={() => setQuestions([...questions, ""])} style={{ ...btnSecondary, alignSelf: "flex-start" }}>
              + Add question
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={save} disabled={!name.trim() || analyzing} style={{
                ...btnPrimary,
                background: name.trim() && !analyzing ? GREEN : "#9CC2A9",
                cursor: name.trim() && !analyzing ? "pointer" : "not-allowed",
              }}>{editingId ? "Update device" : "Save device"}</button>
              <button type="button" onClick={reset} style={btnSecondary}>Cancel</button>
            </div>

          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      </div>

      {devices.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 15, margin: "0 0 8px", color: theme.text }}>
            Devices added
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {devices.map((d) => (
              <div key={d.id} style={{ ...card, display: "flex", alignItems: "center", gap: 12, padding: 12 }}>
                {d.photo
                  ? <img src={d.photo} alt="" style={{ width: 30, height: 30, borderRadius: 4, objectFit: "cover" }} />
                  : <div style={{ width: 30, height: 30, borderRadius: 4, background: theme.bg, border: buttonBorder }} />}
                <div style={{ flex: 1, fontSize: 14, color: theme.text }}>
                  <div style={{ fontWeight: 700 }}>{d.name}</div>
                  {d.questions.length > 0 && (
                    <div style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>
                      {d.questions.length} question{d.questions.length === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => startEdit(d)} aria-label="Edit"
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: theme.text, padding: 6 }}>
                  <Edit size={16} />
                </button>
                <button type="button" onClick={() => remove(d.id)} aria-label="Delete"
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "#C0392B", padding: 6 }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
