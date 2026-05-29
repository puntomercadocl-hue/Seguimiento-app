import { useState, useEffect, useRef } from "react";

const KEYFRAMES = `
  @keyframes typingBounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
    40% { transform: translateY(-5px); opacity: 1; }
  }
  @keyframes logFadeIn {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes glowDot {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }
  @keyframes cardHover {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-4px); }
  }
`;

// ── Character SVG ─────────────────────────────────────────────────────────────
function Girl({ hairColor, shirtColor, skinColor = "#f5c5a3" }) {
  return (
    <svg width="62" height="74" viewBox="0 0 62 74" fill="none">
      {/* Chair */}
      <rect x="14" y="50" width="34" height="20" rx="6" fill="#334155" opacity="0.75"/>
      <rect x="25" y="42" width="12" height="12" rx="3" fill="#1e293b"/>
      {/* Body */}
      <path d="M17 37 Q17 27 31 27 Q45 27 45 37 L47 52 L15 52 Z" fill={shirtColor}/>
      {/* Collar accent */}
      <path d="M27 27 L31 33 L35 27" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Left arm */}
      <path d="M17 37 Q8 41 4 45" stroke={shirtColor} strokeWidth="9" strokeLinecap="round" fill="none"/>
      <circle cx="4" cy="46" r="5" fill={skinColor}/>
      {/* Right arm */}
      <path d="M45 37 Q54 41 58 45" stroke={shirtColor} strokeWidth="9" strokeLinecap="round" fill="none"/>
      <circle cx="58" cy="46" r="5" fill={skinColor}/>
      {/* Neck */}
      <rect x="27" y="23" width="8" height="7" rx="3.5" fill={skinColor}/>
      {/* Head */}
      <circle cx="31" cy="15" r="14" fill={skinColor}/>
      {/* Hair back */}
      <path d="M17 15 Q17 2 31 2 Q45 2 45 15 Q45 8 41 5 Q36 1 31 1 Q26 1 21 5 Q17 8 17 15 Z" fill={hairColor}/>
      {/* Hair sides */}
      <ellipse cx="18" cy="19" rx="5" ry="10" fill={hairColor}/>
      <ellipse cx="44" cy="19" rx="5" ry="10" fill={hairColor}/>
      {/* Eye whites */}
      <ellipse cx="25" cy="15" rx="3.8" ry="4.2" fill="white"/>
      <ellipse cx="37" cy="15" rx="3.8" ry="4.2" fill="white"/>
      {/* Irises */}
      <circle cx="26" cy="15.8" r="2.6" fill="#2d1b69"/>
      <circle cx="38" cy="15.8" r="2.6" fill="#2d1b69"/>
      {/* Pupils */}
      <circle cx="26.2" cy="16" r="1.4" fill="#0a0a0a"/>
      <circle cx="38.2" cy="16" r="1.4" fill="#0a0a0a"/>
      {/* Eye shine */}
      <circle cx="26.8" cy="15.1" r="0.7" fill="white"/>
      <circle cx="38.8" cy="15.1" r="0.7" fill="white"/>
      {/* Eyebrows */}
      <path d="M21.5 10.5 Q25 8.5 29 10" stroke={hairColor} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <path d="M33 10 Q37 8.5 40.5 10.5" stroke={hairColor} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      {/* Nose */}
      <path d="M29.5 20 Q31 22 32.5 20" stroke="#c8836a" strokeWidth="1" fill="none" strokeLinecap="round"/>
      {/* Smile */}
      <path d="M27 24.5 Q31 28 35 24.5" stroke="#c07050" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Blush */}
      <ellipse cx="21" cy="21" rx="4.5" ry="2.5" fill="#ff9999" opacity="0.4"/>
      <ellipse cx="41" cy="21" rx="4.5" ry="2.5" fill="#ff9999" opacity="0.4"/>
    </svg>
  );
}

