import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, AreaChart, Area } from "recharts";

// ─── Persistence ──────────────────────────────────────────────────────────────
const SK = "drofitv4";
const persist = (d) => { try { localStorage.setItem(SK, JSON.stringify(d)); } catch {} };
const hydrate = () => { try { return JSON.parse(localStorage.getItem(SK)) || {}; } catch { return {}; } };
const hoy = () => new Date().toISOString().slice(0,10);
const hace30 = () => { const d = new Date(); d.setDate(d.getDate()-30); return d.toISOString().slice(0,10); };

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg: "#f5f6fa", white: "#ffffff", accent: "#5b50f0", accentL: "#ede9ff", accentText: "#5b50f0",
  green: "#10b981", greenBg: "#d1fae5", red: "#ef4444", redBg: "#fee2e2",
  yellow: "#f59e0b", yellowBg: "#fef3c7", orange: "#f97316", orangeBg: "#ffedd5",
  text: "#111827", sub: "#6b7280", border: "#e5e7eb", inputBg: "#f9fafb",
  shadow: "0 1px 3px rgba(0,0,0,0.08)", shadowMd: "0 4px 12px rgba(0,0,0,0.08)",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const clp = (n, dec = 0) => (n == null || isNaN(n) || !isFinite(n)) ? "—" : `$${(+n).toLocaleString("es-CL", { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
const pct = (n) => (n == null || isNaN(n)) ? "—" : `${(+n * 100).toFixed(1)}%`;
const x2 = (n) => (n == null || isNaN(n) || !isFinite(n)) ? "—" : `${(+n).toFixed(2)}x`;
const num = (v, fb = 0) => { const n = parseFloat(v); return isNaN(n) ? fb : n; };
const nz = (v) => num(v, 0);

// ─── Costeo cálculo (fiel al Excel COSTEO_PRODUCTO) ──────────────────────────
function calcCosteo(p, cfg) {
  const pv   = nz(p.precioVenta);
  const cu   = nz(p.costoUnitario);                        // CAMPO CORRECTO
  const env  = nz(p.costoEnvio  || cfg.costoEnvio);
  const tc   = nz(p.tasaConf    || cfg.tasaConf) / 100;   // Órdenes Confirmadas %
  const te   = nz(p.tasaEnt     || cfg.tasaEnt)  / 100;   // Órdenes Entregadas %
  const cpa  = nz(p.cpaEstimado || cfg.cpaEstimado || 5000);
  const ped  = nz(p.pedidosDiarios || 1);
  const p2da = nz(p.pct2daUnidad) / 100;

  // Fila 14: Órdenes Reales Entregadas = TC × TE
  const realEnt = tc * te;

  // ════ BLOQUE 1 — Costeo Unitario (filas 15-27 del Excel) ════
  const ingReales        = pv * realEnt;               // f15: =B14*B8
  const costosProdReales = cu * realEnt;               // f16: =B14*B9
  const costoEnvTotal    = env * tc;                   // f17: =B12*B10  (envío × confirmados, NO entrega real)
  const costoAnuncios    = cpa;                        // f18: =B11
  const utilUnitReal     = ingReales - costosProdReales - costoEnvTotal - costoAnuncios; // f19
  const margenNeto       = ingReales > 0 ? utilUnitReal / ingReales : null; // f20

  // f22: Precio para quedar neto = (CU×realEnt + Envío×TC + CPA) / realEnt
  // Excel exacto: =(B9*B14 + B10*B12 + B11) / B14
  const precioNeto = realEnt > 0 ? (cu * realEnt + env * tc + cpa) / realEnt : null;

  // f23: CPA "Real" = CPA / realEnt
  // Excel exacto: =B11/B14
  const cpaRealUnit = realEnt > 0 ? cpa / realEnt : null;

  // f24: Costo por compra máximo aceptable
  // Excel exacto: =B14*(B8-B9) - B12*B10  → realEnt*(pv-cu) - tc*env
  const cpaMax = realEnt * (pv - cu) - tc * env;

  // BEROAS = Precio / CPA máximo
  const beroas = cpaMax > 0 ? pv / cpaMax : null;

  // f25-27: Proyección diaria / mensual
  const gananciaDiaria  = utilUnitReal * ped;
  const gananciaMensual = gananciaDiaria * 30;

  // ════ BLOQUE 2 — Con 2ª Unidad al 50% OFF (filas 31-42) ════
  let ing2=null, costosProd2=null, costoEnv2=null, util2=null;
  let margen2=null, aumentoMargen=null, gan2diaria=null, gan2mensual=null;

  if (p2da > 0) {
    ing2 = (1 - p2da) * ingReales + p2da * (ingReales + 0.5 * ingReales);
    costosProd2 = (1 - p2da) * costosProdReales + p2da * (2 * costosProdReales);
    costoEnv2 = costoEnvTotal;
    const costoTotal2 = costosProd2 + costoEnv2 + costoAnuncios;
    util2         = ing2 - costoTotal2;
    margen2       = ing2 > 0 ? util2 / ing2 : null;
    aumentoMargen = (margen2 != null && margenNeto != null && margenNeto !== 0)
      ? margen2 / margenNeto - 1 : null;
    gan2diaria  = ped * util2;
    gan2mensual = gan2diaria * 30;
  }

  return {
    tc, te, realEnt,
    ingReales, costosProdReales, costoEnvTotal, costoAnuncios,
    utilUnitReal, margenNeto,
    precioNeto, cpaRealUnit, cpaMax, beroas,
    gananciaDiaria, gananciaMensual,
    ing2, costosProd2, costoEnv2, util2, margen2, aumentoMargen,
    gan2diaria, gan2mensual,
  };
}

// ─── Análisis Pedidos Reales (Bloque 3 del Excel, filas 44-58) ───────────────
function calcPedidosReales(r, cfg, prod) {
  const pv   = nz(prod?.precioVenta);
  const cu   = nz(prod?.costoUnitario);
  const env  = nz(r.costoEnvioReal || prod?.costoEnvio || cfg.costoEnvio);
  const tc   = nz(r.tcReal)  / 100;
  const te   = nz(r.teReal)  / 100;
  const pt   = nz(r.totalPedidos);
  const ads  = nz(r.gastoAds);

  const realEnt = tc * te;
  const cpaReal = pt > 0 ? ads / pt : null;

  const ingReales  = pv * realEnt * pt;
  const costosProd = cu * realEnt * pt;
  const costoEnv   = env * tc * pt;
  const utilReal   = ingReales - costosProd - costoEnv - ads;
  const margen     = ingReales > 0 ? utilReal / ingReales : null;

  return { cpaReal, realEnt, ingReales, costosProd, costoEnv, utilReal, margen };
}

// ─── Entry metrics ────────────────────────────────────────────────────────────
function calcEntry(e, cfg, prod) {
  const pv = nz(prod?.precioVenta), cu = nz(prod?.costoUnitario);
  const env = nz(prod?.costoEnvio || cfg.costoEnvio);
  const tc = nz(prod?.tasaConf || cfg.tasaConf) / 100;
  const te = nz(prod?.tasaEnt || cfg.tasaEnt) / 100;
  const ads = nz(e.gastoAds), pt = nz(e.pedidosTotales);
  const units = nz(e.unidades), conf = nz(e.confirmados), ent = nz(e.entregados);
  const ingTot = pv * units, ingReal = pv * ent;
  const costosTot = cu * ent + env * conf + ads;
  const utilidad = ingReal - costosTot;
  const rent = ingReal > 0 ? utilidad / ingReal : null;
  const cpaReal = ent > 0 ? ads / ent : null;
  const cpaFalso = pt > 0 ? ads / pt : null;
  const roas = ads > 0 ? ingReal / ads : null;
  const ticket = ent > 0 ? pv : null;
  const ingrR = pv * tc * te, costoR = cu * tc * te + env * tc;
  const cpaMax = ingrR - costoR;
  const beroas = cpaMax > 0 ? pv / cpaMax : null;
  return { ingTot, ingReal, costosTot, utilidad, rent, cpaReal, cpaFalso, roas, beroas, ticket };
}

function semaforo(roas, beroas) {
  if (roas == null || beroas == null) return null;
  if (roas >= beroas) return "escalar";
  if (roas >= beroas * 0.8) return "monitorear";
  return "pausar";
}

// ─── UI Components ────────────────────────────────────────────────────────────
const Card = ({ children, style }) => (
  <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, boxShadow: T.shadow, ...style }}>{children}</div>
);
const SectionTitle = ({ icon, title, sub }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontWeight: 800, fontSize: 17, color: T.text }}>{icon} {title}</div>
    {sub && <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{sub}</div>}
  </div>
);
const Label = ({ children }) => <div style={{ fontSize: 12, fontWeight: 600, color: T.sub, marginBottom: 5 }}>{children}</div>;
const Inp = ({ label, value, onChange, type = "number", placeholder = "0", prefix = "$", hint }) => (
  <div>
    {label && <Label>{label}</Label>}
    <div style={{ position: "relative" }}>
      {prefix && type === "number" && <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.sub, fontSize: 13 }}>{prefix}</span>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", boxSizing: "border-box", background: T.inputBg, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: type === "number" ? "9px 12px 9px 22px" : "9px 12px", color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none" }}
        onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.border} />
    </div>
    {hint && <div style={{ fontSize: 11, color: T.sub, marginTop: 3 }}>{hint}</div>}
  </div>
);
const InpPct = ({ label, value, onChange, placeholder = "70" }) => (
  <div>
    {label && <Label>{label}</Label>}
    <div style={{ position: "relative" }}>
      <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", boxSizing: "border-box", background: T.inputBg, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "9px 28px 9px 12px", color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none" }}
        onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.border} />
      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: T.sub, fontSize: 13 }}>%</span>
    </div>
  </div>
);
const InpText = ({ label, value, onChange, placeholder }) => (
  <div>
    {label && <Label>{label}</Label>}
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || ""}
      style={{ width: "100%", boxSizing: "border-box", background: T.inputBg, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none" }}
      onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.border} />
  </div>
);
const Btn = ({ children, onClick, variant = "primary", small }) => {
  const s = { primary: { background: T.accent, color: "#fff", border: "none" }, ghost: { background: "none", color: T.sub, border: `1.5px solid ${T.border}` }, danger: { background: "none", color: T.red, border: `1.5px solid #fecaca` } };
  return <button onClick={onClick} style={{ ...s[variant], borderRadius: 8, padding: small ? "6px 12px" : "10px 20px", fontWeight: 600, fontSize: small ? 12 : 14, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>{children}</button>;
};
const Badge = ({ type }) => {
  const m = { escalar: { txt: "✅ Escalar", bg: T.greenBg, col: T.green }, monitorear: { txt: "⚠️ Monitorear", bg: T.yellowBg, col: T.yellow }, pausar: { txt: "🔴 Pausar", bg: T.redBg, col: T.red } };
  const s = m[type] || { txt: "—", bg: T.inputBg, col: T.sub };
  return <span style={{ background: s.bg, color: s.col, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{s.txt}</span>;
};
const Row = ({ label, value, color, bold, bg }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", borderRadius: 8, background: bg || T.bg, marginBottom: 4 }}>
    <span style={{ fontSize: 13, color: T.sub }}>{label}</span>
    <span style={{ fontSize: 14, fontWeight: bold ? 800 : 600, color: color || T.text }}>{value}</span>
  </div>
);
const TH = ({ children }) => <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${T.border}`, background: T.bg, whiteSpace: "nowrap" }}>{children}</th>;
const TD = ({ children, color, bold }) => <td style={{ padding: "10px 14px", fontSize: 13, color: color || T.text, fontWeight: bold ? 700 : 400, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{children}</td>;
const ttStyle = { background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 12, boxShadow: T.shadowMd };

// ─── Tab bar ──────────────────────────────────────────────────────────────────
const TabBar = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, marginBottom: 20 }}>
    {tabs.map(([id, label]) => (
      <button key={id} onClick={() => onChange(id)} style={{ padding: "10px 18px", fontWeight: 600, fontSize: 14, color: active === id ? T.accent : T.sub, background: "none", border: "none", borderBottom: active === id ? `2px solid ${T.accent}` : "2px solid transparent", cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
    ))}
  </div>
);

// ─── Date Range Picker ────────────────────────────────────────────────────────
const DateRangePicker = ({ from, to, onChange, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.accentL, borderRadius: 10, padding: "10px 14px", border: `1.5px solid ${T.accent}33` }}>
    <span style={{ fontSize: 14 }}>📅</span>
    {label && <span style={{ fontSize: 12, fontWeight: 700, color: T.accent, whiteSpace: "nowrap" }}>{label}</span>}
    <input type="date" value={from} onChange={e => onChange({ from: e.target.value, to })}
      style={{ fontSize: 13, padding: "6px 10px", border: `1.5px solid ${T.accent}55`, borderRadius: 8, color: T.text, background: T.white, fontFamily: "inherit", outline: "none", cursor: "pointer" }} />
    <span style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>→</span>
    <input type="date" value={to} onChange={e => onChange({ from, to: e.target.value })}
      style={{ fontSize: 13, padding: "6px 10px", border: `1.5px solid ${T.accent}55`, borderRadius: 8, color: T.text, background: T.white, fontFamily: "inherit", outline: "none", cursor: "pointer" }} />
    <button onClick={() => onChange({ from: hace30(), to: hoy() })}
      style={{ fontSize: 11, padding: "6px 10px", border: `1.5px solid ${T.accent}55`, borderRadius: 8, color: T.accent, background: T.white, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, whiteSpace: "nowrap" }}>Últimos 30d</button>
    <button onClick={() => onChange({ from: "", to: "" })}
      style={{ fontSize: 11, padding: "6px 10px", border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.sub, background: T.white, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Todo</button>
  </div>
);

// ─── Defaults ─────────────────────────────────────────────────────────────────
const GCFG = { costoCompra: 5000, costoEnvio: 8500, tasaConf: 75, tasaEnt: 75, cpaEstimado: 5000 };
const EPROD = { nombre: "", proveedor: "", idDropi: "", precioVenta: "", costoUnitario: "", costoEnvio: "", tasaConf: "", tasaEnt: "", cpaEstimado: "", pedidosDiarios: "1", pct2daUnidad: "10", linkLanding: "", linkRef1: "", linkRef2: "", angulo: "", validadores: "", linkAnuncio1: "", linkAnuncio2: "" };
const EENTRY = { fecha: "", productoId: "", gastoAds: "", diasCampana: "", cpm: "", cpc: "", ctr: "", ventasFacturadas: "", pedidosTotales: "", unidades: "", confirmados: "", entregados: "", devoluciones: "", plataforma: "Meta" };
const CHECKLIST = ["¿Tu producto soluciona un problema o necesidad importante?","¿Tiene un efecto \"wow\" en los primeros 5 segundos?","¿Validaste que es un producto exitoso (biblioteca de anuncios)?","¿Utilizaste videos verticales (9:16) o cuadrado (1:1)?","¿Sacaste videos de la librería de Meta?","¿Tus videos tienen un gancho que detenga el scroll?","¿Usaste videos con voz en off?","¿El producto en el video es el mismo que en la landing?","¿Tu primera imagen del carrusel muestra el producto en uso?","¿Usaste elementos visuales como GIFs (mínimo 3)?","¿Profundizaste más en beneficios que en características?","¿El ángulo de venta del video es congruente con la landing?","¿La oferta de tu landing es REALMENTE atractiva?"];

// ─── CALCULADORA ─────────────────────────────────────────────────────────────
function Calculadora({ cfg, setCfg, productos }) {
  const [sel, setSel] = useState("");
  const [prod, setProd] = useState({ ...EPROD });
  const [real, setReal] = useState({ totalPedidos: "", tcReal: "", teReal: "", costoEnvioReal: "", gastoAds: "" });
  const sp = (k, v) => setProd(p => ({ ...p, [k]: v }));
  const sr = (k, v) => setReal(r => ({ ...r, [k]: v }));

  useEffect(() => {
    if (!sel) { setProd({ ...EPROD }); return; }
    const p = productos.find(x => x.id === +sel || x.id === sel);
    if (p) setProd(p);
  }, [sel]);

  const c = calcCosteo(prod, cfg);
  const hasData = prod.precioVenta && prod.costoUnitario;
  const selProdObj = sel ? productos.find(x => x.id === +sel || x.id === sel) : prod;
  const hasReal = real.totalPedidos && (real.tcReal || real.teReal);
  const r3 = hasReal ? calcPedidosReales(real, cfg, selProdObj) : null;
  const divider = <div style={{ height: 1, background: T.border, margin: "8px 0" }} />;

  const RowB = ({ label, value, color, bold, highlight }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 7, background: highlight ? (color === T.green ? T.greenBg : color === T.red ? T.redBg : T.accentL) : T.bg, marginBottom: 3 }}>
      <span style={{ fontSize: 13, color: T.sub }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: bold ? 800 : 600, color: color || T.text }}>{value}</span>
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Card>
        <SectionTitle icon="⚙️" title="Parámetros Globales" sub="Valores por defecto — se aplican a todos los productos" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
          <Inp label="Costo Envío Promedio" value={cfg.costoEnvio} onChange={v => setCfg(c => ({ ...c, costoEnvio: +v }))} />
          <Inp label="CPA Estimado" value={cfg.cpaEstimado} onChange={v => setCfg(c => ({ ...c, cpaEstimado: +v }))} hint="Costo por compra esperado" />
          <InpPct label="% Órdenes Confirmadas" value={cfg.tasaConf} onChange={v => setCfg(c => ({ ...c, tasaConf: +v }))} />
          <InpPct label="% Órdenes Entregadas" value={cfg.tasaEnt} onChange={v => setCfg(c => ({ ...c, tasaEnt: +v }))} />
          <div style={{ background: T.accentL, borderRadius: 10, padding: "10px 14px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: "uppercase" }}>% Real Entregados</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: T.accent }}>{pct(cfg.tasaConf / 100 * cfg.tasaEnt / 100)}</div>
            <div style={{ fontSize: 11, color: T.sub }}>TC × TE</div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle icon="📦" title="Datos del Producto" sub="Ingresa o carga un producto de tu catálogo" />
        {productos.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <Label>Cargar desde Mis Productos</Label>
            <select value={sel} onChange={e => setSel(e.target.value)} style={{ width: "100%", background: T.inputBg, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none" }}>
              <option value="">— Ingresar manualmente —</option>
              {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <Inp label="Precio a colocar (CLP)" value={prod.precioVenta} onChange={v => sp("precioVenta", v)} />
          <Inp label="Costo Producto (CLP)" value={prod.costoUnitario} onChange={v => sp("costoUnitario", v)} />
          <Inp label="Costo Envío Promedio (CLP)" value={prod.costoEnvio} onChange={v => sp("costoEnvio", v)} placeholder={cfg.costoEnvio} hint="Vacío = usa global" />
          <Inp label="CPA Estimado (CLP)" value={prod.cpaEstimado} onChange={v => sp("cpaEstimado", v)} placeholder={cfg.cpaEstimado} hint="Vacío = usa global" />
          <InpPct label="Órdenes Confirmadas (%)" value={prod.tasaConf} onChange={v => sp("tasaConf", v)} placeholder={cfg.tasaConf} />
          <InpPct label="Órdenes Entregadas (%)" value={prod.tasaEnt} onChange={v => sp("tasaEnt", v)} placeholder={cfg.tasaEnt} />
          <Inp label="Pedidos Diarios" value={prod.pedidosDiarios} onChange={v => sp("pedidosDiarios", v)} placeholder="1" />
          <InpPct label="% con 2ª Unidad (50% OFF)" value={prod.pct2daUnidad} onChange={v => sp("pct2daUnidad", v)} placeholder="10" />
        </div>
      </Card>

      {hasData && (<>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <Card>
            <div style={{ fontWeight: 800, fontSize: 15, color: T.text, marginBottom: 14 }}>📊 Costeo Unitario</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              {[["Órd. Confirmadas", pct(c.tc)], ["Órd. Entregadas", pct(c.te)], ["Órd. Reales Entregadas", pct(c.realEnt)]].map(([l, v]) => (
                <div key={l} style={{ background: T.accentL, borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: T.sub, fontWeight: 700 }}>{l}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: T.accent }}>{v}</div>
                </div>
              ))}
            </div>
            <RowB label="Ingresos Reales" value={clp(c.ingReales)} color={T.green} />
            <RowB label="Costos Producto Reales" value={clp(c.costosProdReales)} color={T.red} />
            <RowB label="Costo Envío Total" value={clp(c.costoEnvTotal)} color={T.red} />
            <RowB label="Costo Anuncios (CPA)" value={clp(c.costoAnuncios)} color={T.red} />
            {divider}
            <RowB label="Utilidad Unitaria Real" value={clp(c.utilUnitReal)} color={c.utilUnitReal >= 0 ? T.green : T.red} bold highlight />
            <RowB label="Márgen Neto" value={pct(c.margenNeto)} color={c.margenNeto >= 0 ? T.green : T.red} bold />
            {divider}
            <RowB label={`Ganancia Diaria (${nz(prod.pedidosDiarios)||1} ped.)`} value={clp(c.gananciaDiaria)} color={c.gananciaDiaria >= 0 ? T.green : T.red} bold />
            <RowB label="Ganancia Mensual (×30)" value={clp(c.gananciaMensual)} color={c.gananciaMensual >= 0 ? T.green : T.red} bold highlight />
          </Card>

          <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
            <div style={{ background: T.accentL, border: `2px solid ${T.accent}`, borderRadius: 14, padding: "16px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: "0.07em" }}>Precio para Quedar Neto</div>
              <div style={{ fontSize: 30, fontWeight: 900, color: T.accent, letterSpacing: "-0.03em", marginTop: 4 }}>{clp(c.precioNeto)}</div>
              <div style={{ fontSize: 11, color: T.sub, marginTop: 3 }}>Precio mínimo para no perder dinero</div>
            </div>
            <div style={{ background: T.orangeBg, border: `1.5px solid #fed7aa`, borderRadius: 12, padding: "14px 18px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.07em" }}>CPA "Real" (por entrega real)</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: T.orange, marginTop: 4 }}>{clp(c.cpaRealUnit)}</div>
              <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>= CPA ÷ % Real Entregados ({pct(c.realEnt)})</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: c.cpaMax > 0 ? T.greenBg : T.redBg, borderRadius: 12, padding: "14px 16px", border: `1.5px solid ${c.cpaMax > 0 ? "#6ee7b7" : "#fca5a5"}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase" }}>Costo Compra Máx.</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: c.cpaMax > 0 ? T.green : T.red, marginTop: 4 }}>{clp(c.cpaMax)}</div>
                <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>Máximo aceptable en ads</div>
              </div>
              <div style={{ background: c.beroas ? T.accentL : T.bg, borderRadius: 12, padding: "14px 16px", border: `1.5px solid ${c.beroas ? T.accent : T.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase" }}>BEROAS</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: T.accent, marginTop: 4 }}>{x2(c.beroas)}</div>
                <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>Break Even ROAS</div>
              </div>
            </div>
          </div>
        </div>

        {nz(prod.pct2daUnidad) > 0 && c.ing2 !== null && (
          <Card style={{ border: `1.5px solid ${T.accent}55` }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: T.accent, marginBottom: 14 }}>🎁 Considerando {nz(prod.pct2daUnidad)}% de Segunda Unidad (50% OFF)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <RowB label="Ingresos Reales (con 2ª unidad)" value={clp(c.ing2)} color={T.green} />
                <RowB label="Costos Producto Reales" value={clp(c.costosProd2)} color={T.red} />
                <RowB label="Costo Envío Total" value={clp(c.costoEnv2)} color={T.red} />
                <RowB label="Costo Anuncios" value={clp(c.costoAnuncios)} color={T.red} />
                {divider}
                <RowB label="Utilidad" value={clp(c.util2)} color={c.util2 >= 0 ? T.green : T.red} bold highlight />
                <RowB label="Márgen Neto" value={pct(c.margen2)} color={c.margen2 >= 0 ? T.green : T.red} bold />
                {c.aumentoMargen !== null && <RowB label="Aumento de Margen vs sin 2ª unidad" value={`+${pct(c.aumentoMargen)}`} color={T.green} bold />}
              </div>
              <div>
                {divider}
                <RowB label={`Ganancia Diaria (${nz(prod.pedidosDiarios)||1} ped.)`} value={clp(c.gan2diaria)} color={c.gan2diaria >= 0 ? T.green : T.red} bold />
                <RowB label="Ganancia Mensual (×30)" value={clp(c.gan2mensual)} color={c.gan2mensual >= 0 ? T.green : T.red} bold highlight />
                {c.gan2mensual > c.gananciaMensual && (
                  <div style={{ marginTop: 10, background: T.greenBg, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: T.green, fontWeight: 700 }}>
                    ↑ La 2ª unidad sube la ganancia mensual en {clp(c.gan2mensual - c.gananciaMensual)}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        <Card style={{ border: `1.5px solid ${T.yellowBg}` }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: T.text, marginBottom: 4 }}>🛍️ Análisis Total con Pedidos Reales (Shopify)</div>
          <div style={{ fontSize: 13, color: T.sub, marginBottom: 16 }}>Ingresa los datos reales de tu campaña para ver la rentabilidad real</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 16 }}>
            <Inp label="Total Pedidos (Shopify)" value={real.totalPedidos} onChange={v => sr("totalPedidos", v)} placeholder="0" />
            <Inp label="Gasto en Anuncios (CLP)" value={real.gastoAds} onChange={v => sr("gastoAds", v)} placeholder="0" />
            <Inp label="Costo Envío Real (CLP)" value={real.costoEnvioReal} onChange={v => sr("costoEnvioReal", v)} placeholder={cfg.costoEnvio} hint="Vacío = usa global" />
            <InpPct label="Órdenes Confirmadas (%)" value={real.tcReal} onChange={v => sr("tcReal", v)} placeholder={nz(prod.tasaConf || cfg.tasaConf)} />
            <InpPct label="Órdenes Entregadas (%)" value={real.teReal} onChange={v => sr("teReal", v)} placeholder={nz(prod.tasaEnt || cfg.tasaEnt)} />
          </div>
          {r3 ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <RowB label="Órd. Reales Entregadas (%)" value={pct(r3.realEnt)} />
                <RowB label="CPA (costo por compra real)" value={clp(r3.cpaReal)} color={T.orange} />
                <RowB label="Ingresos Reales" value={clp(r3.ingReales)} color={T.green} />
                <RowB label="Costos Producto Reales" value={clp(r3.costosProd)} color={T.red} />
                <RowB label="Costo Envío Total" value={clp(r3.costoEnv)} color={T.red} />
                <RowB label="Costo Anuncios" value={clp(nz(real.gastoAds))} color={T.red} />
              </div>
              <div>
                {divider}
                <RowB label="Utilidad Real" value={clp(r3.utilReal)} color={r3.utilReal >= 0 ? T.green : T.red} bold highlight />
                <RowB label="Márgen Neto Real" value={pct(r3.margen)} color={r3.margen >= 0 ? T.green : T.red} bold />
                <div style={{ marginTop: 12 }}>
                  {r3.utilReal > 0
                    ? <div style={{ background: T.greenBg, borderRadius: 8, padding: "10px 14px", color: T.green, fontWeight: 700, fontSize: 14 }}>✅ Rentable — Considera escalar</div>
                    : r3.utilReal > -30000
                    ? <div style={{ background: T.yellowBg, borderRadius: 8, padding: "10px 14px", color: T.yellow, fontWeight: 700, fontSize: 14 }}>⚠️ Pérdida acotada — Ajusta antes de escalar</div>
                    : <div style={{ background: T.redBg, borderRadius: 8, padding: "10px 14px", color: T.red, fontWeight: 700, fontSize: 14 }}>🔴 En pérdida — Pausa y revisa producto/creativos</div>
                  }
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: T.bg, borderRadius: 8, padding: "14px 16px", fontSize: 13, color: T.sub, textAlign: "center" }}>
              Ingresa los datos reales de tu campaña para ver el análisis
            </div>
          )}
        </Card>

        <Card style={{ background: T.bg }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 10 }}>📐 Fórmulas del Costeo (fiel al Excel)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, color: T.sub, lineHeight: 1.8 }}>
            {[
              ["Órd. Reales Entregadas","TC × TE"],
              ["Ingresos Reales","Precio × (TC × TE)"],
              ["Costos Prod. Reales","Costo Unit. × (TC × TE)"],
              ["Costo Envío Total","Envío × TC  ← solo confirmados"],
              ["Utilidad Unitaria","Ing.Reales − CostoProd − CostoEnv − CPA"],
              ["Márgen Neto","Utilidad / Ingresos Reales"],
              ["Precio para quedar neto","(CostoProd×realEnt + Envío×TC + CPA) / realEnt"],
              ["CPA Real por entrega","CPA Estimado / (TC × TE)"],
              ["Costo Compra Máx.","realEnt×(Precio−Costo) − TC×Envío"],
              ["BEROAS","Precio / Costo Compra Máximo"],
            ].map(([l, v]) => (
              <div key={l}><strong style={{ color: T.text }}>{l}:</strong> {v}</div>
            ))}
          </div>
        </Card>
      </>)}
    </div>
  );
}

