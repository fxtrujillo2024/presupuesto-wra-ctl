import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://tbveulsvudgpmlzegool.supabase.co";
const SUPABASE_KEY = "sb_publishable_LM1tvXOxUTnv-eZCdgdJ5g_06YV8IWb";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const CATEGORIAS_INGRESO = [
  "Remuneraciones","CTS","Bono por Desempeño","Compra vacaciones",
  "Pensión AFP","Prestamos","Otros depósitos","Transferencias de ahorros",
  "Utilidades","Saldo Inicial bancos","Saldo Inicial caja",
  "Inter cuentas (William)","Intereses ganados","Reembolso de préstamo"
];

const CATEGORIAS_EGRESO = [
  "Agua","Electricidad","Internet, Teléfono, Cable","Celular","Empleada",
  "Servicio de limpieza","Predios","Lavandería","Alimentación","Comida Preparada",
  "Panadería","Postres","Fruta","Supermercado","Mercado Semanal","Transporte",
  "Taxi/Movilidad","Gasolina","Salud","Medicina","Dentista","Oncosalud",
  "Mamá","Familia","Compromisos familiares","Diversión","Cine","Regalos",
  "Ropa","Calzado","Aseo personal","Peluquería","Deuda","American Express",
  "Oechsle MC","Scotia MC","Conti VISA","Diners","Seguros","Seguro Médico",
  "Ahorro","Fondos Mutuos","Pandero","Mantenimientos","Miscelánea","Varios"
];

