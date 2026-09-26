/* Caja La 52 — sistema sencillo de caja para Internet La 52 */
(function () {
'use strict';
const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const SB = LOCAL ? '/rest/v1' : 'https://sbuyguoxwgpzsqtyhjaf.supabase.co/rest/v1';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidXlndW94d2dwenNxdHloamFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1OTEzODUsImV4cCI6MjA5NjE2NzM4NX0.YqZtDO1dBktJQ7Nu-AEBRWIoMGzDZISdcD5x-8z4U_U';
const app = document.getElementById('app');

/* ---------- utilidades ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => { const v = Math.round(Number(n) || 0); return (v < 0 ? '−$' : '$') + Math.abs(v).toLocaleString('es-CO'); };
const fmtS = n => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n));
const num = s => { const d = String(s ?? '').replace(/\D/g, ''); return d ? parseInt(d, 10) : 0; };
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const dt = iso => new Date(iso + 'T12:00:00Z');
const addDays = (iso, n) => { const d = dt(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const fFecha = iso => { const d = dt(iso); return `${DIA[d.getUTCDay()]} ${d.getUTCDate()} ${MES[d.getUTCMonth()]}`; };
const TIPOS = { venta: 'Venta', gasto: 'Gasto', retiro: 'Retiro', cambio: 'Cambio' };
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};

async function rpc(fn, args) {
  let r;
  try {
    r = await fetch(SB + '/rpc/' + fn, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(args || {}),
    });
  } catch (e) { throw new Error('Sin conexión a internet. No se guardó nada, intenta de nuevo.'); }
  const txt = await r.text();
  let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) {}
  if (!r.ok) {
    const m = (j && (j.message || j.error)) || 'Error ' + r.status;
    if (/^SESION:/.test(m)) { salir(true); throw new Error(m.replace(/^SESION:\s*/, '')); }
    throw new Error(m.replace(/^DUPLICADO:\s*/, ''));
  }
  return j;
}

let toastT;
function toast(msg, bad) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); document.body.appendChild(t); }
  t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = msg;
  clearTimeout(toastT); toastT = setTimeout(() => t.remove(), bad ? 4500 : 2600);
}

function modal(html, mount) {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="box">${html}</div>`;
  const close = () => { m.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(m);
  if (mount) mount(m.querySelector('.box'), close);
  const f = m.querySelector('input,textarea,select'); if (f) setTimeout(() => f.focus(), 50);
  return close;
}

// input de dinero: muestra 12.000 mientras escribe
function moneyInput(el) {
  el.addEventListener('input', () => {
    const d = el.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    el.value = d === '' ? '' : Number(d).toLocaleString('es-CO');
  });
}

/* ---------- estado ---------- */
const S = { token: null, yo: null, est: null, tab: 'hoy', f: null, rep: { per: 'hoy' }, hist: {} };
const nuevoForm = (tipo = 'venta') => ({ tipo, cat: '', monto: 0, medio: 'Efectivo', nota: '', dir: 'Nequi' });

function salir(silencioso) {
  if (S.token && !silencioso) rpc('cj_salir', { p_token: S.token }).catch(() => {});
  S.token = null; S.yo = null; S.est = null;
  store.del('caja_s');
  pantallaLogin();
}

/* ============ LOGIN ============ */
async function pantallaLogin() {
  clearInterval(S.poll);
  app.innerHTML = `<div class="login"><h1>Caja La 52</h1><p>¿Quién eres?</p><div class="users" id="us"><p class="muted">Cargando…</p></div></div>`;
  let us = [];
  try { us = await rpc('cj_usuarios_login'); } catch (e) {
    document.getElementById('us').innerHTML = `<div class="note bad" style="grid-column:1/-1">${esc(e.message)}</div>
      <button class="btn" style="grid-column:1/-1" onclick="location.reload()">Reintentar</button>`;
    return;
  }
  const box = document.getElementById('us');
  box.innerHTML = us.map(u => `<button data-u="${esc(u.id)}">${esc(u.nombre)}</button>`).join('');
  box.onclick = e => { const b = e.target.closest('[data-u]'); if (b) pedirPin(b.dataset.u, b.textContent); };
}

function pedirPin(id, nombre) {
  let pin = '';
  app.innerHTML = `<div class="login"><h1>Hola, ${esc(nombre)}</h1><p>Escribe tu clave</p>
    <div class="pin-dots" id="dots"></div>
    <div class="note bad hide" id="perr"></div>
    <div class="keypad" id="kp">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-k="${n}">${n}</button>`).join('')}
      <button data-k="back" aria-label="Borrar">⌫</button><button data-k="0">0</button><button data-k="ok" style="background:var(--pri);color:#fff">OK</button></div>
    <p class="center" style="margin-top:18px"><button class="lnk" id="volver">← Cambiar de usuario</button></p></div>`;
  const dots = document.getElementById('dots'), err = document.getElementById('perr');
  const pinta = () => { dots.innerHTML = Array.from({ length: Math.max(4, pin.length) }, (_, i) => `<i class="${i < pin.length ? 'f' : ''}"></i>`).join(''); };
  pinta();
  let enviando = false;
  const enviar = async () => {
    if (enviando || pin.length < 4) return;
    enviando = true;
    try {
      const r = await rpc('cj_login', { p_usuario: id, p_pin: pin });
      S.token = r.token; S.yo = r; store.set('caja_s', { token: r.token });
      S.tab = 'hoy'; S.f = nuevoForm();
      await principal();
    } catch (e) { err.textContent = e.message; err.classList.remove('hide'); pin = ''; pinta(); }
    enviando = false;
  };
  const tecla = k => {
    if (k === 'back') pin = pin.slice(0, -1);
    else if (k === 'ok') return enviar();
    else if (/^\d$/.test(k) && pin.length < 6) pin += k;
    err.classList.add('hide'); pinta();
  };
  document.getElementById('kp').onclick = e => { const b = e.target.closest('[data-k]'); if (b) tecla(b.dataset.k); };
  document.getElementById('volver').onclick = pantallaLogin;
  const onKey = e => {
    if (!document.getElementById('kp')) return document.removeEventListener('keydown', onKey);
    if (/^\d$/.test(e.key)) tecla(e.key); else if (e.key === 'Backspace') tecla('back'); else if (e.key === 'Enter') tecla('ok');
  };
  document.addEventListener('keydown', onKey);
}