// ── Laptop SVG ────────────────────────────────────────────────────────────────
function Laptop({ color, active }) {
  const bars = [16, 24, 14, 30, 20, 26, 18];
  return (
    <svg width="74" height="54" viewBox="0 0 74 54" fill="none">
      <rect x="3" y="1" width="68" height="40" rx="4" fill="#0f172a" stroke="#1e293b" strokeWidth="1.5"/>
      <rect x="5" y="3" width="64" height="36" rx="2.5" fill={active ? "#020617" : "#0a0a0a"}/>
      {active ? (
        <>
          {bars.map((h, i) => (
            <rect key={i} x={9 + i * 9} y={36 - h} width="7" height={h} rx="2" fill={color} opacity={0.5 + (i % 2) * 0.3}/>
          ))}
          <line x1="7" y1="36" x2="67" y2="36" stroke={color} strokeWidth="0.8" opacity="0.3"/>
          <polyline points="9,28 18,20 27,24 36,12 45,22 54,16 63,10"
            stroke={color} strokeWidth="1.5" fill="none" opacity="0.7" strokeLinejoin="round"/>
        </>
      ) : (
        <text x="37" y="25" textAnchor="middle" fill="#334155" fontSize="10" fontFamily="monospace">zzz</text>
      )}
      <rect x="3" y="41" width="68" height="3" rx="1.5" fill="#1e293b"/>
      <rect x="0" y="43" width="74" height="9" rx="4" fill="#0f172a" stroke="#1e293b" strokeWidth="1"/>
      <rect x="7" y="45" width="60" height="5" rx="2.5" fill="#020617"/>
      {[0,1,2,3,4,5,6,7,8].map(i => (
        <rect key={i} x={10 + i * 6} y={46.5} width="4.5" height="2.5" rx="0.8" fill="#1e293b"/>
      ))}
    </svg>
  );
}

// ── Agents (basados en las secciones reales de la app) ─────────────────────────
const AGENTS = [
  {
    id: "campanas", name: "Ana", role: "Campañas Ads", icon: "📡",
    color: "#a78bfa", darkBg: "rgba(124,58,237,0.18)",
    hairColor: "#1a0a00", shirtColor: "#7c3aed", skinColor: "#f5c5a3",
    tasks: [
      "Revisando ROAS vs BEROAS...",
      "Meta Ads — 3 campañas activas ✅",
      "⚡ Escalar: ROAS 3.2x detectado",
      "Pausando campaña sin rentabilidad 🔴",
      "Calculando CPA real vs estimado...",
      "Semáforo actualizado 🚦",
    ],
  },
  {
    id: "calculadora", name: "Sofía", role: "Calculadora", icon: "🧮",
    color: "#fbbf24", darkBg: "rgba(217,119,6,0.18)",
    hairColor: "#3d1f00", shirtColor: "#b45309", skinColor: "#fad4b0",
    tasks: [
      "Calculando costeo unitario...",
      "CPA máximo aceptable: $4.200 ✓",
      "Precio para quedar neto: $12.800 💡",
      "2da unidad → +18% margen 📈",
      "Proyectando ganancia mensual...",
      "BEROAS calculado: 2.4x ✅",
    ],
  },
  {
    id: "productos", name: "Luna", role: "Mis Productos", icon: "📦",
    color: "#34d399", darkBg: "rgba(5,150,105,0.18)",
    hairColor: "#0f0f1e", shirtColor: "#047857", skinColor: "#f0c8a0",
    tasks: [
      "Actualizando catálogo...",
      "Nuevo producto cargado ✨",
      "Comparando márgenes por producto...",
      "Verificando links de anuncios 🔗",
      "Costeo actualizado ✅",
      "Detectado producto sin rentabilidad ⚠️",
    ],
  },
  {
    id: "registro", name: "Cata", role: "Registro Diario", icon: "➕",
    color: "#fb923c", darkBg: "rgba(234,88,12,0.18)",
    hairColor: "#2d0a00", shirtColor: "#c2410c", skinColor: "#f8d0b0",
    tasks: [
      "Registrando testeo de hoy...",
      "Checklist de calidad completo ✅",
      "Detectadas 2 métricas fuera de rango ⚠️",
      "Guardando datos del día...",
      "Comparando vs testeo anterior...",
      "Nuevo testeo archivado 📋",
    ],
  },
  {
    id: "importar", name: "Mía", role: "Importar Datos", icon: "📥",
    color: "#67e8f9", darkBg: "rgba(8,145,178,0.18)",
    hairColor: "#1c1c2e", shirtColor: "#0e7490", skinColor: "#f5d5b5",
    tasks: [
      "Procesando Excel de Dropi...",
      "Detectando combos y upsells 🔍",
      "Importando CSV de Shopify...",
      "Órdenes sincronizadas ✅",
      "Validando datos importados...",
      "Importación completa: 142 órdenes 📊",
    ],
  },
  {
    id: "dashboard", name: "Vale", role: "Dashboard", icon: "📊",
    color: "#60a5fa", darkBg: "rgba(37,99,235,0.18)",
    hairColor: "#2d0a3e", shirtColor: "#1d4ed8", skinColor: "#f8d5b5",
    tasks: [
      "Generando dashboard semanal...",
      "Rentabilidad: +12% esta semana 📈",
      "Comparando vs período anterior...",
      "Gráfico de tendencias listo 📉",
      "Exportando reporte...",
      "Semáforo ROAS — 2 verdes, 1 rojo 🚦",
    ],
  },
  {
    id: "simulaciones", name: "Cami", role: "Simulaciones", icon: "🔮",
    color: "#f87171", darkBg: "rgba(220,38,38,0.18)",
    hairColor: "#1c0800", shirtColor: "#b91c1c", skinColor: "#f6c8b0",
    tasks: [
      "Simulando escenario ácido...",
      "Escenario optimista: +45% ganancia 🌟",
      "Break-even: 8 ventas/día ✓",
      "Proyectando rentabilidad 30 días...",
      "Riesgo bajo — viable 🟢",
      "Ajustando variables de simulación...",
    ],
  },
];

