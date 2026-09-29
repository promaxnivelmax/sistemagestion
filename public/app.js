/* Caja La 52 — sistema sencillo de caja para Internet La 52 */
(function () {
'use strict';
const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const SB = LOCAL ? '/rest/v1' : 'https://sbuyguoxwgpzsqtyhjaf.supabase.co/rest/v1';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidXlndW94d2dwenNxdHloamFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1OTEzODUsImV4cCI6MjA5NjE2NzM4NX0.YqZtDO1dBktJQ7Nu-AEBRWIoMGzDZISdcD5x-8z4U_U';
const app = document.getElementById('app');
const LOGO = `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#ffc21a" stroke="#10262b" stroke-width="4"/><path d="M6 42c6-4 11-4 17 0s11 4 17 0 11-4 18 0v6a30 30 0 0 1-52 0z" fill="#0d7c86" stroke="#10262b" stroke-width="3" stroke-linejoin="round"/><text x="32" y="36" text-anchor="middle" font-family="Lilita One,system-ui,sans-serif" font-size="24" fill="#10262b">52</text></svg>`;
const marca = sub => `<span class="logo">${LOGO}<span>Internet La 52${sub ? `<small>${sub}</small>` : ''}</span></span>`;


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
const TIPOS = { venta: 'Venta', gasto: 'Gasto', retiro: 'Retiro Iván', cambio: 'Cambio', ingreso: 'Entrada' };
const MEDIOS = [['Efectivo', '💵 Efectivo'], ['Nequi', '📱 Nequi'], ['Llave', '🔑 Llave (Nu)']];
const MED = { Efectivo: 'Efectivo', Nequi: 'Nequi', Llave: 'Llave Bre-B (Nu)' };
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
const PC = () => window.matchMedia && matchMedia('(pointer:fine)').matches;
const saleDe = m => m.medio_sale || (m.medio === 'Efectivo' ? 'Nequi' : 'Efectivo');
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
const nuevoForm = (tipo = 'venta') => ({ tipo, cat: '', monto: 0, medio: 'Efectivo', nota: '', rec: 'Nequi', ent: 'Efectivo', uid: uid() });

async function salir(silencioso) {
  clearInterval(S.poll); S.ev = null; S.act = []; S.enLinea = []; S.enLineaOk = false;
  if (S.token && !silencioso) rpc('cj_salir', { p_token: S.token }).catch(() => {});
  const quien = S.yo && S.yo.nombre;
  S.token = null; S.yo = null; S.est = null;
  store.del('caja_s');
  if (!silencioso) ola('¡Hasta luego' + (quien ? ', ' + quien : '') + '!', '👋');
  pantallaLogin();
}

/* ---------- agua: olas en el login y la marea al entrar/salir ---------- */
const OLA_SVG = (c, o) => `<svg viewBox="0 0 1200 60" preserveAspectRatio="none"><path fill="${c}" fill-opacity="${o}" d="M0 30 C100 8 200 8 300 30 S500 52 600 30 S800 8 900 30 S1100 52 1200 30 V60 H0Z"/></svg>`;
function agua(si) {
  let a = document.getElementById('agua');
  if (!si) { if (a) a.remove(); document.body.classList.remove('en-login'); return; }
  document.body.classList.add('en-login');
  if (a) return;
  a = document.createElement('div'); a.id = 'agua'; a.setAttribute('aria-hidden', 'true');
  a.innerHTML = `<div class="ola o3">${OLA_SVG('#0d7c86', .35)}${OLA_SVG('#0d7c86', .35)}</div><div class="ola o2">${OLA_SVG('#0d7c86', .6)}${OLA_SVG('#0d7c86', .6)}</div><div class="ola o1">${OLA_SVG('#0a6a73', 1)}${OLA_SVG('#0a6a73', 1)}</div><div class="burbujas">${Array.from({ length: 9 }, (_, i) => `<i style="left:${8 + i * 10.5}%;animation-delay:${(i * 0.83) % 5}s;animation-duration:${5 + (i % 4)}s"></i>`).join('')}</div>`;
  document.body.appendChild(a);
}
// la marea sube, muestra un saludo y baja
function ola(texto, emoji) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
  return new Promise(ok => {
    const m = document.createElement('div'); m.className = 'marea';
    m.innerHTML = `<div class="marea-agua"><div class="ola o1">${OLA_SVG('#0a6a73', 1)}${OLA_SVG('#0a6a73', 1)}</div></div><div class="marea-txt"><span>${emoji || '🌊'}</span>${esc(texto)}</div>`;
    document.body.appendChild(m);
    requestAnimationFrame(() => m.classList.add('sube'));
    setTimeout(() => { ok(); m.classList.add('baja'); }, 900);
    setTimeout(() => m.remove(), 1700);
  });
}

/* ============ LOGIN ============ */
async function pantallaLogin() {
  clearInterval(S.poll);
  agua(true);
  app.innerHTML = `<div class="login"><h1>${marca('Caja')}</h1><p>¿Quién eres?</p><div class="users" id="us"><p class="muted">Cargando…</p></div></div>`;
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
  app.innerHTML = `<div class="login"><h1>${marca('Caja')}</h1><p style="font-size:20px;color:var(--tx);font-weight:800">Hola, ${esc(nombre)}</p><p>Escribe tu clave</p>
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
      ola('¡Hola, ' + nombre + '!', '☀️'); // la animación va encima mientras la caja carga (no hace esperar)
      agua(false);
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
  agua(false);
  try { S.est = await rpc('cj_estado', { p_token: S.token }); } catch (e) {
    if (!S.token) return; // la sesión venció: ya se mostró el login
    app.innerHTML = `<div class="login"><h1>${marca('Caja')}</h1><div class="note bad">${esc(e.message)}</div><button class="btn full" onclick="location.reload()">Reintentar</button></div>`;
    return;
  }
  S.yo = S.est.yo;
  if (!S.f) S.f = nuevoForm();
  pintarMarco();
  clearInterval(S.poll);
  S.v = null; S.beat = 0; S.enLinea = S.enLinea || [];
  if (esAdmin() && S.ev == null) { try { const ev = await rpc('cj_eventos_desde', { p_token: S.token, p_desde: 0 }); S.act = ev.slice(-40); S.ev = ev.length ? ev[ev.length - 1].id : 0; } catch (e) { S.act = []; S.ev = 0; } }
  latido();
  S.poll = setInterval(latido, 4000);
}

function pintarMarco() {
  const tabs = esAdmin() ? [['hoy', 'Hoy'], ['cli', 'Clientes'], ['rep', 'Reportes'], ['fz', 'Finanzas'], ['hist', 'Historial'], ['aj', 'Ajustes']] : [['hoy', 'Hoy'], ['cli', '👥 Clientes']];
  app.innerHTML = `<header class="top"><div class="in">${marca('Caja')}<span class="who">${esc(S.yo.nombre)}</span>
      ${esAdmin() ? `<button class="lnk enl" id="enLinea" title="Quién está conectado">🟢 <b id="enN">${(S.enLinea || []).length}</b></button>` : '<button class="lnk" id="miClave">Mi clave</button>'}<button class="lnk" id="salir">Salir</button></div>
      ${tabs.length ? `<nav class="tabs">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${S.tab === k ? 'on' : ''}">${l}</button>`).join('')}</nav>` : ''}
    </header><div class="wrap" id="main"></div>`;
  document.getElementById('salir').onclick = () => salir();
  const mc = document.getElementById('miClave'); if (mc) mc.onclick = cambiarMiClave;
  const el = document.getElementById('enLinea'); if (el) el.onclick = verActividad;
  app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { S.tab = b.dataset.tab; pintarMarco(); });
  const main = document.getElementById('main');
  if (S.tab === 'rep') return vistaReportes(main);
  if (S.tab === 'hist') return vistaHistorial(main);
  if (S.tab === 'aj') return vistaAjustes(main);
  if (S.tab === 'cli') { if (window.CLI) return window.CLI(main); main.innerHTML = '<div class="note bad">No cargó el módulo de clientes. Recarga la página.</div>'; return; }
  if (S.tab === 'fz') { if (window.FZ) return window.FZ(main); main.innerHTML = '<div class="note bad">No cargó el módulo de finanzas. Recarga la página.</div>'; return; }
  vistaHoy(main);
}