/* ============ PRINCIPAL ============ */
const esAdmin = () => S.est && S.est.yo.rol === 'admin';

async function principal() {
  try { S.est = await rpc('cj_estado', { p_token: S.token }); } catch (e) {
    if (!S.token) return; // la sesión venció: ya se mostró el login
    app.innerHTML = `<div class="login"><h1>Caja La 52</h1><div class="note bad">${esc(e.message)}</div><button class="btn full" onclick="location.reload()">Reintentar</button></div>`;
    return;
  }
  S.yo = S.est.yo;
  if (!S.f) S.f = nuevoForm();
  pintarMarco();
  clearInterval(S.poll);
  S.poll = setInterval(() => { if (S.tab === 'hoy' && !document.hidden && !document.querySelector('.modal')) refrescarHoy(true); }, 30000);
}

function pintarMarco() {
  const tabs = esAdmin() ? [['hoy', 'Hoy'], ['rep', 'Reportes'], ['hist', 'Historial'], ['aj', 'Ajustes']] : [];
  app.innerHTML = `<header class="top"><div class="in"><b>Caja La 52</b><span class="who">${esc(S.yo.nombre)}</span>
      ${esAdmin() ? '' : '<button class="lnk" id="miClave">Mi clave</button>'}<button class="lnk" id="salir">Salir</button></div>
      ${tabs.length ? `<nav class="tabs">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${S.tab === k ? 'on' : ''}">${l}</button>`).join('')}</nav>` : ''}
    </header><div class="wrap" id="main"></div>`;
  document.getElementById('salir').onclick = () => salir();
  const mc = document.getElementById('miClave'); if (mc) mc.onclick = cambiarMiClave;
  app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { S.tab = b.dataset.tab; pintarMarco(); });
  const main = document.getElementById('main');
  if (S.tab === 'rep') return vistaReportes(main);
  if (S.tab === 'hist') return vistaHistorial(main);
  if (S.tab === 'aj') return vistaAjustes(main);
  vistaHoy(main);
}

/* ---------- HOY / CAJA ---------- */
function vistaHoy(main) {
  main.innerHTML = esAdmin() ? `<div id="cajaBox"></div><div id="resumen"></div><div class="card" id="regBox"></div>` : `<div id="cajaBox"></div><div class="card" id="regBox"></div><div id="resumen"></div>`;
  main.innerHTML += `
    <div class="card"><h2>${esAdmin() ? 'Movimientos de hoy' : 'Mis registros de hoy'}</h2><ul class="list" id="movs"></ul></div>
    <div id="cierreBox"></div>`;
  pintarForm();
  pintarHoy();
}

async function refrescarHoy(silencioso) {
  try { S.est = await rpc('cj_estado', { p_token: S.token }); pintarHoy(); } catch (e) { if (!silencioso) toast(e.message, true); }
}

function pintarHoy() {
  const E = S.est, c = E.caja, box = document.getElementById('cajaBox');
  if (!box) return;
  // estado de la caja
  if (!c) {
    box.innerHTML = `<div class="card"><h2>☀️ Abrir la caja de hoy</h2><p class="muted">¿Con cuánto efectivo arranca el cajón? (la base)</p>
      <div class="row" style="margin-top:10px"><input class="inp grow money" id="base" inputmode="numeric" placeholder="$0"><button class="btn" id="abrir">Abrir caja</button></div></div>`;
    moneyInput(document.getElementById('base'));
    document.getElementById('abrir').onclick = async ev => {
      ev.target.disabled = true;
      try { await rpc('cj_abrir_caja', { p_token: S.token, p_base: num(document.getElementById('base').value) }); toast('Caja abierta ✓'); await refrescarHoy(); }
      catch (e) { toast(e.message, true); ev.target.disabled = false; }
    };
  } else if (c.cerrada) {
    box.innerHTML = `<div class="card"><h2>🔒 La caja de hoy ya se cerró</h2>${resultadoCierre(c)}
      ${esAdmin() ? '<button class="btn sec full" id="reabrir">Reabrir la caja de hoy</button>' : '<p class="muted" style="margin-top:8px">Si falta registrar algo, pídele a Iván que la reabra.</p>'}</div>`;
    const rb = document.getElementById('reabrir');
    if (rb) rb.onclick = async () => { if (!confirmar('¿Reabrir la caja de hoy? Se borra el conteo del cierre.')) return; try { await rpc('cj_reabrir_caja', { p_token: S.token, p_fecha: E.hoy }); await refrescarHoy(); } catch (e) { toast(e.message, true); } };
  } else {
    box.innerHTML = `<div class="note info">Caja abierta por ${esc(c.abierta_por || '')} con base de <b>${fmt(c.base)}</b> · <button class="lnk" id="cambiaBase" style="padding:0">cambiar base</button></div>`;
    document.getElementById('cambiaBase').onclick = () => modal(`<h3>Base de la caja</h3><p class="muted">Efectivo con el que arrancó el cajón hoy.</p>
      <input class="inp money" id="nb" inputmode="numeric" value="${c.base ? Number(c.base).toLocaleString('es-CO') : ''}" style="margin-top:10px">
      <button class="btn full" id="gb">Guardar</button><button class="btn sec full" data-close>Cancelar</button>`, (b, close) => {
      moneyInput(b.querySelector('#nb'));
      b.querySelector('#gb').onclick = async () => { try { await rpc('cj_abrir_caja', { p_token: S.token, p_base: num(b.querySelector('#nb').value) }); close(); await refrescarHoy(); } catch (e) { toast(e.message, true); } };
    });
  }
  document.getElementById('regBox').classList.toggle('hide', !!(c && c.cerrada));

  // resumen
  const res = document.getElementById('resumen');
  if (esAdmin()) {
    const d = E.dia;
    res.innerHTML = `<div class="stats s4" style="margin-top:12px">
        ${stat('Ventas hoy', fmt(d.ventas), d.n_ventas + ' ventas')}
        ${stat('Gastos', fmt(d.gastos), '', d.gastos ? 'neg' : '')}
        ${stat('Retiros', fmt(d.retiros))}
        ${stat('Ganancia del día', fmt(d.ventas - d.gastos), '', d.ventas - d.gastos >= 0 ? 'pos' : 'neg')}</div>
      <div class="stats" style="margin-top:10px">
        ${stat('💵 Debe haber en el cajón', fmt(E.esperado_ef), 'base + efectivo que entró − lo que salió')}
        ${stat('📱 Nequi del día', fmt(E.nequi_dia), 'ventas por Nequi ± cambios')}</div>
      ${tablaBonos(E.bonos, 'Bonos de esta semana')}`;
  } else {
    const b = E.mi_bono;
    res.innerHTML = `<div class="stats" style="margin-top:12px">
      ${stat('Hoy llevas', fmt(E.mio.ventas), E.mio.n + (E.mio.n === 1 ? ' venta' : ' ventas'))}
      ${b ? stat('Tu puesto esta semana', b.puesto + '°', b.puesto <= 2 && b.ventas > 0 ? 'Bono estimado ' + fmt(b.bono) + ' 🎉' : 'Los 2 primeros ganan 3,5% de bono') : ''}</div>`;
  }

  // movimientos
  const ul = document.getElementById('movs');
  ul.innerHTML = E.movs.length ? E.movs.map(m => filaMov(m, true)).join('') : '<li class="muted">Todavía no hay registros hoy.</li>';
  ul.onclick = e => { const b = e.target.closest('[data-anular],[data-editar]'); if (!b) return; const m = E.movs.find(x => x.id == (b.dataset.anular || b.dataset.editar)); if (b.dataset.anular) anular(m); else editar(m); };

  // cierre
  const cb = document.getElementById('cierreBox');
  cb.innerHTML = c && !c.cerrada ? `<button class="btn sec full" id="cerrar">🔒 Cerrar la caja (fin del día)</button>` : '';
  const cr = document.getElementById('cerrar'); if (cr) cr.onclick = cerrarCaja;
}

const stat = (t, v, s, cls) => `<div class="stat"><span>${t}</span><b class="${cls || ''}">${v}</b>${s ? `<span style="font-weight:400">${esc(s)}</span>` : ''}</div>`;

function resultadoCierre(c) {
  const d = c.diferencia;
  const msg = d === 0 ? `<div class="note ok">✅ <b>La caja cuadró exacto.</b></div>`
    : d > 0 ? `<div class="note warn">⚠️ <b>Sobran ${fmt(d)}</b> en el cajón.</div>`
      : `<div class="note bad">❌ <b>Faltan ${fmt(-d)}</b> en el cajón.</div>`;
  return `${msg}<table class="t" style="margin-top:10px">
    <tr><td>Debía haber en efectivo</td><td class="n">${fmt(c.esperado)}</td></tr>
    <tr><td>Se contó</td><td class="n">${fmt(c.contado)}</td></tr>
    <tr><td>Nequi del día</td><td class="n">${fmt(c.nequi_dia ?? c.nequi)}</td></tr>
    ${c.cerrada_por ? `<tr><td>Cerró</td><td class="n">${esc(c.cerrada_por)}</td></tr>` : ''}</table>`;
}

function filaMov(m, hoy) {
  const puedeAnular = !m.anulado && (esAdmin() || (hoy && m.usuario_id === S.yo.id && Date.now() - new Date(m.creado).getTime() < 15 * 60000));
  const signo = m.tipo === 'venta' ? '' : m.tipo === 'cambio' ? '⇄ ' : '−';
  const detalle = m.tipo === 'cambio' ? (m.medio === 'Nequi' ? 'Recibió Nequi, entregó efectivo' : 'Recibió efectivo, envió Nequi') : (m.categoria || TIPOS[m.tipo]);
  return `<li class="${m.anulado ? 'anul' : ''}"><div class="d"><div><span class="tag ${m.tipo}">${TIPOS[m.tipo]}</span> ${esc(detalle)}</div>
    <div>${m.fecha && !hoy ? fFecha(m.fecha) + ' · ' : ''}${esc(m.hora)} · ${esc(m.medio)}${esAdmin() ? ' · ' + esc(m.usuario) : ''}${m.nota ? ' · ' + esc(m.nota) : ''}
    ${m.anulado ? `<br>Anulado por ${esc(m.anulado_por || '')}${m.anulado_motivo ? ': ' + esc(m.anulado_motivo) : ''}` : ''}
    ${m.editado_por ? `<br>Corregido por ${esc(m.editado_por)}: ${esc(m.editado_motivo || '')}${m.original ? ' (antes ' + fmt(m.original.monto) + ')' : ''}` : ''}</div></div>
    <div class="m ${m.tipo === 'venta' ? 'pos' : m.tipo === 'cambio' ? '' : 'neg'}">${signo}${fmt(m.monto)}</div>
    ${esAdmin() && !m.anulado ? `<button class="lnk" data-editar="${m.id}" title="Corregir">✏️</button>` : ''}
    ${puedeAnular ? `<button class="lnk" data-anular="${m.id}" title="Anular">✕</button>` : ''}</li>`;
}

/* ---------- formulario de registro ---------- */
function pintarForm() {
  const box = document.getElementById('regBox'), f = S.f, cats = S.est.cats;
  const quick = [1000, 2000, 3000, 5000, 10000, 20000, 50000];
  let cuerpo = '';
  if (f.tipo === 'venta' || f.tipo === 'gasto') {
    const lista = f.tipo === 'venta' ? cats.venta : cats.gasto;
    cuerpo += `<span class="lbl">${f.tipo === 'venta' ? '¿Qué vendiste?' : '¿En qué se gastó?'}</span>
      <div class="chips" id="cats">${lista.map(n => `<button class="chip ${f.cat === n ? 'on' : ''}" data-cat="${esc(n)}">${esc(n)}</button>`).join('')}</div>`;
  }
  if (f.tipo === 'retiro') cuerpo += `<p class="muted" style="margin-top:10px">Plata que <b>sale de la caja</b> sin ser un gasto: la que se lleva Iván, una consignación, etc.</p>`;
  if (f.tipo === 'cambio') cuerpo += `<span class="lbl">¿Qué pasó?</span><div class="seg" id="dir">
      <button data-dir="Nequi" class="${f.dir === 'Nequi' ? 'on' : ''}">Me pasaron Nequi,<br>entregué efectivo</button>
      <button data-dir="Efectivo" class="${f.dir === 'Efectivo' ? 'on' : ''}">Me dieron efectivo,<br>envié Nequi</button></div>`;
  cuerpo += `<span class="lbl">Valor</span><input class="inp money" id="monto" inputmode="numeric" autocomplete="off" placeholder="$0" value="${f.monto ? f.monto.toLocaleString('es-CO') : ''}">
    <div class="chips" style="margin-top:8px" id="quick">${quick.map(q => `<button class="chip" data-q="${q}">${(q / 1000)}.000</button>`).join('')}</div>`;
  if (f.tipo !== 'cambio') cuerpo += `<span class="lbl">¿Cómo ${f.tipo === 'venta' ? 'pagaron' : 'salió la plata'}?</span>
    <div class="seg" id="medio"><button data-m="Efectivo" class="${f.medio === 'Efectivo' ? 'on' : ''}">💵 Efectivo</button><button data-m="Nequi" class="${f.medio === 'Nequi' ? 'on' : ''}">📱 Nequi</button></div>`;
  const ph = { venta: 'Nota (opcional)', gasto: 'Detalle: almuerzo, resma de papel… ', retiro: '¿Quién se la llevó o para qué?', cambio: 'Nota (opcional)' }[f.tipo];
  cuerpo += `<span class="lbl">Nota</span><input class="inp" id="nota" maxlength="200" placeholder="${ph}" value="${esc(f.nota)}">`;
  const txtBtn = { venta: 'Guardar venta', gasto: 'Guardar gasto', retiro: 'Guardar retiro', cambio: 'Guardar cambio' }[f.tipo];
  box.innerHTML = `<div class="big-actions">
      <button class="act venta ${f.tipo === 'venta' ? 'on' : ''}" data-t="venta">＋ Venta<small>entra plata</small></button>
      <button class="act ${f.tipo === 'gasto' ? 'on' : ''}" data-t="gasto">− Gasto<small>almuerzo, papelería…</small></button>
      <button class="act ${f.tipo === 'retiro' ? 'on' : ''}" data-t="retiro">↑ Retiro<small>sacar plata de la caja</small></button>
      <button class="act ${f.tipo === 'cambio' ? 'on' : ''}" data-t="cambio">⇄ Cambio<small>Nequi ↔ efectivo</small></button></div>
    ${cuerpo}<button class="btn full ${f.tipo === 'venta' ? 'ok' : f.tipo === 'cambio' ? '' : 'bad'}" id="guardar">${txtBtn}</button>`;
  const montoEl = box.querySelector('#monto');
  moneyInput(montoEl);
  montoEl.addEventListener('input', () => { f.monto = num(montoEl.value); });
  montoEl.addEventListener('keydown', e => { if (e.key === 'Enter') guardar(); });
  box.querySelector('#nota').addEventListener('input', e => { f.nota = e.target.value; });
  box.onclick = e => {
    const t = e.target.closest('[data-t],[data-cat],[data-q],[data-m],[data-dir]');
    if (!t) return;
    if (t.dataset.t) { S.f = nuevoForm(t.dataset.t); return pintarForm(); }
    if (t.dataset.cat) { f.cat = t.dataset.cat; box.querySelectorAll('[data-cat]').forEach(x => x.classList.toggle('on', x === t)); montoEl.focus(); return; }
    if (t.dataset.q) { f.monto = +t.dataset.q; montoEl.value = f.monto.toLocaleString('es-CO'); return; }
    if (t.dataset.m) { f.medio = t.dataset.m; box.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === t)); return; }
    if (t.dataset.dir) { f.dir = t.dataset.dir; box.querySelectorAll('[data-dir]').forEach(x => x.classList.toggle('on', x === t)); }
  };
  box.querySelector('#guardar').onclick = guardar;
}

let guardando = false;
async function guardar() {
  if (guardando) return;
  const f = S.f;
  if ((f.tipo === 'venta' || f.tipo === 'gasto') && !f.cat) return toast(f.tipo === 'venta' ? 'Toca qué vendiste' : 'Toca en qué se gastó', true);
  if (!f.monto) return toast('Escribe el valor', true);
  if (f.tipo === 'retiro' && !f.nota.trim()) return toast('Escribe quién se llevó la plata o para qué', true);
  if (f.monto >= 1000000 && !confirmar(`¿Seguro? El valor es ${fmt(f.monto)}`)) return;
  guardando = true;
  const btn = document.getElementById('guardar'); if (btn) btn.disabled = true;
  try {
    const medio = f.tipo === 'cambio' ? f.dir : f.medio;
    const cat = f.tipo === 'cambio' ? 'Cambio Nequi/efectivo' : f.tipo === 'retiro' ? 'Retiro' : f.cat;
    const r = await rpc('cj_registrar', { p_token: S.token, p_tipo: f.tipo, p_medio: medio, p_categoria: cat, p_monto: f.monto, p_nota: f.nota.trim() });
    toast(`✓ ${TIPOS[r.tipo]} de ${fmt(r.monto)} guardado`);
    const tipo = f.tipo; S.f = nuevoForm(tipo); if (tipo !== 'venta') S.f = nuevoForm('venta');
    pintarForm();
    await refrescarHoy(true);
  } catch (e) { toast(e.message, true); }
  guardando = false;
  const b2 = document.getElementById('guardar'); if (b2) b2.disabled = false;
}

function confirmar(msg) { return window.confirm(msg); }

function anular(m) {
  modal(`<h3>Anular registro</h3><p class="muted">${TIPOS[m.tipo]} de <b>${fmt(m.monto)}</b> · ${esc(m.categoria)} · ${esc(m.hora)}</p>
    <span class="lbl">¿Por qué se anula?</span><input class="inp" id="mot" maxlength="200" placeholder="Ej: lo registré dos veces">
    <button class="btn bad full" id="ok">Anular</button><button class="btn sec full" data-close>Cancelar</button>`, (b, close) => {
    b.querySelector('#ok').onclick = async () => {
      try { await rpc('cj_anular', { p_token: S.token, p_id: m.id, p_motivo: b.querySelector('#mot').value }); close(); toast('Registro anulado'); if (S.tab === 'hist') cargarHist(); else refrescarHoy(); }
      catch (e) { toast(e.message, true); }
    };
  });
}

function editar(m) {
  const lista = m.tipo === 'venta' ? S.est.cats.venta : m.tipo === 'gasto' ? S.est.cats.gasto : [m.categoria];
  const opts = [...new Set([m.categoria, ...lista])].map(n => `<option ${n === m.categoria ? 'selected' : ''}>${esc(n)}</option>`).join('');
  modal(`<h3>Corregir ${TIPOS[m.tipo].toLowerCase()}</h3><p class="muted">${m.fecha ? fFecha(m.fecha) + ' · ' : ''}${esc(m.hora)} · ${esc(m.usuario)}</p>
    <span class="lbl">Valor</span><input class="inp money" id="em" inputmode="numeric" value="${Number(m.monto).toLocaleString('es-CO')}">
    <span class="lbl">Medio</span><select class="inp" id="emed"><option ${m.medio === 'Efectivo' ? 'selected' : ''}>Efectivo</option><option ${m.medio === 'Nequi' ? 'selected' : ''}>Nequi</option></select>
    ${m.tipo === 'venta' || m.tipo === 'gasto' ? `<span class="lbl">Categoría</span><select class="inp" id="ecat">${opts}</select>` : ''}
    <span class="lbl">Nota</span><input class="inp" id="enota" maxlength="200" value="${esc(m.nota)}">
    <span class="lbl">Motivo de la corrección *</span><input class="inp" id="emot" maxlength="200" placeholder="Ej: era 5.000 no 50.000">
    <button class="btn full" id="ok">Guardar corrección</button><button class="btn sec full" data-close>Cancelar</button>`, (b, close) => {
    moneyInput(b.querySelector('#em'));
    b.querySelector('#ok').onclick = async () => {
      try {
        await rpc('cj_editar', { p_token: S.token, p_id: m.id, p_monto: num(b.querySelector('#em').value), p_medio: b.querySelector('#emed').value,
          p_categoria: b.querySelector('#ecat') ? b.querySelector('#ecat').value : m.categoria, p_nota: b.querySelector('#enota').value, p_motivo: b.querySelector('#emot').value });
        close(); toast('Corregido ✓'); if (S.tab === 'hist') cargarHist(); else refrescarHoy();
      } catch (e) { toast(e.message, true); }
    };
  });
}

function cerrarCaja() {
  modal(`<h3>🔒 Cerrar la caja</h3><p class="muted">Cuenta <b>todo el efectivo</b> que hay en el cajón (incluida la base) y escríbelo.</p>
    <input class="inp money" id="cont" inputmode="numeric" placeholder="$0" style="margin-top:12px">
    <span class="lbl">Nota (opcional)</span><input class="inp" id="cnota" maxlength="300" placeholder="Algo que Iván deba saber">
    <button class="btn full" id="ok">Cerrar caja</button><button class="btn sec full" data-close>Cancelar</button>`, (b, close) => {
    moneyInput(b.querySelector('#cont'));
    b.querySelector('#ok').onclick = async ev => {
      const v = b.querySelector('#cont').value;
      if (v.trim() === '') return toast('Escribe cuánto efectivo contaste (si no hay nada, escribe 0)', true);
      ev.target.disabled = true;
      try {
        const r = await rpc('cj_cerrar_caja', { p_token: S.token, p_contado: num(v), p_nota: b.querySelector('#cnota').value });
        b.innerHTML = `<h3>Caja cerrada</h3>${resultadoCierre({ ...r, cerrada_por: S.yo.nombre })}<button class="btn full" data-close>Listo</button>`;
        refrescarHoy(true);
      } catch (e) { toast(e.message, true); ev.target.disabled = false; }
    };
  });
}

function tablaBonos(lista, titulo) {
  if (!lista || !lista.length) return '';
  return `<div class="card"><h2>🏆 ${titulo}</h2><table class="t"><tr><th>#</th><th>Empleado</th><th class="n">Ventas</th><th class="n">Bono 3,5%</th></tr>
    ${lista.map(b => `<tr><td>${b.puesto}</td><td>${esc(b.nombre)}</td><td class="n">${fmt(b.ventas)}</td><td class="n ${b.bono ? 'pos' : 'muted'}">${b.bono ? fmt(b.bono) : '—'}</td></tr>`).join('')}</table>
    <p class="muted" style="margin-top:6px">Semana de lunes a domingo. Los 2 primeros ganan el 3,5% de lo que vendieron.</p></div>`;
}

function cambiarMiClave() {
  modal(`<h3>Cambiar mi clave</h3><span class="lbl">Clave actual</span><input class="inp" id="a" type="password" inputmode="numeric" maxlength="6">
    <span class="lbl">Clave nueva (4 a 6 números)</span><input class="inp" id="n" type="password" inputmode="numeric" maxlength="6">
    <button class="btn full" id="ok">Cambiar</button><button class="btn sec full" data-close>Cancelar</button>`, (b, close) => {
    b.querySelector('#ok').onclick = async () => {
      try { await rpc('cj_cambiar_pin', { p_token: S.token, p_actual: b.querySelector('#a').value, p_nuevo: b.querySelector('#n').value }); close(); toast('Clave cambiada ✓'); }
      catch (e) { toast(e.message, true); }
    };
  });
}

/* ---------- REPORTES ---------- */
function rango(per) {
  const h = S.est.hoy, d = dt(h);
  const lunes = addDays(h, -((d.getUTCDay() + 6) % 7));
  const ini = h.slice(0, 8) + '01';
  const iniAnt = (() => { const x = dt(ini); x.setUTCMonth(x.getUTCMonth() - 1); return x.toISOString().slice(0, 10); })();
  return {
    hoy: [h, h], ayer: [addDays(h, -1), addDays(h, -1)], semana: [lunes, h], mes: [ini, h], mesant: [iniAnt, addDays(ini, -1)],
  }[per] || [S.rep.desde || h, S.rep.hasta || h];
}

function vistaReportes(main) {
  const pers = [['hoy', 'Hoy'], ['ayer', 'Ayer'], ['semana', 'Esta semana'], ['mes', 'Este mes'], ['mesant', 'Mes pasado'], ['rango', 'Otras fechas']];
  const [d1, d2] = rango(S.rep.per);
  main.innerHTML = `<div class="card"><div class="chips" id="pers">${pers.map(([k, l]) => `<button class="chip ${S.rep.per === k ? 'on' : ''}" data-p="${k}">${l}</button>`).join('')}</div>
    <div class="row ${S.rep.per === 'rango' ? '' : 'hide'}" style="margin-top:10px"><input type="date" class="inp grow" id="d1" value="${d1}"><input type="date" class="inp grow" id="d2" value="${d2}"><button class="btn" id="ver">Ver</button></div></div>
    <div id="rep"><p class="muted" style="margin-top:14px">Cargando…</p></div>`;
  main.querySelector('#pers').onclick = e => { const b = e.target.closest('[data-p]'); if (b) { S.rep.per = b.dataset.p; vistaReportes(main); } };
  const v = main.querySelector('#ver');
  v.onclick = () => { S.rep.desde = main.querySelector('#d1').value; S.rep.hasta = main.querySelector('#d2').value; vistaReportes(main); };
  cargarReporte(d1, d2);
}

async function cargarReporte(d1, d2) {
  const box = document.getElementById('rep');
  let R;
  try { R = await rpc('cj_reporte', { p_token: S.token, p_desde: d1, p_hasta: d2 }); } catch (e) { box.innerHTML = `<div class="note bad">${esc(e.message)}</div>`; return; }
  const T = R.tot, gan = T.ventas - T.gastos;
  const maxE = Math.max(1, ...R.por_empleado.map(x => x.ventas));
  const maxC = Math.max(1, ...R.por_cat_venta.map(x => x.total));
  const titulo = d1 === d2 ? fFecha(d1) : `${fFecha(d1)} al ${fFecha(d2)}`;
  const faltas = R.cajas.filter(c => c.cerrada && c.diferencia).reduce((a, c) => a + c.diferencia, 0);
  box.innerHTML = `<p class="muted" style="margin-top:14px">${titulo}</p>
    <div class="stats s4" style="margin-top:6px">
      ${stat('Ventas', fmt(T.ventas), T.n_ventas + ' ventas' + (T.dias > 1 ? ' · ' + fmt(T.ventas / T.dias) + '/día' : ''))}
      ${stat('Gastos', fmt(T.gastos), '', T.gastos ? 'neg' : '')}
      ${stat('Ganancia', fmt(gan), 'ventas − gastos', gan >= 0 ? 'pos' : 'neg')}
      ${stat('Retiros', fmt(T.retiros), 'plata que salió para ti')}</div>
    <div class="stats" style="margin-top:10px">${stat('💵 Vendido en efectivo', fmt(T.ventas_ef))}${stat('📱 Vendido por Nequi', fmt(T.ventas_nq))}</div>
    <div class="card"><h2>Por empleado</h2>${R.por_empleado.length ? R.por_empleado.map(x => `<div style="margin-bottom:10px"><div class="row"><b class="grow">${esc(x.nombre)}</b><span>${fmt(x.ventas)} <span class="muted">· ${x.n}</span></span></div><div class="bar"><i style="width:${x.ventas / maxE * 100}%"></i></div></div>`).join('') : '<p class="muted">Sin ventas.</p>'}</div>
    <div class="card"><h2>Lo que más se vende</h2>${R.por_cat_venta.length ? R.por_cat_venta.map(x => `<div style="margin-bottom:10px"><div class="row"><span class="grow">${esc(x.categoria)}</span><span>${fmt(x.total)} <span class="muted">· ${x.n}</span></span></div><div class="bar"><i style="width:${x.total / maxC * 100}%"></i></div></div>`).join('') : '<p class="muted">Sin ventas.</p>'}</div>
    <div class="card"><h2>Gastos</h2>${R.por_cat_gasto.length ? `<table class="t">${R.por_cat_gasto.map(x => `<tr><td>${esc(x.categoria)}</td><td class="n">${fmt(x.total)}</td></tr>`).join('')}</table>` : '<p class="muted">No se registraron gastos. Recuerda anotar todo lo que sale de la caja.</p>'}</div>
    ${R.por_dia.length > 1 ? `<div class="card"><h2>Día por día</h2><table class="t"><tr><th>Día</th><th class="n">Ventas</th><th class="n">Gastos</th><th class="n">Retiros</th></tr>
      ${R.por_dia.map(x => `<tr><td>${fFecha(x.fecha)}</td><td class="n">${fmt(x.ventas)}</td><td class="n">${x.gastos ? fmt(x.gastos) : '—'}</td><td class="n">${x.retiros ? fmt(x.retiros) : '—'}</td></tr>`).join('')}</table></div>` : ''}
    <div class="card"><h2>Cierres de caja</h2>${R.cajas.length ? `<table class="t"><tr><th>Día</th><th class="n">Debía haber</th><th class="n">Contado</th><th class="n">Diferencia</th></tr>
      ${R.cajas.map(c => `<tr><td>${fFecha(c.fecha)}<br><span class="muted">${c.cerrada ? 'cerró ' + esc(c.cerrada_por || '') : 'sin cerrar'}</span></td><td class="n">${c.cerrada ? fmt(c.esperado) : '—'}</td><td class="n">${c.cerrada ? fmt(c.contado) : '—'}</td>
        <td class="n ${c.diferencia > 0 ? 'pos' : c.diferencia < 0 ? 'neg' : ''}">${c.cerrada ? (c.diferencia === 0 ? 'Cuadró ✓' : fmtS(c.diferencia)) : '—'}</td></tr>${c.nota ? `<tr><td colspan="4" class="muted">📝 ${esc(c.nota)}</td></tr>` : ''}`).join('')}</table>
      ${faltas ? `<p class="${faltas < 0 ? 'neg' : 'pos'}" style="margin-top:8px"><b>Total ${faltas < 0 ? 'faltante' : 'sobrante'}: ${fmt(Math.abs(faltas))}</b></p>` : ''}` : '<p class="muted">No hay cajas en estas fechas.</p>'}</div>
    ${tablaBonos(R.bonos, 'Bonos semana del ' + fFecha(R.semana))}${tablaBonos(R.bonos_ant, 'Bonos semana anterior')}`;
}

/* ---------- HISTORIAL ---------- */
function vistaHistorial(main) {
  const H = S.hist;
  if (!H.desde) { H.hasta = S.est.hoy; H.desde = addDays(S.est.hoy, -6); H.tipo = ''; H.q = ''; }
  main.innerHTML = `<div class="card"><div class="row"><input type="date" class="inp grow" id="h1" value="${H.desde}"><input type="date" class="inp grow" id="h2" value="${H.hasta}"></div>
    <div class="row" style="margin-top:8px"><select class="inp grow" id="ht"><option value="">Todo</option>${Object.entries(TIPOS).map(([k, l]) => `<option value="${k}" ${H.tipo === k ? 'selected' : ''}>${l}s</option>`).join('')}<option value="anulado" ${H.tipo === 'anulado' ? 'selected' : ''}>Anulados</option></select>
    <input class="inp grow" id="hq" placeholder="Buscar: nombre, servicio, nota" value="${esc(H.q)}"></div></div>
    <div class="card"><div id="htot" class="muted"></div><ul class="list" id="hl"><li class="muted">Cargando…</li></ul></div>`;
  const upd = () => { H.desde = main.querySelector('#h1').value; H.hasta = main.querySelector('#h2').value; H.tipo = main.querySelector('#ht').value; cargarHist(); };
  main.querySelector('#h1').onchange = upd; main.querySelector('#h2').onchange = upd; main.querySelector('#ht').onchange = () => { H.tipo = main.querySelector('#ht').value; filtrarHist(); };
  main.querySelector('#hq').oninput = e => { H.q = e.target.value; filtrarHist(); };
  main.querySelector('#hl').onclick = e => { const b = e.target.closest('[data-anular],[data-editar]'); if (!b) return; const m = (H.data || []).find(x => x.id == (b.dataset.anular || b.dataset.editar)); if (b.dataset.anular) anular(m); else editar(m); };
  cargarHist();
}
async function cargarHist() {
  const H = S.hist;
  try { H.data = await rpc('cj_movimientos', { p_token: S.token, p_desde: H.desde, p_hasta: H.hasta }); filtrarHist(); }
  catch (e) { const l = document.getElementById('hl'); if (l) l.innerHTML = `<li class="neg">${esc(e.message)}</li>`; }
}
function filtrarHist() {
  const H = S.hist, l = document.getElementById('hl'); if (!l || !H.data) return;
  const q = H.q.trim().toLowerCase();
  const rows = H.data.filter(m => (H.tipo === 'anulado' ? m.anulado : (!H.tipo || m.tipo === H.tipo))
    && (!q || [m.usuario, m.categoria, m.nota, m.medio, String(m.monto)].join(' ').toLowerCase().includes(q)));
  const vivos = rows.filter(m => !m.anulado);
  const sum = t => vivos.filter(m => m.tipo === t).reduce((a, m) => a + m.monto, 0);
  document.getElementById('htot').innerHTML = `${rows.length} registros · Ventas <b>${fmt(sum('venta'))}</b> · Gastos <b>${fmt(sum('gasto'))}</b> · Retiros <b>${fmt(sum('retiro'))}</b>`;
  l.innerHTML = rows.length ? rows.slice(0, 500).map(m => filaMov(m, false)).join('') + (rows.length > 500 ? '<li class="muted">Mostrando 500. Usa el buscador o acorta las fechas.</li>' : '') : '<li class="muted">No hay registros.</li>';
}

/* ---------- AJUSTES ---------- */
async function vistaAjustes(main) {
  main.innerHTML = `<div class="card"><h2>👥 Usuarios</h2><ul class="list" id="ul"><li class="muted">Cargando…</li></ul><button class="btn sec full" id="nuevo">＋ Agregar usuario</button></div>
    <div class="card"><h2>🧾 Servicios que se venden</h2><p class="muted">Uno por línea, en el orden en que quieres verlos.</p>
      <textarea class="inp" id="cv" rows="8" style="margin-top:8px">${esc(S.est.cats.venta.join('\n'))}</textarea><button class="btn full" id="gcv">Guardar servicios</button></div>
    <div class="card"><h2>🧾 Tipos de gasto</h2><textarea class="inp" id="cg" rows="8">${esc(S.est.cats.gasto.join('\n'))}</textarea><button class="btn full" id="gcg">Guardar tipos de gasto</button></div>
    <div class="card"><h2>🔑 Mi clave</h2><button class="btn sec full" id="mc">Cambiar mi clave</button></div>`;
  main.querySelector('#mc').onclick = cambiarMiClave;
  const gcat = async (tipo, el) => {
    const lista = el.value.split('\n').map(s => s.trim()).filter(Boolean);
    if (!lista.length) return toast('Deja al menos uno', true);
    try { await rpc('cj_guardar_categorias', { p_token: S.token, p_tipo: tipo, p_lista: lista }); S.est = await rpc('cj_estado', { p_token: S.token }); toast('Guardado ✓'); } catch (e) { toast(e.message, true); }
  };
  main.querySelector('#gcv').onclick = () => gcat('venta', main.querySelector('#cv'));
  main.querySelector('#gcg').onclick = () => gcat('gasto', main.querySelector('#cg'));
  main.querySelector('#nuevo').onclick = () => editarUsuario({ id: '', nombre: '', rol: 'empleado', activo: true, bono: true });
  let us = [];
  try { us = await rpc('cj_admin_usuarios', { p_token: S.token }); } catch (e) { toast(e.message, true); }
  const ul = main.querySelector('#ul');
  ul.innerHTML = us.map(u => `<li><div class="d"><div>${esc(u.nombre)} ${u.activo ? '' : '<span class="tag">inactivo</span>'}</div><div>${u.rol === 'admin' ? 'Administrador' : 'Empleado'}${u.bono ? ' · participa en bonos' : ''}</div></div><button class="lnk" data-u="${esc(u.id)}">Editar</button></li>`).join('');
  ul.onclick = e => { const b = e.target.closest('[data-u]'); if (b) editarUsuario(us.find(u => u.id === b.dataset.u)); };
}

function editarUsuario(u) {
  modal(`<h3>${u.id ? 'Editar usuario' : 'Nuevo usuario'}</h3>
    <span class="lbl">Nombre</span><input class="inp" id="un" value="${esc(u.nombre)}" maxlength="30">
    <span class="lbl">Rol</span><select class="inp" id="ur"><option value="empleado" ${u.rol === 'empleado' ? 'selected' : ''}>Empleado (registra y cierra caja)</option><option value="admin" ${u.rol === 'admin' ? 'selected' : ''}>Administrador (ve todo)</option></select>
    <label class="row" style="margin-top:12px"><input type="checkbox" id="ua" ${u.activo ? 'checked' : ''}> Puede entrar al sistema</label>
    <label class="row" style="margin-top:8px"><input type="checkbox" id="ub" ${u.bono ? 'checked' : ''}> Participa en los bonos</label>
    <span class="lbl">${u.id ? 'Clave nueva (déjalo vacío para no cambiarla)' : 'Clave (4 a 6 números)'}</span><input class="inp" id="up" inputmode="numeric" maxlength="6" autocomplete="off">
    <button class="btn full" id="ok">Guardar</button><button class="btn sec full" data-close>Cancelar</button>`, (b, close) => {
    b.querySelector('#ok').onclick = async () => {
      const pin = b.querySelector('#up').value.trim();
      try {
        await rpc('cj_guardar_usuario', { p_token: S.token, p_id: u.id || null, p_nombre: b.querySelector('#un').value, p_rol: b.querySelector('#ur').value,
          p_activo: b.querySelector('#ua').checked, p_bono: b.querySelector('#ub').checked, p_pin: pin || null });
        close(); toast('Usuario guardado ✓'); vistaAjustes(document.getElementById('main'));
      } catch (e) { toast(e.message, true); }
    };
  });
}

/* ---------- arranque ---------- */
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.token && S.tab === 'hoy' && !document.querySelector('.modal')) refrescarHoy(true); });
const ses = store.get('caja_s');
if (ses && ses.token) { S.token = ses.token; principal(); }
else pantallaLogin();
})();
