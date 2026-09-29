/* Caja La 52 · Clientes: los datos de cada persona y sus documentos en Word (hoja de vida, referencias, renuncia…).
   Tocar un documento abre el formulario con los datos del cliente para revisarlos y completarlos; solo al final se genera.
   El documento se arma en el servidor de ivanrodriguez.app con la sesión de la caja. No registra ventas. */
(function () {
'use strict';
const C = () => window.CAJA;
const API = 'https://ivanrodriguez.app/api/hv';
const hoy = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);
const V = v => String(v == null ? '' : v).trim();
const NIVELES = [['Primaria', 'Básica primaria'], ['Secundaria', 'Bachiller académico'], ['Técnico', ''], ['Tecnólogo', ''], ['Universitario', ''], ['Curso', '']];
const TIPOS_ID = ['C.C.', 'C.E.', 'PPT', 'T.I.'];
const CIVIL = ['Soltero(a)', 'Casado(a)', 'Unión libre', 'Separado(a)', 'Divorciado(a)', 'Viudo(a)'];
const SEXO = [['m', 'Hombre'], ['f', 'Mujer']];

/* ---------- campos de cada documento (los mismos de la página) ---------- */
const BASE = { ciudad: { l: 'Ciudad', v: 'Barrancabermeja' }, fecha: { l: 'Fecha', type: 'date' }, genero: { l: 'Redactar como', type: 'select', o: SEXO } };
const DOCS = {
  personal: { t: 'Referencia personal', e: '🤝', ref: 'ref_per', f: [
    ['ciudad'], ['fecha'],
    ['rnombre', { l: 'Nombre de quien da la referencia' }], ['rcedula', { l: 'Cédula de quien da la referencia', num: 1 }], ['rexp', { l: 'Lugar de expedición' }], ['rgenero', { l: 'Quien da la referencia es', type: 'select', o: SEXO }],
    ['nombre', { l: 'Nombre de la persona recomendada' }], ['cedula', { l: 'Cédula de la persona recomendada', num: 1 }], ['expedida', { l: 'Lugar de expedición' }], ['genero', { l: 'La persona recomendada es', type: 'select', o: SEXO }],
    ['tiempo', { l: '¿Hace cuánto la conoce?', ph: 'Ej: 8 años' }], ['cualidades', { l: 'Cualidades', v: 'honesta, responsable y trabajadora' }],
    ['rocup', { l: 'Ocupación de quien da la referencia' }], ['rcel', { l: 'Celular de quien da la referencia', num: 1 }], ['rdir', { l: 'Dirección o barrio (opcional)' }]] },
  familiar: { t: 'Referencia familiar', e: '👪', ref: 'ref_fam', f: [
    ['ciudad'], ['fecha'],
    ['rnombre', { l: 'Nombre del familiar que da la referencia' }], ['rcedula', { l: 'Cédula del familiar', num: 1 }], ['rexp', { l: 'Lugar de expedición' }], ['rgenero', { l: 'El familiar es', type: 'select', o: SEXO }],
    ['parentesco', { l: 'Parentesco (qué es el familiar de la persona)', ph: 'Ej: tío, hermana, primo' }],
    ['nombre', { l: 'Nombre de la persona recomendada' }], ['cedula', { l: 'Cédula de la persona recomendada', num: 1 }], ['expedida', { l: 'Lugar de expedición' }], ['genero', { l: 'La persona recomendada es', type: 'select', o: SEXO }],
    ['cualidades', { l: 'Cualidades', v: 'honesta, responsable y trabajadora' }],
    ['rocup', { l: 'Ocupación del familiar' }], ['rcel', { l: 'Celular del familiar', num: 1 }], ['rdir', { l: 'Dirección o barrio (opcional)' }]] },
  renuncia: { t: 'Carta de renuncia', e: '✍️', f: [
    ['ciudad'], ['fecha'], ['genero'],
    ['nombre', { l: 'Nombre completo' }], ['cedula', { l: 'Número de cédula', num: 1 }], ['expedida', { l: 'Lugar de expedición de la cédula' }],
    ['empresa', { l: 'Nombre de la empresa', ph: 'Ej: Servicios Industriales S.A.S.' }], ['destino', { l: 'Dirigida a (opcional)', ph: 'Ej: Área de Talento Humano' }],
    ['cargo', { l: 'Cargo', ph: 'Ej: Auxiliar de bodega' }], ['ingreso', { l: 'Fecha en que entró (opcional)', type: 'date' }], ['ultimo', { l: 'Último día de trabajo', type: 'date' }],
    ['motivo', { l: 'Motivo (opcional)', type: 'area', ph: 'Ej: motivos personales / una nueva oportunidad laboral' }],
    ['gracias', { l: 'Incluir agradecimiento a la empresa', type: 'check', v: true }], ['pedir', { l: 'Pedir liquidación, certificado laboral, examen de egreso y paz y salvo', type: 'check', v: true }],
    ['celular', { l: 'Celular (opcional)', num: 1 }], ['correo', { l: 'Correo (opcional)' }]] },
  peticion: { t: 'Derecho de petición', e: '📜', f: [
    ['ciudad'], ['fecha'], ['genero'],
    ['nombre', { l: 'Nombre completo' }], ['cedula', { l: 'Número de cédula', num: 1 }], ['expedida', { l: 'Lugar de expedición' }],
    ['entidad', { l: 'Entidad o empresa a la que se le escribe', ph: 'Ej: Alcaldía de Barrancabermeja' }], ['dependencia', { l: 'Dependencia (opcional)', ph: 'Ej: Secretaría de Infraestructura' }],
    ['asunto', { l: 'Asunto en pocas palabras', ph: 'Ej: Solicitud de copia de mi certificado laboral' }],
    ['hechos', { l: 'Hechos: qué pasó (uno por línea)', type: 'area' }],
    ['pide', { l: 'Qué pide (uno por línea)', type: 'area' }],
    ['anexos', { l: 'Anexos (opcional, uno por línea)', type: 'area', ph: 'Ej: Copia de la cédula' }],
    ['direccion', { l: 'Dirección para la respuesta' }], ['correo', { l: 'Correo para la respuesta' }], ['celular', { l: 'Celular', num: 1 }]] },
  cobro: { t: 'Cuenta de cobro', e: '🧾', f: [
    ['ciudad'], ['fecha'], ['numero', { l: 'Número de la cuenta de cobro', v: '001', num: 1 }],
    ['contratante', { l: 'A quién le cobra (empresa o persona)', ph: 'Ej: Servicios Industriales S.A.S.' }], ['nit', { l: 'NIT o cédula de quien paga' }],
    ['nombre', { l: 'Nombre completo' }], ['cedula', { l: 'Número de cédula', num: 1 }], ['expedida', { l: 'Lugar de expedición' }],
    ['valor', { l: 'Valor a cobrar (en pesos)', num: 1, ph: 'Ej: 1.750.905' }],
    ['concepto', { l: 'Por concepto de', type: 'area', ph: 'Ej: Prestación de servicios como auxiliar de obra en el proyecto X.' }],
    ['periodo', { l: 'Periodo cobrado (opcional)', ph: 'Ej: del 1 al 30 de septiembre de 2026' }],
    ['fpago', { l: 'Forma de pago', type: 'select', o: [['banco', 'Transferencia o consignación bancaria'], ['Nequi', 'Nequi'], ['Daviplata', 'Daviplata'], ['llave', 'Llave Bre-B'], ['efectivo', 'Efectivo'], ['cheque', 'Cheque']] }],
    ['banco', { l: 'Banco (si es transferencia)' }], ['tcuenta', { l: 'Tipo de cuenta', type: 'select', o: [['de ahorros', 'Ahorros'], ['corriente', 'Corriente']] }],
    ['ncuenta', { l: 'Número de cuenta, celular o llave' }],
    ['iva', { l: 'Declara que no es responsable de IVA', type: 'check', v: true }],
    ['ret', { l: 'Declara que no ha contratado a dos o más trabajadores (retención en la fuente)', type: 'check', v: true }],
    ['ss', { l: 'Adjunta el pago de seguridad social (PILA) del periodo', type: 'check', v: true }],
    ['celular', { l: 'Celular (opcional)', num: 1 }], ['correo', { l: 'Correo (opcional)' }], ['direccion', { l: 'Dirección (opcional)' }]] },
};

let mainEl = null, lista = [], q = '', cli = null; // cli = { id, data }

async function CLI(main) {
  mainEl = main;
  main.classList.remove('hoy', 'adm');
  if (cli) return ficha();
  await verLista();
}
window.CLI = CLI;

/* ---------- lista ---------- */
async function cargarLista() {
  const { rpc, S } = C();
  lista = await rpc('cj_clientes_buscar', { p_token: S.token, p_q: q });
}
async function verLista() {
  const { esc, toast } = C();
  mainEl.innerHTML = `<div class="card"><div class="row"><h2 class="grow" style="margin:0">👥 Clientes</h2><button class="btn" id="nuevoCli">＋ Nuevo cliente</button></div>
      <p class="muted" style="margin-top:6px">Los datos de cada persona para hacerle la hoja de vida, referencias, renuncia y demás documentos. Toca un documento, revisa los datos y genera el Word.</p>
      <input class="inp" id="bCli" type="search" placeholder="🔎 Buscar por nombre, cédula o celular" value="${esc(q)}" style="margin-top:10px"></div>
    <div class="card"><ul class="list" id="lCli"><li class="muted">Cargando…</li></ul></div>`;
  const pinta = () => {
    const ul = mainEl.querySelector('#lCli');
    ul.innerHTML = lista.length ? lista.map(c => `<li data-id="${c.id}" style="cursor:pointer"><div class="d"><div><b>${esc(c.nombre)}</b></div><div class="muted">${c.cedula ? 'C.C. ' + esc(c.cedula) : 'sin cédula'}${c.celular ? ' · ' + esc(c.celular) : ''} · ${esc(c.fecha)}</div></div><span class="lnk">Abrir →</span></li>`).join('')
      : `<li class="muted">${q ? 'No encontré a nadie con "' + esc(q) + '".' : 'Todavía no hay clientes. Toca "＋ Nuevo cliente".'}</li>`;
    ul.querySelectorAll('[data-id]').forEach(li => li.onclick = () => abrir(Number(li.dataset.id)));
  };
  mainEl.querySelector('#nuevoCli').onclick = () => { cli = { id: null, data: { tipo_id: 'C.C.', expedicion: 'Barrancabermeja', estudios: [], experiencias: [], ref_fam: [{}, {}], ref_per: [{}, {}] } }; formHV(true); };
  let t;
  mainEl.querySelector('#bCli').oninput = e => { clearTimeout(t); t = setTimeout(async () => { q = e.target.value; try { await cargarLista(); pinta(); } catch (x) { toast(x.message, true); } }, 300); };
  try { await cargarLista(); pinta(); } catch (x) { mainEl.querySelector('#lCli').innerHTML = `<li class="note bad">${esc(x.message)}</li>`; }
}

async function abrir(id) {
  const { rpc, S, toast } = C();
  try { const r = await rpc('cj_cliente_get', { p_token: S.token, p_id: id }); cli = { id: r.id, data: r.data || {}, info: r }; ficha(); window.scrollTo(0, 0); }
  catch (e) { toast(e.message, true); }
}

/* ---------- ficha de la persona ---------- */
function nombreDe(d) { return V((d.nombres || '') + ' ' + (d.apellidos || '')); }
function ficha() {
  const { esc, S } = C();
  const d = cli.data, i = cli.info || {};
  const falta = [!V(d.num_id) && 'cédula', !V(d.celular) && 'celular', !V(d.fecha_nac) && 'fecha de nacimiento', !(d.estudios || []).length && 'estudios', !(d.ref_per || []).some(r => V(r && r.nombre)) && 'referencias'].filter(Boolean);
  mainEl.innerHTML = `<div class="card"><button class="lnk" id="volver" style="padding:0">← Todos los clientes</button>
      <h2 style="margin:8px 0 2px">${esc(nombreDe(d) || 'Sin nombre')}</h2>
      <p class="muted">${d.num_id ? esc(d.tipo_id || 'C.C.') + ' ' + esc(d.num_id) : 'sin cédula'}${d.celular ? ' · 📱 ' + esc(d.celular) : ''}${i.fecha ? ' · actualizado ' + esc(i.fecha) + (i.actualizado_por ? ' por ' + esc(i.actualizado_por) : '') : ''}</p>
      ${falta.length ? `<p class="note warn" style="margin-top:8px">Faltan datos: ${esc(falta.join(', '))}. Complétalos en "Editar datos".</p>` : ''}
      <div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap"><button class="btn sec" id="editar">✏️ Editar datos</button>${S.yo && S.yo.rol === 'admin' ? '<button class="btn sec" id="quitar">Quitar cliente</button>' : ''}</div></div>
    <div class="card"><h2>📄 Documentos</h2><p class="muted">Toca uno: se abre con los datos de ${esc(V(d.nombres) || 'la persona')} para revisarlos y completarlos. El Word se genera al final.</p>
      <div class="cli-docs">
        <button class="cli-doc" data-doc="hv"><span>📄</span>Hoja de vida</button>
        ${Object.entries(DOCS).map(([k, x]) => `<button class="cli-doc" data-doc="${k}"><span>${x.e}</span>${esc(x.t)}</button>`).join('')}
      </div></div>`;
  mainEl.querySelector('#volver').onclick = () => { cli = null; verLista(); };
  mainEl.querySelector('#editar').onclick = () => formHV(false);
  const qu = mainEl.querySelector('#quitar');
  if (qu) qu.onclick = async () => { if (!confirm('¿Quitar a ' + nombreDe(d) + ' de la lista?')) return; try { await C().rpc('cj_cliente_quitar', { p_token: C().S.token, p_id: cli.id }); cli = null; verLista(); } catch (e) { C().toast(e.message, true); } };
  mainEl.querySelectorAll('[data-doc]').forEach(b => b.onclick = () => b.dataset.doc === 'hv' ? formHV(false, true) : formDoc(b.dataset.doc));
}

/* ---------- formulario de datos / hoja de vida ---------- */
function campo(n, l, v, o = {}) {
  const { esc } = C();
  if (o.type === 'select') return `<label class="lbl">${esc(l)}</label><select class="inp" name="${n}">${o.o.map(x => { const [val, txt] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(val)}"${String(v) === String(val) ? ' selected' : ''}>${esc(txt)}</option>`; }).join('')}</select>`;
  if (o.type === 'area') return `<label class="lbl">${esc(l)}</label><textarea class="inp" name="${n}" rows="3" placeholder="${esc(o.ph || '')}">${esc(v || '')}</textarea>`;
  if (o.type === 'check') return `<label class="row" style="gap:8px;margin-top:10px;align-items:flex-start"><input type="checkbox" name="${n}"${v ? ' checked' : ''} style="width:20px;height:20px;flex-shrink:0"><span>${esc(l)}</span></label>`;
  return `<label class="lbl">${esc(l)}</label><input class="inp" name="${n}" type="${o.type || 'text'}"${o.num ? ' inputmode="numeric"' : ''} value="${esc(v == null ? '' : v)}" placeholder="${esc(o.ph || '')}">`;
}
function itemEst(e = {}) {
  const { esc } = C();
  return `<div class="cli-item"><select class="inp" data-k="nivel">${NIVELES.map(([n]) => `<option${n === (e.nivel || 'Secundaria') ? ' selected' : ''}>${n}</option>`).join('')}</select>
    <input class="inp" data-k="inst" placeholder="Institución (Ej: Colegio Camilo Torres)" value="${esc(e.inst || '')}">
    <input class="inp" data-k="titulo" placeholder="Título (Ej: Bachiller académico)" value="${esc(e.titulo || '')}">
    <input class="inp" data-k="ciudad" placeholder="Ciudad" value="${esc(e.ciudad || 'Barrancabermeja')}"><button type="button" class="lnk cli-del">✕ Quitar</button></div>`;
}
function itemExp(e = {}) {
  const { esc } = C();
  return `<div class="cli-item"><input class="inp" data-k="empresa" placeholder="Empresa" value="${esc(e.empresa || '')}">
    <input class="inp" data-k="cargo" placeholder="Cargo" value="${esc(e.cargo || '')}">
    <label class="muted">Ingreso</label><input class="inp" type="date" data-k="ingreso" value="${esc(e.ingreso || '')}">
    <label class="muted">Salida</label><input class="inp" type="date" data-k="fin" value="${esc(e.fin || '')}">
    <input class="inp" data-k="ciudad" placeholder="Ciudad" value="${esc(e.ciudad || 'Barrancabermeja')}">
    <label class="row" style="gap:6px"><input type="checkbox" data-k="actual"${e.actual ? ' checked' : ''}> Trabaja ahí actualmente</label><button type="button" class="lnk cli-del">✕ Quitar</button></div>`;
}
function formHV(nuevo, generarAlFinal) {
  const { esc } = C();
  const d = cli.data;
  const ref = (k, i) => (d[k] || [])[i] || {};
  mainEl.innerHTML = `<div class="card"><button class="lnk" id="volver" style="padding:0">← ${nuevo ? 'Cancelar' : 'Volver a la ficha'}</button>
    <h2 style="margin:8px 0 0">${generarAlFinal ? '📄 Hoja de vida · revisa los datos' : nuevo ? '＋ Nuevo cliente' : '✏️ Datos del cliente'}</h2></div>
    <form id="fHV" autocomplete="off">
    <div class="card"><h2>🪪 Datos personales</h2>
      ${campo('nombres', 'Nombres *', d.nombres)}${campo('apellidos', 'Apellidos', d.apellidos)}
      ${campo('genero', 'Sexo', d.genero || 'm', { type: 'select', o: SEXO })}
      ${campo('tipo_id', 'Tipo de documento', d.tipo_id || 'C.C.', { type: 'select', o: TIPOS_ID })}${campo('num_id', 'Número de documento', d.num_id, { num: 1 })}
      ${campo('expedicion', 'Lugar de expedición', d.expedicion)}${campo('fecha_nac', 'Fecha de nacimiento', d.fecha_nac, { type: 'date' })}${campo('lugar_nac', 'Lugar de nacimiento', d.lugar_nac)}
      ${campo('estado_civil', 'Estado civil', d.estado_civil || 'Soltero(a)', { type: 'select', o: CIVIL })}
      ${campo('celular', 'Celular', d.celular, { num: 1 })}${campo('correo', 'Correo (opcional)', d.correo)}${campo('direccion', 'Dirección', d.direccion)}${campo('barrio', 'Barrio', d.barrio)}
      <label class="lbl">Foto 3x4 (opcional, para la hoja de vida)</label>
      <div class="row" style="gap:10px;align-items:center">${d.foto ? `<img id="fotoPrev" src="data:image/jpeg;base64,${d.foto}" style="width:60px;height:80px;object-fit:cover;border-radius:6px">` : '<span id="fotoPrev" class="muted">Sin foto</span>'}<input type="file" id="fotoIn" accept="image/*"><button type="button" class="lnk" id="fotoX"${d.foto ? '' : ' hidden'}>Quitar foto</button></div></div>
    <div class="card"><h2>🎓 Estudios</h2><div id="lEst">${(d.estudios || []).map(itemEst).join('')}</div><button type="button" class="btn sec" id="addEst">＋ Agregar estudio</button></div>
    <div class="card"><h2>💼 Experiencia laboral</h2><div id="lExp">${(d.experiencias || []).map(itemExp).join('')}</div><button type="button" class="btn sec" id="addExp">＋ Agregar experiencia</button>
      ${campo('sin_exp', 'Si no tiene experiencia: perfil corto (opcional)', d.sin_exp, { type: 'area', ph: 'Busco mi primera oportunidad laboral. Soy una persona responsable, puntual…' })}</div>
    <div class="card"><h2>👪 Referencias familiares</h2>${[0, 1].map(i => `<p class="muted" style="margin-top:8px">Familiar ${i + 1}</p>${campo('rf' + i + 'n', 'Nombre', ref('ref_fam', i).nombre)}${campo('rf' + i + 'p', 'Ocupación / parentesco', ref('ref_fam', i).prof)}${campo('rf' + i + 'c', 'Celular', ref('ref_fam', i).cel, { num: 1 })}`).join('')}</div>
    <div class="card"><h2>🤝 Referencias personales</h2>${[0, 1].map(i => `<p class="muted" style="margin-top:8px">Referencia ${i + 1}</p>${campo('rp' + i + 'n', 'Nombre', ref('ref_per', i).nombre)}${campo('rp' + i + 'p', 'Ocupación', ref('ref_per', i).prof)}${campo('rp' + i + 'c', 'Celular', ref('ref_per', i).cel, { num: 1 })}`).join('')}</div>
    <div class="card"><div class="row" style="gap:8px;flex-wrap:wrap"><button type="submit" class="btn grow">${generarAlFinal ? '💾 Guardar y generar hoja de vida' : '💾 Guardar datos'}</button>${generarAlFinal ? '' : '<button type="button" class="btn sec grow" id="guardarHV">💾 Guardar y generar hoja de vida</button>'}</div>
      <p class="muted" id="hvMsg" style="margin-top:8px"></p></div></form>`;
  const f = mainEl.querySelector('#fHV');
  const lEst = f.querySelector('#lEst'), lExp = f.querySelector('#lExp');
  const engancha = box => box.querySelectorAll('.cli-del').forEach(b => b.onclick = () => b.closest('.cli-item').remove());
  engancha(lEst); engancha(lExp);
  f.querySelector('#addEst').onclick = () => { lEst.insertAdjacentHTML('beforeend', itemEst()); engancha(lEst); };
  f.querySelector('#addExp').onclick = () => { lExp.insertAdjacentHTML('beforeend', itemExp()); engancha(lExp); };
  let foto = d.foto || '';
  f.querySelector('#fotoIn').onchange = e => { const file = e.target.files[0]; if (!file) return; fotoJPEG(file).then(b64 => { foto = b64; const p = f.querySelector('#fotoPrev'); p.outerHTML = `<img id="fotoPrev" src="data:image/jpeg;base64,${b64}" style="width:60px;height:80px;object-fit:cover;border-radius:6px">`; f.querySelector('#fotoX').hidden = false; }).catch(() => C().toast('No pude leer esa foto', true)); };
  f.querySelector('#fotoX').onclick = () => { foto = ''; f.querySelector('#fotoPrev').outerHTML = '<span id="fotoPrev" class="muted">Sin foto</span>'; f.querySelector('#fotoX').hidden = true; };
  mainEl.querySelector('#volver').onclick = () => { if (nuevo) { cli = null; verLista(); } else ficha(); };
  const leer = () => {
    const g = n => V((f.elements[n] || {}).value);
    const items = box => [...box.querySelectorAll('.cli-item')].map(it => { const o = {}; it.querySelectorAll('[data-k]').forEach(x => o[x.dataset.k] = x.type === 'checkbox' ? x.checked : x.value.trim()); return o; });
    const exps = items(lExp).filter(e => e.empresa);
    return Object.assign({}, d, {
      nombres: g('nombres'), apellidos: g('apellidos'), genero: g('genero'), tipo_id: g('tipo_id'), num_id: g('num_id'), expedicion: g('expedicion'),
      fecha_nac: g('fecha_nac'), lugar_nac: g('lugar_nac'), estado_civil: g('estado_civil'), celular: g('celular'), correo: g('correo'), direccion: g('direccion'), barrio: g('barrio'),
      foto, estudios: items(lEst).filter(e => e.inst || e.titulo), experiencias: exps, tiene_exp: exps.length > 0, sin_exp: g('sin_exp'),
      ref_fam: [0, 1].map(i => ({ nombre: g('rf' + i + 'n'), prof: g('rf' + i + 'p'), cel: g('rf' + i + 'c') })),
      ref_per: [0, 1].map(i => ({ nombre: g('rp' + i + 'n'), prof: g('rp' + i + 'p'), cel: g('rp' + i + 'c') })),
    });
  };
  const guardar = async (generar) => {
    const data = leer(), msg = f.querySelector('#hvMsg');
    if (!data.nombres) { msg.className = 'note bad'; msg.textContent = 'Escribe al menos los nombres.'; return; }
    if (generar && (!data.apellidos || !data.num_id)) { msg.className = 'note bad'; msg.textContent = 'Para la hoja de vida faltan apellidos o número de documento.'; return; }
    msg.className = 'muted'; msg.textContent = 'Guardando…';
    try {
      const r = await C().rpc('cj_cliente_guardar', { p_token: C().S.token, p_id: cli.id, p_data: data });
      cli.id = r.id; cli.data = data;
      if (!generar) { C().toast('Datos guardados ✓'); return ficha(); }
      msg.textContent = 'Generando la hoja de vida…';
      const body = Object.assign({}, data, { caja_token: C().S.token });
      if (!body.foto) delete body.foto;
      await descargar(body, 'hoja-de-vida-' + archivo(nombreDe(data)) + '.docx');
      msg.className = 'note ok'; msg.textContent = '✅ Hoja de vida descargada. Ábrela en Word y revísala antes de imprimir.';
    } catch (e) { msg.className = 'note bad'; msg.textContent = e.message; }
  };
  f.onsubmit = e => { e.preventDefault(); guardar(!!generarAlFinal); };
  const gh = f.querySelector('#guardarHV'); if (gh) gh.onclick = () => guardar(true);
}

/* foto: recorta al centro en 3x4 y la baja a JPEG liviano */
function fotoJPEG(file) {
  return new Promise((ok, mal) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const W = 450, H = 600, c = document.createElement('canvas'); c.width = W; c.height = H;
      const r = Math.max(W / img.width, H / img.height), w = img.width * r, h = img.height * r;
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', 0.82).split(',')[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); mal(); };
    img.src = url;
  });
}

/* ---------- formulario de un documento, lleno con los datos del cliente ---------- */
function prellenar(k, d) {
  const guardado = (d.docs || {})[k] || {};
  const base = { ciudad: 'Barrancabermeja', fecha: hoy(), genero: d.genero || 'm', nombre: nombreDe(d), cedula: d.num_id || '', expedida: d.expedicion || '',
    celular: d.celular || '', correo: d.correo || '', direccion: [d.direccion, d.barrio].filter(Boolean).join(', '), barrio: d.barrio || '' };
  if (k === 'renuncia' || k === 'cobro') { const e = (d.experiencias || []).find(x => x.actual) || (d.experiencias || [])[0]; if (e) Object.assign(base, k === 'renuncia' ? { empresa: e.empresa, cargo: e.cargo, ingreso: e.ingreso } : { contratante: e.empresa }); }
  // lo que se escribió la última vez para este documento (menos la fecha, que siempre es hoy)
  const o = Object.assign({}, base, guardado, { fecha: hoy() });
  ['nombre', 'cedula', 'expedida', 'genero'].forEach(x => { if (!V(guardado[x])) o[x] = base[x]; });
  return o;
}
function formDoc(k) {
  const { esc } = C();
  const D = DOCS[k], d = cli.data, val = prellenar(k, d);
  const refs = D.ref ? (d[D.ref] || []).filter(r => r && V(r.nombre)) : [];
  mainEl.innerHTML = `<div class="card"><button class="lnk" id="volver" style="padding:0">← Volver a la ficha</button>
      <h2 style="margin:8px 0 0">${D.e} ${esc(D.t)} · ${esc(nombreDe(d))}</h2>
      <p class="muted">Revisa y completa los datos. El Word se genera al final.</p>
      ${refs.length ? `<p style="margin-top:8px"><b>Usar una de sus referencias:</b></p><div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">${refs.map((r, i) => `<button type="button" class="chip" data-ref="${i}">${esc(r.nombre)}</button>`).join('')}</div>` : ''}</div>
    <form id="fDoc" class="card" autocomplete="off">${D.f.map(([n, o]) => { const def = Object.assign({}, BASE[n] || {}, o || {}); const v = val[n] != null && val[n] !== '' ? val[n] : (def.v != null ? def.v : ''); return campo(n, def.l || n, v, def); }).join('')}
      <button type="submit" class="btn full" style="margin-top:14px">⬇️ Generar ${esc(D.t.toLowerCase())}</button>
      <p class="muted" id="dMsg" style="margin-top:8px"></p></form>`;
  const f = mainEl.querySelector('#fDoc');
  mainEl.querySelector('#volver').onclick = () => ficha();
  mainEl.querySelectorAll('[data-ref]').forEach(b => b.onclick = () => {
    const r = refs[Number(b.dataset.ref)], set = (n, v) => { if (f.elements[n] && v) f.elements[n].value = v; };
    set('rnombre', r.nombre); set('rcel', r.cel); if (k === 'familiar') set('parentesco', r.prof); else set('rocup', r.prof);
    mainEl.querySelectorAll('[data-ref]').forEach(x => x.classList.toggle('on', x === b));
  });
  f.onsubmit = async e => {
    e.preventDefault();
    const msg = f.querySelector('#dMsg'), datos = {};
    D.f.forEach(([n, o]) => { const el = f.elements[n]; if (!el) return; datos[n] = el.type === 'checkbox' ? el.checked : el.value.trim(); });
    if (!V(datos.nombre) || !V(datos.cedula)) { msg.className = 'note bad'; msg.textContent = 'Faltan el nombre o la cédula.'; return; }
    msg.className = 'muted'; msg.textContent = 'Generando…';
    try {
      const body = k === 'cobro' ? { tipo: 'cobro', datos, caja_token: C().S.token } : { tipo: 'doc', doc: k, datos, caja_token: C().S.token };
      await descargar(body, (k === 'cobro' ? 'cuenta-de-cobro' : k) + '-' + archivo(datos.nombre) + '.docx');
      msg.className = 'note ok'; msg.textContent = '✅ Documento descargado. Ábrelo en Word y revísalo antes de imprimir.';
      // guarda lo escrito para la próxima vez (sin tocar los datos personales)
      const docs = Object.assign({}, d.docs || {}, { [k]: datos });
      cli.data = Object.assign({}, d, { docs });
      C().rpc('cj_cliente_guardar', { p_token: C().S.token, p_id: cli.id, p_data: cli.data }).catch(() => {});
    } catch (x) { msg.className = 'note bad'; msg.textContent = x.message; }
  };
}

/* ---------- genera en el servidor y descarga ---------- */
const archivo = s => String(s || 'documento').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'documento';
async function descargar(body, nombre) {
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) { let j = {}; try { j = await r.json(); } catch (e) {} throw new Error(j.error || 'No se pudo generar el documento'); }
  const b = await r.blob();
  const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nombre;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
})();
