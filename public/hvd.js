/* Caja La 52 · Hoja de vida en otros 2 diseños (Word): ATS (sencilla, la que leen los sistemas de las empresas) y Moderna a color.
   Se arman aquí mismo en el navegador; la hoja de vida original (plantilla) no se toca. */
(function () {
'use strict';
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const T = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
const x = s => T(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const mesAnio = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})/); return m ? `${MES[+m[2] - 1]} ${m[1]}` : (String(s || '').match(/(19|20)\d\d/) || [''])[0]; };
const fLarga = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${+m[3]} de ${MESL[+m[2] - 1]} de ${m[1]}` : T(s); };
const SIGLAS = /^(SENA|SAS|S\.A\.S\.?|S\.A\.?|LTDA\.?|ICBF|DIAN|UIS|UNAD|ESAP|UNIPAZ|ISMOCOL|ECP|IPS|EPS|ARL|RUNT|SIMIT|I\.E\.?|C\.C\.?)$/i;
const MENORES = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'en', 'a', 'o', 'u', 'para', 'con', 'por']);
const titulo = s => T(s).split(' ').map((w, i) => SIGLAS.test(w) ? w.toUpperCase() : (i > 0 && MENORES.has(w.toLowerCase()) ? w.toLowerCase() : w.toLowerCase().replace(/(^|[(/-])(\p{L})/gu, (a, b, c) => b + c.toUpperCase()))).join(' ');
const xr = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---------- zip (sin comprimir) ---------- */
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return b => { let c = -1; for (let i = 0; i < b.length; i++) c = t[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }; })();
function zip(files) {
  const enc = new TextEncoder(), partes = [], central = []; let off = 0;
  for (const f of files) {
    const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = CRC(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, 0, true); h.setUint16(12, 0x21, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    partes.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, 0, true); c.setUint16(14, 0x21, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), name);
    off += 30 + name.length + data.length;
  }
  const clen = central.reduce((s, b) => s + b.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, clen, true); e.setUint32(16, off, true);
  return new Blob([...partes, ...central, new Uint8Array(e.buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

/* ---------- partes de Word ---------- */
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
// run: texto con formato { b, i, sz (medios puntos), color, caps, font }
const run = (t, o = {}) => `<w:r><w:rPr>${o.font ? `<w:rFonts w:ascii="${o.font}" w:hAnsi="${o.font}" w:cs="${o.font}"/>` : ''}${o.b ? '<w:b/>' : ''}${o.i ? '<w:i/>' : ''}${o.caps ? '<w:caps/>' : ''}${o.color ? `<w:color w:val="${o.color}"/>` : ''}${o.sz ? `<w:sz w:val="${o.sz}"/><w:szCs w:val="${o.sz}"/>` : ''}${o.sp ? `<w:spacing w:val="${o.sp}"/>` : ''}</w:rPr><w:t xml:space="preserve">${xr(t)}</w:t></w:r>`;
// párrafo { al, antes, despues, borde (color), sombra, sangria, tab }
const par = (runs, o = {}) => `<w:p><w:pPr>${o.keep ? '<w:keepNext/>' : ''}${o.borde ? `<w:pBdr><w:bottom w:val="single" w:sz="${o.bordeSz || 8}" w:space="2" w:color="${o.borde}"/></w:pBdr>` : ''}${o.fondo ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.fondo}"/>` : ''}${o.tab ? `<w:tabs><w:tab w:val="right" w:pos="${o.tab}"/></w:tabs>` : ''}<w:spacing w:before="${o.antes || 0}" w:after="${o.despues == null ? 40 : o.despues}"${o.linea ? ` w:line="${o.linea}" w:lineRule="auto"` : ''}/>${o.sangria ? `<w:ind w:left="${o.sangria}"/>` : ''}${o.al ? `<w:jc w:val="${o.al}"/>` : ''}</w:pPr>${Array.isArray(runs) ? runs.join('') : runs}</w:p>`;
const tabRun = '<w:r><w:tab/></w:r>';
function documento(cuerpo, margen, fuente) {
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${cuerpo}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="${margen.t}" w:right="${margen.r}" w:bottom="${margen.b}" w:left="${margen.l}" w:header="400" w:footer="400" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const estilos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${fuente}" w:hAnsi="${fuente}" w:eastAsia="${fuente}" w:cs="${fuente}"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="es-CO"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="40" w:line="252" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="table" w:default="1" w:styleId="TablaNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>`;
  return { doc, estilos };
}
function paquete(doc, estilos, foto) {
  const files = [
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>` },
    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>` },
    { name: 'docProps/core.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Hoja de vida</dc:title><dc:creator>Internet La 52</dc:creator></cp:coreProperties>` },
    { name: 'word/_rels/document.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdE" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${foto ? '<Relationship Id="rIdFoto" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/foto.jpeg"/>' : ''}</Relationships>` },
    { name: 'word/styles.xml', data: estilos },
    { name: 'word/document.xml', data: doc },
  ];
  if (foto) files.push({ name: 'word/media/foto.jpeg', data: Uint8Array.from(atob(foto), c => c.charCodeAt(0)) });
  return zip(files);
}
const imagen = (cx, cy, borde) => `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="1" name="Foto"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="1" name="foto.jpeg"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdFoto"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${borde ? `<a:ln w="28575"><a:solidFill><a:srgbClr val="${borde}"/></a:solidFill></a:ln>` : ''}</pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;

/* ---------- datos ordenados (igual que la hoja de vida principal) ---------- */
const RANGO = [[/primaria|b[aá]sica/i, 1], [/secundaria|bachiller|media/i, 2], [/t[eé]cnico|t[eé]cnica/i, 3], [/tecn[oó]log/i, 4], [/universit|profesional|pregrado/i, 5], [/especiali|maestr|posgrado/i, 6], [/curso|diplomado|seminario|taller/i, 7]];
const rango = e => { const r = RANGO.find(([re]) => re.test(e.nivel || '')); return r ? r[1] : 8; };
const clave = s => { const m = String(s || '').match(/^(\d{4})(?:-(\d{2}))?/); return m ? m[1] + (m[2] || '00') : '9999'; };
function datos(d, h) {
  const est = (h.estudios || []).filter(e => e && (e.inst || e.titulo)).slice().sort((a, b) => rango(a) - rango(b) || clave(a.actual ? '9998' : a.fin).localeCompare(clave(b.actual ? '9998' : b.fin)));
  const exp = (h.experiencias || []).filter(e => e && e.empresa).slice().sort((a, b) => clave(a.ingreso).localeCompare(clave(b.ingreso)));
  const refs = [...(h.ref_fam || []).map(r => Object.assign({ tipo: 'Familiar' }, r)), ...(h.ref_per || []).map(r => Object.assign({ tipo: 'Personal' }, r))].filter(r => T(r.nombre));
  const nombre = titulo(`${d.nombres || ''} ${d.apellidos || ''}`);
  const doc = `${d.tipo_id || 'C.C.'} ${T(d.num_id)}${d.expedicion ? ' de ' + titulo(d.expedicion) : ''}`;
  const perfil = T(h.sin_exp) || (exp.length ? `Persona responsable y comprometida, con experiencia como ${titulo(exp[exp.length - 1].cargo || 'trabajador(a)').toLowerCase()} en ${titulo(exp[exp.length - 1].empresa)}. Puntual, con buena disposición para aprender y trabajar en equipo.` : 'Persona responsable, puntual y con muchas ganas de aprender. Busco mi primera oportunidad laboral para aportar con compromiso y buena actitud.');
  const fechasExp = e => `${mesAnio(e.ingreso) || ''}${e.ingreso ? ' – ' : ''}${e.actual ? 'actualmente' : mesAnio(e.fin) || ''}`;
  const finEst = e => e.actual ? 'en curso' : /^\d{4}-\d{2}-\d{2}$/.test(e.fin || '') ? fLarga(e.fin) : (String(e.fin || '').match(/(19|20)\d\d/) || [''])[0];
  return { est, exp, refs, nombre, doc, perfil, fechasExp, finEst };
}

/* ---------- diseño ATS: una columna, sin tablas ni imágenes ---------- */
function ats(d, h) {
  const D = datos(d, h), F = 'Calibri', AZ = '1F3864';
  const sec = t => par(run(t.toUpperCase(), { b: true, sz: 23, color: AZ, sp: 10 }), { antes: 220, despues: 80, borde: AZ, keep: true });
  const cont = [d.celular && 'Cel. ' + T(d.celular), d.correo && T(d.correo).toLowerCase(), [d.direccion, d.barrio].filter(Boolean).map(titulo).join(', '), 'Barrancabermeja, Santander'].filter(Boolean).join('  |  ');
  let b = par(run(D.nombre, { b: true, sz: 40, color: AZ }), { despues: 40 });
  b += par(run(D.doc, { sz: 21 }), { despues: 20 });
  b += par(run(cont, { sz: 20 }), { despues: 60 });
  b += sec('Perfil') + par(run(D.perfil), { al: 'both' });
  if (D.exp.length) {
    b += sec('Experiencia laboral');
    D.exp.forEach(e => {
      b += par([run(titulo(e.cargo || 'Cargo'), { b: true }), tabRun, run(D.fechasExp(e), { sz: 20 })], { antes: 100, despues: 10, tab: 9900, keep: true });
      b += par(run([titulo(e.empresa), titulo(e.ciudad)].filter(Boolean).join(' — '), { i: true }), { despues: 40 });
    });
  }
  b += sec('Formación académica');
  (D.est.length ? D.est : [{ titulo: 'Sin estudios registrados' }]).forEach(e => {
    b += par([run(titulo(e.titulo || e.nivel || ''), { b: true }), tabRun, run(D.finEst(e), { sz: 20 })], { antes: 80, despues: 10, tab: 9900, keep: true });
    b += par(run([titulo(e.inst), titulo(e.ciudad)].filter(Boolean).join(' — ')), { despues: 40 });
  });
  b += sec('Datos personales');
  [['Fecha de nacimiento', fLarga(d.fecha_nac)], ['Lugar de nacimiento', titulo(d.lugar_nac)], ['Estado civil', d.estado_civil]].filter(r => T(r[1])).forEach(r => { b += par([run(r[0] + ': ', { b: true }), run(r[1])], { despues: 20 }); });
  if (D.refs.length) {
    b += sec('Referencias');
    D.refs.forEach(r => { b += par([run(titulo(r.nombre), { b: true }), run(`  ·  ${r.tipo}${r.prof ? ' · ' + titulo(r.prof) : ''}${r.cel ? '  ·  Cel. ' + T(r.cel) : ''}`)], { despues: 30 }); });
  }
  const { doc, estilos } = documento(b, { t: 1000, r: 1150, b: 1000, l: 1150 }, F);
  return paquete(doc, estilos, null);
}

/* ---------- diseño moderno: franja de color, columna lateral y foto ---------- */
const TEMAS = { f: { a: '8E3B6F', b: 'F7EAF2', c: 'D9A5C4' }, m: { a: '0E5A73', b: 'E6F2F5', c: '9CC9D6' } };
function moderna(d, h) {
  const D = datos(d, h), tm = TEMAS[d.genero === 'f' ? 'f' : 'm'], F = 'Calibri';
  const bl = 'FFFFFF';
  const celda = (w, cont, fill, pad) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ''}<w:tcMar><w:top w:w="${pad}" w:type="dxa"/><w:left w:w="${pad}" w:type="dxa"/><w:bottom w:w="${pad}" w:type="dxa"/><w:right w:w="${pad}" w:type="dxa"/></w:tcMar></w:tcPr>${cont || par('')}</w:tc>`;
  const tabla = (anchos, filas) => `<w:tbl><w:tblPr><w:tblW w:w="${anchos.reduce((a, b) => a + b, 0)}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${anchos.map(a => `<w:gridCol w:w="${a}"/>`).join('')}</w:tblGrid>${filas}</w:tbl>`;
  const fila = cels => `<w:tr>${cels}</w:tr>`;
  // encabezado de color
  const enc = par(run(D.nombre.toUpperCase(), { b: true, sz: 44, color: bl, sp: 20 }), { despues: 40 })
    + par(run(D.exp.length ? titulo(D.exp[D.exp.length - 1].cargo || '') || 'Hoja de vida' : 'Hoja de vida', { sz: 24, color: tm.c, caps: true, sp: 30 }), { despues: 0 });
  // lateral
  const secL = t => par(run(t.toUpperCase(), { b: true, sz: 20, color: tm.a, sp: 20 }), { antes: 240, despues: 80, borde: tm.a, bordeSz: 6, keep: true });
  const item = (e, t) => par([run(e + '  ', { sz: 19, color: tm.a }), run(t, { sz: 19 })], { despues: 50 });
  let lat = d.foto ? par(imagen(1260000, 1680000, tm.a), { al: 'center', despues: 120 }) : '';
  lat += secL('Contacto');
  if (d.celular) lat += item('☎', T(d.celular));
  if (d.correo) lat += item('✉', T(d.correo).toLowerCase());
  if (d.direccion || d.barrio) lat += item('⌂', [d.direccion, d.barrio].filter(Boolean).map(titulo).join(', '));
  lat += item('◉', 'Barrancabermeja, Santander');
  lat += secL('Datos personales');
  lat += par([run('Documento', { b: true, sz: 18 })], { despues: 0 }) + par(run(D.doc, { sz: 19 }), { despues: 60 });
  [['Nacimiento', [fLarga(d.fecha_nac), titulo(d.lugar_nac)].filter(Boolean).join(', ')], ['Estado civil', d.estado_civil]].filter(r => T(r[1])).forEach(r => { lat += par(run(r[0], { b: true, sz: 18 }), { despues: 0 }) + par(run(r[1], { sz: 19 }), { despues: 60 }); });
  if (D.refs.length) {
    lat += secL('Referencias');
    D.refs.forEach(r => { lat += par(run(titulo(r.nombre), { b: true, sz: 19 }), { despues: 0 }) + par(run(`${r.tipo}${r.prof ? ' · ' + titulo(r.prof) : ''}`, { sz: 18, color: '555555' }), { despues: 0 }) + par(run(r.cel ? 'Cel. ' + T(r.cel) : '', { sz: 18 }), { despues: 90 }); });
  }
  // principal
  const secP = t => par([run('■  ', { sz: 22, color: tm.a }), run(t.toUpperCase(), { b: true, sz: 24, color: tm.a, sp: 20 })], { antes: 260, despues: 100, keep: true });
  let pri = secP('Perfil') + par(run(D.perfil, { sz: 21 }), { al: 'both', linea: 276 });
  if (D.exp.length) {
    pri += secP('Experiencia laboral');
    D.exp.forEach(e => {
      pri += par(run(titulo(e.cargo || 'Cargo'), { b: true, sz: 22 }), { antes: 80, despues: 0, keep: true });
      pri += par([run(titulo(e.empresa), { sz: 20, color: tm.a, b: true }), run(`   ${D.fechasExp(e)}${e.ciudad ? ' · ' + titulo(e.ciudad) : ''}`, { sz: 19, color: '666666' })], { despues: 80 });
    });
  }
  pri += secP('Formación académica');
  (D.est.length ? D.est : [{ titulo: 'Sin estudios registrados' }]).forEach(e => {
    pri += par([run(titulo(e.titulo || e.nivel || ''), { b: true, sz: 21 }), run(D.finEst(e) ? '   ' + D.finEst(e) : '', { sz: 19, color: '666666' })], { antes: 60, despues: 0, keep: true });
    pri += par(run([titulo(e.inst), titulo(e.ciudad)].filter(Boolean).join(' · '), { sz: 20, color: tm.a }), { despues: 70 });
  });
  const cuerpo = tabla([12240], fila(celda(12240, enc, tm.a, 500)))
    + tabla([3900, 8340], fila(celda(3900, lat, tm.b, 360) + celda(8340, pri, null, 420)))
    + par('', { despues: 0 });
  const { doc, estilos } = documento(cuerpo, { t: 0, r: 0, b: 400, l: 0 }, F);
  return paquete(doc, estilos, d.foto || null);
}