// ── Typing dots ───────────────────────────────────────────────────────────────
function TypingDots({ color }) {
  return (
    <span style={{ display: "inline-flex", gap: 3, marginLeft: 5, verticalAlign: "middle" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: "50%", background: color, display: "inline-block",
          animation: `typingBounce 1.4s ease-in-out ${i * 0.2}s infinite`,
        }}/>
      ))}
    </span>
  );
}

// ── Agent card ────────────────────────────────────────────────────────────────
function AgentCard({ agent, task, isActive, onClick }) {
  const isDone = /✅|✓|🟢|🚦|📋/.test(task);
  const isTyping = isActive && !isDone;

  return (
    <div onClick={onClick} style={{
      background: isActive
        ? `linear-gradient(145deg, ${agent.darkBg}, rgba(255,255,255,0.02))`
        : "rgba(255,255,255,0.03)",
      border: `1.5px solid ${isActive ? agent.color + "55" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 18,
      padding: "14px 12px 12px",
      cursor: "pointer",
      transition: "all 0.3s cubic-bezier(0.34,1.2,0.64,1)",
      backdropFilter: "blur(10px)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6,
      boxShadow: isActive
        ? `0 0 22px ${agent.color}20, 0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)`
        : "0 4px 16px rgba(0,0,0,0.3)",
      transform: isActive ? "translateY(-5px) scale(1.02)" : "scale(1)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Top glow line */}
      {isActive && (
        <div style={{
          position: "absolute", top: 0, left: "15%", right: "15%", height: 2,
          background: `linear-gradient(90deg, transparent, ${agent.color}, transparent)`,
        }}/>
      )}

      {/* Status pill */}
      <div style={{ alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 4,
        fontSize: 9.5, fontWeight: 700,
        color: isActive ? agent.color : "#4b5563",
        background: isActive ? `${agent.color}18` : "rgba(255,255,255,0.04)",
        border: `1px solid ${isActive ? agent.color + "40" : "transparent"}`,
        borderRadius: 20, padding: "2px 8px",
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: isActive ? agent.color : "#374151",
          boxShadow: isActive ? `0 0 6px ${agent.color}` : "none",
          animation: isActive ? "glowDot 2s ease-in-out infinite" : "none",
        }}/>
        {isActive ? "Trabajando" : "En pausa"}
      </div>

      {/* Character */}
      <div style={{ filter: isActive ? "drop-shadow(0 4px 10px rgba(0,0,0,0.5))" : "grayscale(0.5) opacity(0.6)" }}>
        <Girl hairColor={agent.hairColor} shirtColor={agent.shirtColor} skinColor={agent.skinColor}/>
      </div>

      {/* Laptop */}
      <Laptop color={agent.color} active={isActive}/>

      {/* Name */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#fff", letterSpacing: "-0.01em" }}>
          {agent.icon} {agent.name}
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.38)", marginTop: 1, fontWeight: 600 }}>
          {agent.role}
        </div>
      </div>

      {/* Task bubble */}
      <div style={{
        background: isActive ? `${agent.color}16` : "rgba(255,255,255,0.04)",
        border: `1px solid ${isActive ? agent.color + "28" : "rgba(255,255,255,0.05)"}`,
        borderRadius: 10, padding: "7px 10px",
        fontSize: 10.5, lineHeight: 1.4,
        color: isActive ? agent.color : "rgba(255,255,255,0.25)",
        textAlign: "center", width: "100%",
        minHeight: 46, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {task}
        {isTyping && <TypingDots color={agent.color}/>}
      </div>
    </div>
  );
}

// ── Log entry ─────────────────────────────────────────────────────────────────
function LogEntry({ entry }) {
  const agent = AGENTS.find(a => a.id === entry.agentId);
  if (!agent) return null;
  const isDone = /✅|✓|🟢|🚦|📋/.test(entry.task);
  return (
    <div style={{
      display: "flex", gap: 9, alignItems: "flex-start",
      padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
      animation: "logFadeIn 0.3s ease-out",
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        background: `${agent.color}18`, border: `1.5px solid ${agent.color}40`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
      }}>
        {agent.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 11, color: agent.color }}>{agent.name}</span>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.22)" }}>{entry.time}</span>
        </div>
        <div style={{ fontSize: 11, color: isDone ? "#86efac" : "rgba(255,255,255,0.65)", marginTop: 1.5, lineHeight: 1.4 }}>
          {isDone ? "✓ " : "› "}{entry.task}
        </div>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function AgentOffice() {
  const [activeAgents, setActiveAgents] = useState(new Set(["campanas", "calculadora", "dashboard"]));
  const [taskIndices, setTaskIndices] = useState(
    Object.fromEntries(AGENTS.map(a => [a.id, 0]))
  );
  const [log, setLog] = useState([]);
  const logRef = useRef(null);

  const now = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
  };

  // Tick: advance one random active agent every ~2s
  useEffect(() => {
    const id = setInterval(() => {
      const active = AGENTS.filter(a => activeAgents.has(a.id));
      if (active.length === 0) return;
      const agent = active[Math.floor(Math.random() * active.length)];
      setTaskIndices(prev => {
        const next = (prev[agent.id] + 1) % agent.tasks.length;
        const task = agent.tasks[next];
        setLog(l => [{ id: Date.now() + Math.random(), agentId: agent.id, task, time: now() }, ...l.slice(0, 34)]);
        return { ...prev, [agent.id]: next };
      });
    }, 2200);
    return () => clearInterval(id);
  }, [activeAgents]);

  const toggle = (agentId) => {
    setActiveAgents(prev => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
        setLog(l => [{ id: Date.now(), agentId, task: "Agente pausada 😴", time: now() }, ...l.slice(0, 34)]);
      } else {
        next.add(agentId);
        const agent = AGENTS.find(a => a.id === agentId);
        setLog(l => [{ id: Date.now(), agentId, task: `${agent.name} activada 🚀`, time: now() }, ...l.slice(0, 34)]);
      }
      return next;
    });
  };

  const activeCount = activeAgents.size;

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{
        background: "linear-gradient(135deg, #0f0a1e 0%, #1a1035 55%, #0f0a1e 100%)",
        borderRadius: 20, overflow: "hidden",
        display: "flex", flexDirection: "column",
        minHeight: "calc(100vh - 130px)",
      }}>

        {/* Header */}
        <div style={{
          padding: "22px 28px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(0,0,0,0.25)",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 21, color: "#fff", letterSpacing: "-0.03em" }}>
              🏢 Oficina PM Control
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", marginTop: 3 }}>
              {activeCount} de {AGENTS.length} agentes activas — hacé clic para activar o pausar
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { label: "Activas", val: activeCount, color: "#34d399" },
              { label: "En pausa", val: AGENTS.length - activeCount, color: "#f87171" },
              { label: "Eventos", val: log.length, color: "#60a5fa" },
            ].map(s => (
              <div key={s.label} style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 10, padding: "8px 16px", textAlign: "center",
              }}>
                <div style={{ fontWeight: 900, fontSize: 20, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.38)", fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

          {/* Office grid */}
          <div style={{ flex: 1, padding: "24px 20px", position: "relative", overflow: "hidden" }}>
            {/* Grid bg */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              backgroundImage: "linear-gradient(rgba(139,92,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.05) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}/>
            {/* Ambient glows */}
            {AGENTS.filter(a => activeAgents.has(a.id)).map((a, i) => (
              <div key={a.id} style={{
                position: "absolute", width: 260, height: 260, borderRadius: "50%",
                background: `radial-gradient(circle, ${a.color}07 0%, transparent 70%)`,
                top: `${15 + (i % 3) * 30}%`, left: `${5 + i * 14}%`,
                pointerEvents: "none", transition: "opacity 1s ease",
              }}/>
            ))}

            {/* Cards */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))",
              gap: 14, position: "relative", zIndex: 1,
            }}>
              {AGENTS.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  task={agent.tasks[taskIndices[agent.id]]}
                  isActive={activeAgents.has(agent.id)}
                  onClick={() => toggle(agent.id)}
                />
              ))}
            </div>

            <div style={{
              textAlign: "center", marginTop: 22,
              fontSize: 10.5, color: "rgba(255,255,255,0.13)",
              fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
            }}>
              Piso 1 · PM Control HQ · {new Date().toLocaleDateString("es-CL")}
            </div>
          </div>

          {/* Activity log */}
          <div style={{
            width: 270, borderLeft: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(0,0,0,0.22)", display: "flex", flexDirection: "column", flexShrink: 0,
          }}>
            <div style={{
              padding: "15px 18px 11px", borderBottom: "1px solid rgba(255,255,255,0.07)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              fontWeight: 800, fontSize: 13, color: "rgba(255,255,255,0.65)",
            }}>
              <span>💬 Actividad en vivo</span>
              {log.length > 0 && (
                <span style={{
                  fontSize: 9.5, fontWeight: 700, color: "#34d399",
                  background: "#34d39918", border: "1px solid #34d39940",
                  borderRadius: 10, padding: "2px 8px",
                }}>
                  {log.length} eventos
                </span>
              )}
            </div>

            <div ref={logRef} style={{
              flex: 1, overflowY: "auto", padding: "6px 16px",
              scrollbarWidth: "thin", scrollbarColor: "rgba(139,92,246,0.3) transparent",
            }}>
              {log.length === 0 ? (
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 12, marginTop: 50, lineHeight: 2 }}>
                  Las agentes están<br/>en pausa...<br/>😴
                </div>
              ) : (
                log.map(e => <LogEntry key={e.id} entry={e}/>)
              )}
            </div>

            {/* Active list footer */}
            {activeCount > 0 && (
              <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.28)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 7 }}>
                  Agentes activas
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {AGENTS.filter(a => activeAgents.has(a.id)).map(a => (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: a.color, boxShadow: `0 0 6px ${a.color}`,
                        flexShrink: 0, animation: "glowDot 2s ease-in-out infinite",
                      }}/>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>{a.name}</span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", marginLeft: "auto" }}>{a.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
