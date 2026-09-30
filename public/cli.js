/* Caja La 52 · Clientes: los datos de cada persona, sus hojas de vida y sus documentos en Word.
   Todo se llena por pasos cortos (Continuar →). El Word se arma en el servidor de ivanrodriguez.app con la sesión de la caja.
   No registra ventas. */
(function () {
'use strict';
const C = () => window.CAJA;
const API = 'https://ivanrodriguez.app/api/hv';
const hoy = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);
const V = v => String(v == null ? '' : v).trim();
const uid = () => 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const NIVELES = [['Primaria', 'Básica primaria'], ['Secundaria', 'Bachiller académico'], ['Técnico', ''], ['Tecnólogo', ''], ['Universitario', ''], ['Curso', '']];
const TIPOS_ID = ['C.C.', 'C.E.', 'PPT', 'T.I.'];
const CIVIL = ['Soltero(a)', 'Casado(a)', 'Unión libre', 'Separado(a)', 'Divorciado(a)', 'Viudo(a)'];
const SEXO = [['m', 'Hombre'], ['f', 'Mujer']];
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const anio = s => { const m = String(s || '').match(/(19|20)\d\d/); return m ? m[0] : ''; };
const RANGO = [[/primaria|b[aá]sica/i, 1], [/secundaria|bachiller|media/i, 2], [/t[eé]cnico|t[eé]cnica/i, 3], [/tecn[oó]log/i, 4], [/universit|profesional|pregrado/i, 5], [/especiali|maestr|posgrado/i, 6], [/curso|diplomado|seminario|taller/i, 7]];
const rango = e => { const r = RANGO.find(([re]) => re.test(e.nivel || '')); return r ? r[1] : 8; };
const clave = s => { const m = String(s || '').match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/); return m ? `${m[1]}-${m[2] || '00'}-${m[3] || '00'}` : '9999'; };
const ordenarEstudios = l => l.map((e, i) => [e, i]).sort((a, b) => rango(a[0]) - rango(b[0]) || clave(a[0].actual ? '9998' : a[0].fin).localeCompare(clave(b[0].actual ? '9998' : b[0].fin)) || a[1] - b[1]).map(x => x[0]);
const ordenarFechas = (l, k) => l.map((e, i) => [e, i]).sort((a, b) => clave(a[0][k]).localeCompare(clave(b[0][k])) || a[1] - b[1]).map(x => x[0]);
const fcorta = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${+m[3]} ${MES[+m[2] - 1]} ${m[1]}` : ''; };

/* ---------- campos ---------- */
// datos de la persona (se comparten entre todas sus hojas de vida)
const F_PER = {
  nombres: { l: 'Nombres', ph: 'Ej: Carlos Andrés', req: 1 }, apellidos: { l: 'Apellidos', ph: 'Ej: Pérez Gómez' },
  genero: { l: 'Es', type: 'seg', o: SEXO, v: 'm' },
  tipo_id: { l: 'Tipo de documento', type: 'seg', o: TIPOS_ID.map(x => [x, x]), v: 'C.C.' }, num_id: { l: 'Número de documento', num: 1, ph: 'Sin puntos' },
  expedicion: { l: 'Dónde se expidió', v: 'Barrancabermeja' },
  fecha_nac: { l: 'Fecha de nacimiento', type: 'date' }, lugar_nac: { l: 'Dónde nació', ph: 'Ej: Barrancabermeja' },
  estado_civil: { l: 'Estado civil', type: 'select', o: CIVIL.map(x => [x, x]), v: 'Soltero(a)' },
  celular: { l: 'Celular', num: 1, ph: 'Ej: 300 123 4567' }, correo: { l: 'Correo (opcional)', ph: 'Ej: nombre@gmail.com' },
  direccion: { l: 'Dirección', ph: 'Ej: Calle 52 # 20-15' }, barrio: { l: 'Barrio', ph: 'Ej: Primero de Mayo' },
};
const PASOS_PER = [
  { t: 'Nombre y documento', e: '🪪', f: ['nombres', 'apellidos', 'genero', 'tipo_id', 'num_id', 'expedicion'] },
  { t: 'Nacimiento', e: '🎂', f: ['fecha_nac', 'lugar_nac', 'estado_civil'] },
  { t: 'Contacto y foto', e: '📱', f: ['celular', 'correo', 'direccion', 'barrio', 'foto'] },
];

// documentos (los mismos campos de la página); p = datos de la persona que se llenan solos
const BASE = { ciudad: { l: 'Ciudad', v: 'Barrancabermeja' }, fecha: { l: 'Fecha del documento', type: 'date' }, genero: { l: 'Redactar como', type: 'seg', o: SEXO } };
const PERS = ['nombre', 'cedula', 'expedida', 'genero', 'celular', 'correo', 'direccion'];
const DOCS = {
  personal: { t: 'Referencia personal', e: '🤝', ref: 'ref_per', f: [
    ['rnombre', { l: 'Nombre de quien da la referencia' }], ['rcedula', { l: 'Su cédula', num: 1 }], ['rexp', { l: 'Dónde se expidió' }], ['rgenero', { l: 'Quien da la referencia es', type: 'seg', o: SEXO }],
    ['rocup', { l: 'Su ocupación', ph: 'Ej: Comerciante' }], ['rcel', { l: 'Su celular', num: 1 }], ['rdir', { l: 'Su dirección o barrio (opcional)' }],
    ['tiempo', { l: '¿Hace cuánto conoce a la persona?', ph: 'Ej: 8 años' }], ['cualidades', { l: 'Cualidades de la persona', v: 'honesta, responsable y trabajadora' }],
    ['nombre', { l: 'Nombre de la persona recomendada' }], ['cedula', { l: 'Cédula', num: 1 }], ['expedida', { l: 'Dónde se expidió' }], ['genero', { l: 'La persona recomendada es', type: 'seg', o: SEXO }],
    ['ciudad'], ['fecha']] },
  familiar: { t: 'Referencia familiar', e: '👪', ref: 'ref_fam', f: [
    ['rnombre', { l: 'Nombre del familiar que da la referencia' }], ['rcedula', { l: 'Su cédula', num: 1 }], ['rexp', { l: 'Dónde se expidió' }], ['rgenero', { l: 'El familiar es', type: 'seg', o: SEXO }],
    ['parentesco', { l: '¿Qué es de la persona?', ph: 'Ej: tío, hermana, primo' }], ['rocup', { l: 'Su ocupación' }], ['rcel', { l: 'Su celular', num: 1 }], ['rdir', { l: 'Su dirección o barrio (opcional)' }],
    ['cualidades', { l: 'Cualidades de la persona', v: 'honesta, responsable y trabajadora' }],
    ['nombre', { l: 'Nombre de la persona recomendada' }], ['cedula', { l: 'Cédula', num: 1 }], ['expedida', { l: 'Dónde se expidió' }], ['genero', { l: 'La persona recomendada es', type: 'seg', o: SEXO }],
    ['ciudad'], ['fecha']] },
  renuncia: { t: 'Carta de renuncia', e: '✍️', f: [
    ['empresa', { l: 'Empresa', ph: 'Ej: Servicios Industriales S.A.S.' }], ['cargo', { l: 'Cargo', ph: 'Ej: Auxiliar de bodega' }], ['destino', { l: 'Dirigida a (opcional)', ph: 'Ej: Área de Talento Humano' }],
    ['ingreso', { l: 'Fecha en que entró (opcional)', type: 'date' }], ['ultimo', { l: 'Último día de trabajo', type: 'date' }],
    ['motivo', { l: 'Motivo (opcional)', type: 'area', ph: 'Ej: motivos personales' }],
    ['gracias', { l: 'Agradecer a la empresa', type: 'check', v: true }], ['pedir', { l: 'Pedir liquidación, certificado, examen de egreso y paz y salvo', type: 'check', v: true }],
    ['nombre', { l: 'Nombre completo' }], ['cedula', { l: 'Cédula', num: 1 }], ['expedida', { l: 'Dónde se expidió' }], ['genero'], ['celular', { l: 'Celular (opcional)', num: 1 }], ['correo', { l: 'Correo (opcional)' }],
    ['ciudad'], ['fecha']] },
  peticion: { t: 'Derecho de petición', e: '📜', f: [
    ['entidad', { l: '¿A qué entidad o empresa?', ph: 'Ej: Alcaldía de Barrancabermeja' }], ['dependencia', { l: 'Dependencia (opcional)', ph: 'Ej: Secretaría de Infraestructura' }],
    ['asunto', { l: 'Asunto en pocas palabras', ph: 'Ej: Copia de mi certificado laboral' }],
    ['hechos', { l: '¿Qué pasó? (una idea por línea)', type: 'area' }], ['pide', { l: '¿Qué pide? (una cosa por línea)', type: 'area' }], ['anexos', { l: 'Anexos (opcional, uno por línea)', type: 'area', ph: 'Ej: Copia de la cédula' }],
    ['nombre', { l: 'Nombre completo' }], ['cedula', { l: 'Cédula', num: 1 }], ['expedida', { l: 'Dónde se expidió' }], ['genero'], ['direccion', { l: 'Dirección para la respuesta' }], ['correo', { l: 'Correo para la respuesta' }], ['celular', { l: 'Celular', num: 1 }],
    ['ciudad'], ['fecha']] },
  cobro: { t: 'Cuenta de cobro', e: '🧾', f: [
    ['contratante', { l: '¿A quién le cobra?', ph: 'Empresa o persona' }], ['nit', { l: 'NIT o cédula de quien paga' }], ['numero', { l: 'Número de la cuenta de cobro', v: '001', num: 1 }],
    ['valor', { l: 'Valor a cobrar', num: 1, ph: 'Ej: 1.750.905' }], ['concepto', { l: 'Por concepto de', type: 'area', ph: 'Ej: Servicios como auxiliar de obra en el proyecto X.' }], ['periodo', { l: 'Periodo cobrado (opcional)', ph: 'Ej: del 1 al 30 de septiembre' }],
    ['fpago', { l: '¿Cómo le pagan?', type: 'select', o: [['banco', 'Transferencia o consignación'], ['Nequi', 'Nequi'], ['Daviplata', 'Daviplata'], ['llave', 'Llave Bre-B'], ['efectivo', 'Efectivo'], ['cheque', 'Cheque']] }],
    ['banco', { l: 'Banco (si es transferencia)' }], ['tcuenta', { l: 'Tipo de cuenta', type: 'seg', o: [['de ahorros', 'Ahorros'], ['corriente', 'Corriente']] }], ['ncuenta', { l: 'Número de cuenta, celular o llave' }],
    ['iva', { l: 'No es responsable de IVA', type: 'check', v: true }], ['ret', { l: 'No ha contratado a dos o más trabajadores', type: 'check', v: true }], ['ss', { l: 'Adjunta la planilla de seguridad social (PILA)', type: 'check', v: true }],
    ['nombre', { l: 'Nombre completo' }], ['cedula', { l: 'Cédula', num: 1 }], ['expedida', { l: 'Dónde se expidió' }], ['celular', { l: 'Celular (opcional)', num: 1 }], ['correo', { l: 'Correo (opcional)' }], ['direccion', { l: 'Dirección (opcional)' }],
    ['ciudad'], ['fecha']] },
};

let mainEl = null, lista = [], q = '', cli = null; // cli = { id, data, info }

async function CLI(main) {
  mainEl = main; if (!main.__mayus) { enMayus(main); main.__mayus = 1; }
  main.classList.remove('hoy', 'adm');
  if (cli && cli.id) return ficha();
  await verLista();
}
window.CLI = CLI;
const arriba = () => { try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); } };

/* ---------- datos: una persona con varias hojas de vida ---------- */
/* todo en MAYÚSCULAS menos correos, fechas, fotos y opciones internas */
const NO_MAYUS = new Set(['correo', 'email', 'foto', 'id', 'emp', 'k', 'fecha', 'fecha_nac', 'fin', 'ingreso', 'retiro', 'inicio', 'genero', 'tipo_id', 'estado_civil', 'fpago', 'tcuenta', 'nivel', 'sig', 'por', 'quitada', 'url']);
function mayus(o, k) {
  if (Array.isArray(o)) return o.map(x => mayus(x, k));
  if (o && typeof o === 'object') { const r = {}; for (const [kk, v] of Object.entries(o)) r[kk] = mayus(v, kk); return r; }
  if (typeof o !== 'string' || NO_MAYUS.has(k) || /@|^data:|^https?:|^\d{4}-\d{2}-\d{2}/.test(o)) return o;
  return o.toLocaleUpperCase('es-CO');
}
function enMayus(root) {
  root.addEventListener('input', e => {
    const x = e.target; if (!x || !(x.tagName === 'TEXTAREA' || (x.tagName === 'INPUT' && /^(text|search|tel|)$/.test(x.type)))) return;
    if (/correo|email/i.test((x.name || '') + (x.dataset.k || '')) || x.id === 'bTram' || x.id === 'bCli') return;
    const u = x.value.toLocaleUpperCase('es-CO'); if (u === x.value) return;
    const a = x.selectionStart, b = x.selectionEnd; x.value = u; try { x.setSelectionRange(a, b); } catch (er) {}
  });
}
function normalizar(d) {
  d = mayus(Object.assign({}, d || {}));
  if (!Array.isArray(d.hvs)) {
    const tiene = (d.estudios || []).length || (d.experiencias || []).length || (d.ref_per || []).some(r => r && V(r.nombre));
    d.hvs = tiene ? [{ id: uid(), titulo: 'Principal', estudios: d.estudios || [], experiencias: d.experiencias || [], sin_exp: d.sin_exp || '', ref_fam: d.ref_fam || [{}, {}], ref_per: d.ref_per || [{}, {}] }] : [];
  }
  return d;
}
const nombreDe = d => V((d.nombres || '') + ' ' + (d.apellidos || ''));
const nuevaHV = (titulo = 'Principal') => ({ id: uid(), titulo, estudios: [], experiencias: [], sin_exp: '', ref_fam: [{}, {}], ref_per: [{}, {}] });
async function guardarCli() {
  // cliente nuevo con una cédula que ya existe: se une a esa persona sin borrarle nada (hojas de vida, documentos, cuentas)
  if (!cli.id && V(cli.data.num_id)) {
    const ced = String(cli.data.num_id).replace(/[^0-9A-Za-z]/g, '');
    try {
      const ex = (await C().rpc('cj_clientes_buscar', { p_token: C().S.token, p_q: ced })).find(c => c.cedula === ced);
      if (ex) {
        const g = await C().rpc('cj_cliente_get', { p_token: C().S.token, p_id: ex.id }), viejo = normalizar(g.data), nuevo = cli.data;
        const unido = Object.assign({}, viejo, Object.fromEntries(Object.entries(nuevo).filter(([k, v]) => !['hvs', 'docs', 'hechos', 'cobros', 'hvs_quitadas'].includes(k) && V(v))));
        unido.hvs = [...(viejo.hvs || []), ...(nuevo.hvs || []).filter(h => !(viejo.hvs || []).some(x => x.id === h.id))];
        cli.id = ex.id; cli.data = unido; cli.info = g;
        C().toast(`${ex.nombre} ya estaba registrado: se unió con sus datos anteriores.`);
      }
    } catch (e) {}
  }
  cli.data = mayus(cli.data);
  const r = await C().rpc('cj_cliente_guardar', { p_token: C().S.token, p_id: cli.id, p_data: cli.data });
  cli.id = r.id;
}

/* ---------- lista ---------- */
async function cargarLista() { lista = await C().rpc('cj_clientes_buscar', { p_token: C().S.token, p_q: q }); }
async function verLista() {
  const { esc, toast } = C();
  mainEl.innerHTML = `<div class="card"><div class="row" style="flex-wrap:nowrap"><h2 class="grow" style="margin:0;white-space:nowrap">👥 Clientes</h2><button class="btn sec chico" id="verTram" title="Enlaces de trámites" style="white-space:nowrap">🔗</button><button class="btn sec chico" id="subirHV" title="Subir una hoja de vida en Word y llenar todo solo" style="white-space:nowrap">⬆️ Subir HV</button><button class="btn sec chico" id="docRapido" title="Renuncia, referencia… para alguien sin registrar" style="white-space:nowrap">📑 Rápido</button><button class="btn chico" id="nuevoCli" style="white-space:nowrap">＋ Nuevo</button></div>
      <input class="inp" id="bCli" type="search" placeholder="🔎 Buscar por nombre, cédula o celular" value="${esc(q)}" style="margin-top:12px"></div>
    <div id="lCli" class="cli-lista"><p class="muted" style="padding:14px">Cargando…</p></div>`;
  const pinta = () => {
    const box = mainEl.querySelector('#lCli');
    box.innerHTML = lista.length ? `<div class="card cli-tabla">${lista.map(c => `<div class="cli-fila"><div class="cli-fila-d" data-open="${c.id}"><b>${esc(c.nombre)}</b><span>${c.cedula ? esc(c.cedula) : 'sin cédula'}${c.celular ? ' · ' + esc(c.celular) : ''}<i> · ✍️ ${esc(c.actualizado_por || c.creado_por || '')} ${esc(c.fecha)}</i></span></div>
        <div class="cli-ic"><button data-hv="${c.id}" title="Hoja de vida">📄</button><button data-doc="${c.id}" title="Documentos">📑</button><button data-cob="${c.id}" title="Cuentas de cobro">🧾</button><button data-ed="${c.id}" title="Editar datos">✏️</button></div></div>`).join('')}
        ${lista.length >= 60 ? '<p class="muted cli-mas">Se ven los 60 más recientes. Escribe en el buscador para encontrar a los demás.</p>' : ''}</div>`
      : `<div class="card"><p class="muted">${q ? 'No encontré a nadie con "' + esc(q) + '".' : 'Todavía no hay clientes. Toca "＋ Nuevo".'}</p></div>`;
    box.querySelectorAll('[data-open]').forEach(x => x.onclick = () => abrir(Number(x.dataset.open)));
    box.querySelectorAll('[data-ed]').forEach(x => x.onclick = () => abrir(Number(x.dataset.ed), 'editar'));
    box.querySelectorAll('[data-hv]').forEach(x => x.onclick = () => abrir(Number(x.dataset.hv), 'hv'));
    box.querySelectorAll('[data-doc]').forEach(x => x.onclick = () => abrir(Number(x.dataset.doc), 'docs'));
    box.querySelectorAll('[data-cob]').forEach(x => x.onclick = () => abrir(Number(x.dataset.cob), 'cobros'));
  };
  mainEl.querySelector('#nuevoCli').onclick = () => { cli = { id: null, data: normalizar({}) }; asistentePersona(true); };
  mainEl.querySelector('#docRapido').onclick = () => { cli = { id: null, data: normalizar({}), rapido: true }; ficha('docs'); arriba(); };
  mainEl.querySelector('#verTram').onclick = () => { cli = { id: null, data: normalizar({}), rapido: true, tram: true }; docsRapidos(); arriba(); };
  mainEl.querySelector('#subirHV').onclick = subirHV;
  let t;
  mainEl.querySelector('#bCli').oninput = e => { clearTimeout(t); t = setTimeout(async () => { q = e.target.value; try { await cargarLista(); pinta(); } catch (x) { toast(x.message, true); } }, 300); };
  try { await cargarLista(); pinta(); } catch (x) { mainEl.querySelector('#lCli').innerHTML = `<div class="note bad">${esc(x.message)}</div>`; }
}
async function abrir(id, ir) {
  try {
    const r = await C().rpc('cj_cliente_get', { p_token: C().S.token, p_id: id });
    cli = { id: r.id, data: normalizar(r.data), info: r };
    if (ir === 'editar') return asistentePersona(false);
    ficha(ir || 'todo'); arriba();
  } catch (e) { C().toast(e.message, true); }
}

/* ---------- ficha ---------- */
function ficha(ir) {
  const { esc, S } = C();
  const d = cli.data, i = cli.info || {};
  if (cli.rapido) return docsRapidos();
  const modo = ['hv', 'docs', 'cobros', 'tram'].includes(ir) ? ir : 'todo';
  const falta = [!V(d.num_id) && 'cédula', !V(d.celular) && 'celular', !V(d.fecha_nac) && 'fecha de nacimiento'].filter(Boolean);
  const cab = `<div class="card cli-cab"><button class="lnk" id="volver">← Clientes</button>
      <div class="row cli-cab-d">${d.foto ? `<img src="data:image/jpeg;base64,${d.foto}" class="cli-foto">` : '<div class="cli-foto cli-sinfoto">👤</div>'}
        <div class="grow"><b class="cli-nom">${esc(nombreDe(d) || 'Sin nombre')}</b><span class="muted">${d.num_id ? esc(d.tipo_id || 'C.C.') + ' ' + esc(d.num_id) : 'sin cédula'}${d.celular ? ' · 📱 ' + esc(d.celular) : ''}</span>
        ${i.fecha ? `<span class="muted cli-quien">✍️ ${esc(i.actualizado_por || '')} · ${esc(i.fecha)}</span>` : ''}</div>
        <button class="btn sec chico" id="editar">✏️ Datos</button></div>
      ${falta.length ? `<p class="note warn cli-falta">Le falta: ${esc(falta.join(', '))}.</p>` : ''}
      <div class="cli-tabs"><button data-modo="hv" class="${modo === 'hv' ? 'on' : ''}"><i class="ti">📄 </i>HV</button><button data-modo="docs" class="${modo === 'docs' ? 'on' : ''}"><i class="ti">📑 </i>Documentos</button><button data-modo="cobros" class="${modo === 'cobros' ? 'on' : ''}"><i class="ti">🧾 </i>Cobros</button><button data-modo="tram" class="${modo === 'tram' ? 'on' : ''}"><i class="ti">🔗 </i>Trámites</button></div></div>`;
  const secHV = `<div class="card" id="secHV"><div class="row"><h3 class="grow cli-h">📄 Hojas de vida</h3><button class="btn chico" id="nuevaHV">＋ Nueva</button></div>
      ${d.hvs.length ? d.hvs.map((h, n) => `<div class="cli-hv"><div class="cli-hv-d"><b>${esc(h.titulo || 'Hoja de vida ' + (n + 1))}</b><span class="muted">${(h.estudios || []).length} estudio(s) · ${(h.experiencias || []).length ? (h.experiencias || []).length + ' experiencia(s)' : 'sin experiencia'}</span></div>
          <div class="cli-acc"><button class="btn sec" data-hved="${h.id}">✏️ Editar</button><button class="btn sec" data-hvdup="${h.id}">⧉ Duplicar</button><button class="btn" data-hvw="${h.id}" title="La hoja de vida de siempre">⬇️ Word</button><button class="btn sec" data-hvd="ats:${h.id}" title="Diseño sencillo que leen los sistemas de las empresas">ATS</button><button class="btn sec quitar" data-hvx="${h.id}" title="Quitar esta hoja de vida">🗑️</button></div></div>`).join('')
        : '<p class="muted" style="margin:8px 0 0">Todavía no tiene hoja de vida. Toca "＋ Nueva".</p>'}</div>`;
  const secDocs = `<div class="card" id="secDocs"><h3 class="cli-h">📑 Documentos</h3><p class="muted cli-sub">Se abre con sus datos puestos para revisar y completar.</p>
      <div class="cli-docs">${Object.entries(DOCS).map(([k, x]) => `<button class="cli-doc" data-doc="${k}"><span>${x.e}</span>${esc(x.t)}</button>`).join('')}</div></div>`;
  const hechos = (d.hechos || []).filter(x => x.k !== 'cobro');
  const secHechos = hechos.length ? `<div class="card"><h3 class="cli-h">🗂️ Documentos que se le han hecho</h3><div class="cli-hechos">${hechos.slice(0, 30).map(x => `<div class="cli-hecho"><span>${DOCS[x.k] ? DOCS[x.k].e + ' ' + esc(DOCS[x.k].t) : esc(x.k)}</span><i>${esc(fcorta(String(x.fecha).slice(0, 10)))}${x.por ? ' · ' + esc(x.por) : ''}</i><button class="cli-ic1" data-rehecho="${x.id}" title="Volver a bajar">⬇️</button></div>`).join('')}</div></div>` : '';
 mainEl.innerHTML = cab + (modo === 'tram' ? secTramites(d) : modo === 'cobros' ? secCobros(d) : (modo !== 'docs' ? secHV : '') + (modo !== 'hv' ? secDocs + (modo === 'docs' ? secHechos : '') : ''))
    + (modo === 'todo' && S.yo && S.yo.rol === 'admin' ? '<p style="text-align:center;margin:10px 0 20px"><button class="lnk" id="quitar">Quitar este cliente de la lista</button></p>' : '');
  mainEl.querySelector('#volver').onclick = () => { cli = null; verLista(); };
  mainEl.querySelector('#editar').onclick = () => asistentePersona(false);
  mainEl.querySelectorAll('[data-modo]').forEach(b => b.onclick = () => ficha(b.dataset.modo === modo ? 'todo' : b.dataset.modo));
  const nv = mainEl.querySelector('#nuevaHV');
  if (nv) nv.onclick = () => { const h = nuevaHV(d.hvs.length ? 'Hoja de vida ' + (d.hvs.length + 1) : 'Principal'); asistenteHV(h, true); };
  mainEl.querySelectorAll('[data-hved]').forEach(b => b.onclick = () => asistenteHV(JSON.parse(JSON.stringify(d.hvs.find(h => h.id === b.dataset.hved))), false));
  mainEl.querySelectorAll('[data-hvw]').forEach(b => b.onclick = () => wordHV(d.hvs.find(h => h.id === b.dataset.hvw), b));
  mainEl.querySelectorAll('[data-hvd]').forEach(b => b.onclick = () => { const [tipo, id] = b.dataset.hvd.split(':'); disenoHV(d.hvs.find(h => h.id === id), tipo); });
  mainEl.querySelectorAll('[data-hvdup]').forEach(b => b.onclick = async () => {
    const h = JSON.parse(JSON.stringify(d.hvs.find(x => x.id === b.dataset.hvdup))); h.id = uid(); h.titulo = (h.titulo || 'Hoja de vida') + ' (copia)';
    d.hvs.push(h); try { await guardarCli(); C().toast('Copia creada ✓ Tócale ✏️ Editar para cambiarle el nombre'); ficha(modo); } catch (e) { C().toast(e.message, true); }
  });
  // quitar: sale de la lista pero queda guardada aparte (se puede recuperar si fue un error)
  mainEl.querySelectorAll('[data-hvx]').forEach(b => b.onclick = async () => {
    const h = d.hvs.find(x => x.id === b.dataset.hvx); if (!h || !confirm(`¿Quitar la hoja de vida "${h.titulo || 'sin nombre'}"?`)) return;
    d.hvs = d.hvs.filter(x => x !== h); d.hvs_quitadas = (d.hvs_quitadas || []).concat([Object.assign({}, h, { quitada: new Date().toISOString() })]);
    try { await guardarCli(); C().toast('Hoja de vida quitada ✓'); ficha(modo); } catch (e) { d.hvs.push(h); C().toast(e.message, true); }
  });
  mainEl.querySelectorAll('[data-doc]').forEach(b => b.onclick = () => asistenteDoc(b.dataset.doc));
  mainEl.querySelectorAll('[data-rehecho]').forEach(b => b.onclick = () => rebajar((d.hechos || []).find(x => x.id === b.dataset.rehecho), b));
  if (modo === 'cobros') montarCobros(d);
  if (modo === 'tram') montarTramites(d);
  const qu = mainEl.querySelector('#quitar');
  if (qu) qu.onclick = async () => { if (!confirm('¿Quitar a ' + nombreDe(d) + ' de la lista?')) return; try { await C().rpc('cj_cliente_quitar', { p_token: C().S.token, p_id: cli.id }); cli = null; verLista(); } catch (e) { C().toast(e.message, true); } };
  cli.modo = modo;
}
// documento rápido: para alguien que no está registrado (no guarda nada)
function docsRapidos() {
  const { esc } = C();
  if (cli.tram) {
    mainEl.innerHTML = `<div class="card cli-cab"><button class="lnk" id="volver">← Clientes</button><h3 class="cli-h" style="margin-top:6px">🔗 Trámites</h3><p class="muted cli-sub">Para llenar con los datos de alguien, ábrelo desde su ficha (🔗 Trámites): la cédula queda copiada lista para pegar.</p></div>${secTramites(null)}`;
    mainEl.querySelector('#volver').onclick = () => { cli = null; verLista(); };
    return montarTramites(null);
  }
  mainEl.innerHTML = `<div class="card cli-cab"><button class="lnk" id="volver">← Clientes</button>
      <h3 class="cli-h" style="margin-top:6px">📑 Documento rápido</h3><p class="muted cli-sub">Para una persona que no tiene hoja de vida aquí. Se llena, se revisa y se baja; no queda guardado.</p>
      <div class="cli-docs">${Object.entries(DOCS).map(([k, x]) => `<button class="cli-doc" data-doc="${k}"><span>${x.e}</span>${esc(x.t)}</button>`).join('')}</div></div>`;
  mainEl.querySelector('#volver').onclick = () => { cli = null; verLista(); };
  mainEl.querySelectorAll('[data-doc]').forEach(b => b.onclick = () => asistenteDoc(b.dataset.doc));
}

/* ---------- trámites: enlaces a las páginas del gobierno con los datos del cliente a la mano ---------- */
function datosCopiables(d) {
  if (!d) return [];
  const fn = String(d.fecha_nac || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return [['Cédula', V(d.num_id)], ['Nombres', V(d.nombres)], ['Apellidos', V(d.apellidos)], ['Nacimiento', fn ? `${fn[3]}/${fn[2]}/${fn[1]}` : ''], ['Celular', V(d.celular)], ['Correo', V(d.correo)], ['Dirección', V(d.direccion)]].filter(x => x[1]);
}
function secTramites(d) {
  const { esc } = C();
  const datos = datosCopiables(d);
  return `<div class="card cli-tram">${datos.length ? `<p class="cli-l">Toca un dato para copiarlo (luego Ctrl+V en la página):</p><div class="cli-copia">${datos.map(([l, v]) => `<button data-copia="${esc(v)}"><i>${esc(l)}</i>${esc(v)}</button>`).join('')}</div>` : ''}
    <input class="inp" id="bTram" type="search" placeholder="🔎 Buscar trámite (policía, contraloría, RUNT…)" style="margin-top:10px">
    <div id="lTram" class="tp">${(window.TRAMITES || []).map((g, gi) => { const ic = icoTram(g.g); return `<section class="tp-g" data-g="${gi}" style="--tc:${ic[1]}"><header><span class="tp-ic">${ic[0]}</span><h4>${esc(g.g)}</h4><em>${g.l.length}</em></header>
      <div class="tp-grid">${g.l.map(([t, u]) => { const dom = String(u).replace(/^https?:\/\/(www\.)?/, '').split(/[/:]/)[0]; return `<a class="tp-c" href="${esc(u)}" target="_blank" rel="noopener" data-url="${esc(u)}" data-t="${esc((t + ' ' + g.g).toLowerCase())}"><b>${esc(t)}</b><span>${esc(dom)}</span><i>↗</i></a>`; }).join('')}</div></section>`; }).join('')}</div></div>`;
}
function icoTram(g) {
  const n = String(g).toLowerCase();
  return /antecedente|certificado/.test(n) ? ['🛡️', '#0d7c86'] : /salud|pensi/.test(n) ? ['🏥', '#1f8a5b'] : /nacional|documento/.test(n) ? ['🪪', '#3b5bdb'] : /empleo p/.test(n) ? ['🏛️', '#7048e8']
    : /contrataci/.test(n) ? ['📑', '#5c7cfa'] : /simit|multa|fotomulta/.test(n) ? ['🚦', '#e8590c'] : /tr[aá]nsito|veh/.test(n) ? ['🚗', '#e67700'] : /credit/.test(n) ? ['💳', '#c2255c']
    : /impuesto/.test(n) ? ['🧾', '#b35b00'] : /sena/.test(n) ? ['🎓', '#2b8a3e'] : /gobernaci/.test(n) ? ['🏞️', '#1971c2'] : /barranca/.test(n) ? ['🏙️', '#0b7285'] : ['🔗', '#495057'];
}
function montarTramites(d) {
  const ced = d && V(d.num_id);
  const copiar = async (v, msg) => { try { await navigator.clipboard.writeText(v); C().toast(msg || ('Copiado: ' + v)); } catch (e) { C().toast('No pude copiar: escríbelo a mano', true); } };
  mainEl.querySelectorAll('[data-copia]').forEach(b => b.onclick = () => copiar(b.dataset.copia));
  mainEl.querySelectorAll('#lTram a').forEach(a => a.onclick = () => { if (ced) copiar(ced, `Cédula ${ced} copiada: allá pégala con Ctrl+V`); });
  const b = mainEl.querySelector('#bTram');
  if (b) b.oninput = () => { const q = b.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    mainEl.querySelectorAll('.tp-g').forEach(g => { let n = 0; g.querySelectorAll('a').forEach(a => { const ok = !q || a.dataset.t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q); a.style.display = ok ? '' : 'none'; if (ok) n++; }); g.style.display = n ? '' : 'none'; }); };
}

/* ---------- subir una hoja de vida en Word: lee los datos y llena el formulario ---------- */
function subirHV() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    if (!/\.docx$/i.test(f.name)) return C().toast('Solo Word nuevo (.docx). Si es .doc, ábrelo en Word y guárdalo como .docx', true);
    C().toast('Leyendo la hoja de vida…');
    let r; try { r = await window.HVD.leer(f); } catch (e) { return C().toast('No pude leer ese Word: ' + e.message, true); }
    if (!V(r.d.nombres) && !V(r.d.num_id)) return C().toast('No encontré nombre ni cédula en ese Word. Llénala a mano con ＋ Nuevo.', true);
    const h = Object.assign(nuevaHV('Importada'), r.hv);
    // si la cédula ya existe, se agrega como otra hoja de vida de esa persona (no se borra nada)
    let ex = null;
    if (V(r.d.num_id)) { try { ex = (await C().rpc('cj_clientes_buscar', { p_token: C().S.token, p_q: r.d.num_id })).find(c => c.cedula === r.d.num_id.replace(/[^0-9A-Za-z]/g, '')); } catch (e) {} }
    if (ex) {
      const g = await C().rpc('cj_cliente_get', { p_token: C().S.token, p_id: ex.id });
      cli = { id: g.id, data: normalizar(g.data), info: g };
      Object.keys(r.d).forEach(k => { if (!V(cli.data[k]) && V(r.d[k])) cli.data[k] = r.d[k]; });
      C().toast(`${ex.nombre} ya estaba: la agrego como otra hoja de vida. Revisa y guarda.`);
      return asistenteHV(h, true);
    }
    cli = { id: null, data: normalizar(Object.assign({}, r.d)), hvPendiente: h };
    C().toast('Listo: revisa los datos y dale Continuar →');
    asistentePersona(true);
  };
  inp.click();
}

/* ---------- cuentas de cobro: cada cliente con sus empresas y su numeración ---------- */
const num3 = n => String(n).padStart(3, '0');
const pesos = v => { const n = Number(String(v || '').replace(/[^0-9]/g, '')); return n ? '$' + n.toLocaleString('es-CO') : ''; };
const EMP_CAMPOS = ['contratante', 'nit', 'concepto', 'valor', 'fpago', 'banco', 'tcuenta', 'ncuenta', 'iva', 'ret', 'ss'];
function cobrosDe(d) { d.cobros = d.cobros || { empresas: [], hechas: [] }; return d.cobros; }
function secCobros(d) {
  const { esc } = C();
  const cb = cobrosDe(d);
  return `<div class="card"><div class="row"><h3 class="grow cli-h">🧾 Cuentas de cobro</h3><button class="btn chico" id="nuevaEmp">＋ Empresa</button></div>
    <p class="muted cli-sub">Cada empresa lleva su propia numeración. Toca <b>🧾 Hacer cuenta</b> y sale el Word con el número que sigue.</p>
    ${cb.empresas.length ? cb.empresas.map(e => { const hs = cb.hechas.filter(h => h.emp === e.id); return `<div class="cli-emp">
      <div class="cli-fila"><div class="cli-fila-d"><b>${esc(e.contratante || 'Empresa')}</b><span>${e.nit ? 'NIT ' + esc(e.nit) + ' · ' : ''}sigue la N° ${num3(e.sig || 1)} · ${hs.length} hecha(s)</span></div>
        <div class="cli-ic"><button data-cemp="${e.id}" title="Editar empresa">✏️</button></div></div>
      <button class="btn cli-hacer" data-cnueva="${e.id}">🧾 Hacer cuenta de cobro N° ${num3(e.sig || 1)} en Word</button>
      ${hs.length ? `<div class="cli-hechos">${hs.slice(0, 12).map(h => `<div class="cli-hecho"><span>N° ${esc(h.numero)} · ${esc(pesos(h.valor))}</span><i>${esc(h.periodo || fcorta(h.fecha))}</i><button class="cli-ic1" data-crebajar="${h.id}" title="Volver a bajar">⬇️</button></div>`).join('')}</div>` : ''}</div>`; }).join('')
    : '<p class="muted" style="margin-top:8px">Todavía no tiene empresas. Toca "＋ Empresa" y agrega a quién le cobra.</p>'}</div>`;
}
function montarCobros(d) {
  const cb = cobrosDe(d);
  const q = s => mainEl.querySelectorAll(s);
  const ne = mainEl.querySelector('#nuevaEmp'); if (ne) ne.onclick = () => editarEmpresa(null);
  q('[data-cemp]').forEach(b => b.onclick = () => editarEmpresa(cb.empresas.find(e => e.id === b.dataset.cemp)));
  q('[data-cnueva]').forEach(b => b.onclick = () => nuevaCuenta(cb.empresas.find(e => e.id === b.dataset.cnueva)));
  q('[data-crebajar]').forEach(b => b.onclick = () => { const h = cb.hechas.find(x => x.id === b.dataset.crebajar); rebajar(h && { k: 'cobro', datos: h.datos }, b); });
}
function editarEmpresa(e) {
  const d = cli.data, cb = cobrosDe(d), nueva = !e;
  e = e ? Object.assign({}, e) : { id: uid(), sig: 1, fpago: 'banco', tcuenta: 'de ahorros', iva: true, ret: true, ss: true };
  const D = DOCS.cobro, def = n => (D.f.find(x => x[0] === n) || [n, {}])[1];
  const grupo = (t, em, lista, ayuda) => ({ t, e: em, ayuda, html: () => lista.map(n => campo(n, def(n), e[n])).join(''), montar: montarSeg, leer: f => lista.forEach(n => { const v = valorDe(f, n); if (v !== undefined) e[n] = v; }) });
  const pasos = [
    grupo('La empresa', '🏢', ['contratante', 'nit'], 'A quién le cobra este cliente.'),
    Object.assign(grupo('Lo que cobra siempre', '📝', ['concepto', 'valor'], 'Queda guardado para no escribirlo cada mes (se puede cambiar en cada cuenta).'), {}),
    grupo('Cómo le pagan', '🏦', ['fpago', 'banco', 'tcuenta', 'ncuenta'], null),
    { t: 'Numeración', e: '🔢', ayuda: 'El número de la próxima cuenta de cobro para esta empresa.', html: () => campo('sig', { l: 'Próximo número', num: 1 }, String(e.sig || 1)), leer: f => { e.sig = Math.max(1, parseInt(f.elements.sig.value, 10) || 1); } },
  ];
  pasos[0].valida = () => !V(e.contratante) ? 'Escribe el nombre de la empresa.' : '';
  asistente(nueva ? 'Nueva empresa' : 'Editar empresa', pasos, {
    t: 'Revisa', e: '✅', html: () => `<div class="cli-res"><div class="cli-res-b">${['contratante', 'nit', 'concepto', 'valor', 'fpago', 'banco', 'ncuenta'].map(n => `<div class="cli-res-i"><span>${C().esc(def(n).l || n)}</span><b>${C().esc(e[n] || '—')}</b></div>`).join('')}<div class="cli-res-i"><span>Próximo número</span><b>${num3(e.sig)}</b></div></div></div>`,
    acciones: [['💾 Guardar', async () => {
      const i = cb.empresas.findIndex(x => x.id === e.id); if (i >= 0) cb.empresas[i] = e; else cb.empresas.push(e);
      await guardarCli(); C().toast('Empresa guardada ✓');
      if (nueva) nuevaCuenta(cb.empresas.find(x => x.id === e.id) || e); else ficha('cobros');
      return false;
    }, true]],
  }, () => ficha('cobros'));
}
function nuevaCuenta(e) {
  const d = cli.data, cb = cobrosDe(d);
  const val = { numero: num3(e.sig || 1), periodo: '' }; EMP_CAMPOS.forEach(n => { if (e[n] != null && e[n] !== '') val[n] = e[n]; });
  asistenteDoc('cobro', { val, volver: () => ficha('cobros'), alBajar: datos => {
    cb.hechas.unshift({ id: uid(), emp: e.id, numero: datos.numero, fecha: hoy(), valor: datos.valor, periodo: datos.periodo, datos });
    const n = parseInt(String(datos.numero).replace(/\D/g, ''), 10);
    const emp = cb.empresas.find(x => x.id === e.id); if (emp) { emp.sig = Math.max(emp.sig || 1, (n || 0) + 1); EMP_CAMPOS.forEach(k => { if (datos[k] != null && k !== 'numero') emp[k] = datos[k]; }); }
  } });
}
async function rebajar(h, btn) {
  if (!h) return;
  if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
  try {
    const body = h.k === 'cobro' ? { tipo: 'cobro', datos: h.datos, caja_token: C().S.token } : { tipo: 'doc', doc: h.k, datos: h.datos, caja_token: C().S.token };
    await descargar(body, (h.k === 'cobro' ? 'cuenta-de-cobro-' + archivo(h.datos.numero) : h.k) + '-' + archivo(h.datos.nombre) + '.docx');
  } catch (e) { C().toast(e.message, true); }
  if (btn) { btn.disabled = false; btn.textContent = '⬇️'; }
}

/* ---------- asistente por pasos (genérico) ---------- */
// pasos: [{ t, e, html(), leer(), valida?() }], fin: { html(), acciones: [[texto, fn, primario]] }
function asistente(titulo, pasos, fin, salir) {
  const { esc } = C();
  let i = 0;
  const total = pasos.length + 1;
  const pinta = () => {
    const esFin = i === pasos.length, p = esFin ? fin : pasos[i];
    mainEl.innerHTML = `<div class="card cli-wiz"><div class="row"><button class="lnk" id="wSalir" style="padding:0">✕ Salir</button><span class="grow"></span><span class="muted">${esc(titulo)}</span></div>
        <div class="cli-prog"><i style="width:${Math.round((i + 1) * 100 / total)}%"></i></div>
        <div class="cli-pasos">${pasos.map((x, n) => `<button type="button" class="${n === i ? 'on' : n < i ? 'ok' : ''}" data-ir="${n}" title="${esc(x.t)}">${n < i ? '✓' : x.e}</button>`).join('')}<button type="button" class="${esFin ? 'on' : ''}" data-ir="${pasos.length}" title="Revisar">✅</button></div>
        <p class="muted" style="margin:10px 0 0">Paso ${i + 1} de ${total}</p><h2 class="cli-wt">${esFin ? (fin.e || '✅') + ' ' + esc(fin.t || 'Revisar') : p.e + ' ' + esc(p.t)}</h2>
        ${p.ayuda ? `<p class="muted" style="margin-top:4px">${p.ayuda}</p>` : ''}
        <form id="wForm" autocomplete="off">${esFin ? fin.html() : p.html()}</form>
        <p id="wMsg" class="muted" style="margin-top:10px"></p></div>
      <div class="cli-nav">${i > 0 ? '<button type="button" class="btn sec" id="wAtras">← Atrás</button>' : '<span></span>'}
        ${esFin ? fin.acciones.map((a, n) => `<button type="button" class="btn ${a[2] ? '' : 'sec'}" data-acc="${n}">${a[0]}</button>`).join('') : '<button type="button" class="btn" id="wSig">Continuar →</button>'}</div>`;
    const f = mainEl.querySelector('#wForm'), msg = mainEl.querySelector('#wMsg');
    if (!esFin && p.montar) p.montar(f);
    if (esFin && fin.montar) fin.montar(f, n => { i = n; pinta(); arriba(); });
    const leer = () => { if (!esFin && p.leer) p.leer(f); };
    const ir = n => { leer(); i = n; pinta(); arriba(); };
    mainEl.querySelector('#wSalir').onclick = () => { leer(); salir(); };
    mainEl.querySelectorAll('[data-ir]').forEach(b => b.onclick = () => { const n = Number(b.dataset.ir); if (n > i && !esFin && p.valida) { leer(); const e = p.valida(); if (e) { msg.className = 'note bad'; msg.textContent = e; return; } } ir(n); });
    const at = mainEl.querySelector('#wAtras'); if (at) at.onclick = () => ir(i - 1);
    const sg = mainEl.querySelector('#wSig');
    if (sg) sg.onclick = () => { leer(); const e = p.valida && p.valida(); if (e) { msg.className = 'note bad'; msg.textContent = e; return; } i++; pinta(); arriba(); };
    f.onsubmit = e => { e.preventDefault(); if (sg) sg.click(); };
    mainEl.querySelectorAll('[data-acc]').forEach(b => b.onclick = async () => {
      const a = fin.acciones[Number(b.dataset.acc)];
      b.disabled = true; msg.className = 'muted'; msg.textContent = 'Un momento…'; try { msg.scrollIntoView({ block: 'nearest' }); } catch (e) {}
      try { const r = await a[1](msg); if (r !== false && typeof r === 'string') { msg.className = 'note ok'; msg.textContent = r; } else if (r !== false) { msg.textContent = ''; } }
      catch (x) { msg.className = 'note bad'; msg.textContent = '⚠️ ' + (x.message || 'No se pudo generar'); try { msg.scrollIntoView({ block: 'nearest' }); } catch (e) {} }
      b.disabled = false;
    });
    const primero = f.querySelector('input:not([type=checkbox]):not([type=file]),textarea'); if (primero && !esFin && !('ontouchstart' in window)) setTimeout(() => primero.focus(), 60);
  };
  pinta();
}

/* campo de formulario */
function campo(n, def, v) {
  const { esc } = C();
  const l = def.l || n;
  let val = v == null || v === '' ? (def.v == null ? '' : def.v) : v;
  if (def.type === 'seg' && !def.o.some(x => String(x[0]) === String(val))) val = def.o[0][0];
  if (def.type === 'seg') return `<div class="cli-f"><span class="cli-l">${esc(l)}</span><div class="cli-seg" data-seg="${n}">${def.o.map(([k, t]) => `<button type="button" data-v="${esc(k)}" class="${String(val) === String(k) ? 'on' : ''}">${esc(t)}</button>`).join('')}</div><input type="hidden" name="${n}" value="${esc(val)}"></div>`;
  if (def.type === 'select') return `<label class="cli-f"><span class="cli-l">${esc(l)}</span><select class="inp" name="${n}">${def.o.map(([k, t]) => `<option value="${esc(k)}"${String(val) === String(k) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  if (def.type === 'area') return `<label class="cli-f"><span class="cli-l">${esc(l)}</span><textarea class="inp" name="${n}" rows="3" placeholder="${esc(def.ph || '')}">${esc(val)}</textarea></label>`;
  if (def.type === 'check') return `<label class="cli-f cli-chk"><input type="checkbox" name="${n}"${val ? ' checked' : ''}><span>${esc(l)}</span></label>`;
  return `<label class="cli-f"><span class="cli-l">${esc(l)}${def.req ? ' *' : ''}</span><input class="inp" name="${n}" type="${def.type || 'text'}"${def.num ? ' inputmode="numeric"' : ''} value="${esc(val)}" placeholder="${esc(def.ph || '')}"></label>`;
}
function montarSeg(f) { f.querySelectorAll('[data-seg]').forEach(s => s.querySelectorAll('button').forEach(b => b.onclick = () => { s.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); f.elements[s.dataset.seg].value = b.dataset.v; })); }
const valorDe = (f, n) => { const el = f.elements[n]; if (!el) return undefined; return el.type === 'checkbox' ? el.checked : el.value.trim(); };

/* ---------- asistente: datos de la persona ---------- */
function asistentePersona(nuevo) {
  const { esc } = C();
  const d = cli.data;
  const pasos = PASOS_PER.map(p => ({
    t: p.t, e: p.e,
    html: () => p.f.map(n => n === 'foto'
      ? `<div class="cli-f"><span class="cli-l">Foto 3x4 (opcional)</span><div class="row" style="gap:12px;align-items:center">${d.foto ? `<img id="fotoPrev" src="data:image/jpeg;base64,${d.foto}" class="cli-foto">` : '<div id="fotoPrev" class="cli-foto cli-sinfoto">👤</div>'}<label class="btn sec" style="cursor:pointer">📷 ${d.foto ? 'Cambiar' : 'Subir'} foto<input type="file" id="fotoIn" accept="image/*" hidden></label>${d.foto ? '<button type="button" class="lnk" id="fotoX">Quitar</button>' : ''}</div></div>`
      : campo(n, F_PER[n], d[n])).join(''),
    montar: f => {
      montarSeg(f);
      const fi = f.querySelector('#fotoIn');
      if (fi) fi.onchange = e => { const file = e.target.files[0]; if (!file) return; fotoJPEG(file).then(b64 => { d.foto = b64; f.querySelector('#fotoPrev').outerHTML = `<img id="fotoPrev" src="data:image/jpeg;base64,${b64}" class="cli-foto">`; }).catch(() => C().toast('No pude leer esa foto', true)); };
      const fx = f.querySelector('#fotoX'); if (fx) fx.onclick = () => { d.foto = ''; f.querySelector('#fotoPrev').outerHTML = '<div id="fotoPrev" class="cli-foto cli-sinfoto">👤</div>'; fx.remove(); };
    },
    leer: f => p.f.forEach(n => { const v = valorDe(f, n); if (v !== undefined) d[n] = v; }),
    valida: p.f.includes('nombres') ? () => !V(d.nombres) ? 'Escribe al menos los nombres.' : '' : null,
  }));
  const resumen = () => `<div class="cli-res">${PASOS_PER.map((p, n) => `<div class="cli-res-b"><div class="row"><b class="grow">${p.e} ${esc(p.t)}</b><button type="button" class="lnk" data-edit="${n}">Cambiar</button></div>
      ${p.f.filter(k => k !== 'foto').map(k => { let v = d[k]; if (F_PER[k].o) { const o = F_PER[k].o.find(x => x[0] === v); v = o ? o[1] : v; } if (F_PER[k].type === 'date') v = fcorta(v); return `<div class="cli-res-i"><span>${esc(F_PER[k].l)}</span><b>${esc(v || '—')}</b></div>`; }).join('')}
      ${p.f.includes('foto') ? `<div class="cli-res-i"><span>Foto</span><b>${d.foto ? '✓ tiene foto' : '—'}</b></div>` : ''}</div>`).join('')}</div>`;
  asistente(nuevo ? 'Nuevo cliente' : 'Editar datos', pasos, {
    t: 'Revisa que todo esté bien', e: '✅', html: resumen,
    montar: (f, ir) => f.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => ir(Number(b.dataset.edit))),
    acciones: [[nuevo ? '💾 Guardar y seguir con la hoja de vida →' : '💾 Guardar', async () => {
      if (!V(d.nombres)) throw new Error('Falta el nombre.');
      await guardarCli(); C().toast('Datos guardados ✓');
      if (nuevo) { const hp = cli.hvPendiente; cli.hvPendiente = null; asistenteHV(hp || nuevaHV('Principal'), true); return false; }
      ficha(); arriba(); return false;
    }, true]],
  }, () => { if (cli.id) ficha(); else { cli = null; verLista(); } });
}

/* ---------- asistente: una hoja de vida ---------- */
function itemEst(e = {}) {
  const { esc } = C();
  return `<div class="cli-item"><div class="cli-seg cli-seg-s" data-niv>${NIVELES.map(([n]) => `<button type="button" data-v="${n}" class="${n === (e.nivel || 'Secundaria') ? 'on' : ''}">${n}</button>`).join('')}</div>
    <input class="inp" data-k="inst" placeholder="¿Dónde estudió? Ej: Colegio Camilo Torres" value="${esc(e.inst || '')}">
    <input class="inp" data-k="titulo" placeholder="Título. Ej: Bachiller académico" value="${esc(e.titulo || (NIVELES.find(x => x[0] === (e.nivel || 'Secundaria')) || [])[1] || '')}">
    <div class="cli-2"><input class="inp" data-k="ciudad" placeholder="Ciudad" value="${esc(e.ciudad || 'Barrancabermeja')}"><label class="cli-fe"><span>Fecha de grado</span><input class="inp" type="date" data-k="fin" data-orig="${esc(e.fin || '')}" value="${/^\d{4}-\d{2}-\d{2}$/.test(e.fin || '') ? esc(e.fin) : ''}"></label></div>
    <div class="row cli-2b"><label class="cli-chk"><input type="checkbox" data-k="actual"${e.actual ? ' checked' : ''}><span>Estudia actualmente</span></label><button type="button" class="lnk cli-del">✕ Quitar</button></div></div>`;
}
function itemExp(e = {}) {
  const { esc } = C();
  return `<div class="cli-item"><input class="inp" data-k="empresa" placeholder="Empresa. Ej: ISMOCOL S.A." value="${esc(e.empresa || '')}">
    <input class="inp" data-k="cargo" placeholder="Cargo. Ej: Ayudante de obra" value="${esc(e.cargo || '')}">
    <div class="row" style="gap:8px"><label class="grow"><span class="muted" style="font-size:.85rem">Entró</span><input class="inp" type="date" data-k="ingreso" value="${esc(e.ingreso || '')}"></label>
    <label class="grow"><span class="muted" style="font-size:.85rem">Salió</span><input class="inp" type="date" data-k="fin" value="${esc(e.fin || '')}"></label></div>
    <label class="cli-chk"><input type="checkbox" data-k="actual"${e.actual ? ' checked' : ''}><span>Trabaja ahí todavía</span></label>
    <div class="row cli-2b"><input class="inp grow" data-k="ciudad" placeholder="Ciudad" value="${esc(e.ciudad || 'Barrancabermeja')}"><button type="button" class="lnk cli-del">✕ Quitar</button></div></div>`;
}
function leerItems(box) { return [...box.querySelectorAll('.cli-item')].map(it => { const o = {}; const s = it.querySelector('[data-niv] .on'); if (s) o.nivel = s.dataset.v; it.querySelectorAll('[data-k]').forEach(x => o[x.dataset.k] = x.type === 'checkbox' ? x.checked : (x.value.trim() || x.dataset.orig || '')); return o; }); }
function montarItems(f, box, add, fn) {
  const eng = () => {
    box.querySelectorAll('.cli-del').forEach(b => b.onclick = () => b.closest('.cli-item').remove());
    box.querySelectorAll('[data-niv]').forEach(s => s.querySelectorAll('button').forEach(b => b.onclick = () => {
      s.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      const t = s.parentNode.querySelector('[data-k=titulo]'), n = NIVELES.find(x => x[0] === b.dataset.v);
      if (t && (!t.value || NIVELES.some(x => x[1] === t.value))) t.value = n ? n[1] : '';
    }));
  };
  eng(); add.onclick = () => { box.insertAdjacentHTML('beforeend', fn()); eng(); const l = box.lastElementChild.querySelector('input'); if (l) l.focus(); };
}
function asistenteHV(h, nueva) {
  const { esc } = C();
  const d = cli.data;
  const refCampos = (k, quien) => [0, 1].map(i => { const r = (h[k] || [])[i] || {}; return `<div class="cli-item"><b>${quien} ${i + 1}</b>
    <input class="inp" name="${k}${i}n" placeholder="Nombre completo" value="${esc(r.nombre || '')}">
    <input class="inp" name="${k}${i}p" placeholder="${k === 'ref_fam' ? 'Parentesco u ocupación. Ej: Tía, ama de casa' : 'Ocupación. Ej: Comerciante'}" value="${esc(r.prof || '')}">
    <input class="inp" name="${k}${i}c" inputmode="numeric" placeholder="Celular" value="${esc(r.cel || '')}"></div>`; }).join('');
  const leerRef = (f, k) => { h[k] = [0, 1].map(i => ({ nombre: V(f.elements[k + i + 'n'].value), prof: V(f.elements[k + i + 'p'].value), cel: V(f.elements[k + i + 'c'].value) })); };
  const pasos = [
    { t: 'Nombre de esta hoja de vida', e: '🏷️', ayuda: 'Si la persona tiene varias (una para petroleras, otra para comercio…), así las diferencias.',
      html: () => campo('titulo', { l: 'Nombre', ph: 'Ej: Principal, Petrolera, Comercio' }, h.titulo), leer: f => { h.titulo = V(f.elements.titulo.value) || 'Principal'; } },
    { t: 'Estudios', e: '🎓', ayuda: 'Toca el nivel y escribe dónde estudió. Se ordenan solos: primaria, secundaria, técnico… y los cursos al final, por año.',
      html: () => `<div id="lEst">${(h.estudios.length ? h.estudios : [{}]).map(itemEst).join('')}</div><button type="button" class="btn sec full" id="addEst">＋ Agregar otro estudio</button>`,
      montar: f => montarItems(f, f.querySelector('#lEst'), f.querySelector('#addEst'), () => itemEst()),
      leer: f => { h.estudios = ordenarEstudios(leerItems(f.querySelector('#lEst')).filter(e => e.inst || (e.titulo && e.titulo !== 'Bachiller académico' && e.titulo !== 'Básica primaria'))); } },
    { t: 'Experiencia laboral', e: '💼', ayuda: 'En cualquier orden: se acomodan solas por fecha, de la más antigua a la más reciente. Si no tiene, déjalo vacío y escribe un perfil corto abajo.',
      html: () => `<div id="lExp">${h.experiencias.map(itemExp).join('')}</div><button type="button" class="btn sec full" id="addExp">＋ Agregar experiencia</button>
        ${campo('sin_exp', { l: 'Si no tiene experiencia: perfil corto (opcional)', type: 'area', ph: 'Busco mi primera oportunidad laboral. Soy una persona responsable, puntual…' }, h.sin_exp)}`,
      montar: f => montarItems(f, f.querySelector('#lExp'), f.querySelector('#addExp'), () => itemExp()),
      leer: f => { h.experiencias = ordenarFechas(leerItems(f.querySelector('#lExp')).filter(e => e.empresa), 'ingreso'); h.sin_exp = V(f.elements.sin_exp.value); } },
    { t: 'Referencias familiares', e: '👪', ayuda: 'Dos familiares que den buena cuenta de la persona.', html: () => refCampos('ref_fam', 'Familiar'), leer: f => leerRef(f, 'ref_fam') },
    { t: 'Referencias personales', e: '🤝', ayuda: 'Dos personas que no sean familia (amigos, vecinos, jefes).', html: () => refCampos('ref_per', 'Referencia'), leer: f => leerRef(f, 'ref_per') },
  ];
  const guardarHV = async () => {
    const n = d.hvs.findIndex(x => x.id === h.id);
    if (n >= 0) d.hvs[n] = h; else d.hvs.push(h);
    await guardarCli();
  };
  const resumen = () => `<div class="cli-res">
    <div class="cli-res-b"><div class="row"><b class="grow">🪪 ${esc(nombreDe(d))}</b></div><div class="cli-res-i"><span>Documento</span><b>${esc((d.tipo_id || 'C.C.') + ' ' + (d.num_id || '—'))}</b></div><div class="cli-res-i"><span>Celular</span><b>${esc(d.celular || '—')}</b></div></div>
    <div class="cli-res-b"><div class="row"><b class="grow">🎓 Estudios</b><button type="button" class="lnk" data-edit="1">Cambiar</button></div>${h.estudios.map(e => `<div class="cli-res-i"><span>${esc(e.nivel || '')}${e.actual ? ' · en curso' : e.fin ? ' · ' + esc(fcorta(e.fin) || anio(e.fin)) : ''}</span><b>${esc([e.titulo, e.inst].filter(Boolean).join(' · '))}</b></div>`).join('') || '<p class="muted">Sin estudios</p>'}</div>
    <div class="cli-res-b"><div class="row"><b class="grow">💼 Experiencia</b><button type="button" class="lnk" data-edit="2">Cambiar</button></div>${h.experiencias.map(e => `<div class="cli-res-i"><span>${esc(fcorta(e.ingreso) || '')}${e.actual ? ' → hoy' : e.fin ? ' → ' + esc(fcorta(e.fin)) : ''}</span><b>${esc([e.cargo, e.empresa].filter(Boolean).join(' · '))}</b></div>`).join('') || `<p class="muted">Sin experiencia${h.sin_exp ? ' · con perfil' : ''}</p>`}</div>
    <div class="cli-res-b"><div class="row"><b class="grow">👪 Familiares</b><button type="button" class="lnk" data-edit="3">Cambiar</button></div>${h.ref_fam.filter(r => r.nombre).map(r => `<div class="cli-res-i"><span>${esc(r.prof || '')}</span><b>${esc(r.nombre)} · ${esc(r.cel || '')}</b></div>`).join('') || '<p class="muted">Sin referencias</p>'}</div>
    <div class="cli-res-b"><div class="row"><b class="grow">🤝 Personales</b><button type="button" class="lnk" data-edit="4">Cambiar</button></div>${h.ref_per.filter(r => r.nombre).map(r => `<div class="cli-res-i"><span>${esc(r.prof || '')}</span><b>${esc(r.nombre)} · ${esc(r.cel || '')}</b></div>`).join('') || '<p class="muted">Sin referencias</p>'}</div></div>`;
  asistente('Hoja de vida · ' + (nombreDe(d) || ''), pasos, {
    t: 'Revisa y genera', e: '✅', html: resumen,
    montar: (f, ir) => f.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => ir(Number(b.dataset.edit))),
    acciones: [
      ['💾 Guardar', async () => { await guardarHV(); C().toast('Hoja de vida guardada ✓'); ficha('hv'); return false; }],
      ['⬇️ Word', async () => { await guardarHV(); await wordHV(h); return '✅ Guardada y descargada en Word.'; }, true],
    ],
  }, () => { if (cli.id) ficha('hv'); else { cli = null; verLista(); } });
}
async function wordHV(h, btn, formato) {
  const d = cli.data;
  if (!V(d.nombres) || !V(d.apellidos) || !V(d.num_id)) { const m = 'Para bajarla faltan nombres, apellidos o cédula: toca ✏️ Datos'; if (!btn) throw new Error(m); C().toast(m, true); return; }
  const txt = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
  try {
    const body = { formato: formato === 'pdf' ? 'pdf' : 'word', nombres: d.nombres, apellidos: d.apellidos, tipo_id: d.tipo_id, num_id: d.num_id, expedicion: d.expedicion, fecha_nac: d.fecha_nac, lugar_nac: d.lugar_nac, estado_civil: d.estado_civil,
      celular: d.celular, direccion: d.direccion, barrio: d.barrio, estudios: h.estudios, experiencias: h.experiencias, tiene_exp: (h.experiencias || []).length > 0, sin_exp: h.sin_exp,
      ref_fam: h.ref_fam, ref_per: h.ref_per, caja_token: C().S.token };
    if (d.foto) body.foto = d.foto;
    await descargar(body, 'hoja-de-vida-' + archivo(nombreDe(d)) + (d.hvs.length > 1 ? '-' + archivo(h.titulo) : '') + (formato === 'pdf' ? '.pdf' : '.docx'));
    if (btn) C().toast('Hoja de vida descargada ✓');
  } catch (e) { if (!btn) throw e; C().toast(e.message, true); }
  if (btn) { btn.disabled = false; btn.textContent = txt; }
}

// los otros 2 diseños se arman aquí mismo (sin esperar al servidor)
function disenoHV(h, tipo) {
  const d = cli.data;
  if (!V(d.nombres) || !V(d.num_id)) return C().toast('Para bajarla faltan nombres o cédula: toca ✏️ Datos', true);
  if (!window.HVD) return C().toast('Recarga la página para ver los diseños nuevos', true);
  bajarBlob(window.HVD[tipo](d, h), `hoja-de-vida-${tipo}-${archivo(nombreDe(d))}.docx`);
  C().toast('Hoja de vida ATS descargada ✓');
}

/* foto: recorta al centro en 3x4 y la baja a JPEG liviano */
function fotoJPEG(file) {
  return new Promise((ok, mal) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const W = 450, H = 600, c = document.createElement('canvas'); c.width = W; c.height = H;
      const r = Math.max(W / img.width, H / img.height), w = img.width * r, hh = img.height * r;
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.drawImage(img, (W - w) / 2, (H - hh) / 2, w, hh);
      URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', 0.82).split(',')[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); mal(); };
    img.src = url;
  });
}

/* ---------- asistente: un documento ---------- */
function prellenar(k, d) {
  const guardado = (d.docs || {})[k] || {};
  const hv = d.hvs[0] || {};
  const base = { ciudad: 'Barrancabermeja', fecha: hoy(), genero: d.genero || 'm', nombre: nombreDe(d), cedula: d.num_id || '', expedida: d.expedicion || '',
    celular: d.celular || '', correo: d.correo || '', direccion: [d.direccion, d.barrio].filter(Boolean).join(', ') };
  if (k === 'renuncia' || k === 'cobro') { const e = (hv.experiencias || []).find(x => x.actual) || (hv.experiencias || [])[0]; if (e) Object.assign(base, k === 'renuncia' ? { empresa: e.empresa, cargo: e.cargo, ingreso: e.ingreso } : { contratante: e.empresa }); }
  const o = Object.assign({}, base, guardado, { fecha: hoy() });
  PERS.forEach(x => { if (!V(guardado[x]) && base[x] != null) o[x] = base[x]; });
  return o;
}
function asistenteDoc(k, op = {}) {
  const { esc } = C();
  const D = DOCS[k], d = cli.data, val = Object.assign(prellenar(k, d), op.val || {});
  const def = ([n, o]) => Object.assign({}, BASE[n] || {}, o || {});
  const propios = D.f.filter(([n]) => !PERS.includes(n) && n !== 'ciudad' && n !== 'fecha');
  const deLaPersona = D.f.filter(([n]) => PERS.includes(n));
  const grupos = []; for (let i = 0; i < propios.length; i += 5) grupos.push(propios.slice(i, i + 5));
  const refs = D.ref ? d.hvs.flatMap(h => h[D.ref] || []).filter((r, i, a) => r && V(r.nombre) && a.findIndex(x => V(x.nombre) === V(r.nombre)) === i) : [];
  const paso = (lista, t, e, ayuda, extra) => ({
    t, e, ayuda,
    html: () => (extra ? extra() : '') + lista.map(x => campo(x[0], def(x), val[x[0]])).join(''),
    montar: f => { montarSeg(f); f.querySelectorAll('[data-ref]').forEach(b => b.onclick = () => {
      const r = refs[Number(b.dataset.ref)], set = (n, v) => { if (f.elements[n] && v) f.elements[n].value = v; };
      set('rnombre', r.nombre); set('rcel', r.cel); if (k === 'familiar') set('parentesco', r.prof); else set('rocup', r.prof);
      f.querySelectorAll('[data-ref]').forEach(x => x.classList.toggle('on', x === b));
    }); },
    leer: f => lista.forEach(([n]) => { const v = valorDe(f, n); if (v !== undefined) val[n] = v; }),
  });
  const titulos = { personal: ['¿Quién da la referencia?', 'Sobre la persona'], familiar: ['¿Qué familiar da la referencia?', 'Sobre la persona'], renuncia: ['El trabajo', 'La carta'], peticion: ['¿A quién y para qué?', 'Lo que pasó y lo que pide'], cobro: ['¿A quién se le cobra?', 'Cómo le pagan', 'Declaraciones'] }[k] || [];
  const pasos = grupos.map((g, i) => paso(g, titulos[i] || 'Datos del documento', ['📝', '🗒️', '📌'][i] || '📝', null,
    i === 0 && refs.length ? () => `<p class="cli-l">Toca una de sus referencias para llenar solo:</p><div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:10px">${refs.map((r, j) => `<button type="button" class="chip" data-ref="${j}">${esc(r.nombre)}</button>`).join('')}</div>` : null));
  pasos.push(paso(deLaPersona, 'Datos de ' + (V(d.nombres) || 'la persona'), '🪪', 'Ya vienen llenos: solo revisa que estén bien.'));
  pasos.push(paso([['ciudad'], ['fecha']], 'Ciudad y fecha', '📅', null));
  asistente(D.e + ' ' + D.t, pasos, {
    t: 'Genera el documento', e: '✅',
    html: () => `<div class="cli-res"><div class="cli-res-b">${D.f.map(x => { const df = def(x); let v = val[x[0]]; if (df.type === 'check') v = v ? 'Sí' : 'No'; else if (df.o) { const o = df.o.find(y => y[0] === v); v = o ? o[1] : v; } else if (df.type === 'date') v = fcorta(v); return `<div class="cli-res-i"><span>${esc(df.l || x[0])}</span><b>${esc(v || '—')}</b></div>`; }).join('')}</div></div>`,
    acciones: [['⬇️ Bajar Word', async () => {
      if (!V(val.nombre) || !V(val.cedula)) throw new Error('Faltan el nombre o la cédula.');
      const datos = {}; D.f.forEach(([n]) => { datos[n] = val[n] == null ? (def([n]).v ?? '') : val[n]; });
      const body = k === 'cobro' ? { tipo: 'cobro', datos, caja_token: C().S.token } : { tipo: 'doc', doc: k, datos, caja_token: C().S.token };
      await descargar(body, (k === 'cobro' ? 'cuenta-de-cobro-' + archivo(datos.numero) : k) + '-' + archivo(datos.nombre) + '.docx');
      if (cli.id) {
        d.docs = Object.assign({}, d.docs || {}, { [k]: datos });
        d.hechos = [{ id: uid(), k, fecha: new Date().toISOString(), por: (C().S.yo || {}).nombre || '', datos }].concat(d.hechos || []).slice(0, 200);
        if (op.alBajar) op.alBajar(datos);
        guardarCli().catch(() => {});
      }
      return '✅ Listo. Revisa tus descargas y ábrelo en Word antes de imprimir.';
    }, true]],
  }, op.volver || (() => ficha(cli.rapido ? 'docs' : (cli.modo || 'docs'))));
}

/* ---------- genera en el servidor y descarga ---------- */
const archivo = s => String(s || 'documento').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'documento';
async function descargar(body, nombre) {
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) { let j = {}; try { j = await r.json(); } catch (e) {} throw new Error(j.error || 'No se pudo generar el documento'); }
  bajarBlob(await r.blob(), nombre);
}
// guarda el archivo y deja un enlace visible por si el navegador no lo baja solo
function bajarBlob(b, nombre) {
  if (window.__ultimaUrl) URL.revokeObjectURL(window.__ultimaUrl);
  const url = window.__ultimaUrl = URL.createObjectURL(b);
  const a = document.createElement('a'); a.href = url; a.download = nombre; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 1000);
  const q = document.querySelector('#bajarOtraVez'); if (q) q.remove();
  const box = document.createElement('div'); box.id = 'bajarOtraVez'; box.className = 'bajar-otra';
  box.innerHTML = `<span>📄 ${nombre.replace(/[<>&]/g, '')}</span><a class="btn chico" href="${url}" download="${nombre.replace(/"/g, '')}">⬇️ Si no bajó, toca aquí</a><button type="button" class="lnk" aria-label="Cerrar">✕</button>`;
  box.querySelector('button').onclick = () => box.remove();
  document.body.appendChild(box); setTimeout(() => box.remove(), 60000);
}
})();
