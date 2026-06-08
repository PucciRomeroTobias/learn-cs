import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import meta from "./content/_meta.json";

// Contenido = meta (ladder + areas) + lecciones de cada archivo src/content/<area>.json.
// Agregar un área = soltar un .json con { "lessons": [...] }; no hace falta tocar código.
const _mods = import.meta.glob("./content/*.json", { eager: true });
const _lessons = [];
for (const [, mod] of Object.entries(_mods)) {
  const data = mod.default ?? mod;
  if (Array.isArray(data?.lessons)) _lessons.push(...data.lessons);
}
const content = { ...meta, lessons: _lessons };

// bloques ```mermaid -> <div class="mermaid"> (se renderiza al abrir la lección);
// el resto del código se escapa normal.
marked.use({
  renderer: {
    code({ text, lang }) {
      if (lang === "mermaid") return `<div class="mermaid">${text}</div>`;
      const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<pre><code>${esc}</code></pre>`;
    },
  },
});

// ---------- persistencia ----------
const KEY = "learn-cs";
const DAY = 86_400_000;
const dayStr = (ms) => new Date(ms).toISOString().slice(0, 10);
const today = () => dayStr(Date.now());
const yesterday = () => dayStr(Date.now() - DAY);

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
};
const save = (s) => localStorage.setItem(KEY, JSON.stringify(s));

function exportData() {
  const data = localStorage.getItem(KEY) ?? "{}";
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `learn-cs-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file, onDone) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (typeof parsed !== "object" || parsed === null) throw new Error();
      save(parsed);
      onDone(parsed);
    } catch {
      alert("Archivo de backup inválido.");
    }
  };
  reader.readAsText(file);
}

// ---------- SRS: SM-2 simplificado, 3 grados ----------
function schedule(card, grade) {
  let { ease = 2.5, interval = 0, reps = 0 } = card ?? {};
  if (grade === "again") {
    ease = Math.max(1.3, ease - 0.2);
    interval = 0;
    reps = 0;
  } else if (grade === "good") {
    interval = reps === 0 ? 1 : reps === 1 ? 3 : Math.round(interval * ease);
    reps += 1;
  } else {
    ease += 0.15;
    interval = reps === 0 ? 3 : Math.round(interval * ease * 1.3);
    reps += 1;
  }
  return { ease, interval, reps, due: Date.now() + interval * DAY };
}

// ---------- racha ----------
function bumpStreak(streak) {
  const t = today();
  if (!streak?.lastDay) return { count: 1, lastDay: t };
  if (streak.lastDay === t) return streak;
  if (streak.lastDay === yesterday()) return { count: streak.count + 1, lastDay: t };
  return { count: 1, lastDay: t };
}

// ---------- nivel actual ----------
function currentLevel(completed) {
  let last = null;
  for (const tier of content.ladder) {
    const ls = content.lessons.filter((l) => l.level === tier.id);
    if (!ls.length) continue;
    last = tier;
    const done = ls.filter((l) => completed[l.id]).length;
    if (done < ls.length) return { ...tier, done, total: ls.length };
  }
  if (last) {
    const total = content.lessons.filter((l) => l.level === last.id).length;
    return { ...last, done: total, total };
  }
  return { label: "—", done: 0, total: 0 };
}

