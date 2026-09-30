/* Lee imágenes y soportes (cédula, diplomas, certificados) y saca datos y fechas.
   Se carga solo cuando se necesita. Usa Tesseract (OCR en español) y pdf.js para los PDF. */
(function () {
const TESS = 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js';
const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/';
const Q = s => String(s || '').normalize('NFD').replace(/n\u0303/g, 'ñ').replace(/N\u0303/g, 'Ñ').replace(/[\u0300-\u036f]/g, '').toUpperCase();
const MESES = { ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6, JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, SETIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12 };
const MES3 = { ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6, JUL: 7, AGO: 8, SEP: 9, SET: 9, OCT: 10, NOV: 11, DIC: 12 };
const iso = (y, m, d) => (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y > 1930 && y < 2100) ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '';

/* ---------- fechas escritas de mil formas ---------- */
function fechas(txt) {
  const t = Q(txt).replace(/[|]/g, ' ').replace(/\s+/g, ' '), out = [];
  const push = (i, f) => { if (f) out.push({ i, f }); };
  let m;
  const r1 = /\b(\d{1,2})\s*[-./ ]\s*(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEPT?|SET|OCT|NOV|DIC)[A-Z]*\.?\s*[-./ ]\s*((?:19|20)\d\d)\b/g;
  while ((m = r1.exec(t))) push(m.index, iso(+m[3], MES3[m[2].slice(0, 3)], +m[1]));
  const r2 = /\b(\d{1,2})\s*(?:\(\s*\d{1,2}\s*\)\s*)?(?:DIAS?\s+)?(?:DEL?\s+)?(?:MES\s+DE\s+)?(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|SETIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s*(?:DE[L]?\s+)?(?:ANO\s+)?(?:[A-Z ]{0,40}\(\s*)?((?:19|20)\d\d)/g;
  while ((m = r2.exec(t))) push(m.index, iso(+m[3], MESES[m[2]], +m[1]));
  // "a los cinco (5) días del mes de diciembre de dos mil veinte (2020)"
  const r3 = /\((\d{1,2})\)\s*DIAS?\s+DEL\s+MES\s+DE\s+([A-Z]+)[^()]{0,60}\(\s*((?:19|20)\d\d)\s*\)/g;
  while ((m = r3.exec(t))) push(m.index, iso(+m[3], MESES[m[2]], +m[1]));
  const r4 = /\b(\d{1,2})[/.-](\d{1,2})[/.-]((?:19|20)\d\d)\b/g;
  while ((m = r4.exec(t))) push(m.index, iso(+m[3], +m[2], +m[1]));
  const r5 = /\b((?:19|20)\d\d)[/-](\d{1,2})[/-](\d{1,2})\b/g;
  while ((m = r5.exec(t))) push(m.index, iso(+m[1], +m[2], +m[3]));
  return out.sort((a, b) => a.i - b.i);
}

/* ---------- cargar librerías solo cuando se usan ---------- */
function script(src) { return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('No pude cargar el lector de imágenes. Revisa el internet.')); document.head.appendChild(s); }); }
let worker = null;
async function lector() {
  if (!window.Tesseract) await script(TESS);
  if (!worker) worker = await window.Tesseract.createWorker('spa');
  return worker;
}
async function lienzo(blob) {
  const bmp = await createImageBitmap(blob);
  const mx = Math.max(bmp.width, bmp.height), k = mx > 2400 ? 2400 / mx : mx < 1200 ? 1200 / mx : 1;
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const g = c.getContext('2d'); g.filter = 'grayscale(1) contrast(1.25)'; g.drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}
async function pdfPaginas(file, max = 6) {
  const pdfjs = await import(PDFJS + 'pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.mjs';
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise, out = [];
  for (let i = 1; i <= Math.min(doc.numPages, max); i++) {
    const pg = await doc.getPage(i), vp = pg.getViewport({ scale: 2 });
    const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
    await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    // si el PDF ya trae texto, se usa directo (más exacto que leer la imagen)
    const tc = await pg.getTextContent(); const txt = tc.items.map(x => x.str + (x.hasEOL ? '\n' : ' ')).join('');
    out.push(txt.replace(/\s/g, '').length > 60 ? { texto: txt } : { img: await new Promise(r => c.toBlob(r, 'image/png')) });
  }
  return out;
}
/* archivos (imágenes, PDF o Word) -> lista de piezas {nombre, img|texto} */
async function piezas(files) {
  const out = [];
  for (const f of files) {
    const n = f.name || 'imagen';
    if (/\.pdf$/i.test(n) || f.type === 'application/pdf') (await pdfPaginas(f)).forEach((p, i) => out.push(Object.assign({ nombre: n + ' p' + (i + 1) }, p)));
    else if (/\.docx$/i.test(n)) (await window.HVD.imagenes(f)).forEach(x => out.push({ nombre: n + ' · ' + x.nombre, img: x.blob }));
    else if (/^image\//.test(f.type) || /\.(jpe?g|png|webp|bmp|gif)$/i.test(n)) out.push({ nombre: n, img: f });
  }
  return out;
}
async function textos(ps, avisa) {
  let w = null;
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    if (p.texto == null) {
      if (avisa) avisa(`Leyendo ${i + 1} de ${ps.length}${w ? '' : ' (la primera vez tarda un poco)'}…`);
      w = w || await lector();
      try { const { data } = await w.recognize(await lienzo(p.img)); p.texto = data.text || ''; } catch (e) { p.texto = ''; }
    }
  }
  return ps;
}

/* ---------- entender cada texto ---------- */
const ETQ = /^(APELLIDOS?|NOMBRES?|NUMERO|NUIP|FIRMA|FECHA DE NACIMIENTO|LUGAR DE NACIMIENTO|ESTATURA|G\.?\s?S\.?\s?RH|SEXO|FECHA Y LUGAR DE EXPEDICION|NACIONALIDAD|FECHA DE EXPIRACION|REGISTRADOR|REPUBLICA DE COLOMBIA|IDENTIFICACION PERSONAL|CEDULA DE CIUDADANIA|INDICE DERECHO)/;
const soloLetras = s => /^[A-ZÑ ]{3,60}$/.test(s) && !ETQ.test(s);
function lineas(txt) { return String(txt || '').split(/\n/).map(l => Q(l).replace(/[^A-Z0-9Ñ().,:/+ -]/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean); }
function esCedula(t) {
  const T = Q(t); let n = 0;
  [/IDENTIFICACION PERSONAL/, /\bNUIP\b/, /LUGAR DE EXPEDICION/, /G\.?\s?S\.?\s?RH/, /REGISTRADOR NACIONAL/, /INDICE DERECHO/, /LUGAR DE NACIMIENTO/, /^\s*APELLIDOS\s*$/m, /^\s*NOMBRES\s*$/m, /ESTATURA/, /REPUBLICA DE COLOMBIA/].forEach(r => { if (r.test(T)) n++; });
  if (/CEDULA DE CIUDADAN/.test(T)) n += 0.5;
  return n >= (/CERTIFICA|TITULO|OTORGA|HORAS|APROBO|DIPLOMA/.test(T) ? 4 : 2);
}
function cedula(txt) {
  const L = lineas(txt), T = L.join('\n'), nuevo = /\bNUIP\b|FECHA DE EXPIRACION|NACIONALIDAD/.test(T), r = {};
  const cerca = (re, pref) => { // valor junto a una etiqueta: la vieja lo pone arriba, la nueva abajo
    const i = L.findIndex(l => re.test(l)); if (i < 0) return '';
    const resto = L[i].replace(re, '').trim(); if (soloLetras(resto)) return resto;
    const orden = (pref || (nuevo ? 'abajo' : 'arriba')) === 'abajo' ? [i + 1, i + 2, i - 1] : [i - 1, i - 2, i - 3, i + 1];
    for (const j of orden) { const v = L[j] && L[j].replace(/\(.*\)?/, '').trim(); if (!v) continue; if (ETQ.test(v)) break; if (soloLetras(v)) return v; }
    return '';
  };
  const n = T.replace(/[.,]/g, '').match(/(?:NUMERO|NUIP|N[O0]\b|C\s?C)\s*:?\s*(\d[\d ]{5,13}\d)/); if (n) r.num_id = n[1].replace(/\s/g, '');
  const ap = cerca(/^APELLIDOS?\b/), no = cerca(/^NOMBRES?\b/);
  if (ap) r.apellidos = ap; if (no) r.nombres = no;
  const fl = (re, rango = 2) => { const i = L.findIndex(l => re.test(l)); if (i < 0) return null; for (let d = 0; d <= rango; d++) for (const j of [i, i - d, i + d]) { const f = L[j] && fechas(L[j])[0]; if (f) return { f: f.f, j }; } return null; };
  const fn = fl(/FECHA DE NACIMIENTO/); if (fn) r.fecha_nac = fn.f;
  const ln = cerca(/^LUGAR DE NACIMIENTO\b/); if (ln) r.lugar_nac = ln;
  const ex = L.findIndex(l => /LUGAR DE EXPEDICION/.test(l));
  if (ex >= 0) for (const j of nuevo ? [ex, ex + 1, ex - 1] : [ex, ex - 1, ex + 1]) {
    const l = L[j] || ''; const f = fechas(l)[0]; const ciudad = l.replace(/FECHA Y LUGAR DE EXPEDICION/, '').replace(/\b\d{1,2}\s*[-./ ]\s*[A-Z]{3,10}\.?\s*[-./ ]\s*\d{4}\b|\d{1,2}[/.-]\d{1,2}[/.-]\d{4}/, '').replace(/[^A-ZÑ ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (f || soloLetras(ciudad)) { if (f && !r.fecha_exp) r.fecha_exp = f.f; if (soloLetras(ciudad) && ciudad.length > 3) { r.expedicion = ciudad; break; } }
  }
  const sx = T.match(/SEXO\s*:?\s*\b([MF])\b|\b([MF])\s*\n?\s*(?:ESTATURA|.*SEXO)/); if (sx) r.genero = (sx[1] || sx[2]) === 'F' ? 'f' : 'm';
  return r;
}
const INST = /(INSTITUCION EDUCATIVA|INSTITUCION|INSTITUTO|COLEGIO|ESCUELA|UNIVERSIDAD|CORPORACION|FUNDACION UNIVERSITARIA|FUNDACION|SERVICIO NACIONAL DE APRENDIZAJE|CENTRO DE|POLITECNICO|CONCENTRACION)/;
const TIT = /(BACHILLER\w*|TECNICO\w*|TECNOLOGO\w*|PROFESIONAL|LICENCIAD\w*|INGENIER\w*|ADMINISTRAD\w*|CONTADOR\w*|ABOGAD\w*|ENFERMER\w*|AUXILIAR\w*|ESPECIALISTA|MAGISTER|BASICA PRIMARIA|PRIMARIA)/;
function esDiploma(t) { const T = Q(t); return /TITULO|OTORGA|CONFIERE|CERTIFICA|DIPLOMA|ACTA DE GRADO|CURSO Y APROBO|APROBO|GRADUAD|HORAS|ACCION DE FORMACION/.test(T) && !esCedula(t); }
function diploma(txt) {
  const L = lineas(txt), T = L.join('\n'), r = {};
  const il = L.find(l => INST.test(l)); if (il) r.inst = /SERVICIO NACIONAL DE APRENDIZAJE|\bSENA\b/.test(il) ? 'SENA' : il.replace(/^REPUBLICA DE COLOMBIA\s*/, '');
  else if (/\bSENA\b/.test(T)) r.inst = 'SENA';
  let i = L.findIndex(l => /TITULO DE|TITULO$|EL TITULO|ACCION DE FORMACION|PROGRAMA|EL CURSO|CURSO DE|DIPLOMADO EN|EN CALIDAD DE/.test(l));
  if (i >= 0) { const resto = L[i].replace(/.*(TITULO DE|EL TITULO|ACCION DE FORMACION|PROGRAMA( DE FORMACION)?( TITULADA)?|EL CURSO|CURSO DE|DIPLOMADO EN|EN CALIDAD DE)\s*:?\s*/, '').trim(); r.titulo = resto.length > 3 ? resto : (L.slice(i + 1).find(l => l.length > 3 && !/^(A|DE|EN)$/.test(l)) || ''); }
  if (!r.titulo) { const t = L.find(l => TIT.test(l) && !INST.test(l) && l.length < 70); if (t) r.titulo = t; }
  if (r.titulo) r.titulo = r.titulo.replace(/\s*(CON UNA DURACION|EN LA MODALIDAD|OTORGADO|A:?$).*$/, '').trim();
  const fs = fechas(T).map(x => x.f); if (fs.length) r.fin = fs.sort().pop(); // la más reciente suele ser la del grado
  const t = Q((r.titulo || '') + ' ' + (r.inst || '') + ' ' + T);
  r.nivel = /BASICA PRIMARIA|\bPRIMARIA\b/.test(Q(r.titulo)) ? 'Primaria' : /BACHILLER/.test(t) ? 'Secundaria' : /TECNOLOG/.test(t) ? 'Tecnólogo' : /\bTECNICO|TECNICA LABORAL|TECNICO LABORAL/.test(t) ? 'Técnico'
    : /UNIVERSIDAD|PROFESIONAL|LICENCIAD|INGENIER|ESPECIALI|MAGISTER|MAESTRIA/.test(t) ? 'Universitario' : 'Curso';
  const c = T.match(/(?:FIRMA EN|EXPIDE EN|EXPEDIDO EN|DADO EN|OTORGADO EN)\s+(?:LA CIUDAD DE\s+)?([A-ZÑ ]{4,30}?)(?:[,.]|\s+A\s+LOS|\s+EL\s|\s+\d|$)/m) || T.match(/\n([A-ZÑ ]{4,30}),?\s+\d{1,2}\s+DE\s+[A-Z]+\s+DE/);
  if (c) r.ciudad = c[1].trim(); else if (/BARRANCABERMEJA/.test(T)) r.ciudad = 'BARRANCABERMEJA';
  return r;
}

/* ---------- juntar lo encontrado con la persona y su hoja de vida ---------- */
const pal = s => new Set(Q(s).replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !/^(INSTITUCION|EDUCATIVA|COLEGIO|ESCUELA|INSTITUTO|NACIONAL|TECNICO|BARRANCABERMEJA)$/.test(w)));
function parecido(a, b) { const A = pal(a), B = pal(b); if (!A.size || !B.size) return 0; let n = 0; A.forEach(w => { if (B.has(w)) n++; }); return n / Math.min(A.size, B.size); }
const completa = f => /^\d{4}-\d{2}-\d{2}$/.test(f || '');
function aplicar(ps, d, hv) {
  const hechos = [];
  // si hay una cédula de otra persona, tampoco se usa el respaldo (que no trae nombre)
  const ajena = ps.some(p => p.texto && esCedula(p.texto) && (() => { const c = cedula(p.texto); return (c.num_id && String(d.num_id || '').trim() && String(d.num_id).replace(/\D/g, '') !== c.num_id) || (c.nombres && String(d.nombres || '').trim() && parecido(c.nombres + ' ' + (c.apellidos || ''), d.nombres + ' ' + (d.apellidos || '')) < 0.5); })());
  for (const p of ps) {
    if (!p.texto || p.texto.replace(/\s/g, '').length < 20) continue;
    if (esCedula(p.texto)) {
      const c = cedula(p.texto), puse = [];
      // que sea la cédula de esta misma persona
      const mismo = !c.num_id || !String(d.num_id || '').trim() || String(d.num_id).replace(/\D/g, '') === c.num_id;
      const nomOk = !c.nombres || !String(d.nombres || '').trim() || parecido(c.nombres + ' ' + (c.apellidos || ''), d.nombres + ' ' + (d.apellidos || '')) >= 0.5;
      if (!mismo || !nomOk || (ajena && !c.num_id && !c.nombres)) { hechos.push('⚠️ Una cédula no es de esta persona: no la usé'); continue; }
      const pon = (k, v, et) => { if (v && !String(d[k] || '').trim()) { d[k] = v; puse.push(et); } };
      pon('num_id', c.num_id, 'número'); pon('apellidos', c.apellidos, 'apellidos'); pon('nombres', c.nombres, 'nombres');
      pon('fecha_nac', c.fecha_nac, 'fecha de nacimiento'); pon('lugar_nac', c.lugar_nac, 'lugar de nacimiento'); pon('expedicion', c.expedicion, 'lugar de expedición');
      if (c.fecha_exp && !d.fecha_exp) d.fecha_exp = c.fecha_exp;
      hechos.push('🪪 Cédula' + (puse.length ? ': ' + puse.join(', ') : ' (ya tenía esos datos)'));
      continue;
    }
    if (hv && esDiploma(p.texto)) {
      const g = diploma(p.texto); if (!g.fin && !g.titulo) continue;
      let mejor = null, pm = 0;
      (hv.estudios || []).forEach(e => { let s = Math.max(parecido((g.inst || '') + ' ' + (g.titulo || ''), (e.inst || '') + ' ' + (e.titulo || '')), parecido(g.titulo, e.titulo)); if (e.nivel === g.nivel) s += 0.25; if (s > pm) { pm = s; mejor = e; } });
      if (mejor && pm >= 0.6) {
        const antes = mejor.fin;
        if (g.fin && !completa(mejor.fin)) mejor.fin = g.fin;
        if (!String(mejor.inst || '').trim() && g.inst) mejor.inst = g.inst;
        if (!String(mejor.titulo || '').trim() && g.titulo) mejor.titulo = g.titulo;
        if (!String(mejor.ciudad || '').trim() && g.ciudad) mejor.ciudad = g.ciudad;
        hechos.push(`🎓 ${mejor.titulo || mejor.inst}: ${mejor.fin !== antes ? 'fecha ' + mejor.fin.split('-').reverse().join('/') : 'ya tenía la fecha'}`);
      } else {
        hv.estudios = hv.estudios || [];
        hv.estudios.push({ nivel: g.nivel, inst: g.inst || '', titulo: g.titulo || '', ciudad: g.ciudad || '', fin: g.fin || '', actual: false });
        hechos.push(`🎓 Nuevo: ${g.titulo || g.inst || 'estudio'}${g.fin ? ' (' + g.fin.split('-').reverse().join('/') + ')' : ''}`);
      }
    }
  }
  return hechos;
}
async function leerSoportes(files, d, hv, avisa) {
  const ps = await textos(await piezas(files), avisa);
  return { hechos: aplicar(ps, d, hv), leidas: ps.length, textos: ps.map(p => p.texto) };
}
window.OCR = { leerSoportes, piezas, textos, aplicar, fechas, cedula, diploma, esCedula, esDiploma };
})();
