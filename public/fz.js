/* Caja La 52 · Panel de Finanzas (solo administrador).
   Separa la plata del local y la personal, calcula cuánto hay que vender al día y lleva la nómina. */
(function () {
'use strict';
const C = () => window.CAJA;
const n = v => Number(String(v || '').replace(/\D/g, '')) || 0;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const CATS_PER = ['Mi hijo', 'Comida de la casa', 'Laura', 'Transporte', 'Servicios de la casa', 'Salud', 'Deudas', 'Ropa y personal', 'Salidas', 'Otro'];
const CATS_LOC = ['Papelería e insumos', 'Tinta y tóner', 'Mantenimiento', 'Aseo', 'Refrigerios', 'Transporte', 'Publicidad', 'Otro gasto del local'];
const ESQ = { diario: 'por día', semanal: 'a la semana', quincenal: 'a la quincena', mensual: 'al mes' };
let F = null, sec = 'res', mesSel = null, mainEl = null;

async function cargar() {
  const { rpc, S } = C();
  const [f, w] = await Promise.all([rpc('fz_estado', { p_token: S.token, p_mes: mesSel }), rpc('fz_semana', { p_token: S.token }).catch(() => null)]);
  f.sem = w; F = f;
}

async function FZ(main) {
  mainEl = main;
  main.innerHTML = '<p class="muted" style="margin-top:14px">Cargando finanzas…</p>';
  try { await cargar(); } catch (e) { main.innerHTML = `<div class="note bad">${C().esc(e.message)}</div>`; return; }
  pintar();
}
FZ.refrescar = async () => { if (!mainEl || !document.body.contains(mainEl) || document.querySelector('.modal')) return; try { await cargar(); pintar(); } catch (e) {} };
window.FZ = FZ;

function pintar() {
  const { esc } = C();
  const secs = [['res', '📊 Resumen'], ['loc', '🏪 Local'], ['nom', '👥 Nómina'], ['yo', '🏠 Casa'], ['cfg', '⚙️ Configurar']];
  const m = new Date(F.mes + 'T12:00:00');
  mainEl.innerHTML = `<div class="card fz-top"><div class="row"><h2 class="grow" style="margin:0">💼 Finanzas · ${MESES[m.getMonth()]} ${m.getFullYear()}</h2>
      <button class="chip" id="mAnt" title="Mes anterior">‹</button><button class="chip" id="mSig" title="Mes siguiente" ${F.mes >= F.hoy.slice(0, 8) + '01' ? 'disabled' : ''}>›</button></div>
      <div class="chips" style="margin-top:10px">${secs.map(([k, l]) => `<button class="chip ${sec === k ? 'on' : ''}" data-s="${k}">${l}</button>`).join('')}</div></div>
    <div id="fzBody"></div>`;
  mainEl.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { sec = b.dataset.s; pintar(); });
  mainEl.querySelector('#mAnt').onclick = () => cambiarMes(-1);
  mainEl.querySelector('#mSig').onclick = () => cambiarMes(1);
  const body = mainEl.querySelector('#fzBody');
  ({ res: vResumen, loc: vLocal, nom: vNomina, yo: vYo, cfg: vConfig })[sec](body);
}
async function cambiarMes(d) {
  const x = new Date(F.mes + 'T12:00:00'); x.setMonth(x.getMonth() + d);
  mesSel = x.toISOString().slice(0, 8) + '01';
  if (mesSel > F.hoy) mesSel = null;
  await FZ(mainEl);
}

/* ---------- cálculos ---------- */
const movsDe = (fn) => F.movs.filter(m => !m.anulado && fn(m));
const suma = arr => arr.reduce((a, m) => a + m.valor, 0);
function totalesMes() {
  const fueraCaja = m => !m.en_caja; // lo que salió de la caja ya está en los gastos de la caja
  const gastosLocalFuera = suma(movsDe(m => m.ambito === 'local' && (m.tipo === 'gasto' || m.tipo === 'nomina') && fueraCaja(m)));
  const gastosLocal = F.gastos_caja_mes + gastosLocalFuera;
  const sueldo = suma(movsDe(m => m.tipo === 'sueldo')) + (F.retiros_caja_mes || 0); // los retiros de la caja también son tu sueldo
  const nomina = suma(movsDe(m => m.tipo === 'nomina'));
  const utilidad = F.vendido_mes - gastosLocal;
  return { gastosLocal, sueldo, nomina, utilidad, queda: utilidad - sueldo };
}

/* ---------- RESUMEN ---------- */
function vResumen(b) {
  const { fmt, esc } = C();
  const T = totalesMes();
  const esMesActual = F.mes === F.hoy.slice(0, 8) + '01';
  const pct = F.meta_dia ? Math.min(100, Math.round(F.vendido_hoy * 100 / F.meta_dia)) : 0;
  const falta = F.meta_dia - F.vendido_hoy;
  const deberia = F.meta_dia * F.dias_pasados;
  const vaBien = F.vendido_mes >= deberia;
  const sinDatos = !F.fijos_local && !F.sueldo_ivan;
  const max = Math.max(F.meta_dia, ...F.por_dia.map(d => d.ventas), 1);
  b.innerHTML = `
    ${sinDatos ? `<div class="note warn">⚠️ Todavía faltan datos: en <b>⚙️ Configurar</b> escribe cuánto pagas de arriendo, luz, internet y cuánto quieres ganarte tú. Mientras tanto la meta solo cuenta la nómina.</div>` : ''}
    ${esMesActual ? `<div class="card fz-meta"><h2>🎯 Meta de hoy</h2>
      <div class="fz-big">${fmt(F.vendido_hoy)} <span class="muted">de ${fmt(F.meta_dia)}</span></div>
      <div class="bar fz-bar"><i style="width:${pct}%;background:${pct >= 100 ? 'var(--ok)' : 'var(--pri)'}"></i></div>
      <p style="margin-top:8px">${F.meta_dia <= 0 ? 'Configura tus gastos para calcular la meta.' : falta > 0 ? `Faltan <b>${fmt(falta)}</b> para cubrir lo que cuesta abrir hoy (${pct}%).` : `✅ ¡Meta cumplida! Hoy van <b>${fmt(-falta)}</b> de ganancia por encima de los costos.`}</p></div>` : ''}
    ${esMesActual ? laSemana() + proximos() : ''}
    <div class="card"><h2>📅 El mes</h2>
      <div class="stats s4">
        <div class="stat"><span>Vendido</span><b>${fmt(F.vendido_mes)}</b><span style="font-weight:400">${F.dias_pasados} de ${F.dias} días</span></div>
        <div class="stat"><span>Deberías llevar</span><b class="${vaBien ? 'pos' : 'neg'}">${fmt(deberia)}</b><span style="font-weight:400">${vaBien ? 'vas bien ✓' : 'vas por debajo'}</span></div>
        <div class="stat"><span>Gastos del local</span><b class="neg">${fmt(T.gastosLocal)}</b><span style="font-weight:400">incluye nómina pagada</span></div>
        <div class="stat"><span>Ganancia del local</span><b class="${T.utilidad >= 0 ? 'pos' : 'neg'}">${fmt(T.utilidad)}</b><span style="font-weight:400">ventas − gastos</span></div>
      </div>
      <div class="stats s3" style="margin-top:10px">
        <div class="stat"><span>Te pagaste (sueldo)</span><b>${fmt(T.sueldo)}</b><span style="font-weight:400">de ${fmt(F.sueldo_ivan)} al mes</span></div>
        <div class="stat"><span>Te falta pagarte</span><b>${fmt(Math.max(0, F.sueldo_ivan - T.sueldo))}</b><span style="font-weight:400">${F.retiros_caja_mes ? 'incluye ' + fmt(F.retiros_caja_mes) + ' de retiros de la caja' : 'este mes'}</span></div>
        <div class="stat"><span>Queda en el local</span><b class="${T.queda >= 0 ? 'pos' : 'neg'}">${fmt(T.queda)}</b><span style="font-weight:400">ganancia − tu sueldo</span></div>
      </div>
      <p class="muted" style="margin-top:8px">💡 Cuando saques plata para ti, regístrala como <b>retiro</b> en la caja o con "Pagarme mi sueldo": las dos cuentan como tu sueldo.</p>
      <div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap"><button class="btn" id="pagarme">💸 Pagarme mi sueldo</button><button class="btn sec" id="irNom">👥 Pagar nómina</button></div>
    </div>
    <div class="card"><h2>📈 Ventas por día</h2><p class="muted">La línea es la meta diaria (${fmt(F.meta_dia)}).</p>
      <div class="fz-dias">${F.por_dia.map(d => { const dd = new Date(d.fecha + 'T12:00:00'); return `<div class="fz-d" title="${d.fecha}: ${fmt(d.ventas)}"><i style="height:${Math.round(d.ventas * 140 / max)}px" class="${d.ventas >= F.meta_dia ? 'ok' : ''}"></i><span>${dd.getDate()}</span></div>`; }).join('')}
        ${F.meta_dia ? `<div class="fz-linea" style="bottom:${18 + Math.round(F.meta_dia * 140 / max)}px"></div>` : ''}</div></div>
    <div class="card"><h2>🧮 ¿De dónde sale la meta?</h2>
      <table class="t"><tr><td>Gastos fijos del local</td><td class="n">${fmt(F.fijos_local)}</td></tr>
        <tr><td>Nómina del mes (aprox.)</td><td class="n">${fmt(F.nomina_mes)}</td></tr>
        <tr><td>Tu sueldo</td><td class="n">${fmt(F.sueldo_ivan)}</td></tr>
        <tr><td><b>Total que cuesta el local al mes</b></td><td class="n"><b>${fmt(F.meta_mes)}</b></td></tr>
        <tr><td>÷ días que abres (lunes a viernes)</td><td class="n">${F.dias}</td></tr>
        <tr><td><b>Meta diaria</b></td><td class="n"><b>${fmt(F.meta_dia)}</b></td></tr></table>
      <p class="muted" style="margin-top:8px">Los bonos de los muchachos no están en la meta porque cambian cada semana: se pagan de lo que pase de la meta.</p></div>`;
  b.querySelector('#pagarme').onclick = () => registrar({ ambito: 'local', tipo: 'sueldo', titulo: '💸 Pagarme mi sueldo', valor: Math.max(0, F.sueldo_ivan - T.sueldo), destino: true });
  b.querySelector('#irNom').onclick = () => { sec = 'nom'; pintar(); };
  enganchaProximos(b);
}

/* ---------- LA SEMANA: semáforo de lo juntado de lunes a viernes y cómo repartirlo ---------- */
const DSEM = ['', 'L', 'M', 'M', 'J', 'V', 'S', 'D'];
function laSemana() {
  const { fmt } = C(); const W = F.sem; if (!W) return '';
  const dias = F.dias || 22, r1k = x => Math.round(x / 1000) * 1000;
  const nomSem = r1k(F.personas.reduce((a, p) => a + (p.esquema === 'semanal' ? p.valor : p.esquema === 'quincenal' ? p.valor * 2 * 5 / dias : p.esquema === 'mensual' ? p.valor * 5 / dias : 0), 0));
  const gasSem = r1k(F.fijos_local * 5 / dias), suSem = r1k(F.sueldo_ivan * 5 / dias);
  const meta = nomSem + gasSem + suSem; if (!meta) return '';
  const esNom = m => m.tipo === 'nomina' && m.esquema !== 'diario';
  const pag = (fn, caja) => W.pagos.filter(m => fn(m) && (!caja || m.en_caja)).reduce((a, m) => a + m.valor, 0);
  const esSu = m => m.tipo === 'sueldo', esGas = m => m.tipo === 'gasto';
  const retiros = (W.retiros || []).reduce((a, r) => a + r.valor, 0); // retiros de la caja = te pagaste
  const nomPag = pag(esNom), suPag = pag(esSu) + retiros, gasPag = pag(esGas);
  // lo que se pagó desde la caja ya salió de lo juntado: cuenta como avance (hasta la meta de cada cosa)
  const yaCaja = Math.min(pag(esNom, 1), nomSem) + Math.min(pag(esSu, 1) + retiros, suSem) + Math.min(pag(esGas, 1), gasSem);
  const ef = W.dias.reduce((a, d) => a + d.ef, 0), dig = W.dias.reduce((a, d) => a + d.dig, 0);
  const cubierto = Math.max(0, ef + dig + yaCaja);
  const hoy = new Date(W.hoy + 'T12:00:00'), dw = hoy.getDay() || 7;
  const dHoy = W.dias.find(d => d.fecha === W.hoy);
  const hechos = Math.min(5, W.dias.filter(d => { const x = new Date(d.fecha + 'T12:00:00').getDay() || 7; return x < 6 && (d.fecha < W.hoy || d.cerrada); }).length);
  const quedan = dw >= 6 ? 0 : 5 - hechos;
  const esperado = meta * hechos / 5, falta = Math.max(0, meta - cubierto);
  const ratio = esperado ? cubierto / esperado : 1;
  const color = !hechos ? 'var(--pri)' : ratio >= 1 ? '#1a9a4b' : ratio >= 0.8 ? '#e0a800' : 'var(--bad)';
  const pct = Math.min(100, Math.round(cubierto * 100 / meta));
  let msg;
  if (cubierto >= meta) msg = `🟢 <b>¡Semana cubierta!</b> Ya juntaste lo de nómina, gastos y tu sueldo. Lo que entre de aquí al viernes es colchón o ganancia.`;
  else if (!hechos) msg = `La semana apenas empieza. Meta: <b>${fmt(r1k(meta / 5))}</b> por día.`;
  else msg = `${ratio >= 1 ? '🟢 <b>Vas bien.</b>' : ratio >= 0.8 ? '🟡 <b>Vas un poco corto.</b>' : '🔴 <b>Vas corto.</b>'} A esta altura (${hechos} de 5 días) deberías llevar <b>${fmt(r1k(esperado))}</b>.`;
  const pie = cubierto >= meta ? '' : quedan ? `<p style="margin-top:6px">👉 Para llegar el viernes necesitas juntar <b>${fmt(r1k(falta / quedan))}</b> por día los <b>${quedan}</b> día${quedan === 1 ? '' : 's'} que quedan${dHoy && !dHoy.cerrada && dw < 6 ? ' (contando hoy)' : ''}.</p>`
    : `<p class="note warn" style="margin-top:6px">La semana cerró con ${fmt(falta)} menos de la meta. Reparte primero la nómina, después los gastos y lo que quede es tu sueldo.</p>`;
  // repartir lo que hay en la mano
  const src = { ef: Math.max(0, ef), dig: Math.max(0, dig) };
  const tomar = (q, orden) => { const r = { ef: 0, dig: 0 }; for (const k of orden) { const t = Math.min(q, src[k]); r[k] += t; src[k] -= t; q -= t; } return [r, q]; };
  const filas = [['👥 Nómina (Luis y Laura)', Math.max(0, nomSem - nomPag), nomPag, ['ef', 'dig']], ['🏪 Gastos del local', Math.max(0, gasSem - gasPag), gasPag, ['ef', 'dig']], ['💸 Tu sueldo', Math.max(0, suSem - suPag), suPag, ['dig', 'ef']]];
  const out = filas.map(([nm, q, ya, o]) => { const [r, f] = tomar(q, o); return [nm, r.ef, r.dig, q, f, ya]; });
  out.push(['🛟 Colchón (ganancia libre)', src.ef, src.dig, null, 0, 0]);
  const cel = v => v ? fmt(v) : '—';
  const mDia = meta / 5;
  // lo que ese día se pagó desde la caja (nómina, sueldo, gastos fijos, retiros) también lo produjo el día
  const delDia = f => W.pagos.filter(m => m.fecha === f && m.en_caja && (esNom(m) || esSu(m) || esGas(m))).reduce((a, m) => a + m.valor, 0) + (W.retiros || []).filter(r => r.fecha === f).reduce((a, r) => a + r.valor, 0);
  return `<div class="card"><h2>📆 La semana</h2>
    <div class="fz-big">${fmt(cubierto)} <span class="muted">de ${fmt(meta)}</span></div>
    <div class="bar fz-bar"><i style="width:${pct}%;background:${color}"></i></div>
    <p style="margin-top:8px">${msg}</p>${pie}
    <div class="fz-sem">${W.dias.map(d => { const x = new Date(d.fecha + 'T12:00:00'), v = d.ef + d.dig + delDia(d.fecha);
      const cl = d.fecha === W.hoy && !d.cerrada ? 'hoy' : v >= mDia ? 'ok' : v >= mDia * 0.8 ? 'med' : 'bajo';
      return `<div class="${cl}"><span>${DSEM[x.getDay() || 7]} ${x.getDate()}</span><b>${fmt(v)}</b></div>`; }).join('')}</div>
    <p class="muted" style="margin-top:4px">Lo que dejó cada día: efectivo (contado − base) + Nequi + lo que ese día se pagó desde la caja. Meta por día: ${fmt(r1k(mDia))}.</p>
    <h3 style="margin:14px 0 4px">Así se reparte lo que tienes (${fmt(ef)} en efectivo · ${fmt(dig)} en Nequi)</h3>
    <table class="t"><tr><th></th><th class="n">💵 Sobre</th><th class="n">📱 Nequi</th></tr>
    ${out.map(([nm, e, g, q, f, ya]) => `<tr><td>${nm}${q != null ? `<br><span class="muted">${q ? 'le faltan ' + fmt(q) : '✓ completo'}${ya ? ' · ya pagaste ' + fmt(ya) : ''}${f ? ' · no alcanza por ' + fmt(f) : ''}</span>` : ''}</td><td class="n">${cel(e)}</td><td class="n">${cel(g)}</td></tr>`).join('')}</table>
    <p class="muted" style="margin-top:6px">Meta de la semana: nómina ${fmt(nomSem)} + gastos ${fmt(gasSem)} + tu sueldo ${fmt(suSem)}. Jeimy no entra porque se le paga diario de la caja. Si sacas plata del sobre para un gasto, regístralo como gasto para que esto cuadre.</p></div>`;
}

/* ---------- PRÓXIMOS PAGOS: lo que vence en los próximos 7 días ---------- */
function proximos() {
  const { fmt, esc } = C();
  const hoy = new Date(F.hoy + 'T12:00:00'), lim = new Date(hoy); lim.setDate(lim.getDate() + 7);
  const ult = (y, m) => new Date(y, m + 1, 0, 12).getDate();
  const it = [], PF = (F.sem && F.sem.pagos_fijos) || [];
  F.fijos.filter(f => f.dia_pago && f.valor > 0).forEach(f => {
    for (const k of [0, 1]) {
      const y = hoy.getFullYear(), m = hoy.getMonth() + k;
      const fe = new Date(y, m, Math.min(f.dia_pago, ult(y, m)), 12);
      if (fe > lim) continue;
      if (f.tipo === 'ingreso') { if (fe >= hoy) it.push({ ing: true, nombre: f.nombre, fe, valor: f.valor }); continue; }
      // lo abonado a este vencimiento: pagos desde 20 días antes hasta 10 días después
      const ini = new Date(fe - 20 * 864e5), fin = new Date(+fe + 10 * 864e5);
      const parcial = PF.filter(x => x.fijo === f.id).filter(x => { const d = new Date(x.fecha + 'T12:00:00'); return d >= ini && d < fin; }).reduce((a, x) => a + x.valor, 0);
      const pagado = parcial >= f.valor;
      if (fe < hoy && pagado) continue;
      it.push({ f, nombre: f.nombre, fe, valor: f.valor, pagado, parcial, casa: f.ambito === 'personal' });
    }
  });
  const sab = new Date(F.lunes + 'T12:00:00'); sab.setDate(sab.getDate() + 5);
  F.personas.filter(p => p.esquema === 'semanal' && p.valor > 0).forEach(p =>
    it.push({ p, nombre: 'Nómina · ' + p.nombre, fe: sab, valor: p.valor, pagado: p.pagado_semana >= p.valor, parcial: p.pagado_semana }));
  if (!it.length) return '';
  it.sort((a, b) => a.fe - b.fe || (a.pagado - b.pagado));
  const DS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const cuando = fe => { const d = Math.round((fe - hoy) / 864e5); return d < 0 ? `<span class="neg">venció hace ${-d} día${d === -1 ? '' : 's'}</span>` : d === 0 ? '<b class="neg">hoy</b>' : d === 1 ? '<b>mañana</b>' : `en ${d} días · ${DS[fe.getDay()]} ${fe.getDate()}`; };
  const porPagar = it.filter(x => !x.ing && !x.pagado).reduce((a, x) => a + x.valor - (x.parcial || 0), 0);
  const entra = it.filter(x => x.ing).reduce((a, x) => a + x.valor, 0);
  window.__fzProx = it;
  return `<div class="card"><h2>🗓️ Próximos pagos (7 días)</h2>
    <div class="stats s2"><div class="stat"><span>Por pagar</span><b class="neg">${fmt(porPagar)}</b></div><div class="stat"><span>Entra</span><b class="pos">${fmt(entra)}</b></div></div>
    <ul class="list" style="margin-top:8px">${it.map((x, i) => `<li><div class="d"><div>${x.ing ? '📥' : x.casa ? '🏠' : x.p ? '👥' : '🏪'} <b>${esc(x.nombre)}</b></div>
      <div class="muted">${cuando(x.fe)}${x.parcial && !x.pagado ? ' · abonado ' + fmt(x.parcial) : ''}</div></div>
      <b class="${x.ing ? 'pos' : ''}">${fmt(x.valor)}</b>${x.ing ? '<span class="tag venta">entra</span>' : x.pagado ? '<span class="tag venta">✓ pagado</span>' : `<button class="btn sec" data-prox="${i}">Pagar</button>`}</li>`).join('')}</ul>
    <p class="muted" style="margin-top:6px">Sale de los días de pago que pusiste en ⚙️ Configurar. Al tocar "Pagar" queda registrado y se marca ✓.</p></div>`;
}
function enganchaProximos(b) {
  b.querySelectorAll('[data-prox]').forEach(x => x.onclick = () => {
    const it = window.__fzProx[Number(x.dataset.prox)], falta = it.valor - (it.parcial || 0);
    if (it.p) registrar({ ambito: 'local', tipo: 'nomina', titulo: 'Sueldo · ' + it.p.nombre, valor: falta, persona: it.p.id, categoria: 'Sueldo' });
    else registrar({ ambito: it.f.ambito, tipo: 'gasto', titulo: 'Pagar ' + it.f.nombre, valor: falta, fijo: it.f.id, categoria: it.f.nombre, soloCuentas: it.casa });
  });
}

/* ---------- LOCAL ---------- */
function vLocal(b) {
  const { fmt, esc } = C();
  const fijos = F.fijos.filter(f => f.ambito === 'local' && f.tipo === 'gasto');
  const otros = movsDe(m => m.ambito === 'local' && m.tipo === 'gasto');
  b.innerHTML = `<div class="card"><h2>🏪 Gastos fijos del local</h2><p class="muted">Lo que cuesta mantener el local cada mes. Toca "Pagar" cuando lo pagues.</p>
      <ul class="list">${fijos.length ? fijos.map(f => `<li><div class="d"><div><b>${esc(f.nombre)}</b> ${f.dia_pago ? `<span class="muted">· se paga el ${f.dia_pago}</span>` : ''}</div>
        <div>${f.valor ? fmt(f.valor) : '<span class="warn">sin valor</span>'} ${f.pagado >= f.valor && f.valor ? '<span class="tag venta">✓ pagado</span>' : f.pagado ? `<span class="tag retiro">pagado ${fmt(f.pagado)}</span>` : '<span class="tag gasto">pendiente</span>'}</div></div>
        <button class="btn sec" data-pagar="${f.id}">Pagar</button></li>`).join('') : '<li class="muted">No hay gastos fijos. Agrégalos en ⚙️ Configurar.</li>'}</ul></div>
    <div class="card"><div class="row"><h2 class="grow">🧾 Otros gastos del local este mes</h2><button class="btn" id="otroG">＋ Gasto</button></div>
      <p class="muted">Aquí van los gastos que <b>no</b> se registraron en la caja (por ejemplo, pagados desde el banco). Los de la caja ya se cuentan solos: ${fmt(F.gastos_caja_mes)} este mes.</p>
      <ul class="list">${listaMovs(movsDe(m => m.ambito === 'local' && (m.tipo === 'gasto' || m.tipo === 'ingreso')))}</ul></div>`;
  b.querySelectorAll('[data-pagar]').forEach(x => x.onclick = () => { const f = F.fijos.find(y => y.id == x.dataset.pagar); registrar({ ambito: 'local', tipo: 'gasto', titulo: 'Pagar ' + f.nombre, valor: Math.max(0, f.valor - f.pagado) || f.valor, fijo: f.id, categoria: f.nombre }); });
  b.querySelector('#otroG').onclick = () => registrar({ ambito: 'local', tipo: 'gasto', titulo: '🧾 Gasto del local', cats: CATS_LOC });
  enganchaAnular(b);
}

/* ---------- NÓMINA ---------- */
function vNomina(b) {
  const { fmt, esc } = C();
  const bono = (lista, uid) => { const x = (lista || []).find(y => y.id === uid); return x ? x.bono : 0; };
  b.innerHTML = `<div class="card"><h2>👥 Nómina</h2><p class="muted">Cuánto se le debe a cada uno esta semana y cuánto ya le pagaste. Los bonos salen del sistema de la caja.</p></div>
    ${F.personas.map(p => {
      let debe, txt;
      if (p.esquema === 'diario') { debe = p.valor * p.dias_semana; txt = `${p.dias_semana} día${p.dias_semana === 1 ? '' : 's'} esta semana × ${fmt(p.valor)}`; }
      else if (p.esquema === 'semanal') { debe = p.valor; txt = 'sueldo de la semana'; }
      else { debe = null; txt = ''; }
      const bAnt = bono(F.bonos_ant, p.usuario_id), bAct = bono(F.bonos, p.usuario_id);
      const falta = debe != null ? debe - p.pagado_semana : (p.esquema === 'quincenal' ? p.valor * 2 : p.valor) - p.pagado_mes;
      return `<div class="card"><div class="row"><h2 class="grow" style="margin:0">${esc(p.nombre)}</h2><span class="muted">${p.valor ? fmt(p.valor) + ' ' + ESQ[p.esquema] : 'sin sueldo configurado'}</span></div>
        <div class="stats s3" style="margin-top:10px">
          <div class="stat"><span>${debe != null ? 'Le toca esta semana' : 'Le toca este mes'}</span><b>${fmt(debe != null ? debe : (p.esquema === 'quincenal' ? p.valor * 2 : p.valor))}</b><span style="font-weight:400">${esc(txt)}</span></div>
          <div class="stat"><span>Ya le pagaste</span><b>${fmt(debe != null ? p.pagado_semana : p.pagado_mes)}</b><span style="font-weight:400">en el mes: ${fmt(p.pagado_mes)}</span></div>
          <div class="stat"><span>${falta >= 0 ? 'Falta' : 'Adelantado'}</span><b class="${falta > 0 ? 'neg' : 'pos'}">${fmt(Math.abs(falta))}</b></div></div>
        ${bAnt || bAct ? `<p style="margin-top:8px">🏆 Bono semana pasada: <b>${fmt(bAnt)}</b> · esta semana va en <b>${fmt(bAct)}</b></p>` : ''}
        <div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap"><button class="btn" data-p="${p.id}" data-c="Sueldo" data-v="${Math.max(0, falta)}">Pagar sueldo</button>
          <button class="btn sec" data-p="${p.id}" data-c="Adelanto" data-v="">Adelanto</button>${bAnt ? `<button class="btn sec" data-p="${p.id}" data-c="Bono" data-v="${bAnt}">Pagar bono</button>` : ''}</div></div>`;
    }).join('')}
    <div class="card"><h2>Pagos de nómina del mes</h2><ul class="list">${listaMovs(movsDe(m => m.tipo === 'nomina'))}</ul></div>`;
  b.querySelectorAll('[data-p]').forEach(x => x.onclick = () => { const p = F.personas.find(y => y.id == x.dataset.p); registrar({ ambito: 'local', tipo: 'nomina', titulo: x.dataset.c + ' · ' + p.nombre, valor: n(x.dataset.v), persona: p.id, categoria: x.dataset.c }); });
  enganchaAnular(b);
}

/* ---------- MI PLATA ---------- */
function vYo(b) {
  const { fmt, esc } = C();
  const ingF = F.fijos.filter(f => f.ambito === 'personal' && f.tipo === 'ingreso');
  const gasF = F.fijos.filter(f => f.ambito === 'personal' && f.tipo === 'gasto');
  const tIng = ingF.reduce((a, f) => a + f.valor, 0), tGas = gasF.reduce((a, f) => a + f.valor, 0);
  const necesita = Math.max(0, tGas - tIng);
  const gastos = movsDe(m => m.ambito === 'personal' && m.tipo === 'gasto');
  const porCat = {}; gastos.forEach(m => porCat[m.categoria || 'Otro'] = (porCat[m.categoria || 'Otro'] || 0) + m.valor);
  const total = F.cuentas.reduce((a, c) => a + Number(c.saldo), 0);
  b.innerHTML = `<div class="card"><div class="row"><h2 class="grow">🏦 Cuentas de la casa</h2><b>${fmt(total)}</b></div>
      <ul class="list">${F.cuentas.map(c => `<li><div class="d"><div>${{ banco: '🏦', billetera: '📱', inversion: '📈', efectivo: '💵' }[c.tipo] || ''} ${esc(c.nombre)}</div><div class="muted">actualizado ${esc(c.actualizado)}</div></div><b>${fmt(c.saldo)}</b><button class="btn sec" data-cta="${c.id}">Ajustar</button></li>`).join('')}</ul>
      <p class="muted" style="margin-top:6px">Los saldos bajan y suben solos cuando registras gastos o ingresos con esa cuenta. Si no cuadran con tu app del banco, toca "Ajustar". Si la plata de Laura paga algo del local, regístralo en 🏪 Local escogiendo "Plata de Laura" como origen.</p></div>
    <div class="card"><h2>🧭 ¿Cuánto necesita la casa del local?</h2>
      <table class="t"><tr><td>Gastos fijos de la casa al mes</td><td class="n">${fmt(tGas)}</td></tr><tr><td>− Otros ingresos (Laura, acuerdo, honorarios)</td><td class="n">${fmt(tIng)}</td></tr>
        <tr><td><b>Lo mínimo que la casa necesita del local</b></td><td class="n"><b>${fmt(necesita)}</b></td></tr><tr><td>Sueldo que tienes configurado</td><td class="n">${fmt(F.sueldo_ivan)}</td></tr></table>
      ${tGas === 0 ? '<p class="note warn">Escribe tus gastos fijos personales en ⚙️ Configurar para calcular esto.</p>' : F.sueldo_ivan < necesita ? `<p class="note warn">Tu sueldo configurado no alcanza para tus gastos fijos. Súbelo a por lo menos ${fmt(necesita)} o baja gastos.</p>` : (necesita === 0 ? '<p class="note ok">✓ Con los otros ingresos de la casa se cubren los gastos fijos. Tu sueldo del local queda para ahorrar, invertir o gastos variables.</p>' : '<p class="note ok">✓ Tu sueldo cubre lo que le falta a la casa.</p>')}</div>
    <div class="card"><div class="row" style="gap:8px;flex-wrap:wrap"><h2 class="grow">💳 Gastos de la casa este mes</h2><button class="btn" id="gP">＋ Gasto</button><button class="btn sec" id="iP">＋ Ingreso</button></div>
      ${Object.keys(porCat).length ? `<table class="t" style="margin:8px 0">${Object.entries(porCat).sort((a, c) => c[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="n">${fmt(v)}</td></tr>`).join('')}<tr><td><b>Total</b></td><td class="n"><b>${fmt(suma(gastos))}</b></td></tr></table>` : ''}
      <ul class="list">${listaMovs(movsDe(m => m.ambito === 'personal' || m.tipo === 'sueldo'))}</ul></div>`;
  b.querySelectorAll('[data-cta]').forEach(x => x.onclick = () => { const c = F.cuentas.find(y => y.id == x.dataset.cta); editar('cuenta', c); });
  b.querySelector('#gP').onclick = () => registrar({ ambito: 'personal', tipo: 'gasto', titulo: '💳 Gasto de la casa', cats: CATS_PER, soloCuentas: true });
  b.querySelector('#iP').onclick = () => registrar({ ambito: 'personal', tipo: 'ingreso', titulo: '💰 Ingreso de la casa', cats: ['Salario de Laura', 'Honorarios de edil', 'Acuerdo', 'Otro ingreso'], soloCuentas: true, destino: true });
  enganchaAnular(b);
}

/* ---------- CONFIGURAR ---------- */
function vConfig(b) {
  const { fmt, esc } = C();
  const grupo = (titulo, lista, nuevo) => `<div class="card"><div class="row"><h2 class="grow">${titulo}</h2><button class="btn sec" data-nuevo='${JSON.stringify(nuevo)}'>＋ Agregar</button></div>
    <ul class="list">${lista.map(f => `<li><div class="d"><div>${esc(f.nombre)}</div><div class="muted">${f.dia_pago ? 'día ' + f.dia_pago : ''}</div></div><b>${fmt(f.valor)}</b><button class="btn sec" data-fijo="${f.id}">Editar</button></li>`).join('') || '<li class="muted">Nada todavía.</li>'}</ul></div>`;
  b.innerHTML = `<div class="card"><h2>💸 Tu sueldo y los días</h2>
      <label class="lbl">¿Cuánto te va a pagar el local al mes?</label><input class="inp money" id="sIv" inputmode="numeric" value="${F.sueldo_ivan ? F.sueldo_ivan.toLocaleString('es-CO') : ''}" placeholder="$0">
      <p class="muted">Empieza con lo que necesitas para tus gastos fijos (míralo en 🏠 Casa). Puedes cambiarlo cuando quieras.</p>
      <label class="lbl">Días que abre el local al mes</label><input class="inp" id="dM" inputmode="numeric" value="${F.dias_fijo || ''}" placeholder="Automático: lunes a viernes (${F.dias} este mes)">
      <button class="btn full" id="gCfg" style="margin-top:10px">Guardar</button></div>
    ${grupo('🏪 Gastos fijos del local', F.fijos.filter(f => f.ambito === 'local' && f.tipo === 'gasto'), { ambito: 'local', tipo: 'gasto' })}
    ${grupo('🏠 Gastos fijos de la casa', F.fijos.filter(f => f.ambito === 'personal' && f.tipo === 'gasto'), { ambito: 'personal', tipo: 'gasto' })}
    ${grupo('💰 Otros ingresos de la casa (Laura, acuerdo, honorarios)', F.fijos.filter(f => f.ambito === 'personal' && f.tipo === 'ingreso'), { ambito: 'personal', tipo: 'ingreso' })}
    <div class="card"><div class="row"><h2 class="grow">👥 Personas en nómina</h2><button class="btn sec" id="nP">＋ Agregar</button></div>
      <ul class="list">${F.personas.map(p => `<li><div class="d"><div>${esc(p.nombre)}</div><div class="muted">${p.valor ? fmt(p.valor) + ' ' + ESQ[p.esquema] : 'sin sueldo'}</div></div><button class="btn sec" data-per="${p.id}">Editar</button></li>`).join('')}</ul></div>
    <div class="card"><div class="row"><h2 class="grow">🏦 Cuentas de la casa</h2><button class="btn sec" id="nC">＋ Agregar</button></div>
      <ul class="list">${F.cuentas.map(c => `<li><div class="d"><div>${esc(c.nombre)}</div></div><b>${fmt(c.saldo)}</b><button class="btn sec" data-cta="${c.id}">Editar</button></li>`).join('')}</ul></div>`;
  C().moneyInput(b.querySelector('#sIv'));
  b.querySelector('#gCfg').onclick = async () => {
    try { await C().rpc('fz_guardar', { p_token: C().S.token, p_que: 'config', p_datos: { sueldo_ivan: n(b.querySelector('#sIv').value), dias_mes: n(b.querySelector('#dM').value) } }); C().toast('Guardado'); await recargar(); }
    catch (e) { C().toast(e.message, true); }
  };
  b.querySelectorAll('[data-nuevo]').forEach(x => x.onclick = () => editar('fijo', Object.assign({ nombre: '', valor: 0 }, JSON.parse(x.dataset.nuevo))));
  b.querySelectorAll('[data-fijo]').forEach(x => x.onclick = () => editar('fijo', F.fijos.find(f => f.id == x.dataset.fijo)));
  b.querySelectorAll('[data-per]').forEach(x => x.onclick = () => editar('persona', F.personas.find(f => f.id == x.dataset.per)));
  b.querySelectorAll('[data-cta]').forEach(x => x.onclick = () => editar('cuenta', F.cuentas.find(f => f.id == x.dataset.cta)));
  b.querySelector('#nP').onclick = () => editar('persona', { nombre: '', esquema: 'mensual', valor: 0 });
  b.querySelector('#nC').onclick = () => editar('cuenta', { nombre: '', tipo: 'banco', saldo: 0 });
}

/* ---------- ventanas ---------- */
async function recargar() { await cargar(); pintar(); }

function origenes(soloCuentas, sinCuentas) {
  const o = soloCuentas ? [] : [['c:Efectivo', '💵 Efectivo de la caja'], ['c:Nequi', '📱 Nequi de la caja'], ['c:Llave', '🔑 Llave de la caja']];
  if (!sinCuentas) F.cuentas.forEach(c => o.push(['a:' + c.id, '🏦 ' + c.nombre]));
  o.push(['x', sinCuentas ? 'Banco del local u otro' : 'Otro (no mover saldos)']);
  return o;
}

function registrar(o) {
  const { modal, moneyInput, esc, rpc, S, toast } = C();
  const esEntrada = o.tipo === 'ingreso';
  const pregunta = o.tipo === 'sueldo' ? '¿De dónde sale y a dónde entra?' : esEntrada ? '¿A dónde entró la plata?' : '¿De dónde salió la plata?';
  modal(`<h2>${esc(o.titulo)}</h2>
    <label class="lbl">Valor</label><input class="inp money" id="rv" inputmode="numeric" value="${o.valor ? o.valor.toLocaleString('es-CO') : ''}" placeholder="$0">
    ${o.cats ? `<label class="lbl">Categoría</label><select class="inp" id="rc">${o.cats.map(c => `<option>${esc(c)}</option>`).join('')}</select>` : ''}
    <label class="lbl">${pregunta}</label><select class="inp" id="ro">${origenes(o.soloCuentas, o.tipo === 'sueldo').map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('')}</select>
    ${o.tipo === 'sueldo' ? `<label class="lbl">¿A cuál de tus cuentas entra?</label><select class="inp" id="rd"><option value="">No la muevo</option>${F.cuentas.map(c => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('')}</select>` : ''}
    <label class="lbl">Fecha</label><input class="inp" type="date" id="rf" value="${F.hoy}" max="${F.hoy}">
    <label class="lbl">Nota (opcional)</label><input class="inp" id="rn" maxlength="200">
    <p class="muted" id="rAv" style="margin-top:6px"></p>
    <div class="row" style="margin-top:12px;gap:8px"><button class="btn sec grow" data-close>Cancelar</button><button class="btn grow" id="rOk">Guardar</button></div>`, (box, close) => {
    moneyInput(box.querySelector('#rv'));
    const ro = box.querySelector('#ro'), av = box.querySelector('#rAv');
    const aviso = () => { av.textContent = ro.value.startsWith('c:') ? 'También quedará registrado en la caja de hoy, para que el cierre cuadre.' : ''; };
    ro.onchange = aviso; aviso();
    box.querySelector('#rOk').onclick = async e => {
      const btn = e.target; btn.disabled = true;
      const v = n(box.querySelector('#rv').value), org = ro.value, rd = box.querySelector('#rd');
      let cuenta = org.startsWith('a:') ? Number(org.slice(2)) : null;
      if (o.tipo === 'sueldo') cuenta = null; // el sueldo sale del local; la cuenta de destino se maneja aparte
      try {
        await rpc('fz_registrar', { p_token: S.token, p_ambito: o.ambito, p_tipo: o.tipo, p_categoria: o.cats ? box.querySelector('#rc').value : (o.categoria || ''),
          p_valor: v, p_persona: o.persona || null, p_fijo: o.fijo || null, p_cuenta: o.tipo === 'sueldo' ? (rd && rd.value ? Number(rd.value) : null) : cuenta,
          p_en_caja: org.startsWith('c:') ? org.slice(2) : null, p_nota: box.querySelector('#rn').value, p_fecha: box.querySelector('#rf').value || null });
        close(); toast('Guardado ✓'); await recargar();
      } catch (err) { btn.disabled = false; toast(err.message, true); }
    };
  });
}

function editar(que, x) {
  const { modal, moneyInput, esc, rpc, S, toast } = C();
  let campos = '';
  if (que === 'fijo') campos = `<label class="lbl">Nombre</label><input class="inp" id="en" value="${esc(x.nombre)}" maxlength="60">
      <label class="lbl">Valor al mes</label><input class="inp money" id="ev" inputmode="numeric" value="${x.valor ? x.valor.toLocaleString('es-CO') : ''}" placeholder="$0">
      <label class="lbl">Día del mes en que se paga (opcional)</label><input class="inp" id="ed" inputmode="numeric" value="${x.dia_pago || ''}" placeholder="Ej: 5">`;
  if (que === 'persona') campos = `<label class="lbl">Nombre</label><input class="inp" id="en" value="${esc(x.nombre)}" maxlength="60">
      <label class="lbl">¿Cada cuánto se le paga?</label><select class="inp" id="ee">${Object.entries(ESQ).map(([k, l]) => `<option value="${k}" ${x.esquema === k ? 'selected' : ''}>${l[0].toUpperCase() + l.slice(1)}</option>`).join('')}</select>
      <label class="lbl">Valor</label><input class="inp money" id="ev" inputmode="numeric" value="${x.valor ? x.valor.toLocaleString('es-CO') : ''}" placeholder="$0">`;
  if (que === 'cuenta') campos = `<label class="lbl">Nombre</label><input class="inp" id="en" value="${esc(x.nombre)}" maxlength="60">
      <label class="lbl">Tipo</label><select class="inp" id="et">${[['banco', 'Banco'], ['billetera', 'Billetera (Nequi, Nu, Daviplata)'], ['inversion', 'Inversión'], ['efectivo', 'Efectivo']].map(([k, l]) => `<option value="${k}" ${x.tipo === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <label class="lbl">Saldo actual</label><input class="inp money" id="ev" inputmode="numeric" value="${x.saldo ? Number(x.saldo).toLocaleString('es-CO') : ''}" placeholder="$0">`;
  modal(`<h2>${x.id ? 'Editar' : 'Agregar'}</h2>${campos}
    <div class="row" style="margin-top:12px;gap:8px">${x.id ? '<button class="btn bad" id="eDel">Quitar</button>' : ''}<button class="btn sec grow" data-close>Cancelar</button><button class="btn grow" id="eOk">Guardar</button></div>`, (box, close) => {
    const ev = box.querySelector('#ev'); if (ev) moneyInput(ev);
    const guardar = async (activo) => {
      const d = { id: x.id || null, nombre: box.querySelector('#en').value, activo };
      if (que === 'fijo') Object.assign(d, { ambito: x.ambito, tipo: x.tipo, valor: n(ev.value), dia_pago: n(box.querySelector('#ed').value) });
      if (que === 'persona') Object.assign(d, { esquema: box.querySelector('#ee').value, valor: n(ev.value) });
      if (que === 'cuenta') Object.assign(d, { tipo: box.querySelector('#et').value, saldo: n(ev.value) });
      try { await rpc('fz_guardar', { p_token: S.token, p_que: que, p_datos: d }); close(); toast('Guardado ✓'); await recargar(); } catch (e) { toast(e.message, true); }
    };
    box.querySelector('#eOk').onclick = () => guardar(true);
    const del = box.querySelector('#eDel'); if (del) del.onclick = () => { if (confirm('¿Quitar "' + x.nombre + '"? Los pagos ya registrados no se borran.')) guardar(false); };
  });
}

function listaMovs(arr) {
  const { fmt, esc } = C();
  if (!arr.length) return '<li class="muted">Nada registrado este mes.</li>';
  const tl = { gasto: 'Gasto', ingreso: 'Ingreso', nomina: 'Nómina', sueldo: 'Sueldo' };
  return arr.map(m => { const d = new Date(m.fecha + 'T12:00:00');
    const de = m.en_caja ? 'caja · ' + m.en_caja : m.cuenta || '';
    return `<li><div class="d"><div><b>${esc(m.persona || m.fijo || m.categoria || tl[m.tipo])}</b> <span class="tag ${m.tipo === 'ingreso' || m.tipo === 'sueldo' ? 'venta' : 'gasto'}">${tl[m.tipo]}</span></div>
      <div class="muted">${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}${de ? ' · ' + esc(de) : ''}${m.nota ? ' · ' + esc(m.nota) : ''}</div></div><b>${fmt(m.valor)}</b><button class="lnk" data-anul="${m.id}" title="Anular">✕</button></li>`; }).join('');
}
function enganchaAnular(b) {
  b.querySelectorAll('[data-anul]').forEach(x => x.onclick = async () => {
    if (!confirm('¿Anular este registro? Si salió de la caja, también se anula en la caja.')) return;
    try { await C().rpc('fz_anular', { p_token: C().S.token, p_id: Number(x.dataset.anul) }); C().toast('Anulado'); await recargar(); } catch (e) { C().toast(e.message, true); }
  });
}
})();