// ---------- app ----------
export default function App() {
  const [state, setState] = useState(load);
  const [tab, setTab] = useState("aprender");
  const [browseLevel, setBrowseLevel] = useState(null);
  const [openLesson, setOpenLesson] = useState(null);
  const [seenAtLoad] = useState(() => state.lastSeen ?? "2000-01-01");

  useEffect(() => {
    if (state.lastSeen !== today()) {
      setState((prev) => {
        const next = { ...prev, lastSeen: today() };
        save(next);
        return next;
      });
    }
  }, []); // eslint-disable-line

  const completed = state.completed ?? {};
  const cardState = state.cards ?? {};

  function update(mut) {
    setState((prev) => {
      const next = mut({
        ...prev,
        completed: { ...(prev.completed ?? {}) },
        cards: { ...(prev.cards ?? {}) },
      });
      save(next);
      return next;
    });
  }

  const completeLesson = (id) =>
    update((s) => {
      s.completed[id] = true;
      s.streak = bumpStreak(s.streak);
      return s;
    });

  const gradeCard = (card, g) =>
    update((s) => {
      s.cards[card.id] = schedule(s.cards[card.id], g);
      s.streak = bumpStreak(s.streak);
      return s;
    });

  const dueCards = useMemo(() => {
    const now = Date.now();
    const out = [];
    for (const l of content.lessons) {
      if (!completed[l.id]) continue;
      for (const c of l.cards) {
        const st = cardState[c.id];
        if (!st || st.due <= now) out.push(c);
      }
    }
    return out.sort((a, b) => (cardState[a.id]?.due ?? 0) - (cardState[b.id]?.due ?? 0));
  }, [state]);

  const lvl = currentLevel(completed);
  const level = browseLevel ?? lvl.id ?? content.ladder[0].id;
  const streakOk = state.streak && (state.streak.lastDay === today() || state.streak.lastDay === yesterday());
  const streak = streakOk ? state.streak.count : 0;

  return (
    <div className="app">
      <header>
        <div className="brand">learn-cs</div>
        <div className="stats">
          <span className={"flame" + (streak ? " on" : "")}>🔥 {streak}</span>
          <div className="level">
            <span className="lvl-label">{lvl.label}</span>
            <div className="bar"><div style={{ width: `${lvl.total ? (lvl.done / lvl.total) * 100 : 0}%` }} /></div>
          </div>
        </div>
      </header>

      <main>
        {tab === "aprender" && !openLesson && (
          <Aprender
            level={level}
            setLevel={setBrowseLevel}
            completed={completed}
            seen={seenAtLoad}
            onOpen={setOpenLesson}
          />
        )}
        {tab === "aprender" && openLesson && (
          <Lesson
            lesson={content.lessons.find((l) => l.id === openLesson)}
            done={!!completed[openLesson]}
            onComplete={completeLesson}
            onBack={() => setOpenLesson(null)}
          />
        )}
        {tab === "repaso" && <Review cards={dueCards} onGrade={gradeCard} />}
        {tab === "perfil" && (
          <Perfil
            completed={completed}
            cardState={cardState}
            lvl={lvl}
            streak={streak}
            onImport={(p) => { setState(p); setTab("aprender"); }}
          />
        )}
      </main>

      <nav className="tabbar">
        <button className={tab === "aprender" ? "on" : ""} onClick={() => { setTab("aprender"); setOpenLesson(null); }}>
          📚<span>Aprender</span>
        </button>
        <button className={tab === "repaso" ? "on" : ""} onClick={() => setTab("repaso")}>
          🔁<span>Repaso</span>{dueCards.length ? <i className="dot">{dueCards.length}</i> : null}
        </button>
        <button className={tab === "perfil" ? "on" : ""} onClick={() => setTab("perfil")}>
          👤<span>Perfil</span>
        </button>
      </nav>
    </div>
  );
}

const isNew = (added, seen) => added > seen;