const P = {
  bg:      "#0A0F1E",
  surface: "#111827",
  card:    "#161F35",
  border:  "#1E2D4A",
  accent:  "#4F7FFF",
  aGlow:   "rgba(79,127,255,0.12)",
  green:   "#4FD1A5",
  red:     "#FF5A7E",
  yellow:  "#FFB84F",
  purple:  "#A78BFA",
  text:    "#E8EDF8",
  muted:   "#6B7FA8",
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt  = (n) => `S/ ${Math.abs(n||0).toLocaleString("es-PE",{minimumFractionDigits:0,maximumFractionDigits:0})}`;
const fmtK = (n) => Math.abs(n||0) >= 1000 ? `S/ ${(Math.abs(n)/1000).toFixed(1)}k` : fmt(n);

// ─── SUBCOMPONENTES ───────────────────────────────────────────────────────────
const Spinner = () => (
  <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60}}>
    <div style={{width:32,height:32,border:`3px solid ${P.border}`,borderTop:`3px solid ${P.accent}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

const Badge = ({ children, color = P.accent }) => (
  <span style={{background:color+"22",color,border:`1px solid ${color}44`,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600,letterSpacing:"0.04em"}}>
    {children}
  </span>
);

const KPICard = ({ title, value, sub, trend, color = P.accent, glow = false }) => (
  <div style={{background:P.card,border:`1px solid ${glow?color+"55":P.border}`,borderRadius:16,padding:"20px 24px",flex:1,minWidth:150,boxShadow:glow?`0 0 28px ${color}22`:"none"}}>
    <div style={{color:P.muted,fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>{title}</div>
    <div style={{color,fontSize:24,fontWeight:800,fontFamily:"monospace",letterSpacing:"-0.02em"}}>{value}</div>
    {sub && <div style={{color:trend==="up"?P.green:trend==="down"?P.red:P.muted,fontSize:12,marginTop:4,fontWeight:500}}>{trend==="up"?"↑":trend==="down"?"↓":""} {sub}</div>}
  </div>
);

const STitle = ({ children, sub }) => (
  <div style={{marginBottom:18}}>
    <div style={{color:P.text,fontSize:17,fontWeight:700,letterSpacing:"-0.01em"}}>{children}</div>
    {sub && <div style={{color:P.muted,fontSize:12,marginTop:2}}>{sub}</div>}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:10,padding:"10px 16px"}}>
      <div style={{color:P.muted,fontSize:11,marginBottom:6}}>{label}</div>
      {payload.map((p,i)=>(
        <div key={i} style={{color:p.color,fontSize:13,fontWeight:600}}>{p.name}: {fmtK(p.value)}</div>
      ))}
    </div>
  );
};

const inputSt = { background:P.surface, border:`1px solid ${P.border}`, borderRadius:8, color:P.text, padding:"9px 12px", fontSize:13, width:"100%", boxSizing:"border-box", outline:"none" };

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
const Dashboard = ({ anio, mes }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // Monthly summary for selected year
      const { data: rows } = await supabase
        .from("transactions")
        .select("mes, tipo, persona, importe")
        .eq("anio", anio);

      if (!rows) { setLoading(false); return; }

      // Build monthly arrays
      const monthly = Array.from({length:12}, (_,i) => ({
        name: MONTHS[i],
        ingresos: 0, egresos: 0,
        wIngr: 0, wEgr: 0,
        sIngr: 0, sEgr: 0,
      }));

      rows.forEach(r => {
        const m = r.mes - 1;
        if (m < 0 || m > 11) return;
        if (r.tipo === "ingreso") {
          monthly[m].ingresos += r.importe;
          if (r.persona === "william") monthly[m].wIngr += r.importe;
          else monthly[m].sIngr += r.importe;
        } else {
          monthly[m].egresos += r.importe;
          if (r.persona === "william") monthly[m].wEgr += r.importe;
          else monthly[m].sEgr += r.importe;
        }
      });

      // Category breakdown
      const { data: catRows } = await supabase
        .from("transactions")
        .select("categoria, importe")
        .eq("anio", anio)
        .eq("tipo", "egreso");

      const cats = {};
      (catRows||[]).forEach(r => { cats[r.categoria] = (cats[r.categoria]||0) + r.importe; });
      const topCats = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,value],i)=>({
        name, value, color: [P.accent,P.red,P.green,P.yellow,P.purple,"#F472B6"][i]
      }));

      const mi = mes - 1;
      setData({ monthly, topCats, cur: monthly[mi], mi });
      setLoading(false);
    };
    load();
  }, [anio, mes]);

  if (loading) return <Spinner />;
  if (!data) return null;
  const { monthly, topCats, cur, mi } = data;

  const wBal = monthly.slice(0,mi+1).reduce((a,m)=>a+(m.wIngr-m.wEgr),0);
  const sBal = monthly.slice(0,mi+1).reduce((a,m)=>a+(m.sIngr-m.sEgr),0);

  let cumBal = 0, cumW = 0, cumS = 0;
  const balanceEvol = monthly.map(m => {
    cumBal += m.ingresos - m.egresos;
    cumW += m.wIngr - m.wEgr;
    cumS += m.sIngr - m.sEgr;
    return { name: m.name, Total: Math.round(cumBal), William: Math.round(cumW), Shely: Math.round(cumS) };
  });

  return (
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
        <KPICard title="Ingresos del mes" value={fmt(cur.ingresos)} color={P.green} glow />
        <KPICard title="Egresos del mes"  value={fmt(cur.egresos)}  color={P.red} />
        <KPICard title="Neto del mes"     value={fmt(cur.ingresos-cur.egresos)} sub="este mes" trend={(cur.ingresos-cur.egresos)>=0?"up":"down"} color={P.accent} />
        <KPICard title="Balance William"  value={fmt(wBal)} color={P.green} />
        <KPICard title="Balance Shely"    value={fmt(Math.abs(sBal))} trend={sBal>=0?"up":"down"} color={sBal>=0?P.yellow:P.red} />
      </div>

      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:20}}>
        <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:16,padding:24}}>
          <STitle sub={`Ingresos vs Egresos — ${anio}`}>Flujo Anual</STitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="name" tick={{fill:P.muted,fontSize:11}} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtK} tick={{fill:P.muted,fontSize:10}} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="ingresos" name="Ingresos" fill={P.green}  radius={[4,4,0,0]} />
              <Bar dataKey="egresos"  name="Egresos"  fill={P.red}    radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:16,padding:24}}>
          <STitle sub="Top categorías de egreso">Distribución</STitle>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={topCats} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                {topCats.map((e,i)=><Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={fmtK} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
            {topCats.map((c,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:c.color}} />
                <span style={{color:P.muted,fontSize:10}}>{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:16,padding:24}}>
        <STitle sub="Evolución acumulada del balance">Balance Acumulado</STitle>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={balanceEvol}>
            <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
            <XAxis dataKey="name" tick={{fill:P.muted,fontSize:11}} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtK} tick={{fill:P.muted,fontSize:10}} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line dataKey="Total"   stroke={P.accent} strokeWidth={2.5} dot={false} />
            <Line dataKey="William" stroke={P.green}  strokeWidth={2}   dot={false} />
            <Line dataKey="Shely"   stroke={P.yellow} strokeWidth={2}   dot={false} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
        <div style={{display:"flex",gap:20,marginTop:8}}>
          {[["Total",P.accent],["William",P.green],["Shely",P.yellow]].map(([l,c])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:18,height:2,background:c}} />
              <span style={{color:P.muted,fontSize:11}}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── TRANSACCIONES ────────────────────────────────────────────────────────────
const Transacciones = ({ anio }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ persona:"todos", tipo:"todos", mes:"todos" });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fecha:"", persona:"william", categoria:"", forma_pago:"DEBITO", importe:"", tipo:"egreso", observacion:"" });
  const [page, setPage] = useState(0);
  const PER_PAGE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("transactions").select("*").eq("anio", anio).order("fecha",{ascending:false}).order("id",{ascending:false});
    if (filter.persona !== "todos") q = q.eq("persona", filter.persona);
    if (filter.tipo    !== "todos") q = q.eq("tipo",    filter.tipo);
    if (filter.mes     !== "todos") q = q.eq("mes",     parseInt(filter.mes));
    const { data } = await q.range(page*PER_PAGE, (page+1)*PER_PAGE-1);
    setRows(data||[]);
    setLoading(false);
  }, [anio, filter, page]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.fecha || !form.categoria || !form.importe) return;
    setSaving(true);
    const fechaDate = new Date(form.fecha);
    await supabase.from("transactions").insert({
      ...form,
      importe: parseFloat(form.importe),
      mes: fechaDate.getMonth()+1,
      anio: fechaDate.getFullYear(),
    });
    setShowForm(false);
    setForm({ fecha:"", persona:"william", categoria:"", forma_pago:"DEBITO", importe:"", tipo:"egreso", observacion:"" });
    setSaving(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar esta transacción?")) return;
    await supabase.from("transactions").delete().eq("id", id);
    load();
  };

  const selSt = { ...inputSt, padding:"7px 10px" };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <STitle sub="Registro completo de movimientos">Transacciones {anio}</STitle>
        <button onClick={()=>setShowForm(!showForm)} style={{background:P.accent,color:"#fff",border:"none",borderRadius:20,padding:"8px 22px",cursor:"pointer",fontSize:13,fontWeight:700}}>
          + Nueva transacción
        </button>
      </div>

      {/* Filtros */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {[
          ["persona",["todos","william","shely"],{todos:"Todos",william:"William",shely:"Shely"}],
          ["tipo",["todos","ingreso","egreso"],{todos:"Todos",ingreso:"Ingresos",egreso:"Egresos"}],
          ["mes",["todos",...Array.from({length:12},(_,i)=>String(i+1))],{todos:"Todos los meses",...Object.fromEntries(MONTHS.map((m,i)=>[String(i+1),m]))}],
        ].map(([key,opts,labels])=>(
          <select key={key} value={filter[key]} onChange={e=>{setFilter({...filter,[key]:e.target.value});setPage(0);}}
            style={{...selSt,width:"auto",minWidth:130}}>
            {opts.map(o=><option key={o} value={o}>{labels[o]||o}</option>)}
          </select>
        ))}
      </div>

      {/* Formulario nueva transacción */}
      {showForm && (
        <div style={{background:P.card,border:`1px solid ${P.accent}44`,borderRadius:16,padding:24}}>
          <div style={{color:P.text,fontWeight:700,marginBottom:16}}>Nueva Transacción</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:12}}>
            {[
              ["Fecha","date","fecha",""],
              ["Importe (S/)","number","importe","0.00"],
              ["Observación","text","observacion","Opcional"],
            ].map(([label,type,key,ph])=>(
              <div key={key}>
                <div style={{color:P.muted,fontSize:11,marginBottom:4}}>{label}</div>
                <input type={type} placeholder={ph} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} style={inputSt} />
              </div>
            ))}
            {[
              ["Persona","persona",["william","shely"],{william:"William",shely:"Shely"}],
              ["Tipo","tipo",["ingreso","egreso"],{ingreso:"Ingreso",egreso:"Egreso"}],
              ["Forma de Pago","forma_pago",["DEBITO","CREDITO","EFECTIVO"],{DEBITO:"Débito",CREDITO:"Crédito",EFECTIVO:"Efectivo"}],
            ].map(([label,key,opts,labels])=>(
              <div key={key}>
                <div style={{color:P.muted,fontSize:11,marginBottom:4}}>{label}</div>
                <select value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} style={inputSt}>
                  {opts.map(o=><option key={o} value={o}>{labels[o]}</option>)}
                </select>
              </div>
            ))}
            <div>
              <div style={{color:P.muted,fontSize:11,marginBottom:4}}>Categoría</div>
              <select value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})} style={inputSt}>
                <option value="">— Seleccionar —</option>
                <optgroup label="Ingresos">{CATEGORIAS_INGRESO.map(c=><option key={c}>{c}</option>)}</optgroup>
                <optgroup label="Egresos">{CATEGORIAS_EGRESO.map(c=><option key={c}>{c}</option>)}</optgroup>
              </select>
            </div>
          </div>
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <button onClick={handleSave} disabled={saving} style={{background:P.accent,color:"#fff",border:"none",borderRadius:8,padding:"9px 24px",cursor:"pointer",fontWeight:700,fontSize:13,opacity:saving?0.7:1}}>
              {saving?"Guardando...":"✓ Guardar"}
            </button>
            <button onClick={()=>setShowForm(false)} style={{background:"transparent",color:P.muted,border:`1px solid ${P.border}`,borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:13}}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:16,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"95px 90px 1fr 85px 105px 80px 40px",padding:"11px 20px",borderBottom:`1px solid ${P.border}`,color:P.muted,fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>
          <span>Fecha</span><span>Persona</span><span>Categoría</span><span>Pago</span><span style={{textAlign:"right"}}>Importe</span><span style={{textAlign:"right"}}>Tipo</span><span></span>
        </div>
        {loading ? <Spinner /> : rows.length === 0 ? (
          <div style={{padding:40,textAlign:"center",color:P.muted}}>No hay transacciones con estos filtros</div>
        ) : rows.map((t,i)=>(
          <div key={t.id} style={{display:"grid",gridTemplateColumns:"95px 90px 1fr 85px 105px 80px 40px",padding:"11px 20px",borderBottom:i<rows.length-1?`1px solid ${P.border}22`:"none",alignItems:"center",transition:"background 0.12s"}}
            onMouseEnter={e=>e.currentTarget.style.background=P.surface}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <span style={{color:P.muted,fontSize:12}}>{t.fecha}</span>
            <span><Badge color={t.persona==="william"?P.green:P.yellow}>{t.persona==="william"?"William":"Shely"}</Badge></span>
            <span style={{color:P.text,fontSize:13}}>{t.categoria}</span>
            <span style={{color:P.muted,fontSize:11}}>{t.forma_pago}</span>
            <span style={{color:t.tipo==="ingreso"?P.green:P.red,fontSize:13,fontWeight:700,textAlign:"right",fontFamily:"monospace"}}>
              {t.tipo==="ingreso"?"+":"-"}{fmt(t.importe)}
            </span>
            <span style={{textAlign:"right"}}><Badge color={t.tipo==="ingreso"?P.green:P.red}>{t.tipo}</Badge></span>
            <span style={{textAlign:"center"}}>
              <button onClick={()=>handleDelete(t.id)} style={{background:"transparent",border:"none",color:P.muted,cursor:"pointer",fontSize:14,padding:"2px 6px"}} title="Eliminar">×</button>
            </span>
          </div>
        ))}
      </div>

      {/* Paginación */}
      <div style={{display:"flex",gap:10,justifyContent:"center"}}>
        <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} style={{background:P.card,border:`1px solid ${P.border}`,color:page===0?P.muted:P.text,borderRadius:8,padding:"7px 18px",cursor:page===0?"default":"pointer",fontSize:13}}>← Anterior</button>
        <span style={{color:P.muted,fontSize:13,padding:"7px 12px"}}>Página {page+1}</span>
        <button onClick={()=>setPage(p=>p+1)} disabled={rows.length<PER_PAGE} style={{background:P.card,border:`1px solid ${P.border}`,color:rows.length<PER_PAGE?P.muted:P.text,borderRadius:8,padding:"7px 18px",cursor:rows.length<PER_PAGE?"default":"pointer",fontSize:13}}>Siguiente →</button>
      </div>
    </div>
  );
};

// ─── TARJETAS ─────────────────────────────────────────────────────────────────
const Tarjetas = ({ anio }) => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  const CARD_COLORS = { "Oechsle MC":P.accent,"American Express":P.red,"Scotia MC":P.green,"Conti VISA":P.yellow,"Diners":P.purple };

  useEffect(() => {
    const load = async () => {
      const { data: txs } = await supabase
        .from("transactions").select("categoria,importe,tipo").eq("anio",anio);
      const { data: cardList } = await supabase.from("credit_cards").select("*");

      const gastosPorCard = {};
      const pagosPorCard  = {};
      (txs||[]).forEach(t => {
        const cardNames = Object.keys(CARD_COLORS);
        if (cardNames.includes(t.categoria)) {
          if (t.tipo === "egreso") gastosPorCard[t.categoria] = (gastosPorCard[t.categoria]||0)+t.importe;
          else pagosPorCard[t.categoria] = (pagosPorCard[t.categoria]||0)+t.importe;
        }
      });

      setCards((cardList||[]).map(c=>({
        ...c,
        gastos: gastosPorCard[c.nombre]||0,
        pagos:  pagosPorCard[c.nombre]||0,
        color:  CARD_COLORS[c.nombre]||P.accent,
      })));
      setLoading(false);
    };
    load();
  }, [anio]);

  if (loading) return <Spinner />;

  const totGastos = cards.reduce((a,c)=>a+c.gastos,0);
  const totPagos  = cards.reduce((a,c)=>a+c.pagos,0);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      <STitle sub={`Estado de tarjetas de crédito — ${anio}`}>Tarjetas de Crédito</STitle>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:16}}>
        {cards.map(card=>{
          const saldo = card.gastos - card.pagos;
          const pct = card.gastos > 0 ? Math.min((card.pagos/card.gastos)*100,100) : 0;
          return (
            <div key={card.id} style={{background:P.card,border:`1px solid ${card.color}33`,borderRadius:16,padding:24,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,right:0,width:90,height:90,background:`radial-gradient(circle at top right,${card.color}15,transparent 70%)`}} />
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
                <div>
                  <div style={{color:P.text,fontWeight:700,fontSize:15,marginBottom:6}}>{card.nombre}</div>
                  <Badge color={card.titular==="william"?P.green:P.yellow}>{card.titular==="william"?"William":"Shely"}</Badge>
                </div>
                <span style={{fontSize:24}}>💳</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
                {[["GASTOS",fmt(card.gastos),P.red],["PAGOS",fmt(card.pagos),P.green],["PENDIENTE",fmt(saldo),saldo>0?P.yellow:P.green]].map(([l,v,c])=>(
                  <div key={l}>
                    <div style={{color:P.muted,fontSize:9,marginBottom:3}}>{l}</div>
                    <div style={{color:c,fontWeight:700,fontSize:13,fontFamily:"monospace"}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{background:P.surface,borderRadius:6,height:6,overflow:"hidden"}}>
                <div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${card.color},${card.color}88)`,borderRadius:6,transition:"width 1s"}} />
              </div>
              <div style={{color:P.muted,fontSize:10,marginTop:5,textAlign:"right"}}>{pct.toFixed(0)}% pagado</div>
            </div>
          );
        })}
      </div>
      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
        <KPICard title="Total gastado en tarjetas" value={fmtK(totGastos)} color={P.red} />
        <KPICard title="Total pagado"              value={fmtK(totPagos)}  color={P.green} />
        <KPICard title="Saldo pendiente"           value={fmtK(totGastos-totPagos)} color={P.yellow} />
      </div>
    </div>
  );
};

