import { useEffect, useMemo, useState } from "react";
import { marked } from "marked";
import content from "./content.json";

// ---------- persistencia (localStorage) ----------
const KEY = "learn-cs";
const today = () => new Date().toISOString().slice(0, 10);
const DAY = 86_400_000;

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}
function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

// ---------- SRS: SM-2 simplificado, 3 grados ----------
// grade: "again" | "good" | "easy"
function schedule(card, grade) {
  let { ease = 2.5, interval = 0, reps = 0 } = card ?? {};
  if (grade === "again") {
    ease = Math.max(1.3, ease - 0.2);
    interval = 0; // vuelve a aparecer ya
    reps = 0;
  } else if (grade === "good") {
    interval = reps === 0 ? 1 : reps === 1 ? 3 : Math.round(interval * ease);
    reps += 1;
  } else {
    // easy
    ease += 0.15;
    interval = reps === 0 ? 3 : Math.round(interval * ease * 1.3);
    reps += 1;
  }
  return { ease, interval, reps, due: Date.now() + interval * DAY };
}

// ---------- app ----------
export default function App() {
  const [state, setState] = useState(load);
  const [tab, setTab] = useState("curso");
  const [openLesson, setOpenLesson] = useState(null);

  // lastSeen "congelado" al cargar: lo que entró después se marca NEW
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
      const next = mut({ ...prev, completed: { ...(prev.completed ?? {}) }, cards: { ...(prev.cards ?? {}) } });
      save(next);
      return next;
    });
  }

  function completeLesson(id) {
    update((s) => {
      s.completed[id] = true;
      return s;
    });
  }

  // mazo de repaso: tarjetas de lecciones aprendidas, vencidas (o nuevas)
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

  // niveles agrupados
  const levels = useMemo(() => {
    const map = new Map();
    for (const l of content.lessons) {
      const key = `${l.topic} · Nivel ${l.level}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(l);
    }
    return [...map.entries()];
  }, []);

  const doneCount = content.lessons.filter((l) => completed[l.id]).length;

  return (
    <div className="app">
      <header>
        <h1>learn-cs</h1>
        <span className="progress">{doneCount}/{content.lessons.length} lecciones</span>
      </header>

      <nav className="tabs">
        <button className={tab === "curso" ? "on" : ""} onClick={() => { setTab("curso"); setOpenLesson(null); }}>
          Curso
        </button>
        <button className={tab === "repaso" ? "on" : ""} onClick={() => setTab("repaso")}>
          Repaso{dueCards.length ? <span className="badge">{dueCards.length}</span> : null}
        </button>
      </nav>

      <main>
        {tab === "curso" && !openLesson && (
          <Course levels={levels} completed={completed} seen={seenAtLoad} onOpen={setOpenLesson} />
        )}
        {tab === "curso" && openLesson && (
          <Lesson
            lesson={content.lessons.find((l) => l.id === openLesson)}
            done={!!completed[openLesson]}
            onComplete={completeLesson}
            onBack={() => setOpenLesson(null)}
          />
        )}
        {tab === "repaso" && <Review cards={dueCards} onGrade={(c, g) => update((s) => { s.cards[c.id] = schedule(s.cards[c.id], g); return s; })} />}
      </main>
    </div>
  );
}

function isNew(dateStr, seen) {
  return dateStr > seen;
}

function Course({ levels, completed, seen, onOpen }) {
  return (
    <div className="list">
      {levels.map(([title, lessons]) => (
        <section key={title}>
          <h2>{title}</h2>
          {lessons.map((l) => (
            <button key={l.id} className="row" onClick={() => onOpen(l.id)}>
              <span>{completed[l.id] ? "✓ " : ""}{l.title}</span>
              {isNew(l.added, seen) && !completed[l.id] ? <span className="new">NUEVO</span> : null}
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}

function Lesson({ lesson, done, onComplete, onBack }) {
  return (
    <article className="lesson">
      <button className="back" onClick={onBack}>← Volver</button>
      <h2>{lesson.title}</h2>
      <div className="body" dangerouslySetInnerHTML={{ __html: marked.parse(lesson.body) }} />
      <p className="meta">{lesson.cards.length} tarjetas se suman al repaso al aprenderla.</p>
      {done ? (
        <p className="ok">✓ Aprendida — sus tarjetas ya están en el repaso.</p>
      ) : (
        <button className="primary" onClick={() => { onComplete(lesson.id); onBack(); }}>
          Marcar como aprendida
        </button>
      )}
    </article>
  );
}

function Review({ cards, onGrade }) {
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false);

  if (cards.length === 0) {
    return <p className="empty">No hay tarjetas para repasar. Aprendé lecciones en el Curso para sumar tarjetas. ✦</p>;
  }
  const card = cards[Math.min(i, cards.length - 1)];

  function grade(g) {
    onGrade(card, g);
    setShow(false);
    setI((n) => n + 1);
  }

  return (
    <div className="review">
      <div className="counter">{Math.min(i + 1, cards.length)} / {cards.length}</div>
      <div className="card" onClick={() => setShow(true)}>
        <div className="front">{card.front}</div>
        {show && <div className="backside">{card.back}</div>}
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