function Aprender({ level, setLevel, completed, seen, onOpen }) {
  const lessons = content.lessons.filter((l) => l.level === level);
  return (
    <>
      <div className="chips">
        {content.ladder.map((t) => (
          <button key={t.id} className={"chip" + (t.id === level ? " on" : "")} onClick={() => setLevel(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="feed">
        {content.areas.map((area) => {
          const ls = lessons.filter((l) => l.area === area.id);
          if (!ls.length) return null;
          const done = ls.filter((l) => completed[l.id]).length;
          return (
            <section key={area.id}>
              <h2>{area.icon} {area.label}<span className="tier-count">{done}/{ls.length}</span></h2>
              {ls.map((l) => (
                <button key={l.id} className={"card-row" + (completed[l.id] ? " done" : "")} onClick={() => onOpen(l.id)}>
                  <div className="card-main">
                    <div className="card-title">{completed[l.id] ? "✓ " : ""}{l.title}</div>
                    <div className="card-sum">{l.summary}</div>
                  </div>
                  {isNew(l.added, seen) && !completed[l.id] ? <span className="new">NUEVO</span> : null}
                </button>
              ))}
            </section>
          );
        })}
        {lessons.length === 0 && <p className="empty">Todavía no hay contenido para este nivel. ✦</p>}
      </div>
    </>
  );
}

function Lesson({ lesson, done, onComplete, onBack }) {
  const bodyRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    const nodes = bodyRef.current?.querySelectorAll(".mermaid");
    if (!nodes?.length) return;
    import("mermaid").then(({ default: mermaid }) => {
      if (cancelled) return;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        theme: "base",
        fontFamily: "JetBrains Mono, monospace",
        themeVariables: {
          background: "#16130f",
          primaryColor: "#251f18",
          primaryTextColor: "#ece4d6",
          primaryBorderColor: "#4a4031",
          secondaryColor: "#1c1813",
          tertiaryColor: "#1c1813",
          lineColor: "#9c9384",
          textColor: "#ece4d6",
          fontSize: "13px",
        },
      });
      mermaid.run({ nodes: Array.from(nodes) }).catch(() => {});
    });
    return () => { cancelled = true; };
  }, [lesson.id]);

  return (
    <article className="lesson">
      <button className="back" onClick={onBack}>← Volver</button>
      <h1>{lesson.title}</h1>
      <div className="body" ref={bodyRef} dangerouslySetInnerHTML={{ __html: marked.parse(lesson.body) }} />
      {done ? (
        <p className="ok">✓ Aprendida — sus {lesson.cards.length} tarjetas están en el Repaso.</p>
      ) : (
        <>
          <p className="meta">{lesson.cards.length} tarjetas se suman al Repaso al aprenderla.</p>
          <button className="primary" onClick={() => { onComplete(lesson.id); onBack(); }}>
            Marcar como aprendida
          </button>
        </>
      )}
    </article>
  );
}

function Review({ cards, onGrade }) {
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false);

  if (cards.length === 0) {
    return <p className="empty">Nada para repasar ahora. ✦<br />Aprendé lecciones en <b>Aprender</b> para sumar tarjetas.</p>;
  }
  const card = cards[Math.min(i, cards.length - 1)];
  const grade = (g) => { onGrade(card, g); setShow(false); setI((n) => n + 1); };

  return (
    <div className="review">
      <div className="counter">{Math.min(i + 1, cards.length)} / {cards.length}</div>
      <div className={"flashcard" + (show ? " flipped" : "")} onClick={() => setShow(true)}>
        <div className="fc-inner">
          <div className="fc-face fc-front">{card.front}</div>
          <div className="fc-face fc-back"><div className="tag">Respuesta</div>{card.back}</div>
        </div>
      </div>
      {!show ? (
        <button className="primary" onClick={() => setShow(true)}>Mostrar respuesta</button>
      ) : (
        <div className="grades">
          <button className="again" onClick={() => grade("again")}>Otra vez</button>
          <button className="good" onClick={() => grade("good")}>Bien</button>
          <button className="easy" onClick={() => grade("easy")}>Fácil</button>
        </div>
      )}
    </div>
  );
}

function Perfil({ completed, cardState, lvl, streak, onImport }) {
  const fileRef = useRef(null);
  const completedN = content.lessons.filter((l) => completed[l.id]).length;
  const totalN = content.lessons.length;
  const reviewedN = Object.keys(cardState).length;

  const stats = [
    { n: streak, l: "racha (días)" },
    { n: lvl.label, l: "nivel actual" },
    { n: `${completedN}/${totalN}`, l: "lecciones" },
    { n: reviewedN, l: "tarjetas activas" },
  ];

  return (
    <div className="perfil">
      <div className="stat-grid">
        {stats.map((s) => (
          <div key={s.l} className="stat">
            <div className="stat-n">{s.n}</div>
            <div className="stat-l">{s.l}</div>
          </div>
        ))}
      </div>

      <h2 className="perfil-h">Backup</h2>
      <p className="perfil-note">
        Tu progreso vive solo en este dispositivo. Descargá un backup cada tanto, o
        restauralo desde un archivo.
      </p>
      <button className="primary" onClick={exportData}>Exportar progreso</button>
      <button className="ghost" onClick={() => fileRef.current?.click()}>Importar progreso</button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        hidden
        onChange={(e) => { if (e.target.files[0]) importData(e.target.files[0], onImport); }}
      />
    </div>
  );
}
