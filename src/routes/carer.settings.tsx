import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, type CSSProperties } from "react";
import { ArrowLeft, X, Plus, Trash2 } from "lucide-react";
import { useSettings } from "@/lib/settings-store";
import { useCarer, type Contact, type ElderProfile } from "@/lib/carer-store";

export const Route = createFileRoute("/carer/settings")({
  component: CarerSettings,
  head: () => ({ meta: [{ title: "Carer Portal Settings" }] }),
});

const GREEN = "#2F8F4E";

function CarerSettings() {
  const { theme, cardBorder, buttonBorder, inputBorder } = useSettings();
  const { elder, setElder } = useCarer();
  const router = useRouter();
  const [draft, setDraft] = useState<ElderProfile>(elder);
  const [newCondition, setNewCondition] = useState("");

  const label: CSSProperties = { fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 14,
    display: "block", marginBottom: 6, color: theme.text };
  const card: CSSProperties = { background: theme.card, border: cardBorder, borderRadius: 8,
    padding: 16, margin: "0 16px 16px" };

  const addCondition = () => {
    const v = newCondition.trim();
    if (!v) return;
    if (draft.conditions.includes(v)) return;
    setDraft({ ...draft, conditions: [...draft.conditions, v] });
    setNewCondition("");
  };
  const removeCondition = (c: string) =>
    setDraft({ ...draft, conditions: draft.conditions.filter((x) => x !== c) });

  const addContact = () =>
    setDraft({ ...draft, contacts: [...draft.contacts, { id: Math.random().toString(36).slice(2, 9), name: "", phone: "" }] });
  const updateContact = (id: string, patch: Partial<Contact>) =>
    setDraft({ ...draft, contacts: draft.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const removeContact = (id: string) =>
    setDraft({ ...draft, contacts: draft.contacts.filter((c) => c.id !== id) });

  return (
    <main style={{ minHeight: "100vh", background: theme.bg, color: theme.text,
      fontFamily: "Verdana, sans-serif", lineHeight: 1.5 }}>
      <header style={{ background: theme.card, padding: 16, display: "grid",
        gridTemplateColumns: "1fr auto 1fr", alignItems: "center", borderBottom: cardBorder, gap: 16 }}>
        <Link to="/carer" style={{ justifySelf: "start", display: "inline-flex", alignItems: "center", gap: 8,
          color: theme.text, textDecoration: "none", fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 16 }}>
          <ArrowLeft size={18} /> Back to Care Plan
        </Link>
        <h1 style={{ margin: 0, fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 26, textAlign: "center" }}>
          Portal Settings
        </h1>
        <span />
      </header>

      <div style={{ height: 16 }} />

      <section style={card}>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, alignItems: "center" }}>
          <label style={{ cursor: "pointer" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: theme.bg, border: buttonBorder,
              display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif",
              fontWeight: 700, fontSize: 28, color: theme.text, overflow: "hidden" }}>
              {draft.avatar ? <img src={draft.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : draft.name.charAt(0)}
            </div>
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
              const f = e.target.files?.[0]; if (!f) return;
              const reader = new FileReader();
              reader.onload = () => setDraft({ ...draft, avatar: String(reader.result) });
              reader.readAsDataURL(f);
            }} />
          </label>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label style={label}>Elder name</label>
              <input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div>
              <label style={label}>Date of birth</label>
              <input type="date" value={draft.dob} onChange={(e) => setDraft({ ...draft, dob: e.target.value })} />
            </div>
          </div>
        </div>
      </section>

      <section style={card}>
        <label style={label}>Health conditions</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {draft.conditions.map((c) => (
            <span key={c} style={{ background: theme.bg, border: buttonBorder, borderRadius: 999,
              padding: "4px 10px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
              {c}
              <button onClick={() => removeCondition(c)} style={{ background: "transparent", border: "none",
                color: theme.text, cursor: "pointer", padding: 0, display: "inline-flex" }} aria-label={`Remove ${c}`}>
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="text" value={newCondition} onChange={(e) => setNewCondition(e.target.value)}
            placeholder="Add condition" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCondition(); } }} />
          <button onClick={addCondition} style={{ background: theme.text, color: theme.card, border: "none",
            borderRadius: 8, padding: "0 14px", cursor: "pointer", fontFamily: "'Trebuchet MS', sans-serif",
            fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Plus size={16} /> Add
          </button>
        </div>
      </section>

      <section style={card}>
        <label style={label}>Phone contacts</label>
        <div style={{ display: "grid", gap: 10 }}>
          {draft.contacts.map((c) => (
            <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8 }}>
              <input type="text" placeholder="Name" value={c.name} onChange={(e) => updateContact(c.id, { name: e.target.value })} />
              <input type="text" placeholder="Phone" value={c.phone} onChange={(e) => updateContact(c.id, { phone: e.target.value })} />
              <button onClick={() => removeContact(c.id)} aria-label="Remove" style={{
                background: "transparent", color: theme.text, border: buttonBorder, borderRadius: 8,
                width: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
        <button onClick={addContact} style={{ marginTop: 10, background: "transparent", color: theme.text,
          border: buttonBorder, borderRadius: 8, padding: "8px 14px", cursor: "pointer",
          fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={16} /> Add contact
        </button>
      </section>

      <section style={card}>
        <label style={label}>Notes</label>
        <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
      </section>

      <section style={card}>
        <label style={label}>Instruction context</label>
        <textarea value={draft.context} onChange={(e) => setDraft({ ...draft, context: e.target.value })} />
      </section>

      <div style={{ display: "flex", gap: 12, padding: "0 16px 24px" }}>
        <button onClick={() => { setElder(draft); router.navigate({ to: "/carer" }); }} style={{
          background: GREEN, color: "#fff", border: "none", padding: "12px 18px", borderRadius: 8,
          fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 16, cursor: "pointer", flex: 1,
        }}>Save Changes</button>
        <button onClick={() => router.navigate({ to: "/carer" })} style={{
          background: "transparent", color: theme.text, border: buttonBorder, padding: "12px 18px", borderRadius: 8,
          fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 16, cursor: "pointer", flex: 1,
        }}>Cancel</button>
      </div>

      <style>{`
        input[type="text"], input[type="number"], input[type="time"], input[type="date"], textarea {
          background: ${theme.bg}; color: ${theme.text}; border: ${inputBorder};
          border-radius: 8px; padding: 10px 12px; font-family: Verdana, sans-serif; font-size: 16px; width: 100%; box-sizing: border-box;
        }
        textarea { min-height: 80px; resize: vertical; }
      `}</style>
    </main>
  );
}