/* ---------- HOY / CAJA ---------- */
function vistaHoy(main) {
  main.classList.add('hoy'); main.classList.toggle('adm', esAdmin());
  main.innerHTML = `<div class="col colL"><div class="card" id="regBox"></div></div>
    <div class="col colR"><div id="cajaBox"></div><div id="resumen"></div>
    <div class="card" id="movsCard"><div class="row"><h2 class="grow" style="margin:0">${esAdmin() ? 'Movimientos de hoy' : 'Mis registros de hoy'} <span class="muted" id="movsN"></span></h2><button class="lnk" id="movsVer"></button></div><ul class="list movs-caja${S.movsAbierto ? ' abierto' : ''}" id="movs"></ul></div>
    <div id="cierreBox"></div></div>`;
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
    const ven = porMedio(E.movs, m => m.tipo === 'venta'), gas = porMedio(E.movs, m => m.tipo === 'gasto'), ret = porMedio(E.movs, m => m.tipo === 'retiro');
    const gan = { Efectivo: ven.Efectivo - gas.Efectivo, Nequi: ven.Nequi - gas.Nequi, Llave: ven.Llave - gas.Llave };
    const usaLl = E.llave_dia || ven.Llave || gas.Llave || ret.Llave;
    res.innerHTML = `<div class="stats s4" style="margin-top:12px">
        ${statM('Ventas hoy', d.ventas, ven, '', d.n_ventas + ' ventas')}
        ${statM('Gastos', d.gastos, gas, d.gastos ? 'neg' : '')}
        ${statM('Ganancia del día', d.ventas - d.gastos, gan, d.ventas - d.gastos >= 0 ? 'pos' : 'neg', 'ventas − gastos')}
        ${statM('💸 Retiros (tu sueldo)', d.retiros, ret, '', 'lo que te llevaste')}</div>
      <div class="stats ${usaLl ? 's3' : ''}" style="margin-top:10px">
        ${stat('💵 Debe haber en el cajón', fmt(E.esperado_ef), 'base + efectivo que entró − lo que salió')}
        ${stat('📱 Nequi del día', fmt(E.nequi_dia), 'lo que entró por Nequi − lo que salió ± cambios')}
        ${usaLl ? stat('🔑 Llave del día', fmt(E.llave_dia), 'lo que entró por la llave ± cambios') : ''}</div>
      ${E.dia.ingresos ? `<p class="muted" style="margin-top:6px">Entradas que no son venta hoy: <b>${fmt(E.dia.ingresos)}</b></p>` : ''}
      ${tablaBonos(E.bonos, 'Bonos de esta semana')}`;
  } else {
    const b = E.mi_bono;
    res.innerHTML = `<div class="stats" style="margin-top:12px">
      ${stat('Hoy llevas', fmt(E.mio.ventas), E.mio.n + (E.mio.n === 1 ? ' venta' : ' ventas'))}
      ${b ? stat('Tu puesto esta semana', b.puesto + '°', b.puesto <= 2 && b.ventas > 0 ? 'Bono estimado ' + fmt(b.bono) + ' 🎉' : 'Los 2 primeros ganan 3,5% de bono') : ''}</div>`;
  }

  // salidas del día (gastos y retiros): siempre visibles
  const sal = E.salidas || [];
  const salM = porMedio(E.movs, m => m.tipo === 'gasto' || m.tipo === 'retiro');
  const salTxt = Object.entries(salM).filter(([, v]) => v).map(([k, v]) => `${{ Efectivo: '💵', Nequi: '📱', Llave: '🔑' }[k] || ''} ${fmt(v)}`).join(' · ');
  if (c && !c.cerrada) res.insertAdjacentHTML('beforeend', `<div class="note ${sal.length ? 'info' : 'warn'} salidas" style="margin-top:10px">💸 <b>Salidas de hoy:</b> ${sal.length ? `${sal.length} (${fmt(sal.reduce((a, x) => a + x.monto, 0))})${salTxt ? ' → ' + salTxt : ''}` : 'ninguna registrada'}.
    ¿Salió plata del cajón (almuerzo, compras, pagos)? <button class="lnk" data-go="gasto">Registrar gasto</button> · <button class="lnk" data-go="retiro">Retiro de Iván</button></div>`);
  res.querySelectorAll('[data-go]').forEach(b => b.onclick = () => irA(b.dataset.go));

  // movimientos
  const ul = document.getElementById('movs');
  ul.innerHTML = E.movs.length ? E.movs.map(m => filaMov(m, true)).join('') : '<li class="muted">Todavía no hay registros hoy.</li>';
  const mn = document.getElementById('movsN'), mv = document.getElementById('movsVer');
  if (mn) mn.textContent = E.movs.length ? '(' + E.movs.length + ')' : '';
  if (mv) { mv.hidden = E.movs.length <= 5; mv.textContent = S.movsAbierto ? 'Encoger ▴' : 'Ver todos ▾';
    mv.onclick = () => { S.movsAbierto = !S.movsAbierto; ul.classList.toggle('abierto', S.movsAbierto); mv.textContent = S.movsAbierto ? 'Encoger ▴' : 'Ver todos ▾'; if (!S.movsAbierto) ul.scrollTop = 0; }; }
  ul.onclick = e => { const b = e.target.closest('[data-anular],[data-editar]'); if (!b) return; const m = E.movs.find(x => x.id == (b.dataset.anular || b.dataset.editar)); if (b.dataset.anular) anular(m); else editar(m); };

  // cierre
  const cb = document.getElementById('cierreBox');
  cb.innerHTML = c && !c.cerrada ? `<button class="btn sec full" id="cerrar">🔒 Cerrar la caja (fin del día)</button>` : '';
  const cr = document.getElementById('cerrar'); if (cr) cr.onclick = cerrarCaja;
}

