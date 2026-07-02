import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ---------- PALETA ----------
const C = {
  bg: "#FFF3F7",
  card: "#FFFFFF",
  rosa: "#E75491",
  rosaOscuro: "#B33771",
  rosaSuave: "#FBD3E3",
  lila: "#9B7EDE",
  lilaSuave: "#EFE9FB",
  texto: "#4A2338",
  gris: "#A98CA0",
  exito: "#2EB88A",
  exitoSuave: "#DFF7EE",
  dorado: "#E8A33D",
};

// ---------- PLAN ----------
const PLAN = {
  lun: {
    nombre: "Glúteos + Piernas 1", emoji: "🍑",
    movilidad: ["Círculos de cadera — 1 min", "Hip hinge sin peso — 1.5 min", "Puente de glúteos sin peso — 1.5 min", "Paso lateral con mini banda — 1.5 min", "Rotaciones de tobillos — 1 min", "Sentadilla parcial sin peso (70°) — 30 seg"],
    estiramiento: ["Figura 4 recostada — 1.5 min c/lado", "Isquiotibiales con banda — 1 min c/lado", "Flexor de cadera en rodilla — 1 min c/lado"],
    gym: [
      { id: "prensa", n: "Prensa de piernas (70°)", d: "Cuádriceps y glúteos · rango parcial", p: 60, sets: 4, reps: "8–12", yt: "leg press partial range" },
      { id: "hipthrust", n: "Hip thrust", d: "Glúteo mayor · tu ejercicio estrella", p: 40, sets: 4, reps: "8–12", yt: "hip thrust form" },
      { id: "curlfem", n: "Curl femoral acostada", d: "Isquiotibiales", p: 25, sets: 4, reps: "8–12", yt: "lying leg curl" },
      { id: "abduccion", n: "Abducción en máquina", d: "Glúteo medio · estabiliza tu pelvis", p: 30, sets: 4, reps: "8–12", yt: "hip abduction machine" },
      { id: "talones", n: "Elevación de talones", d: "Pantorrillas", p: 40, sets: 4, reps: "12–15", yt: "standing calf raise" },
    ],
    casa: [
      { id: "sentparcial", n: "Sentadilla parcial con barra (70°)", d: "Cuádriceps y glúteos · NO pasar de 70°", p: 35, sets: 4, reps: "8–12", yt: "box squat partial" },
      { id: "hipthrust", n: "Hip thrust con barra en banco", d: "Glúteo mayor", p: 40, sets: 4, reps: "8–12", yt: "barbell hip thrust" },
      { id: "rdlmanc", n: "RDL con mancuernas", d: "Glúteos e isquios · espalda neutral (kg c/u)", p: 14, sets: 4, reps: "8–12", yt: "dumbbell RDL" },
      { id: "abdbanda", n: "Abducción con mini banda", d: "Glúteo medio · 15–20 reps", p: 0, sets: 4, reps: "15–20", yt: "banded lateral leg raise" },
      { id: "talonesmanc", n: "Talones con mancuernas", d: "Pantorrillas (kg c/u)", p: 15, sets: 4, reps: "12–15", yt: "dumbbell calf raise" },
    ],
  },
  mar: {
    nombre: "Espalda + Core", emoji: "🎀",
    movilidad: ["Rotaciones de cuello lentas — 1 min", "Cat-Cow — 1.5 min", "Rotación torácica cuadrupedia — 1.5 min c/lado", "Retracción escapular con banda — 1 min", "Colgarse de anillas, pies apoyados — 1 min", "Hip hinge sin peso — 1 min"],
    estiramiento: ["Child's pose brazos a la izquierda — 1.5 min", "Dorsal en rack/puerta — 1 min c/lado", "Rodillas al pecho — 1 min", "Respiración diafragmática — 1.5 min"],
    gym: [
      { id: "jalon", n: "Jalón al pecho", d: "Dorsal ancho", p: 30, sets: 4, reps: "8–12", yt: "lat pulldown" },
      { id: "remomaq", n: "Remo máquina apoyo pecho", d: "Espalda media · protege tu L5-S1", p: 30, sets: 4, reps: "8–12", yt: "chest supported row" },
      { id: "facepull", n: "Face pull en polea", d: "Trapecio inferior · alivia tensión cervical", p: 15, sets: 4, reps: "12–15", yt: "cable face pull" },
      { id: "birddog", n: "Bird-dog", d: "Core anti-rotación · 8 por lado", p: 0, sets: 3, reps: "8 c/lado", yt: "bird dog" },
      { id: "plancha", n: "Plancha frontal", d: "Core · segundos por serie", p: 0, sets: 3, reps: "30–45 seg", yt: "plank form" },
    ],
    casa: [
      { id: "remomanc", n: "Remo mancuerna apoyo banco", d: "Dorsal · apoyo descarga la lumbar", p: 16, sets: 4, reps: "8–12", yt: "one arm dumbbell row" },
      { id: "remoanillas", n: "Remo invertido en anillas", d: "Espalda media · cuerpo en tabla", p: 0, sets: 4, reps: "8–12", yt: "ring row" },
      { id: "facepullbanda", n: "Face pull con banda", d: "Trapecio inferior", p: 0, sets: 4, reps: "12–15", yt: "band face pull" },
      { id: "birddog", n: "Bird-dog", d: "Core anti-rotación · 8 por lado", p: 0, sets: 3, reps: "8 c/lado", yt: "bird dog" },
      { id: "plancha", n: "Plancha frontal", d: "Core · segundos por serie", p: 0, sets: 3, reps: "30–45 seg", yt: "plank form" },
    ],
  },
  mie: {
    nombre: "Hombros + Brazos", emoji: "💪",
    movilidad: ["Rotaciones de cuello — 1 min", "Círculos de hombros — 1 min", "Dislocaciones con banda — 1.5 min", "Rotación externa con banda — 1.5 min", "Círculos de muñecas — 1 min"],
    estiramiento: ["Hombro cruzado — 1 min c/lado", "Tríceps sobre cabeza — 1 min c/lado", "Trapecio (oreja al hombro, suave) — 1 min"],
    gym: [
      { id: "presshombro", n: "Press hombros máquina", d: "Deltoides · sentada con respaldo", p: 20, sets: 4, reps: "8–12", yt: "shoulder press machine" },
      { id: "laterales", n: "Elevaciones laterales", d: "Deltoides lateral (kg c/u)", p: 6, sets: 3, reps: "10–15", yt: "lateral raise" },
      { id: "curl", n: "Curl bíceps", d: "Bíceps (kg c/u)", p: 8, sets: 3, reps: "8–12", yt: "bicep curl" },
      { id: "triceps", n: "Extensión tríceps polea", d: "Tríceps", p: 15, sets: 3, reps: "8–12", yt: "tricep pushdown" },
      { id: "pullapart", n: "Pull-apart con banda", d: "Postura · 15 reps", p: 0, sets: 3, reps: "15", yt: "band pull apart" },
    ],
    casa: [
      { id: "presshombrocasa", n: "Press hombros sentada", d: "Respaldo alto (kg c/u)", p: 10, sets: 4, reps: "8–12", yt: "seated dumbbell shoulder press" },
      { id: "laterales", n: "Elevaciones laterales", d: "Deltoides lateral (kg c/u)", p: 6, sets: 3, reps: "10–15", yt: "lateral raise" },
      { id: "curl", n: "Curl bíceps mancuernas", d: "Bíceps (kg c/u)", p: 8, sets: 3, reps: "8–12", yt: "bicep curl" },
      { id: "tricepscasa", n: "Tríceps sobre cabeza", d: "Una mancuerna, sentada", p: 8, sets: 3, reps: "8–12", yt: "overhead tricep extension" },
      { id: "pullapart", n: "Pull-apart con banda", d: "Postura · 15 reps", p: 0, sets: 3, reps: "15", yt: "band pull apart" },
    ],
  },
  jue: {
    nombre: "Glúteos + Piernas 2", emoji: "🍑",
    movilidad: ["Círculos de cadera — 1 min", "Hip hinge sin peso — 1.5 min", "Puente de glúteos sin peso — 1.5 min", "Paso lateral con mini banda — 1.5 min", "Rotaciones de tobillos — 1 min", "Sentadilla parcial sin peso (70°) — 30 seg"],
    estiramiento: ["Figura 4 recostada — 1.5 min c/lado", "Isquiotibiales con banda — 1 min c/lado", "Flexor de cadera en rodilla — 1 min c/lado"],
    gym: [
      { id: "hipthrust", n: "Hip thrust", d: "Mismo peso del lunes → intenta +1 rep", p: 40, sets: 4, reps: "8–12", yt: "hip thrust form" },
      { id: "zancada", n: "Zancada estática corta", d: "Rango parcial · sin bajar profundo (kg c/u)", p: 10, sets: 4, reps: "8–10 c/lado", yt: "split squat partial" },
      { id: "kickback", n: "Patada de glúteo en polea", d: "Glúteo mayor aislado", p: 10, sets: 4, reps: "10–12 c/lado", yt: "cable kickback" },
      { id: "rdlbarra", n: "RDL con barra", d: "Glúteos e isquios · espalda neutral", p: 30, sets: 4, reps: "8–12", yt: "barbell RDL" },
      { id: "puente1p", n: "Puente a una pierna", d: "10 por lado", p: 0, sets: 3, reps: "10 c/lado", yt: "single leg glute bridge" },
    ],
    casa: [
      { id: "hipthrust", n: "Hip thrust con barra", d: "Mismo peso del lunes → intenta +1 rep", p: 40, sets: 4, reps: "8–12", yt: "barbell hip thrust" },
      { id: "zancada", n: "Zancada estática corta", d: "Rango parcial (kg c/u)", p: 10, sets: 4, reps: "8–10 c/lado", yt: "split squat partial" },
      { id: "kickbackbanda", n: "Patada con banda de tobillo", d: "12–15 reps por lado", p: 0, sets: 4, reps: "12–15 c/lado", yt: "banded glute kickback" },
      { id: "rdlbarra", n: "RDL con barra", d: "Espalda neutral siempre", p: 30, sets: 4, reps: "8–12", yt: "barbell RDL" },
      { id: "puente1p", n: "Puente a una pierna", d: "10 por lado", p: 0, sets: 3, reps: "10 c/lado", yt: "single leg glute bridge" },
    ],
  },
  vie: {
    nombre: "Full Body + Movilidad", emoji: "🌸",
    movilidad: ["Cat-Cow — 1 min", "Rotación torácica — 1 min c/lado", "Círculos de cadera — 1 min", "Hip hinge sin peso — 1 min", "Dislocaciones con banda — 1 min"],
    estiramiento: ["Rutina propioceptiva completa — 15 min", "Respiración diafragmática — 2 min"],
    gym: [
      { id: "prensaligera", n: "Prensa parcial ligera", d: "Ritmo circuito", p: 40, sets: 3, reps: "10–12", yt: "leg press partial" },
      { id: "remomaq", n: "Remo máquina", d: "Espalda media", p: 25, sets: 3, reps: "10–12", yt: "chest supported row" },
      { id: "presshombro", n: "Press hombros", d: "Deltoides", p: 15, sets: 3, reps: "10–12", yt: "shoulder press machine" },
      { id: "planchalat", n: "Plancha lateral", d: "20 seg por lado", p: 0, sets: 3, reps: "20 seg c/lado", yt: "side plank" },
    ],
    casa: [
      { id: "sentmanc", n: "Sentadilla parcial mancuernas", d: "kg c/u · hasta 70°", p: 12, sets: 3, reps: "10–12", yt: "dumbbell squat partial" },
      { id: "remoanillas", n: "Remo en anillas", d: "Espalda media", p: 0, sets: 3, reps: "10–12", yt: "ring row" },
      { id: "presshombrocasa", n: "Press hombros", d: "kg c/u", p: 8, sets: 3, reps: "10–12", yt: "seated dumbbell shoulder press" },
      { id: "planchalat", n: "Plancha lateral", d: "20 seg por lado", p: 0, sets: 3, reps: "20 seg c/lado", yt: "side plank" },
    ],
  },
};

