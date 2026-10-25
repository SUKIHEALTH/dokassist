"use client";

import { useState, useEffect, useRef } from "react";
import {
  Practice,
  createPractice,
  getPracticeByCode,
  listDocuments,
  uploadDocuments,
  deleteDocument,
  updateConditions,
  chat,
  Document,
} from "../lib/api";

type Role = "home" | "owner" | "member";
type OwnerView = "dashboard" | "upload" | "conditions";

export default function Page() {
  const [role, setRole] = useState<Role>("home");
  const [userName, setUserName] = useState("");
  const [practice, setPractice] = useState<Practice | null>(null);

  // Persist user name
  useEffect(() => {
    const saved = localStorage.getItem("dokassist_user");
    if (saved) setUserName(saved);
  }, []);

  useEffect(() => {
    if (userName) localStorage.setItem("dokassist_user", userName);
  }, [userName]);

  return (
    <div className="min-h-screen bg-sand">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
                <path d="M12 2L4 7v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-5z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="font-serif text-lg font-semibold text-primary leading-none">DokAssist</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Protocolcoach voor de huisartspraktijk</p>
            </div>
          </div>
          {practice && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-primary">{practice.name}</p>
                <p className="text-xs text-muted-foreground">Code: {practice.join_code}</p>
              </div>
              <button
                onClick={() => {
                  setPractice(null);
                  setRole("home");
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Uitloggen
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {role === "home" && (
          <HomeView
            userName={userName}
            setUserName={setUserName}
            onOwner={() => setRole("owner")}
            onMember={() => setRole("member")}
          />
        )}

        {role === "owner" && (
          <OwnerFlow
            userName={userName}
            practice={practice}
            setPractice={setPractice}
          />
        )}

        {role === "member" && (
          <MemberFlow
            userName={userName}
            setUserName={setUserName}
            practice={practice}
            setPractice={setPractice}
          />
        )}
      </main>

      <footer className="border-t border-border bg-card/50 mt-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            DokAssist neemt geen medische beslissingen. Bij twijfel, spoed of afwijkende
            situaties wordt altijd verwezen naar overleg met de eindverantwoordelijke professional.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ---------- Home / Role selection ----------
function HomeView({
  userName,
  setUserName,
  onOwner,
  onMember,
}: {
  userName: string;
  setUserName: (v: string) => void;
  onOwner: () => void;
  onMember: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="font-serif text-3xl font-bold text-primary mb-3">
          Welkom bij DokAssist
        </h2>
        <p className="text-muted-foreground text-lg leading-relaxed">
          De AI-protocolcoach die uw protocollen en werkwijzes begrijpt.
          <br />
          Stel een vraag, krijg direct antwoord — gebaseerd op uw eigen praktijkdocumenten.
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-primary mb-2">Uw naam</label>
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Bijv. Sabine, Mira, Fatima..."
          className="w-full px-4 py-3 rounded-xl border border-border bg-card text-primary placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <button
          onClick={() => {
            if (!userName.trim()) return;
            onOwner();
          }}
          disabled={!userName.trim()}
          className="group p-6 rounded-2xl border border-border bg-card text-left hover:border-primary/40 hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <path d="M3 21h18" />
              <path d="M5 21V7l8-4v18" />
              <path d="M19 21V11l-6-4" />
              <path d="M9 9v0" />
              <path d="M9 12v0" />
              <path d="M9 15v0" />
            </svg>
          </div>
          <h3 className="font-serif text-lg font-semibold text-primary mb-1">Praktijkhouder</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Maak een praktijk aan, upload protocollen en werkwijzes, en stel werkafspraken in.
          </p>
        </button>

        <button
          onClick={() => {
            if (!userName.trim()) return;
            onMember();
          }}
          disabled={!userName.trim()}
          className="group p-6 rounded-2xl border border-border bg-card text-left hover:border-accent/40 hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/15 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3 className="font-serif text-lg font-semibold text-primary mb-1">Medewerker</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sluit aan bij uw praktijk met een code en stel vragen over protocollen en werkwijzes.
          </p>
        </button>
      </div>

      {!userName.trim() && (
        <p className="text-center text-sm text-muted-foreground mt-6">
          Vul eerst uw naam in om door te gaan.
        </p>
      )}
    </div>
  );
}

// ---------- Owner flow ----------
function OwnerFlow({
  userName,
  practice,
  setPractice,
}: {
  userName: string;
  practice: Practice | null;
  setPractice: (p: Practice) => void;
}) {
  const [step, setStep] = useState<"setup" | "manage">("setup");
  const [practiceName, setPracticeName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!practiceName.trim()) return;
    setLoading(true);
    setError("");
    try {
      const p = await createPractice(practiceName.trim());
      setPractice(p);
      setStep("manage");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (practice && step === "manage") {
    return <OwnerDashboard practice={practice} />;
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold text-primary mb-2">
          Praktijk aanmaken
        </h2>
        <p className="text-muted-foreground">
          Maak een praktijk aan om protocollen en werkwijzes te uploaden. U krijgt een
          aanmeldcode die u met uw team kunt delen.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            Naam van de praktijk
          </label>
          <input
            type="text"
            value={practiceName}
            onChange={(e) => setPracticeName(e.target.value)}
            placeholder="Bijv. Huisartspraktijk Fonderson"
            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-primary placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>
        )}

        <button
          onClick={handleCreate}
          disabled={!practiceName.trim() || loading}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Bezig..." : "Praktijk aanmaken"}
        </button>
      </div>
    </div>
  );
}

// ---------- Owner dashboard ----------
function OwnerDashboard({ practice }: { practice: Practice }) {
  const [view, setView] = useState<OwnerView>("dashboard");
  const [docs, setDocs] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [conditions, setConditions] = useState(practice.conditions || "");
  const [savingConditions, setSavingConditions] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string>("");
  const [uploadError, setUploadError] = useState<string>("");

  const refreshDocs = async () => {
    setLoadingDocs(true);
    try {
      const { documents } = await listDocuments(practice.id);
      setDocs(documents);
    } catch {
      // ignore
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    refreshDocs();
  }, [practice.id]);

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;
    setUploading(true);
    setUploadError("");
    setUploadResult("");
    try {
      const result = await uploadDocuments(practice.id, uploadFiles);
      setUploadResult(
        `${result.files_processed} bestand(en) verwerkt, ${result.total_chunks} tekstfragmenten geïndexeerd.`
      );
      setUploadFiles([]);
      refreshDocs();
    } catch (e: any) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: number) => {
    if (!confirm("Weet u zeker dat u dit document wilt verwijderen?")) return;
    try {
      await deleteDocument(practice.id, docId);
      refreshDocs();
    } catch {
      // ignore
    }
  };

  const handleSaveConditions = async () => {
    setSavingConditions(true);
    try {
      await updateConditions(practice.id, conditions);
    } finally {
      setSavingConditions(false);
    }
  };

  return (
    <div>
      {/* Join code banner */}
      <div className="bg-primary text-primary-foreground rounded-2xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm opacity-80 mb-1">Aanmeldcode voor uw team</p>
            <p className="font-serif text-3xl font-bold tracking-wider">{practice.join_code}</p>
          </div>
          <div className="text-sm opacity-80 text-center sm:text-right">
            <p>Deel deze code met uw medewerkers.</p>
            <p>Zij kunnen dan aanmelden als medewerker.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border">
        {(["dashboard", "upload", "conditions"] as OwnerView[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              view === v
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-primary"
            }`}
          >
            {v === "dashboard" ? "Documenten" : v === "upload" ? "Uploaden" : "Werkafspraken"}
          </button>
        ))}
      </div>

      {/* Dashboard view */}
      {view === "dashboard" && (
        <div>
          {loadingDocs ? (
            <p className="text-muted-foreground text-center py-8">Documenten laden...</p>
          ) : docs.length === 0 ? (
            <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto rounded-full bg-sand-dark flex items-center justify-center mb-4">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                  </div>
                  <h3 className="font-medium text-primary mb-1">Nog geen documenten</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload uw protocollen en werkwijzes om te beginnen.
                  </p>
                  <button
                    onClick={() => setView("upload")}
                    className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-light transition-colors"
                  >
                    Documenten uploaden
                  </button>
                </div>
          ) : (
            <div className="space-y-3">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between bg-card rounded-xl border border-border p-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-primary truncate">{doc.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.chunk_count} fragmenten · {new Date(doc.uploaded_at).toLocaleDateString("nl-NL")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-muted-foreground hover:text-red-600 transition-colors p-2"
                    title="Verwijderen"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload view */}
      {view === "upload" && (
        <div className="max-w-xl">
          <div
            className="border-2 border-dashed border-border rounded-2xl p-8 text-center bg-card hover:border-primary/40 transition-colors cursor-pointer"
            onClick={() => document.getElementById("file-input")?.click()}
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files);
              setUploadFiles((prev) => [...prev, ...files]);
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-sand-dark flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <path d="M17 8l-5-5-5 5" />
                <path d="M12 15V3" />
              </svg>
            </div>
            <p className="font-medium text-primary mb-1">Sleep bestanden hierheen</p>
            <p className="text-sm text-muted-foreground">
              of klik om te bladeren. PDF, DOCX, TXT — maximaal 10MB per bestand.
            </p>
            <input
              id="file-input"
              type="file"
              multiple
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files) {
                  setUploadFiles((prev) => [...prev, ...Array.from(files)]);
                }
              }}
            />
          </div>

          {uploadFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {uploadFiles.map((f, i) => (
                <div key={i} className="flex items-center justify-between bg-card rounded-lg border border-border px-4 py-2">
                  <span className="text-sm text-primary truncate">{f.name}</span>
                  <button
                    onClick={() => setUploadFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-red-600 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}

              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary-light transition-colors disabled:opacity-40"
              >
                {uploading ? "Bezig met verwerken..." : `${uploadFiles.length} bestand(en) uploaden`}
              </button>
            </div>
          )}

          {uploadResult && (
            <p className="mt-4 text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3">{uploadResult}</p>
          )}
          {uploadError && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{uploadError}</p>
          )}
        </div>
      )}

      {/* Conditions view */}
      {view === "conditions" && (
        <div className="max-w-xl">
          <div className="mb-4">
            <h3 className="font-serif text-xl font-semibold text-primary mb-2">Werkafspraken</h3>
            <p className="text-sm text-muted-foreground">
              Voeg aanvullende werkafspraken, praktijkspecifieke voorwaarden of context toe die
              de AI moet meenemen bij het beantwoorden van vragen. Bijv. openingstijden,
              HIS-systeem, spoedprocedures, of bijzondere afspraken die niet in de protocollen staan.
            </p>
          </div>
          <textarea
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            placeholder="Bijv.&#10;- Wij gebruiken Medicom als HIS-systeem&#10;- Spreekuur is van 8:00 tot 11:00 uur&#10;- Bij spoed altijd direct de huisarts inschakelen&#10;- De praktijkondersteuner is bereikbaar op dinsdag en donderdag"
            rows={8}
            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-primary placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none"
          />
          <button
            onClick={handleSaveConditions}
            disabled={savingConditions}
            className="mt-4 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary-light transition-colors disabled:opacity-40"
          >
            {savingConditions ? "Opslaan..." : "Werkafspraken opslaan"}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- Member flow ----------
function MemberFlow({
  userName,
  setUserName,
  practice,
  setPractice,
}: {
  userName: string;
  setUserName: (v: string) => void;
  practice: Practice | null;
  setPractice: (p: Practice) => void;
}) {
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setLoading(true);
    setError("");
    try {
      const p = await getPracticeByCode(joinCode.trim());
      setPractice(p);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (practice) {
    return <ChatView practice={practice} userName={userName} />;
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-8 text-center">
        <h2 className="font-serif text-2xl font-bold text-primary mb-2">
          Aansluiten bij uw praktijk
        </h2>
        <p className="text-muted-foreground">
          Voer de aanmeldcode in die u van uw praktijkhouder heeft gekregen.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-primary mb-2">Aanmeldcode</label>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Bijv. AB3KLM"
            maxLength={6}
            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-primary text-center text-2xl font-mono tracking-widest placeholder:text-muted-foreground/40 placeholder:text-base placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all uppercase"
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>
        )}

        <button
          onClick={handleJoin}
          disabled={!joinCode.trim() || loading}
          className="w-full py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Verbinden..." : "Aansluiten"}
        </button>
      </div>
    </div>
  );
}

// ---------- Chat view ----------
interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

function ChatView({ practice, userName }: { practice: Practice; userName: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hoi ${userName || "daar"}! Ik ben de DokAssist protocolcoach voor ${practice.name}. Stel me een vraag over de protocollen of werkwijzes van de praktijk — ik antwoord op basis van de geüploade documenten.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");

    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const result = await chat(practice.id, userMsg, userName, history);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.answer, sources: result.sources },
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Er ging iets mis: ${e.message}. Probeer het opnieuw.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedQuestions = [
    "Wat doe ik als een patiënt is overleden?",
    "Hoe registreer ik een geboorte in het dossier?",
    "Wanneer moet ik de huisarts inschakelen bij spoed?",
    "Hoe verwerk ik mutaties?",
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Practice header */}
      <div className="bg-card rounded-2xl border border-border p-4 mb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
            <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
          </svg>
        </div>
        <div>
          <p className="font-medium text-primary">{practice.name}</p>
          <p className="text-xs text-muted-foreground">DokAssist Protocolcoach</p>
        </div>
      </div>

      {/* Chat messages */}
      <div
        ref={scrollRef}
        className="chat-scroll bg-card rounded-2xl border border-border p-4 h-[55vh] overflow-y-auto space-y-4 mb-4"
      >
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} fade-in`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-sand rounded-bl-md text-primary"
              }`}
            >
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Bronnen:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.sources.map((src, j) => (
                      <span
                        key={j}
                        className="text-xs bg-white/60 text-muted-foreground rounded-full px-2.5 py-1 border border-border/50"
                      >
                        {src}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-sand rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5 items-center">
                <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground"></span>
                <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground"></span>
                <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground"></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggested questions (only when no user messages yet) */}
      {messages.filter((m) => m.role === "user").length === 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              onClick={() => setInput(q)}
              className="text-sm text-primary bg-card border border-border rounded-full px-4 py-2 hover:border-primary/40 hover:bg-sand transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Stel een vraag over een protocol of werkwijze..."
          className="flex-1 px-4 py-3 rounded-xl border border-border bg-card text-primary placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="w-12 h-12 shrink-0 rounded-xl bg-accent text-white flex items-center justify-center hover:bg-accent-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>

      {/* Safety notice */}
      <p className="text-xs text-muted-foreground text-center mt-4">
        DokAssist neemt geen medische beslissingen. Bij twijfel altijd overleggen met de
        eindverantwoordelijke professional.
      </p>
    </div>
  );
}