// ─── MIS PRODUCTOS ────────────────────────────────────────────────────────────
function MisProductos({ productos, setProductos, cfg }) {
  const [form, setForm] = useState({ ...EPROD });
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("basico");
  const s = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.nombre.trim()) return;
    if (editId) { setProductos(ps => ps.map(p => p.id === editId ? { ...form, id: editId } : p)); setEditId(null); }
    else setProductos(ps => [...ps, { ...form, id: Date.now() }]);
    setForm({ ...EPROD }); setShowForm(false); setActiveTab("basico");
  };

  const edit = (p) => { setForm(p); setEditId(p.id); setShowForm(true); setActiveTab("basico"); };
  const del = (id) => setProductos(ps => ps.filter(p => p.id !== id));
  const c = calcCosteo(form, cfg);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20, color: T.text }}>Mis Productos</div>
          <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>Catálogo completo con costeo, antecedentes y métricas por producto</div>
        </div>
        <Btn onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EPROD }); setActiveTab("basico"); }}>+ Nuevo Producto</Btn>
      </div>

      {showForm && (
        <Card style={{ border: `1.5px solid ${T.accent}` }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: T.text, marginBottom: 14 }}>{editId ? "✏️ Editar Producto" : "➕ Nuevo Producto"}</div>
          <TabBar tabs={[["basico","💰 Costeo"],["antecedentes","📋 Antecedentes"],["anuncios","📣 Anuncios"]]} active={activeTab} onChange={setActiveTab} />

          {activeTab === "basico" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                <InpText label="Nombre del producto *" value={form.nombre} onChange={v => s("nombre", v)} placeholder="Ej: Cepillo Alisador" />
                <InpText label="Proveedor" value={form.proveedor} onChange={v => s("proveedor", v)} placeholder="Importadora..." />
                <InpText label="ID Dropi" value={form.idDropi} onChange={v => s("idDropi", v)} placeholder="48988" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12 }}>
                <Inp label="Precio de Venta (CLP)" value={form.precioVenta} onChange={v => s("precioVenta", v)} />
                <Inp label="Costo Producto (CLP)" value={form.costoUnitario} onChange={v => s("costoUnitario", v)} />
                <Inp label="Costo Envío (CLP)" value={form.costoEnvio} onChange={v => s("costoEnvio", v)} placeholder={cfg.costoEnvio} />
                <Inp label="CPA Estimado (CLP)" value={form.cpaEstimado} onChange={v => s("cpaEstimado", v)} placeholder={cfg.cpaEstimado} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12 }}>
                <InpPct label="% Confirmación" value={form.tasaConf} onChange={v => s("tasaConf", v)} placeholder={cfg.tasaConf} />
                <InpPct label="% Entrega" value={form.tasaEnt} onChange={v => s("tasaEnt", v)} placeholder={cfg.tasaEnt} />
                <Inp label="Pedidos Diarios" value={form.pedidosDiarios} onChange={v => s("pedidosDiarios", v)} placeholder="1" />
                <InpPct label="% 2ª Unidad (50% OFF)" value={form.pct2daUnidad} onChange={v => s("pct2daUnidad", v)} placeholder="10" />
              </div>
              {form.precioVenta && form.costoUnitario && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, background: T.accentL, borderRadius: 10, padding: "12px 14px" }}>
                  {[["Precio Mínimo", clp(c.precioNeto), T.accent], ["BEROAS", x2(c.beroas), T.accent], ["CPA Máximo", clp(c.cpaMax), c.cpaMax > 0 ? T.green : T.red], ["Utilidad Unitaria", clp(c.utilUnitReal), c.utilUnitReal >= 0 ? T.green : T.red]].map(([l, v, col]) => (
                    <div key={l}><div style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: "uppercase" }}>{l}</div><div style={{ fontSize: 18, fontWeight: 900, color: col }}>{v}</div></div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "antecedentes" && (
            <div style={{ display: "grid", gap: 12 }}>
              <InpText label="Link de la Landing" value={form.linkLanding} onChange={v => s("linkLanding", v)} placeholder="https://..." />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <InpText label="Tienda de Referencia 1" value={form.linkRef1} onChange={v => s("linkRef1", v)} placeholder="https://..." />
                <InpText label="Tienda de Referencia 2" value={form.linkRef2} onChange={v => s("linkRef2", v)} placeholder="https://..." />
              </div>
              <div>
                <Label>Ángulo de Venta (Problema que soluciona)</Label>
                <textarea value={form.angulo} onChange={e => s("angulo", e.target.value)} placeholder="Ej: Ahorra tiempo al momento de arreglarte el cabello"
                  style={{ width: "100%", boxSizing: "border-box", background: T.inputBg, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none", minHeight: 70, resize: "vertical" }}
                  onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.border} />
              </div>
              <div>
                <Label>Validadores (¿Qué viste en la biblioteca de anuncios?)</Label>
                <textarea value={form.validadores} onChange={e => s("validadores", e.target.value)} placeholder="Ej: Una tienda en Argentina lo vende exclusivamente con +20 anuncios activos..."
                  style={{ width: "100%", boxSizing: "border-box", background: T.inputBg, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none", minHeight: 70, resize: "vertical" }}
                  onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.border} />
              </div>
            </div>
          )}

          {activeTab === "anuncios" && (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <InpText label="Link Anuncio 1" value={form.linkAnuncio1} onChange={v => s("linkAnuncio1", v)} placeholder="https://drive.google.com/..." />
                <InpText label="Link Anuncio 2" value={form.linkAnuncio2} onChange={v => s("linkAnuncio2", v)} placeholder="https://drive.google.com/..." />
              </div>
              <div style={{ background: T.bg, borderRadius: 10, padding: 14, fontSize: 12, color: T.sub }}>
                💡 Sube tus videos de anuncios a Google Drive y comparte el link aquí para tenerlos organizados por producto.
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
            <Btn onClick={save}>💾 Guardar Producto</Btn>
            <Btn variant="ghost" onClick={() => { setShowForm(false); setEditId(null); }}>Cancelar</Btn>
          </div>
        </Card>
      )}

      {productos.length === 0 && !showForm && (
        <Card style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
          <div style={{ color: T.sub }}>Aún no tienes productos. Crea el primero para comenzar.</div>
        </Card>
      )}

      {productos.length > 0 && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><TH>Producto</TH><TH>Proveedor</TH><TH>Precio</TH><TH>Costo</TH><TH>CPA Est.</TH><TH>TC/TE</TH><TH>Precio Mín.</TH><TH>BEROAS</TH><TH>Utilidad Unit.</TH><TH>Ganancia Mensual</TH><TH></TH></tr></thead>
              <tbody>
                {productos.map((p, i) => {
                  const c = calcCosteo(p, cfg);
                  return (
                    <tr key={p.id} style={{ background: i % 2 === 0 ? T.white : T.bg }}>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${T.border}` }}>
                        <div style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>{p.nombre}</div>
                        {p.linkLanding && <a href={p.linkLanding} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: T.accent }}>🔗 Landing</a>}
                      </td>
                      <TD>{p.proveedor || "—"}</TD>
                      <TD>{clp(nz(p.precioVenta))}</TD>
                      <TD>{clp(nz(p.costoUnitario))}</TD>
                      <TD>{clp(nz(p.cpaEstimado || cfg.cpaEstimado))}</TD>
                      <TD>{nz(p.tasaConf || cfg.tasaConf)}% / {nz(p.tasaEnt || cfg.tasaEnt)}%</TD>
                      <TD color={T.accent}>{clp(c.precioNeto)}</TD>
                      <TD color={T.accent} bold>{x2(c.beroas)}</TD>
                      <TD color={c.utilUnitReal >= 0 ? T.green : T.red} bold>{clp(c.utilUnitReal)}</TD>
                      <TD color={c.gananciaMensual >= 0 ? T.green : T.red} bold>{clp(c.gananciaMensual)}</TD>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${T.border}` }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <Btn small variant="ghost" onClick={() => edit(p)}>✏️</Btn>
                          <Btn small variant="danger" onClick={() => del(p.id)}>🗑️</Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── REGISTRO DIARIO (Drofit-style) ──────────────────────────────────────────
function Registro({ entries, setEntries, productos, cfg, dateRange }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ fecha: today, productoId: "", pedidosCaptados: "", unidadesVendidas: "", ingresosTotales: "", gastoAds: "" });
  const [editId, setEditId] = useState(null);
  const s = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const selProd = productos.find(p => String(p.id) === String(form.productoId));

  // Fórmula Drofit: ingReales = ventasFacturadas × TC × TE
  const pedidos       = nz(form.pedidosCaptados);
  const gastoAds      = nz(form.gastoAds);
  const ventasTot     = nz(form.ingresosTotales);
  const tc            = nz(selProd?.tasaConf || cfg.tasaConf) / 100;
  const te            = nz(selProd?.tasaEnt  || cfg.tasaEnt)  / 100;
  const entFloat      = pedidos * tc * te;                       // float para CPA
  const confFloat     = pedidos * tc;
  const confirmados   = Math.round(confFloat);
  const entregados    = Math.round(entFloat);
  const ingReales     = ventasTot * tc * te;                     // Drofit: ingresos_tot × TC × TE
  const costosProd    = nz(selProd?.costoUnitario) * entFloat;
  const costosEnv     = nz(selProd?.costoEnvio || cfg.costoEnvio) * confFloat;
  const costosTot     = costosProd + costosEnv;                  // sin ads (Drofit)
  const utilidad      = ingReales - costosTot - gastoAds;
  const cpaReal       = entFloat > 0 ? gastoAds / entFloat : null;
  const rent          = ingReales > 0 ? utilidad / ingReales : null;

  const save = () => {
    if (!form.fecha || !form.productoId) return;
    const entry = {
      id: editId || Date.now(),
      fecha: form.fecha,
      productoId: form.productoId,
      pedidosTotales: nz(form.pedidosCaptados),
      unidades: nz(form.unidadesVendidas),
      ventasFacturadas: nz(form.ingresosTotales),
      gastoAds: nz(form.gastoAds),
      confirmados,
      entregados,
      plataforma: "Meta",
    };
    if (editId) setEntries(e => e.map(x => x.id === editId ? entry : x));
    else setEntries(e => [...e, entry]);
    setForm({ fecha: today, productoId: "", pedidosCaptados: "", unidadesVendidas: "", ingresosTotales: "", gastoAds: "" });
    setEditId(null);
  };

  const canSave = form.fecha && form.productoId;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 19, color: T.text }}>{editId ? "✏️ Editar Registro" : "➕ Ingresar Datos del Día"}</div>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 3 }}>Registra tus ventas y métricas diarias</div>
          </div>
          <Btn onClick={save} variant={canSave ? "primary" : "ghost"}>💾 Guardar Datos</Btn>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 14, marginBottom: 18 }}>
          <div>
            <Label>📅 Fecha de los datos</Label>
            <input type="date" value={form.fecha} onChange={e => s("fecha", e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", background: T.inputBg, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
          </div>
          <div>
            <Label>📦 Producto</Label>
            <select value={form.productoId} onChange={e => s("productoId", e.target.value)}
              style={{ width: "100%", background: T.inputBg, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none" }}>
              <option value="">— Selecciona un producto —</option>
              {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
        </div>
        {selProd && (
          <div style={{ background: T.accentL, borderRadius: 10, padding: "10px 16px", marginBottom: 18, display: "flex", gap: 24, flexWrap: "wrap", fontSize: 12 }}>
            <span><strong style={{ color: T.accent }}>Precio:</strong> {clp(selProd.precioVenta)}</span>
            <span><strong style={{ color: T.accent }}>Costo:</strong> {clp(selProd.costoUnitario)}</span>
            <span><strong style={{ color: T.accent }}>Envío:</strong> {clp(selProd.costoEnvio || cfg.costoEnvio)}</span>
            <span><strong style={{ color: T.accent }}>% Confirmación:</strong> {selProd.tasaConf || cfg.tasaConf}%</span>
            <span><strong style={{ color: T.accent }}>% Entrega:</strong> {selProd.tasaEnt || cfg.tasaEnt}%</span>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <Inp label="Pedidos Captados" value={form.pedidosCaptados} onChange={v => s("pedidosCaptados", v)} placeholder="0" prefix="" />
          <Inp label="Unidades Vendidas" value={form.unidadesVendidas} onChange={v => s("unidadesVendidas", v)} placeholder="0" prefix="" />
          <Inp label="Ingresos Totales (CLP)" value={form.ingresosTotales} onChange={v => s("ingresosTotales", v)} placeholder="0" />
          <Inp label="Gasto en Ads (CLP)" value={form.gastoAds} onChange={v => s("gastoAds", v)} placeholder="0" />
        </div>
      </Card>

      {selProd && (pedidos > 0 || unidades > 0 || ingReales > 0) && (
        <Card style={{ background: T.bg }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 14 }}>📊 Resumen calculado</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            {[
              ["Pedidos Captados",   pedidos,         null,                       "#ede9ff"],
              ["Confirmados (est.)",  confirmados,     null,                       T.yellowBg],
              ["Entregados (est.)",   entregados,      T.green,                    T.greenBg],
              ["Ingresos Totales",    clp(ventasTot),  null,                       T.bg],
              ["Ingresos Reales",     clp(ingReales),  T.green,                    T.greenBg],
              ["Costos Totales",      clp(costosTot),  T.red,                      T.redBg],
              ["Gasto en Anuncios",   clp(gastoAds),   T.red,                      T.redBg],
              ["Utilidad Total",      clp(utilidad),   utilidad>=0?T.green:T.red,  utilidad>=0?T.greenBg:T.redBg],
              ["CPA Real",            clp(cpaReal),    null,                       T.yellowBg],
            ].map(([l, v, c, bg]) => (
              <div key={l} style={{ background: bg||T.white, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: c||T.text }}>{v}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {entries.length > 0 && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", fontWeight: 700, fontSize: 15, color: T.text, borderBottom: `1px solid ${T.border}` }}>
            📋 Historial de Registros ({entries.length})
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <TH>Fecha</TH><TH>Producto</TH><TH>Pedidos</TH><TH>Confirmados</TH><TH>Entregados</TH>
                <TH>Ingresos Reales</TH><TH>Gasto Ads</TH><TH>Costos Tot.</TH><TH>Utilidad</TH><TH>Rent.%</TH><TH>CPA Real</TH><TH></TH>
              </tr></thead>
              <tbody>
                {[...entries].reverse().map((e, ri) => {
                  const prod = productos.find(p => String(p.id) === String(e.productoId));
                  const _tc   = nz(prod?.tasaConf || cfg.tasaConf) / 100;
                  const _te   = nz(prod?.tasaEnt  || cfg.tasaEnt)  / 100;
                  const _ped  = nz(e.pedidosTotales);
                  const _entF = _ped * _tc * _te;
                  const _cfF  = _ped * _tc;
                  const _ent  = Math.round(_entF);
                  const _conf = Math.round(_cfF);
                  const _vtot = nz(e.ventasFacturadas);
                  const _ing  = _vtot * _tc * _te;
                  const _cp   = nz(prod?.costoUnitario) * _entF;
                  const _env  = nz(prod?.costoEnvio || cfg.costoEnvio) * _cfF;
                  const _ads  = nz(e.gastoAds);
                  const _cos  = _cp + _env;
                  const _util = _ing - _cos - _ads;
                  const _rent = _ing > 0 ? _util / _ing : null;
                  const _cpa  = _entF > 0 ? _ads / _entF : null;
                  return (
                    <tr key={e.id || ri} style={{ background: ri % 2 === 0 ? T.white : T.bg }}>
                      <TD>{e.fecha}</TD>
                      <TD bold>{prod?.nombre || "—"}</TD>
                      <TD>{nz(e.pedidosTotales)}</TD>
                      <TD>{_conf}</TD>
                      <TD color={T.green}>{_ent}</TD>
                      <TD color={T.green} bold>{clp(_ing)}</TD>
                      <TD color={T.red}>{clp(_ads)}</TD>
                      <TD color={T.red}>{clp(_cos)}</TD>
                      <TD color={_util>=0?T.green:T.red} bold>{clp(_util)}</TD>
                      <TD color={_rent>=0?T.green:T.red}>{pct(_rent)}</TD>
                      <TD>{clp(_cpa)}</TD>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${T.border}` }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <Btn small variant="ghost" onClick={() => {
                            setForm({ fecha: e.fecha, productoId: String(e.productoId), pedidosCaptados: e.pedidosTotales||"", unidadesVendidas: e.unidades||"", ingresosTotales: e.ventasFacturadas||"", gastoAds: e.gastoAds||"" });
                            setEditId(e.id);
                          }}>✏️</Btn>
                          <Btn small variant="danger" onClick={() => setEntries(prev => prev.filter(x => x.id !== e.id))}>🗑️</Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── DASHBOARD (Drofit-style) ─────────────────────────────────────────────────
function Dashboard({ entries, productos, cfg, dateRange }) {
  const filtered = useMemo(() => {
    let base = entries;
    if (dateRange?.from || dateRange?.to)
      base = entries.filter(e => (!dateRange.from || e.fecha >= dateRange.from) && (!dateRange.to || e.fecha <= dateRange.to));
    return base;
  }, [entries, dateRange]);

  const [prodFil, setProdFil] = useState("todos");
  const [chartTab, setChartTab] = useState("agregada");

  const data = useMemo(() => {
    const base = prodFil === "todos" ? filtered : filtered.filter(e => String(e.productoId) === String(prodFil));
    return base.map(e => {
      const prod = productos.find(p => String(p.id) === String(e.productoId));
      const _tc      = nz(prod?.tasaConf || cfg.tasaConf) / 100;
      const _te      = nz(prod?.tasaEnt  || cfg.tasaEnt)  / 100;
      const _ped     = nz(e.pedidosTotales);
      const _entF    = _ped * _tc * _te;                        // float (Drofit)
      const _confF   = _ped * _tc;
      const _ent     = Math.round(_entF);
      const _conf    = Math.round(_confF);
      const _vtot    = nz(e.ventasFacturadas);
      const _ing     = _vtot * _tc * _te;                       // Drofit: vtot × TC × TE
      const _cp      = nz(prod?.costoUnitario) * _entF;
      const _env     = nz(prod?.costoEnvio || cfg.costoEnvio) * _confF;
      const _ads     = nz(e.gastoAds);
      const _cos     = _cp + _env;                              // sin ads
      const _util    = _ing - _cos - _ads;
      return { ...e, prodNombre: prod?.nombre || "Sin nombre", conf: _conf, ent: _ent, entF: _entF, ingTot: _vtot, ingReales: _ing, costosTot: _cos, utilidad: _util, ads: _ads };
    });
  }, [filtered, prodFil, productos, cfg]);

  const tot = useMemo(() => {
    const t = { pedidos: 0, conf: 0, ent: 0, entF: 0, ingTot: 0, ingReales: 0, costos: 0, ads: 0 };
    data.forEach(e => {
      t.pedidos   += nz(e.pedidosTotales);
      t.conf      += e.conf;
      t.ent       += e.ent;
      t.entF      += (e.entF || 0);
      t.ingTot    += nz(e.ventasFacturadas);
      t.ingReales += e.ingReales;
      t.costos    += e.costosTot;
      t.ads       += e.ads;
    });
    t.util  = t.ingReales - t.costos - t.ads;
    t.rent  = t.ingReales > 0 ? t.util / t.ingReales : null;
    t.cpa   = t.entF > 0 ? t.ads / t.entF : null;
    t.roas  = t.ads > 0 ? t.ingReales / t.ads : null;
    return t;
  }, [data]);

  const chartData = useMemo(() => {
    const bd = {};
    data.forEach(e => {
      if (!e.fecha) return;
      if (!bd[e.fecha]) bd[e.fecha] = { fecha: e.fecha, pedidos: 0, entregados: 0, ingReales: 0, util: 0, ads: 0, rent: 0, _cnt: 0 };
      bd[e.fecha].pedidos    += nz(e.pedidosTotales);
      bd[e.fecha].entregados += e.ent;
      bd[e.fecha].ingReales  += e.ingReales;
      bd[e.fecha].util       += e.utilidad;
      bd[e.fecha].ads        += e.ads;
      bd[e.fecha]._cnt       += 1;
    });
    return Object.values(bd).sort((a, b) => a.fecha.localeCompare(b.fecha)).map(d => ({
      ...d,
      rent: d.ingReales > 0 ? ((d.ingReales - d.util - d.ingReales + d.util + d.ingReales) > 0 ? d.util / d.ingReales * 100 : 0) : 0,
      rentPct: d.ingReales > 0 ? d.util / d.ingReales * 100 : 0,
    }));
  }, [data]);

  const byProd = useMemo(() => {
    const mp = {};
    data.forEach(e => {
      if (!mp[e.productoId]) mp[e.productoId] = { nombre: e.prodNombre, ped: 0, ent: 0, ing: 0, util: 0, ads: 0 };
      mp[e.productoId].ped  += nz(e.pedidosTotales);
      mp[e.productoId].ent  += e.ent;
      mp[e.productoId].ing  += e.ingReales;
      mp[e.productoId].util += e.utilidad;
      mp[e.productoId].ads  += e.ads;
    });
    return Object.values(mp).sort((a, b) => b.util - a.util);
  }, [data]);

  if (entries.length === 0) return (
    <Card style={{ textAlign: "center", padding: 60 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
      <div style={{ fontWeight: 700, color: T.text, marginBottom: 8 }}>Aún no hay registros</div>
      <div style={{ color: T.sub }}>Ve a "Registro Diario" e ingresa tus datos del día.</div>
    </Card>
  );

  const kpis = [
    ["📦", "Pedidos Totales",   tot.pedidos,           null,                       "#ede9ff"],
    ["✅", "Pedidos Entregados", tot.ent,               T.green,                    T.greenBg],
    ["💰", "Ingresos Totales",  clp(tot.ingTot),       null,                       T.bg],
    ["💵", "Ingresos Reales",   clp(tot.ingReales),    T.green,                    T.greenBg],
    ["💸", "Costos Totales",    clp(tot.costos),       T.red,                      T.redBg],
    ["📣", "Gasto en Anuncios", clp(tot.ads),          T.red,                      T.redBg],
    ["📈", "Utilidad Total",    clp(tot.util),         tot.util>=0?T.green:T.red,  tot.util>=0?T.greenBg:T.redBg],
    ["🎯", "CPA Real",          clp(tot.cpa),          null,                       T.yellowBg],
    ["📊", "Rentabilidad %",    pct(tot.rent),         tot.rent>=0?T.green:T.red,  tot.rent>=0?T.greenBg:T.redBg],
  ];

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Filtro por producto */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[{ id: "todos", nombre: "Todos los productos" }, ...productos].map(p => (
          <button key={p.id} onClick={() => setProdFil(String(p.id))}
            style={{ padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${prodFil === String(p.id) ? T.accent : T.border}`, background: prodFil === String(p.id) ? T.accentL : T.white, color: prodFil === String(p.id) ? T.accent : T.sub, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            {p.nombre}
          </button>
        ))}
      </div>

      {/* KPIs estilo Drofit - 3 columnas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {kpis.map(([icon, label, value, color, bg]) => (
          <div key={label} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px", boxShadow: T.shadow, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{icon}</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: color || T.text, letterSpacing: "-0.02em" }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos estilo Drofit */}
      {chartData.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {[
              ["Evolución de Pedidos Totales", "pedidos", T.accent, false],
              ["Evolución de Ingresos Reales", "ingReales", T.green, false],
              ["Evolución de Utilidad Neta",   "util",      T.accent, false],
              ["Rentabilidad % Diaria",        "rentPct",   T.green, true],
            ].map(([title, key, color, isPct]) => (
              <Card key={key}>
                <div style={{ fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 12 }}>{title}</div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData}>
                    <defs><linearGradient id={`g${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.18}/>
                      <stop offset="95%" stopColor={color} stopOpacity={0}/>
                    </linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                    <XAxis dataKey="fecha" tick={{ fill: T.sub, fontSize: 10 }} />
                    <YAxis tick={{ fill: T.sub, fontSize: 10 }} tickFormatter={v => isPct ? `${v.toFixed(0)}%` : key==="pedidos"||key==="entregados" ? v : `$${(v/1000).toFixed(0)}K`} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 12 }} formatter={v => isPct ? `${v.toFixed(1)}%` : key==="pedidos"||key==="entregados" ? v : clp(v)} />
                    <Area type="monotone" dataKey={key} stroke={color} fill={`url(#g${key})`} strokeWidth={2.5} dot={{ r: 4, fill: color }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            ))}
          </div>

          {/* Ads vs Ingresos */}
          <Card>
            <div style={{ fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 12 }}>Ads vs Ingresos Reales por Día</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="fecha" tick={{ fill: T.sub, fontSize: 10 }} />
                <YAxis tick={{ fill: T.sub, fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 12 }} formatter={v => clp(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="ads"      fill={T.red}   name="Gasto Ads"       radius={[4,4,0,0]} opacity={0.85} />
                <Bar dataKey="ingReales" fill={T.green} name="Ingresos Reales" radius={[4,4,0,0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {/* Resumen por producto */}
      {byProd.length > 1 && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", fontWeight: 700, fontSize: 14, color: T.text, borderBottom: `1px solid ${T.border}` }}>Resumen Por Producto</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><TH>Producto</TH><TH>Pedidos</TH><TH>Entregados</TH><TH>Ingresos Reales</TH><TH>Gasto Ads</TH><TH>Costos Tot.</TH><TH>Utilidad</TH><TH>Rentabilidad</TH><TH>CPA Real</TH></tr></thead>
            <tbody>
              {byProd.map((p, i) => {
                const _cos = p.ing + p.ads - p.util;
                const _rent = p.ing > 0 ? p.util / p.ing : null;
                const _cpa = p.ent > 0 ? p.ads / p.ent : null;
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? T.white : T.bg }}>
                    <TD bold>{p.nombre}</TD>
                    <TD>{p.ped}</TD>
                    <TD color={T.green}>{p.ent}</TD>
                    <TD color={T.green} bold>{clp(p.ing)}</TD>
                    <TD color={T.red}>{clp(p.ads)}</TD>
                    <TD color={T.red}>{clp(_cos)}</TD>
                    <TD color={p.util>=0?T.green:T.red} bold>{clp(p.util)}</TD>
                    <TD color={_rent>=0?T.green:T.red}>{pct(_rent)}</TD>
                    <TD>{clp(_cpa)}</TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ─── SIMULACIONES ─────────────────────────────────────────────────────────────
function Simulaciones({ cfg, productos }) {
  const [modo, setModo] = useState("tasas"); // "tasas" | "cpa"
  const [tooltip, setTooltip] = useState(null);
  const [params, setParams] = useState({
    acido:    { envio: nz(cfg.costoEnvio), tc: Math.max(nz(cfg.tasaConf) - 20, 30), te: Math.max(nz(cfg.tasaEnt) - 20, 30) },
    base:     { envio: nz(cfg.costoEnvio), tc: nz(cfg.tasaConf), te: nz(cfg.tasaEnt) },
    optimista:{ envio: Math.max(nz(cfg.costoEnvio) - 1500, 3000), tc: Math.min(nz(cfg.tasaConf) + 15, 95), te: Math.min(nz(cfg.tasaEnt) + 15, 95) },
  });
  // Modo CPA: simulador de CPA real por producto
  const [cpaInputs, setCpaInputs] = useState({});
  const sp = (sc, k, v) => setParams(p => ({ ...p, [sc]: { ...p[sc], [k]: +v } }));
  const scMeta = {
    acido:    { label: "😰 Caso Ácido",    color: T.red,    bg: T.redBg,   desc: "Peor escenario realista" },
    base:     { label: "📊 Caso Base",     color: T.accent, bg: T.accentL, desc: "Parámetros actuales" },
    optimista:{ label: "🚀 Caso Optimista",color: T.green,  bg: T.greenBg, desc: "Escalando con mejoras" },
  };

  if (productos.length === 0) return <Card style={{ textAlign: "center", padding: 48 }}><div style={{ fontSize: 36 }}>🔮</div><div style={{ color: T.sub, marginTop: 12 }}>Primero agrega productos en "Mis Productos".</div></Card>;

  const calcSim = (prod, sc) => {
    const p = params[sc];
    const pv = nz(prod.precioVenta), cu = nz(prod.costoUnitario);
    const cpa = nz(prod.cpaEstimado || cfg.cpaEstimado);
    const env = nz(p.envio), tc = p.tc / 100, te = p.te / 100;
    const realEnt = tc * te;
    const ingR = pv * realEnt, costoR = cu * realEnt + env * tc;
    const cpaMax = ingR - costoR;
    const util = ingR - costoR - cpa;
    const beroas = cpaMax > 0 ? pv / cpaMax : null;
    return { ingR, costoR, cpaMax, beroas, util, margen: ingR > 0 ? util / ingR : null };
  };

  const calcCpaSim = (prod, cpaReal) => {
    const pv = nz(prod.precioVenta), cu = nz(prod.costoUnitario);
    const tc = nz(prod.tasaConf || cfg.tasaConf) / 100;
    const te = nz(prod.tasaEnt  || cfg.tasaEnt)  / 100;
    const env = nz(prod.costoEnvio || cfg.costoEnvio);
    const realEnt = tc * te;
    const ingR   = pv * realEnt;
    const costoR = cu * realEnt + env * tc;
    const cpaMax = ingR - costoR;
    const util   = ingR - costoR - cpaReal;
    const margen = ingR > 0 ? util / ingR : null;
    return { ingR, costoR, cpaMax, util, margen, gana: cpaReal <= cpaMax };
  };

  const MODOS = [
    { id: "tasas", icon: "📊", label: "Por Tasas de Entrega",
      tooltip: ["Simula qué pasa si tus tasas de confirmación/entrega suben o bajan.", "😰 Ácido = pocas personas confirman y reciben (tasas bajas)", "📊 Base = tus tasas normales actuales", "🚀 Optimista = todo sale perfecto (tasas altas)", "Úsalo para: evaluar si el producto es viable antes de lanzarlo."] },
    { id: "cpa",   icon: "🎯", label: "Por CPA Real de Ads",
      tooltip: ["Ingresa cuánto te costó cada venta (CPA Real) y te dice si ganaste o perdiste.", "😰 Ácido = el anuncio anda mal, CPA alto", "📊 Base = rendimiento normal", "🚀 Optimista = el anuncio anda excelente, CPA bajo", "Úsalo para: analizar si una campaña activa es rentable."] },
  ];

  return (
    <div style={{ display: "grid", gap: 20 }}>

      {/* Switch de modo */}
      <Card style={{ padding: "16px 20px" }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 12 }}>¿Qué quieres simular?</div>
        <div style={{ display: "flex", gap: 10 }}>
          {MODOS.map(m => (
            <div key={m.id} style={{ position: "relative" }}>
              <button onClick={() => setModo(m.id)}
                style={{ padding: "10px 18px", borderRadius: 10, border: `2px solid ${modo === m.id ? T.accent : T.border}`, background: modo === m.id ? T.accentL : T.white, color: modo === m.id ? T.accent : T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
                <span>{m.icon}</span> {m.label}
                <span onMouseEnter={() => setTooltip(m.id)} onMouseLeave={() => setTooltip(null)}
                  style={{ marginLeft: 4, width: 16, height: 16, borderRadius: "50%", background: T.border, color: T.sub, fontSize: 10, fontWeight: 900, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "help" }}>?</span>
              </button>
              {tooltip === m.id && (
                <div style={{ position: "absolute", top: "110%", left: 0, zIndex: 100, background: T.text, color: "#fff", borderRadius: 10, padding: "12px 16px", fontSize: 12, lineHeight: 1.6, width: 280, whiteSpace: "pre-line", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
                  {Array.isArray(m.tooltip) ? m.tooltip.map((line, i) => <div key={i} style={{ marginBottom: i < m.tooltip.length-1 ? 6 : 0 }}>{line}</div>) : m.tooltip}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* ── MODO TASAS ── */}
      {modo === "tasas" && (<>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {["acido","base","optimista"].map(sc => {
            const m = scMeta[sc]; const p = params[sc];
            return (
              <Card key={sc} style={{ border: `1.5px solid ${m.color}40` }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: m.color, marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 12, color: T.sub, marginBottom: 14 }}>{m.desc}</div>
                <div style={{ display: "grid", gap: 10 }}>
                  <Inp label="Costo de Envío (CLP)" value={p.envio} onChange={v => sp(sc, "envio", v)} />
                  <InpPct label="% Confirmación" value={p.tc} onChange={v => sp(sc, "tc", v)} />
                  <InpPct label="% Entrega" value={p.te} onChange={v => sp(sc, "te", v)} />
                </div>
              </Card>
            );
          })}
        </div>
        {productos.map(prod => (
          <Card key={prod.id}>
            <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 14 }}>
              📦 {prod.nombre} <span style={{ fontSize: 12, color: T.sub, fontWeight: 400 }}>— {clp(nz(prod.precioVenta))} · Costo {clp(nz(prod.costoUnitario))}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {["acido","base","optimista"].map(sc => {
                const m = scMeta[sc]; const r = calcSim(prod, sc);
                return (
                  <div key={sc} style={{ background: m.bg, borderRadius: 10, padding: 14, border: `1px solid ${m.color}30` }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: m.color, marginBottom: 10 }}>{m.label}</div>
                    {[["Ingreso Real/pedido", clp(r.ingR)], ["Costo Real/pedido", clp(r.costoR)], ["CPA Máximo", clp(r.cpaMax), r.cpaMax > 0 ? T.green : T.red], ["Utilidad Unit.", clp(r.util), r.util >= 0 ? T.green : T.red], ["Márgen", pct(r.margen), r.margen >= 0 ? T.green : T.red], ["BEROAS", x2(r.beroas), m.color]].map(([l, v, c]) => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                        <span style={{ color: T.sub }}>{l}</span>
                        <strong style={{ color: c || T.text }}>{v}</strong>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </>)}

      {/* ── MODO CPA ── */}
      {modo === "cpa" && (<>
        <div style={{ background: T.accentL, borderRadius: 12, padding: "14px 18px", fontSize: 13, color: T.accent, fontWeight: 600, border: `1.5px solid ${T.accent}30` }}>
          💡 Ingresa el CPA Real de tu campaña (cuánto pagaste por cada venta) y te digo si estás ganando o perdiendo plata con ese producto.
        </div>
        {productos.map(prod => {
          const cpaReal = nz(cpaInputs[prod.id]);
          const r = cpaReal > 0 ? calcCpaSim(prod, cpaReal) : null;
          const scenarioLabel = r ? (cpaReal <= calcCpaSim(prod, 0).cpaMax * 0.5 ? "🚀 Excelente — puedes escalar" : cpaReal <= calcCpaSim(prod, 0).cpaMax ? "✅ Rentable — sigue adelante" : "❌ Pérdida — revisa el anuncio") : null;
          const scenarioColor = r ? (r.gana ? (cpaReal <= calcCpaSim(prod, 0).cpaMax * 0.5 ? T.green : T.accent) : T.red) : T.sub;
          return (
            <Card key={prod.id}>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 4 }}>
                📦 {prod.nombre}
              </div>
              <div style={{ fontSize: 12, color: T.sub, marginBottom: 16 }}>{clp(nz(prod.precioVenta))} · Costo {clp(nz(prod.costoUnitario))} · CPA Máximo: <strong style={{ color: T.accent }}>{clp(calcCpaSim(prod, 0).cpaMax)}</strong></div>

              <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, alignItems: "start" }}>
                <div>
                  <Label>🎯 Tu CPA Real de esta campaña</Label>
                  <input type="number" placeholder="Ej: 5000" value={cpaInputs[prod.id] || ""}
                    onChange={e => setCpaInputs(p => ({ ...p, [prod.id]: e.target.value }))}
                    style={{ width: "100%", boxSizing: "border-box", background: T.inputBg, border: `2px solid ${r ? (r.gana ? T.green : T.red) : T.border}`, borderRadius: 8, padding: "10px 14px", color: T.text, fontSize: 16, fontFamily: "inherit", outline: "none", fontWeight: 700 }} />
                  {r && <div style={{ marginTop: 8, fontWeight: 800, fontSize: 14, color: scenarioColor }}>{scenarioLabel}</div>}
                </div>

                {r && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                    {[
                      ["Ingreso Real", clp(r.ingR), T.green, T.greenBg],
                      ["Costos", clp(r.costoR), T.red, T.redBg],
                      ["Utilidad", clp(r.util), r.util >= 0 ? T.green : T.red, r.util >= 0 ? T.greenBg : T.redBg],
                      ["Rentabilidad", pct(r.margen), r.margen >= 0 ? T.green : T.red, r.margen >= 0 ? T.greenBg : T.redBg],
                    ].map(([l, v, c, bg]) => (
                      <div key={l} style={{ background: bg, borderRadius: 10, padding: "10px 14px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.sub, textTransform: "uppercase", marginBottom: 4 }}>{l}</div>
                        <div style={{ fontSize: 17, fontWeight: 900, color: c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </>)}
    </div>
  );
}

// ─── IMPORTAR DATOS ───────────────────────────────────────────────────────────
const CONF_ST = new Set(["GUIA_GENERADA","EN TRÁNSITO","INGRESO CAMION","EN ESPERA EN OFICINA","EN REPARTO","NOVEDAD","ENTREGADO"]);
const ENT_ST  = new Set(["ENTREGADO"]);
const DEV_ST  = new Set(["DEVOLUCION A REMITENTE"]);

function Importar({ productos, setEntries }) {
  const [dropiData, setDropiData]     = useState(null);
  const [shopifyData, setShopifyData] = useState(null);
  const [preview, setPreview]         = useState([]);
  const [importing, setImporting]     = useState(false);
  const [done, setDone]               = useState(false);
  const [fecha, setFecha]             = useState(new Date().toISOString().slice(0,10));
  const [gastoAds, setGastoAds]       = useState("");

  const handleDropi = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const XLSX = window.XLSX;
        const wb = XLSX.read(ev.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const ordenes = {};
        rows.forEach(r => {
          const orderId = String(r["NUMERO DE PEDIDO DE TIENDA"] || r["ID"] || "").trim();
          const prod    = (r["PRODUCTO"] || "").trim();
          const status  = (r["ESTATUS"]  || "").trim();
          if (!orderId || !prod) return;
          if (!ordenes[orderId]) ordenes[orderId] = [];
          ordenes[orderId].push({ prod, status, precio: parseFloat(r["TOTAL DE LA ORDEN"] || 0), flete: parseFloat(r["PRECIO FLETE"] || 0), costo: parseFloat(r["PRECIO PROVEEDOR"] || 0) });
        });
        const byPrincipal = {};
        Object.values(ordenes).forEach(items => {
          items.sort((a,b) => b.precio - a.precio);
          const principal = items[0];
          const upsells   = items.slice(1);
          const key = principal.prod;
          if (!byPrincipal[key]) byPrincipal[key] = { total:0, confirmados:0, entregados:0, devoluciones:0, flete:0, costoPrincipal:0, ingresosPrincipal:0, upsells:{} };
          const d = byPrincipal[key];
          d.total++; d.flete += principal.flete; d.costoPrincipal += principal.costo; d.ingresosPrincipal += principal.precio;
          if (CONF_ST.has(principal.status)) d.confirmados++;
          if (ENT_ST.has(principal.status))  d.entregados++;
          if (DEV_ST.has(principal.status))  d.devoluciones++;
          upsells.forEach(u => {
            if (!d.upsells[u.prod]) d.upsells[u.prod] = { ingresos:0, costo:0, count:0 };
            d.upsells[u.prod].ingresos += u.precio; d.upsells[u.prod].costo += u.costo; d.upsells[u.prod].count++;
          });
        });
        setDropiData(byPrincipal);
      } catch(err) { alert("Error leyendo el archivo Dropi."); console.error(err); }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleShopify = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const lines = ev.target.result.split("\n").filter(l => l.trim());
        const hdrs  = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g,""));
        const byProd = {};
        lines.slice(1).forEach(line => {
          const cols = []; let cur = "", inQ = false;
          for (const ch of line) {
            if (ch === '"') { inQ = !inQ; } else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ""; } else cur += ch;
          }
          cols.push(cur.trim());
          const r = {}; hdrs.forEach((h,i) => r[h] = cols[i] || "");
          const prod = (r["Título del producto"] || "").trim().toUpperCase();
          if (!prod) return;
          byProd[prod] = { pedidos: parseInt(r["Pedidos"] || 0), unidades: parseInt(r["Artículos netos vendidos"] || 0), ventasNetas: parseInt((r["Ventas netas"] || "0").replace(/[^0-9-]/g,"")) };
        });
        setShopifyData(byProd);
      } catch(err) { alert("Error leyendo el CSV de Shopify."); }
    };
    reader.readAsText(file, "utf-8");
  };

  useEffect(() => {
    if (!dropiData) return;
    const rows = [];
    Object.entries(dropiData).forEach(([nombreDropi, d]) => {
      const matched = productos.find(p => (p.nombre||"").toUpperCase().includes(nombreDropi.toUpperCase().slice(0,8)) || nombreDropi.toUpperCase().includes((p.nombre||"").toUpperCase().slice(0,8)));
      const shopKey = Object.keys(shopifyData||{}).find(k => k.includes(nombreDropi.toUpperCase().slice(0,8)) || nombreDropi.toUpperCase().includes(k.slice(0,8)));
      const sh = shopifyData?.[shopKey] || {};
      const ingresosUpsell = Object.values(d.upsells).reduce((s,u) => s + u.ingresos, 0);
      const costoUpsell    = Object.values(d.upsells).reduce((s,u) => s + u.costo, 0);
      const upsellNombres  = Object.keys(d.upsells);
      rows.push({ nombreDropi, productoId: matched?.id || "", productoNombre: matched?.nombre || nombreDropi, pedidosTotales: d.total, unidades: sh.unidades || d.total, confirmados: d.confirmados, entregados: d.entregados, devoluciones: d.devoluciones, ingresosPrincipal: d.ingresosPrincipal, ingresosUpsell, ingresosTotal: d.ingresosPrincipal + ingresosUpsell, costoProveedor: d.costoPrincipal + costoUpsell, costoFlete: d.flete, upsellNombres, tieneUpsell: upsellNombres.length > 0, matched: !!matched });
    });
    setPreview(rows);
  }, [dropiData, shopifyData, productos]);

  const importAll = () => {
    setImporting(true);
    const nuevos = preview.map(r => ({ id: Date.now() + Math.random(), fecha, productoId: r.productoId, plataforma: "Meta", gastoAds: gastoAds || "", pedidosTotales: String(r.pedidosTotales), unidades: String(r.unidades), confirmados: String(r.confirmados), entregados: String(r.entregados), devoluciones: String(r.devoluciones), ventasFacturadas: String(Math.round(r.ingresosTotal)), diasCampana:"", cpm:"", cpc:"", ctr:"", checklist:{}, upsellNombres: r.upsellNombres, ingresosUpsell: r.ingresosUpsell }));
    setEntries(e => [...e, ...nuevos]);
    setImporting(false);
    setDone(true);
  };

  const dropZone = (label, icon, onChange, loaded) => (
    <label style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", border:`2px dashed ${loaded ? T.green : T.border}`, borderRadius:14, padding:"28px 20px", cursor:"pointer", background: loaded ? T.greenBg : T.inputBg, gap:8 }}>
      <input type="file" style={{ display:"none" }} onChange={onChange} accept={label.includes("Dropi") ? ".xlsx,.xls" : ".csv"} />
      <div style={{ fontSize:32 }}>{loaded ? "✅" : icon}</div>
      <div style={{ fontWeight:700, fontSize:14, color: loaded ? T.green : T.text }}>{loaded ? "Archivo cargado" : label}</div>
      <div style={{ fontSize:12, color:T.sub }}>{loaded ? "Click para cambiar" : label.includes("Dropi") ? "Archivo .xlsx de Dropi" : "Archivo .csv de Shopify"}</div>
    </label>
  );

  if (done) return (
    <Card style={{ textAlign:"center", padding:48 }}>
      <div style={{ fontSize:48, marginBottom:12 }}>🎉</div>
      <div style={{ fontSize:20, fontWeight:800, color:T.green, marginBottom:8 }}>¡Importación completada!</div>
      <div style={{ color:T.sub, marginBottom:20 }}>Se agregaron {preview.length} registro{preview.length>1?"s":""} al Registro Diario</div>
      <Btn onClick={() => { setDone(false); setDropiData(null); setShopifyData(null); setPreview([]); setGastoAds(""); }}>Importar otro período</Btn>
    </Card>
  );

  return (
    <div style={{ display:"grid", gap:20 }}>
      <Card>
        <SectionTitle icon="📥" title="Importar Datos" sub="Sube el Excel de Dropi y el CSV de Shopify — detecta combos y upsells automáticamente" />
        <div style={{ display:"grid", gridTemplateColumns:"200px 1fr", gap:14, marginBottom:20 }}>
          <div>
            <Label>📅 Fecha del reporte</Label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{ width:"100%", background:T.inputBg, border:`1.5px solid ${T.border}`, borderRadius:8, padding:"9px 12px", color:T.text, fontSize:14, fontFamily:"inherit", outline:"none" }} />
          </div>
          <Inp label="💸 Gasto Total en Ads del período (CLP)" value={gastoAds} onChange={setGastoAds} placeholder="Ej: 79212" hint="Se asigna al producto principal con ads" />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {dropZone("📦 Excel de Dropi", "📦", handleDropi, !!dropiData)}
          {dropZone("🛍️ CSV de Shopify", "🛍️", handleShopify, !!shopifyData)}
        </div>
      </Card>

      {preview.length > 0 && (
        <Card style={{ padding:0, overflow:"hidden" }}>
          <div style={{ padding:"14px 20px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontWeight:700, fontSize:15, color:T.text }}>
                Vista previa — {preview.length} producto{preview.length>1?"s":""} detectado{preview.length>1?"s":""}
                {preview.some(r=>r.tieneUpsell) && <span style={{ marginLeft:10, background:T.accentL, color:T.accent, borderRadius:6, padding:"2px 8px", fontSize:12, fontWeight:700 }}>🎁 Upsells detectados</span>}
              </div>
            </div>
            <Btn onClick={importAll}>{importing ? "Importando..." : "✅ Importar todo"}</Btn>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr><TH>Producto Principal</TH><TH>Catálogo</TH><TH>Tipo</TH><TH>Pedidos</TH><TH>Conf.</TH><TH>Entregados</TH><TH>Devoluciones</TH><TH>Ing. Principal</TH><TH>Ing. Upsell</TH><TH>Ing. Total</TH><TH>Costo Prov.</TH></tr></thead>
              <tbody>
                {preview.map((r,i) => (
                  <tr key={i} style={{ background: i%2===0 ? T.white : T.bg }}>
                    <td style={{ padding:"10px 14px", borderBottom:`1px solid ${T.border}` }}>
                      <div style={{ fontWeight:700, color:T.text, fontSize:13 }}>{r.nombreDropi}</div>
                      {r.tieneUpsell && <div style={{ fontSize:11, color:T.accent, marginTop:3 }}>🎁 Upsell: {r.upsellNombres.join(", ")}</div>}
                    </td>
                    <td style={{ padding:"10px 14px", borderBottom:`1px solid ${T.border}` }}>
                      {r.matched ? <span style={{ background:T.greenBg, color:T.green, borderRadius:6, padding:"2px 8px", fontSize:12, fontWeight:700 }}>✓ {r.productoNombre}</span> : <span style={{ background:T.yellowBg, color:T.yellow, borderRadius:6, padding:"2px 8px", fontSize:12, fontWeight:700 }}>⚠ Sin coincidir</span>}
                    </td>
                    <td style={{ padding:"10px 14px", borderBottom:`1px solid ${T.border}` }}>
                      {r.tieneUpsell ? <span style={{ background:T.accentL, color:T.accent, borderRadius:6, padding:"2px 8px", fontSize:12, fontWeight:700 }}>Combo + Upsell</span> : <span style={{ background:T.bg, color:T.sub, borderRadius:6, padding:"2px 8px", fontSize:12 }}>Solo</span>}
                    </td>
                    <TD>{r.pedidosTotales}</TD><TD color={T.accent}>{r.confirmados}</TD><TD color={T.green} bold>{r.entregados}</TD>
                    <TD color={r.devoluciones>0 ? T.red : T.sub}>{r.devoluciones}</TD>
                    <TD>{clp(r.ingresosPrincipal)}</TD>
                    <TD color={r.ingresosUpsell>0 ? T.accent : T.sub}>{r.ingresosUpsell>0 ? clp(r.ingresosUpsell) : "—"}</TD>
                    <TD color={T.green} bold>{clp(r.ingresosTotal)}</TD><TD color={T.red}>{clp(r.costoProveedor)}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── CAMPAÑAS ─────────────────────────────────────────────────────────────────
function Campanas({ productos, cfg, savedCampanas, setSavedCampanas, dateRange: globalDateRange }) {
  const EMPTY = { plataforma:"Meta", nombre:"", gastado:"", compras:"", clics:"", roas:"", ctr:"", cpm:"", cpc:"", productoId:"", periodo:"" };
  const [campanas, setCampanas]   = useState(savedCampanas || []);
  const [plat, setPlat]           = useState("Todos");
  const [sort, setSort]           = useState("urgencia");
  const [form, setForm]           = useState(EMPTY);
  const [editIdx, setEditIdx]     = useState(null);
  const [showForm, setShowForm]   = useState(false);
  // 🆕 Rango de fechas propio de Campañas con calendario
  const [localRange, setLocalRange] = useState({ from: "", to: "" });

  useEffect(() => { setSavedCampanas(campanas); }, [campanas]);

  const guardar = () => {
    if (!form.nombre.trim()) return alert("Ingresa el nombre de la campaña");
    const c = {
      plataforma : form.plataforma,
      nombre     : form.nombre.trim(),
      periodo    : form.periodo || "",
      estado     : "active",
      gastado    : parseFloat(String(form.gastado).replace(/[$.]/g,"").replace(",",".")) || 0,
      compras    : parseFloat(form.compras) || 0,
      clics      : parseFloat(form.clics)   || 0,
      roas       : parseFloat(form.roas)    || 0,
      ctr        : parseFloat(form.ctr)     || 0,
      cpm        : parseFloat(form.cpm)     || 0,
      cpc        : parseFloat(form.cpc)     || 0,
      productoId : form.productoId || "",
    };
    c.cpa = c.compras > 0 ? Math.round(c.gastado / c.compras) : 0;
    if (editIdx !== null) {
      setCampanas(prev => prev.map((x,i) => i===editIdx ? c : x));
      setEditIdx(null);
    } else {
      setCampanas(prev => [...prev, c]);
    }
    setForm(EMPTY);
    setShowForm(false);
  };

  const editar = (idx) => { const c = campanas[idx]; setForm({ ...c, gastado: c.gastado, compras: c.compras, clics: c.clics }); setEditIdx(idx); setShowForm(true); window.scrollTo({top:0,behavior:"smooth"}); };
  const eliminar = (idx) => { if (!confirm("¿Eliminar esta campaña?")) return; setCampanas(prev => prev.filter((_,i)=>i!==idx)); };

  // Filtrar campañas por rango de fechas local (basado en campo "periodo")
  const campanasFiltradas = useMemo(() => {
    if (!localRange.from && !localRange.to) return campanas;
    return campanas.filter(c => {
      if (!c.periodo) return true;
      // El periodo puede ser texto libre o fecha
      const fechaC = c.periodo.slice(0, 10);
      return (!localRange.from || fechaC >= localRange.from) && (!localRange.to || fechaC <= localRange.to);
    });
  }, [campanas, localRange]);

  // Enriquecer campañas
  const enriquecidas = campanasFiltradas.map((c) => {
    const prod = (c.productoId ? productos.find(p=>p.id===c.productoId) : null)
      || productos.find(p => {
        const np = (p.nombre||"").toUpperCase();
        const nc = (c.nombre||"").toUpperCase();
        return np.split(" ").filter(w=>w.length>3).some(w=>nc.includes(w)) || nc.split(/[\s-]+/).filter(w=>w.length>3).some(w=>np.includes(w));
      }) || null;

    const costeo = prod ? calcCosteo(prod, cfg) : null;
    const beroas  = costeo?.beroas || null;
    const cpaMax  = costeo?.cpaMax || null;
    const utilUnit= costeo?.utilUnitReal || null;

    const roasEfectivo = c.roas > 0
      ? c.roas
      : (c.cpa > 0 && prod?.precioVenta)
        ? +((prod.precioVenta * (prod.tasaEnt||75)/100) / c.cpa).toFixed(2)
        : 0;

    let decision, razon, urgencia = 0;
    if (c.compras === 0 && c.gastado > 8000) {
      decision = "pausar"; urgencia = 3; razon = `Gastaste ${clp(c.gastado)} sin ninguna compra.`;
    } else if (c.compras === 0 && c.gastado <= 8000) {
      decision = "revisar"; urgencia = 1; razon = "Poco gasto y sin compras aún.";
    } else if (beroas !== null && roasEfectivo > 0) {
      const esEst = c.roas === 0; const tag = esEst ? " (est.)" : "";
      if (roasEfectivo >= beroas * 1.4) { decision = "escalar"; urgencia = 0; razon = `ROAS ${roasEfectivo.toFixed(1)}x${tag} vs BEROAS ${beroas.toFixed(1)}x — ${((roasEfectivo/beroas-1)*100).toFixed(0)}% sobre el break-even.`; }
      else if (roasEfectivo >= beroas) { decision = "mantener"; urgencia = 1; razon = `ROAS ${roasEfectivo.toFixed(1)}x${tag} — rentable pero en el límite.`; }
      else if (roasEfectivo >= beroas * 0.7) { decision = "optimizar"; urgencia = 2; razon = `ROAS ${roasEfectivo.toFixed(1)}x${tag}, necesitas ${beroas.toFixed(1)}x.`; }
      else { decision = "pausar"; urgencia = 3; razon = `ROAS ${roasEfectivo.toFixed(1)}x${tag} muy bajo vs BEROAS ${beroas.toFixed(1)}x.`; }
    } else if (roasEfectivo >= 5) { decision = "escalar"; urgencia = 0; razon = `ROAS ${roasEfectivo.toFixed(1)}x excelente.`; }
    else if (roasEfectivo >= 3) { decision = "mantener"; urgencia = 1; razon = `ROAS ${roasEfectivo.toFixed(1)}x parece sano.`; }
    else if (roasEfectivo > 0) { decision = "optimizar"; urgencia = 2; razon = `ROAS ${roasEfectivo.toFixed(1)}x bajo.`; }
    else { decision = "sin_datos"; urgencia = 0; razon = "Asigna el producto para ver la rentabilidad real."; }

    return { ...c, prod, beroas, cpaMax, utilUnit, roasEfectivo, decision, razon, urgencia };
  });

  const platFiltradas = plat==="Todos" ? enriquecidas : enriquecidas.filter(c=>c.plataforma===plat);
  const sorted = [...platFiltradas].sort((a,b)=>{
    if (sort==="urgencia")     return b.urgencia-a.urgencia;
    if (sort==="rentabilidad") return (b.roasEfectivo||0)-(a.roasEfectivo||0);
    if (sort==="gastado")      return b.gastado-a.gastado;
    return 0;
  });

  // 🆕 KPIs incluyendo CPA
  const totalGastado = platFiltradas.reduce((s,c)=>s+c.gastado,0);
  const totalCompras = platFiltradas.reduce((s,c)=>s+c.compras,0);
  const cpaTotalAds  = totalCompras > 0 ? totalGastado / totalCompras : null;  // 🆕 CPA = gasto / compras
  const roasProm     = platFiltradas.filter(c=>c.roasEfectivo>0).length
    ? platFiltradas.filter(c=>c.roasEfectivo>0).reduce((s,c)=>s+c.roasEfectivo,0)/platFiltradas.filter(c=>c.roasEfectivo>0).length : 0;
  const nEscalar = platFiltradas.filter(c=>c.decision==="escalar").length;
  const nPausar  = platFiltradas.filter(c=>c.decision==="pausar").length;

  const DECISION = {
    escalar  : { bg:"#d1fae5", color:"#059669", icon:"🚀", label:"Escalar" },
    mantener : { bg:"#dbeafe", color:"#2563eb", icon:"✅", label:"Mantener" },
    optimizar: { bg:T.yellowBg, color:"#b45309", icon:"⚙️", label:"Optimizar" },
    pausar   : { bg:T.redBg, color:T.red, icon:"⏸", label:"Pausar YA" },
    revisar  : { bg:T.orangeBg, color:T.orange, icon:"🔍", label:"Revisar" },
    sin_datos: { bg:T.bg, color:T.sub, icon:"—", label:"Sin datos" },
  };

  const inp = (label, field, opts={}) => (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={{ fontSize:11, fontWeight:700, color:T.sub, textTransform:"uppercase" }}>{label}</label>
      {opts.type==="select" ? (
        <select value={form[field]} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}
          style={{ padding:"8px 10px", borderRadius:8, border:`1.5px solid ${T.border}`, fontSize:13, background:T.inputBg, fontFamily:"inherit" }}>
          {opts.options.map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
      ) : (
        <input type={opts.type||"text"} value={form[field]} placeholder={opts.placeholder||""}
          onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}
          style={{ padding:"8px 10px", borderRadius:8, border:`1.5px solid ${T.border}`, fontSize:13, background:T.inputBg, fontFamily:"inherit", outline:"none" }} />
      )}
    </div>
  );

  return (
    <div style={{ display:"grid", gap:20 }}>

      {/* 🆕 Selector de fechas con calendario */}
      <DateRangePicker
        from={localRange.from}
        to={localRange.to}
        onChange={setLocalRange}
        label="Filtrar por período:"
      />

      {/* Form nueva campaña */}
      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: showForm?16:0 }}>
          <SectionTitle icon="📡" title="Campañas de Ads" sub="Ingresa los datos de cada campaña manualmente" />
          <button onClick={()=>{ setShowForm(s=>!s); setEditIdx(null); setForm(EMPTY); }}
            style={{ padding:"9px 18px", borderRadius:10, background:showForm?T.border:T.accent, color:showForm?T.text:T.white, fontWeight:700, fontSize:13, border:"none", cursor:"pointer", fontFamily:"inherit" }}>
            {showForm ? "Cancelar" : "+ Nueva campaña"}
          </button>
        </div>

        {showForm && (
          <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:16 }}>
            <div style={{ fontWeight:700, fontSize:14, color:T.text, marginBottom:14 }}>{editIdx!==null ? "✏️ Editar campaña" : "➕ Nueva campaña"}</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:12 }}>
              {inp("Plataforma", "plataforma", { type:"select", options:[["Meta","🔵 Meta"],["TikTok","🎵 TikTok"]] })}
              {inp("Nombre campaña", "nombre", { placeholder:"Ej: Maquina bolsas - 26-02" })}
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <label style={{ fontSize:11, fontWeight:700, color:T.sub, textTransform:"uppercase" }}>📅 Fecha / Período</label>
                <input type="date" value={form.periodo} onChange={e=>setForm(f=>({...f,periodo:e.target.value}))}
                  style={{ padding:"8px 10px", borderRadius:8, border:`1.5px solid ${T.border}`, fontSize:13, background:T.inputBg, fontFamily:"inherit", outline:"none", cursor:"pointer" }} />
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:12 }}>
              {inp("Gastado ($)", "gastado", { placeholder:"104460", type:"number" })}
              {inp("Compras", "compras", { placeholder:"18", type:"number" })}
              {inp("Clics", "clics", { placeholder:"1818", type:"number" })}
              {inp("ROAS (si lo reporta)", "roas", { placeholder:"0 si no aplica", type:"number" })}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
              {inp("CTR (%)", "ctr", { placeholder:"2.48", type:"number" })}
              {inp("CPM", "cpm", { placeholder:"1425", type:"number" })}
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <label style={{ fontSize:11, fontWeight:700, color:T.sub, textTransform:"uppercase" }}>Producto</label>
                <select value={form.productoId} onChange={e=>setForm(f=>({...f,productoId:e.target.value}))}
                  style={{ padding:"8px 10px", borderRadius:8, border:`1.5px solid ${form.productoId?T.accent:T.border}`, fontSize:13, background:form.productoId?T.accentL:T.inputBg, fontFamily:"inherit", color:form.productoId?T.accent:T.text }}>
                  <option value="">🔗 Seleccionar producto...</option>
                  {productos.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={guardar} style={{ padding:"10px 24px", borderRadius:10, background:T.accent, color:T.white, fontWeight:700, fontSize:13, border:"none", cursor:"pointer", fontFamily:"inherit" }}>
                {editIdx!==null ? "💾 Guardar cambios" : "✅ Agregar campaña"}
              </button>
              <button onClick={()=>{ setShowForm(false); setEditIdx(null); setForm(EMPTY); }} style={{ padding:"10px 18px", borderRadius:10, background:T.border, color:T.text, fontWeight:600, fontSize:13, border:"none", cursor:"pointer", fontFamily:"inherit" }}>Cancelar</button>
            </div>
          </div>
        )}
      </Card>

      {campanas.length === 0 && !showForm && (
        <div style={{ background:T.accentL, borderRadius:12, padding:"20px 24px", textAlign:"center" }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📊</div>
          <div style={{ fontWeight:700, fontSize:15, color:T.accent, marginBottom:6 }}>Sin campañas aún</div>
          <div style={{ fontSize:13, color:T.sub }}>Haz click en "+ Nueva campaña" para ingresar los datos.</div>
        </div>
      )}

      {campanas.length > 0 && (<>

        {/* 🆕 KPIs con CPA incluido */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:12 }}>
          {[
            { label:"Total en Ads", value:clp(totalGastado), color:T.text, bg:T.bg, icon:"📣" },
            { label:"Compras Totales", value:totalCompras.toFixed(0), color:T.accent, bg:T.accentL, icon:"🛒" },
            // 🆕 KPI CPA
            { label:"CPA Promedio", value:cpaTotalAds ? clp(cpaTotalAds) : "—", color: cpaTotalAds && cpaTotalAds < 15000 ? T.green : T.orange, bg: cpaTotalAds && cpaTotalAds < 15000 ? T.greenBg : T.orangeBg, icon:"🎯" },
            { label:"ROAS Promedio", value:x2(roasProm), color:roasProm>=4?T.green:roasProm>=2?T.yellow:T.red, bg:roasProm>=4?T.greenBg:roasProm>=2?T.yellowBg:T.redBg, icon:"⚡" },
            { label:"🚀 Para Escalar", value:nEscalar, color:T.green, bg:T.greenBg, icon:"🚀" },
            { label:"⏸ Para Pausar", value:nPausar, color:T.red, bg:T.redBg, icon:"⏸" },
          ].map(({label,value,color,bg,icon})=>(
            <div key={label} style={{ background:T.white, borderRadius:12, padding:"14px 16px", boxShadow:T.shadow, borderTop:`3px solid ${color}` }}>
              <div style={{ fontSize:16, marginBottom:4 }}>{icon}</div>
              <div style={{ fontSize:10, color:T.sub, fontWeight:700, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</div>
              <div style={{ fontSize:20, fontWeight:900, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Alertas prioritarias */}
        {sorted.filter(c=>c.decision==="pausar"||c.decision==="escalar").length > 0 && (
          <Card>
            <div style={{ fontWeight:800, fontSize:14, color:T.text, marginBottom:12 }}>⚡ Acciones Prioritarias Ahora</div>
            <div style={{ display:"grid", gap:8 }}>
              {sorted.filter(c=>c.decision==="escalar").map((c,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, background:DECISION.escalar.bg, borderRadius:10, padding:"12px 16px" }}>
                  <div style={{ fontSize:20 }}>🚀</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:DECISION.escalar.color }}>ESCALAR — {c.nombre}</div>
                    <div style={{ fontSize:12, color:T.sub, marginTop:2 }}>{c.razon}</div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:11, color:T.sub }}>CPA</div>
                    <div style={{ fontWeight:800, color:T.text }}>{c.cpa > 0 ? clp(c.cpa) : "—"}</div>
                  </div>
                </div>
              ))}
              {sorted.filter(c=>c.decision==="pausar").map((c,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, background:DECISION.pausar.bg, borderRadius:10, padding:"12px 16px" }}>
                  <div style={{ fontSize:20 }}>⏸</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:DECISION.pausar.color }}>PAUSAR — {c.nombre}</div>
                    <div style={{ fontSize:12, color:T.sub, marginTop:2 }}>{c.razon}</div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:11, color:T.sub }}>CPA</div>
                    <div style={{ fontWeight:800, color:T.red }}>{c.cpa > 0 ? clp(c.cpa) : clp(c.gastado)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Filtros */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", gap:8 }}>
            {["Todos","Meta","TikTok"].map(p=>(
              <button key={p} onClick={()=>setPlat(p)} style={{ padding:"7px 16px", borderRadius:20, border:`1.5px solid ${plat===p?T.accent:T.border}`, background:plat===p?T.accentL:T.white, color:plat===p?T.accent:T.sub, fontWeight:plat===p?700:500, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>{p}</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:12, color:T.sub }}>Ordenar por:</span>
            {[["urgencia","Urgencia"],["rentabilidad","ROAS"],["gastado","Gasto"]].map(([v,l])=>(
              <button key={v} onClick={()=>setSort(v)} style={{ padding:"6px 14px", borderRadius:20, border:`1.5px solid ${sort===v?T.accent:T.border}`, background:sort===v?T.accentL:T.white, color:sort===v?T.accent:T.sub, fontWeight:sort===v?700:500, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Tabla campañas */}
        <Card style={{ padding:0, overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:900 }}>
              <thead>
                <tr style={{ background:T.bg }}>
                  <TH>Campaña</TH><TH>Plataforma</TH><TH>Fecha</TH><TH>Gastado</TH>
                  <TH>Compras</TH><TH>CPA</TH><TH>ROAS</TH><TH>BEROAS</TH>
                  <TH>CPA Máx.</TH><TH>CTR</TH><TH>Decisión</TH><TH>Acciones</TH>
                </tr>
              </thead>
              <tbody>
                {sorted.map((c,i)=>{
                  const D = DECISION[c.decision];
                  const roasOk = c.beroas ? c.roasEfectivo >= c.beroas : c.roasEfectivo >= 3;
                  const origIdx = campanas.findIndex(x=>x.nombre===c.nombre&&x.gastado===c.gastado);
                  // Color CPA vs CPA máximo
                  const cpaOk = c.cpaMax && c.cpa > 0 ? c.cpa <= c.cpaMax : null;
                  return (
                    <tr key={i} style={{ background:i%2===0?T.white:T.bg, borderBottom:`1px solid ${T.border}` }}>
                      <td style={{ padding:"12px 14px", maxWidth:200 }}>
                        <div style={{ fontWeight:700, fontSize:13, color:T.text }}>{c.nombre}</div>
                        <div style={{ fontSize:11, color:T.sub, marginTop:2, fontStyle:"italic" }}>{c.razon}</div>
                      </td>
                      <TD>
                        <span style={{ background:c.plataforma==="Meta"?"#eff6ff":"#fdf4ff", color:c.plataforma==="Meta"?"#2563eb":"#7c3aed", borderRadius:6, padding:"2px 8px", fontSize:12, fontWeight:700 }}>
                          {c.plataforma==="Meta"?"🔵 Meta":"🎵 TikTok"}
                        </span>
                      </TD>
                      <td style={{ padding:"12px 14px", fontSize:12, color:T.sub }}>{c.periodo || "—"}</td>
                      <TD bold>{clp(c.gastado)}</TD>
                      <TD color={c.compras>0?T.text:T.sub}>{c.compras||"—"}</TD>
                      {/* 🆕 CPA con color según CPA máximo */}
                      <td style={{ padding:"12px 14px" }}>
                        {c.cpa > 0 ? (
                          <div>
                            <span style={{ fontWeight:800, fontSize:14, color: cpaOk === true ? T.green : cpaOk === false ? T.red : T.orange }}>
                              {clp(c.cpa)}
                            </span>
                            {c.cpaMax > 0 && (
                              <div style={{ fontSize:10, color:T.sub, marginTop:2 }}>
                                {cpaOk ? "✓ bajo el máx." : "✗ sobre el máx."}
                              </div>
                            )}
                          </div>
                        ) : <span style={{ color:T.sub }}>—</span>}
                      </td>
                      <td style={{ padding:"12px 14px" }}>
                        <span style={{ fontWeight:800, fontSize:14, color:roasOk?T.green:c.roasEfectivo>0?T.red:T.sub }}>
                          {c.roasEfectivo>0?<>{x2(c.roasEfectivo)}{c.roas===0&&c.roasEfectivo>0&&<span style={{fontSize:9,color:T.sub}}> est.</span>}</>:"—"}
                        </span>
                      </td>
                      <td style={{ padding:"12px 14px" }}>
                        {c.beroas?<span style={{ fontWeight:700, color:T.accent }}>{x2(c.beroas)}</span>:<span style={{ color:T.sub }}>—</span>}
                      </td>
                      <TD color={T.green}>{c.cpaMax?clp(c.cpaMax):"—"}</TD>
                      <td style={{ padding:"12px 14px", fontSize:13, color:T.sub }}>{c.ctr>0?`${c.ctr.toFixed(2)}%`:"—"}</td>
                      <td style={{ padding:"12px 14px" }}>
                        <div style={{ background:D.bg, color:D.color, borderRadius:8, padding:"5px 10px", fontSize:12, fontWeight:800, whiteSpace:"nowrap", display:"inline-block" }}>
                          {D.icon} {D.label}
                        </div>
                      </td>
                      <td style={{ padding:"12px 14px" }}>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={()=>editar(origIdx)} style={{ padding:"4px 10px", borderRadius:6, border:`1px solid ${T.border}`, background:T.white, fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>✏️</button>
                          <button onClick={()=>eliminar(origIdx)} style={{ padding:"4px 10px", borderRadius:6, border:`1px solid ${T.redBg}`, background:T.redBg, color:T.red, fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card style={{ background:T.accentL, border:`1px solid ${T.accent}33` }}>
          <div style={{ fontWeight:800, fontSize:13, color:T.accent, marginBottom:8 }}>📚 ¿Por qué no miramos solo el CPA?</div>
          <div style={{ fontSize:13, color:T.text, lineHeight:1.8 }}>
            El CPA mide cuánto pagaste por cada compra en ads — pero no te dice si fuiste rentable. Una campaña con CPA de $18.000 puede ser <strong>excelente</strong> si tu producto tiene margen para absorberlo, o una campaña con CPA de $4.000 puede ser <strong>ruinosa</strong> si tu margen neto es de $3.000.<br/><br/>
            Lo que importa: <strong>ROAS ≥ BEROAS</strong> y <strong>CPA ≤ CPA Máximo</strong>. Si ambos se cumplen, estás ganando.
          </div>
        </Card>

      </>)}
    </div>
  );
}

// ─── PRODUCTOS POR DEFECTO ────────────────────────────────────────────────────
// ✅ FIX: Campo renombrado de "costoProducto" → "costoUnitario" para que calcCosteo lo lea correctamente
const DEFAULT_PRODUCTOS = [
  { id:"p1",  nombre:"Cepillo Alisador",         precioVenta:23990, costoUnitario:2700,  costoEnvio:7000, cpaEstimado:5000,  tasaConf:75,  tasaEnt:75,  pedidosDiarios:1, pct2daUnidad:10, idDropi:"",      proveedor:"" },
  { id:"p2",  nombre:"Lima Pies",                precioVenta:23990, costoUnitario:4900,  costoEnvio:6200, cpaEstimado:7445,  tasaConf:100, tasaEnt:100, pedidosDiarios:1, pct2daUnidad:10, idDropi:"10431", proveedor:"" },
  { id:"p3",  nombre:"Picatodo",                 precioVenta:27990, costoUnitario:7500,  costoEnvio:6200, cpaEstimado:8000,  tasaConf:75,  tasaEnt:75,  pedidosDiarios:1, pct2daUnidad:10, idDropi:"",      proveedor:"" },
  { id:"p4",  nombre:"Masajeador Facial",        precioVenta:24990, costoUnitario:11000, costoEnvio:6200, cpaEstimado:8000,  tasaConf:75,  tasaEnt:75,  pedidosDiarios:1, pct2daUnidad:10, idDropi:"24036", proveedor:"Liquidambar" },
  { id:"p5",  nombre:"Balsamo Facial",           precioVenta:10990, costoUnitario:3200,  costoEnvio:6200, cpaEstimado:8000,  tasaConf:75,  tasaEnt:75,  pedidosDiarios:1, pct2daUnidad:10, idDropi:"91556", proveedor:"Importadora Oferfly" },
  { id:"p6",  nombre:"Removedor Callos 2",       precioVenta:23990, costoUnitario:4500,  costoEnvio:6200, cpaEstimado:4604,  tasaConf:100, tasaEnt:100, pedidosDiarios:1, pct2daUnidad:10, idDropi:"10431", proveedor:"RVG sp" },
  { id:"p7",  nombre:"Almohadilla Colicos",      precioVenta:28990, costoUnitario:4990,  costoEnvio:8500, cpaEstimado:5000,  tasaConf:70,  tasaEnt:70,  pedidosDiarios:1, pct2daUnidad:10, idDropi:"98717", proveedor:"Vida y Hogar spa" },
  { id:"p8",  nombre:"Removedor Callos 1",       precioVenta:26990, costoUnitario:4900,  costoEnvio:8500, cpaEstimado:5000,  tasaConf:75,  tasaEnt:75,  pedidosDiarios:1, pct2daUnidad:10, idDropi:"10431", proveedor:"RVG sp" },
  { id:"p9",  nombre:"Cuadernos Montessori",     precioVenta:28990, costoUnitario:2600,  costoEnvio:8500, cpaEstimado:5000,  tasaConf:75,  tasaEnt:75,  pedidosDiarios:1, pct2daUnidad:10, idDropi:"",      proveedor:"" },
  { id:"p10", nombre:"Guantes Mascotas",         precioVenta:23990, costoUnitario:1800,  costoEnvio:8500, cpaEstimado:5000,  tasaConf:75,  tasaEnt:75,  pedidosDiarios:1, pct2daUnidad:10, idDropi:"",      proveedor:"" },
  { id:"p11", nombre:"Cepillo Vapor",            precioVenta:14990, costoUnitario:3500,  costoEnvio:8500, cpaEstimado:5000,  tasaConf:75,  tasaEnt:75,  pedidosDiarios:1, pct2daUnidad:10, idDropi:"",      proveedor:"" },
  { id:"p12", nombre:"Soporte Celular",          precioVenta:25990, costoUnitario:3800,  costoEnvio:8500, cpaEstimado:5000,  tasaConf:75,  tasaEnt:75,  pedidosDiarios:1, pct2daUnidad:10, idDropi:"78330", proveedor:"Meibo" },
  { id:"p13", nombre:"Desinfectante Dientes UV", precioVenta:26990, costoUnitario:4990,  costoEnvio:8500, cpaEstimado:5000,  tasaConf:75,  tasaEnt:75,  pedidosDiarios:1, pct2daUnidad:10, idDropi:"75492", proveedor:"Anacaona spa" },
  { id:"p14", nombre:"Basurero Portatil",        precioVenta:24990, costoUnitario:3500,  costoEnvio:8500, cpaEstimado:5000,  tasaConf:75,  tasaEnt:75,  pedidosDiarios:1, pct2daUnidad:10, idDropi:"40206", proveedor:"Meibo" },
  { id:"p15", nombre:"Secador Zapatos",          precioVenta:30990, costoUnitario:6900,  costoEnvio:8500, cpaEstimado:5000,  tasaConf:75,  tasaEnt:75,  pedidosDiarios:1, pct2daUnidad:10, idDropi:"56094", proveedor:"Meibo" },
  { id:"p16", nombre:"Levanta Muebles",          precioVenta:24990, costoUnitario:3500,  costoEnvio:8500, cpaEstimado:5000,  tasaConf:75,  tasaEnt:75,  pedidosDiarios:1, pct2daUnidad:10, idDropi:"27261", proveedor:"Meibo" },
  { id:"p17", nombre:"Selladora Al Vacio",       precioVenta:29990, costoUnitario:5800,  costoEnvio:8500, cpaEstimado:5000,  tasaConf:75,  tasaEnt:75,  pedidosDiarios:1, pct2daUnidad:10, idDropi:"48988", proveedor:"Meibo" },
  { id:"p18", nombre:"Bolsas Selladora",         precioVenta:15990, costoUnitario:2800,  costoEnvio:8500, cpaEstimado:5000,  tasaConf:75,  tasaEnt:75,  pedidosDiarios:1, pct2daUnidad:10, idDropi:"88817", proveedor:"Las Dalias" },
];

// ─── APP ──────────────────────────────────────────────────────────────────────
const NAV = [
  ["campanas",    "📡", "Campañas Ads"],
  ["calculadora", "🧮", "Calculadora"],
  ["productos",   "📦", "Mis Productos"],
  ["registro",    "➕", "Registro Diario"],
  ["importar",    "📥", "Importar Datos"],
  ["dashboard",   "📊", "Dashboard"],
  ["simulaciones","🔮", "Simulaciones"],
];

export default function App() {
  const stored = hydrate();
  const [page, setPage]           = useState("campanas");
  const [cfg, setCfg]             = useState(stored.cfg || GCFG);

  // ✅ Si hay productos guardados en localStorage los usa, si no usa DEFAULT_PRODUCTOS con costoUnitario correcto
  const [productos, setProductos] = useState(() => {
    if (stored.productos?.length > 0) {
      // Migrar productos antiguos que usen "costoProducto" en lugar de "costoUnitario"
      return stored.productos.map(p => ({
        ...p,
        costoUnitario: p.costoUnitario ?? p.costoProducto ?? 0,
      }));
    }
    return DEFAULT_PRODUCTOS;
  });

  const [entries, setEntries]     = useState(stored.entries || []);
  const [savedCampanas, setSavedCampanas] = useState(stored.campanas || []);
  const [dateRange, setDateRange] = useState(stored.dateRange || { from: hace30(), to: hoy() });

  useEffect(() => persist({ cfg, productos, entries, campanas: savedCampanas, dateRange }), [cfg, productos, entries, savedCampanas, dateRange]);

  const headers = {
    campanas:    ["Campañas Ads",       "Rentabilidad real — qué escalar y qué pausar basado en ROAS vs BEROAS"],
    calculadora: ["Calculadora",        "Costeo completo con análisis de 2ª unidad, BEROAS y ganancia proyectada"],
    productos:   ["Mis Productos",      "Catálogo con costeo, antecedentes y links de anuncios"],
    registro:    ["Registro Diario",    "Testeos con métricas de ads + checklist de calidad"],
    importar:    ["Importar Datos",     "Sube el Excel de Dropi y CSV de Shopify — detecta combos y upsells"],
    dashboard:   ["Dashboard",          "Análisis de rentabilidad, gráficos y resumen por producto"],
    simulaciones:["Simulaciones",       "Proyecta rentabilidad en escenario ácido, base y optimista"],
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, fontFamily: "'Nunito', 'Sora', 'Segoe UI', sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: 228, background: T.white, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>
        <div style={{ padding: "22px 20px 18px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, flexShrink: 0 }}>
              <svg viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg" width="38" height="38">
                <circle cx="19" cy="19" r="19" fill="#6B4FBB"/>
                <circle cx="13" cy="22" r="6" fill="#F5A623"/>
                <rect x="12" y="8" width="10" height="18" rx="5" fill="#4B2D8F"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 15, color: T.text, letterSpacing: "-0.03em" }}><span style={{ color: "#4B2D8F" }}>Punto</span> <span style={{ color: "#F5A623" }}>Mercado</span></div>
              <div style={{ fontSize: 10, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Tienda Online · COD</div>
            </div>
          </div>
        </div>
        <nav style={{ padding: "10px 0", flex: 1 }}>
          {NAV.map(([id, icon, label]) => (
            <button key={id} onClick={() => setPage(id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 20px", background: page === id ? T.accentL : "none", borderLeft: page === id ? `3px solid ${T.accent}` : "3px solid transparent", border: "none", color: page === id ? T.accent : T.sub, fontWeight: page === id ? 700 : 500, fontSize: 14, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
              <span style={{ fontSize: 16 }}>{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Resumen</div>
          <div style={{ display: "flex", gap: 20 }}>
            <div><div style={{ fontSize: 20, fontWeight: 900, color: T.accent }}>{productos.length}</div><div style={{ fontSize: 11, color: T.sub }}>productos</div></div>
            <div><div style={{ fontSize: 20, fontWeight: 900, color: T.text }}>{entries.length}</div><div style={{ fontSize: 11, color: T.sub }}>testeos</div></div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ background: T.white, borderBottom: `1px solid ${T.border}`, padding: "14px 30px", position: "sticky", top: 0, zIndex: 10, display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 21, color: T.text, letterSpacing: "-0.03em" }}>{headers[page][0]}</div>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{headers[page][1]}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            <span style={{ fontSize:12, color:T.sub, fontWeight:700 }}>📅</span>
            <input type="date" value={dateRange.from} onChange={e=>setDateRange(r=>({...r,from:e.target.value}))}
              style={{ fontSize:12, padding:"6px 10px", border:`1.5px solid ${T.border}`, borderRadius:8, color:T.text, background:T.inputBg, fontFamily:"inherit", outline:"none" }} />
            <span style={{ fontSize:12, color:T.sub }}>→</span>
            <input type="date" value={dateRange.to} onChange={e=>setDateRange(r=>({...r,to:e.target.value}))}
              style={{ fontSize:12, padding:"6px 10px", border:`1.5px solid ${T.border}`, borderRadius:8, color:T.text, background:T.inputBg, fontFamily:"inherit", outline:"none" }} />
            <button onClick={()=>setDateRange({from:hace30(),to:hoy()})}
              style={{ fontSize:11, padding:"6px 10px", border:`1.5px solid ${T.border}`, borderRadius:8, color:T.sub, background:T.white, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>Últimos 30d</button>
          </div>
        </div>
        <div style={{ padding: 26 }}>
          {page === "campanas"      && <Campanas productos={productos} cfg={cfg} savedCampanas={savedCampanas} setSavedCampanas={setSavedCampanas} dateRange={dateRange} />}
          {page === "calculadora"   && <Calculadora cfg={cfg} setCfg={setCfg} productos={productos} />}
          {page === "productos"     && <MisProductos productos={productos} setProductos={setProductos} cfg={cfg} />}
          {page === "registro"      && <Registro entries={entries} setEntries={setEntries} productos={productos} cfg={cfg} dateRange={dateRange} />}
          {page === "importar"      && <Importar productos={productos} setEntries={setEntries} entries={entries} />}
          {page === "dashboard"     && <Dashboard entries={entries} productos={productos} cfg={cfg} dateRange={dateRange} />}
          {page === "simulaciones"  && <Simulaciones cfg={cfg} productos={productos} />}
        </div>
      </div>
    </div>
  );
}