/* ---------- leer una hoja de vida en Word (.docx) y sacar los datos ---------- */
async function unzip(buf) {
  const u = new Uint8Array(buf), dv = new DataView(buf); let e = u.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('no es un archivo Word válido');
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = {};
  for (let i = 0; i < n; i++) {
    const met = dv.getUint16(p + 10, true), csz = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u.subarray(p + 46, p + 46 + nl));
    const lnl = dv.getUint16(off + 26, true), lxl = dv.getUint16(off + 28, true), ini = off + 30 + lnl + lxl;
    out[name] = { met, raw: u.subarray(ini, ini + csz) };
    p += 46 + nl + xl + cl;
  }
  const saca = async k => { const f = out[k]; if (!f) return null; if (f.met === 0) return f.raw; return new Uint8Array(await new Response(new Blob([f.raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()); };
  return { saca, nombres: Object.keys(out) };
}
const QUITA = s => String(s || '').normalize('NFD').replace(/ñ/g, 'ñ').replace(/Ñ/g, 'Ñ').replace(/[̀-ͯ]/g, '').toUpperCase();
const MESES = { ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6, JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, SETIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12 };
const MES3 = { ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6, JUL: 7, AGO: 8, SEP: 9, SET: 9, OCT: 10, NOV: 11, DIC: 12 };
const dos = n => String(n).padStart(2, '0');
/* todas las fechas de un texto, en orden: completas (AAAA-MM-DD), mes y año (AAAA-MM-01) o solo el año */
function fechasDe(s) {
  const t = QUITA(T(s)), out = [], usado = [];
  const add = (i, len, f) => { if (!f || usado.some(([a, b]) => i < b && i + len > a)) return; usado.push([i, i + len]); out.push({ i, f }); };
  const run = (re, fn) => { let m; while ((m = re.exec(t))) add(m.index, m[0].length, fn(m)); };
  const ok = (y, m, d) => (y > 1940 && y < 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) ? `${y}-${dos(m)}-${dos(d)}` : '';
  run(/\b(\d{1,2})\s*(?:\(\s*\d{1,2}\s*\)\s*)?(?:DIAS?\s+)?(?:DEL?\s+)?(?:MES\s+DE\s+)?(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|SETIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s*(?:DE[L]?\s+)?(?:ANO\s+)?(?:[A-Z ]{0,40}\(\s*)?((?:19|20)\d\d)/g, m => ok(+m[3], MESES[m[2]], +m[1]));
  run(/\b(\d{1,2})\s*[-./ ]\s*(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEPT?|SET|OCT|NOV|DIC)[A-Z]*\.?\s*[-./ ]\s*((?:19|20)\d\d)\b/g, m => ok(+m[3], MES3[m[2].slice(0, 3)], +m[1]));
  run(/\b(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*((?:19|20)\d\d)\b/g, m => ok(+m[3], +m[2], +m[1]));
  run(/\b((?:19|20)\d\d)[/.-](\d{1,2})[/.-](\d{1,2})\b/g, m => ok(+m[1], +m[2], +m[3]));
  run(/\b(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|SETIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE|ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEPT?|OCT|NOV|DIC)\.?\s*(?:DE[L]?\s+|[-/ ]\s*)?((?:19|20)\d\d)\b/g, m => { const n = MESES[m[1]] || MES3[m[1].slice(0, 3)]; return n ? `${m[2]}-${dos(n)}-01` : ''; });
  run(/\b(\d{1,2})\s*[/.-]\s*((?:19|20)\d\d)\b/g, m => (+m[1] >= 1 && +m[1] <= 12) ? `${m[2]}-${dos(m[1])}-01` : '');
  run(/\b((?:19|20)\d\d)\b/g, m => m[1]);
  return out.sort((a, b) => a.i - b.i).map(x => x.f);
}
const aFecha = s => fechasDe(s)[0] || '';
const AHORA = /ACTUAL|A LA FECHA|HASTA LA FECHA|PRESENTE|VIGENTE|HASTA HOY|EN CURSO|LABORANDO|CURSANDO/;
const QL = s => QUITA(s).replace(/Ñ/g, 'N');
const soloFechas = s => fechasDe(s).length && !/[A-Z]{4,}/.test(QUITA(s).replace(/\b(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|SETIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE|DESDE|HASTA|ACTUAL(MENTE)?|PRESENTE|FECHA|DEL?|AL?|ANO|EN CURSO)\b/g, ''));
const bonito = s => titulo(s);
const pal = s => new Set(QUITA(s).replace(/[^A-Z0-9Ñ ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !/^(SAS|LTDA|DEL|LOS|LAS|UNA|INSTITUCION|EDUCATIVA|COLEGIO|ESCUELA|INSTITUTO|EMPRESA|BARRANCABERMEJA)$/.test(w)));
function parecido(a, b) { const A = pal(a), B = pal(b); if (!A.size || !B.size) return 0; let n = 0; A.forEach(w => { if (B.has(w)) n++; }); return n / Math.min(A.size, B.size); }

/* ---------- secciones y etiquetas (muchos formatos de hoja de vida) ---------- */
const SECS = [[/^(ESTUDIOS|FORMACION|EDUCACION|INFORMACION ACADEMICA|DATOS ACADEMICOS|NIVEL EDUCATIVO|ESCOLARIDAD|CAPACITACION|CURSOS|OTROS ESTUDIOS|CERTIFICACIONES|ESTUDIOS REALIZADOS|PREPARACION ACADEMICA)/, 'est'],
  [/^(EXPERIENCIA|HISTORIA LABORAL|TRAYECTORIA|INFORMACION LABORAL|DATOS LABORALES|EMPLEOS|VIDA LABORAL|ANTECEDENTES LABORALES)/, 'exp'],
  [/^REFERENCIAS? FAMILIAR/, 'rf'], [/^REFERENCIAS? (PERSONAL|LABORAL|COMERCIAL)/, 'rp'], [/^REFERENCIAS?$/, 'rp'],
  [/^(PERFIL|OBJETIVO|RESUMEN|ACERCA DE|SOBRE MI|PRESENTACION)/, 'perfil'], [/^(DATOS PERSONALES|INFORMACION PERSONAL|DATOS BASICOS|DATOS GENERALES)/, 'dp'],
  [/^(HABILIDADES|COMPETENCIAS|IDIOMAS|APTITUDES|FORTALEZAS|ATENTAMENTE|DECLARO|CORDIALMENTE)/, 'otro']];
const esSec = P => { if (/:\s*\S/.test(P)) return null; const s = P.replace(/[:.\s]+$/, '').trim(); if (s.length > 45) return null; for (const [r, k] of SECS) if (r.test(s)) return k; return null; };
const ETQ_SOLA = /^(NOMBRES?( COMPLETOS?)?|APELLIDOS|IDENTIFICACION|CEDULA( DE CIUDADANIA)?|DOCUMENTO( DE IDENTIDAD)?|NUMERO DE (DOCUMENTO|CEDULA)|LUGAR DE EXPEDICION|EXPEDIDA EN|FECHA DE NACIMIENTO|LUGAR DE NACIMIENTO|ESTADO CIVIL|CELULAR|TELEFONOS?( CELULAR)?|MOVIL|DIRECCION|BARRIO|CORREO( ELECTRONICO)?|E-?MAIL|EMPRESA|ENTIDAD|EMPLEADOR|RAZON SOCIAL|CARGO( DESEMPENADO)?|PUESTO|FECHA DE (INGRESO|RETIRO|INICIO|TERMINACION|FINALIZACION|GRADO)|DESDE|HASTA|PERIODO|TIEMPO LABORADO|CIUDAD|JEFE INMEDIATO|FUNCIONES|INSTITUCION( EDUCATIVA)?|TITULO( OBTENIDO)?|ANO( DE GRADO)?|PROFESION|OCUPACION|PARENTESCO|NIVEL( EDUCATIVO)?|PROGRAMA|FECHAS?|TIEMPO|NOMBRE|TELEFONO|CEL)$/;
const LB = {
  emp: /^(NOMBRE DE LA )?(EMPRESA|ENTIDAD|EMPLEADOR|COMPANIA|CONTRATANTE|LUGAR DE TRABAJO|RAZON SOCIAL|ORGANIZACION)\b/,
  cargo: /^(CARGO|PUESTO|OFICIO|OCUPACION|ROL|LABOR DESEMPENADA)/,
  ini: /(INGRESO|INICIO|DESDE|FECHA INICIAL|VINCULACION)/,
  fin: /(RETIRO|FINALIZ|TERMINACION|SALIDA|HASTA|FECHA FINAL|DESVINCULACION|EGRESO)/,
  per: /(PERIODO|TIEMPO|DURACION|FECHAS?|LAPSO)$/,
  ciudad: /^(CIUDAD|MUNICIPIO|LUGAR|UBICACION)$/,
  nada: /(JEFE|TELEFONO|FUNCIONES|LOGROS|RESPONSABILIDADES|MOTIVO|SALARIO|CONTRATO|DIRECCION|NIT|REFERENCIA)/,
};
const SUF = /(\bS\.?\s?A\.?\s?S\b\.?|\bSAS\b|\bS\.\s?A\b\.?|\bLTDA\b\.?|\bE\.?\s?S\.?\s?P\b\.?|\bCONSORCIO\b|\bUNION TEMPORAL\b|\bCOOPERATIVA\b|\bCORPORACION\b|\bFUNDACION\b|\bASOCIACION\b|\bALCALDIA\b|\bGOBERNACION\b|\bHOSPITAL\b|\bCLINICA\b|\bECOPETROL\b|\bMINISTERIO\b|\bINVERSIONES\b|\bCOMERCIALIZADORA\b|\bDISTRIBUIDORA\b|\bINGENIERIA\b|\bCONSTRUCCIONES\b|\bCONSTRUCTORA\b|\bTRANSPORTES?\b|\bRESTAURANTE\b|\bTIENDA\b|\bSUPERMERCADO\b|\bDROGUERIA\b|\bFERRETERIA\b|\bALMACEN(ES)?\b|\bINDUSTRIAS?\b|\bGRUPO\b|\bSERVICIOS\b|\bE\.?\s?U\b\.?|\bS\.?\s?C\.?\s?A\b)/;
const INSTS = /(COLEGIO|INSTITUCION|INSTITUTO|ESCUELA|UNIVERSIDAD|\bSENA\b|SERVICIO NACIONAL DE APRENDIZAJE|CORPORACION|FUNDACION|POLITECNICO|CENTRO DE|CONCENTRACION|ACADEMIA|UNIPAZ|UNAD|UIS\b|ESAP)/;
const TITS = /(BACHILLER|TECNICO|TECNOLOGO|PROFESIONAL|LICENCIAD|INGENIER|ADMINISTRAD|CONTADOR|ABOGAD|ENFERMER|AUXILIAR|ESPECIALISTA|MAGISTER|BASICA PRIMARIA|PRIMARIA|CURSO|DIPLOMADO|SEMINARIO|CERTIFICADO EN|OPERARIO|SOLDADURA)/;
const DESCRIPCION = /^(•|-|\*|·|>|FUNCION|RESPONSAB|APOYO|MANEJO|REALIZ|ATENCION|ENCARGAD|ELABORA|CONTROL|SUPERVIS|ASISTEN|ORGANIZA|LIMPIEZA|ARCHIVO|VENTA|CUMPLI|PARTICIP|DESARROLL|COORDIN|EJECUC|MANTENIM|REPARAC|OPERAC)/;

/* texto de una hoja de vida (líneas) -> datos de la persona y su hoja de vida */
function parsear(lineasIn) {
  // unir "ETIQUETA" (sola) con el valor de la línea siguiente (tablas y formatos en columnas)
  const L0 = lineasIn.flatMap(p => String(p).split('\n')).map(s => s.replace(/[ \u00a0]{3,}/g, '\t').replace(/[  ]+/g, ' ').replace(/\t+/g, '\t').trim()).filter(Boolean), pars = [];
  for (let i = 0; i < L0.length; i++) {
    const s = L0[i], S = QL(s).replace(/[:.\s]+$/, '').trim();
    if (ETQ_SOLA.test(S) && L0[i + 1] && !ETQ_SOLA.test(QL(L0[i + 1]).replace(/[:.\s]+$/, '').trim()) && !esSec(QUITA(L0[i + 1])) && !/:\s*\S/.test(L0[i + 1])) { pars.push(s.replace(/[:\s]+$/, '') + ': ' + L0[i + 1]); i++; }
    else if (/:\s*\S/.test(s) && (s.match(/:/g) || []).length >= 2 && /\s[|·•]\s|\t/.test(s)) {
      // varias etiquetas en una misma línea: "Empresa: X | Cargo: Y | Tiempo: 2019 a 2020" (la empresa va primero)
      const seg = s.split(/\s*[|·•]\s*|\t/).map(T).filter(Boolean);
      seg.sort((a, b) => (LB.emp.test(QL(b.split(':')[0]).trim()) ? 1 : 0) - (LB.emp.test(QL(a.split(':')[0]).trim()) ? 1 : 0)).forEach(x => pars.push(x));
    } else pars.push(s);
  }
  const d = {}, hv = { estudios: [], experiencias: [], ref_fam: [], ref_per: [], sin_exp: '' };
  let sec = '', exp = null, ref = null, est = null;
  const cierraExp = () => { if (exp && exp.empresa) hv.experiencias.push(exp); exp = null; };
  const cierraRef = () => { if (ref && ref.nombre) (sec === 'rf' ? hv.ref_fam : hv.ref_per).push(ref); ref = null; };
  const etq = s => { const m = s.match(/^([A-Za-zÁÉÍÓÚÑáéíóúñ.º° /()]{2,40}?)\s*:\s*(.*)$/s); return m ? [QL(m[1]).replace(/\s+/g, ' ').trim(), m[2].replace(/\t+/g, ' ').trim()] : null; };
  const NIV = /^(PRIMARIA|BASICA PRIMARIA|SECUNDARIA|BASICA SECUNDARIA|BACHILLER(ATO)?|MEDIA|TECNICO|TECNICA|TECNOLOGO|TECNOLOGIA|UNIVERSITARIO|UNIVERSITARIA|PROFESIONAL|PREGRADO|POSGRADO|ESPECIALIZACION|MAESTRIA|CURSO|CURSOS|DIPLOMADO|SEMINARIO|CAPACITACION|OTROS ESTUDIOS|EDUCACION BASICA|EDUCACION MEDIA|EDUCACION SUPERIOR)$/;
  const nivelDe = s => { const t = QUITA(s); if (/PRIMARIA/.test(t)) return 'Primaria'; if (/SECUNDARIA|BACHILLER|MEDIA|BASICA/.test(t)) return 'Secundaria'; if (/TECNOLOG/.test(t)) return 'Tecnólogo'; if (/TECNIC/.test(t)) return 'Técnico'; if (/UNIVERSIT|PROFESIONAL|PREGRADO|POSGRADO|ESPECIALIZ|MAESTR|SUPERIOR|LICENCIAD|INGENIER/.test(t)) return 'Universitario'; return 'Curso'; };
  const nuevaExp = emp => { cierraExp(); exp = { empresa: bonito(emp), cargo: '', ingreso: '', fin: '', actual: false, ciudad: '' }; };
  const ponRango = txt => { if (!exp) return; const f = fechasDe(txt); if (f[0] && !exp.ingreso) exp.ingreso = f[0]; if (f[1] && !exp.fin) exp.fin = f[1]; if (AHORA.test(QUITA(txt)) && !exp.fin) exp.actual = true; };
  const pareceEmpresa = s => { const U = QUITA(s); if (SUF.test(U)) return true; return s.length >= 3 && s.length <= 70 && s === s.toUpperCase() && /[A-ZÑ]{3}/.test(U) && !/[.:;]$/.test(s) && !DESCRIPCION.test(U) && U.split(' ').length <= 9; };
  let pend = '';
  function lineaExp(p, e) {
    if (e) {
      const [k, v] = e;
      if (LB.emp.test(k)) { if (exp && exp.empresa === '' ) exp.empresa = bonito(v); else nuevaExp(v); return; }
      if (!exp) exp = { empresa: '', cargo: '', ingreso: '', fin: '', actual: false, ciudad: '' };
      if (LB.cargo.test(k)) { exp.cargo = bonito(v); return; }
      if (LB.nada.test(k)) return;
      if (LB.fin.test(k) && !LB.ini.test(k)) { if (AHORA.test(QUITA(v))) exp.actual = true; else { const f = fechasDe(v); if (f[0]) exp.fin = f[0]; } return; }
      if (LB.ini.test(k)) { const f = fechasDe(v); if (f[0]) exp.ingreso = f[0]; if (f[1]) exp.fin = f[1]; if (AHORA.test(QUITA(v))) exp.actual = true; return; }
      if (LB.per.test(k)) { ponRango(v); return; }
      if (LB.ciudad.test(k)) { exp.ciudad = bonito(v); return; }
      return;
    }
    if (DESCRIPCION.test(QUITA(p)) || p.length > 110) return; // funciones y párrafos largos no
    const partes = p.split(/\s+[-–—|•]\s+|\s*\|\s*|\t+|\s{3,}/).map(T).filter(Boolean);
    const conF = partes.filter(x => fechasDe(x).length || AHORA.test(QUITA(x))), sinF = partes.filter(x => !conF.includes(x));
    if (!sinF.length) { ponRango(p); return; }
    const a = sinF[0];
    if (SUF.test(QUITA(a)) && exp && exp.empresa && !exp.cargo && !exp.ingreso && !SUF.test(QUITA(exp.empresa))) { exp.cargo = exp.empresa; exp.empresa = bonito(a); }
    else if (SUF.test(QUITA(a)) || ((!exp || (exp.empresa && (exp.cargo || exp.ingreso))) && pareceEmpresa(a))) { nuevaExp(a); if (sinF[1]) exp.cargo = bonito(sinF[1]); else if (pend) exp.cargo = bonito(pend); pend = ''; }
    else if (exp && !exp.cargo && !exp.ingreso && !exp.actual && a.length <= 60 && !/\d{3}/.test(a)) exp.cargo = bonito(a);
    else if (exp && !exp.empresa) exp.empresa = bonito(a);
    else if (a.length <= 60 && !/\d{3}/.test(a)) { pend = a; return; }
    if (conF.length) ponRango(conF.join(' '));
  }
  let celSuelto = '', correoSuelto = '';
  for (let i = 0; i < pars.length; i++) {
    const p = pars[i], P = QL(p).replace(/\s+/g, ' ');
    const k = esSec(P);
    if (k) { cierraExp(); cierraRef(); sec = k; est = null; continue; }
    if (!correoSuelto) { const m = p.match(/[\w.+-]+@[\w-]+\.[\w.]+/); if (m && sec !== 'rf' && sec !== 'rp') correoSuelto = m[0].toLowerCase(); }
    if (!celSuelto && (sec === '' || sec === 'dp')) { const m = p.replace(/[\s.-]/g, '').match(/(?:^|\D)(3\d{9})(?!\d)/); if (m) celSuelto = m[1]; }
    const e = etq(p);
    if (!e && (sec === 'est' || sec === 'exp') && ETQ_SOLA.test(P.replace(/[:.\s]+$/, ''))) continue; // encabezados de tabla sueltos
    if (sec === 'perfil' && !e) { hv.sin_exp = (hv.sin_exp + ' ' + p).trim(); continue; }
    if (sec === 'est') {
      if (e && NIV.test(e[0])) { est = { nivel: nivelDe(e[0]), inst: bonito(e[1]), titulo: '', ciudad: '', fin: '' }; hv.estudios.push(est); continue; }
      if (e && /^(TITULO|TITULO OBTENIDO|PROGRAMA|CARRERA|TITULO ALCANZADO)$/.test(e[0])) { if (!est || est.titulo) { est = { nivel: nivelDe(e[1]), inst: '', titulo: '', ciudad: '', fin: '' }; hv.estudios.push(est); } est.titulo = bonito(e[1]); if (!est.nivel || est.nivel === 'Curso') est.nivel = nivelDe(e[1]); continue; }
      if (e && /^(INSTITUCION|INSTITUCION EDUCATIVA|COLEGIO|ESTABLECIMIENTO|UNIVERSIDAD|ENTIDAD|CENTRO EDUCATIVO|LUGAR DE ESTUDIO|ENTIDAD EDUCATIVA)$/.test(e[0])) { if (!est || est.inst) { est = { nivel: nivelDe(e[1]), inst: '', titulo: '', ciudad: '', fin: '' }; hv.estudios.push(est); } est.inst = bonito(e[1]); continue; }
      if (e && /^(ANO|FECHA|FECHA DE GRADO|ANO DE GRADO|FECHA DE FINALIZACION|ANO DE TERMINACION|FECHA DE TERMINACION|GRADUADO|FINALIZADO)/.test(e[0]) && est) { if (AHORA.test(QUITA(e[1]))) est.actual = true; else est.fin = fechasDe(e[1]).pop() || est.fin; continue; }
      if (e && /^(CIUDAD|LUGAR|MUNICIPIO)$/.test(e[0]) && est) { est.ciudad = bonito(e[1]); continue; }
      if (e && /^(NIVEL|NIVEL EDUCATIVO|GRADO)$/.test(e[0])) { est = { nivel: nivelDe(e[1]), inst: '', titulo: '', ciudad: '', fin: '' }; hv.estudios.push(est); continue; }
      if (!e) {
        const S = P.replace(/[:.\s]+$/, '');
        if (NIV.test(S) && (!est || (est.inst && est.titulo))) { est = { nivel: nivelDe(S), inst: '', titulo: '', ciudad: '', fin: '' }; hv.estudios.push(est); continue; }
        if (est && soloFechas(p)) { if (AHORA.test(P)) est.actual = true; else est.fin = fechasDe(p).pop(); continue; }
        const partes = p.split(/\s+[-–—|]\s+|\t+|\s{3,}/).map(T).filter(Boolean);
        const inst = partes.find(x => INSTS.test(QUITA(x)));
        if (inst && (!est || est.inst)) {
          est = { nivel: nivelDe(p), inst: bonito(T(inst.replace(/\b(19|20)\d\d\b/g, '').replace(/[,;.\s-]+$/, ''))), titulo: '', ciudad: '', fin: fechasDe(p).pop() || '' }; hv.estudios.push(est);
          const tit = partes.find(x => x !== inst && TITS.test(QUITA(x)) && !fechasDe(x).length); if (tit) est.titulo = bonito(tit);
          if (AHORA.test(P)) est.actual = true; continue;
        }
        const limpio = x => T(String(x).replace(/\b(19|20)\d\d\b/g, '').replace(/[,;.\s-]+$/, ''));
        if (est && !est.inst) { est.inst = bonito(limpio(inst || partes[0])); if (fechasDe(p).length) est.fin = fechasDe(p).pop(); continue; }
        if (est && est.inst && est.titulo && TITS.test(P) && !INSTS.test(P)) { est = { nivel: nivelDe(p), inst: '', titulo: bonito(limpio(partes[0])), ciudad: '', fin: fechasDe(p).pop() || '' }; hv.estudios.push(est); continue; }
        if (est && !est.titulo) { const l = p.split('\n').map(T).filter(Boolean); est.titulo = bonito((l[0] || '').replace(/\s+[-–]\s+.*$/, '')); const r = (l[1] || (/\s+[-–]\s+/.test(l[0]) ? l[0].split(/\s+[-–]\s+/).slice(1).join(' - ') : '')); if (r) { const [c, f] = r.split(' - '); if (c && !fechasDe(c).length) est.ciudad = bonito(c); const ff = fechasDe(r).pop(); if (ff) est.fin = ff; } if (!est.fin && fechasDe(l[0]).length) est.fin = fechasDe(l[0]).pop(); if (est.nivel === 'Curso' && TITS.test(QUITA(est.titulo))) est.nivel = nivelDe(est.titulo); continue; }
        if (est && !est.ciudad) { const [c, f] = p.split(' - '); if (!fechasDe(c).length) est.ciudad = bonito(c); const ff = fechasDe(p).pop(); if (ff) est.fin = ff; continue; }
        if (!est && TITS.test(P)) { est = { nivel: nivelDe(p), inst: '', titulo: bonito(partes[0]), ciudad: '', fin: fechasDe(p).pop() || '' }; hv.estudios.push(est); continue; }
        continue;
      }
    }
    if (sec === 'exp') { lineaExp(p, e); continue; }
    if ((sec === 'rf' || sec === 'rp') && e) {
      if (/^NOMBRES?( COMPLETO)?( Y APELLIDOS?)?$/.test(e[0])) { cierraRef(); ref = { nombre: bonito(e[1]), prof: '', cel: '' }; continue; }
      if (!ref) continue;
      if (/PROFESION|OCUPACION|PARENTESCO|CARGO|RELACION/.test(e[0])) { ref.prof = bonito(e[1]); continue; }
      if (/CELULAR|TELEFONO|CEL|TEL|MOVIL|CONTACTO/.test(e[0])) { ref.cel = e[1].replace(/[^0-9 +]/g, '').trim(); continue; }
    }
    if ((sec === 'rf' || sec === 'rp') && !e) {
      // "NOMBRE – PARENTESCO – 3001234567"
      const tel = p.replace(/[\s.-]/g, '').match(/3\d{9}|\d{7,10}/), partes = p.split(/\s+[-–—|]\s+|\t+|\s{3,}|,\s*/).map(T).filter(Boolean);
      if (tel && partes.length >= 2) { cierraRef(); ref = { nombre: bonito(partes[0]), prof: bonito(partes.find((x, j) => j > 0 && !/\d{5}/.test(x)) || ''), cel: tel[0] }; cierraRef(); continue; }
      if (!ref && /^[A-ZÁÉÍÓÚÑ ]{6,50}$/.test(p)) { ref = { nombre: bonito(p), prof: '', cel: '' }; continue; }
      if (ref && !ref.cel && tel) { ref.cel = tel[0]; continue; }
      if (ref && !ref.prof && p.length < 40) { ref.prof = bonito(p); continue; }
    }
    if (e) {
      const [k, v] = e;
      if (/^NOMBRES?( COMPLETOS?)?$/.test(k) && !d.nombres && sec !== 'rf' && sec !== 'rp') { if (k === 'NOMBRE COMPLETO' || (k === 'NOMBRE' && v.split(' ').length > 2)) { const w = bonito(v).split(' '); d.nombres = w.slice(0, w.length > 3 ? 2 : 1).join(' '); d.apellidos = w.slice(w.length > 3 ? 2 : 1).join(' '); } else d.nombres = bonito(v); continue; }
      if (k === 'APELLIDOS') { d.apellidos = bonito(v); continue; }
      if (/^(IDENTIFICACION|CEDULA|DOCUMENTO|C\.?\s?C\.?|NO\.? DE (DOCUMENTO|CEDULA|IDENTIFICACION)|NUMERO DE (DOCUMENTO|CEDULA|IDENTIFICACION)|DOCUMENTO DE IDENTIDAD|CEDULA DE CIUDADANIA)/.test(k)) { const n = v.replace(/[.,\s]/g, '').match(/\d{5,12}/); if (n) d.num_id = n[0]; if (/C\.?\s?E\.?|EXTRANJERIA/.test(QUITA(v))) d.tipo_id = 'C.E.'; const ex = QUITA(v).match(/ DE ([A-Z ]+)$/); if (ex && !d.expedicion) d.expedicion = bonito(ex[1]); continue; }
      if (/EXPEDICION|EXPEDIDA/.test(k)) { d.expedicion = bonito(v.replace(/\b\d{1,2}[/.-]\d{1,2}[/.-]\d{4}\b/, '').replace(/^\s*DE\s+/i, '')); continue; }
      if (/FECHA DE NACIMIENTO|NACIMIENTO$|^NACIDO/.test(k) && /\d/.test(v)) { d.fecha_nac = aFecha(v); continue; }
      if (/LUGAR DE NACIMIENTO/.test(k)) { d.lugar_nac = bonito(v); continue; }
      if (/ESTADO CIVIL/.test(k)) { const t = QUITA(v); d.estado_civil = /CASAD/.test(t) ? 'Casado(a)' : /UNION/.test(t) ? 'Unión libre' : /SEPARAD/.test(t) ? 'Separado(a)' : /DIVORC/.test(t) ? 'Divorciado(a)' : /VIUD/.test(t) ? 'Viudo(a)' : 'Soltero(a)'; continue; }
      if (/CELULAR|TELEFONO|MOVIL|CONTACTO/.test(k) && !d.celular) { d.celular = v.replace(/[^0-9]/g, '').slice(0, 10); continue; }
      if (/CORREO|E-?MAIL/.test(k)) { d.correo = v.trim().toLowerCase(); continue; }
      if (/DIRECCION|RESIDENCIA|DOMICILIO/.test(k)) { d.direccion = bonito(v); continue; }
      if (/BARRIO/.test(k)) { d.barrio = bonito(v); continue; }
      if (/^SEXO|GENERO/.test(k)) { d.genero = /^F|MUJER/.test(QUITA(v)) ? 'f' : 'm'; continue; }
    }
  }
  cierraExp(); cierraRef();
  // sin etiquetas de nombre: la primera línea suele ser el nombre completo
  if (!d.nombres) {
    const cab = pars.find(p => !p.includes(':') && /^[A-Za-zÁÉÍÓÚÑáéíóúñ ]{6,60}$/.test(p) && !/HOJA DE VIDA|CURRICULUM|DATOS|PERFIL/.test(QUITA(p)) && !esSec(QUITA(p)));
    if (cab) { const w = bonito(cab).split(' '); d.apellidos = w.length > 2 ? w.slice(-2).join(' ') : w.slice(1).join(' '); d.nombres = w.slice(0, w.length > 2 ? -2 : 1).join(' '); }
  }
  if (!d.num_id) { const m = pars.join(' ').replace(/(\d)[.,\s](?=\d)/g, '$1').match(/(?:C\.?\s?C\.?|C[EÉ]DULA|IDENTIFICACI[OÓ]N|DOCUMENTO)\s*(?:DE CIUDADAN[IÍ]A)?\s*(?:N[º°o.]*\s*)?:?\s*(\d{6,12})/i); if (m) d.num_id = m[1]; }
  if (!d.celular && celSuelto) d.celular = celSuelto;
  if (!d.correo && correoSuelto) d.correo = correoSuelto;
  if (!d.tipo_id) d.tipo_id = 'C.C.';
  if (!d.genero) { const n1 = QUITA((d.nombres || '').split(' ')[0]); d.genero = /A$/.test(n1) && !/^(LUCA|JOSUA|NICOLA|ELIAS|ISAIA|MATIA|JONATHA)/.test(n1) || /^(MARIA|LUZ|ISABEL|RAQUEL|INES|ROCIO|BEATRIZ|MERCEDES|CARMEN|SOL|NOHEMI|YANETH|JANETH|LIZETH|ESTHER|RUTH|MIRIAM|LOURDES|DOLORES|PILAR|CONSUELO|INGRID|MARIBEL|YAMILE|NELLY|DEISY|LEIDY|ARLETH|NAYIBE|YURANI|YULIETH)$/.test(n1) ? 'f' : 'm'; }
  // sin repetidos (mismo sitio y mismas fechas)
  const unico = (arr, clave) => arr.filter((x, i) => arr.findIndex(y => clave(y) === clave(x)) === i);
  hv.experiencias.forEach(x => { if (x.fin && x.ingreso && x.fin < x.ingreso) x.fin = ''; });
  hv.experiencias = unico(hv.experiencias.filter(x => x.empresa), x => QUITA(x.empresa) + x.ingreso + x.fin);
  hv.estudios = unico(hv.estudios.filter(x => x.inst || x.titulo), x => QUITA(x.inst + x.titulo) + x.fin);
  hv.ref_fam = (hv.ref_fam.concat([{}, {}])).slice(0, Math.max(2, hv.ref_fam.length)); hv.ref_per = (hv.ref_per.concat([{}, {}])).slice(0, Math.max(2, hv.ref_per.length));
  return { d, hv };
}
const textoP = p => p.replace(/<w:tab\/>/g, '\t').replace(/<w:br[^>]*\/>/g, '\n').replace(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g, '\u0001$1\u0002').replace(/<[^>]+>/g, '').replace(/\u0001|\u0002/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/[  ]+/g, ' ').trim();
function lineasDocx(xml) {
  xml = xml.replace(/<mc:Fallback>[\s\S]*?<\/mc:Fallback>/g, ''); // los cuadros de texto vienen repetidos
  const out = [], esEtq = c => ETQ_SOLA.test(QL(c).replace(/[:.\s]+$/, '').trim());
  for (const parte of xml.split(/(<w:tbl>[\s\S]*?<\/w:tbl>)/)) {
    if (!parte.startsWith('<w:tbl>')) { (parte.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []).map(textoP).filter(Boolean).forEach(l => out.push(l)); continue; }
    // tablas: si la primera fila son títulos (Institución | Título | Año) cada celda sale como "Título: valor"
    const filas = (parte.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || []).map(tr => (tr.match(/<w:tc[ >][\s\S]*?<\/w:tc>/g) || []).map(tc => (tc.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []).map(textoP).filter(Boolean).join('\n')));
    let cab = null;
    for (const f of filas) {
      const llenas = f.filter(Boolean);
      if (llenas.length >= 2 && llenas.every(esEtq)) { cab = f; continue; }
      if (cab) { f.forEach((c, j) => { if (c && cab[j]) out.push(cab[j].replace(/[:\s]+$/, '') + ': ' + c.replace(/\n/g, ' ')); }); continue; }
      if (llenas.length === 2 && esEtq(llenas[0])) { out.push(llenas[0].replace(/[:\s]+$/, '') + ': ' + llenas[1].replace(/\n/g, ' ')); continue; }
      f.forEach(c => c && c.split('\n').forEach(l => out.push(l)));
    }
  }
  return out;
}
async function leer(file) {
  const z = await unzip(await file.arrayBuffer());
  const xml = new TextDecoder().decode(await z.saca('word/document.xml') || new Uint8Array());
  if (!xml) throw new Error('no encontré el texto del documento');
  const r = parsear(lineasDocx(xml));
  // la foto que puso nuestro sistema en la hoja de vida
  const fz = await z.saca('word/media/foto_hv.jpeg');
  if (fz && fz.length < 600000) { let s = ''; for (let i = 0; i < fz.length; i += 8192) s += String.fromCharCode.apply(null, fz.subarray(i, i + 8192)); r.d.foto = btoa(s); }
  return r;
}

// imágenes pegadas dentro del Word (cédula, diplomas, certificados…)
async function imagenes(file) {
  const z = await unzip(await file.arrayBuffer()), out = [];
  for (const n of z.nombres.filter(n => /^word\/media\/.+\.(jpe?g|png|gif|bmp|webp)$/i.test(n) && !/foto_hv/i.test(n))) {
    const b = await z.saca(n); if (!b || b.length < 25000) continue; // logos e íconos no
    const ext = n.split('.').pop().toLowerCase();
    out.push({ nombre: n.split('/').pop(), blob: new Blob([b], { type: 'image/' + (ext === 'jpg' ? 'jpeg' : ext) }) });
  }
  return out;
}
async function textoWord(file) { const z = await unzip(await file.arrayBuffer()); return lineasDocx(new TextDecoder().decode(await z.saca('word/document.xml') || new Uint8Array())); }
window.HVD = { ats, moderna, leer, imagenes, parsear, fechasDe, parecido, textoWord };
})();
