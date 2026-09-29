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
const QUITA = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
const MESES = { ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6, JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, SETIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12 };
function aFecha(s) {
  const t = QUITA(T(s));
  let m = t.match(/(\d{1,2})\s*(?:DE\s+)?([A-Z]+)\s*(?:DE(?:L)?\s+)?(\d{4})/); if (m && MESES[m[2]]) return `${m[3]}-${String(MESES[m[2]]).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = t.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = t.match(/(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0];
  m = t.match(/([A-Z]+)\s*(?:DE(?:L)?\s+)?(\d{4})/); if (m && MESES[m[1]]) return `${m[2]}-${String(MESES[m[1]]).padStart(2, '0')}-01`;
  return (t.match(/(19|20)\d\d/) || [''])[0];
}
const bonito = s => titulo(s);
async function leer(file) {
  const z = await unzip(await file.arrayBuffer());
  const xml = new TextDecoder().decode(await z.saca('word/document.xml') || new Uint8Array());
  if (!xml) throw new Error('no encontré el texto del documento');
  // párrafos de texto (tab = separador de columnas, salto = nueva línea)
  const pars = (xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []).map(p => p.replace(/<w:tab\/>/g, '\t').replace(/<w:br[^>]*\/>/g, '\n').replace(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g, '\u0001$1\u0002').replace(/<[^>]+>/g, '').replace(/\u0001|\u0002/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")).map(s => s.replace(/[  ]+/g, ' ').trim()).filter(Boolean);
  const d = {}, hv = { estudios: [], experiencias: [], ref_fam: [], ref_per: [], sin_exp: '' };
  let sec = '', exp = null, ref = null, est = null;
  const cierraExp = () => { if (exp && exp.empresa) hv.experiencias.push(exp); exp = null; };
  const cierraRef = () => { if (ref && ref.nombre) (sec === 'rf' ? hv.ref_fam : hv.ref_per).push(ref); ref = null; };
  const etq = s => { const m = s.match(/^([A-Za-zÁÉÍÓÚÑáéíóúñ.º° /()]{2,40}?)\s*:\s*(.*)$/s); return m ? [QUITA(m[1]).replace(/\s+/g, ' ').trim(), m[2].replace(/\t+/g, ' ').trim()] : null; };
  const NIV = /^(PRIMARIA|BASICA PRIMARIA|SECUNDARIA|BACHILLER(ATO)?|MEDIA|TECNICO|TECNICA|TECNOLOGO|TECNOLOGIA|UNIVERSITARIO|UNIVERSITARIA|PROFESIONAL|PREGRADO|POSGRADO|ESPECIALIZACION|MAESTRIA|CURSO|CURSOS|DIPLOMADO|SEMINARIO|CAPACITACION|OTROS ESTUDIOS)$/;
  const nivelDe = s => { const t = QUITA(s); if (/PRIMARIA|BASICA/.test(t)) return 'Primaria'; if (/SECUNDARIA|BACHILLER|MEDIA/.test(t)) return 'Secundaria'; if (/TECNOLOG/.test(t)) return 'Tecnólogo'; if (/TECNIC/.test(t)) return 'Técnico'; if (/UNIVERSIT|PROFESIONAL|PREGRADO|POSGRADO|ESPECIALIZ|MAESTR/.test(t)) return 'Universitario'; return 'Curso'; };
  for (let i = 0; i < pars.length; i++) {
    const p = pars[i], P = QUITA(p).replace(/\s+/g, ' ');
    // títulos de sección
    if (!p.includes(':') || P.length < 40 && /^(ESTUDIOS|FORMACION|EXPERIENCIA|REFERENCIAS?|PERFIL|DATOS PERSONALES)/.test(P)) {
      if (/^(ESTUDIOS|FORMACION|EDUCACION)/.test(P)) { cierraExp(); cierraRef(); sec = 'est'; continue; }
      if (/^EXPERIENCIA/.test(P)) { cierraRef(); sec = 'exp'; continue; }
      if (/^REFERENCIAS? FAMILIAR/.test(P)) { cierraExp(); cierraRef(); sec = 'rf'; continue; }
      if (/^REFERENCIAS? (PERSONAL|LABORAL)/.test(P)) { cierraExp(); cierraRef(); sec = 'rp'; continue; }
      if (/^PERFIL/.test(P)) { cierraExp(); sec = 'perfil'; continue; }
      if (/^DATOS PERSONALES/.test(P)) { sec = 'dp'; continue; }
    }
    const e = etq(p);
    if (sec === 'perfil' && !e) { hv.sin_exp = (hv.sin_exp + ' ' + p).trim(); continue; }
    if (sec === 'est') {
      if (e && NIV.test(e[0])) { est = { nivel: nivelDe(e[0]), inst: bonito(e[1]), titulo: '', ciudad: '', fin: '' }; hv.estudios.push(est); continue; }
      if (e && /^(TITULO|TITULO OBTENIDO)$/.test(e[0]) && est) { est.titulo = bonito(e[1]); continue; }
      if (e && /^(INSTITUCION|COLEGIO|ESTABLECIMIENTO)$/.test(e[0])) { est = { nivel: 'Secundaria', inst: bonito(e[1]), titulo: '', ciudad: '', fin: '' }; hv.estudios.push(est); continue; }
      if (e && /^(ANO|FECHA|FECHA DE GRADO|ANO DE GRADO)$/.test(e[0]) && est) { est.fin = aFecha(e[1]); continue; }
      if (e && /^CIUDAD$/.test(e[0]) && est) { est.ciudad = bonito(e[1]); continue; }
      if (!e && est && !est.titulo) { const l = p.split('\n').map(T).filter(Boolean); est.titulo = bonito(l[0] || ''); if (l[1]) { const [c, f] = l[1].split(' - '); est.ciudad = bonito(c); if (f) est.fin = aFecha(f); } continue; }
      if (!e && est && !est.ciudad) { const [c, f] = p.split(' - '); est.ciudad = bonito(c); if (f) est.fin = aFecha(f); continue; }
    }
    if (sec === 'exp' && e) {
      if (/^(EMPRESA|ENTIDAD|EMPLEADOR)$/.test(e[0])) { cierraExp(); exp = { empresa: bonito(e[1]), cargo: '', ingreso: '', fin: '', actual: false, ciudad: '' }; continue; }
      if (!exp) exp = { empresa: '', cargo: '', ingreso: '', fin: '', actual: false, ciudad: '' };
      if (/^(CARGO|OFICIO)$/.test(e[0])) { exp.cargo = bonito(e[1]); continue; }
      if (/INGRESO|INICIO|DESDE/.test(e[0])) { exp.ingreso = aFecha(e[1]); continue; }
      if (/FINALIZ|RETIRO|SALIDA|HASTA|TERMINACION/.test(e[0])) { if (/ACTUAL/.test(QUITA(e[1]))) exp.actual = true; else exp.fin = aFecha(e[1]); continue; }
      if (/^CIUDAD$/.test(e[0])) { exp.ciudad = bonito(e[1]); continue; }
      if (/JEFE|TELEFONO|FUNCIONES/.test(e[0])) continue;
    }
    if ((sec === 'rf' || sec === 'rp') && e) {
      if (/^NOMBRES?( COMPLETO)?$/.test(e[0])) { cierraRef(); ref = { nombre: bonito(e[1]), prof: '', cel: '' }; continue; }
      if (!ref) continue;
      if (/PROFESION|OCUPACION|PARENTESCO|CARGO/.test(e[0])) { ref.prof = bonito(e[1]); continue; }
      if (/CELULAR|TELEFONO|CEL|TEL/.test(e[0])) { ref.cel = e[1].replace(/[^0-9 +]/g, '').trim(); continue; }
    }
    if (e) {
      const [k, v] = e;
      if (k === 'NOMBRES' || k === 'NOMBRE' && !d.nombres && sec !== 'rf' && sec !== 'rp') { d.nombres = bonito(v); continue; }
      if (k === 'APELLIDOS') { d.apellidos = bonito(v); continue; }
      if (/^(IDENTIFICACION|CEDULA|DOCUMENTO|C\.?C\.?|NO\.? DE (DOCUMENTO|CEDULA)|NUMERO DE (DOCUMENTO|CEDULA))/.test(k)) { const n = v.replace(/\./g, '').match(/\d{5,12}/); if (n) d.num_id = n[0]; if (/C\.?E\.?/.test(QUITA(v))) d.tipo_id = 'C.E.'; const ex = QUITA(v).match(/ DE ([A-Z ]+)$/); if (ex && !d.expedicion) d.expedicion = bonito(ex[1]); continue; }
      if (/EXPEDICION|EXPEDIDA/.test(k)) { d.expedicion = bonito(v); continue; }
      if (/FECHA DE NACIMIENTO|NACIMIENTO$/.test(k) && /\d/.test(v)) { d.fecha_nac = aFecha(v); continue; }
      if (/LUGAR DE NACIMIENTO/.test(k)) { d.lugar_nac = bonito(v); continue; }
      if (/ESTADO CIVIL/.test(k)) { const t = QUITA(v); d.estado_civil = /CASAD/.test(t) ? 'Casado(a)' : /UNION/.test(t) ? 'Unión libre' : /SEPARAD/.test(t) ? 'Separado(a)' : /DIVORC/.test(t) ? 'Divorciado(a)' : /VIUD/.test(t) ? 'Viudo(a)' : 'Soltero(a)'; continue; }
      if (/CELULAR|TELEFONO|MOVIL/.test(k) && !d.celular) { d.celular = v.replace(/[^0-9]/g, '').slice(0, 10); continue; }
      if (/CORREO|E-?MAIL/.test(k)) { d.correo = v.trim().toLowerCase(); continue; }
      if (/DIRECCION/.test(k)) { d.direccion = bonito(v); continue; }
      if (/BARRIO/.test(k)) { d.barrio = bonito(v); continue; }
    }
  }
  cierraExp(); cierraRef();
  // sin etiquetas de nombre: la primera línea suele ser el nombre completo
  if (!d.nombres) {
    const cab = pars.find(p => !p.includes(':') && /^[A-Za-zÁÉÍÓÚÑáéíóúñ ]{6,60}$/.test(p) && !/HOJA DE VIDA|CURRICULUM/.test(QUITA(p)));
    if (cab) { const w = bonito(cab).split(' '); d.apellidos = w.length > 2 ? w.slice(-2).join(' ') : w.slice(1).join(' '); d.nombres = w.slice(0, w.length > 2 ? -2 : 1).join(' '); }
  }
  if (!d.num_id) { const m = pars.join(' ').replace(/\./g, '').match(/C\s?C\s*(?:N[º°o.]?\s*)?(\d{6,12})/i); if (m) d.num_id = m[1]; }
  if (!d.tipo_id) d.tipo_id = 'C.C.';
  if (!d.genero) d.genero = 'm';
  hv.ref_fam = (hv.ref_fam.concat([{}, {}])).slice(0, 2); hv.ref_per = (hv.ref_per.concat([{}, {}])).slice(0, 2);
  // la foto que puso nuestro sistema en la hoja de vida
  const fz = await z.saca('word/media/foto_hv.jpeg');
  if (fz && fz.length < 600000) { let s = ''; for (let i = 0; i < fz.length; i += 8192) s += String.fromCharCode.apply(null, fz.subarray(i, i + 8192)); d.foto = btoa(s); }
  return { d, hv };
}

window.HVD = { ats, moderna, leer };
})();