const DIAS = [
  { k: "lun", label: "Lun" }, { k: "mar", label: "Mar" }, { k: "mie", label: "Mié" },
  { k: "jue", label: "Jue" }, { k: "vie", label: "Vie" },
];

const STORAGE_KEY = "ana-entrenamiento-logs";

// ---------- HELPERS ----------
const hoy = () => new Date().toISOString().slice(0, 10);
const fmtFecha = (iso) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}`;
};

// ¿Logró el tope de reps en todas las series? (regla 12-12-12-12)
function logroTope(entry) {
  if (!entry || !entry.reps || entry.reps.length === 0) return false;
  const tope = 12;
  return entry.reps.every((r) => Number(r) >= tope) && Number(entry.peso) > 0;
}

// ---------- COMPONENTE ----------
export default function EntrenamientoAna() {
  const [tab, setTab] = useState("entrenar");
  const [dia, setDia] = useState("lun");
  const [modo, setModo] = useState("casa");
  const [logs, setLogs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [inputs, setInputs] = useState({});
  const [guardado, setGuardado] = useState(null);
  const [checks, setChecks] = useState({});
  const [exProgreso, setExProgreso] = useState("hipthrust");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLogs(JSON.parse(raw));
    } catch (e) { /* sin datos aún */ }
    setCargando(false);
  }, []);

  const persistir = (nuevos) => {
    setLogs(nuevos);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevos)); }
    catch (e) { console.error("No se pudo guardar", e); }
  };

  const ejercicios = PLAN[dia][modo];

  const ultimaSesion = (exId) => {
    const prev = logs.filter((l) => l.ex === exId).sort((a, b) => b.fecha.localeCompare(a.fecha));
    return prev[0] || null;
  };

  const setInput = (exId, campo, idx, valor) => {
    setInputs((prev) => {
      const cur = prev[exId] || { peso: "", reps: [] };
      const next = { ...cur };
      if (campo === "peso") next.peso = valor;
      else { next.reps = [...(cur.reps || [])]; next.reps[idx] = valor; }
      return { ...prev, [exId]: next };
    });
  };

  const guardarEjercicio = (ex) => {
    const inp = inputs[ex.id] || {};
    const reps = (inp.reps || []).slice(0, ex.sets).map((r) => Number(r) || 0);
    if (reps.filter((r) => r > 0).length === 0) return;
    const entry = {
      fecha: hoy(), dia, modo, ex: ex.id, nombre: ex.n,
      peso: Number(inp.peso) || 0, reps,
    };
    const nuevos = [...logs.filter((l) => !(l.fecha === entry.fecha && l.ex === ex.id && l.modo === modo)), entry];
    persistir(nuevos);
    setGuardado(ex.id);
    setTimeout(() => setGuardado(null), 1800);
  };

  const toggleCheck = (lista, i) => {
    const key = `${dia}-${lista}-${i}`;
    setChecks((p) => ({ ...p, [key]: !p[key] }));
  };

  // Datos para gráfico
  const todosEjercicios = [];
  const vistos = new Set();
  Object.values(PLAN).forEach((d) => ["gym", "casa"].forEach((m) => d[m].forEach((e) => {
    if (!vistos.has(e.id) && e.p > 0) { vistos.add(e.id); todosEjercicios.push({ id: e.id, n: e.n }); }
  })));

  const datosGrafico = logs
    .filter((l) => l.ex === exProgreso && l.peso > 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((l) => ({ fecha: fmtFecha(l.fecha), peso: l.peso, reps: l.reps.join("·") }));

  // ---------- ESTILOS ----------
  const st = {
    app: { minHeight: "100vh", background: C.bg, fontFamily: "'Nunito', -apple-system, sans-serif", color: C.texto, paddingBottom: 90 },
    header: { padding: "28px 20px 14px", textAlign: "center" },
    titulo: { fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic", fontSize: 30, fontWeight: 600, color: C.rosaOscuro, margin: 0, letterSpacing: "-0.5px" },
    sub: { fontSize: 13, color: C.gris, marginTop: 4, fontWeight: 600 },
    pills: { display: "flex", gap: 8, justifyContent: "center", padding: "10px 16px", flexWrap: "wrap" },
    pill: (act) => ({
      border: "none", borderRadius: 999, padding: "10px 16px", fontSize: 14, fontWeight: 800,
      fontFamily: "inherit", cursor: "pointer", transition: "all .2s",
      background: act ? C.rosa : C.card, color: act ? "#fff" : C.rosaOscuro,
      boxShadow: act ? "0 4px 14px rgba(231,84,145,.35)" : "0 2px 6px rgba(179,55,113,.08)",
    }),
    modoWrap: { display: "flex", justifyContent: "center", gap: 0, margin: "6px 20px 14px", background: C.rosaSuave, borderRadius: 999, padding: 4 },
    modoBtn: (act) => ({
      flex: 1, border: "none", borderRadius: 999, padding: "10px 0", fontSize: 14, fontWeight: 800,
      fontFamily: "inherit", cursor: "pointer",
      background: act ? C.card : "transparent", color: act ? C.rosaOscuro : "#C77BA0",
      boxShadow: act ? "0 2px 8px rgba(179,55,113,.15)" : "none",
    }),
    card: { background: C.card, borderRadius: 22, padding: "16px 16px", margin: "0 16px 14px", boxShadow: "0 3px 14px rgba(179,55,113,.07)" },
    seccionTitulo: { fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: C.lila, marginBottom: 10 },
    checkRow: (done) => ({
      display: "flex", alignItems: "center", gap: 10, padding: "7px 0", fontSize: 14, fontWeight: 600,
      color: done ? C.gris : C.texto, textDecoration: done ? "line-through" : "none", cursor: "pointer",
    }),
    checkbox: (done) => ({
      width: 22, height: 22, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
      background: done ? C.rosa : C.rosaSuave, color: "#fff", fontSize: 13, fontWeight: 900, transition: "all .15s",
    }),
    exNombre: { fontSize: 17, fontWeight: 800, margin: 0, color: C.texto },
    exDetalle: { fontSize: 13, color: C.gris, fontWeight: 600, margin: "2px 0 0" },
    ytTag: { display: "inline-block", fontSize: 11.5, fontWeight: 700, color: C.lila, background: C.lilaSuave, borderRadius: 8, padding: "3px 8px", marginTop: 6 },
    ultVez: { fontSize: 12.5, fontWeight: 700, color: C.rosaOscuro, background: C.rosaSuave, borderRadius: 10, padding: "6px 10px", marginTop: 8, display: "inline-block" },
    badge: { fontSize: 12.5, fontWeight: 800, color: "#fff", background: `linear-gradient(90deg, ${C.rosa}, ${C.lila})`, borderRadius: 10, padding: "7px 10px", marginTop: 8, display: "block" },
    inputPeso: { width: 74, border: `2px solid ${C.rosaSuave}`, borderRadius: 12, padding: "9px 8px", fontSize: 16, fontWeight: 800, textAlign: "center", color: C.rosaOscuro, fontFamily: "inherit", background: "#FFF9FB" },
    inputRep: { width: 46, border: `2px solid ${C.rosaSuave}`, borderRadius: 10, padding: "8px 4px", fontSize: 15, fontWeight: 700, textAlign: "center", color: C.texto, fontFamily: "inherit", background: "#FFF9FB" },
    btnGuardar: (ok) => ({
      width: "100%", border: "none", borderRadius: 14, padding: "12px 0", fontSize: 15, fontWeight: 800,
      fontFamily: "inherit", cursor: "pointer", marginTop: 12, transition: "all .2s",
      background: ok ? C.exito : C.rosa, color: "#fff",
      boxShadow: ok ? "0 4px 12px rgba(46,184,138,.3)" : "0 4px 12px rgba(231,84,145,.3)",
    }),
    tabbar: {
      position: "fixed", bottom: 0, left: 0, right: 0, display: "flex", background: C.card,
      borderTop: `1px solid ${C.rosaSuave}`, boxShadow: "0 -4px 18px rgba(179,55,113,.08)", zIndex: 10,
    },
    tabBtn: (act) => ({
      flex: 1, border: "none", background: "none", padding: "13px 0 18px", fontSize: 13.5, fontWeight: 800,
      fontFamily: "inherit", cursor: "pointer", color: act ? C.rosa : C.gris,
    }),
    label: { fontSize: 11, fontWeight: 800, color: C.gris, letterSpacing: 0.5, textTransform: "uppercase" },
  };

  if (cargando) {
    return <div style={{ ...st.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: C.rosa, fontWeight: 800, fontFamily: "'Nunito', sans-serif" }}>Cargando tu plan… 💗</p>
    </div>;
  }

  const d = PLAN[dia];

  return (
    <div style={st.app}>
      <header style={st.header}>
        <h1 style={st.titulo}>Fuerte &amp; Radiante</h1>
        <p style={st.sub}>El plan de Ana · rumbo al 17 de agosto ✨</p>
      </header>

      {tab === "entrenar" && (
        <>
          <div style={st.pills}>
            {DIAS.map((x) => (
              <button key={x.k} style={st.pill(dia === x.k)} onClick={() => setDia(x.k)}>
                {PLAN[x.k].emoji} {x.label}
              </button>
            ))}
          </div>

          <div style={{ textAlign: "center", margin: "4px 0 10px" }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 21, fontWeight: 600, color: C.rosaOscuro }}>
              {d.emoji} {d.nombre}
            </span>
          </div>

          <div style={st.modoWrap}>
            <button style={st.modoBtn(modo === "casa")} onClick={() => setModo("casa")}>🏠 Casa</button>
            <button style={st.modoBtn(modo === "gym")} onClick={() => setModo("gym")}>🏢 Gym</button>
          </div>

          {/* MOVILIDAD */}
          <div style={st.card}>
            <div style={st.seccionTitulo}>🔄 Movilidad · antes de empezar</div>
            {d.movilidad.map((m, i) => {
              const done = checks[`${dia}-mov-${i}`];
              return (
                <div key={i} style={st.checkRow(done)} onClick={() => toggleCheck("mov", i)}>
                  <span style={st.checkbox(done)}>{done ? "✓" : ""}</span>{m}
                </div>
              );
            })}
          </div>

          {/* EJERCICIOS */}
          {ejercicios.map((ex) => {
            const ult = ultimaSesion(ex.id);
            const subir = logroTope(ult);
            const inp = inputs[ex.id] || {};
            return (
              <div key={ex.id + modo} style={st.card}>
                <p style={st.exNombre}>{ex.n}</p>
                <p style={st.exDetalle}>{ex.d} · {ex.sets} series × {ex.reps}</p>
                <span style={st.ytTag}>▶ {ex.yt}</span>

                {ult && (
                  <span style={st.ultVez}>
                    Última vez: {ult.peso > 0 ? `${ult.peso} kg → ` : ""}{ult.reps.join(" · ")}
                  </span>
                )}
                {subir && (
                  <span style={st.badge}>🎀 ¡Lograste el tope en todas las series! Sube el peso (+2 kg mancuernas / +5 kg barra)</span>
                )}
                {!ult && ex.p > 0 && (
                  <span style={st.ultVez}>Peso sugerido para empezar: {ex.p} kg</span>
                )}

                <div style={{ display: "flex", gap: 14, alignItems: "flex-end", marginTop: 14, flexWrap: "wrap" }}>
                  {ex.p > 0 && (
                    <div>
                      <div style={st.label}>Peso (kg)</div>
                      <input type="number" inputMode="decimal" style={st.inputPeso}
                        value={inp.peso ?? ""} placeholder={String(ult ? ult.peso : ex.p)}
                        onChange={(e) => setInput(ex.id, "peso", 0, e.target.value)} />
                    </div>
                  )}
                  <div>
                    <div style={st.label}>Reps por serie</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                      {Array.from({ length: ex.sets }).map((_, i) => (
                        <input key={i} type="number" inputMode="numeric" style={st.inputRep}
                          value={(inp.reps || [])[i] ?? ""} placeholder={`S${i + 1}`}
                          onChange={(e) => setInput(ex.id, "reps", i, e.target.value)} />
                      ))}
                    </div>
                  </div>
                </div>

                <button style={st.btnGuardar(guardado === ex.id)} onClick={() => guardarEjercicio(ex)}>
                  {guardado === ex.id ? "✓ Guardado" : "Guardar serie de hoy 💗"}
                </button>
              </div>
            );
          })}

          {/* ESTIRAMIENTO */}
          <div style={st.card}>
            <div style={st.seccionTitulo}>🧘 Estiramiento · para terminar</div>
            {d.estiramiento.map((m, i) => {
              const done = checks[`${dia}-est-${i}`];
              return (
                <div key={i} style={st.checkRow(done)} onClick={() => toggleCheck("est", i)}>
                  <span style={st.checkbox(done)}>{done ? "✓" : ""}</span>{m}
                </div>
              );
            })}
          </div>

          <p style={{ textAlign: "center", fontSize: 12, color: C.gris, fontWeight: 700, padding: "4px 30px 10px" }}>
            Recuerda: rodilla máx 70° · columna neutral · las últimas 2 reps deben costar 💪
          </p>
        </>
      )}

      {tab === "progreso" && (
        <>
          <div style={{ ...st.card, marginTop: 8 }}>
            <div style={st.seccionTitulo}>📈 Tu avance por ejercicio</div>
            <select
              value={exProgreso}
              onChange={(e) => setExProgreso(e.target.value)}
              style={{ width: "100%", border: `2px solid ${C.rosaSuave}`, borderRadius: 12, padding: "11px 10px", fontSize: 15, fontWeight: 800, color: C.rosaOscuro, fontFamily: "inherit", background: "#FFF9FB" }}>
              {todosEjercicios.map((e) => <option key={e.id} value={e.id}>{e.n}</option>)}
            </select>

            {datosGrafico.length === 0 ? (
              <p style={{ textAlign: "center", color: C.gris, fontWeight: 700, fontSize: 14, padding: "26px 10px" }}>
                Aún no hay registros de este ejercicio.<br />Guarda tu primera sesión y aquí verás la línea subir 💗
              </p>
            ) : (
              <div style={{ height: 230, marginTop: 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={datosGrafico} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
                    <CartesianGrid stroke={C.rosaSuave} strokeDasharray="4 4" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11, fontWeight: 700, fill: C.gris }} />
                    <YAxis tick={{ fontSize: 11, fontWeight: 700, fill: C.gris }} unit=" kg" />
                    <Tooltip
                      formatter={(v, n, p) => [`${v} kg (reps: ${p.payload.reps})`, "Peso"]}
                      contentStyle={{ borderRadius: 12, border: `1.5px solid ${C.rosaSuave}`, fontFamily: "inherit", fontWeight: 700, fontSize: 13 }} />
                    <Line type="monotone" dataKey="peso" stroke={C.rosa} strokeWidth={3}
                      dot={{ r: 5, fill: C.rosa, strokeWidth: 2, stroke: "#fff" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div style={st.card}>
            <div style={st.seccionTitulo}>📋 Historial reciente</div>
            {logs.length === 0 ? (
              <p style={{ color: C.gris, fontWeight: 700, fontSize: 14, textAlign: "center", padding: 12 }}>Sin registros todavía ✨</p>
            ) : (
              [...logs].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 25).map((l, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.rosaSuave}`, fontSize: 13.5, fontWeight: 700 }}>
                  <span style={{ color: C.texto }}>{l.nombre}</span>
                  <span style={{ color: C.rosaOscuro, whiteSpace: "nowrap", marginLeft: 8 }}>
                    {fmtFecha(l.fecha)} · {l.peso > 0 ? `${l.peso} kg · ` : ""}{l.reps.join("·")}
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <nav style={st.tabbar}>
        <button style={st.tabBtn(tab === "entrenar")} onClick={() => setTab("entrenar")}>💪 Entrenar</button>
        <button style={st.tabBtn(tab === "progreso")} onClick={() => setTab("progreso")}>📈 Progreso</button>
      </nav>
    </div>
  );
}