// ─── COMPARATIVA ──────────────────────────────────────────────────────────────
const Comparativa = ({ anio }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: rows } = await supabase.from("transactions").select("mes,tipo,persona,importe").eq("anio",anio);
      const wM = Array(12).fill(0).map(()=>({ingr:0,egr:0}));
      const sM = Array(12).fill(0).map(()=>({ingr:0,egr:0}));
      (rows||[]).forEach(r=>{
        const m = r.mes-1;
        if(m<0||m>11) return;
        if(r.persona==="william") { if(r.tipo==="ingreso") wM[m].ingr+=r.importe; else wM[m].egr+=r.importe; }
        else { if(r.tipo==="ingreso") sM[m].ingr+=r.importe; else sM[m].egr+=r.importe; }
      });
      setData({ wM, sM });
      setLoading(false);
    };
    load();
  }, [anio]);

  if (loading) return <Spinner />;
  const { wM, sM } = data;

  const wTotIngr = wM.reduce((a,m)=>a+m.ingr,0);
  const wTotEgr  = wM.reduce((a,m)=>a+m.egr,0);
  const sTotIngr = sM.reduce((a,m)=>a+m.ingr,0);
  const sTotEgr  = sM.reduce((a,m)=>a+m.egr,0);

  const barData = MONTHS.map((n,i)=>({ name:n, William:Math.round(wM[i].ingr-wM[i].egr), Shely:Math.round(sM[i].ingr-sM[i].egr) }));

  return (
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      <STitle sub={`Análisis comparativo William vs Shely — ${anio}`}>Comparativa</STitle>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {[[wTotIngr,wTotEgr,"William",P.green],[sTotIngr,sTotEgr,"Shely",P.yellow]].map(([ingr,egr,name,color])=>(
          <div key={name} style={{background:P.card,border:`1px solid ${color}33`,borderRadius:16,padding:24}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:color}} />
              <span style={{color:P.text,fontWeight:700,fontSize:16}}>{name}</span>
            </div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              <KPICard title="Ingresos anuales" value={fmtK(ingr)} color={color} />
              <KPICard title="Egresos anuales"  value={fmtK(egr)}  color={P.red} />
              <KPICard title="Neto anual"        value={fmtK(ingr-egr)} color={(ingr-egr)>=0?P.green:P.red} />
            </div>
          </div>
        ))}
      </div>

      <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:16,padding:24}}>
        <STitle sub="Neto mensual por persona">Evolución del Neto</STitle>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} barSize={12}>
            <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
            <XAxis dataKey="name" tick={{fill:P.muted,fontSize:11}} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtK} tick={{fill:P.muted,fontSize:10}} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="William" fill={P.green}  radius={[4,4,0,0]} />
            <Bar dataKey="Shely"   fill={P.yellow} radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:16,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"60px repeat(6,1fr)",padding:"11px 20px",borderBottom:`1px solid ${P.border}`,color:P.muted,fontSize:10,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase"}}>
          <span>Mes</span>
          {[["W.Ingr",P.green],["W.Egr",P.red],["W.Neto",""],["S.Ingr",P.yellow],["S.Egr",P.red],["S.Neto",""]].map(([l,c])=>(
            <span key={l} style={{color:c||P.muted,textAlign:"right"}}>{l}</span>
          ))}
        </div>
        {MONTHS.map((m,i)=>{
          const wN = wM[i].ingr-wM[i].egr;
          const sN = sM[i].ingr-sM[i].egr;
          return (
            <div key={i} style={{display:"grid",gridTemplateColumns:"60px repeat(6,1fr)",padding:"10px 20px",borderBottom:i<11?`1px solid ${P.border}22`:"none",fontSize:12}}
              onMouseEnter={e=>e.currentTarget.style.background=P.surface}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{color:P.text,fontWeight:600}}>{m}</span>
              <span style={{color:P.green, textAlign:"right",fontFamily:"monospace"}}>{fmtK(wM[i].ingr)}</span>
              <span style={{color:P.red,   textAlign:"right",fontFamily:"monospace"}}>{fmtK(wM[i].egr)}</span>
              <span style={{color:wN>=0?P.green:P.red,textAlign:"right",fontFamily:"monospace",fontWeight:700}}>{wN>=0?"+":""}{fmtK(wN)}</span>
              <span style={{color:P.yellow,textAlign:"right",fontFamily:"monospace"}}>{fmtK(sM[i].ingr)}</span>
              <span style={{color:P.red,   textAlign:"right",fontFamily:"monospace"}}>{fmtK(sM[i].egr)}</span>
              <span style={{color:sN>=0?P.green:P.red,textAlign:"right",fontFamily:"monospace",fontWeight:700}}>{sN>=0?"+":""}{fmtK(sN)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── REPORTES ─────────────────────────────────────────────────────────────────
const Reportes = ({ anio, setAnio }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: rows } = await supabase.from("transactions").select("mes,tipo,importe,categoria").eq("anio",anio);
      const monthly = Array.from({length:12},()=>({ingr:0,egr:0}));
      const cats = {};
      (rows||[]).forEach(r=>{
        const m = r.mes-1; if(m<0||m>11) return;
        if(r.tipo==="ingreso") monthly[m].ingr+=r.importe;
        else { monthly[m].egr+=r.importe; cats[r.categoria]=(cats[r.categoria]||0)+r.importe; }
      });
      const topCats = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,10);
      const totIngr = monthly.reduce((a,m)=>a+m.ingr,0);
      const totEgr  = monthly.reduce((a,m)=>a+m.egr,0);
      setData({ monthly, topCats, totIngr, totEgr });
      setLoading(false);
    };
    load();
  }, [anio]);

  if (loading) return <Spinner />;
  const { monthly, topCats, totIngr, totEgr } = data;
  const maxCat = topCats[0]?.[1] || 1;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <STitle sub="Resumen anual completo">Reporte Anual</STitle>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <select value={anio} onChange={e=>setAnio(Number(e.target.value))}
            style={{...inputSt,width:"auto",padding:"7px 12px"}}>
            {[2020,2021,2022,2023,2024,2025].map(y=><option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
        <KPICard title={`Ingresos ${anio}`} value={fmtK(totIngr)} color={P.green} glow />
        <KPICard title={`Egresos ${anio}`}  value={fmtK(totEgr)}  color={P.red} />
        <KPICard title="Ahorro neto"         value={fmtK(totIngr-totEgr)} color={P.accent} trend={(totIngr-totEgr)>=0?"up":"down"} />
        <KPICard title="Tasa de ahorro"      value={totIngr>0?`${(((totIngr-totEgr)/totIngr)*100).toFixed(1)}%`:"-"} color={P.purple} />
      </div>

      <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:16,padding:24}}>
        <STitle sub="Por volumen de gasto acumulado">Ranking de Categorías</STitle>
        {topCats.length === 0 ? (
          <div style={{color:P.muted,textAlign:"center",padding:30}}>Sin datos para este año</div>
        ) : topCats.map(([name,total],i)=>{
          const colors = [P.accent,P.red,P.green,P.yellow,P.purple,"#F472B6","#34D399","#60A5FA","#FBBF24","#A78BFA"];
          return (
            <div key={i} style={{display:"grid",gridTemplateColumns:"160px 1fr 110px",alignItems:"center",gap:16,marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:colors[i],flexShrink:0}} />
                <span style={{color:P.text,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</span>
              </div>
              <div style={{background:P.surface,borderRadius:4,height:8,overflow:"hidden"}}>
                <div style={{width:`${(total/maxCat)*100}%`,height:"100%",background:`linear-gradient(90deg,${colors[i]},${colors[i]}88)`,borderRadius:4}} />
              </div>
              <span style={{color:colors[i],fontSize:13,fontWeight:700,fontFamily:"monospace",textAlign:"right"}}>{fmtK(total)}</span>
            </div>
          );
        })}
      </div>

      <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:16,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"70px repeat(4,1fr)",padding:"11px 20px",borderBottom:`1px solid ${P.border}`,color:P.muted,fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>
          <span>Mes</span><span style={{textAlign:"right"}}>Ingresos</span><span style={{textAlign:"right"}}>Egresos</span><span style={{textAlign:"right"}}>Neto</span><span style={{textAlign:"right"}}>Acum.</span>
        </div>
        {(() => {
          let acum = 0;
          return MONTHS.map((m,i)=>{
            const neto = monthly[i].ingr - monthly[i].egr;
            acum += neto;
            return (
              <div key={i} style={{display:"grid",gridTemplateColumns:"70px repeat(4,1fr)",padding:"10px 20px",borderBottom:i<11?`1px solid ${P.border}22`:"none",fontSize:12}}
                onMouseEnter={e=>e.currentTarget.style.background=P.surface}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{color:P.text,fontWeight:600}}>{m}</span>
                <span style={{color:P.green,textAlign:"right",fontFamily:"monospace"}}>{fmtK(monthly[i].ingr)}</span>
                <span style={{color:P.red,  textAlign:"right",fontFamily:"monospace"}}>{fmtK(monthly[i].egr)}</span>
                <span style={{color:neto>=0?P.green:P.red,textAlign:"right",fontFamily:"monospace",fontWeight:700}}>{neto>=0?"+":""}{fmtK(neto)}</span>
                <span style={{color:P.accent,textAlign:"right",fontFamily:"monospace"}}>{fmtK(acum)}</span>
              </div>
            );
          });
        })()}
        <div style={{display:"grid",gridTemplateColumns:"70px repeat(4,1fr)",padding:"12px 20px",background:P.surface,borderTop:`2px solid ${P.border}`,fontSize:13}}>
          <span style={{color:P.text,fontWeight:800}}>TOTAL</span>
          <span style={{color:P.green,textAlign:"right",fontFamily:"monospace",fontWeight:800}}>{fmtK(totIngr)}</span>
          <span style={{color:P.red,  textAlign:"right",fontFamily:"monospace",fontWeight:800}}>{fmtK(totEgr)}</span>
          <span style={{color:P.accent,textAlign:"right",fontFamily:"monospace",fontWeight:800}}>{fmtK(totIngr-totEgr)}</span>
          <span style={{color:P.muted,textAlign:"right"}}>—</span>
        </div>
      </div>
    </div>
  );
};

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]   = useState("dashboard");
  const [mes, setMes]   = useState(12);
  const [anio, setAnio] = useState(2020);

  const tabs = [
    { id:"dashboard",     label:"Dashboard",    icon:"◈" },
    { id:"transacciones", label:"Transacciones", icon:"⇄" },
    { id:"tarjetas",      label:"Tarjetas",      icon:"▣" },
    { id:"comparativa",   label:"Comparativa",   icon:"◫" },
    { id:"reportes",      label:"Reportes",      icon:"≡" },
  ];

  return (
    <div style={{background:P.bg,minHeight:"100vh",color:P.text,fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      {/* Header */}
      <div style={{borderBottom:`1px solid ${P.border}`,padding:"0 28px",position:"sticky",top:0,zIndex:100,background:P.bg+"F0",backdropFilter:"blur(12px)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",height:60,flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:32,height:32,background:`linear-gradient(135deg,${P.accent},${P.purple})`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff"}}>W</div>
            <div>
              <div style={{color:P.text,fontWeight:800,fontSize:15,letterSpacing:"-0.02em"}}>WRA & CTL</div>
              <div style={{color:P.muted,fontSize:10,letterSpacing:"0.08em"}}>PRESUPUESTO FAMILIAR</div>
            </div>
          </div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {tabs.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{background:tab===t.id?P.aGlow:"transparent",color:tab===t.id?P.accent:P.muted,border:tab===t.id?`1px solid ${P.accent}44`:"1px solid transparent",borderRadius:10,padding:"6px 14px",cursor:"pointer",fontSize:13,fontWeight:tab===t.id?700:500,transition:"all 0.15s",display:"flex",alignItems:"center",gap:5}}>
                <span>{t.icon}</span><span>{t.label}</span>
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {tab === "dashboard" && (
              <select value={mes} onChange={e=>setMes(Number(e.target.value))}
                style={{background:P.card,border:`1px solid ${P.border}`,color:P.text,borderRadius:8,padding:"6px 10px",fontSize:12,cursor:"pointer"}}>
                {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
              </select>
            )}
            <select value={anio} onChange={e=>setAnio(Number(e.target.value))}
              style={{background:P.card,border:`1px solid ${P.border}`,color:P.text,borderRadius:8,padding:"6px 10px",fontSize:12,cursor:"pointer"}}>
              {[2020,2021,2022,2023,2024,2025].map(y=><option key={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div style={{maxWidth:1280,margin:"0 auto",padding:"32px 28px 60px"}}>
        {tab==="dashboard"     && <Dashboard    anio={anio} mes={mes} />}
        {tab==="transacciones" && <Transacciones anio={anio} />}
        {tab==="tarjetas"      && <Tarjetas      anio={anio} />}
        {tab==="comparativa"   && <Comparativa   anio={anio} />}
        {tab==="reportes"      && <Reportes      anio={anio} setAnio={setAnio} />}
      </div>

      <div style={{borderTop:`1px solid ${P.border}`,padding:"14px 28px",display:"flex",justifyContent:"space-between",color:P.muted,fontSize:11}}>
        <span>WRA & CTL · Sistema de Presupuesto Familiar</span>
        <span>v1.0 · Conectado a Supabase</span>
      </div>
    </div>
  );
}