// suma por medio (Efectivo, Nequi, Llave) de los movimientos que cumplan fn
function porMedio(movs, fn) {
  const r = { Efectivo: 0, Nequi: 0, Llave: 0 };
  (movs || []).forEach(m => { if (!m.anulado && fn(m) && r[m.medio] != null) r[m.medio] += m.monto; });
  return r;
}
// cuadro grande con la división por medio debajo (💵 efectivo · 📱 Nequi · 🔑 llave)
function statM(t, total, o, cls, sub) {
  const part = (ic, v) => `<span><i>${ic}</i> <b class="${v < 0 ? 'neg' : ''}">${v < 0 ? '−' : ''}${fmt(Math.abs(v))}</b></span>`;
  return `<div class="stat"><span>${t}</span><b class="${cls || ''}">${total < 0 ? '−' : ''}${fmt(Math.abs(total))}</b>${sub ? `<span style="font-weight:400">${esc(sub)}</span>` : ''}
    ${o ? `<div class="split">${part('💵 Efectivo', o.Efectivo || 0)}${part('📱 Nequi', o.Nequi || 0)}${o.Llave ? part('🔑 Llave', o.Llave) : ''}</div>` : ''}</div>`;
}
// división por medio de los totales del reporte: mT(T,'ventas','gastos') = ventas − gastos en cada medio
function mT(T, a, ...menos) {
  if (T[a + '_ef'] == null && a !== 'ventas') return null;
  const k = { Efectivo: 'ef', Nequi: 'nq', Llave: 'll' }, r = {};
  for (const [m, x] of Object.entries(k)) r[m] = Number(T[a + '_' + x] || 0) - menos.reduce((s2, b) => s2 + Number(T[b + '_' + x] || 0), 0);
  return r;
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
    <tr><td>Llave Bre-B del día</td><td class="n">${fmt(c.llave_dia ?? c.llave ?? 0)}</td></tr>
    ${c.cerrada_por ? `<tr><td>Cerró</td><td class="n">${esc(c.cerrada_por)}</td></tr>` : ''}</table>`;
}

function filaMov(m, hoy) {
  const puedeAnular = !m.anulado && (esAdmin() || (hoy && m.usuario_id === S.yo.id && Date.now() - new Date(m.creado).getTime() < 15 * 60000));
  const signo = m.tipo === 'venta' ? '' : m.tipo === 'ingreso' ? '+' : m.tipo === 'cambio' ? '⇄ ' : '−';
  const detalle = m.tipo === 'cambio' ? `Recibió ${MED[m.medio]}, entregó ${MED[saleDe(m)]}` : (m.categoria || TIPOS[m.tipo]);
  return `<li class="${m.anulado ? 'anul' : ''}"><div class="d"><div><span class="tag ${m.tipo}">${TIPOS[m.tipo]}</span> ${esc(detalle)}</div>
    <div>${m.fecha && !hoy ? fFecha(m.fecha) + ' · ' : ''}${esc(m.hora)} · ${esc(MED[m.medio] || m.medio)}${esAdmin() ? ' · ' + esc(m.usuario) : ''}${m.nota ? ' · ' + esc(m.nota) : ''}
    ${m.anulado ? `<br>Anulado por ${esc(m.anulado_por || '')}${m.anulado_motivo ? ': ' + esc(m.anulado_motivo) : ''}` : ''}
    ${m.editado_por ? `<br>Corregido por ${esc(m.editado_por)}: ${esc(m.editado_motivo || '')}${m.original ? ' (antes ' + fmt(m.original.monto) + ')' : ''}` : ''}</div></div>
    <div class="m ${m.tipo === 'venta' || m.tipo === 'ingreso' ? 'pos' : m.tipo === 'cambio' ? '' : 'neg'}">${signo}${fmt(m.monto)}</div>
    ${esAdmin() && !m.anulado ? `<button class="lnk" data-editar="${m.id}" title="Corregir">✏️</button>` : ''}
    ${puedeAnular ? `<button class="lnk" data-anular="${m.id}" title="Anular">✕</button>` : ''}</li>`;
}

/* ---------- formulario de registro ---------- */
const TXT_BTN = { venta: 'Guardar venta', gasto: 'Guardar gasto', retiro: 'Guardar retiro de Iván', cambio: 'Guardar cambio', ingreso: 'Guardar entrada' };
const TECLA_TIPO = { v: 'venta', g: 'gasto', r: 'retiro', c: 'cambio', i: 'ingreso' };
const TECLA_MEDIO = { e: 'Efectivo', n: 'Nequi', l: 'Llave' };

function irA(tipo) { S.tab = 'hoy'; S.f = nuevoForm(tipo); if (!document.getElementById('regBox')) pintarMarco(); else pintarForm(); const m = document.getElementById('monto'); if (m) { m.scrollIntoView({ block: 'center' }); m.focus(); } }

function segMedios(id, sel, quitar) {
  return `<div class="seg s3" id="${id}">${MEDIOS.map(([k, l]) => `<button type="button" data-${id}="${k}" class="${sel === k ? 'on' : ''}"${quitar === k ? ' disabled' : ''}>${l}</button>`).join('')}</div>`;
}

function pintarForm() {
  const box = document.getElementById('regBox'), f = S.f, cats = S.est.cats;
  const quick = [1000, 2000, 3000, 5000, 10000, 20000, 50000];
  let cuerpo = '';
  if (f.tipo === 'venta' || f.tipo === 'gasto') {
    const lista = f.tipo === 'venta' ? cats.venta : cats.gasto;
    cuerpo += `<span class="lbl">${f.tipo === 'venta' ? '¿Qué vendiste?' : '¿En qué se gastó?'}</span>
      <div class="chips" id="cats">${lista.map(n => `<button type="button" class="chip ${f.cat === n ? 'on' : ''}" data-cat="${esc(n)}">${esc(n)}</button>`).join('')}</div>`;
  }
  if (f.tipo === 'retiro') cuerpo += `<p class="muted" style="margin-top:10px">La plata que <b>se lleva Iván</b> de la caja. Cuenta como su sueldo.</p>`;
  if (f.tipo === 'ingreso') cuerpo += `<p class="muted" style="margin-top:10px">Plata que <b>llega y no es una venta</b>: te mandaron a la llave o a Nequi, te devolvieron un préstamo, etc. No cuenta como venta ni para los bonos.</p>`;
  if (f.tipo === 'cambio') cuerpo += `<span class="lbl">¿Qué recibiste?</span>${segMedios('rec', f.rec)}
      <span class="lbl">¿Qué entregaste?</span>${segMedios('ent', f.ent, f.rec)}`;
  cuerpo += `<span class="lbl">Valor</span><input class="inp money" id="monto" inputmode="numeric" autocomplete="off" placeholder="$0" value="${f.monto ? f.monto.toLocaleString('es-CO') : ''}">
    <div class="chips" style="margin-top:8px" id="quick">${quick.map(q => `<button type="button" class="chip" data-q="${q}">+${(q / 1000)}.000</button>`).join('')}<button type="button" class="chip" data-q="0">Borrar</button></div>`;
  if (f.tipo !== 'cambio') cuerpo += `<span class="lbl">${{ venta: '¿Cómo pagaron?', ingreso: '¿Por dónde llegó?' }[f.tipo] || '¿Cómo salió la plata?'}</span>${segMedios('m', f.medio)}`;
  const ph = { venta: 'Nota (opcional)', gasto: 'Detalle: almuerzo, resma de papel… ', retiro: 'Nota (opcional)', cambio: 'Nota (opcional)', ingreso: '¿De quién o de qué es esa plata?' }[f.tipo];
  cuerpo += `<span class="lbl">Nota</span><input class="inp" id="nota" maxlength="200" placeholder="${ph}" value="${esc(f.nota)}">`;
  box.innerHTML = `<div class="big-actions">
      <button type="button" class="act venta ${f.tipo === 'venta' ? 'on' : ''}" data-t="venta">＋ Venta<small>entra plata${PC() ? ' · tecla V' : ''}</small></button>
      <button type="button" class="act ${f.tipo === 'gasto' ? 'on' : ''}" data-t="gasto">− Gasto<small>almuerzo, papelería…${PC() ? ' · G' : ''}</small></button>
      <button type="button" class="act ${f.tipo === 'retiro' ? 'on' : ''}" data-t="retiro">↑ Retiro Iván<small>plata que se lleva Iván${PC() ? ' · R' : ''}</small></button>
      <button type="button" class="act ${f.tipo === 'cambio' ? 'on' : ''}" data-t="cambio">⇄ Cambio<small>Nequi, llave ↔ efectivo${PC() ? ' · C' : ''}</small></button>
      <button type="button" class="act ${f.tipo === 'ingreso' ? 'on' : ''}" data-t="ingreso">↓ Entrada<small>llega plata, no es venta${PC() ? ' · I' : ''}</small></button></div>
    ${cuerpo}<button type="button" class="btn full ${f.tipo === 'venta' || f.tipo === 'ingreso' ? 'ok' : f.tipo === 'cambio' ? '' : 'bad'}" id="guardar">${TXT_BTN[f.tipo]}${PC() ? ' <small class="kbd">Enter</small>' : ''}</button>
    ${PC() ? `<p class="atajos">⌨️ <b>V</b> venta · <b>G</b> gasto · <b>R</b> retiro · <b>C</b> cambio · <b>I</b> entrada · <b>← →</b> elegir ${f.tipo === 'gasto' ? 'gasto' : 'servicio'} · <b>E N L</b> efectivo, Nequi, llave (Nu)${f.tipo === 'cambio' ? ' (con Shift: lo que entregaste)' : ''} · <b>Enter</b> guardar · <b>Esc</b> borrar</p>` : ''}`;
  const montoEl = box.querySelector('#monto');
  moneyInput(montoEl);
  montoEl.addEventListener('input', () => { f.monto = num(montoEl.value); });
  box.querySelector('#nota').addEventListener('input', e => { f.nota = e.target.value; });
  box.onclick = e => {
    const t = e.target.closest('[data-t],[data-cat],[data-q],[data-m],[data-rec],[data-ent]');
    if (!t) return;
    if (t.dataset.t) return cambiarTipo(t.dataset.t);
    if (t.dataset.cat) return elegirCat(t.dataset.cat);
    if (t.dataset.q) { f.monto = t.dataset.q === '0' ? 0 : (f.monto || 0) + +t.dataset.q; montoEl.value = f.monto ? f.monto.toLocaleString('es-CO') : ''; if (PC()) montoEl.focus(); return; }
    if (t.dataset.m) return elegirMedio(t.dataset.m);
    if (t.dataset.rec) return elegirMedio(t.dataset.rec);
    if (t.dataset.ent) return elegirMedio(t.dataset.ent, true);
  };
  box.querySelector('#guardar').onclick = guardar;
  if (PC() && !document.querySelector('.modal')) setTimeout(() => { if (document.activeElement === document.body || !document.activeElement || document.activeElement.closest('#regBox')) montoEl.focus(); }, 0);
}

function cambiarTipo(t) { const f = S.f; S.f = nuevoForm(t); S.f.monto = f.monto; pintarForm(); }
function elegirCat(n) { S.f.cat = n; document.querySelectorAll('#regBox [data-cat]').forEach(x => x.classList.toggle('on', x.dataset.cat === n)); if (PC()) document.getElementById('monto').focus(); }
function elegirMedio(k, entrega) {
  const f = S.f;
  if (f.tipo === 'cambio') {
    if (entrega) { if (k !== f.rec) f.ent = k; }
    else { f.rec = k; if (f.ent === k) f.ent = k === 'Efectivo' ? 'Nequi' : 'Efectivo'; }
    const m = f.monto; pintarForm(); S.f.monto = m; return;
  }
  f.medio = k; document.querySelectorAll('#regBox [data-m]').forEach(x => x.classList.toggle('on', x.dataset.m === k));
}

/* ---------- teclado ---------- */
document.addEventListener('keydown', e => {
  if (!S.est || S.tab !== 'hoy' || document.querySelector('.modal') || !document.getElementById('regBox') || document.getElementById('regBox').classList.contains('hide')) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const el = document.activeElement, enNota = el && el.id === 'nota', enMonto = el && el.id === 'monto';
  const otroCampo = el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !enNota && !enMonto;
  if (otroCampo) return;
  const k = e.key.toLowerCase();
  if (e.key === 'Enter') { e.preventDefault(); return guardar(); }
  if (enNota) { if (e.key === 'Escape') { e.preventDefault(); document.getElementById('monto').focus(); } return; }
  if (e.key === 'Escape') { e.preventDefault(); S.f.monto = 0; const m = document.getElementById('monto'); m.value = ''; m.focus(); return; }
  if (TECLA_TIPO[k]) { e.preventDefault(); return cambiarTipo(TECLA_TIPO[k]); }
  if (TECLA_MEDIO[k]) { e.preventDefault(); return elegirMedio(TECLA_MEDIO[k], e.shiftKey); }
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    const lista = S.f.tipo === 'venta' ? S.est.cats.venta : S.f.tipo === 'gasto' ? S.est.cats.gasto : null;
    if (!lista || !lista.length) return;
    e.preventDefault();
    const i = lista.indexOf(S.f.cat), d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
    elegirCat(lista[i < 0 ? (d > 0 ? 0 : lista.length - 1) : (i + d + lista.length) % lista.length]);
    return;
  }
  if (!enMonto && /^\d$/.test(e.key)) { const m = document.getElementById('monto'); m.focus(); }
});

let guardando = false;
async function guardar() {
  if (guardando) return;
  const f = S.f;
  if ((f.tipo === 'venta' || f.tipo === 'gasto') && !f.cat) return toast(f.tipo === 'venta' ? 'Elige qué vendiste' + (PC() ? ' (flechas ← →)' : '') : 'Elige en qué se gastó', true);
  if (!f.monto) { const m = document.getElementById('monto'); if (m) m.focus(); return toast('Escribe el valor', true); }
  if (f.tipo === 'ingreso' && !f.nota.trim()) { document.getElementById('nota').focus(); return toast('Escribe de quién o de qué es esa plata', true); }
  if (f.monto >= 1000000 && !confirmar(`¿Seguro? El valor es ${fmt(f.monto)}`)) return;
  guardando = true;
  const btn = document.getElementById('guardar'); if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
  try {
    const medio = f.tipo === 'cambio' ? f.rec : f.medio;
    const cat = f.tipo === 'cambio' ? 'Cambio' : f.tipo === 'retiro' ? 'Retiro Iván' : f.tipo === 'ingreso' ? 'Entrada' : f.cat;
    const r = await rpc('cj_registrar_v2', { p_token: S.token, p_tipo: f.tipo, p_medio: medio, p_categoria: cat, p_monto: f.monto,
      p_nota: f.nota.trim(), p_sale: f.tipo === 'cambio' ? f.ent : null, p_cliente: f.uid });
    toast(r.repetido ? `Ya estaba guardado: ${TIPOS[r.tipo]} de ${fmt(r.monto)}` : `✓ ${TIPOS[r.tipo]} de ${fmt(r.monto)} guardado`);
    S.f = nuevoForm(f.tipo === 'venta' ? 'venta' : 'venta');
    guardando = false;
    pintarForm();
    await refrescarHoy(true);
  } catch (e) {
    guardando = false;
    toast(e.message, true);
    const b2 = document.getElementById('guardar'); if (b2) { b2.disabled = false; b2.innerHTML = TXT_BTN[f.tipo] + (PC() ? ' <small class="kbd">Enter</small>' : ''); }
  }
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
    <span class="lbl">${m.tipo === 'cambio' ? 'Lo que recibió' : 'Medio'}</span><select class="inp" id="emed">${MEDIOS.map(([k, l]) => `<option value="${k}" ${m.medio === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
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
  const sal = (S.est && S.est.salidas) || [];
  const tot = sal.reduce((a, x) => a + x.monto, 0);
  modal(`<h3>🔒 Cerrar la caja · paso 1 de 2</h3>
    <p class="muted">Antes de contar, revisa que <b>todo lo que salió del cajón hoy</b> esté registrado: almuerzos, compras, pagos, y lo que se llevó Iván.</p>
    <div class="card" style="margin:10px 0;padding:10px 12px">${sal.length ? `<table class="t">${sal.map(x => `<tr><td><span class="tag ${x.tipo}">${TIPOS[x.tipo]}</span> ${esc(x.categoria)}${x.nota ? ' · ' + esc(x.nota) : ''}<br><span class="muted">${esc(x.hora)} · ${esc(x.usuario)} · ${esc(MED[x.medio] || x.medio)}</span></td><td class="n neg">−${fmt(x.monto)}</td></tr>`).join('')}
      <tr><td><b>Total salidas</b></td><td class="n"><b>${fmt(tot)}</b></td></tr></table>` : '<p class="muted" style="margin:0">No hay salidas registradas hoy.</p>'}</div>
    <div class="row" style="gap:8px"><button class="btn sec grow" id="addG">＋ Falta un gasto</button><button class="btn sec grow" id="addR">＋ Falta un retiro de Iván</button></div>
    <label class="row confirma" style="margin-top:12px;align-items:flex-start"><input type="checkbox" id="okSal" style="width:22px;height:22px;flex-shrink:0">
      <span>${sal.length ? 'Confirmo que <b>todo</b> lo que salió hoy está registrado.' : 'Confirmo que hoy <b>no salió plata</b> del cajón.'}</span></label>
    <button class="btn full" id="sig" disabled>Siguiente: contar el efectivo →</button><button class="btn sec full" data-close>Cancelar</button>`, (b, close) => {
    const ok = b.querySelector('#okSal'), sig = b.querySelector('#sig');
    ok.onchange = () => { sig.disabled = !ok.checked; };
    b.querySelector('#addG').onclick = () => { close(); irA('gasto'); toast('Registra el gasto y vuelve a tocar "Cerrar la caja"'); };
    const aR = b.querySelector('#addR'); if (aR) aR.onclick = () => { close(); irA('retiro'); toast('Registra el retiro y vuelve a tocar "Cerrar la caja"'); };
    sig.onclick = () => {
      if (!ok.checked) return;
      b.innerHTML = `<h3>🔒 Cerrar la caja · paso 2 de 2</h3><p class="muted">Cuenta <b>todo el efectivo</b> que hay en el cajón (incluida la base) y escríbelo.</p>
        <input class="inp money" id="cont" inputmode="numeric" placeholder="$0" style="margin-top:12px">
        <span class="lbl">Nota (opcional)</span><input class="inp" id="cnota" maxlength="300" placeholder="Algo que Iván deba saber">
        <button class="btn full" id="ok">Cerrar caja</button><button class="btn sec full" data-close>Cancelar</button>`;
      const cont = b.querySelector('#cont'); moneyInput(cont); setTimeout(() => cont.focus(), 30);
      const enviar = async ev => {
        const v = cont.value, btn = b.querySelector('#ok');
        if (v.trim() === '') return toast('Escribe cuánto efectivo contaste (si no hay nada, escribe 0)', true);
        if (btn.disabled) return;
        btn.disabled = true;
        try {
          const r = await rpc('cj_cerrar_caja_v2', { p_token: S.token, p_contado: num(v), p_nota: b.querySelector('#cnota').value, p_salidas_ok: true });
          b.innerHTML = `<h3>Caja cerrada</h3>${resultadoCierre({ ...r, cerrada_por: S.yo.nombre })}<button class="btn full" data-close>Listo</button>`;
          refrescarHoy(true);
        } catch (e) { toast(e.message, true); btn.disabled = false; }
      };
      b.querySelector('#ok').onclick = enviar;
      cont.addEventListener('keydown', e => { if (e.key === 'Enter') enviar(); });
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
      ${statM('Ventas', T.ventas, mT(T, 'ventas'), '', T.n_ventas + ' ventas' + (T.dias > 1 ? ' · ' + fmt(T.ventas / T.dias) + '/día' : ''))}
      ${statM('Gastos', T.gastos, mT(T, 'gastos'), T.gastos ? 'neg' : '')}
      ${statM('Ganancia', gan, mT(T, 'ventas', 'gastos'), gan >= 0 ? 'pos' : 'neg', 'ventas − gastos')}
      ${statM('💸 Retiros (tu sueldo)', T.retiros, mT(T, 'retiros'), '', 'lo que te llevaste')}</div>
    ${T.gastos_ef != null ? `<div class="stats" style="margin-top:10px">${statM('🏪 Le queda al local', gan - T.retiros, mT(T, 'ventas', 'gastos', 'retiros'), gan - T.retiros >= 0 ? 'pos' : 'neg', 'ganancia − tu sueldo')}</div>` : ''}
    ${T.ingresos ? `<p class="muted" style="margin-top:6px">Entradas que no son venta: <b>${fmt(T.ingresos)}</b></p>` : ''}
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
    && (!q || [m.usuario, m.categoria, m.nota, MED[m.medio] || m.medio, String(m.monto)].join(' ').toLowerCase().includes(q)));
  const vivos = rows.filter(m => !m.anulado);
  const sum = t => vivos.filter(m => m.tipo === t).reduce((a, m) => a + m.monto, 0);
  document.getElementById('htot').innerHTML = `${rows.length} registros · Ventas <b>${fmt(sum('venta'))}</b> · Gastos <b>${fmt(sum('gasto'))}</b> · Retiros <b>${fmt(sum('retiro'))}</b>${sum('ingreso') ? ` · Entradas <b>${fmt(sum('ingreso'))}</b>` : ''}`;
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

/* ---------- TIEMPO REAL ---------- */
// cada 4 segundos pregunta si algo cambió; si cambió, actualiza la pantalla abierta
let latiendo = false;
async function latido() {
  if (!S.token || latiendo) return;
  S.beat = (S.beat || 0) + 1;
  if (document.hidden && (!esAdmin() || S.beat % 4)) return; // en segundo plano: solo el admin, cada 16 s
  latiendo = true;
  try {
    const r = await rpc('cj_version', { p_token: S.token });
    if (r.en_linea) enLinea(r.en_linea);
    const cambio = S.v !== null && r.v !== S.v;
    S.v = r.v;
    if (cambio || S.pend) await actualizarVista();
  } catch (e) { /* sin conexión: lo intenta en el próximo latido */ }
  latiendo = false;
}
async function actualizarVista() {
  if (document.querySelector('.modal')) { S.pend = true; return; }
  S.pend = false;
  if (esAdmin()) await nuevosEventos();
  if (S.tab === 'hoy') return refrescarHoy(true);
  if (S.tab === 'rep' && document.getElementById('rep')) { const [d1, d2] = rango(S.rep.per); return cargarReporte(d1, d2); }
  if (S.tab === 'hist' && document.getElementById('hl')) return cargarHist();
  if (S.tab === 'fz' && window.FZ && window.FZ.refrescar) return window.FZ.refrescar();
}
const EVT = {
  entrada: (e) => '🟢 ' + e.nombre + ' entró',
  salida: (e) => '🔴 ' + e.nombre + ' salió',
  registro: (e, d) => '💰 ' + e.nombre + ': ' + (TIPOS[d.tipo] || d.tipo) + ' ' + fmt(d.monto) + ' · ' + (MED[d.medio] || d.medio) + (d.categoria ? ' · ' + d.categoria : ''),
  editado: (e, d) => '✏️ Se editó un registro de ' + e.nombre + ': ' + fmt(d.monto) + ' · ' + (MED[d.medio] || d.medio),
  anulado: (e, d) => '🚫 Se anuló un registro de ' + e.nombre + ': ' + fmt(d.monto),
  caja_abierta: (e) => '☀️ ' + (e.nombre || 'Alguien') + ' abrió la caja',
  caja_cerrada: (e) => '🔒 ' + (e.nombre || 'Alguien') + ' cerró la caja',
  caja_reabierta: () => '🔓 Se reabrió la caja',
};
const textoEv = e => { let d = {}; try { d = JSON.parse(e.detalle || '{}'); } catch (x) {} const f = EVT[e.tipo]; return f ? f(e, d) : ''; };
async function nuevosEventos() {
  let ev = [];
  try { ev = await rpc('cj_eventos_desde', { p_token: S.token, p_desde: S.ev || 0 }); } catch (e) { return; }
  if (!ev.length) return;
  S.ev = ev[ev.length - 1].id;
  S.act = (S.act || []).concat(ev).slice(-40);
  ev.filter(e => e.usuario_id !== S.yo.id && textoEv(e)).forEach(e => aviso(textoEv(e), e.hora));
  const box = document.getElementById('actList'); if (box) box.innerHTML = listaAct();
}
function enLinea(lista) {
  const antes = (S.enLinea || []).map(x => x.id), ahora = lista.map(x => x.id);
  if (S.enLineaOk) (S.enLinea || []).filter(x => !ahora.includes(x.id)).forEach(x => aviso('⚪ ' + x.nombre + ' se desconectó'));
  S.enLinea = lista; S.enLineaOk = true;
  const n = document.getElementById('enN'); if (n) n.textContent = lista.length;
  const b = document.getElementById('enLst'); if (b) b.innerHTML = listaEnLinea();
}
function aviso(msg, hora) {
  let c = document.querySelector('.avisos'); if (!c) { c = document.createElement('div'); c.className = 'avisos'; document.body.appendChild(c); }
  const d = document.createElement('div'); d.className = 'aviso'; d.innerHTML = esc(msg) + (hora ? ' <small>' + esc(hora) + '</small>' : '');
  d.onclick = () => d.remove(); c.appendChild(d); setTimeout(() => d.remove(), 7000);
  if (document.hidden && window.Notification && Notification.permission === 'granted') { try { new Notification('Caja La 52', { body: msg, tag: 'caja' + Date.now() }); } catch (e) {} }
}
const listaEnLinea = () => (S.enLinea || []).length ? S.enLinea.map(x => '<span class="tag on">🟢 ' + esc(x.nombre) + '</span>').join(' ') : '<span class="muted">Nadie más está conectado ahora.</span>';
const listaAct = () => (S.act || []).length ? S.act.slice().reverse().map(e => '<li><div class="d"><div>' + esc(textoEv(e) || e.tipo) + '</div><div class="muted">' + esc(e.hora) + '</div></div></li>').join('') : '<li class="muted">Todavía no hay actividad hoy.</li>';
function verActividad() {
  const puede = window.Notification && Notification.permission !== 'granted' && Notification.permission !== 'denied';
  modal('<h2>En línea ahora</h2><div id="enLst" style="margin:6px 0 14px">' + listaEnLinea() + '</div><h2>Actividad de hoy</h2><ul class="list" id="actList" style="max-height:50vh;overflow:auto">' + listaAct() + '</ul>' +
    (puede ? '<button class="btn full" id="notif" style="margin-top:12px">🔔 Avisarme también con la app minimizada</button>' : '') +
    '<button class="btn sec full" data-close style="margin-top:8px">Cerrar</button>', box => {
      const b = box.querySelector('#notif'); if (b) b.onclick = () => Notification.requestPermission().then(p => { toast(p === 'granted' ? 'Listo: te avisará aunque la app esté minimizada.' : 'No se activaron los avisos.'); b.remove(); });
    });
}

window.CAJA = { rpc, S, fmt, esc, toast, modal, moneyInput };

/* ---------- arranque ---------- */
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.token) { S.v = -1; latido(); } });
window.addEventListener('focus', () => { if (S.token) latido(); });
const ses = store.get('caja_s');
if (ses && ses.token) { S.token = ses.token; principal(); }
else pantallaLogin();
})();

// guarda la app en el teléfono/computador: abre al instante aunque internet esté lento
if ('serviceWorker' in navigator && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
