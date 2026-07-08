/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase";

// ─── SISTEMA DE SONIDOS WEB AUDIO ─────────────────────────────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let _ctx = null;
const getCtx = () => { if(!_ctx) _ctx = new AudioCtx(); return _ctx; };

// Helper: nota con panning surround (pan: -1=izq, 0=centro, 1=der)
const note = (ctx, freq, startT, dur, vol, pan=0, type="sine") => {
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const p = ctx.createStereoPanner();
    o.type = type;
    o.frequency.value = freq;
    p.pan.value = pan;
    o.connect(g); g.connect(p); p.connect(ctx.destination);
    g.gain.setValueAtTime(0, startT);
    g.gain.linearRampToValueAtTime(vol, startT + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, startT + dur);
    o.start(startT); o.stop(startT + dur + 0.02);
  } catch(e) {}
};

const playSound = (type) => {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    if(type === "click") {
      // Clic neumórfico suave — eco stereo breve
      note(ctx, 520, now,      0.08, 0.09,  0.3, "sine");
      note(ctx, 520, now+0.02, 0.08, 0.06, -0.3, "sine");
      note(ctx, 360, now+0.05, 0.08, 0.05,  0.0, "sine");
    }
    else if(type === "select_ingreso") {
      // Seleccionar INGRESO — sube izq→der, alegre
      note(ctx, 440, now,      0.14, 0.10, -0.8, "sine");
      note(ctx, 554, now+0.06, 0.14, 0.11,  0.0, "sine");
      note(ctx, 659, now+0.12, 0.16, 0.12,  0.8, "sine");
      note(ctx, 880, now+0.18, 0.14, 0.10,  0.0, "sine");
      // brillo cruzado
      note(ctx, 1318,now+0.10, 0.10, 0.05, -0.6, "sine");
      note(ctx, 1318,now+0.16, 0.10, 0.05,  0.6, "sine");
    }
    else if(type === "select_egreso") {
      // Seleccionar EGRESO — baja der→izq, advertencia suave
      note(ctx, 587, now,      0.14, 0.10,  0.8, "triangle");
      note(ctx, 494, now+0.07, 0.14, 0.10,  0.0, "triangle");
      note(ctx, 392, now+0.14, 0.16, 0.11, -0.8, "triangle");
      note(ctx, 294, now+0.21, 0.18, 0.09,  0.0, "triangle");
    }
    else if(type === "select") {
      // Selección genérica de paso — toque stereo doble
      note(ctx, 659, now,      0.10, 0.08, -0.5, "sine");
      note(ctx, 784, now+0.05, 0.10, 0.09,  0.5, "sine");
      note(ctx, 880, now+0.10, 0.12, 0.08,  0.0, "sine");
    }
    else if(type === "ingreso_ok") {
      // ══ INGRESO CONFIRMADO — CAJA DE ENTRADA ══
      // Monedas que llueven izq→der + fanfarria de caja registradora surround
      // Impacto inicial — caja registradora
      note(ctx, 1047,now,      0.06, 0.18,  0.0, "sine");   // ding central fuerte
      note(ctx, 1047,now+0.02, 0.05, 0.12, -0.9, "sine");   // eco izq
      note(ctx, 1047,now+0.04, 0.05, 0.12,  0.9, "sine");   // eco der
      // Monedas cayendo (frecuencias metálicas distintas por posición)
      note(ctx, 1568,now+0.06, 0.08, 0.10, -0.9, "sine");   // moneda izq
      note(ctx, 1760,now+0.10, 0.08, 0.10,  0.7, "sine");   // moneda der
      note(ctx, 1397,now+0.14, 0.08, 0.10, -0.5, "sine");   // moneda izq
      note(ctx, 1976,now+0.18, 0.08, 0.10,  0.4, "sine");   // moneda der
      note(ctx, 1568,now+0.22, 0.08, 0.09, -0.3, "sine");   // moneda centro-izq
      // Acorde de victoria que sube
      note(ctx, 523, now+0.08, 0.30, 0.09, -0.7, "sine");   // DO izq
      note(ctx, 659, now+0.14, 0.28, 0.10,  0.0, "sine");   // MI centro
      note(ctx, 784, now+0.20, 0.28, 0.11,  0.7, "sine");   // SOL der
      note(ctx, 1047,now+0.28, 0.35, 0.14,  0.0, "sine");   // DO alto centro
      // Sub bajo que da peso
      note(ctx, 130, now,      0.45, 0.08,  0.0, "sine");
      // Remate envolvente final
      note(ctx, 1047,now+0.40, 0.25, 0.08, -0.8, "sine");
      note(ctx, 1047,now+0.43, 0.25, 0.08,  0.8, "sine");
      note(ctx, 1318,now+0.46, 0.22, 0.10,  0.0, "sine");
    }
    else if(type === "egreso_ok") {
      // ══ EGRESO CONFIRMADO — DINERO SALIENDO ══
      // Efecto de dinero que se va — baja y se aleja en surround
      // Golpe inicial
      note(ctx, 220, now,      0.12, 0.14,  0.0, "sawtooth"); // impacto bajo centro
      note(ctx, 330, now,      0.10, 0.10, -0.8, "triangle");
      note(ctx, 330, now+0.03, 0.10, 0.10,  0.8, "triangle");
      // Descenso surround — notas bajas que se alejan
      note(ctx, 494, now+0.05, 0.18, 0.11,  0.7, "triangle"); // der
      note(ctx, 392, now+0.12, 0.18, 0.10, -0.6, "triangle"); // izq
      note(ctx, 311, now+0.19, 0.20, 0.10,  0.4, "triangle"); // der
      note(ctx, 247, now+0.26, 0.22, 0.09, -0.3, "triangle"); // izq
      note(ctx, 196, now+0.33, 0.25, 0.08,  0.0, "triangle"); // centro bajo
      // Eco metálico de caja que se cierra
      note(ctx, 880, now+0.15, 0.10, 0.06,  0.9, "sine");
      note(ctx, 740, now+0.20, 0.10, 0.06, -0.9, "sine");
      note(ctx, 622, now+0.25, 0.12, 0.05,  0.0, "sine");
      // Sub final
      note(ctx, 110, now+0.28, 0.30, 0.07,  0.0, "sine");
    }
    else if(type === "success") {
      // success alias → ingreso_ok
      note(ctx, 1047,now,      0.06, 0.18,  0.0, "sine");
      note(ctx, 1047,now+0.02, 0.05, 0.12, -0.9, "sine");
      note(ctx, 1047,now+0.04, 0.05, 0.12,  0.9, "sine");
      note(ctx, 1568,now+0.06, 0.08, 0.10, -0.9, "sine");
      note(ctx, 1760,now+0.10, 0.08, 0.10,  0.7, "sine");
      note(ctx, 1397,now+0.14, 0.08, 0.10, -0.5, "sine");
      note(ctx, 523, now+0.08, 0.30, 0.09, -0.7, "sine");
      note(ctx, 659, now+0.14, 0.28, 0.10,  0.0, "sine");
      note(ctx, 784, now+0.20, 0.28, 0.11,  0.7, "sine");
      note(ctx, 1047,now+0.28, 0.35, 0.14,  0.0, "sine");
      note(ctx, 130, now,      0.45, 0.08,  0.0, "sine");
      note(ctx, 1047,now+0.40, 0.25, 0.08, -0.8, "sine");
      note(ctx, 1047,now+0.43, 0.25, 0.08,  0.8, "sine");
      note(ctx, 1318,now+0.46, 0.22, 0.10,  0.0, "sine");
    }
    else if(type === "cancel") {
      // Cancelar — baja der→izq con eco
      note(ctx, 494, now,      0.14, 0.09,  0.8, "sine");
      note(ctx, 392, now+0.07, 0.14, 0.09,  0.0, "sine");
      note(ctx, 294, now+0.14, 0.16, 0.08, -0.8, "sine");
      note(ctx, 220, now+0.21, 0.14, 0.06,  0.0, "sine");
    }
    else if(type === "nav") {
      // Navegación — pulso stereo rápido
      note(ctx, 660, now,      0.07, 0.07,  0.4, "triangle");
      note(ctx, 740, now+0.03, 0.07, 0.06, -0.4, "triangle");
      note(ctx, 880, now+0.06, 0.07, 0.05,  0.0, "triangle");
    }
    else if(type === "login") {
      // Login — fanfarria surround: izq→der→izq→centro, grandioso
      note(ctx, 392, now,      0.18, 0.14, -0.9, "sine");
      note(ctx, 494, now+0.09, 0.18, 0.14,  0.9, "sine");
      note(ctx, 587, now+0.18, 0.18, 0.14, -0.6, "sine");
      note(ctx, 784, now+0.27, 0.28, 0.18,  0.0, "sine");
      note(ctx, 196, now,      0.40, 0.10,  0.0, "sine");
      note(ctx, 1175,now+0.18, 0.10, 0.07, -1.0, "sine");
      note(ctx, 1175,now+0.24, 0.10, 0.07,  1.0, "sine");
      note(ctx, 1175,now+0.30, 0.15, 0.08,  0.0, "sine");
    }
    else if(type === "logout") {
      // Cierre de sesión — descenso envolvente
      note(ctx, 660, now,      0.18, 0.11,  0.8, "sine");
      note(ctx, 523, now+0.10, 0.18, 0.11,  0.0, "sine");
      note(ctx, 392, now+0.20, 0.18, 0.10, -0.8, "sine");
      note(ctx, 262, now+0.30, 0.28, 0.10,  0.0, "sine");
      note(ctx, 330, now+0.15, 0.22, 0.06, -0.5, "sine");
      note(ctx, 330, now+0.25, 0.22, 0.06,  0.5, "sine");
    }
    else if(type === "error") {
      // Error — impacto grave que rebota izq-der
      note(ctx, 220, now,      0.12, 0.10,  0.7, "sawtooth");
      note(ctx, 180, now+0.10, 0.14, 0.10, -0.7, "sawtooth");
      note(ctx, 150, now+0.20, 0.16, 0.08,  0.0, "sawtooth");
    }
    else if(type === "bono") {
      // Premio bono — fanfarria triunfal SURROUND COMPLETO
      note(ctx, 262, now,      0.55, 0.12,  0.0, "sine");
      note(ctx, 330, now,      0.55, 0.10, -0.7, "sine");
      note(ctx, 392, now,      0.55, 0.10,  0.7, "sine");
      note(ctx, 523, now+0.05, 0.20, 0.15, -0.8, "sine");
      note(ctx, 659, now+0.15, 0.20, 0.15,  0.8, "sine");
      note(ctx, 784, now+0.25, 0.20, 0.16, -0.4, "sine");
      note(ctx, 1047,now+0.35, 0.25, 0.18,  0.4, "sine");
      note(ctx, 1047,now+0.45, 0.28, 0.16, -1.0, "sine");
      note(ctx, 1047,now+0.50, 0.28, 0.16,  1.0, "sine");
      note(ctx, 1047,now+0.55, 0.35, 0.20,  0.0, "sine");
      note(ctx, 784, now+0.55, 0.35, 0.12,  0.0, "sine");
      note(ctx, 523, now+0.55, 0.35, 0.12,  0.0, "sine");
    }
    else if(type === "registro") {
      // alias → ingreso_ok
      note(ctx, 1047,now,      0.06, 0.18,  0.0, "sine");
      note(ctx, 1568,now+0.06, 0.08, 0.10, -0.9, "sine");
      note(ctx, 523, now+0.08, 0.30, 0.09, -0.7, "sine");
      note(ctx, 659, now+0.14, 0.28, 0.10,  0.0, "sine");
      note(ctx, 1047,now+0.28, 0.35, 0.14,  0.0, "sine");
    }
    else if(type === "egreso") {
      // alias → egreso_ok
      note(ctx, 220, now,      0.12, 0.14,  0.0, "sawtooth");
      note(ctx, 494, now+0.05, 0.18, 0.11,  0.7, "triangle");
      note(ctx, 392, now+0.12, 0.18, 0.10, -0.6, "triangle");
      note(ctx, 311, now+0.19, 0.20, 0.10,  0.4, "triangle");
      note(ctx, 247, now+0.26, 0.22, 0.09, -0.3, "triangle");
      note(ctx, 196, now+0.33, 0.25, 0.08,  0.0, "triangle");
    }
  } catch(e) {}
};

// ─── HELPERS DE BASE DE DATOS (tablas propias) ───────────────────────────────

// ── Registros ──────────────────────────────────────────────────────────────────
const dbGetRegistros = async () => {
  try {
    const { data, error } = await supabase
      .from("registros_caja")
      .select("*")
      .order("id", { ascending: false });
    if (error || !data) return [];
    // Mapear columnas snake_case → camelCase que usa el frontend
    return data.map(r => ({
      id: r.id,
      tipo: r.tipo,
      local: r.local,
      medio: r.medio,
      categoria: r.categoria,
      monto: Number(r.monto),
      nota: r.nota || "",
      autoriza: r.autoriza || "",
      usuario: r.usuario,
      fecha: r.fecha,
      fechaISO: r.fecha_iso,
      hora: r.hora,
      editado: r.editado || false,
      motivoEdicion: r.motivo_edicion || null,
      editadoPor: r.editado_por || null,
      fechaEdicion: r.fecha_edicion || null,
      montoOriginal: r.monto_original ? Number(r.monto_original) : undefined,
      categoriaOriginal: r.categoria_original || undefined,
      notaOriginal: r.nota_original || undefined,
    }));
  } catch(e) { console.error("dbGetRegistros:", e); return []; }
};

const dbInsertRegistro = async (reg) => {
  try {
    const { error } = await supabase.from("registros_caja").insert({
      id: reg.id,
      tipo: reg.tipo,
      local: reg.local,
      medio: reg.medio,
      categoria: reg.categoria,
      monto: reg.monto,
      nota: reg.nota || "",
      autoriza: reg.autoriza || "",
      usuario: reg.usuario,
      fecha: reg.fecha,
      fecha_iso: reg.fechaISO,
      hora: reg.hora,
    });
    if (error) console.error("dbInsertRegistro:", error);
  } catch(e) { console.error("dbInsertRegistro:", e); }
};

const dbUpdateRegistro = async (id, cambios, motivo, originales) => {
  try {
    const { error } = await supabase.from("registros_caja").update({
      monto: cambios.monto,
      categoria: cambios.categoria,
      nota: cambios.nota || "",
      autoriza: cambios.autoriza || "",
      editado: true,
      motivo_edicion: motivo,
      editado_por: cambios._editadoPor,
      fecha_edicion: cambios._fechaEdicion,
      monto_original: originales?.monto,
      categoria_original: originales?.categoria,
      nota_original: originales?.nota,
    }).eq("id", id);
    if (error) console.error("dbUpdateRegistro:", error);
  } catch(e) { console.error("dbUpdateRegistro:", e); }
};

const dbDeleteRegistro = async (id) => {
  try {
    const { error } = await supabase.from("registros_caja").delete().eq("id", id);
    if (error) console.error("dbDeleteRegistro:", error);
  } catch(e) { console.error("dbDeleteRegistro:", e); }
};

// ── Compromisos ────────────────────────────────────────────────────────────────
const dbGetCompromisos = async () => {
  try {
    const { data, error } = await supabase.from("compromisos_caja").select("*").order("dia");
    if (error || !data) return [];
    return data.map(c => ({ id: c.id, nombre: c.nombre, local: c.local, medio: c.medio, dia: c.dia, valor: Number(c.valor), nota: c.nota||"", pagado: !!c.pagado, pagadoMes: c.pagado_mes || null }));
  } catch(e) { return []; }
};
const dbUpsertCompromiso = async (comp) => {
  try {
    await supabase.from("compromisos_caja").upsert({ id: comp.id, nombre: comp.nombre, local: comp.local, medio: comp.medio, dia: comp.dia, valor: comp.valor, nota: comp.nota||"", pagado: !!comp.pagado, pagado_mes: comp.pagadoMes||null }, { onConflict: "id" });
  } catch(e) { console.error("dbUpsertCompromiso:", e); }
};
const dbDeleteCompromiso = async (id) => {
  try { await supabase.from("compromisos_caja").delete().eq("id", id); } catch(e) {}
};

// ── Config (claves, estados) ───────────────────────────────────────────────────
const dbGetConfig = async (key) => {
  try {
    const { data, error } = await supabase.from("config_caja").select("value").eq("key", key).maybeSingle();
    if (error || !data) return null;
    return data.value;
  } catch { return null; }
};
const dbSetConfig = async (key, value) => {
  try {
    await supabase.from("config_caja").upsert({ key, value }, { onConflict: "key" });
  } catch(e) { console.error("dbSetConfig:", e); }
};

// Alias para config
const dbSet = dbSetConfig;

// ── Finanzas personales de Iván (separadas del negocio) ───────────────────────
const dbGetFinanzasIvan = async () => {
  try {
    const { data, error } = await supabase.from("finanzas_ivan").select("*").order("fecha_iso", { ascending: false }).order("creado_en", { ascending: false });
    if (error || !data) return [];
    return data.map(f => ({ id: f.id, tipo: f.tipo, categoria: f.categoria, monto: Number(f.monto), nota: f.nota||"", fechaISO: f.fecha_iso, titular: f.titular||null }));
  } catch(e) { console.error("dbGetFinanzasIvan:", e); return []; }
};
const dbInsertFinanzaIvan = async (f) => {
  try {
    const { error } = await supabase.from("finanzas_ivan").insert({
      id: f.id, tipo: f.tipo, categoria: f.categoria, monto: f.monto, nota: f.nota||"", fecha_iso: f.fechaISO, titular: f.titular||null,
    });
    if (error) console.error("dbInsertFinanzaIvan:", error);
  } catch(e) { console.error("dbInsertFinanzaIvan:", e); }
};
const dbDeleteFinanzaIvan = async (id) => {
  try { await supabase.from("finanzas_ivan").delete().eq("id", id); } catch(e) {}
};

// ─── ÍCONOS SVG ───────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16, color = "currentColor" }) => {
  const icons = {
    chart:      <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
    list:       <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>,
    plus:       <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    logout:     <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    store:      <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    cash:       <><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></>,
    phone:      <><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></>,
    trending:   <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    arrow_up:   <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>,
    arrow_down: <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>,
    edit:       <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    check:      <><polyline points="20 6 9 17 4 12"/></>,
    alert:      <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
    award:      <><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></>,
    filter:     <><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>,
    calendar:   <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    user:       <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    users:      <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 1-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    box:        <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></>,
    percent:    <><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></>,
    refresh:    <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>,
    x:          <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    bell:       <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    repeat:     <><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></>,
    trash:      <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>,
    gift:       <><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></>,
    send:       <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
    wallet:     <><path d="M20 12V22H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16v4"/><path d="M20 12a2 2 0 0 0-2 2 2 2 0 0 0 2 2h2v-4z"/></>,
    zap:        <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
    lock:       <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    sun:        <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>,
    moon:       <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>,
    key:        <><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></>,
    shield:     <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    power:      <><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></>,
    settings:   <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    eye:        <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    trophy:     <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></>,
    menu:       <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    chevron_r:  <><polyline points="9 18 15 12 9 6"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline-block",flexShrink:0}}>
      {icons[name]}
    </svg>
  );
};

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const USUARIOS_BASE = {
  jeimy:  { nombre:"Jeimy",  local:"internet52", role:"empleado", medios:["Efectivo","Nequi"],      cuadre:true  },
  luis:   { nombre:"Luis",   local:"internet52", role:"empleado", medios:["Efectivo","Nequi"],      cuadre:false },
  sandra: { nombre:"Sandra", local:"internet52", role:"empleado", medios:["Efectivo","Nequi"],      cuadre:false },
  laura:  { nombre:"Laura",  local:"ambos",      role:"admin",    medios:["Efectivo","Nequi","DaviPlata"], cuadre:false },
  luisa:  { nombre:"Luisa",  local:"internet52", role:"empleado", medios:["Efectivo","Nequi"],      cuadre:false },
  ivan:   { nombre:"Iván",   local:"ambos",      role:"admin",    medios:["Efectivo","Nequi","DaviPlata"], cuadre:false },
};
const CLAVES_BASE = { jeimy:"1111", luis:"2222", sandra:"5555", laura:"3333", luisa:"4444", ivan:"0000" };

const CATEGORIAS_INGRESO = ["Impresión","Fotocopia","Escáner","Trabajo en computador","Trámite en línea","Postulación","Envío de documentos","Otro ingreso"];
const CATEGORIAS_EGRESO  = ["Papelería","Tóner / Tinta","Servicios públicos","Internet","Arriendo","Transporte","Alimentación","Salario","Mantenimiento equipo","Otro gasto"];
const LOCALES = { internet52:"Internet La 52", tramites:"Trámites y Servicios" };
const MEDIOS_LOCAL = { internet52:["Efectivo","Nequi"], tramites:["Efectivo","DaviPlata"] };

const fmt      = (n) => new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",minimumFractionDigits:0}).format(n||0);

// ── FECHA CONFIABLE: sincroniza con servidor al cargar, siempre Colombia UTC-5 ─
let _serverTimeOffset = 0; // diferencia entre reloj del dispositivo y servidor
let _serverTimeSynced = false;

const syncServerTime = async () => {
  try {
    const t0 = Date.now();
    const res = await fetch("https://worldtimeapi.org/api/timezone/America/Bogota");
    const t1 = Date.now();
    if(!res.ok) return;
    const data = await res.json();
    const serverMs = new Date(data.datetime).getTime();
    const latency = (t1 - t0) / 2;
    _serverTimeOffset = (serverMs + latency) - t1;
    _serverTimeSynced = true;
    console.log(`[Hora] Sincronizado con servidor. Offset: ${Math.round(_serverTimeOffset/1000)}s`);
  } catch(e) {
    // Si falla, usar la hora del dispositivo (mejor que nada)
    _serverTimeOffset = 0;
    console.warn("[Hora] Sin conexión al servidor de tiempo, usando reloj del dispositivo");
  }
};

const getLocalDate = () => {
  // Usar hora del servidor si está sincronizado, si no usar dispositivo
  const nowMs = Date.now() + _serverTimeOffset;
  const now = new Date(nowMs);
  // Aplicar Colombia UTC-5 solo si el offset del dispositivo no es ya Colombia
  const offset = -5 * 60;
  const localMs = nowMs + (now.getTimezoneOffset() + offset) * 60000;
  return new Date(localMs);
};
const hoy      = () => getLocalDate().toLocaleDateString("es-CO",{day:"2-digit",month:"2-digit",year:"numeric"});
const ahora    = () => getLocalDate().toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"});
const fechaISO = () => {
  const d = getLocalDate();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const getPasos = (esAdmin, tipo) => {
  if (esAdmin) {
    return tipo==="egreso"
      ? { local:1, medio:2, cat:3, monto:4, nota:5, autoriza:6, confirm:7 }
      : { local:1, medio:2, cat:3, monto:4, confirm:5 };
  }
  return tipo==="egreso"
    ? { medio:1, cat:2, monto:3, nota:4, autoriza:5, confirm:6 }
    : { medio:1, cat:2, monto:3, confirm:4 };
};

// ─── TEMA ─────────────────────────────────────────────────────────────────────
// Noche: ciruela/violeta profundo con magenta vibrante — atmosférico y motivador
// Día: crema cálido arena con acentos teal esmeralda — fresco y agradable
const TEMA = {
  noche: {
    bg:           "linear-gradient(145deg, #110d1a 0%, #160d22 50%, #0f0a18 100%)",
    bgSolid:      "#110d1a",
    bgSecundario: "#1a1228",
    surface:      "rgba(28,18,44,0.88)",
    surfaceSolid: "rgba(18,11,30,0.95)",
    surfaceHover: "rgba(40,26,60,0.95)",
    border:       "rgba(180,130,255,0.1)",
    borderActivo: "rgba(220,100,255,0.5)",
    texto:        "#f0e8ff",
    textoSub:     "#c4aae8",
    textoMuted:   "#7d5fa0",
    textoMin:     "#3d2856",
    acento:       "#d946ef",
    acentoHover:  "#c026d3",
    verde:        "#4ade80",
    rojo:         "#fb7185",
    amarillo:     "#fcd34d",
    morado:       "#a78bfa",
    naranja:      "#fb923c",
    sombra:       "0 8px 32px rgba(0,0,0,0.7), 0 2px 8px rgba(100,0,150,0.2)",
    sombraBtn:      "4px 4px 12px rgba(0,0,0,0.7), -2px -2px 6px rgba(180,100,255,0.06)",
    sombraBtnActivo:"inset 3px 3px 8px rgba(0,0,0,0.75), inset -1px -1px 4px rgba(180,100,255,0.06)",
    sombraBtnHover: "5px 5px 14px rgba(0,0,0,0.72), -2px -2px 6px rgba(180,100,255,0.08)",
    glassBg:      "rgba(28,18,44,0.85)",
    glassBlur:    "blur(18px)",
    headerBg:     "rgba(16,10,26,0.92)",
  },
  dia: {
    bg:           "linear-gradient(145deg, #f5f0e8 0%, #ede6d8 50%, #f0ece2 100%)",
    bgSolid:      "#ede6d8",
    bgSecundario: "#f5f0e8",
    surface:      "rgba(252,248,240,0.9)",
    surfaceSolid: "rgba(235,228,214,0.95)",
    surfaceHover: "rgba(255,253,248,0.98)",
    border:       "rgba(255,255,255,0.95)",
    borderActivo: "rgba(13,148,136,0.5)",
    texto:        "#1c1917",
    textoSub:     "#292524",
    textoMuted:   "#78716c",
    textoMin:     "#a8a29e",
    acento:       "#0d9488",
    acentoHover:  "#0f766e",
    verde:        "#16a34a",
    rojo:         "#dc2626",
    amarillo:     "#b45309",
    morado:       "#7c3aed",
    naranja:      "#ea580c",
    sombra:       "8px 8px 20px rgba(180,160,120,0.5), -4px -4px 12px rgba(255,255,255,0.9)",
    sombraBtn:      "5px 5px 13px rgba(180,160,120,0.5), -4px -4px 10px rgba(255,255,255,0.92)",
    sombraBtnActivo:"inset 4px 4px 10px rgba(180,160,120,0.5), inset -2px -2px 6px rgba(255,255,255,0.88)",
    sombraBtnHover: "7px 7px 18px rgba(180,160,120,0.55), -5px -5px 12px rgba(255,255,255,0.92)",
    glassBg:      "rgba(252,248,240,0.85)",
    glassBlur:    "blur(18px)",
    headerBg:     "rgba(238,230,215,0.92)",
  }
};

// ─── SESSION LOCK KEY ─────────────────────────────────────────────────────────
// Para detectar si ya hay sesión abierta en otra pestaña
const SESSION_KEY = "caja_session_tab";
const TAB_ID = Math.random().toString(36).slice(2);

// ─── SESIÓN PERSISTENTE ────────────────────────────────────────────────────────
const SESSION_PERSIST_KEY = "caja_session_v2";
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos de inactividad

// ─── SEGURIDAD LOGIN ───────────────────────────────────────────────────────────
const LOGIN_ATTEMPTS_KEY = "caja_login_attempts";
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 5 * 60 * 1000; // 5 min

const getLoginAttempts = (uid) => {
  try { const d = JSON.parse(localStorage.getItem(LOGIN_ATTEMPTS_KEY)||"{}"); return d[uid]||{count:0,ts:0}; } catch { return {count:0,ts:0}; }
};
const setLoginAttempts = (uid, data) => {
  try { const d = JSON.parse(localStorage.getItem(LOGIN_ATTEMPTS_KEY)||"{}"); d[uid]=data; localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(d)); } catch {}
};
const resetLoginAttempts = (uid) => {
  try { const d = JSON.parse(localStorage.getItem(LOGIN_ATTEMPTS_KEY)||"{}"); delete d[uid]; localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(d)); } catch {}
};

// ─── MODO POR USUARIO ─────────────────────────────────────────────────────────
const MODOS_KEY = "caja_modos_usuario";
const getModoUsuario = (uid) => {
  try { const d = JSON.parse(localStorage.getItem(MODOS_KEY)||"{}"); return d[uid]!==undefined ? d[uid] : true; } catch { return true; }
};
const setModoUsuario = (uid, esNoche) => {
  try { const d = JSON.parse(localStorage.getItem(MODOS_KEY)||"{}"); d[uid]=esNoche; localStorage.setItem(MODOS_KEY, JSON.stringify(d)); } catch {}
};

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [usuario,      setUsuario]      = useState(null);
  const [registros,    setRegistros]    = useState([]);
  const [compromisos,  setCompromisos]  = useState([]);
  const [finanzasIvan, setFinanzasIvan] = useState([]);
  const [vista,        setVista]        = useState("registro");
  const [modoOscuro,   setModoOscuro]   = useState(true);
  const [claves,       setClaves]       = useState(CLAVES_BASE);
  const [estados,      setEstados]      = useState({ jeimy:true, luis:true, sandra:true, laura:true, luisa:true, ivan:true });
  const [etiquetas,    setEtiquetas]    = useState({ ingreso: CATEGORIAS_INGRESO, egreso: CATEGORIAS_EGRESO });
  const [cargando,     setCargando]     = useState(true);
  // Para control de sesión en múltiples pestañas
  const [otrasSesiones, setOtrasSesiones] = useState(false);
  const [notifs,        setNotifs]        = useState([]);

  const inactividadRef = useRef(null);
  const usuarioRef     = useRef(null);

  const t = modoOscuro ? TEMA.noche : TEMA.dia;

  // ── Carga inicial + restaurar sesión ──────────────────────────────────────
  useEffect(()=>{
    (async()=>{
      await syncServerTime(); // sincronizar hora con servidor antes de cargar datos
      const r  = await dbGetRegistros();            setRegistros(r);
      const c  = await dbGetCompromisos();           setCompromisos(c);
      const cl = await dbGetConfig("claves_caja_v3");      if(cl) setClaves(JSON.parse(cl));
      const es = await dbGetConfig("estados_caja_v3");     if(es) setEstados(JSON.parse(es));
      const et = await dbGetConfig("etiquetas_caja_v1");
      if(et) {
        try {
          const parsed = JSON.parse(et);
          setEtiquetas({ ingreso: parsed.ingreso?.length ? parsed.ingreso : CATEGORIAS_INGRESO, egreso: parsed.egreso?.length ? parsed.egreso : CATEGORIAS_EGRESO });
        } catch(e) {}
      }
      // Restaurar sesión persistente si no expiró
      try {
        const sesGuardada = sessionStorage.getItem(SESSION_PERSIST_KEY);
        if(sesGuardada) {
          const sd = JSON.parse(sesGuardada);
          if(sd.usuario && sd.ts && (Date.now()-sd.ts) < SESSION_TIMEOUT) {
            const uBase = USUARIOS_BASE[sd.usuario.id];
            if(uBase) {
              const modoGuardado = getModoUsuario(sd.usuario.id);
              setModoOscuro(modoGuardado);
              setUsuario({...uBase, id:sd.usuario.id});
              setCargando(false);
              return;
            }
          } else {
            sessionStorage.removeItem(SESSION_PERSIST_KEY);
          }
        }
      } catch {}
      const m = await dbGetConfig("modo_caja_v3"); if(m) setModoOscuro(m==="noche");
      setCargando(false);
    })();
  },[]);

  // ── Control de sesión múltiple (misma pestaña solo una sesión) ──────────────
  useEffect(()=>{
    if(!usuario) return;
    // Marcar esta pestaña como activa con usuario
    const sessionData = JSON.stringify({ tabId: TAB_ID, usuario: usuario.id, ts: Date.now() });
    sessionStorage.setItem(SESSION_KEY, sessionData);
    localStorage.setItem(SESSION_KEY, sessionData);

    const checkOtherSessions = () => {
      const stored = localStorage.getItem(SESSION_KEY);
      if(!stored) return;
      try {
        const data = JSON.parse(stored);
        // Si hay otra pestaña activa con diferente tabId y se actualizó hace menos de 10s
        if(data.tabId !== TAB_ID && data.usuario && (Date.now() - data.ts) < 10000) {
          setOtrasSesiones(true);
        }
      } catch {}
    };

    // Actualizar timestamp cada 5s para indicar que esta pestaña sigue activa
    const interval = setInterval(()=>{
      const sd = JSON.stringify({ tabId: TAB_ID, usuario: usuario.id, ts: Date.now() });
      localStorage.setItem(SESSION_KEY, sd);
    }, 5000);

    const handleStorage = (e) => {
      if(e.key === SESSION_KEY && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if(data.tabId !== TAB_ID && data.usuario) {
            // Otra pestaña también tiene sesión activa
            setOtrasSesiones(true);
          }
        } catch {}
      }
    };

    window.addEventListener("storage", handleStorage);
    checkOtherSessions();

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
    };
  }, [usuario]);

  const cerrarSesion = useCallback(()=>{
    playSound("logout");
    setTimeout(()=>{
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_PERSIST_KEY);
      if(inactividadRef.current) clearTimeout(inactividadRef.current);
      setUsuario(null);
      setVista("registro");
      setOtrasSesiones(false);
    }, 900);
  },[]);

  const forzarMiSesion = () => {
    const sd = JSON.stringify({ tabId: TAB_ID, usuario: usuario?.id, ts: Date.now() });
    localStorage.setItem(SESSION_KEY, sd);
    setOtrasSesiones(false);
  };

  // ── Persistencia de sesión + inactividad ────────────────────────────────────
  useEffect(()=>{
    if(!usuario) return;
    usuarioRef.current = usuario;
    const guardarSesion = () => {
      sessionStorage.setItem(SESSION_PERSIST_KEY, JSON.stringify({ usuario, ts: Date.now() }));
    };
    guardarSesion();
    const resetTimer = () => {
      guardarSesion();
      if(inactividadRef.current) clearTimeout(inactividadRef.current);
      inactividadRef.current = setTimeout(()=>{
        sessionStorage.removeItem(SESSION_PERSIST_KEY);
        setUsuario(null);
        setVista("registro");
      }, SESSION_TIMEOUT);
    };
    resetTimer();
    const eventos = ["mousedown","keydown","touchstart","scroll","click"];
    eventos.forEach(e=>window.addEventListener(e, resetTimer, {passive:true}));
    return ()=>{
      eventos.forEach(e=>window.removeEventListener(e, resetTimer));
      if(inactividadRef.current) clearTimeout(inactividadRef.current);
    };
  },[usuario]);

  // ── Tiempo real: polling Supabase + notificaciones ─────────────────────────
  useEffect(()=>{
    if(!usuario) return;
    let suscripcion;
    const procesarCambios = async() => {
      const nuevos = await dbGetRegistros();
      setRegistros(prev => {
        const idsExistentes = new Set(prev.map(x=>x.id));
        const agregados = nuevos.filter(x=> !idsExistentes.has(x.id));
        const u = usuarioRef.current;
        agregados.forEach(reg => {
          if(!u || reg.usuario === u.nombre) return;
          const esIng = reg.tipo === "ingreso";
          const notif = {
            id: Date.now() + Math.random(),
            texto: `${reg.usuario}: ${esIng?"+":"-"}${new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",minimumFractionDigits:0}).format(reg.monto)} · ${reg.categoria}`,
            tipo: reg.tipo,
            ts: Date.now(),
          };
          setNotifs(prev2 => [notif, ...prev2].slice(0,5));
          setTimeout(()=> setNotifs(prev2 => prev2.filter(n=>n.id!==notif.id)), 5000);
        });
        return nuevos;
      });
      const c = await dbGetCompromisos();
      setCompromisos(c);
    };

    // Supabase Realtime
    suscripcion = supabase.channel("caja-realtime")
      .on("postgres_changes", { event:"*", schema:"public", table:"registros_caja" }, procesarCambios)
      .on("postgres_changes", { event:"*", schema:"public", table:"compromisos_caja" }, procesarCambios)
      .subscribe();

    // Polling de respaldo cada 15 segundos
    const polling = setInterval(procesarCambios, 15000);

    return ()=>{
      supabase.removeChannel(suscripcion);
      clearInterval(polling);
    };
  },[usuario]);

  // ── Guardar datos ───────────────────────────────────────────────────────────
  const guardarComps  = async(v)=>{ 
    setCompromisos(prev => {
      // Delete removed ones from Supabase
      const newIds = new Set(v.map(c=>c.id));
      const deleted = prev.filter(c=>!newIds.has(c.id));
      deleted.forEach(c => dbDeleteCompromiso(c.id));
      // Upsert all new/updated ones
      v.forEach(c => dbUpsertCompromiso(c));
      return v;
    });
  };
  const guardarClaves = async(v)=>{ setClaves(v);      await dbSetConfig("claves_caja_v3",  JSON.stringify(v)); };
  const guardarEstados= async(v)=>{ setEstados(v);     await dbSetConfig("estados_caja_v3", JSON.stringify(v)); };
  const guardarEtiquetas = async(v)=>{ setEtiquetas(v); await dbSetConfig("etiquetas_caja_v1", JSON.stringify(v)); };
  const toggleModo = () => {
    const nuevo = !modoOscuro;
    setModoOscuro(nuevo);
    if(usuario) setModoUsuario(usuario.id, nuevo);
    else dbSet("modo_caja_v3", nuevo?"noche":"dia");
  };

  const agregarRegistro = (reg) => {
    const localReg = reg.localSel || usuario.local;
    const nuevo = { ...reg, id:Date.now(), fecha:hoy(), fechaISO:fechaISO(), hora:ahora(), usuario:usuario.nombre, local:localReg };
    delete nuevo.localSel;
    // Actualizar estado local inmediatamente (optimistic update)
    setRegistros(prev => [nuevo, ...prev]);
    // Persistir en Supabase
    dbInsertRegistro(nuevo);
    return nuevo;
  };

  const editarRegistro = (id,cambios,motivo,originales) => {
    const fechaEd = `${hoy()} ${ahora()}`;
    const camposConMeta = {
      ...cambios,
      _editadoPor: usuario.nombre,
      _fechaEdicion: fechaEd,
    };
    setRegistros(prev => prev.map(r=> r.id===id
      ? {...r,...cambios,editado:true,motivoEdicion:motivo,editadoPor:usuario.nombre,
          fechaEdicion:fechaEd,
          montoOriginal: originales?.monto ?? r.monto,
          categoriaOriginal: originales?.categoria ?? r.categoria,
          notaOriginal: originales?.nota ?? r.nota,
        }
      : r));
    dbUpdateRegistro(id, camposConMeta, motivo, originales);
  };

  const eliminarRegistro = (id) => {
    setRegistros(prev => prev.filter(r=> r.id!==id));
    dbDeleteRegistro(id);
  };

  // ── Finanzas personales de Iván: solo se cargan si el usuario que entra es Iván ──
  useEffect(()=>{
    if(!usuario || usuario.id!=="ivan") return;
    (async()=>{ setFinanzasIvan(await dbGetFinanzasIvan()); })();
  },[usuario]);

  const agregarFinanzaIvan = (f) => {
    const nuevo = { ...f, id:Date.now(), fechaISO:fechaISO() };
    setFinanzasIvan(prev => [nuevo, ...prev]);
    dbInsertFinanzaIvan(nuevo);
  };
  const eliminarFinanzaIvan = (id) => {
    setFinanzasIvan(prev => prev.filter(f=>f.id!==id));
    dbDeleteFinanzaIvan(id);
  };

  if(cargando) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#d946ef",fontSize:14,gap:10,fontFamily:"system-ui",position:"relative"}}>
      <FondoDinamico modoOscuro={modoOscuro} userId="cargando"/>
      <div style={{position:"relative",zIndex:10,display:"flex",flexDirection:"column",alignItems:"center",gap:14,
        background:"rgba(14,7,26,0.88)",backdropFilter:"blur(18px)",padding:"28px 36px",borderRadius:20,
        border:"1px solid rgba(217,70,239,0.22)",boxShadow:"0 8px 32px rgba(0,0,0,0.7)"}}>
        <style>{`@keyframes spinCaja{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
        <div style={{position:"relative",width:54,height:54}}>
          <svg width="54" height="54" viewBox="0 0 54 54" style={{animation:"spinCaja 1.1s linear infinite"}}>
            <defs>
              <linearGradient id="spGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#d946ef"/>
                <stop offset="100%" stopColor="#7c3aed"/>
              </linearGradient>
            </defs>
            <circle cx="27" cy="27" r="22" fill="none" stroke="rgba(217,70,239,0.12)" strokeWidth="4"/>
            <path d="M27 5 A22 22 0 0 1 49 27" fill="none" stroke="url(#spGrad)" strokeWidth="4" strokeLinecap="round"/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Icon name="box" size={20} color="#d946ef"/>
          </div>
        </div>
        <span style={{color:"rgba(217,70,239,0.85)",fontWeight:700,letterSpacing:.5,fontSize:13}}>Cargando sistema...</span>
      </div>
    </div>
  );

  if (!usuario) return (
    <Login
      onLogin={(u, modo)=>{ setUsuario(u); setOtrasSesiones(false); if(modo!==undefined) setModoOscuro(modo); }}
      claves={claves}
      estados={estados}
      t={t}
      modoOscuro={modoOscuro}
      toggleModo={toggleModo}
    />
  );

  const esAdmin = usuario.role==="admin";
  const hoyNum = getLocalDate().getDate();
  const mesActualApp = fechaISO().slice(0,7);
  const alertas = compromisos.filter(c => {
    const yaPagado = c.pagado && c.pagadoMes===mesActualApp;
    if(yaPagado) return false; // no molestar con recordatorios de algo que ya se pagó este mes
    const diff = c.dia - hoyNum; return diff >= 0 && diff <= 5;
  });

  return (
    <div style={{minHeight:"100vh", color:t.texto, fontFamily:"'Nunito','DM Sans','Segoe UI',sans-serif", fontSize:14, position:"relative"}}>
      {/* FONDO PERMANENTE en toda la app */}
      <FondoDinamico modoOscuro={modoOscuro} userId={usuario?.id||"guest"}/>
      {/* Velo de color encima del fondo para que el contenido sea legible */}
      <div style={{position:"fixed",inset:0,zIndex:0,
        background:modoOscuro
          ?"linear-gradient(180deg,rgba(17,13,26,0.62) 0%,rgba(14,9,22,0.65) 100%)"
          :"linear-gradient(180deg,rgba(237,230,216,0.60) 0%,rgba(245,240,232,0.62) 100%)",
        pointerEvents:"none"}}/>
      <style>{`
        * { box-sizing: border-box; margin:0; padding:0; }
        input, select, button { font-family: inherit; }
        input:focus, select:focus { outline: none; }
        select { appearance: none; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        @keyframes ripple { 0%{transform:scale(0);opacity:0.6} 100%{transform:scale(4);opacity:0} }
        @keyframes pulse2 { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .fade-in { animation: fadeIn 0.22s ease forwards; }
        .slide-in { animation: slideIn 0.18s ease forwards; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${modoOscuro?"rgba(180,100,255,0.25)":"rgba(13,148,136,0.3)"}; border-radius: 3px; }
        .neo-btn { position:relative; overflow:hidden; transition: box-shadow 0.15s, transform 0.1s; }
        .neo-btn:active { transform: scale(0.97); }
        .neo-btn::after { content:''; position:absolute; border-radius:50%; background:rgba(255,255,255,0.15); width:100%; padding-top:100%; top:50%; left:50%; transform:translate(-50%,-50%) scale(0); animation: none; pointer-events:none; }
        .neo-btn:active::after { animation: ripple 0.4s ease-out; }
        @media (max-width: 640px) {
          .desktop-nav { display: none !important; }
          .main-content { padding-bottom: 80px !important; }
        }
        @media (min-width: 641px) {
          .mobile-bottom-nav { display: none !important; }
        }
      `}</style>

      {/* Alerta de sesión múltiple */}
      {otrasSesiones && (
        <div style={{background:"rgba(251,191,36,0.15)",position:"relative",zIndex:2,borderBottom:"1px solid rgba(251,191,36,0.4)",padding:"8px 20px",display:"flex",alignItems:"center",gap:10,fontSize:13,color:t.amarillo}}>
          <Icon name="alert" size={14} color={t.amarillo}/>
          <span style={{flex:1}}>Hay otra pestaña con sesión activa. Para evitar conflictos, cierra la otra sesión primero.</span>
          <button className="neo-btn" onClick={forzarMiSesion} style={{background:"rgba(251,191,36,0.2)",border:"1px solid rgba(251,191,36,0.4)",color:t.amarillo,padding:"5px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>
            Usar esta pestaña
          </button>
          <button className="neo-btn" onClick={cerrarSesion} style={{background:"rgba(248,113,113,0.15)",border:"1px solid rgba(248,113,113,0.3)",color:"#f87171",padding:"5px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>
            Cerrar mi sesión
          </button>
        </div>
      )}

      {/* Header */}
      <Header
        esAdmin={esAdmin}
        usuario={usuario}
        vista={vista}
        setVista={setVista}
        alertas={alertas}
        modoOscuro={modoOscuro}
        toggleModo={toggleModo}
        onSalir={cerrarSesion}
        t={t}
      />

      {alertas.length>0 && esAdmin && (
        <div style={{background:modoOscuro?"rgba(251,191,36,0.08)":"rgba(251,191,36,0.12)",borderBottom:`1px solid rgba(251,191,36,0.25)`,padding:"8px 20px",display:"flex",alignItems:"center",gap:8,fontSize:13,fontWeight:600,color:t.amarillo,position:"relative",zIndex:2}}>
          <Icon name="bell" size={14} color={t.amarillo}/>
          <span>Compromisos próximos: {alertas.map(a=>`${a.nombre} (día ${a.dia})`).join(" · ")}</span>
        </div>
      )}

      <main className="main-content" style={{padding:"20px",maxWidth:980,margin:"0 auto",position:"relative",zIndex:1}}>
        <div className="fade-in">
          {vista==="registro"    && <VistaRegistro    usuario={usuario} onRegistrar={agregarRegistro} registros={registros} etiquetas={etiquetas} t={t} modoOscuro={modoOscuro}/>}
          {vista==="dashboard"   && esAdmin && <VistaDashboard   registros={registros} t={t} modoOscuro={modoOscuro}/>}
          {vista==="historial"   && esAdmin && <VistaHistorial   registros={registros} onEditar={editarRegistro} onEliminar={eliminarRegistro} etiquetas={etiquetas} t={t} modoOscuro={modoOscuro}/>}
          {vista==="compromisos" && esAdmin && <VistaCompromisos compromisos={compromisos} onGuardar={guardarComps} t={t} modoOscuro={modoOscuro}/>}
          {vista==="bonos"       && esAdmin && <VistaBonos       registros={registros} t={t} modoOscuro={modoOscuro}/>}
          {vista==="config"      && esAdmin && <VistaConfig      modoOscuro={modoOscuro} claves={claves} onGuardarClaves={guardarClaves} estados={estados} onGuardarEstados={guardarEstados} etiquetas={etiquetas} onGuardarEtiquetas={guardarEtiquetas} t={t}/>}
          {vista==="clave"       && <VistaCambiarClave usuario={usuario} claves={claves} onGuardar={guardarClaves} t={t} modoOscuro={modoOscuro} onVolver={()=>setVista("registro")}/>}
          {vista==="ranking"     && !esAdmin && <VistaRankingEmpleado registros={registros} usuario={usuario} t={t} modoOscuro={modoOscuro}/>}
          {vista==="finanzasivan"&& usuario.id==="ivan" && <VistaFinanzasIvan finanzas={finanzasIvan} onAgregar={agregarFinanzaIvan} onEliminar={eliminarFinanzaIvan} t={t} modoOscuro={modoOscuro}/>}
        </div>
      </main>

      {/* Notificaciones flotantes tiempo real */}
      <ToastNotif
        notifs={notifs}
        onDismiss={(id)=>setNotifs(prev=>prev.filter(n=>n.id!==id))}
        modoOscuro={modoOscuro}
      />

      {/* Bottom Nav móvil */}
      <div className="mobile-bottom-nav">
        <BottomNav
          esAdmin={esAdmin}
          usuario={usuario}
          vista={vista}
          setVista={(v)=>{ playSound("nav"); setVista(v); }}
          alertas={alertas}
          t={t}
          modoOscuro={modoOscuro}
        />
      </div>

    </div>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header({esAdmin,usuario,vista,setVista,alertas,modoOscuro,toggleModo,onSalir,t}){

  // Menú principal (admin): iconos + label corto para no saturar
  const navItemsAdmin = [
    {id:"registro",   icon:"plus",      label:"Registrar"},
    {id:"dashboard",  icon:"chart",     label:"Dashboard"},
    {id:"historial",  icon:"list",      label:"Historial"},
    {id:"bonos",      icon:"trophy",    label:"Bonos"},
    {id:"compromisos",icon:"repeat",    label:"Compromisos", badge: alertas.length},
    ...(usuario.id==="ivan" ? [{id:"finanzasivan", icon:"wallet", label:"Mi Caja"}] : []),
    {id:"config",     icon:"settings",  label:"Config"},
  ];
  const navItemsEmpleado = [
    {id:"registro",  icon:"plus",    label:"Registrar"},
    {id:"ranking",   icon:"trophy",  label:"Ranking"},
    {id:"clave",     icon:"key",     label:"Mi clave"},
  ];
  const navItems = esAdmin ? navItemsAdmin : navItemsEmpleado;

  return (
    <header style={{
      background: t.headerBg,
      backdropFilter: t.glassBlur,
      borderBottom: `1px solid ${t.border}`,
      padding:"0 20px",
      position:"sticky",
      top:0,
      zIndex:100,
      boxShadow: modoOscuro?"0 2px 20px rgba(0,0,0,0.5)":"0 2px 16px rgba(149,165,185,0.35)",
    }}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",height:56,gap:12}}>
        {/* Logo + info */}
        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <div style={{
            background:modoOscuro?"rgba(217,70,239,0.1)":"rgba(13,148,136,0.1)",
            border:`1.5px solid ${modoOscuro?"rgba(217,70,239,0.25)":"rgba(13,148,136,0.25)"}`,
            borderRadius:10,
            width:36,height:36,
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:t.sombraBtn,
            flexShrink:0,
          }}>
            <Icon name="box" size={18} color={t.acento}/>
          </div>
          <div>
            <div style={{fontWeight:800,fontSize:14,color:t.texto,lineHeight:1.2}}>{esAdmin?`Admin · ${usuario.nombre}`:LOCALES[usuario.local]}</div>
            <div style={{fontSize:11,color:t.textoMuted,lineHeight:1}}>{usuario.nombre} · {hoy()}</div>
          </div>
        </div>

        {/* Nav desktop */}
        <nav className="desktop-nav" style={{display:"flex",gap:4,alignItems:"center",flex:1,justifyContent:"center",flexWrap:"nowrap",overflow:"hidden"}}>
          {navItems.map(item=>(
            <NeoNavBtn key={item.id} active={vista===item.id} onClick={()=>setVista(item.id)} icon={item.icon} badge={item.badge} t={t} modoOscuro={modoOscuro}>
              {item.label}
            </NeoNavBtn>
          ))}
        </nav>

        {/* Acciones derechas */}
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          {/* Toggle modo — solo icono, discreto */}
          <button className="neo-btn" onClick={()=>{ playSound("click"); toggleModo(); }} title={modoOscuro?"Modo día":"Modo noche"} style={{
            background:"transparent",
            border:`1px solid ${modoOscuro?"rgba(217,70,239,0.2)":"rgba(13,148,136,0.2)"}`,
            color:modoOscuro?"rgba(217,70,239,0.6)":"rgba(13,148,136,0.6)",
            width:30,height:30,borderRadius:8,
            cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",
            flexShrink:0,
            opacity:0.6,
            transition:"opacity 0.15s",
          }}
          onMouseEnter={e=>e.currentTarget.style.opacity="1"}
          onMouseLeave={e=>e.currentTarget.style.opacity="0.6"}
          >
            <Icon name={modoOscuro?"sun":"moon"} size={13}/>
          </button>
          {/* Salir */}
          <button className="neo-btn" onClick={()=>{ onSalir(); }} style={{
            background:"transparent",
            border:`1px solid rgba(248,113,113,0.3)`,
            color:"#f87171",
            padding:"6px 10px",
            borderRadius:9,
            cursor:"pointer",
            fontSize:12,
            display:"flex",alignItems:"center",gap:5,
            fontWeight:600,
            boxShadow:t.sombraBtn,
            flexShrink:0,
          }}>
            <Icon name="logout" size={13}/> Salir
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── NAV BTN NEUMÓRFICO ───────────────────────────────────────────────────────
function NeoNavBtn({active,onClick,icon,children,t,modoOscuro,badge}){
  const [pressed, setPressed] = useState(false);
  return(
    <button
      className="neo-btn"
      onMouseDown={()=>setPressed(true)}
      onMouseUp={()=>setPressed(false)}
      onMouseLeave={()=>setPressed(false)}
      onClick={()=>{ playSound("nav"); onClick(); }}
      style={{
        background: active
          ? (modoOscuro?"rgba(56,189,248,0.12)":"rgba(2,132,199,0.1)")
          : t.surface,
        border: `1px solid ${active ? t.borderActivo : t.border}`,
        color: active ? t.acento : t.textoMuted,
        padding:"6px 10px",
        borderRadius:9,
        cursor:"pointer",
        fontSize:11.5,
        display:"flex",alignItems:"center",gap:4,
        fontWeight: active?700:500,
        boxShadow: (active||pressed) ? t.sombraBtnActivo : t.sombraBtn,
        transition:"box-shadow 0.12s, color 0.12s, border 0.12s",
        position:"relative",
        whiteSpace:"nowrap",
      }}
    >
      <Icon name={icon} size={12}/>
      {children}
      {badge>0 && <span style={{background:"#ef4444",color:"#fff",borderRadius:8,padding:"0 5px",fontSize:10,fontWeight:700,marginLeft:1}}>{badge}</span>}
    </button>
  );
}



// ─── OVERLAY NUBES: aparece al cerrar sesión (nubes se juntan) ───────────────
// ─── FONDO ANIMADO: CRISTO PETROLERO + REFINERÍA BARRANCABERMEJA ──────────────
function FondoBarranca({modoOscuro, opacidad=1}){
  const C = modoOscuro ? {
    sky1:"#0c0818", sky2:"#1a0d35", sky3:"#120a22",
    agua1:"#0a0618", agua2:"#08041a",
    mont1:"#0a061a", mont2:"#0e0820",
    refBase:"#1c0e38", refMid:"#2a1848",
    chem1:"#35185a", chem2:"#421e6e",
    llama1:"#ff5500", llama2:"#ff8c00", llama3:"#ffd000",
    esfera:"#1e1040",
    tuberia:"#28144a",
    lucesR:"#ff6030", lucesM:"#d946ef", lucesV:"#7c3aed",
    cristoA:"#f0abfc", cristoB:"#d946ef", cristoC:"#9333ea",
    aguaRio1:"#0d0824", aguaRio2:"#060412",
    reflejo:"#d946ef",
    arbol1:"#08050f", arbol2:"#0c0818",
    luna:"#e8d5ff", estrellas:"#fcd34d",
  } : {
    sky1:"#0d4a72", sky2:"#1577a0", sky3:"#0a6080",
    agua1:"#0a3855", agua2:"#07263c",
    mont1:"#062a18", mont2:"#0a3820",
    refBase:"#0a2a3e", refMid:"#0d3e58",
    chem1:"#0f4e72", chem2:"#186090",
    llama1:"#ff5500", llama2:"#ff8c00", llama3:"#ffd000",
    esfera:"#082035",
    tuberia:"#0a2d42",
    lucesR:"#ff6030", lucesM:"#0d9488", lucesV:"#0284c7",
    cristoA:"#5eead4", cristoB:"#0d9488", cristoC:"#0f766e",
    aguaRio1:"#082840", aguaRio2:"#041820",
    reflejo:"#0d9488",
    arbol1:"#041a0e", arbol2:"#062014",
    luna:"#fffde7", estrellas:"#fbbf24",
  };

  return (
    <svg
      style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",zIndex:0,pointerEvents:"none",opacity:opacidad}}
      viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="fbSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.sky1}/>
          <stop offset="50%" stopColor={C.sky2}/>
          <stop offset="100%" stopColor={C.sky3}/>
        </linearGradient>
        <linearGradient id="fbAgua" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.agua1}/>
          <stop offset="100%" stopColor={C.agua2}/>
        </linearGradient>
        <linearGradient id="fbCristo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.cristoA}/>
          <stop offset="55%" stopColor={C.cristoB}/>
          <stop offset="100%" stopColor={C.cristoC}/>
        </linearGradient>
        <linearGradient id="fbLlama" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={C.llama1}/>
          <stop offset="55%" stopColor={C.llama2}/>
          <stop offset="100%" stopColor={C.llama3}/>
        </linearGradient>
        <radialGradient id="fbGlowC" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor={C.cristoA} stopOpacity="0.45"/>
          <stop offset="100%" stopColor={C.cristoA} stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="fbGlowLuna" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={C.luna} stopOpacity="0.4"/>
          <stop offset="100%" stopColor={C.luna} stopOpacity="0"/>
        </radialGradient>
        <filter id="fbBlur2"><feGaussianBlur stdDeviation="2"/></filter>
        <filter id="fbBlur4"><feGaussianBlur stdDeviation="4"/></filter>
        <style>{`
          @keyframes fbFlicker{0%,100%{opacity:1;transform:scaleY(1) translateY(0)}40%{opacity:.85;transform:scaleY(.9) translateY(1px)}70%{opacity:.95;transform:scaleY(.95) translateY(0)}}
          @keyframes fbGlow{0%,100%{opacity:.7}50%{opacity:1}}
          @keyframes fbRipple{0%{transform:scaleX(1);opacity:.5}100%{transform:scaleX(1.1);opacity:0}}
          @keyframes fbTwinkle{0%,100%{opacity:1}50%{opacity:.15}}
          @keyframes fbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
          @keyframes fbSway{0%,100%{transform:rotate(0deg)}50%{transform:rotate(2deg)}}
          @keyframes fbSmoke{0%{transform:translateY(0) scaleX(1);opacity:.18}100%{transform:translateY(-40px) scaleX(1.6);opacity:0}}
          .fb-llama{animation:fbFlicker .9s ease-in-out infinite}
          .fb-glow{animation:fbGlow 2s ease-in-out infinite}
          .fb-tw{animation:fbTwinkle 2.5s ease-in-out infinite}
          .fb-ripple{animation:fbRipple 2.8s ease-in-out infinite}
          .fb-float{animation:fbFloat 4s ease-in-out infinite}
          .fb-sway{animation:fbSway 5s ease-in-out infinite}
          .fb-smoke{animation:fbSmoke 3s ease-out infinite}
        `}</style>
      </defs>

      {/* ── CIELO ── */}
      <rect width="1200" height="700" fill="url(#fbSky)"/>

      {/* ── ASTROS ── */}
      {modoOscuro ? <>
        {/* Estrellas */}
        {[[70,45],[180,22],[310,55],[460,18],[580,40],[720,28],[870,52],[1030,32],[1150,48],[140,80],[380,70],[660,62],[940,75]].map(([x,y],i)=>(
          <circle key={i} cx={x} cy={y} r={i%4===0?2:i%3===0?1.5:1} fill={C.estrellas}
            className="fb-tw" style={{animationDelay:`${i*0.18}s`,animationDuration:`${1.8+i*0.22}s`}}/>
        ))}
        {/* Luna */}
        <circle cx="1020" cy="75" r="52" fill="url(#fbGlowLuna)"/>
        <circle cx="1020" cy="75" r="30" fill={C.luna} opacity="0.88"/>
        <circle cx="1034" cy="68" r="24" fill={C.sky2}/>{/* mordida */}
        {/* Halo luna */}
        <circle cx="1020" cy="75" r="42" fill="none" stroke={C.luna} strokeWidth="1" opacity="0.15"/>
      </> : <>
        {/* Sol */}
        <circle cx="1050" cy="80" r="65" fill={C.estrellas} opacity="0.12"/>
        <circle cx="1050" cy="80" r="44" fill={C.estrellas} opacity="0.22"/>
        <circle cx="1050" cy="80" r="30" fill={C.estrellas} opacity="0.88"/>
        {/* Rayos sol */}
        {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg,i)=>(
          <line key={i} x1={1050+Math.cos(deg*Math.PI/180)*35} y1={80+Math.sin(deg*Math.PI/180)*35}
            x2={1050+Math.cos(deg*Math.PI/180)*52} y2={80+Math.sin(deg*Math.PI/180)*52}
            stroke={C.estrellas} strokeWidth="2" opacity="0.35"/>
        ))}
      </>}

      {/* ── MONTAÑAS FONDO ── */}
      <path d="M0 430 Q80 340 200 390 Q340 300 480 370 Q600 300 720 365 Q860 285 980 360 Q1100 295 1200 355 L1200 700 L0 700Z"
        fill={C.mont1} opacity="0.65"/>
      <path d="M0 470 Q120 390 260 435 Q400 365 540 420 Q680 370 820 428 Q960 375 1100 428 L1200 460 L1200 700 L0 700Z"
        fill={C.mont2} opacity="0.75"/>

      {/* ── ÁRBOLES FONDO ── */}
      {[30,110,200,980,1070,1160].map((x,i)=>(
        <g key={i} className={i<3?"fb-sway":""} style={{transformOrigin:`${x}px 470px`,animationDelay:`${i*0.7}s`}}>
          <rect x={x-3} y={410} width="6" height="65" fill={C.arbol1} rx="2"/>
          <ellipse cx={x} cy={406} rx={20} ry={30} fill={C.arbol2} opacity="0.95"/>
          <ellipse cx={x-8} cy={415} rx={15} ry={22} fill={C.arbol1} opacity="0.85"/>
          <ellipse cx={x+8} cy={418} rx={15} ry={22} fill={C.arbol1} opacity="0.85"/>
        </g>
      ))}

      {/* ══════════════════════════════════════════════════════
          REFINERÍA DE BARRANCABERMEJA — lado derecho
      ══════════════════════════════════════════════════════ */}
      <g transform="translate(590,0)">

        {/* Base/suelo refinería */}
        <rect x="0" y="468" width="610" height="32" fill={C.refBase} opacity="0.8" rx="2"/>

        {/* Torres de destilación — 6 torres de distintas alturas */}
        {[
          {x:10, y:240, w:22, h:230},
          {x:55, y:200, w:28, h:270},
          {x:105,y:255, w:20, h:215},
          {x:155,y:215, w:26, h:255},
          {x:210,y:260, w:18, h:210},
          {x:255,y:230, w:24, h:240},
        ].map((t2,i)=>(
          <g key={i}>
            <rect x={t2.x} y={t2.y} width={t2.w} height={t2.h} fill={C.refBase} rx="3"/>
            <rect x={t2.x+1} y={t2.y} width={t2.w-2} height={t2.h} fill={C.refMid} rx="3" opacity="0.5"/>
            {/* Plataformas */}
            {[0.25,0.5,0.75].map((frac,j)=>(
              <rect key={j} x={t2.x-5} y={t2.y+t2.h*frac} width={t2.w+10} height="5" fill={C.chem1} rx="1" opacity="0.8"/>
            ))}
            {/* Luz superior */}
            <circle cx={t2.x+t2.w/2} cy={t2.y+4} r="3.5" fill={C.lucesM} className="fb-glow"
              style={{animationDelay:`${i*0.3}s`}}/>
          </g>
        ))}

        {/* Chimeneas con LLAMAS — protagonistas */}
        {[
          {x:30, y:195, h:160, delay:"0s"},
          {x:82, y:155, h:200, delay:"0.25s"},
          {x:133,y:205, h:155, delay:"0.5s"},
          {x:182,y:168, h:190, delay:"0.15s"},
          {x:230,y:210, h:150, delay:"0.4s"},
          {x:278,y:182, h:178, delay:"0.1s"},
        ].map((c2,i)=>(
          <g key={i}>
            {/* Tubo chimenea */}
            <rect x={c2.x-5} y={c2.y} width="10" height={c2.h} fill={C.chem1} rx="2"/>
            <rect x={c2.x-3} y={c2.y} width="6" height={c2.h} fill={C.chem2} rx="2" opacity="0.6"/>
            {/* Humo sutil */}
            <ellipse cx={c2.x} cy={c2.y-12} rx="8" ry="6" fill="#888" opacity="0.08"
              className="fb-smoke" style={{animationDelay:c2.delay}}/>
            {/* Llama grande */}
            <ellipse cx={c2.x} cy={c2.y-6} rx="9" ry="22" fill="url(#fbLlama)" filter="url(#fbBlur2)"
              className="fb-llama" style={{animationDelay:c2.delay}}/>
            {/* Llama brillante interior */}
            <ellipse cx={c2.x} cy={c2.y-4} rx="5" ry="14" fill={C.llama3} opacity="0.9"
              className="fb-llama" style={{animationDelay:`calc(${c2.delay} + 0.1s)`}}/>
            {/* Destello punto */}
            <circle cx={c2.x} cy={c2.y-16} r="3" fill="#fff" opacity="0.7"
              className="fb-glow" style={{animationDelay:c2.delay}}/>
          </g>
        ))}

        {/* Esferas de almacenamiento */}
        {[310,360,405,450].map((x,i)=>(
          <g key={i}>
            <ellipse cx={x} cy={455+(i%2)*14} rx="30" ry="26" fill={C.esfera}/>
            <ellipse cx={x} cy={455+(i%2)*14} rx="30" ry="26" fill={C.refMid} opacity="0.35"/>
            {/* reflejo esfera */}
            <ellipse cx={x-9} cy={446+(i%2)*14} rx="10" ry="8" fill="#fff" opacity="0.06"/>
          </g>
        ))}

        {/* Torres de enfriamiento (cuadradas) */}
        {[490,530,570].map((x,i)=>(
          <g key={i}>
            <rect x={x} y={360+(i%2)*20} width="30" height="110-(i%2)*20" fill={C.refBase} rx="3"/>
            <rect x={x+2} y={358+(i%2)*20} width="26" height="8" fill={C.chem1} rx="2"/>
            <circle cx={x+15} cy={358+(i%2)*20} r="4" fill={C.lucesR} opacity="0.8"
              className="fb-glow" style={{animationDelay:`${i*0.35}s`}}/>
          </g>
        ))}

        {/* Tuberías horizontales */}
        <path d="M5 490 Q150 482 300 487 Q420 480 550 484 L550 492 Q420 488 300 495 Q150 490 5 498Z"
          fill={C.tuberia} opacity="0.7"/>
        <path d="M5 505 Q200 498 400 502 Q520 497 600 500 L600 506 Q520 503 400 508 Q200 504 5 511Z"
          fill={C.tuberia} opacity="0.5"/>

        {/* Luces puntiformes refinería */}
        {[20,60,110,160,210,260,320,370,415,460,495,535,572].map((x,i)=>(
          <circle key={i} cx={x} cy={470+(i%4)*8} r="3.5" fill={[C.lucesR,C.lucesM,C.lucesV,C.estrellas][i%4]}
            className="fb-glow" opacity="0.85" style={{animationDelay:`${i*0.12}s`,animationDuration:`${1.4+i*0.15}s`}}/>
        ))}
      </g>

      {/* ══════════════════════════════════════════════════════
          CRISTO PETROLERO — CENTRO, GRANDE Y VISIBLE
      ══════════════════════════════════════════════════════ */}
      <g transform="translate(430, 120)" className="fb-float" style={{transformOrigin:"95px 280px"}}>

        {/* Halo radiante detrás del cristo */}
        <circle cx="95" cy="160" r="130" fill="url(#fbGlowC)"/>
        <circle cx="95" cy="160" r="85" fill="url(#fbGlowC)" opacity="0.6"/>

        {/* Rayos de luz desde el corazón */}
        {[0,22.5,45,67.5,90,112.5,135,157.5,180,202.5,225,247.5,270,292.5,315,337.5].map((deg,i)=>(
          <line key={i}
            x1={95+Math.cos(deg*Math.PI/180)*48}
            y1={155+Math.sin(deg*Math.PI/180)*48}
            x2={95+Math.cos(deg*Math.PI/180)*(90+i%2*18)}
            y2={155+Math.sin(deg*Math.PI/180)*(90+i%2*18)}
            stroke={C.cristoA} strokeWidth={i%2===0?"1.5":"1"}
            opacity={i%2===0?0.35:0.2}
            className="fb-glow" style={{animationDelay:`${i*0.12}s`}}/>
        ))}

        {/* ── Silueta Cristo Petrolero ── */}
        {/* Pedestal escalonado */}
        <rect x="78" y="358" width="34" height="80" fill="url(#fbCristo)" rx="3" opacity="0.9"/>
        <rect x="68" y="368" width="54" height="12" fill="url(#fbCristo)" rx="2" opacity="0.9"/>
        <rect x="58" y="395" width="74" height="10" fill="url(#fbCristo)" rx="2" opacity="0.85"/>
        <rect x="48" y="426" width="94" height="12" fill="url(#fbCristo)" rx="2" opacity="0.8"/>

        {/* Fuente circular */}
        <ellipse cx="95" cy="445" rx="72" ry="14" fill={C.agua1} opacity="0.7"/>
        <ellipse cx="95" cy="445" rx="65" ry="10" fill={C.cristoC} opacity="0.25"
          className="fb-ripple"/>
        <ellipse cx="95" cy="445" rx="50" ry="7" fill={C.cristoC} opacity="0.2"
          className="fb-ripple" style={{animationDelay:"0.7s"}}/>
        <ellipse cx="95" cy="445" rx="35" ry="5" fill={C.cristoA} opacity="0.15"
          className="fb-ripple" style={{animationDelay:"1.4s"}}/>

        {/* Piernas */}
        <rect x="79" y="300" width="15" height="60" fill="url(#fbCristo)" rx="5"/>
        <rect x="97" y="300" width="15" height="60" fill="url(#fbCristo)" rx="5"/>

        {/* Túnica/cuerpo */}
        <path d="M68 185 Q72 168 95 165 Q118 168 122 185 L130 300 L60 300 Z"
          fill="url(#fbCristo)"/>
        {/* Detalle cinto */}
        <rect x="72" y="245" width="46" height="7" fill={C.cristoC} rx="3" opacity="0.6"/>

        {/* BRAZOS EXTENDIDOS Y LEVANTADOS — postura Cristo Petrolero */}
        {/* Brazo izquierdo — apuntando arriba-izquierda */}
        <path d="M70 200 Q50 185 22 165 Q12 157 14 148 Q17 140 26 144 Q38 150 55 165 Q72 182 76 198 Z"
          fill="url(#fbCristo)" rx="5"/>
        {/* Mano izquierda */}
        <ellipse cx="18" cy="148" rx="9" ry="7" fill="url(#fbCristo)" opacity="0.9"/>

        {/* Brazo derecho — apuntando arriba-derecha */}
        <path d="M120 200 Q140 185 168 165 Q178 157 176 148 Q173 140 164 144 Q152 150 135 165 Q118 182 114 198 Z"
          fill="url(#fbCristo)" rx="5"/>
        {/* Mano derecha */}
        <ellipse cx="172" cy="148" rx="9" ry="7" fill="url(#fbCristo)" opacity="0.9"/>

        {/* Cabeza */}
        <ellipse cx="95" cy="148" rx="22" ry="26" fill="url(#fbCristo)"/>
        {/* Cara — simplificada */}
        <ellipse cx="95" cy="142" rx="16" ry="18" fill={C.cristoA} opacity="0.3"/>
        {/* Corona/aureola */}
        <circle cx="95" cy="148" rx="28" r="28" fill="none" stroke={C.cristoA} strokeWidth="2" opacity="0.4"/>
        <circle cx="95" cy="148" rx="32" r="32" fill="none" stroke={C.cristoA} strokeWidth="1" opacity="0.2"/>
        {/* Destello cabeza */}
        <ellipse cx="95" cy="132" rx="8" ry="10" fill={C.cristoA} opacity="0.25"
          filter="url(#fbBlur4)"/>

        {/* Llama/antorcha en la base del pedestal — símbolo petrolero */}
        <ellipse cx="95" cy="355" rx="8" ry="18" fill="url(#fbLlama)" filter="url(#fbBlur2)"
          className="fb-llama"/>
        <ellipse cx="95" cy="352" rx="4" ry="10" fill={C.llama3} opacity="0.9"
          className="fb-llama" style={{animationDelay:"0.15s"}}/>
      </g>

      {/* ── RÍO MAGDALENA ── */}
      <rect x="0" y="500" width="1200" height="200" fill="url(#fbAgua)"/>
      {/* Olas suaves */}
      <path d="M0 508 Q100 502 200 508 Q300 514 400 508 Q500 502 600 508 Q700 514 800 508 Q900 502 1000 508 Q1100 514 1200 508 L1200 516 Q1100 522 1000 516 Q900 510 800 516 Q700 522 600 516 Q500 510 400 516 Q300 522 200 516 Q100 510 0 516Z"
        fill={C.cristoC} opacity="0.08"/>
      {/* Reflejos en el agua */}
      {[[150,0],[350,.6],[580,.3],[760,.9],[950,.2],[1100,.5]].map(([x,d],i)=>(
        <ellipse key={i} cx={x} cy={522+(i%3)*6} rx={55+i*8} ry="4"
          fill={i%2===0?C.lucesM:C.lucesR} opacity="0.12"
          className="fb-ripple" style={{animationDelay:`${d}s`,animationDuration:"3s"}}/>
      ))}
      {/* Reflejo largo del Cristo */}
      <ellipse cx="525" cy="530" rx="30" ry="60" fill={C.cristoA} opacity="0.06"
        style={{transform:"scaleY(0.3) translateY(200px)"}}/>

      {/* ── ORILLAS / VEGETACIÓN FRENTE ── */}
      <path d="M0 500 Q200 492 400 498 Q600 490 800 496 Q1000 489 1200 497 L1200 514 Q1000 506 800 512 Q600 505 400 514 Q200 508 0 516Z"
        fill={C.mont1} opacity="0.6"/>

      {/* Árboles frente — siluetas grandes */}
      {[0,55,140,1040,1120,1185].map((x,i)=>(
        <g key={i} className={i%2===0?"fb-sway":""} style={{transformOrigin:`${x+12}px 470px`,animationDelay:`${i*0.5}s`}}>
          <rect x={x+8} y={435} width="9" height="66" fill={C.arbol1} rx="3"/>
          <ellipse cx={x+12} cy={430} rx={26} ry={38} fill={C.arbol2} opacity="0.98"/>
          <ellipse cx={x+2}  cy={442} rx={18} ry={26} fill={C.arbol1} opacity="0.9"/>
          <ellipse cx={x+22} cy={445} rx={18} ry={26} fill={C.arbol1} opacity="0.9"/>
        </g>
      ))}
    </svg>
  );
}

// ─── SISTEMA DE FONDOS DINÁMICOS ─────────────────────────────────────────────
// Cada escena es un canvas animado con requestAnimationFrame.
// Se elige aleatoriamente por usuario (semilla = nombre) y rota cada ~45s con fade.

const ESCENAS = ["barranca","cuantico","pecera","solar","interes","cosmos","oceano","ciudad","aurora"];

function seedRand(str){
  let h=0;
  for(let i=0;i<str.length;i++) h=(Math.imul(31,h)+str.charCodeAt(i))|0;
  return Math.abs(h);
}

// ── Escena 1: Espacio cuántico (partículas y ondas de probabilidad) ──────────
function CanvasCuantico({modoOscuro}){
  const ref=useRef();
  useEffect(()=>{
    const cv=ref.current; if(!cv)return;
    const ctx=cv.getContext("2d");
    let W=cv.width=window.innerWidth, H=cv.height=window.innerHeight;
    const resize=()=>{W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;};
    window.addEventListener("resize",resize);
    const N=120;
    const pts=Array.from({length:N},(_,i)=>({
      x:Math.random()*W, y:Math.random()*H,
      vx:(Math.random()-.5)*.4, vy:(Math.random()-.5)*.4,
      r:Math.random()*2+.5, phase:Math.random()*Math.PI*2,
    }));
    const waves=Array.from({length:6},()=>({
      x:Math.random()*W, y:Math.random()*H,
      r:0, maxR:Math.max(W,H)*.7,
      speed:Math.random()*1.5+.5, alpha:Math.random()*.3+.1,
    }));
    let t2=0, raf;
    const C=modoOscuro?{bg:"#08040f",p1:"#d946ef",p2:"#7c3aed",w:"#a78bfa"}
                      :{bg:"#041820",p1:"#0d9488",p2:"#0284c7",w:"#5eead4"};
    const draw=()=>{
      ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
      t2+=.012;
      // ondas
      waves.forEach(w=>{
        w.r+=w.speed; if(w.r>w.maxR){w.r=0;w.x=Math.random()*W;w.y=Math.random()*H;}
        ctx.beginPath(); ctx.arc(w.x,w.y,w.r,0,Math.PI*2);
        ctx.strokeStyle=`${C.w}${Math.round(w.alpha*(1-w.r/w.maxR)*255).toString(16).padStart(2,"0")}`;
        ctx.lineWidth=1; ctx.stroke();
      });
      // partículas
      pts.forEach(p=>{
        p.x+=p.vx+Math.sin(t2+p.phase)*.3;
        p.y+=p.vy+Math.cos(t2+p.phase*.7)*.3;
        if(p.x<0)p.x=W; if(p.x>W)p.x=0;
        if(p.y<0)p.y=H; if(p.y>H)p.y=0;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=Math.sin(t2+p.phase)>.3?C.p1:C.p2;
        ctx.fill();
      });
      // conexiones
      for(let i=0;i<N;i++) for(let j=i+1;j<N;j++){
        const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y;
        const d=Math.sqrt(dx*dx+dy*dy);
        if(d<90){
          ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y);
          const a=Math.round((1-d/90)*60).toString(16).padStart(2,"0");
          ctx.strokeStyle=`${C.p1}${a}`; ctx.lineWidth=.5; ctx.stroke();
        }
      }
      raf=requestAnimationFrame(draw);
    };
    draw();
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);};
  },[modoOscuro]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,width:"100%",height:"100%",zIndex:0,pointerEvents:"none"}}/>;
}

// ── Escena 2: Pecera con tiburones y peces ───────────────────────────────────
function CanvasPecera({modoOscuro}){
  const ref=useRef();
  useEffect(()=>{
    const cv=ref.current; if(!cv)return;
    const ctx=cv.getContext("2d");
    let W=cv.width=window.innerWidth, H=cv.height=window.innerHeight;
    const resize=()=>{W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;};
    window.addEventListener("resize",resize);
    const C=modoOscuro?{bg1:"#000d1a",bg2:"#001428",agua:"#003366",
      pez1:"#00bfff",pez2:"#ff6eb4",pez3:"#7fff00",tiburon:"#c0c0c0",burbuja:"#00cfff"}
      :{bg1:"#001f3d",bg2:"#003366",agua:"#0066aa",
        pez1:"#ffcc00",pez2:"#ff4500",pez3:"#00e5ff",tiburon:"#778899",burbuja:"#aaddff"};
    const mkPez=(grande)=>({
      x:Math.random()*W, y:Math.random()*(H*.7)+H*.1,
      vx:(Math.random()+.5)*(Math.random()>.5?1:-1)*(grande?1.2:.7),
      vy:(Math.random()-.5)*.3, phase:Math.random()*Math.PI*2,
      len:grande?70+Math.random()*40:10+Math.random()*15,
      color:[C.pez1,C.pez2,C.pez3][Math.floor(Math.random()*3)],
      grande,
    });
    const peces=Array.from({length:18},()=>mkPez(false));
    const tiburones=Array.from({length:3},()=>mkPez(true)).map(p=>({...p,color:C.tiburon}));
    const burbujas=Array.from({length:30},()=>({
      x:Math.random()*W, y:Math.random()*H, vy:.3+Math.random()*.5, r:2+Math.random()*5
    }));
    let t2=0,raf;
    const drawPez=(p,t3)=>{
      ctx.save();
      ctx.translate(p.x,p.y);
      const flip=p.vx<0?-1:1;
      ctx.scale(flip,1);
      const wave=Math.sin(t3*3+p.phase)*.08;
      ctx.rotate(wave);
      ctx.beginPath();
      ctx.moveTo(p.len,0);
      ctx.quadraticCurveTo(0,-p.len*.3,-p.len,0);
      ctx.quadraticCurveTo(0,p.len*.3,p.len,0);
      ctx.fillStyle=p.color; ctx.fill();
      // cola
      ctx.beginPath();
      ctx.moveTo(-p.len,0);
      ctx.lineTo(-p.len-p.len*.5,-p.len*.35);
      ctx.lineTo(-p.len-p.len*.5,p.len*.35);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    };
    const draw=()=>{
      t2+=.016;
      // fondo agua
      const grad=ctx.createLinearGradient(0,0,0,H);
      grad.addColorStop(0,C.bg1); grad.addColorStop(1,C.bg2);
      ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
      // rayos de luz
      for(let i=0;i<6;i++){
        const lx=W*i/5;
        const g2=ctx.createLinearGradient(lx,0,lx+80,H);
        g2.addColorStop(0,`${C.burbuja}18`); g2.addColorStop(1,`${C.burbuja}00`);
        ctx.beginPath(); ctx.moveTo(lx-20,0); ctx.lineTo(lx+100,H); ctx.lineTo(lx+80,H); ctx.lineTo(lx,0);
        ctx.fillStyle=g2; ctx.fill();
      }
      // burbujas
      burbujas.forEach(b=>{
        b.y-=b.vy; if(b.y<-10){b.y=H+10;b.x=Math.random()*W;}
        ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
        ctx.strokeStyle=`${C.burbuja}55`; ctx.lineWidth=1; ctx.stroke();
      });
      // peces
      peces.forEach(p=>{
        p.x+=p.vx; p.y+=p.vy+Math.sin(t2+p.phase)*.5;
        if(p.x>W+50)p.x=-50; if(p.x<-50)p.x=W+50;
        p.y=Math.max(H*.08,Math.min(H*.92,p.y));
        drawPez(p,t2);
      });
      // tiburones
      tiburones.forEach(p=>{
        p.x+=p.vx; p.y+=p.vy+Math.sin(t2*.5+p.phase)*.8;
        if(p.x>W+100)p.x=-100; if(p.x<-100)p.x=W+100;
        p.y=Math.max(H*.1,Math.min(H*.9,p.y));
        drawPez(p,t2);
        // aleta dorsal
        ctx.save(); ctx.translate(p.x,p.y);
        const flip=p.vx<0?-1:1; ctx.scale(flip,1);
        ctx.beginPath();
        ctx.moveTo(0,0); ctx.lineTo(-15,-30); ctx.lineTo(-35,0);
        ctx.fillStyle=p.color; ctx.fill(); ctx.restore();
      });
      raf=requestAnimationFrame(draw);
    };
    draw();
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);};
  },[modoOscuro]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,width:"100%",height:"100%",zIndex:0,pointerEvents:"none"}}/>;
}

// ── Escena 3: Sistema Solar ──────────────────────────────────────────────────
function CanvasSolar({modoOscuro}){
  const ref=useRef();
  useEffect(()=>{
    const cv=ref.current; if(!cv)return;
    const ctx=cv.getContext("2d");
    let W=cv.width=window.innerWidth, H=cv.height=window.innerHeight;
    const resize=()=>{W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;};
    window.addEventListener("resize",resize);
    const C=modoOscuro
      ?{bg:"#01010a",sol:"#fff7a1",solGlow:"#ff9800",star:"#ffffff"}
      :{bg:"#00010f",sol:"#fffde7",solGlow:"#ffb300",star:"#fffde7"};
    const planetas=[
      {r:22, d:80,  speed:.025, color:"#b0bec5", size:4,  moons:0},
      {r:22, d:130, speed:.015, color:"#ef9a9a", size:6,  moons:0},
      {r:22, d:185, speed:.010, color:"#42a5f5", size:6.5,moons:1, lunaD:14, lunaS:.08, lunaC:"#cfd8dc"},
      {r:22, d:245, speed:.007, color:"#ef5350", size:5,  moons:0},
      {r:22, d:330, speed:.004, color:"#ffb74d", size:18, moons:2, lunaD:24, lunaS:.05, lunaC:"#ffe0b2", anillo:true},
      {r:22, d:410, speed:.0025,color:"#80deea", size:14, moons:1, lunaD:20, lunaS:.04, lunaC:"#b2ebf2"},
      {r:22, d:490, speed:.0015,color:"#7986cb", size:11, moons:0, anillo2:true},
      {r:22, d:560, speed:.001, color:"#5c6bc0", size:9,  moons:0},
    ];
    const angulos=planetas.map((_,i)=>i*(Math.PI*2/8));
    const lunaAng=planetas.map(()=>Math.random()*Math.PI*2);
    const stars=Array.from({length:250},()=>({x:Math.random()*1600,y:Math.random()*1000,r:Math.random()*1.2,b:Math.random()}));
    let t2=0,raf;
    const draw=()=>{
      t2+=.016;
      ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
      const ox=W/2, oy=H/2;
      // estrellas
      stars.forEach(s=>{
        const br=.4+.6*Math.abs(Math.sin(t2*.5+s.b*10));
        ctx.beginPath(); ctx.arc(s.x%(W+40)-20,s.y%(H+40)-20,s.r,0,Math.PI*2);
        ctx.fillStyle=`${C.star}${Math.round(br*180+40).toString(16).padStart(2,"0")}`; ctx.fill();
      });
      // sol
      const sg=ctx.createRadialGradient(ox,oy,4,ox,oy,55);
      sg.addColorStop(0,"#ffffff"); sg.addColorStop(.3,C.sol); sg.addColorStop(.7,C.solGlow); sg.addColorStop(1,"transparent");
      ctx.beginPath(); ctx.arc(ox,oy,55,0,Math.PI*2); ctx.fillStyle=sg; ctx.fill();
      // corona sol
      for(let i=0;i<12;i++){
        const a=i*(Math.PI*2/12)+t2*.2;
        const len=20+Math.sin(t2*2+i)*8;
        ctx.beginPath(); ctx.moveTo(ox+Math.cos(a)*38,oy+Math.sin(a)*38);
        ctx.lineTo(ox+Math.cos(a)*(38+len),oy+Math.sin(a)*(38+len));
        ctx.strokeStyle=`${C.solGlow}66`; ctx.lineWidth=2; ctx.stroke();
      }
      // órbitas y planetas
      planetas.forEach((p,i)=>{
        angulos[i]+=p.speed;
        const px=ox+Math.cos(angulos[i])*p.d;
        const py=oy+Math.sin(angulos[i])*p.d;
        // órbita
        ctx.beginPath(); ctx.arc(ox,oy,p.d,0,Math.PI*2);
        ctx.strokeStyle="rgba(255,255,255,0.06)"; ctx.lineWidth=1; ctx.stroke();
        // anillo Saturno
        if(p.anillo){
          ctx.save(); ctx.translate(px,py); ctx.scale(1,.35);
          ctx.beginPath(); ctx.arc(0,0,p.size+10,0,Math.PI*2);
          ctx.strokeStyle=`${p.color}55`; ctx.lineWidth=4; ctx.stroke();
          ctx.restore();
        }
        if(p.anillo2){
          ctx.save(); ctx.translate(px,py); ctx.scale(1,.4);
          ctx.beginPath(); ctx.arc(0,0,p.size+8,0,Math.PI*2);
          ctx.strokeStyle=`${p.color}44`; ctx.lineWidth=3; ctx.stroke();
          ctx.restore();
        }
        // planeta
        const pg=ctx.createRadialGradient(px-p.size*.3,py-p.size*.3,1,px,py,p.size);
        pg.addColorStop(0,"#ffffff44"); pg.addColorStop(.4,p.color); pg.addColorStop(1,p.color+"88");
        ctx.beginPath(); ctx.arc(px,py,p.size,0,Math.PI*2); ctx.fillStyle=pg; ctx.fill();
        // luna
        if(p.moons){
          lunaAng[i]+=p.lunaS;
          const lx=px+Math.cos(lunaAng[i])*p.lunaD;
          const ly=py+Math.sin(lunaAng[i])*p.lunaD;
          ctx.beginPath(); ctx.arc(lx,ly,2.5,0,Math.PI*2);
          ctx.fillStyle=p.lunaC||"#ccc"; ctx.fill();
        }
      });
      // cinturón de asteroides
      for(let i=0;i<60;i++){
        const a=i*(Math.PI*2/60)+t2*.001;
        const rd=280+Math.sin(i*7.3)*15;
        ctx.beginPath(); ctx.arc(ox+Math.cos(a)*rd, oy+Math.sin(a)*rd, .8,0,Math.PI*2);
        ctx.fillStyle="rgba(200,180,140,0.4)"; ctx.fill();
      }
      raf=requestAnimationFrame(draw);
    };
    draw();
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);};
  },[modoOscuro]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,width:"100%",height:"100%",zIndex:0,pointerEvents:"none"}}/>;
}

// ── Escena extra: Aurora boreal ───────────────────────────────────────────────
function CanvasAurora({modoOscuro}){
  const ref=useRef();
  useEffect(()=>{
    const cv=ref.current; if(!cv)return;
    const ctx=cv.getContext("2d");
    let W=cv.width=window.innerWidth, H=cv.height=window.innerHeight;
    const resize=()=>{W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;};
    window.addEventListener("resize",resize);
    const C=modoOscuro
      ?{bg1:"#000810",bg2:"#000d18",star:"#ffffff",a1:"#00ff88",a2:"#00cfff",a3:"#a78bfa",a4:"#d946ef",montaña:"#020a10"}
      :{bg1:"#000c18",bg2:"#001020",star:"#fffde7",a1:"#00e676",a2:"#00b4d8",a3:"#7c3aed",a4:"#0d9488",montaña:"#010810"};
    const stars=Array.from({length:200},()=>({x:Math.random()*W,y:Math.random()*H*.6,r:Math.random()*1.4,p:Math.random()*Math.PI*2}));
    // bandas de aurora
    const bandas=Array.from({length:5},(_,i)=>({
      offY: H*.1+i*H*.07,
      fase: i*1.2,
      color:[C.a1,C.a2,C.a3,C.a4,C.a1][i],
      amp: 30+i*18,
      freq: .003+i*.001,
      speed: .008+i*.003,
    }));
    let t2=0,raf;
    const draw=()=>{
      t2+=.012;
      const g=ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,C.bg1); g.addColorStop(1,C.bg2);
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
      // estrellas
      stars.forEach(s=>{
        const br=.3+.7*Math.abs(Math.sin(t2+s.p));
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
        ctx.fillStyle=`${C.star}${Math.round(br*160+40).toString(16).padStart(2,"0")}`; ctx.fill();
      });
      // bandas de aurora con gradiente vertical
      bandas.forEach(b=>{
        for(let pass=0;pass<3;pass++){
          ctx.beginPath();
          ctx.moveTo(0,H);
          for(let x=0;x<=W;x+=8){
            const y=b.offY + Math.sin(x*b.freq+t2*b.speed+b.fase+pass*.5)*b.amp
                           + Math.sin(x*b.freq*.5+t2*b.speed*.7+b.fase)*b.amp*.5;
            ctx.lineTo(x,y);
          }
          ctx.lineTo(W,H); ctx.closePath();
          const ag=ctx.createLinearGradient(0,b.offY-b.amp*2,0,b.offY+b.amp*2);
          const alpha=(pass===1?".22":pass===0?".10":".06");
          ag.addColorStop(0,`${b.color}00`);
          ag.addColorStop(.4,`${b.color}${pass===1?"38":"18"}`);
          ag.addColorStop(1,`${b.color}00`);
          ctx.fillStyle=ag; ctx.fill();
        }
      });
      // silueta montañas
      ctx.beginPath(); ctx.moveTo(0,H);
      const peaks=[0,.12,.2,.3,.38,.45,.55,.62,.72,.8,.88,.95,1];
      const heights=[.82,.65,.72,.60,.68,.58,.70,.62,.75,.64,.78,.66,.82];
      peaks.forEach((px,i)=>{ ctx.lineTo(px*W, heights[i]*H); });
      ctx.lineTo(W,H); ctx.closePath();
      ctx.fillStyle=C.montaña; ctx.fill();
      // reflejo en nieve
      ctx.beginPath(); ctx.moveTo(0,H);
      peaks.forEach((px,i)=>{ ctx.lineTo(px*W, heights[i]*H+2); });
      ctx.lineTo(W,H); ctx.closePath();
      ctx.strokeStyle="rgba(200,230,255,0.06)"; ctx.lineWidth=1; ctx.stroke();
      raf=requestAnimationFrame(draw);
    };
    draw();
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);};
  },[modoOscuro]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,width:"100%",height:"100%",zIndex:0,pointerEvents:"none"}}/>;
}

// ── Escena 4: Interés compuesto / finanzas ───────────────────────────────────
function CanvasInteres({modoOscuro}){
  const ref=useRef();
  useEffect(()=>{
    const cv=ref.current; if(!cv)return;
    const ctx=cv.getContext("2d");
    let W=cv.width=window.innerWidth, H=cv.height=window.innerHeight;
    const resize=()=>{W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;};
    window.addEventListener("resize",resize);
    const C=modoOscuro?{bg:"#04080f",line:"#00ff88",line2:"#d946ef",
      coin:"#ffd700",shadow:"#ff6030",grid:"#0a2a18"}
      :{bg:"#001a10",line:"#00c853",line2:"#0d9488",
        coin:"#f59e0b",shadow:"#dc2626",grid:"#003820"};
    // curva exponencial
    const pts=Array.from({length:200},(_,i)=>({
      x:i/199,
      y:1-Math.pow(1.015,i)/Math.pow(1.015,199),
    }));
    // monedas flotando
    const coins=Array.from({length:20},()=>({
      x:Math.random()*W, y:Math.random()*H,
      vy:-Math.random()*.8-.2, vx:(Math.random()-.5)*.3,
      r:6+Math.random()*10, phase:Math.random()*Math.PI*2,
    }));
    let t2=0,raf,offset=0;
    const draw=()=>{
      t2+=.015; offset=(offset+.3)%60;
      ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
      // grilla
      ctx.strokeStyle=C.grid; ctx.lineWidth=1;
      for(let x=offset;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
      for(let y=0;y<H;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
      // múltiples curvas exponenciales desplazadas
      [0,.15,.3].forEach((phase,pi)=>{
        ctx.beginPath();
        pts.forEach((p,i)=>{
          const px=(p.x+t2*.03+phase)%1*W;
          const py=p.y*H*.8+H*.1;
          i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
        });
        ctx.strokeStyle=pi===0?C.line:pi===1?C.line2:`${C.coin}88`;
        ctx.lineWidth=pi===0?2:1.2; ctx.stroke();
      });
      // monedas
      coins.forEach(c=>{
        c.y+=c.vy; c.x+=c.vx+Math.sin(t2+c.phase)*.4;
        if(c.y<-30)c.y=H+30;
        if(c.x<-30)c.x=W+30; if(c.x>W+30)c.x=-30;
        ctx.save(); ctx.translate(c.x,c.y);
        ctx.scale(1,Math.abs(Math.sin(t2*.8+c.phase))*.6+.4);
        ctx.beginPath(); ctx.arc(0,0,c.r,0,Math.PI*2);
        ctx.fillStyle=C.coin; ctx.fill();
        ctx.strokeStyle=C.shadow; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="rgba(0,0,0,0.3)";
        ctx.font=`bold ${c.r}px sans-serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText("$",0,0); ctx.restore();
      });
      raf=requestAnimationFrame(draw);
    };
    draw();
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);};
  },[modoOscuro]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,width:"100%",height:"100%",zIndex:0,pointerEvents:"none"}}/>;
}

// ── Escena 5: Cosmos / nebulosas ─────────────────────────────────────────────
function CanvasCosmos({modoOscuro}){
  const ref=useRef();
  useEffect(()=>{
    const cv=ref.current; if(!cv)return;
    const ctx=cv.getContext("2d");
    let W=cv.width=window.innerWidth, H=cv.height=window.innerHeight;
    const resize=()=>{W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;};
    window.addEventListener("resize",resize);
    const C=modoOscuro?{bg:"#02010a",star:"#ffffff",neb1:"#d946ef",neb2:"#7c3aed",neb3:"#06b6d4"}
                      :{bg:"#03010f",star:"#fffde7",neb1:"#0d9488",neb2:"#7c3aed",neb3:"#0284c7"};
    const stars=Array.from({length:300},()=>({
      x:Math.random()*W, y:Math.random()*H,
      r:Math.random()*1.8, phase:Math.random()*Math.PI*2,
    }));
    const nebulas=Array.from({length:5},()=>({
      x:Math.random()*W, y:Math.random()*H,
      rx:100+Math.random()*200, ry:60+Math.random()*120,
      color:[C.neb1,C.neb2,C.neb3][Math.floor(Math.random()*3)],
      phase:Math.random()*Math.PI*2, speed:.0003+Math.random()*.0005,
    }));
    // estrella fugaz
    let meteor={x:-100,y:Math.random()*H*.4,active:false,timer:0};
    let t2=0,raf;
    const draw=()=>{
      t2+=.012;
      ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
      // nebulosas
      nebulas.forEach(n=>{
        n.phase+=n.speed;
        ctx.save(); ctx.translate(n.x+Math.sin(n.phase)*20, n.y+Math.cos(n.phase*1.3)*15);
        const g=ctx.createRadialGradient(0,0,10,0,0,n.rx);
        g.addColorStop(0,`${n.color}22`); g.addColorStop(.5,`${n.color}11`); g.addColorStop(1,`${n.color}00`);
        ctx.scale(1,n.ry/n.rx);
        ctx.beginPath(); ctx.arc(0,0,n.rx,0,Math.PI*2);
        ctx.fillStyle=g; ctx.fill(); ctx.restore();
      });
      // estrellas parpadeantes
      stars.forEach(s=>{
        const br=.5+.5*Math.sin(t2*1.5+s.phase);
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r*br,0,Math.PI*2);
        ctx.fillStyle=`${C.star}${Math.round(br*200+55).toString(16).padStart(2,"0")}`; ctx.fill();
      });
      // meteorito
      meteor.timer++;
      if(!meteor.active&&meteor.timer>180){meteor.active=true;meteor.x=-50;meteor.y=Math.random()*H*.5;meteor.timer=0;}
      if(meteor.active){
        meteor.x+=8; meteor.y+=3;
        ctx.save(); ctx.translate(meteor.x,meteor.y); ctx.rotate(Math.atan2(3,8));
        const mg=ctx.createLinearGradient(-80,0,0,0);
        mg.addColorStop(0,`${C.star}00`); mg.addColorStop(1,`${C.star}cc`);
        ctx.beginPath(); ctx.moveTo(-80,0); ctx.lineTo(0,-2); ctx.lineTo(0,2); ctx.closePath();
        ctx.fillStyle=mg; ctx.fill(); ctx.restore();
        if(meteor.x>W+100)meteor.active=false;
      }
      raf=requestAnimationFrame(draw);
    };
    draw();
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);};
  },[modoOscuro]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,width:"100%",height:"100%",zIndex:0,pointerEvents:"none"}}/>;
}

// ── Escena 6: Océano profundo ─────────────────────────────────────────────────
function CanvasOceano({modoOscuro}){
  const ref=useRef();
  useEffect(()=>{
    const cv=ref.current; if(!cv)return;
    const ctx=cv.getContext("2d");
    let W=cv.width=window.innerWidth, H=cv.height=window.innerHeight;
    const resize=()=>{W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;};
    window.addEventListener("resize",resize);
    const C=modoOscuro?{bg1:"#000814",bg2:"#001d3d",wave:"#003566",glow:"#00b4d8",deep:"#023e8a"}
                      :{bg1:"#001220",bg2:"#003060",wave:"#0096c7",glow:"#48cae4",deep:"#0077b6"};
    const waves=Array.from({length:6},(_,i)=>({
      y:H*.3+i*H*.1, amp:20+i*8, freq:.003+i*.001,
      speed:.02+i*.005, phase:Math.random()*Math.PI*2,
      color:`${C.wave}${(40+i*15).toString(16).padStart(2,"0")}`,
    }));
    const biolum=Array.from({length:40},()=>({
      x:Math.random()*W, y:H*.4+Math.random()*H*.6,
      phase:Math.random()*Math.PI*2, r:2+Math.random()*4,
    }));
    let t2=0,raf;
    const draw=()=>{
      t2+=.016;
      const g=ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,C.bg1); g.addColorStop(1,C.bg2);
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
      // olas
      waves.forEach(w=>{
        ctx.beginPath(); ctx.moveTo(0,w.y);
        for(let x=0;x<=W;x+=4){
          ctx.lineTo(x, w.y+Math.sin(x*w.freq+t2*w.speed+w.phase)*w.amp);
        }
        ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath();
        ctx.fillStyle=w.color; ctx.fill();
      });
      // bioluminiscencia
      biolum.forEach(b=>{
        const glow=.5+.5*Math.sin(t2*1.2+b.phase);
        ctx.beginPath(); ctx.arc(b.x,b.y,b.r*glow,0,Math.PI*2);
        const bg=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r*3);
        bg.addColorStop(0,`${C.glow}cc`); bg.addColorStop(1,`${C.glow}00`);
        ctx.fillStyle=bg; ctx.fill();
      });
      raf=requestAnimationFrame(draw);
    };
    draw();
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);};
  },[modoOscuro]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,width:"100%",height:"100%",zIndex:0,pointerEvents:"none"}}/>;
}

// ── Escena 7: Ciudad futurista ────────────────────────────────────────────────
function CanvasCiudad({modoOscuro}){
  const ref=useRef();
  useEffect(()=>{
    const cv=ref.current; if(!cv)return;
    const ctx=cv.getContext("2d");
    let W=cv.width=window.innerWidth, H=cv.height=window.innerHeight;
    const resize=()=>{W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;};
    window.addEventListener("resize",resize);
    const C=modoOscuro?{sky1:"#020510",sky2:"#080b20",build:"#0d1035",win:"#ffd700",
      neon1:"#ff00ff",neon2:"#00ffff",road:"#0a0a14"}
      :{sky1:"#030820",sky2:"#0a1040",build:"#0d1840",win:"#fffde7",
        neon1:"#0d9488",neon2:"#d946ef",road:"#060810"};
    const buildings=Array.from({length:22},(_,i)=>({
      x:i*(W/22)-10, w:W/22*.85,
      h:80+Math.random()*H*.55,
      windows:Array.from({length:Math.floor(Math.random()*18+6)},()=>({
        lit:Math.random()>.45, blink:Math.random()>.8,
      })),
    }));
    const cars=Array.from({length:12},()=>({
      x:Math.random()*W, y:H*.82+Math.random()*H*.08,
      speed:1+Math.random()*2.5, dir:Math.random()>.5?1:-1,
      color:Math.random()>.5?C.neon1:C.neon2,
    }));
    let t2=0,raf;
    const draw=()=>{
      t2+=.018;
      const sg=ctx.createLinearGradient(0,0,0,H);
      sg.addColorStop(0,C.sky1); sg.addColorStop(1,C.sky2);
      ctx.fillStyle=sg; ctx.fillRect(0,0,W,H);
      // reflejos en suelo
      const rg=ctx.createLinearGradient(0,H*.8,0,H);
      rg.addColorStop(0,C.road); rg.addColorStop(1,"#000");
      ctx.fillStyle=rg; ctx.fillRect(0,H*.8,W,H*.2);
      // edificios
      buildings.forEach(b=>{
        const by=H-b.h;
        ctx.fillStyle=C.build; ctx.fillRect(b.x,by,b.w,b.h);
        // ventanas
        const cols=Math.floor(b.w/12), rows=Math.floor(b.h/16);
        b.windows.forEach((w,wi)=>{
          if(wi>=cols*rows)return;
          const wx=b.x+4+(wi%cols)*12, wy=by+4+Math.floor(wi/cols)*16;
          if(w.blink&&Math.random()>.985)w.lit=!w.lit;
          if(w.lit){ctx.fillStyle=C.win; ctx.fillRect(wx,wy,7,9);}
        });
        // neon en azotea
        if(Math.random()>.7){
          ctx.beginPath(); ctx.moveTo(b.x,by); ctx.lineTo(b.x+b.w,by);
          ctx.strokeStyle=t2%2>.5?C.neon1:C.neon2; ctx.lineWidth=1.5; ctx.stroke();
        }
      });
      // autos
      cars.forEach(c=>{
        c.x+=c.speed*c.dir;
        if(c.x>W+40)c.x=-40; if(c.x<-40)c.x=W+40;
        ctx.save(); ctx.translate(c.x,c.y);
        ctx.fillStyle=c.color; ctx.fillRect(-14,-4,28,8);
        // faros
        ctx.fillStyle="#ffffff";
        ctx.fillRect(c.dir>0?14:-16,-2,2,4);
        // reflejo en suelo
        ctx.globalAlpha=.25;
        ctx.fillStyle=c.color; ctx.fillRect(-10,8,20,3);
        ctx.globalAlpha=1; ctx.restore();
      });
      raf=requestAnimationFrame(draw);
    };
    draw();
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);};
  },[modoOscuro]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,width:"100%",height:"100%",zIndex:0,pointerEvents:"none"}}/>;
}

// ── FondoDinamico: elige escena por usuario y rota cada 45s con fade ─────────
function EscenaRender({nombre, modoOscuro}){
  if(nombre==="barranca") return <FondoBarranca modoOscuro={modoOscuro} opacidad={1}/>;
  if(nombre==="cuantico") return <CanvasCuantico modoOscuro={modoOscuro}/>;
  if(nombre==="pecera")   return <CanvasPecera   modoOscuro={modoOscuro}/>;
  if(nombre==="solar")    return <CanvasSolar    modoOscuro={modoOscuro}/>;
  if(nombre==="interes")  return <CanvasInteres  modoOscuro={modoOscuro}/>;
  if(nombre==="cosmos")   return <CanvasCosmos   modoOscuro={modoOscuro}/>;
  if(nombre==="oceano")   return <CanvasOceano   modoOscuro={modoOscuro}/>;
  if(nombre==="ciudad")   return <CanvasCiudad   modoOscuro={modoOscuro}/>;
  if(nombre==="aurora")   return <CanvasAurora   modoOscuro={modoOscuro}/>;
  return null;
}

function FondoDinamico({modoOscuro, userId}){
  const seed = seedRand(userId||"guest");
  const total = ESCENAS.length;
  // capa A y capa B — alternamos cuál está encima con crossfade
  const [capas, setCapas] = useState({
    a: ESCENAS[seed % total],
    b: ESCENAS[(seed+1) % total],
    activa: "a",   // cuál se ve ("a" opacidad 1, "b" opacidad 0)
    fading: false,
  });

  useEffect(()=>{
    const tick = setInterval(()=>{
      setCapas(prev=>{
        // elige siguiente diferente a la activa
        const actualNombre = prev.activa==="a" ? prev.a : prev.b;
        const idx = ESCENAS.indexOf(actualNombre);
        let next;
        do { next = Math.floor(Math.random()*total); } while(next===idx);
        const siguiente = ESCENAS[next];
        // pre-carga en la capa inactiva y arranca el fade
        if(prev.activa==="a"){
          return {...prev, b: siguiente, activa:"b", fading:true};
        } else {
          return {...prev, a: siguiente, activa:"a", fading:true};
        }
      });
      // limpia flag fading después de que la transición termina
      setTimeout(()=>setCapas(p=>({...p, fading:false})), 2000);
    }, 20000);
    return ()=>clearInterval(tick);
  // eslint-disable-next-line
  },[]);

  const aVisible = capas.activa==="a";
  const layer = (nombre, visible)=>(
    <div key={nombre} style={{
      position:"absolute",inset:0,
      opacity: visible ? 1 : 0,
      transition:"opacity 2s ease",
      pointerEvents:"none",
    }}>
      <EscenaRender nombre={nombre} modoOscuro={modoOscuro}/>
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}}>
      {layer(capas.a, aVisible)}
      {layer(capas.b, !aVisible)}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({onLogin, claves, estados, t, modoOscuro, toggleModo}){
  const [user,setUser]         = useState("");
  const [clave,setClave]       = useState("");
  const [err,setErr]           = useState("");
  const [entrando,setEntrando] = useState(false);
  const [bloqueo,setBloqueo]   = useState(0); // segundos restantes
  const claveRef = useRef();
  const bloqueoRef = useRef(null);

  // countdown de bloqueo
  useEffect(()=>{
    if(!user) return;
    const u = user.toLowerCase().trim();
    const at = getLoginAttempts(u);
    if(at.count >= MAX_ATTEMPTS) {
      const restante = LOCKOUT_TIME - (Date.now() - at.ts);
      if(restante > 0) {
        setBloqueo(Math.ceil(restante/1000));
        bloqueoRef.current = setInterval(()=>{
          const r2 = LOCKOUT_TIME - (Date.now() - getLoginAttempts(u).ts);
          if(r2 <= 0){ clearInterval(bloqueoRef.current); setBloqueo(0); setErr(""); }
          else setBloqueo(Math.ceil(r2/1000));
        }, 1000);
        return ()=>clearInterval(bloqueoRef.current);
      }
    }
    setBloqueo(0);
  },[user]);

  const ingresar = () => {
    const u = user.toLowerCase().trim();
    if(!USUARIOS_BASE[u]){ setErr("Usuario no encontrado"); playSound("error"); return; }
    if(!estados[u]){ setErr("Usuario desactivado. Contacta al administrador."); playSound("error"); return; }
    // Verificar bloqueo
    const at = getLoginAttempts(u);
    if(at.count >= MAX_ATTEMPTS) {
      const restante = LOCKOUT_TIME - (Date.now() - at.ts);
      if(restante > 0) { setErr(`Demasiados intentos. Espera ${Math.ceil(restante/1000)}s`); playSound("error"); return; }
      else resetLoginAttempts(u);
    }
    if(claves[u]!==clave){
      const newAt = { count: (at.count||0)+1, ts: Date.now() };
      setLoginAttempts(u, newAt);
      const restantes = MAX_ATTEMPTS - newAt.count;
      setErr(restantes>0?`Clave incorrecta. Intentos restantes: ${restantes}`:"Cuenta bloqueada 5 minutos");
      playSound("error"); return;
    }
    playSound("login");
    resetLoginAttempts(u);
    setEntrando(true);
    const modoGuardado = getModoUsuario(u);
    setTimeout(()=>{ onLogin({...USUARIOS_BASE[u],id:u}, modoGuardado); }, 800);
  };

  const ac = modoOscuro ? "#d946ef" : "#0d9488";
  const acH = modoOscuro ? "#c026d3" : "#0f766e";

  return(
    <div style={{minHeight:"100vh",width:"100vw",overflow:"hidden",position:"relative",
      display:"flex",alignItems:"center",justifyContent:"center",
      fontFamily:"'Nunito','DM Sans',sans-serif"}}>

      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; }
        input,select,button { font-family:inherit; }
        input:focus,select:focus { outline:none; }
        select { appearance:none; }
        @keyframes logoFlota{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-8px) rotate(1deg)}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes loginPulse{0%,100%{box-shadow:0 24px 60px rgba(0,0,0,.65),0 0 0 1px ${modoOscuro?"rgba(217,70,239,.22)":"rgba(13,148,136,.22)"};}50%{box-shadow:0 28px 70px rgba(0,0,0,.75),0 0 0 2px ${modoOscuro?"rgba(217,70,239,.38)":"rgba(13,148,136,.32)"},0 0 40px ${modoOscuro?"rgba(217,70,239,.15)":"rgba(13,148,136,.12)"};}}
        .neo-btn{position:relative;overflow:hidden;transition:box-shadow .15s,transform .1s;}
        .neo-btn:active{transform:scale(.97);}
        ::-webkit-scrollbar{width:0;}
      `}</style>

      {/* FONDO SIEMPRE PRESENTE */}
      <FondoDinamico modoOscuro={modoOscuro} userId="login"/>

      {/* Velo semitransparente encima del fondo para legibilidad */}
      <div style={{position:"fixed",inset:0,zIndex:1,
        background:modoOscuro
          ?"linear-gradient(135deg,rgba(12,5,22,0.55) 0%,rgba(22,10,40,0.35) 100%)"
          :"linear-gradient(135deg,rgba(5,30,50,0.42) 0%,rgba(8,50,40,0.28) 100%)",
        pointerEvents:"none"}}/>

      {/* CARD LOGIN */}
      <div style={{
        position:"relative",zIndex:10,width:"100%",maxWidth:410,margin:"0 20px",
        animation:"fadeInUp 0.5s ease forwards",
      }}>
        <div style={{
          background:modoOscuro?"rgba(14,7,26,0.94)":"rgba(255,253,248,0.96)",
          backdropFilter:"blur(28px)",
          borderRadius:24,
          border:`1px solid ${modoOscuro?"rgba(217,70,239,0.22)":"rgba(13,148,136,0.22)"}`,
          boxShadow:modoOscuro
            ?"0 24px 60px rgba(0,0,0,0.75), 0 0 0 1px rgba(217,70,239,0.12)"
            :"0 24px 60px rgba(0,0,0,0.22), 0 0 0 1px rgba(13,148,136,0.15)",
          padding:"38px 34px 32px",
          textAlign:"center",
          animation:"loginPulse 4s ease-in-out infinite",
        }}>
          {/* LOGO — Cristo mini flotando */}
          <div style={{
            width:74,height:74,margin:"0 auto 18px",borderRadius:20,
            background:modoOscuro
              ?"linear-gradient(135deg,rgba(217,70,239,0.18),rgba(124,58,237,0.18))"
              :"linear-gradient(135deg,rgba(13,148,136,0.14),rgba(2,132,199,0.14))",
            border:`2px solid ${modoOscuro?"rgba(217,70,239,0.38)":"rgba(13,148,136,0.32)"}`,
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:modoOscuro?"0 8px 28px rgba(217,70,239,0.28)":"0 8px 28px rgba(13,148,136,0.22)",
            animation:"logoFlota 3.8s ease-in-out infinite",
          }}>
            <svg width="40" height="40" viewBox="0 0 40 40">
              <defs>
                <linearGradient id="lgMini" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={modoOscuro?"#f0abfc":"#5eead4"}/>
                  <stop offset="100%" stopColor={modoOscuro?"#d946ef":"#0d9488"}/>
                </linearGradient>
              </defs>
              {/* Cristo mini — silueta clara */}
              <ellipse cx="20" cy="9" rx="5.5" ry="6.5" fill="url(#lgMini)"/>
              <path d="M13 18 Q15 14 20 13 Q25 14 27 18 L30 32 L10 32Z" fill="url(#lgMini)"/>
              {/* Brazos arriba */}
              <path d="M13 22 Q7 18 3 14 Q1 11 3 9 Q5 8 7 11 Q11 16 14 20Z" fill="url(#lgMini)"/>
              <path d="M27 22 Q33 18 37 14 Q39 11 37 9 Q35 8 33 11 Q29 16 26 20Z" fill="url(#lgMini)"/>
              {/* Piernas */}
              <rect x="15" y="32" width="4" height="7" fill="url(#lgMini)" rx="2"/>
              <rect x="21" y="32" width="4" height="7" fill="url(#lgMini)" rx="2"/>
              {/* Aureola */}
              <circle cx="20" cy="9" r="9" fill="none" stroke={modoOscuro?"#f0abfc":"#5eead4"} strokeWidth="1" opacity="0.4"/>
              {/* Rayitos */}
              {[0,60,120,180,240,300].map((d,i)=>(
                <line key={i} x1={20+Math.cos(d*Math.PI/180)*10} y1={9+Math.sin(d*Math.PI/180)*10}
                  x2={20+Math.cos(d*Math.PI/180)*14} y2={9+Math.sin(d*Math.PI/180)*14}
                  stroke={modoOscuro?"#f0abfc":"#5eead4"} strokeWidth="1.5" opacity="0.45"/>
              ))}
            </svg>
          </div>

          <h1 style={{fontSize:21,fontWeight:900,letterSpacing:"-0.4px",margin:"0 0 4px",
            color:modoOscuro?"#f0e8ff":"#1c1917"}}>Sistema de Caja</h1>
          <p style={{fontSize:12,marginBottom:26,color:modoOscuro?"#7d5fa0":"#78716c",lineHeight:1.5}}>
            Internet La 52 · Trámites y Servicios
          </p>

          {/* Select */}
          <div style={{textAlign:"left",marginBottom:13}}>
            <label style={{display:"block",fontSize:10,fontWeight:800,textTransform:"uppercase",
              letterSpacing:.8,marginBottom:6,color:modoOscuro?"#7d5fa0":"#78716c"}}>¿Quién eres?</label>
            <select value={user} onChange={e=>{setUser(e.target.value);setErr("");}}
              onKeyDown={e=>e.key==="Enter"&&claveRef.current.focus()}
              style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:14,
                background:modoOscuro?"rgba(8,3,18,0.92)":"rgba(248,244,236,0.95)",
                border:`1.5px solid ${modoOscuro?"rgba(217,70,239,0.28)":"rgba(13,148,136,0.28)"}`,
                color:modoOscuro?"#f0e8ff":"#1c1917",cursor:"pointer",
                boxShadow:modoOscuro
                  ?"3px 3px 8px rgba(0,0,0,.6),-2px -2px 5px rgba(180,100,255,.04)"
                  :"4px 4px 10px rgba(180,160,120,.4),-3px -3px 8px rgba(255,255,255,.85)"}}>
              <option value="">— Selecciona tu nombre —</option>
              {Object.entries(USUARIOS_BASE).map(([k,v])=>(
                <option key={k} value={k}>{v.nombre}</option>
              ))}
            </select>
          </div>

          {/* Input clave */}
          <div style={{textAlign:"left",marginBottom:16}}>
            <label style={{display:"block",fontSize:10,fontWeight:800,textTransform:"uppercase",
              letterSpacing:.8,marginBottom:6,color:modoOscuro?"#7d5fa0":"#78716c"}}>Clave</label>
            <input ref={claveRef} type="password" placeholder="••••" value={clave}
              onChange={e=>{setClave(e.target.value);setErr("");}}
              onKeyDown={e=>e.key==="Enter"&&ingresar()}
              style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:16,boxSizing:"border-box",
                background:modoOscuro?"rgba(8,3,18,0.92)":"rgba(248,244,236,0.95)",
                border:`1.5px solid ${modoOscuro?"rgba(217,70,239,0.28)":"rgba(13,148,136,0.28)"}`,
                color:modoOscuro?"#f0e8ff":"#1c1917",
                boxShadow:modoOscuro
                  ?"3px 3px 8px rgba(0,0,0,.6),-2px -2px 5px rgba(180,100,255,.04)"
                  :"4px 4px 10px rgba(180,160,120,.4),-3px -3px 8px rgba(255,255,255,.85)"}}/>
          </div>

          {/* Error / Bloqueo */}
          {(err || bloqueo>0) && (
            <div style={{marginBottom:14,padding:"9px 14px",borderRadius:10,
              background:modoOscuro?"rgba(251,70,80,0.12)":"rgba(254,226,226,0.9)",
              border:"1px solid rgba(251,113,133,0.3)",
              color:modoOscuro?"#fda4af":"#dc2626",
              fontSize:12,display:"flex",alignItems:"center",gap:6,fontWeight:600}}>
              <Icon name="lock" size={13}/>
              {bloqueo>0 ? `🔒 Bloqueado. Espera ${bloqueo}s para intentar de nuevo` : err}
            </div>
          )}

          {/* Botón entrar */}
          <button className="neo-btn" onClick={ingresar} disabled={entrando||bloqueo>0} style={{
            width:"100%",padding:"13px",borderRadius:14,border:"none",
            background:`linear-gradient(135deg,${ac},${acH})`,
            color:"#fff",fontWeight:900,fontSize:15,letterSpacing:".3px",
            display:"flex",alignItems:"center",justifyContent:"center",gap:8,
            boxShadow:`0 5px 22px ${ac}55`,
            opacity:entrando?0.7:1,transition:"opacity 0.2s",cursor:"pointer",
          }}>
            <Icon name="zap" size={16}/>
            {entrando?"Entrando...":bloqueo>0?`Bloqueado (${bloqueo}s)`:"Entrar"}
          </button>
          <div style={{marginTop:10,fontSize:11,color:modoOscuro?"#3d2856":"#a8a29e"}}>
            ↵ Enter para confirmar
          </div>
        </div>


      </div>
    </div>
  );
}

// ─── VISTA REGISTRO ───────────────────────────────────────────────────────────
function VistaRegistro({usuario,onRegistrar,registros,etiquetas,t,modoOscuro}){
  const esAdmin = usuario.role==="admin";
  const [paso,setPaso]          = useState(0);
  const [tipo,setTipo]          = useState("");
  const [localSel,setLocalSel]  = useState(esAdmin?"":usuario.local);
  const [medio,setMedio]        = useState("");
  const [categoria,setCategoria]= useState("");
  const [monto,setMonto]        = useState("");
  const [nota,setNota]          = useState("");
  const [autoriza,setAutoriza]  = useState("Iván");
  const [exito,setExito]        = useState(null);
  const [fade,setFade]          = useState(true);
  const [registrando,setRegistrando] = useState(false);
  const registrandoRef = useRef(false); // guarda sincrónica: evita registros duplicados al presionar Enter varias veces seguidas

  const pasos = getPasos(esAdmin, tipo);
  const mediosDisp = esAdmin ? (localSel ? MEDIOS_LOCAL[localSel] : []) : usuario.medios;

  const ir = (n) => { setFade(false); setTimeout(()=>{setPaso(n);setFade(true);},130); };
  const avanzar = () => ir(paso+1);
  const reset = () => {
    setPaso(0);setTipo("");setLocalSel(esAdmin?"":usuario.local);
    setMedio("");setCategoria("");setMonto("");setNota("");setAutoriza("Iván");
  };
  const cancelar = () => { playSound("cancel"); setFade(false); setTimeout(()=>{reset();setFade(true);},130); };
  const volver   = () => { playSound("nav");    setFade(false); setTimeout(()=>{setPaso(p=>Math.max(0,p-1));setFade(true);},130); };

  // ── Escape para cancelar ────────────────────────────────────────────────────
  useEffect(()=>{
    if(paso===0) return;
    const handler=(e)=>{ if(e.key==="Escape"){ e.preventDefault(); cancelar(); } };
    window.addEventListener("keydown",handler);
    return ()=>window.removeEventListener("keydown",handler);
  // eslint-disable-next-line
  },[paso]);

  const confirmarMonto = () => {
    const n = parseFloat(String(monto).replace(/[^0-9.]/g,""));
    if(!n||n<=0) return;
    setMonto(String(n));
    if(tipo==="egreso") avanzar(); else ir(pasos.confirm);
  };

  const registrar = () => {
    // FIX bug de doble registro: el listener de "Enter" (más abajo) se re-crea
    // solo cuando cambian ciertos valores del formulario, NO cuando cambia
    // `registrando`. Por eso, si alguien presiona Enter varias veces muy rápido,
    // el chequeo `if(registrando)` podía seguir leyendo un valor viejo (false) y
    // se guardaban ventas duplicadas. Un useRef se actualiza al instante (sin
    // esperar el re-render), así que sirve de candado real aunque el listener
    // haya quedado desactualizado.
    if(registrandoRef.current) return;
    registrandoRef.current = true;
    setRegistrando(true);
    const reg = {tipo, localSel:esAdmin?localSel:undefined, medio, categoria,
      monto:parseFloat(monto), nota:nota||"", autoriza:tipo==="egreso"?autoriza:""};
    const nuevo = onRegistrar(reg);
    playSound(tipo==="ingreso"?"ingreso_ok":"egreso_ok"); setExito(nuevo);
    setTimeout(()=>{reset();setExito(null);setRegistrando(false);registrandoRef.current=false;},2800);
  };

  useEffect(()=>{
    if(paso !== pasos.confirm) return;
    const handler = (e) => { if(e.key==="Enter") { e.preventDefault(); registrar(); } };
    window.addEventListener("keydown", handler);
    return ()=>window.removeEventListener("keydown", handler);
  // eslint-disable-next-line
  },[paso, pasos.confirm, tipo, localSel, medio, categoria, monto, nota, autoriza]);

  // ── Datos del día actual ─────────────────────────────────────────────────────
  const hoyISO = fechaISO();
  const localFiltro = (r) => !esAdmin ? r.local===usuario.local : true;
  const regsHoy = registros.filter(r=> r.fechaISO===hoyISO && localFiltro(r));

  const sum = (lista,tp,m) => lista.filter(r=>r.tipo===tp&&(!m||r.medio===m)).reduce((a,b)=>a+b.monto,0);
  const ingEf = sum(regsHoy,"ingreso","Efectivo");
  const egrEf = sum(regsHoy,"egreso","Efectivo");
  const ingTr = sum(regsHoy,"ingreso") - ingEf;
  const egrTr = sum(regsHoy,"egreso")  - egrEf;

  // Saldo físico histórico por medio (solo admin lo necesita acumulado)
  const saldoMedio = (med) => registros.filter(r=> localFiltro(r) && r.medio===med)
    .reduce((acc,r)=> r.tipo==="ingreso" ? acc+r.monto : acc-r.monto, 0);
  // Saldo del día por medio (para colaboradores — resetea cada día)
  const saldoMedioDia = (med) => regsHoy.filter(r=> r.medio===med)
    .reduce((acc,r)=> r.tipo==="ingreso" ? acc+r.monto : acc-r.monto, 0);
  const cajaEf = esAdmin ? saldoMedio("Efectivo") : saldoMedioDia("Efectivo");
  const cajaTr = esAdmin
    ? saldoMedio("Nequi") + saldoMedio("DaviPlata")
    : (usuario.local==="internet52" ? saldoMedioDia("Nequi") : saldoMedioDia("DaviPlata"));

  if(exito) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:300}}>
      <div style={{...card(t),border:`1px solid rgba(52,211,153,0.3)`,borderRadius:20,padding:40,textAlign:"center",boxShadow:t.sombra}}>
        <div style={{background:"rgba(52,211,153,0.1)",border:`1px solid rgba(52,211,153,0.25)`,borderRadius:50,padding:18,display:"inline-flex",marginBottom:14}}>
          <Icon name="check" size={38} color={t.verde}/>
        </div>
        <div style={{color:t.verde,fontWeight:800,fontSize:22,marginBottom:8}}>¡Registrado!</div>
        <div style={{color:t.textoSub,fontSize:14,marginTop:4}}>{exito.tipo==="ingreso"?"Ingreso":"Egreso"} · {fmt(exito.monto)}</div>
        <div style={{color:t.textoSub,fontSize:14}}>{exito.categoria} · {exito.medio}</div>
        <div style={{color:t.textoMuted,fontSize:13,marginTop:4}}>{exito.hora}</div>
      </div>
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Cuadre del día */}
      <div style={{...card(t),borderRadius:16,padding:"18px 20px"}}>
        <div style={{color:t.textoMuted,fontSize:11,textTransform:"uppercase",letterSpacing:.8,marginBottom:14,display:"flex",alignItems:"center",gap:6,fontWeight:700}}>
          <Icon name="calendar" size={13} color={t.textoMuted}/> HOY · {!esAdmin?LOCALES[usuario.local]:"Todos los locales"} · <span style={{color:t.acento}}>{hoy()}</span>
        </div>
        {esAdmin ? (
          <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              {[
                {label:"Efectivo cobrado",val:ingEf,color:t.verde},
                {label:"Transf. cobrada", val:ingTr,color:t.acento},
                {label:"Efectivo gastado",val:egrEf,color:t.rojo,neg:true},
                {label:"Transf. gastada", val:egrTr,color:t.amarillo,neg:true},
              ].map(item=>(
                <div key={item.label} style={{background:modoOscuro?"rgba(15,23,42,0.5)":"rgba(218,227,240,0.6)",borderRadius:10,padding:"10px 14px",boxShadow:t.sombraBtn}}>
                  <span style={{color:t.textoMuted,fontSize:11,display:"block",marginBottom:3}}>{item.label}</span>
                  <span style={{color:item.color,fontWeight:700,fontSize:15}}>{item.neg?"-":""}{fmt(item.val)}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",alignItems:"center",background:modoOscuro?"rgba(15,23,42,0.5)":"rgba(218,227,240,0.6)",borderRadius:12,padding:"12px 16px",boxShadow:t.sombraBtn,gap:0}}>
              <div style={{flex:1}}>
                <span style={{color:t.textoMuted,fontSize:11,display:"block"}}>💵 Efectivo en caja</span>
                <span style={{fontWeight:800,fontSize:17,color:cajaEf>=0?t.amarillo:t.rojo}}>{fmt(cajaEf)}</span>
              </div>
              <div style={{width:1,height:34,background:modoOscuro?"rgba(255,255,255,0.06)":"rgba(149,165,185,0.4)",margin:"0 16px"}}/>
              <div style={{flex:1}}>
                <span style={{color:t.textoMuted,fontSize:11,display:"block"}}>📱 Nequi + DaviPlata</span>
                <span style={{fontWeight:800,fontSize:17,color:cajaTr>=0?t.amarillo:t.rojo}}>{fmt(cajaTr)}</span>
              </div>
            </div>
          </>
        ) : (
          /* Colaboradores: solo ven Efectivo y Nequi del local hoy */
          <div style={{display:"flex",gap:10}}>
            <div style={{flex:1,background:modoOscuro?"rgba(15,23,42,0.5)":"rgba(218,227,240,0.6)",borderRadius:12,padding:"14px 18px",boxShadow:t.sombraBtn,textAlign:"center"}}>
              <div style={{fontSize:10,color:t.textoMuted,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>💵 Efectivo hoy</div>
              <div style={{fontWeight:800,fontSize:22,color:cajaEf>=0?t.verde:t.rojo}}>{fmt(cajaEf)}</div>
              <div style={{fontSize:11,color:t.textoMin,marginTop:4}}>{fmt(ingEf)} cobrado</div>
            </div>
            <div style={{flex:1,background:modoOscuro?"rgba(15,23,42,0.5)":"rgba(218,227,240,0.6)",borderRadius:12,padding:"14px 18px",boxShadow:t.sombraBtn,textAlign:"center"}}>
              <div style={{fontSize:10,color:t.textoMuted,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>📱 {usuario.local==="internet52"?"Nequi":"DaviPlata"} hoy</div>
              <div style={{fontWeight:800,fontSize:22,color:cajaTr>=0?t.acento:t.rojo}}>{fmt(cajaTr)}</div>
              <div style={{fontSize:11,color:t.textoMin,marginTop:4}}>{fmt(ingTr)} cobrado</div>
            </div>
          </div>
        )}
      </div>

      {/* Mi total hoy (solo colaboradores) */}
      {!esAdmin && (()=>{
        const misTotalHoy = registros.filter(r=> r.fechaISO===hoyISO && r.usuario===usuario.nombre);
        const miIng = misTotalHoy.filter(r=>r.tipo==="ingreso").reduce((a,b)=>a+b.monto,0);
        const miEgr = misTotalHoy.filter(r=>r.tipo==="egreso").reduce((a,b)=>a+b.monto,0);
        // Total del local hoy (todos los usuarios de ese local)
        const localEfHoy  = sum(regsHoy,"ingreso","Efectivo") - sum(regsHoy,"egreso","Efectivo");
        const localMedPago = usuario.local==="internet52" ? "Nequi" : "DaviPlata";
        const localTrHoy  = sum(regsHoy,"ingreso",localMedPago) - sum(regsHoy,"egreso",localMedPago);
        return (
          <div style={{...card(t),borderRadius:14,padding:"14px 18px",display:"flex",gap:0,alignItems:"stretch"}}>
            {/* Columna izquierda — lo mío */}
            <div style={{flex:1,display:"flex",alignItems:"center",gap:8}}>
              <div style={{background:modoOscuro?"rgba(217,70,239,0.1)":"rgba(13,148,136,0.1)",borderRadius:10,padding:8,flexShrink:0}}>
                <Icon name="user" size={16} color={t.acento}/>
              </div>
              <div>
                <div style={{color:t.textoMuted,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>Yo hoy</div>
                <div style={{color:t.textoMin,fontSize:10}}>{misTotalHoy.length} mov.</div>
                <div style={{color:t.verde,fontWeight:800,fontSize:16,marginTop:2}}>{fmt(miIng)}</div>
                {miEgr>0&&<div style={{color:t.rojo,fontSize:11,fontWeight:600}}>-{fmt(miEgr)}</div>}
              </div>
            </div>
            {/* Divisor */}
            <div style={{width:1,background:modoOscuro?"rgba(255,255,255,0.07)":"rgba(149,165,185,0.35)",margin:"0 14px",alignSelf:"stretch"}}/>
            {/* Columna derecha — el local hoy */}
            <div style={{flex:1,display:"flex",alignItems:"center",gap:8}}>
              <div style={{background:modoOscuro?"rgba(16,185,129,0.1)":"rgba(22,163,74,0.1)",borderRadius:10,padding:8,flexShrink:0}}>
                <Icon name="store" size={16} color={t.verde}/>
              </div>
              <div>
                <div style={{color:t.textoMuted,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>Local hoy</div>
                <div style={{color:t.textoMin,fontSize:10}}>{regsHoy.length} mov.</div>
                <div style={{color:t.amarillo,fontWeight:800,fontSize:16,marginTop:2}}>{fmt(localEfHoy+localTrHoy)}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Formulario conversacional */}
      <div style={{...card(t),borderRadius:16,padding:"22px",opacity:fade?1:0,transition:"opacity 0.13s"}}>
        {paso>0 && (
          <div style={{marginBottom:16,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <button className="neo-btn" style={{...btnCancelar(t)}} onClick={()=>{playSound("cancel");cancelar();}}>
              <Icon name="x" size={13}/> Cancelar
            </button>
            {paso>1 && (
              <button className="neo-btn" style={{
                background:"rgba(99,102,241,0.07)",border:"1px solid rgba(99,102,241,0.25)",color:"#818cf8",
                padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:12,
                display:"flex",alignItems:"center",gap:5,
              }} onClick={volver}>
                <Icon name="arrow_up" size={13} color="#818cf8"/> Volver
              </button>
            )}
            <span style={{color:t.textoMin,fontSize:11}}>o presiona Esc</span>
          </div>
        )}

        {paso===0 && (
          <Paso titulo="¿Qué vas a registrar?" sub="Presiona 1 o 2 · o clic" t={t}>
            <OpcionBtn t={t} modoOscuro={modoOscuro} num={1} label="Ingreso" icon="arrow_up"   color={t.verde} sound="select_ingreso" onClick={()=>{setTipo("ingreso");avanzar();}}/>
            <OpcionBtn t={t} modoOscuro={modoOscuro} num={2} label="Egreso"  icon="arrow_down" color={t.rojo}  sound="select_egreso"  onClick={()=>{setTipo("egreso"); avanzar();}}/>
          </Paso>
        )}

        {esAdmin && paso===1 && (
          <Paso titulo="¿De qué local?" sub="Presiona 1 o 2" t={t}>
            <OpcionBtn t={t} modoOscuro={modoOscuro} num={1} label="Internet La 52"       icon="store" color={t.acento} sound="select" onClick={()=>{setLocalSel("internet52");avanzar();}}/>
            <OpcionBtn t={t} modoOscuro={modoOscuro} num={2} label="Trámites y Servicios" icon="store" color={t.morado} sound="select" onClick={()=>{setLocalSel("tramites");  avanzar();}}/>
          </Paso>
        )}

        {paso===pasos.medio && (
          <Paso titulo="¿Medio de pago?" sub="Presiona el número — el color indica qué es cada uno" t={t}>
            {mediosDisp.map((m,i)=>(
              <OpcionBtn t={t} modoOscuro={modoOscuro} key={m} num={i+1} label={m}
                icon={m==="Efectivo"?"cash":"phone"}
                color={m==="Efectivo"?"#10b981":m==="Nequi"?"#a78bfa":"#ec4899"}
                sound="select"
                onClick={()=>{setMedio(m);avanzar();}}/>
            ))}
          </Paso>
        )}

        {paso===pasos.cat && (
          <Paso titulo={tipo==="ingreso"?"¿Qué servicio prestaste?":"¿Tipo de gasto?"} sub="Presiona el número" t={t}>
            {(tipo==="ingreso"?etiquetas.ingreso:etiquetas.egreso).map((c,i)=>(
              <OpcionBtn t={t} modoOscuro={modoOscuro} key={c} num={i+1} label={c}
                icon={tipo==="ingreso"?"trending":"arrow_down"}
                color={tipo==="ingreso"?t.acento:t.naranja} small
                sound="select"
                onClick={()=>{setCategoria(c);avanzar();}}/>
            ))}
          </Paso>
        )}

        {paso===pasos.monto && (
          <Paso titulo={tipo==="ingreso"?"¿Cuánto ingresó?":"¿Cuánto fue el gasto?"} sub="Escribe el valor y presiona Enter" t={t}>
            <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <input autoFocus style={inputMonto(t,modoOscuro)} type="number" value={monto}
                onChange={e=>setMonto(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&confirmarMonto()} placeholder="0"/>
              <button className="neo-btn" style={btnOk(t)} onClick={()=>{playSound("click");confirmarMonto();}}>OK</button>
            </div>
          </Paso>
        )}

        {tipo==="egreso" && paso===pasos.nota && (
          <Paso titulo="Descripción del gasto" sub="Opcional — Enter para continuar" t={t}>
            <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <input autoFocus style={{...inputMonto(t,modoOscuro),fontSize:15,width:260}} type="text" value={nota}
                onChange={e=>setNota(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&avanzar()} placeholder="Ej: 2 resmas de papel..."/>
              <button className="neo-btn" style={btnOk(t)} onClick={()=>{playSound("click");avanzar();}}>OK</button>
            </div>
          </Paso>
        )}

        {tipo==="egreso" && paso===pasos.autoriza && (
          <Paso titulo="¿Quién autoriza este gasto?" sub="Enter para confirmar" t={t}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <input autoFocus style={{...inputMonto(t,modoOscuro),fontSize:15,width:200}} type="text" value={autoriza}
                onChange={e=>setAutoriza(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&ir(pasos.confirm)} placeholder="Iván"/>
              <button className="neo-btn" style={btnOk(t)} onClick={()=>{playSound("click");ir(pasos.confirm);}}>OK</button>
            </div>
          </Paso>
        )}

        {paso===pasos.confirm && (
          <Paso titulo="¿Confirmás el registro?" sub="Presioná ENTER o clic en Registrar · Esc para cancelar" t={t}>
            <div style={{background:modoOscuro?"rgba(15,23,42,0.6)":"rgba(218,227,240,0.6)",borderRadius:12,padding:"14px 18px",width:"100%",boxSizing:"border-box",boxShadow:t.sombraBtn}}>
              {[
                {label:"Tipo",      val:tipo==="ingreso"?"Ingreso":"Egreso", color:tipo==="ingreso"?t.verde:t.rojo},
                {label:"Local",     val:LOCALES[esAdmin?localSel:usuario.local]},
                {label:"Medio",     val:medio, color:medio==="Efectivo"?"#10b981":medio==="Nequi"?"#a78bfa":"#ec4899"},
                {label:"Categoría", val:categoria},
                {label:"Monto",     val:fmt(parseFloat(monto)), destacado:true},
                ...(nota?[{label:"Nota",val:nota}]:[]),
                ...(tipo==="egreso"?[{label:"Autoriza",val:autoriza}]:[]),
              ].map(f=>(
                <div key={f.label} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${modoOscuro?"#1e293b":"rgba(149,165,185,0.2)"}`}}>
                  <span style={{color:t.textoMuted,fontSize:12}}>{f.label}</span>
                  <span style={{fontWeight:f.destacado?700:500,color:f.color||(f.destacado?t.amarillo:t.textoSub),fontSize:f.destacado?15:13}}>{f.val}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:10,marginTop:16,alignItems:"center",flexWrap:"wrap"}}>
              <button className="neo-btn" style={btnCancelar(t)} onClick={cancelar}>Cancelar</button>
              <button className="neo-btn" style={{
                background:"rgba(99,102,241,0.07)",border:"1px solid rgba(99,102,241,0.25)",color:"#818cf8",
                padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:12,
                display:"flex",alignItems:"center",gap:5,
              }} onClick={volver}>
                <Icon name="arrow_up" size={13} color="#818cf8"/> Volver
              </button>
              <button autoFocus className="neo-btn" disabled={registrando} style={{...btnPrimary(t),width:"auto",padding:"12px 28px",fontSize:15,boxShadow:`0 4px 18px ${t.acento}44`,opacity:registrando?0.5:1,cursor:registrando?"not-allowed":"pointer"}} onClick={()=>{ registrar(); }}>
                <Icon name="check" size={16}/> {registrando?"Guardando...":"Registrar"}
              </button>
              <span style={{color:t.textoMin,fontSize:11,marginLeft:4}}>↵ Enter</span>
            </div>
          </Paso>
        )}
      </div>

      {/* Registros de hoy - SIN límite, todos visibles */}
      {regsHoy.length>0 && (()=>{
        const regsVista = esAdmin ? regsHoy : regsHoy.filter(r=>r.usuario===usuario.nombre);
        if(regsVista.length===0) return null;
        return (
        <div style={{...card(t),borderRadius:16,padding:"16px 20px"}}>
          <div style={{color:t.textoMuted,fontSize:11,textTransform:"uppercase",letterSpacing:.8,marginBottom:12,display:"flex",alignItems:"center",gap:6,fontWeight:700}}>
            <Icon name="list" size={13} color={t.textoMuted}/>
            {usuario.id==="ivan"?"Todos los registros de hoy":"Mis registros de hoy"}
            <span style={{marginLeft:"auto",background:modoOscuro?"rgba(217,70,239,0.1)":"rgba(13,148,136,0.1)",color:t.acento,borderRadius:8,padding:"1px 8px",fontSize:11,fontWeight:700}}>{regsVista.length}</span>
          </div>
          <div style={{maxHeight:320,overflowY:"auto",paddingRight:4}}>
          {regsVista.map(r=>(
            <div key={r.id} style={{display:"flex",gap:8,alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${modoOscuro?"rgba(255,255,255,0.04)":"rgba(149,165,185,0.18)"}`,fontSize:13,flexWrap:"wrap"}}>
              <Icon name={r.tipo==="ingreso"?"arrow_up":"arrow_down"} size={13} color={r.tipo==="ingreso"?t.verde:t.rojo}/>
              <span style={{flex:1,color:t.textoSub,minWidth:120}}>{r.categoria}</span>
              <span style={{color:r.medio==="Efectivo"?"#10b981":r.medio==="Nequi"?"#a78bfa":"#ec4899",fontSize:11,fontWeight:600}}>{r.medio}</span>
              <span style={{color:r.tipo==="ingreso"?t.verde:t.rojo,fontWeight:700,fontSize:13}}>{r.tipo==="egreso"?"-":""}{fmt(r.monto)}</span>
              <span style={{color:t.textoMin,fontSize:11}}>{r.hora}</span>
              {esAdmin&&<span style={{color:t.textoMuted,fontSize:11}}>{r.usuario}</span>}
            </div>
          ))}
          </div>
        </div>
        );
      })()}
    </div>
  );
}

// ─── RANKING EMPLEADO (nueva vista para motivación) ───────────────────────────
function VistaRankingEmpleado({registros,usuario,t,modoOscuro}){
  const hoyDate = getLocalDate(); // Colombia UTC-5 corregido
  const diaSemana = hoyDate.getDay()===0?7:hoyDate.getDay();
  const inicioDate = new Date(hoyDate);
  inicioDate.setDate(hoyDate.getDate()-(diaSemana-1));
  const inicioISO = `${inicioDate.getFullYear()}-${String(inicioDate.getMonth()+1).padStart(2,'0')}-${String(inicioDate.getDate()).padStart(2,'0')}`;

  const regsSet = registros.filter(r=>{
    return r.fechaISO >= inicioISO && r.tipo==="ingreso" && r.categoria!=="Conversión de medio";
  });

  // Ranking dinámico: todos los de la base + cualquiera con registros reales
  const nombresEnRegs2 = [...new Set(registros.filter(r=>r.tipo==="ingreso").map(r=>r.usuario))];
  const nombresBase2 = Object.values(USUARIOS_BASE).map(u=>u.nombre);
  const todosNombres2 = [...new Set([...nombresEnRegs2, ...nombresBase2])];
  const rank = todosNombres2.map(e => {
    const uid = Object.entries(USUARIOS_BASE).find(([,v])=>v.nombre===e)?.[0];
    return {
      nombre: e,
      local: USUARIOS_BASE[uid]?.local || "tramites",
      ing: regsSet.filter(r=>r.usuario===e).reduce((a,b)=>a+b.monto,0),
      cnt: regsSet.filter(r=>r.usuario===e).length,
      esYo: e===usuario.nombre,
    };
  }).sort((a,b)=>b.ing-a.ing);

  const ganador = rank[0];
  const maxIng = Math.max(...rank.map(e=>e.ing),1);
  const miPos = rank.findIndex(e=>e.esYo)+1;
  const miosRegs = rank.find(e=>e.esYo);
  const diferenciaConPrimero = ganador && miosRegs && !miosRegs.esYo===false ? ganador.ing - (miosRegs?.ing||0) : 0;

  const medals = ["🥇","🥈","🥉","4°"];

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Mi posición */}
      {miosRegs && (
        <div style={{...card(t),borderRadius:16,padding:"20px",border:`2px solid ${t.borderActivo}`}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
            <span style={{fontSize:32}}>{medals[miPos-1]||`${miPos}°`}</span>
            <div>
              <div style={{fontWeight:800,fontSize:18,color:t.texto}}>Tu posición: #{miPos}</div>
              <div style={{color:t.textoMuted,fontSize:12}}>Esta semana</div>
            </div>
            <div style={{marginLeft:"auto",textAlign:"right"}}>
              <div style={{color:t.textoMuted,fontSize:11}}>Has vendido</div>
              <div style={{color:t.verde,fontWeight:800,fontSize:20}}>{fmt(miosRegs.ing)}</div>
            </div>
          </div>
          {miPos > 1 && diferenciaConPrimero > 0 && (
            <div style={{background:modoOscuro?"rgba(251,191,36,0.08)":"rgba(180,83,9,0.06)",border:`1px solid rgba(251,191,36,0.2)`,borderRadius:10,padding:"10px 14px",fontSize:13}}>
              <span style={{color:t.amarillo,fontWeight:700}}>¡Podés ganar el bono!</span>
              <span style={{color:t.textoSub}}> Te faltan {fmt(diferenciaConPrimero)} para superar a {ganador.nombre}</span>
            </div>
          )}
          {miPos === 1 && ganador.ing>0 && (
            <div style={{background:modoOscuro?"rgba(251,191,36,0.1)":"rgba(180,83,9,0.08)",border:`1px solid rgba(251,191,36,0.3)`,borderRadius:10,padding:"10px 14px",fontSize:13}}>
              <span style={{color:t.amarillo,fontWeight:700}}>🏆 ¡Vas ganando el bono de {fmt(Math.round(ganador.ing*0.035))}!</span>
              <span style={{color:t.textoSub}}> Seguí así y te lo vas a ganar.</span>
            </div>
          )}
        </div>
      )}

      {/* Ranking completo */}
      <div style={{...card(t),borderRadius:16,padding:"20px"}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:16,color:t.textoSub,display:"flex",alignItems:"center",gap:6,textTransform:"uppercase",letterSpacing:.5}}>
          <Icon name="trophy" size={15} color={t.textoSub}/> Ranking semanal
        </div>
        {rank.map((e,i)=>(
          <div key={e.nombre} style={{
            display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
            borderRadius:12,marginBottom:6,
            background:e.esYo?(modoOscuro?"rgba(56,189,248,0.08)":"rgba(2,132,199,0.06)"):(modoOscuro?"rgba(15,23,42,0.4)":"rgba(218,227,240,0.4)"),
            border:`1px solid ${e.esYo?t.borderActivo:t.border}`,
            boxShadow:e.esYo?`0 0 0 2px ${t.acento}33`:t.sombraBtn,
          }}>
            <span style={{width:28,fontSize:18,textAlign:"center"}}>{medals[i]||`${i+1}.`}</span>
            <span style={{width:65,fontWeight:700,color:e.esYo?t.acento:t.textoSub,fontSize:13}}>{e.nombre}{e.esYo?" (tú)":""}</span>
            <span style={{color:t.textoMuted,fontSize:11,width:90}}>{LOCALES[e.local]?.split(" ")[0]}</span>
            <div style={{flex:1,background:modoOscuro?"rgba(15,23,42,0.6)":"rgba(149,165,185,0.25)",borderRadius:4,height:10,overflow:"hidden",boxShadow:t.sombraBtnActivo}}>
              <div style={{height:"100%",borderRadius:4,width:`${(e.ing/maxIng)*100}%`,background:i===0?t.amarillo:e.esYo?t.acento:t.textoMuted,transition:"width .5s"}}/>
            </div>
            <span style={{width:100,textAlign:"right",fontWeight:700,color:i===0?t.amarillo:t.textoSub,fontSize:13}}>{fmt(e.ing)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function VistaDashboard({registros,t,modoOscuro}){
  const [periodo,setPeriodo]=useState("hoy");
  const [desde,setDesde]=useState("");
  const [hasta,setHasta]=useState("");
  const [localSel,setLocalSel]=useState("todos");
  const [colabSel,setColabSel]=useState("todos");
  const hoyISO=fechaISO();
  const hace7=getLocalDate(); hace7.setDate(hace7.getDate()-6);
  const hace30=getLocalDate(); hace30.setDate(hace30.getDate()-29);

  // Usar strings ISO para evitar bugs de zona horaria (new Date("YYYY-MM-DD") es UTC medianoche)
  const hace7ISO  = hace7.toISOString().slice(0,10);
  const hace30ISO = hace30.toISOString().slice(0,10);
  const filtrar=(r)=>{
    if(periodo==="hoy")    return r.fechaISO===hoyISO;
    if(periodo==="semana") return r.fechaISO >= hace7ISO;
    if(periodo==="mes")    return r.fechaISO >= hace30ISO;
    if(periodo==="rango")  return (!desde||r.fechaISO>=desde) && (!hasta||r.fechaISO<=hasta);
    return true;
  };
  const regsPeriodo=registros.filter(filtrar); // solo filtrado por fecha — se usa en el cuadre por local, que siempre debe mostrar ambos locales completos
  const regsAll=regsPeriodo.filter(r=> localSel==="todos"||r.local===localSel).filter(r=> colabSel==="todos"||r.usuario===colabSel);
  const regs=regsAll.filter(r=>r.categoria!=="Conversión de medio");
  const nombresFiltro = [...new Set(Object.values(USUARIOS_BASE).map(u=>u.nombre))];
  const hayFiltrosActivos = periodo!=="hoy" || localSel!=="todos" || colabSel!=="todos";
  const limpiarFiltros = () => { setPeriodo("hoy"); setDesde(""); setHasta(""); setLocalSel("todos"); setColabSel("todos"); };
  const ingTotal=regs.filter(r=>r.tipo==="ingreso").reduce((a,b)=>a+b.monto,0);
  const egrTotal=regs.filter(r=>r.tipo==="egreso").reduce((a,b)=>a+b.monto,0);
  const caja=ingTotal-egrTotal;
  const margen=ingTotal>0?((caja/ingTotal)*100).toFixed(1):"0.0";

  // Cuadre por local/medio (histórico completo incluyendo conversiones)
  const cuadre=(local,medio)=>{
    const base=regsPeriodo.filter(r=>r.local===local&&r.medio===medio);
    const ing=base.filter(r=>r.tipo==="ingreso").reduce((a,b)=>a+b.monto,0);
    const egr=base.filter(r=>r.tipo==="egreso").reduce((a,b)=>a+b.monto,0);
    return {ing,egr,neto:ing-egr};
  };
  const c52Ef=cuadre("internet52","Efectivo"); const c52Nq=cuadre("internet52","Nequi");
  const cTrEf=cuadre("tramites","Efectivo");   const cTrDv=cuadre("tramites","DaviPlata");
  const ing52=regs.filter(r=>r.tipo==="ingreso"&&r.local==="internet52").reduce((a,b)=>a+b.monto,0);
  const egr52=regs.filter(r=>r.tipo==="egreso" &&r.local==="internet52").reduce((a,b)=>a+b.monto,0);
  const ingTr2=regs.filter(r=>r.tipo==="ingreso"&&r.local==="tramites").reduce((a,b)=>a+b.monto,0);
  const egrTr2=regs.filter(r=>r.tipo==="egreso" &&r.local==="tramites").reduce((a,b)=>a+b.monto,0);

  // Ranking dinámico: todos los usuarios que hayan registrado + los de la base
  const nombresConVentas = [...new Set(regs.filter(r=>r.tipo==="ingreso").map(r=>r.usuario))];
  const nombresBase = Object.values(USUARIOS_BASE).map(u=>u.nombre);
  const todosNombres = [...new Set([...nombresConVentas, ...nombresBase])];
  const rankEmp = todosNombres.map(e=>({
    nombre:e,
    ing:regs.filter(r=>r.tipo==="ingreso"&&r.usuario===e).reduce((a,b)=>a+b.monto,0),
    cnt:regs.filter(r=>r.tipo==="ingreso"&&r.usuario===e).length,
  })).sort((a,b)=>b.ing-a.ing);
  const maxIng=Math.max(...rankEmp.map(e=>e.ing),1);
  const topCats=Object.entries(regs.filter(r=>r.tipo==="ingreso").reduce((acc,r)=>{acc[r.categoria]=(acc[r.categoria]||0)+r.monto;return acc;},{})).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const topEgr =Object.entries(regs.filter(r=>r.tipo==="egreso" ).reduce((acc,r)=>{acc[r.categoria]=(acc[r.categoria]||0)+r.monto;return acc;},{})).sort((a,b)=>b[1]-a[1]).slice(0,5);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div style={{...card(t),borderRadius:14,padding:"14px 16px",display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <Icon name="filter" size={14} color={t.textoMuted}/>
          {[["hoy","Hoy"],["semana","7 días"],["mes","30 días"],["rango","Rango"],["todo","Todo"]].map(([k,l])=>(
            <button key={k} className="neo-btn" style={{
              background: periodo===k?(modoOscuro?"rgba(56,189,248,0.12)":"rgba(2,132,199,0.1)"):t.surface,
              border: `1px solid ${periodo===k?t.borderActivo:t.border}`,
              color: periodo===k?t.acento:t.textoMuted,
              padding:"7px 14px",borderRadius:10,cursor:"pointer",fontSize:12,
              fontWeight: periodo===k?700:500,
              boxShadow: periodo===k?t.sombraBtnActivo:t.sombraBtn,
              transition:"all .15s",
            }} onClick={()=>setPeriodo(k)}>{l}</button>
          ))}
          {hayFiltrosActivos && (
            <button className="neo-btn" style={{
              marginLeft:"auto",background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.25)",color:"#f87171",
              padding:"6px 12px",borderRadius:10,cursor:"pointer",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:5,
            }} onClick={limpiarFiltros}><Icon name="x" size={12} color="#f87171"/> Limpiar filtros</button>
          )}
        </div>

        {periodo==="rango" && (
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
            <div><label style={labelStyle(t)}>Desde</label><input type="date" style={inputStyle(t,modoOscuro)} value={desde} onChange={e=>setDesde(e.target.value)}/></div>
            <div><label style={labelStyle(t)}>Hasta</label><input type="date" style={inputStyle(t,modoOscuro)} value={hasta} onChange={e=>setHasta(e.target.value)}/></div>
          </div>
        )}

        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{minWidth:160}}>
            <label style={labelStyle(t)}>Local</label>
            <select style={inputStyle(t,modoOscuro)} value={localSel} onChange={e=>setLocalSel(e.target.value)}>
              <option value="todos">Todos los locales</option>
              <option value="internet52">Internet La 52</option>
              <option value="tramites">Trámites y Servicios</option>
            </select>
          </div>
          <div style={{minWidth:160}}>
            <label style={labelStyle(t)}>Colaborador</label>
            <select style={inputStyle(t,modoOscuro)} value={colabSel} onChange={e=>setColabSel(e.target.value)}>
              <option value="todos">Todos</option>
              {nombresFiltro.map(n=><option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
        {[
          {label:"Ingresos",  val:fmt(ingTotal), color:t.verde,   icon:"trending"},
          {label:"Egresos",   val:fmt(egrTotal), color:t.rojo,    icon:"arrow_down"},
          {label:"Caja Neta", val:fmt(caja),     color:t.amarillo,icon:"cash"},
          {label:"Margen",    val:`${margen}%`,  color:t.acento,  icon:"percent"},
        ].map(k=>(
          <div key={k.label} style={{...card(t),borderRadius:14,padding:"18px",textAlign:"center",boxShadow:t.sombra}}>
            <div style={{display:"flex",justifyContent:"center"}}><Icon name={k.icon} size={22} color={k.color}/></div>
            <div style={{color:k.color,fontSize:19,fontWeight:800,marginTop:8}}>{k.val}</div>
            <div style={{color:t.textoMuted,fontSize:11,marginTop:4,textTransform:"uppercase",letterSpacing:.5}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Cuadre de caja por local */}
      <div style={{...card(t),borderRadius:16,padding:"18px 20px"}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:16,color:t.textoSub,display:"flex",alignItems:"center",gap:6,textTransform:"uppercase",letterSpacing:.5}}>
          <Icon name="box" size={15} color={t.textoSub}/> Cuadre de caja por local
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {[
            {loc:"internet52",color:t.acento,label:"Internet La 52",ef:c52Ef,digital:c52Nq,dLabel:"Nequi",iconColor:"#a78bfa",ing:ing52,egr:egr52},
            {loc:"tramites",  color:t.morado,label:"Trámites y Servicios",ef:cTrEf,digital:cTrDv,dLabel:"DaviPlata",iconColor:"#f0abfc",ing:ingTr2,egr:egrTr2},
          ].map(loc=>(
            <div key={loc.loc} style={{background:modoOscuro?"rgba(15,23,42,0.55)":"rgba(218,227,240,0.5)",borderRadius:14,padding:"16px",display:"flex",flexDirection:"column",gap:10,borderTop:`3px solid ${loc.color}`,boxShadow:t.sombraBtn}}>
              <div style={{fontWeight:700,fontSize:13,color:t.texto,display:"flex",alignItems:"center",gap:6}}>
                <Icon name="store" size={13} color={loc.color}/> {loc.label}
              </div>
              {[
                {label:"Efectivo",color:"#60a5fa",d:loc.ef,nLabel:"En caja"},
                {label:loc.dLabel,color:loc.iconColor,d:loc.digital,nLabel:`En ${loc.dLabel}`},
              ].map(m=>(
                <div key={m.label} style={{background:modoOscuro?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.5)",border:`1px solid ${t.border}`,borderRadius:10,padding:"10px 14px",boxShadow:t.sombraBtn}}>
                  <span style={{background:modoOscuro?"rgba(255,255,255,0.05)":"rgba(149,165,185,0.2)",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,color:m.color,display:"inline-flex",alignItems:"center",gap:4,marginBottom:8}}>
                    <Icon name={m.label==="Efectivo"?"cash":"phone"} size={11} color={m.color}/> {m.label}
                  </span>
                  {[{l:"Ingresó",v:m.d.ing,c:t.verde},{l:"Salió",v:m.d.egr,c:t.rojo,neg:true},{l:m.nLabel,v:m.d.neto,c:m.d.neto>=0?t.amarillo:t.rojo,bold:true,big:true}].map(row=>(
                    <div key={row.l} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:row.big?14:12}}>
                      <span style={{color:t.textoSub}}>{row.l}</span>
                      <span style={{color:row.c,fontWeight:row.bold?700:400}}>{row.neg?"-":""}{fmt(row.v)}</span>
                    </div>
                  ))}
                </div>
              ))}
              <div style={{background:modoOscuro?"rgba(255,255,255,0.04)":"rgba(149,165,185,0.2)",borderRadius:10,padding:"8px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,color:t.textoMuted}}>
                <span>Neto {loc.label.split(" ")[0]}</span>
                <span style={{color:loc.color,fontWeight:800,fontSize:14}}>{fmt(loc.ing-loc.egr)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ranking ventas */}
      <div style={{...card(t),borderRadius:16,padding:"18px 20px"}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:16,color:t.textoSub,display:"flex",alignItems:"center",gap:6,textTransform:"uppercase",letterSpacing:.5}}>
          <Icon name="award" size={15} color={t.textoSub}/> Ranking de ventas
        </div>
        {rankEmp.map((e,i)=>(
          <div key={e.nombre} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${modoOscuro?"rgba(255,255,255,0.04)":"rgba(149,165,185,0.2)"}`}}>
            <span style={{width:28,fontSize:16,textAlign:"center"}}>{["🥇","🥈","🥉"][i]||`${i+1}.`}</span>
            <span style={{width:68,fontWeight:600,color:t.textoSub}}>{e.nombre}</span>
            <div style={{flex:1,background:modoOscuro?"rgba(15,23,42,0.6)":"rgba(149,165,185,0.25)",borderRadius:4,height:10,overflow:"hidden",boxShadow:t.sombraBtnActivo}}>
              <div style={{height:"100%",borderRadius:4,width:`${(e.ing/maxIng)*100}%`,background:i===0?t.amarillo:t.acento,transition:"width .5s"}}/>
            </div>
            <span style={{width:105,textAlign:"right",fontWeight:700,color:t.amarillo,fontSize:13}}>{fmt(e.ing)}</span>
            <span style={{width:52,textAlign:"right",color:t.textoMuted,fontSize:11}}>{e.cnt} reg.</span>
          </div>
        ))}
      </div>

      {/* Top cats/gastos */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {[
          {titulo:"Top servicios",regs:topCats,color:t.verde,icon:"trending"},
          {titulo:"Top gastos",   regs:topEgr, color:t.rojo, icon:"arrow_down"},
        ].map(sec=>(
          <div key={sec.titulo} style={{...card(t),borderRadius:16,padding:"18px 20px"}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:14,color:t.textoSub,display:"flex",alignItems:"center",gap:6,textTransform:"uppercase",letterSpacing:.5}}>
              <Icon name={sec.icon} size={15} color={t.textoSub}/> {sec.titulo}
            </div>
            {sec.regs.length===0&&<div style={{color:t.textoMin,textAlign:"center",padding:24,fontSize:13}}>Sin datos</div>}
            {sec.regs.map(([cat,val])=>(
              <div key={cat} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${modoOscuro?"rgba(255,255,255,0.04)":"rgba(149,165,185,0.2)"}`}}>
                <span style={{color:t.textoSub,fontSize:13}}>{cat}</span>
                <span style={{color:sec.color,fontWeight:600,fontSize:13}}>{fmt(val)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      {regs.length===0&&<div style={{color:t.textoMin,textAlign:"center",padding:24,fontSize:13}}>No hay registros para este período.</div>}
    </div>
  );
}

// ─── HISTORIAL (rediseñado: filas compactas, filtros avanzados) ───────────────
function VistaHistorial({registros,onEditar,onEliminar,etiquetas,t,modoOscuro}){
  const [filtLocal, setFiltLocal]   = useState("todos");
  const [filtTipo,  setFiltTipo]    = useState("todos");
  const [filtMedio, setFiltMedio]   = useState("todos");
  const [filtUser,  setFiltUser]    = useState("todos");
  const [filtFecha, setFiltFecha]   = useState("");
  const [filtMes,   setFiltMes]     = useState("");
  const [filtAnio,  setFiltAnio]    = useState("");
  const [periodoFilt,setPeriodoFilt]= useState("dia"); // dia|mes|anio|todo
  const [editando,  setEditando]    = useState(null);
  const [motivo,    setMotivo]      = useState("");
  const [campos,    setCampos]      = useState({});

  const aniosDisp = [...new Set(registros.map(r=>r.fechaISO?.slice(0,4)))].filter(Boolean).sort().reverse();
  const mesesDisp = filtAnio ? [...new Set(registros.filter(r=>r.fechaISO?.startsWith(filtAnio)).map(r=>r.fechaISO?.slice(0,7)))].filter(Boolean).sort().reverse() : [];

  const regs = registros.filter(r=>{
    if(filtLocal!=="todos"&&r.local!==filtLocal) return false;
    if(filtTipo!=="todos"&&r.tipo!==filtTipo) return false;
    if(filtMedio!=="todos"&&r.medio!==filtMedio) return false;
    if(filtUser!=="todos"&&r.usuario!==filtUser) return false;
    if(periodoFilt==="dia"  && filtFecha && r.fechaISO!==filtFecha) return false;
    if(periodoFilt==="mes"  && filtMes   && !r.fechaISO?.startsWith(filtMes)) return false;
    if(periodoFilt==="anio" && filtAnio  && !r.fechaISO?.startsWith(filtAnio)) return false;
    return true;
  });

  const ingF = regs.filter(r=>r.tipo==="ingreso").reduce((a,b)=>a+b.monto,0);
  const egrF = regs.filter(r=>r.tipo==="egreso").reduce((a,b)=>a+b.monto,0);

  const [camposOriginales, setCamposOriginales] = useState({});
  const iniciar=(r)=>{ 
    const orig = {monto:r.monto,categoria:r.categoria,nota:r.nota||"",autoriza:r.autoriza||""};
    setEditando(r.id); 
    setCamposOriginales(orig);
    setCampos({...orig}); 
    setMotivo(""); 
  };
  const guardar=()=>{ 
    if(!motivo.trim()){alert("Escribe el motivo de la edición");return;} 
    onEditar(editando,campos,motivo,camposOriginales); 
    setEditando(null); 
  };

  const sel = { background:t.surfaceSolid, border:`1px solid ${t.border}`, color:t.texto, padding:"7px 10px", borderRadius:8, fontSize:12, boxShadow:t.sombraBtn, cursor:"pointer" };

  const usuariosDisp = [...new Set(registros.map(r=>r.usuario))].filter(Boolean).sort();

  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {/* Filtros avanzados */}
      <div style={{...card(t),borderRadius:14,padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
        {/* Fila 1: periodo */}
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <Icon name="calendar" size={13} color={t.textoMuted}/>
          {[["dia","Por día"],["mes","Por mes"],["anio","Por año"],["todo","Todo"]].map(([k,l])=>(
            <button key={k} className="neo-btn" style={{
              background:periodoFilt===k?(modoOscuro?"rgba(56,189,248,0.12)":"rgba(2,132,199,0.1)"):t.surface,
              border:`1px solid ${periodoFilt===k?t.borderActivo:t.border}`,
              color:periodoFilt===k?t.acento:t.textoMuted,
              padding:"5px 12px",borderRadius:8,cursor:"pointer",fontSize:12,
              fontWeight:periodoFilt===k?700:500,
              boxShadow:periodoFilt===k?t.sombraBtnActivo:t.sombraBtn,
            }} onClick={()=>setPeriodoFilt(k)}>{l}</button>
          ))}
        </div>
        {/* Fila 2: fecha según periodo */}
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <Icon name="filter" size={13} color={t.textoMuted}/>
          {periodoFilt==="dia" && <>
            <input style={{...sel,width:160}} type="date" value={filtFecha} onChange={e=>setFiltFecha(e.target.value)}/>
            {filtFecha&&<button className="neo-btn" style={{...sel,color:t.rojo}} onClick={()=>setFiltFecha("")}>✕</button>}
          </>}
          {periodoFilt==="mes" && <>
            <select style={{...sel,width:80}} value={filtAnio} onChange={e=>{setFiltAnio(e.target.value);setFiltMes("");}}>
              <option value="">Año</option>
              {aniosDisp.map(a=><option key={a} value={a}>{a}</option>)}
            </select>
            {filtAnio && <select style={{...sel,width:130}} value={filtMes} onChange={e=>setFiltMes(e.target.value)}>
              <option value="">Mes</option>
              {mesesDisp.map(m=><option key={m} value={m}>{m}</option>)}
            </select>}
          </>}
          {periodoFilt==="anio" && <>
            <select style={{...sel,width:90}} value={filtAnio} onChange={e=>setFiltAnio(e.target.value)}>
              <option value="">Año</option>
              {aniosDisp.map(a=><option key={a} value={a}>{a}</option>)}
            </select>
          </>}
          <select style={sel} value={filtTipo} onChange={e=>setFiltTipo(e.target.value)}>
            <option value="todos">Ing + Egr</option>
            <option value="ingreso">Ingresos</option>
            <option value="egreso">Egresos</option>
          </select>
          <select style={sel} value={filtMedio} onChange={e=>setFiltMedio(e.target.value)}>
            <option value="todos">Todos medios</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Nequi">Nequi</option>
            <option value="DaviPlata">DaviPlata</option>
          </select>
          <select style={sel} value={filtLocal} onChange={e=>setFiltLocal(e.target.value)}>
            <option value="todos">Todos los locales</option>
            <option value="internet52">Internet La 52</option>
            <option value="tramites">Trámites y Servicios</option>
          </select>
          <select style={sel} value={filtUser} onChange={e=>setFiltUser(e.target.value)}>
            <option value="todos">Todos</option>
            {usuariosDisp.map(u=><option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* Resumen */}
      <div style={{display:"flex",gap:12,...card(t),padding:"10px 16px",borderRadius:10,fontSize:12,flexWrap:"wrap",boxShadow:t.sombraBtn,alignItems:"center"}}>
        <span style={{color:t.textoMuted}}>{regs.length} registros</span>
        <span style={{color:t.verde}}>↑ {fmt(ingF)}</span>
        <span style={{color:t.rojo}}>↓ {fmt(egrF)}</span>
        <span style={{color:t.amarillo,fontWeight:700}}>Neto: {fmt(ingF-egrF)}</span>
      </div>

      {/* Lista COMPACTA */}
      {regs.length===0&&<div style={{color:t.textoMin,textAlign:"center",padding:24,fontSize:13}}>Sin registros con estos filtros.</div>}
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        {regs.map(r=>(
          <div key={r.id} style={{
            ...card(t),borderRadius:10,
            borderLeft:`3px solid ${r.tipo==="ingreso"?t.verde:t.rojo}`,
            boxShadow:t.sombraBtn,
            overflow:"hidden",
          }}>
            {editando===r.id?(
              <div style={{padding:"14px 16px"}}>
                <div style={{fontWeight:700,marginBottom:12,fontSize:13,color:t.amarillo,display:"flex",alignItems:"center",gap:6}}>
                  <Icon name="edit" size={14} color={t.amarillo}/> Editando registro — cambios con trazabilidad
                </div>
                {/* Comparación antes/después */}
                <div style={{background:modoOscuro?"rgba(245,158,11,0.06)":"rgba(180,83,9,0.05)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:12}}>
                  <div style={{color:t.textoMuted,fontWeight:700,marginBottom:6,fontSize:11,textTransform:"uppercase",letterSpacing:.5}}>Valores actuales (antes de editar)</div>
                  <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                    <span style={{color:t.textoSub}}>Monto: <strong style={{color:t.amarillo}}>{fmt(camposOriginales.monto)}</strong></span>
                    <span style={{color:t.textoSub}}>Categoría: <strong style={{color:t.amarillo}}>{camposOriginales.categoria}</strong></span>
                    {camposOriginales.nota&&<span style={{color:t.textoSub}}>Nota: <strong style={{color:t.amarillo}}>{camposOriginales.nota}</strong></span>}
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div>
                    <label style={labelStyle(t)}>Nuevo monto {campos.monto!==camposOriginales.monto&&<span style={{color:t.acento,fontSize:10}}>✱ cambiado</span>}</label>
                    <input style={inputStyle(t,modoOscuro)} type="number" value={campos.monto} onChange={e=>setCampos({...campos,monto:parseFloat(e.target.value)||0})}/>
                  </div>
                  <div>
                    <label style={labelStyle(t)}>Nueva categoría {campos.categoria!==camposOriginales.categoria&&<span style={{color:t.acento,fontSize:10}}>✱ cambiado</span>}</label>
                    <select style={inputStyle(t,modoOscuro)} value={campos.categoria} onChange={e=>setCampos({...campos,categoria:e.target.value})}>
                      {(r.tipo==="ingreso"?etiquetas.ingreso:etiquetas.egreso).map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={labelStyle(t)}>Nueva nota {campos.nota!==camposOriginales.nota&&<span style={{color:t.acento,fontSize:10}}>✱ cambiado</span>}</label>
                    <input style={inputStyle(t,modoOscuro)} value={campos.nota} onChange={e=>setCampos({...campos,nota:e.target.value})} placeholder="Observaciones..."/>
                  </div>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={{...labelStyle(t),color:t.amarillo}}>⚠ Motivo de la edición (obligatorio para guardar)</label>
                    <input style={{...inputStyle(t,modoOscuro),borderColor:"rgba(245,158,11,0.5)"}} value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Ej: El cliente pagó de más, monto correcto es..."/>
                  </div>
                </div>
                <div style={{display:"flex",gap:8,marginTop:10,alignItems:"center"}}>
                  <button className="neo-btn" style={{...btnPrimary(t),width:"auto",padding:"8px 20px"}} onClick={()=>{playSound("click");guardar();}}>Guardar cambios</button>
                  <button className="neo-btn" style={btnSecundario(t,modoOscuro)} onClick={()=>setEditando(null)}>Cancelar</button>
                  {motivo.trim()===''&&<span style={{color:t.rojo,fontSize:11}}>Escribe el motivo antes de guardar</span>}
                </div>
              </div>
            ):(
              // Fila compacta
              <div style={{padding:"8px 12px",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <Icon name={r.tipo==="ingreso"?"arrow_up":"arrow_down"} size={12} color={r.tipo==="ingreso"?t.verde:t.rojo}/>
                <span style={{color:r.tipo==="ingreso"?t.verde:t.rojo,fontWeight:700,fontSize:13,minWidth:80}}>{r.tipo==="egreso"?"-":""}{fmt(r.monto)}</span>
                <span style={{color:t.textoSub,fontSize:12,flex:1,minWidth:100}}>{r.categoria}</span>
                <span style={{color:r.medio==="Efectivo"?"#10b981":r.medio==="Nequi"?"#a78bfa":"#ec4899",fontSize:11,fontWeight:600,minWidth:65}}>{r.medio}</span>
                <span style={{color:t.acento,fontSize:11,minWidth:80}}>{LOCALES[r.local]?.split(" ")[0]}</span>
                <span style={{color:t.textoMuted,fontSize:11,minWidth:50}}>{r.usuario}</span>
                <span style={{color:t.textoMin,fontSize:11,minWidth:90}}>{r.fecha} {r.hora}</span>
                {r.editado && (
                  <span title={`Motivo: ${r.motivoEdicion}`}
                    style={{color:t.amarillo,fontSize:10,fontStyle:"italic",cursor:"help",
                      background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",
                      borderRadius:4,padding:"1px 6px"}}>
                    ✎ editado
                  </span>
                )}
                <div style={{display:"flex",gap:4,marginLeft:"auto"}}>
                  <button className="neo-btn" style={{background:modoOscuro?"rgba(255,255,255,0.04)":"rgba(218,227,240,0.7)",border:`1px solid ${t.border}`,color:t.textoMuted,padding:"4px 7px",borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",boxShadow:t.sombraBtn}} onClick={()=>{playSound("click");iniciar(r);}}>
                    <Icon name="edit" size={11}/>
                  </button>
                  <button className="neo-btn" style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",color:"#f87171",padding:"4px 7px",borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",boxShadow:t.sombraBtn}} onClick={()=>{ playSound("cancel"); if(window.confirm("¿Eliminar este registro?")) onEliminar(r.id); }}>
                    <Icon name="trash" size={11}/>
                  </button>
                </div>
              </div>
            )}
            {/* Fila de detalle de edición */}
            {r.editado && editando!==r.id && (
              <div style={{padding:"6px 12px 8px",borderTop:`1px dashed rgba(245,158,11,0.2)`,
                background:"rgba(245,158,11,0.04)",fontSize:11,display:"flex",flexWrap:"wrap",gap:10}}>
                <span style={{color:t.textoMuted}}>✎ <strong style={{color:t.amarillo}}>{r.editadoPor}</strong> · {r.fechaEdicion}</span>
                <span style={{color:t.textoMuted}}>Motivo: <strong style={{color:t.textoSub}}>{r.motivoEdicion}</strong></span>
                {r.montoOriginal!==undefined&&r.montoOriginal!==r.monto&&(
                  <span style={{color:t.textoMuted}}>Monto: <span style={{color:t.rojo,textDecoration:"line-through"}}>{fmt(r.montoOriginal)}</span> → <span style={{color:t.verde}}>{fmt(r.monto)}</span></span>
                )}
                {r.categoriaOriginal&&r.categoriaOriginal!==r.categoria&&(
                  <span style={{color:t.textoMuted}}>Cat: <span style={{color:t.rojo,textDecoration:"line-through"}}>{r.categoriaOriginal}</span> → <span style={{color:t.verde}}>{r.categoria}</span></span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── COMPROMISOS ──────────────────────────────────────────────────────────────
function VistaCompromisos({compromisos,onGuardar,t,modoOscuro}){
  const [form,setForm]=useState({nombre:"",local:"internet52",medio:"Efectivo",dia:1,valor:"",nota:""});
  const [editId,setEditId]=useState(null);

  const hoyNum=getLocalDate().getDate();
  const mesActual=fechaISO().slice(0,7); // "YYYY-MM" — para saber si el pago marcado es del mes en curso
  const diasRestantes=(dia)=>{ const d=dia-hoyNum; return d<0 ? d+30 : d; };
  const guardar=()=>{
    if(!form.nombre||!form.valor) return;
    if(editId!==null){
      onGuardar(compromisos.map(c=>c.id===editId?{...form,id:editId,valor:parseFloat(form.valor)}:c));
      setEditId(null);
    } else {
      onGuardar([...compromisos,{...form,id:Date.now(),valor:parseFloat(form.valor),pagado:false,pagadoMes:null}]);
    }
    setForm({nombre:"",local:"internet52",medio:"Efectivo",dia:1,valor:"",nota:""});
  };
  const eliminar=(id)=>onGuardar(compromisos.filter(c=>c.id!==id));
  const editar=(c)=>{ setForm({...c,valor:String(c.valor)}); setEditId(c.id); };
  // Marcar/desmarcar como pagado — queda ligado al mes en curso, así el próximo mes vuelve a aparecer pendiente automáticamente
  const marcarPagado=(c)=>{
    const estaPagadoAhora = c.pagado && c.pagadoMes===mesActual;
    playSound(estaPagadoAhora?"click":"success");
    onGuardar(compromisos.map(x=>x.id===c.id?{...x,pagado:!estaPagadoAhora,pagadoMes:!estaPagadoAhora?mesActual:null}:x));
  };
  const totalMensual=compromisos.reduce((a,b)=>a+b.valor,0);
  const todosOrdenados=[...compromisos].map(c=>({...c,dias:diasRestantes(c.dia),pagadoEsteMes:c.pagado&&c.pagadoMes===mesActual})).sort((a,b)=>a.dias-b.dias);

  const colorUrg=(dias,pagadoEsteMes)=>{
    if(pagadoEsteMes) return {bg:"rgba(52,211,153,0.10)",borde:"#34d39988",texto:"#6ee7b7",badge:"#34d399"};
    if(dias===0) return {bg:"rgba(239,68,68,0.15)",borde:"#ef4444",texto:"#fca5a5",badge:"#ef4444"};
    if(dias<=2)  return {bg:"rgba(239,68,68,0.08)",borde:"#ef444488",texto:"#fca5a5",badge:"#ef4444"};
    if(dias<=5)  return {bg:"rgba(245,158,11,0.08)",borde:"#f59e0b88",texto:"#fcd34d",badge:"#f59e0b"};
    if(dias<=10) return {bg:"rgba(56,189,248,0.07)",borde:"#38bdf888",texto:"#93c5fd",badge:"#38bdf8"};
    return       {bg:modoOscuro?"rgba(30,41,59,0.4)":"rgba(218,227,240,0.5)",borde:t.border,texto:t.textoMuted,badge:t.textoMuted};
  };

  const por52    = todosOrdenados.filter(c=>c.local==="internet52");
  const porTram  = todosOrdenados.filter(c=>c.local==="tramites");
  const total52  = compromisos.filter(c=>c.local==="internet52").reduce((a,b)=>a+b.valor,0);
  const totalTram= compromisos.filter(c=>c.local==="tramites").reduce((a,b)=>a+b.valor,0);

  const SeccionLocal = ({titulo,color,icon,lista,totalLocal}) => (
    <div style={{...card(t),borderRadius:16,padding:"18px 20px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{fontWeight:700,fontSize:13,color:t.textoSub,display:"flex",alignItems:"center",gap:6,textTransform:"uppercase",letterSpacing:.5}}>
          <Icon name={icon} size={15} color={color}/> {titulo}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{color:t.textoMuted,fontSize:11}}>{lista.length} compromisos</span>
          <span style={{color:t.rojo,fontWeight:800,fontSize:14,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,padding:"2px 10px"}}>{fmt(totalLocal)}/mes</span>
        </div>
      </div>
      {lista.length===0&&<div style={{color:t.textoMin,textAlign:"center",padding:"14px 0",fontSize:13}}>Sin compromisos registrados</div>}
      {lista.map(c=>{
        const urg=colorUrg(c.dias,c.pagadoEsteMes);
        return(
          <div key={c.id} style={{borderRadius:10,padding:"10px 14px",background:urg.bg,border:`1px solid ${urg.borde}`,marginBottom:8,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",opacity:c.pagadoEsteMes?0.85:1}}>
            <div style={{background:urg.badge+"22",border:`1px solid ${urg.badge}44`,borderRadius:6,padding:"3px 8px",fontWeight:700,fontSize:11,color:urg.badge,flexShrink:0,minWidth:42,textAlign:"center"}}>
              {c.pagadoEsteMes?"Pagado":c.dias===0?"Hoy":c.dias===1?"Mañana":`${c.dias}d`}
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13,color:t.texto,textDecoration:c.pagadoEsteMes?"line-through":"none"}}>{c.nombre}</div>
              <div style={{color:t.textoMuted,fontSize:11}}>{c.medio} · día {c.dia}{c.nota?` · ${c.nota}`:""}</div>
            </div>
            <div style={{color:c.pagadoEsteMes?t.verde:t.rojo,fontWeight:800,fontSize:14}}>{fmt(c.valor)}</div>
            <div style={{display:"flex",gap:5}}>
              <button className="neo-btn" title={c.pagadoEsteMes?"Marcar como pendiente":"Marcar como pagado este mes"} style={{
                background:c.pagadoEsteMes?"rgba(52,211,153,0.18)":(modoOscuro?"rgba(255,255,255,0.05)":"rgba(149,165,185,0.15)"),
                border:`1.5px solid ${c.pagadoEsteMes?"#34d399":t.border}`,color:c.pagadoEsteMes?"#34d399":t.textoMuted,
                padding:"4px 9px",borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",fontWeight:700,
              }} onClick={()=>marcarPagado(c)}><Icon name="check" size={13} color={c.pagadoEsteMes?"#34d399":t.textoMuted}/></button>
              <button className="neo-btn" style={{...btnSecundario(t,modoOscuro),padding:"4px 8px"}} onClick={()=>editar(c)}><Icon name="edit" size={11}/></button>
              <button className="neo-btn" style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",color:"#f87171",padding:"4px 8px",borderRadius:6,cursor:"pointer"}} onClick={()=>eliminar(c.id)}><Icon name="trash" size={11}/></button>
            </div>
          </div>
        );
      })}
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Resumen global */}
      {compromisos.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
          {[
            {l:"Total mensual",v:fmt(totalMensual),c:t.rojo,i:"cash"},
            {l:"La 52",v:fmt(total52),c:t.acento,i:"store"},
            {l:"Trámites",v:fmt(totalTram),c:t.morado,i:"store"},
            {l:"Vencen hoy/mañana",v:todosOrdenados.filter(c=>c.dias<=1).length,c:t.amarillo,i:"bell"},
          ].map(k=>(
            <div key={k.l} style={{...card(t),borderRadius:12,padding:"12px",textAlign:"center",boxShadow:t.sombra}}>
              <Icon name={k.i} size={18} color={k.c}/>
              <div style={{color:k.c,fontSize:16,fontWeight:800,marginTop:5}}>{k.v}</div>
              <div style={{color:t.textoMuted,fontSize:10,marginTop:2}}>{k.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Sección por local */}
      <SeccionLocal titulo="Internet La 52" color={t.acento} icon="store" lista={por52} totalLocal={total52}/>
      <SeccionLocal titulo="Trámites y Servicios" color={t.morado} icon="store" lista={porTram} totalLocal={totalTram}/>

      <div style={{...card(t),borderRadius:16,padding:"18px 20px"}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:14,color:t.textoSub,display:"flex",alignItems:"center",gap:6,textTransform:"uppercase",letterSpacing:.5}}>
          <Icon name="plus" size={14} color={t.acento}/> {editId!==null?"Editar compromiso":"Nuevo compromiso"}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><label style={labelStyle(t)}>Nombre</label><input style={inputStyle(t,modoOscuro)} value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} placeholder="Ej: Internet, Arriendo..."/></div>
          <div><label style={labelStyle(t)}>Local</label>
            <select style={inputStyle(t,modoOscuro)} value={form.local} onChange={e=>setForm({...form,local:e.target.value,medio:"Efectivo"})}>
              <option value="internet52">Internet La 52</option>
              <option value="tramites">Trámites y Servicios</option>
            </select>
          </div>
          <div><label style={labelStyle(t)}>Medio</label>
            <select style={inputStyle(t,modoOscuro)} value={form.medio} onChange={e=>setForm({...form,medio:e.target.value})}>
              {MEDIOS_LOCAL[form.local].map(m=><option key={m}>{m}</option>)}
            </select>
          </div>
          <div><label style={labelStyle(t)}>Día del mes que vence</label><input style={inputStyle(t,modoOscuro)} type="number" min="1" max="31" value={form.dia} onChange={e=>setForm({...form,dia:parseInt(e.target.value)||1})}/></div>
          <div><label style={labelStyle(t)}>Valor aproximado</label><input style={inputStyle(t,modoOscuro)} type="number" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} placeholder="0"/></div>
          <div><label style={labelStyle(t)}>Nota (opcional)</label><input style={inputStyle(t,modoOscuro)} value={form.nota} onChange={e=>setForm({...form,nota:e.target.value})} placeholder="Ej: Con recibo..."/></div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:14}}>
          <button className="neo-btn" style={{...btnPrimary(t),width:"auto",padding:"10px 24px"}} onClick={()=>{playSound("success");guardar();}}>
            <Icon name="check" size={15}/> {editId!==null?"Actualizar":"Agregar"}
          </button>
          {editId!==null&&<button className="neo-btn" style={btnSecundario(t,modoOscuro)} onClick={()=>{setEditId(null);setForm({nombre:"",local:"internet52",medio:"Efectivo",dia:1,valor:"",nota:""});}}>Cancelar</button>}
        </div>
      </div>
    </div>
  );
}

// ─── FINANZAS PERSONALES DE IVÁN (separadas del negocio) ──────────────────────
// Modelo distinto al del negocio: acá no solo hay "ventas" y "gastos", sino
// también "ahorro" (plata que se guarda/invierte, no se gasta), y el ahorro se
// lleva por CUENTA y por TITULAR (Iván o Laura), porque el dinero de ambos se
// guarda en efectivo y en cuentas separadas. Solo Iván ve esta pantalla.
const CATS_FIN_ING    = ["Utilidad del negocio","Sueldo / trabajo independiente","Arriendo que recibo","Ventas personales","Regalo o ayuda","Otro ingreso"];
const CATS_FIN_GASTO  = ["Vivienda / Arriendo","Comida","Servicios (luz, agua, gas, internet)","Transporte","Salud","Mathías (hijo)","Ropa","Ocio / Diversión","Deudas / Pagos","Otro gasto"];
const esGasto = (f) => f.tipo==="gasto" || f.tipo==="egreso"; // "egreso" queda como alias por compatibilidad

function VistaFinanzasIvan({finanzas, onAgregar, onEliminar, t, modoOscuro}){
  const [tipo,setTipo]          = useState("ingreso");
  const [categoria,setCategoria]= useState(CATS_FIN_ING[0]);
  const [titular,setTitular]    = useState("Iván");
  const [cuenta,setCuenta]      = useState("");
  const [monto,setMonto]        = useState("");
  const [nota,setNota]          = useState("");
  const [periodo,setPeriodo]    = useState("mes");
  const [simMonto,setSimMonto]  = useState("");

  const hoyISO = fechaISO();
  const hace7  = getLocalDate(); hace7.setDate(hace7.getDate()-6);
  const hace30 = getLocalDate(); hace30.setDate(hace30.getDate()-29);
  const hace7ISO  = hace7.toISOString().slice(0,10);
  const hace30ISO = hace30.toISOString().slice(0,10);

  const filtrar = (f) => {
    if(periodo==="hoy")    return f.fechaISO===hoyISO;
    if(periodo==="semana") return f.fechaISO>=hace7ISO;
    if(periodo==="mes")    return f.fechaISO>=hace30ISO;
    return true;
  };
  const vistas = finanzas.filter(filtrar);
  const movsAhorro = finanzas.filter(f=>f.tipo==="ahorro"); // histórico completo, no depende del período

  // Saldo por cuenta y por titular (histórico completo — es lo que hay HOY en cada cuenta)
  const cuentasPorTitular = {};
  movsAhorro.forEach(f=>{
    const tit = f.titular || "Sin asignar";
    const cta = f.categoria || "Sin nombre";
    cuentasPorTitular[tit] = cuentasPorTitular[tit] || {};
    cuentasPorTitular[tit][cta] = (cuentasPorTitular[tit][cta]||0) + f.monto;
  });
  const guardadoTotal = movsAhorro.reduce((a,b)=>a+b.monto,0);
  const nombresCuentasPrevias = [...new Set(movsAhorro.filter(f=>f.titular===titular).map(f=>f.categoria))];

  const ingPeriodo    = vistas.filter(f=>f.tipo==="ingreso").reduce((a,b)=>a+b.monto,0);
  const gastoPeriodo  = vistas.filter(esGasto).reduce((a,b)=>a+b.monto,0);
  const ahorroPeriodo = vistas.filter(f=>f.tipo==="ahorro").reduce((a,b)=>a+b.monto,0);
  const libre         = ingPeriodo - gastoPeriodo - ahorroPeriodo; // lo que no se ha comprometido en nada

  const topGastos = Object.entries(vistas.filter(esGasto).reduce((acc,f)=>{acc[f.categoria]=(acc[f.categoria]||0)+f.monto;return acc;},{})).sort((a,b)=>b[1]-a[1]);

  const cambiarTipo = (t2) => { setTipo(t2); setCategoria(t2==="ingreso"?CATS_FIN_ING[0]:CATS_FIN_GASTO[0]); setCuenta(""); };

  const agregar = () => {
    const n = parseFloat(String(monto).replace(/[^0-9.\-]/g,""));
    if(!n || (tipo!=="ahorro" && n<=0)) return;
    if(tipo==="ahorro" && !cuenta.trim()) return;
    playSound(tipo==="ingreso"?"ingreso_ok":tipo==="ahorro"?"success":"egreso_ok");
    if(tipo==="ahorro"){
      onAgregar({tipo, categoria:cuenta.trim(), titular, monto:n, nota:nota||""});
      setCuenta("");
    } else {
      onAgregar({tipo, categoria, monto:n, nota:nota||""});
    }
    setMonto(""); setNota("");
  };

  const simN = parseFloat(String(simMonto).replace(/[^0-9.]/g,""))||0;
  const simAlcanza = simN>0 && simN<=libre;

  const periodoLabel = {hoy:"hoy",semana:"últimos 7 días",mes:"últimos 30 días",todo:"siempre"}[periodo];

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16,maxWidth:760,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{background:modoOscuro?"rgba(217,70,239,0.1)":"rgba(13,148,136,0.1)",border:`1px solid ${t.borderActivo}`,borderRadius:12,padding:12,display:"flex",boxShadow:t.sombraBtn}}>
          <Icon name="wallet" size={24} color={t.acento}/>
        </div>
        <div>
          <div style={{fontWeight:800,fontSize:17,color:t.texto}}>Mis Finanzas Personales</div>
          <div style={{color:t.textoMuted,fontSize:12}}>Privado — solo tú ves esto, ni Laura ni nadie más</div>
        </div>
      </div>

      {/* Hero: lo guardado */}
      <div style={{...card(t),borderRadius:16,padding:"22px",textAlign:"center",boxShadow:t.sombra,background:modoOscuro?"linear-gradient(145deg, rgba(167,139,250,0.08), rgba(28,18,44,0.6))":"linear-gradient(145deg, rgba(167,139,250,0.08), rgba(255,255,255,0.5))"}}>
        <div style={{color:t.textoMuted,fontSize:11,textTransform:"uppercase",letterSpacing:.5}}>Lo que hay guardado entre todas las cuentas</div>
        <div style={{color:t.morado,fontWeight:800,fontSize:30,marginTop:6}}>{fmt(guardadoTotal)}</div>
      </div>

      {/* Desglose por titular y cuenta */}
      {Object.keys(cuentasPorTitular).length>0 && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
          {Object.entries(cuentasPorTitular).map(([tit,cuentasObj])=>{
            const subtotal = Object.values(cuentasObj).reduce((a,b)=>a+b,0);
            return(
              <div key={tit} style={{...card(t),borderRadius:14,padding:"14px 16px",borderTop:`3px solid ${tit==="Iván"?t.acento:t.morado}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontWeight:700,fontSize:13,color:t.texto}}>{tit}</span>
                  <span style={{fontWeight:800,fontSize:14,color:tit==="Iván"?t.acento:t.morado}}>{fmt(subtotal)}</span>
                </div>
                {Object.entries(cuentasObj).map(([cta,val])=>(
                  <div key={cta} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${modoOscuro?"rgba(255,255,255,0.04)":"rgba(149,165,185,0.18)"}`,fontSize:12}}>
                    <span style={{color:t.textoSub}}>{cta}</span>
                    <span style={{color:t.textoMuted,fontWeight:600}}>{fmt(val)}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {[["hoy","Hoy"],["semana","7 días"],["mes","30 días"],["todo","Todo"]].map(([k,l])=>(
          <button key={k} className="neo-btn" style={{
            background: periodo===k?(modoOscuro?"rgba(56,189,248,0.12)":"rgba(2,132,199,0.1)"):t.surface,
            border: `1px solid ${periodo===k?t.borderActivo:t.border}`,
            color: periodo===k?t.acento:t.textoMuted,
            padding:"7px 14px",borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:periodo===k?700:500,
            boxShadow: periodo===k?t.sombraBtnActivo:t.sombraBtn,
          }} onClick={()=>setPeriodo(k)}>{l}</button>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12}}>
        {[
          {label:"Te entró",  val:fmt(ingPeriodo),    color:t.verde},
          {label:"Gastaste",  val:fmt(gastoPeriodo),  color:t.rojo},
          {label:"Guardaste", val:fmt(ahorroPeriodo), color:t.morado},
          {label:"Te queda libre", val:fmt(libre),     color:libre>=0?t.amarillo:t.rojo},
        ].map(k=>(
          <div key={k.label} style={{...card(t),borderRadius:14,padding:"16px",textAlign:"center"}}>
            <div style={{color:k.color,fontSize:17,fontWeight:800}}>{k.val}</div>
            <div style={{color:t.textoMuted,fontSize:11,marginTop:4,textTransform:"uppercase",letterSpacing:.5}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Cuánto puede invertir */}
      <div style={{...card(t),borderRadius:16,padding:"18px 20px",borderLeft:`3px solid ${libre>0?t.verde:t.rojo}`}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:t.textoSub,display:"flex",alignItems:"center",gap:6,textTransform:"uppercase",letterSpacing:.5}}>
          <Icon name="trending" size={15} color={libre>0?t.verde:t.rojo}/> ¿Cuánto puedo invertir?
        </div>
        {libre>0 ? (
          <p style={{color:t.textoSub,fontSize:14,lineHeight:1.6,margin:0}}>
            En {periodoLabel} te sobraron <b style={{color:t.verde}}>{fmt(libre)}</b> después de tus gastos y de lo que ya guardaste.
            Esa plata está libre — la podrías destinar a una inversión o simplemente sumarla a tu ahorro.
          </p>
        ) : (
          <p style={{color:t.textoSub,fontSize:14,lineHeight:1.6,margin:0}}>
            En {periodoLabel} no te quedó nada libre para invertir — tus gastos y ahorros ya usaron todo lo que te entró
            {libre<0 ? <> (te faltaron <b style={{color:t.rojo}}>{fmt(Math.abs(libre))}</b>)</> : null}.
            Prueba mirando "Todo" o revisa en qué se te va la plata más abajo.
          </p>
        )}
      </div>

      {/* Simulador de compra */}
      <div style={{...card(t),borderRadius:16,padding:"18px 20px"}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:t.textoSub,display:"flex",alignItems:"center",gap:6,textTransform:"uppercase",letterSpacing:.5}}>
          <Icon name="zap" size={14} color={t.acento}/> ¿Me alcanza para comprar algo?
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
          <div style={{flex:1,minWidth:160}}>
            <label style={labelStyle(t)}>Precio de lo que quieres comprar</label>
            <input type="number" style={inputStyle(t,modoOscuro)} value={simMonto} onChange={e=>setSimMonto(e.target.value)} placeholder="Ej: 150000"/>
          </div>
        </div>
        {simN>0 && (
          <div style={{marginTop:12,padding:"10px 14px",borderRadius:10,fontSize:13,fontWeight:600,
            background:simAlcanza?"rgba(52,211,153,0.1)":"rgba(239,68,68,0.1)",
            border:`1px solid ${simAlcanza?"rgba(52,211,153,0.3)":"rgba(239,68,68,0.3)"}`,
            color:simAlcanza?t.verde:t.rojo,
          }}>
            {simAlcanza
              ? `Sí te alcanza. Después de comprarlo te quedarían ${fmt(libre-simN)} libres (basado en "${periodoLabel}").`
              : `Con lo libre de "${periodoLabel}" no te alcanza — te faltarían ${fmt(simN-libre)}. Ojo: esto no cuenta lo que ya tienes guardado (${fmt(guardadoTotal)}).`}
          </div>
        )}
      </div>

      {/* Formulario nuevo movimiento */}
      <div style={{...card(t),borderRadius:16,padding:"18px 20px"}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:14,color:t.textoSub,textTransform:"uppercase",letterSpacing:.5}}>Nuevo movimiento personal</div>
        <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
          <button className="neo-btn" style={{flex:1,minWidth:90,padding:"10px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,
            background:tipo==="ingreso"?"rgba(52,211,153,0.12)":t.surface, border:`1.5px solid ${tipo==="ingreso"?"#34d399":t.border}`,color:tipo==="ingreso"?t.verde:t.textoMuted,
          }} onClick={()=>cambiarTipo("ingreso")}>+ Me entró</button>
          <button className="neo-btn" style={{flex:1,minWidth:90,padding:"10px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,
            background:tipo==="gasto"?"rgba(248,113,113,0.12)":t.surface, border:`1.5px solid ${tipo==="gasto"?"#f87171":t.border}`,color:tipo==="gasto"?t.rojo:t.textoMuted,
          }} onClick={()=>cambiarTipo("gasto")}>- Gasté</button>
          <button className="neo-btn" style={{flex:1,minWidth:90,padding:"10px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,
            background:tipo==="ahorro"?"rgba(167,139,250,0.15)":t.surface, border:`1.5px solid ${tipo==="ahorro"?"#a78bfa":t.border}`,color:tipo==="ahorro"?t.morado:t.textoMuted,
          }} onClick={()=>cambiarTipo("ahorro")}>⬤ Cuenta / Ahorro</button>
        </div>

        {tipo==="ahorro" ? (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>
              <label style={labelStyle(t)}>¿De quién es esta plata?</label>
              <select style={inputStyle(t,modoOscuro)} value={titular} onChange={e=>{setTitular(e.target.value);setCuenta("");}}>
                <option value="Iván">Iván</option>
                <option value="Laura">Laura</option>
              </select>
            </div>
            <div>
              <label style={labelStyle(t)}>Nombre de la cuenta</label>
              <input style={inputStyle(t,modoOscuro)} list="cuentas-previas" value={cuenta} onChange={e=>setCuenta(e.target.value)} placeholder="Ej: Efectivo, Bancolombia, Nequi..."/>
              <datalist id="cuentas-previas">
                {nombresCuentasPrevias.map(c=><option key={c} value={c}/>)}
              </datalist>
            </div>
            <div style={{gridColumn:"1 / -1"}}>
              <label style={labelStyle(t)}>Valor (si sacaste plata de esa cuenta, pon un número negativo, ej: -50000)</label>
              <input type="number" style={inputStyle(t,modoOscuro)} value={monto} onChange={e=>setMonto(e.target.value)} placeholder="0"/>
            </div>
            <div style={{gridColumn:"1 / -1"}}><label style={labelStyle(t)}>Nota (opcional)</label><input style={inputStyle(t,modoOscuro)} value={nota} onChange={e=>setNota(e.target.value)} placeholder="Ej: Aporte de la quincena..."/></div>
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>
              <label style={labelStyle(t)}>Categoría</label>
              <select style={inputStyle(t,modoOscuro)} value={categoria} onChange={e=>setCategoria(e.target.value)}>
                {(tipo==="ingreso"?CATS_FIN_ING:CATS_FIN_GASTO).map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={labelStyle(t)}>Valor</label><input type="number" style={inputStyle(t,modoOscuro)} value={monto} onChange={e=>setMonto(e.target.value)} placeholder="0"/></div>
            <div style={{gridColumn:"1 / -1"}}><label style={labelStyle(t)}>Nota (opcional)</label><input style={inputStyle(t,modoOscuro)} value={nota} onChange={e=>setNota(e.target.value)} placeholder="Ej: Mercado de la semana..."/></div>
          </div>
        )}

        <button className="neo-btn" style={{...btnPrimary(t),width:"auto",padding:"10px 24px",marginTop:14}} onClick={agregar}>
          <Icon name="check" size={15}/> Guardar
        </button>
      </div>

      {/* Top gastos personales del período */}
      {topGastos.length>0 && (
        <div style={{...card(t),borderRadius:16,padding:"18px 20px"}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:14,color:t.textoSub,textTransform:"uppercase",letterSpacing:.5}}>En qué se te va la plata</div>
          {topGastos.map(([cat,val])=>(
            <div key={cat} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${modoOscuro?"rgba(255,255,255,0.04)":"rgba(149,165,185,0.2)"}`}}>
              <span style={{color:t.textoSub,fontSize:13}}>{cat}</span>
              <span style={{color:t.rojo,fontWeight:600,fontSize:13}}>{fmt(val)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Historial */}
      <div style={{...card(t),borderRadius:16,padding:"18px 20px"}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:14,color:t.textoSub,textTransform:"uppercase",letterSpacing:.5}}>Movimientos ({vistas.length})</div>
        {vistas.length===0 && <div style={{color:t.textoMin,textAlign:"center",padding:24,fontSize:13}}>Sin movimientos en este período.</div>}
        <div style={{maxHeight:400,overflowY:"auto"}}>
          {vistas.map(f=>{
            const gasto = esGasto(f);
            const color = f.tipo==="ingreso"?t.verde:f.tipo==="ahorro"?t.morado:t.rojo;
            const icono = f.tipo==="ingreso"?"arrow_up":f.tipo==="ahorro"?"lock":"arrow_down";
            const etiqueta = f.tipo==="ahorro" ? `${f.titular||"Sin asignar"} · ${f.categoria}` : f.categoria;
            return(
              <div key={f.id} style={{display:"flex",gap:8,alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${modoOscuro?"rgba(255,255,255,0.04)":"rgba(149,165,185,0.18)"}`,fontSize:13,flexWrap:"wrap"}}>
                <Icon name={icono} size={13} color={color}/>
                <span style={{flex:1,color:t.textoSub,minWidth:140}}>{etiqueta}{f.nota?` · ${f.nota}`:""}</span>
                <span style={{color:f.monto<0?t.rojo:color,fontWeight:700}}>{gasto?"-":""}{fmt(f.monto)}</span>
                <span style={{color:t.textoMin,fontSize:11}}>{f.fechaISO}</span>
                <button className="neo-btn" style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",color:"#f87171",padding:"4px 8px",borderRadius:6,cursor:"pointer"}} onClick={()=>onEliminar(f.id)}><Icon name="trash" size={11}/></button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── BONOS ────────────────────────────────────────────────────────────────────
function VistaBonos({registros,t,modoOscuro}){
  const hoyDate = getLocalDate(); // fecha Colombia real (UTC-5)
  const diaSemana = hoyDate.getDay()===0?7:hoyDate.getDay();
  // Calcular inicio de semana en string ISO directamente
  const inicioDate = new Date(hoyDate);
  inicioDate.setDate(hoyDate.getDate()-(diaSemana-1));
  const inicioISO = `${inicioDate.getFullYear()}-${String(inicioDate.getMonth()+1).padStart(2,'0')}-${String(inicioDate.getDate()).padStart(2,'0')}`;

  const regsSet=registros.filter(r=>{
    return r.fechaISO >= inicioISO && r.tipo==="ingreso" && r.categoria!=="Conversión de medio";
  });

  // Ranking dinámico: tomar todos los usuarios que aparecen en registros + base
  const nombresEnRegistros = [...new Set(registros.filter(r=>r.tipo==="ingreso").map(r=>r.usuario))];
  const nombresBase = Object.values(USUARIOS_BASE).map(u=>u.nombre);
  const todosNombres = [...new Set([...nombresEnRegistros, ...nombresBase])];
  const rank = todosNombres.map(e => {
    // buscar el userId para obtener el local
    const uid = Object.entries(USUARIOS_BASE).find(([,v])=>v.nombre===e)?.[0];
    return {
      nombre: e,
      local: USUARIOS_BASE[uid]?.local || "tramites",
      ing: regsSet.filter(r=>r.usuario===e).reduce((a,b)=>a+b.monto,0),
      cnt: regsSet.filter(r=>r.usuario===e).length,
    };
  }).sort((a,b)=>b.ing-a.ing);

  // Top 2: cada uno recibe 3.5% de SUS propias ventas
  const top2 = rank.filter(e=>e.ing>0).slice(0,2);
  const inicioStr=inicioDate.toLocaleDateString("es-CO",{day:"2-digit",month:"2-digit"});
  const hoyStr=hoyDate.toLocaleDateString("es-CO",{day:"2-digit",month:"2-digit"});
  const medals = ["🥇","🥈","🥉","4°"];
  const coloresMedalla = [t.amarillo, "#94a3b8", "#cd7f32", t.textoMuted];

  // Sonido bono si hay ganadores
  useEffect(()=>{
    if(top2.length>0) playSound("bono");
  // eslint-disable-next-line
  },[]);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{...card(t),borderRadius:16,padding:"20px"}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:4,color:t.textoSub,display:"flex",alignItems:"center",gap:6,textTransform:"uppercase",letterSpacing:.5}}>
          <Icon name="gift" size={15} color={t.textoSub}/> Bonificación semanal · {inicioStr} al {hoyStr}
        </div>
        <p style={{color:t.textoMuted,fontSize:13,margin:"8px 0 18px",lineHeight:1.5}}>
          Los <strong style={{color:t.texto}}>2 empleados</strong> con más ventas en la semana reciben cada uno el <strong style={{color:t.acento}}>3.5%</strong> de sus propias ventas como bono.
        </p>

        {top2.length>0?(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {top2.map((e,i)=>{
              const bono = Math.round(e.ing * 0.035);
              return(
                <div key={e.nombre} style={{
                  background:i===0
                    ?(modoOscuro?"rgba(252,211,77,0.06)":"rgba(180,83,9,0.06)")
                    :(modoOscuro?"rgba(148,163,184,0.06)":"rgba(120,113,108,0.05)"),
                  border:`1px solid ${i===0?"rgba(252,211,77,0.25)":"rgba(148,163,184,0.2)"}`,
                  borderRadius:14,padding:18,
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                    <span style={{fontSize:28}}>{medals[i]}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:800,fontSize:18,color:coloresMedalla[i]}}>{e.nombre}</div>
                      <div style={{color:t.textoMuted,fontSize:11}}>{LOCALES[e.local]} · {e.cnt} registros</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{color:t.textoMuted,fontSize:11}}>Vendió</div>
                      <div style={{color:t.verde,fontWeight:700,fontSize:16}}>{fmt(e.ing)}</div>
                    </div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                    background:i===0?(modoOscuro?"rgba(252,211,77,0.1)":"rgba(180,83,9,0.08)"):(modoOscuro?"rgba(148,163,184,0.1)":"rgba(120,113,108,0.08)"),
                    border:`1px solid ${i===0?"rgba(252,211,77,0.3)":"rgba(148,163,184,0.25)"}`,
                    borderRadius:10,padding:"12px 16px"}}>
                    <span style={{color:coloresMedalla[i],fontSize:13,fontWeight:700}}>Bono (3.5%)</span>
                    <span style={{color:coloresMedalla[i],fontWeight:800,fontSize:22}}>{fmt(bono)}</span>
                  </div>
                </div>
              );
            })}
            <div style={{...card(t),borderRadius:12,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:t.sombraBtn}}>
              <span style={{color:t.textoMuted,fontSize:12}}>Total bonos a pagar esta semana</span>
              <span style={{color:t.acento,fontWeight:800,fontSize:18}}>{fmt(top2.reduce((a,e)=>a+Math.round(e.ing*0.035),0))}</span>
            </div>
          </div>
        ):(
          <div style={{color:t.textoMin,textAlign:"center",padding:24,fontSize:13}}>Sin registros de ventas esta semana.</div>
        )}
      </div>

      <div style={{...card(t),borderRadius:16,padding:"20px"}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:14,color:t.textoSub,display:"flex",alignItems:"center",gap:6,textTransform:"uppercase",letterSpacing:.5}}>
          <Icon name="award" size={15} color={t.textoSub}/> Ranking completo esta semana
        </div>
        {rank.map((e,i)=>(
          <div key={e.nombre} style={{
            display:"flex",alignItems:"center",gap:10,padding:"9px 10px",
            borderRadius:10,marginBottom:4,
            background:i<2&&e.ing>0?(modoOscuro?"rgba(217,70,239,0.06)":"rgba(13,148,136,0.05)"):"transparent",
            border:`1px solid ${i<2&&e.ing>0?t.borderActivo:t.border}`,
            opacity:e.ing===0?0.35:1,
          }}>
            <span style={{width:28,fontSize:16,textAlign:"center"}}>{medals[i]||`${i+1}.`}</span>
            <span style={{width:68,fontWeight:i<2?700:600,color:i<2?t.acento:t.textoSub}}>{e.nombre}</span>
            <span style={{color:t.textoMuted,fontSize:11,width:90}}>{LOCALES[e.local]?.split(" ")[0]}</span>
            <div style={{flex:1,background:modoOscuro?"rgba(15,23,42,0.6)":"rgba(180,160,120,0.2)",borderRadius:4,height:10,overflow:"hidden",boxShadow:t.sombraBtnActivo}}>
              <div style={{height:"100%",borderRadius:4,width:`${(e.ing/Math.max(rank[0].ing,1))*100}%`,
                background:i===0?t.amarillo:i===1?"#94a3b8":t.textoMin,transition:"width .5s"}}/>
            </div>
            <span style={{width:105,textAlign:"right",fontWeight:700,color:coloresMedalla[i],fontSize:13}}>{fmt(e.ing)}</span>
            <span style={{width:52,textAlign:"right",color:t.textoMuted,fontSize:11}}>{e.cnt} reg.</span>
            {i<2&&e.ing>0&&<span style={{color:t.acento,fontSize:11,fontWeight:700,minWidth:60,textAlign:"right"}}>+{fmt(Math.round(e.ing*0.035))}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── GESTIÓN DE USUARIOS ──────────────────────────────────────────────────────
function VistaUsuarios({claves, onGuardarClaves, estados, onGuardarEstados, t, modoOscuro}){
  const [editando,      setEditando]      = useState(null);
  const [nuevaClave,    setNuevaClave]    = useState("");
  const [confirmarClave,setConfirmarClave]= useState("");
  const [msg,           setMsg]           = useState(null);
  const [showClave,     setShowClave]     = useState(false);

  const guardarClave = (userId) => {
    if(nuevaClave.length < 4){ setMsg({tipo:"error",texto:"La clave debe tener al menos 4 caracteres"}); return; }
    if(nuevaClave !== confirmarClave){ setMsg({tipo:"error",texto:"Las claves no coinciden"}); return; }
    // ── FIX: el admin SÍ puede cambiar su propia clave ──
    onGuardarClaves({...claves, [userId]: nuevaClave});
    setEditando(null);
    setNuevaClave(""); setConfirmarClave(""); setShowClave(false);
    setMsg({tipo:"ok",texto:`Clave de ${USUARIOS_BASE[userId].nombre} actualizada`});
    setTimeout(()=>setMsg(null), 3000);
  };

  const toggleEstado = (userId) => {
    if(USUARIOS_BASE[userId]?.role === "admin") return; // no desactivar admins
    const nuevos = {...estados, [userId]: !estados[userId]};
    onGuardarEstados(nuevos);
    setMsg({tipo:"ok",texto:`${USUARIOS_BASE[userId].nombre} ${nuevos[userId]?"activado":"desactivado"}`});
    setTimeout(()=>setMsg(null), 3000);
  };

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{...card(t),borderRadius:16,padding:"20px"}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:4,color:t.textoSub,display:"flex",alignItems:"center",gap:6,textTransform:"uppercase",letterSpacing:.5}}>
          <Icon name="users" size={15} color={t.textoSub}/> Gestión de usuarios
        </div>
        <p style={{color:t.textoMuted,fontSize:13,margin:"8px 0 20px",lineHeight:1.5}}>
          Podés cambiar la clave de cualquier usuario (incluida la tuya) y activar o desactivar su acceso.
        </p>

        {msg && (
          <div style={{
            background:msg.tipo==="ok"?(modoOscuro?"rgba(52,211,153,0.08)":"rgba(22,163,74,0.08)"):(modoOscuro?"rgba(248,113,113,0.08)":"rgba(220,38,38,0.08)"),
            border:`1px solid ${msg.tipo==="ok"?"rgba(52,211,153,0.3)":"rgba(239,68,68,0.3)"}`,
            borderRadius:10,padding:"10px 14px",marginBottom:16,
            display:"flex",alignItems:"center",gap:8,fontSize:13,
            color:msg.tipo==="ok"?t.verde:t.rojo,fontWeight:600,
          }}>
            <Icon name={msg.tipo==="ok"?"check":"alert"} size={15}/> {msg.texto}
          </div>
        )}

        {Object.entries(USUARIOS_BASE).map(([id, usr])=>(
          <div key={id} style={{
            ...card(t),borderRadius:14,padding:"16px 20px",marginBottom:12,
            borderLeft:`3px solid ${estados[id]?t.verde:t.rojo}`,
            boxShadow:t.sombraBtn,opacity:estados[id]?1:0.75,
          }}>
            <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <div style={{background:modoOscuro?"rgba(255,255,255,0.05)":"rgba(149,165,185,0.2)",borderRadius:12,padding:"10px",display:"flex",boxShadow:t.sombraBtn}}>
                <Icon name={usr.role==="admin"?"shield":"user"} size={20} color={usr.role==="admin"?t.amarillo:t.acento}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:15,color:t.texto}}>{usr.nombre}</div>
                <div style={{color:t.textoMuted,fontSize:12}}>
                  {usr.role==="admin"?"Administrador":LOCALES[usr.local]} · {usr.medios.join(", ")}
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                {USUARIOS_BASE[id]?.role !== "admin" && (
                  <button className="neo-btn" onClick={()=>{playSound("click");toggleEstado(id);}} style={{
                    background:estados[id]?(modoOscuro?"rgba(52,211,153,0.08)":"rgba(22,163,74,0.08)"):(modoOscuro?"rgba(248,113,113,0.08)":"rgba(220,38,38,0.08)"),
                    border:`1.5px solid ${estados[id]?"rgba(52,211,153,0.4)":"rgba(239,68,68,0.4)"}`,
                    borderRadius:10,padding:"7px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:6,
                    fontSize:12,fontWeight:700,color:estados[id]?t.verde:t.rojo,boxShadow:t.sombraBtn,
                  }}>
                    <Icon name="power" size={13} color={estados[id]?t.verde:t.rojo}/>
                    {estados[id]?"Activo":"Inactivo"}
                  </button>
                )}
                {USUARIOS_BASE[id]?.role === "admin" && (
                  <span style={{color:t.verde,fontSize:12,fontWeight:700,padding:"7px 14px",background:modoOscuro?"rgba(52,211,153,0.08)":"rgba(22,163,74,0.08)",borderRadius:10,border:"1.5px solid rgba(52,211,153,0.3)"}}>
                    ✓ Siempre activo
                  </span>
                )}
                <button className="neo-btn" onClick={()=>{ playSound("click"); setEditando(editando===id?null:id); setNuevaClave(""); setConfirmarClave(""); setShowClave(false); setMsg(null); }} style={{
                  background:editando===id?(modoOscuro?"rgba(56,189,248,0.12)":"rgba(2,132,199,0.08)"):t.surface,
                  border:`1.5px solid ${editando===id?t.acento:t.border}`,borderRadius:10,padding:"7px 14px",cursor:"pointer",
                  display:"flex",alignItems:"center",gap:6,fontSize:12,fontWeight:700,
                  color:editando===id?t.acento:t.textoMuted,
                  boxShadow:editando===id?t.sombraBtnActivo:t.sombraBtn,
                }}>
                  <Icon name="key" size={13} color={editando===id?t.acento:t.textoMuted}/> Cambiar clave
                </button>
              </div>
            </div>

            {editando===id && (
              <div className="fade-in" style={{marginTop:16,padding:"16px",background:modoOscuro?"rgba(15,23,42,0.6)":"rgba(218,227,240,0.55)",borderRadius:12,boxShadow:t.sombraBtnActivo}}>
                <div style={{color:t.amarillo,fontWeight:700,fontSize:13,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
                  <Icon name="lock" size={14} color={t.amarillo}/> Nueva clave para {usr.nombre}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                  <div>
                    <label style={labelStyle(t)}>Nueva clave</label>
                    <input type={showClave?"text":"password"} style={inputStyle(t,modoOscuro)} value={nuevaClave} onChange={e=>setNuevaClave(e.target.value)} placeholder="Mínimo 4 caracteres"/>
                  </div>
                  <div>
                    <label style={labelStyle(t)}>Confirmar clave</label>
                    <input type={showClave?"text":"password"} style={inputStyle(t,modoOscuro)} value={confirmarClave} onChange={e=>setConfirmarClave(e.target.value)} onKeyDown={e=>e.key==="Enter"&&guardarClave(id)} placeholder="Repetir clave"/>
                  </div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <button className="neo-btn" style={{...btnPrimary(t),width:"auto",padding:"9px 20px"}} onClick={()=>{playSound("success");guardarClave(id);}}>
                    <Icon name="check" size={14}/> Guardar
                  </button>
                  <button className="neo-btn" style={btnSecundario(t,modoOscuro)} onClick={()=>setEditando(null)}>Cancelar</button>
                  <button className="neo-btn" onClick={()=>setShowClave(!showClave)} style={{...btnSecundario(t,modoOscuro),display:"flex",alignItems:"center",gap:5,fontSize:11}}>
                    <Icon name="eye" size={12}/> {showClave?"Ocultar":"Ver"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CONFIGURACIÓN (admin) ────────────────────────────────────────────────────
// ─── ETIQUETAS (categorías configurables de ingresos y gastos) ───────────────
function VistaEtiquetas({etiquetas, onGuardarEtiquetas, t, modoOscuro}){
  const [nuevaIng, setNuevaIng] = useState("");
  const [nuevaEgr, setNuevaEgr] = useState("");
  const [msg, setMsg] = useState(null);

  const avisar = (texto) => { setMsg(texto); setTimeout(()=>setMsg(null), 2500); };

  const agregar = (tipo, valor, setValor) => {
    const v = valor.trim();
    if(!v) return;
    if(etiquetas[tipo].some(e=>e.toLowerCase()===v.toLowerCase())){ avisar("Esa etiqueta ya existe"); return; }
    playSound("success");
    onGuardarEtiquetas({...etiquetas, [tipo]:[...etiquetas[tipo], v]});
    setValor("");
  };
  const quitar = (tipo, valor) => {
    playSound("click");
    onGuardarEtiquetas({...etiquetas, [tipo]: etiquetas[tipo].filter(e=>e!==valor)});
  };

  const Lista = ({tipo, titulo, color, nuevoValor, setNuevoValor}) => (
    <div style={{background:modoOscuro?"rgba(15,23,42,0.55)":"rgba(218,227,240,0.5)",borderRadius:14,padding:"14px 16px",flex:1,minWidth:240}}>
      <div style={{fontWeight:700,fontSize:12,color:color,marginBottom:10,textTransform:"uppercase",letterSpacing:.5}}>{titulo}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
        {etiquetas[tipo].map(e=>(
          <span key={e} style={{background:modoOscuro?"rgba(255,255,255,0.05)":"rgba(255,255,255,0.6)",border:`1px solid ${t.border}`,borderRadius:20,padding:"5px 8px 5px 12px",fontSize:12,color:t.textoSub,display:"flex",alignItems:"center",gap:6}}>
            {e}
            <button className="neo-btn" onClick={()=>quitar(tipo,e)} style={{background:"none",border:"none",cursor:"pointer",color:t.textoMuted,display:"flex",padding:2}}>
              <Icon name="x" size={11} color={t.textoMuted}/>
            </button>
          </span>
        ))}
        {etiquetas[tipo].length===0 && <span style={{color:t.textoMin,fontSize:12}}>Sin etiquetas</span>}
      </div>
      <div style={{display:"flex",gap:8}}>
        <input style={{...inputStyle(t,modoOscuro),flex:1}} value={nuevoValor} onChange={e=>setNuevoValor(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&agregar(tipo,nuevoValor,setNuevoValor)} placeholder="Nueva etiqueta..."/>
        <button className="neo-btn" style={{...btnPrimary(t),width:"auto",padding:"8px 14px"}} onClick={()=>agregar(tipo,nuevoValor,setNuevoValor)}>
          <Icon name="plus" size={14}/>
        </button>
      </div>
    </div>
  );

  return(
    <div style={{...card(t),borderRadius:16,padding:"18px 20px"}}>
      <div style={{fontWeight:700,fontSize:13,marginBottom:4,color:t.textoSub,display:"flex",alignItems:"center",gap:6,textTransform:"uppercase",letterSpacing:.5}}>
        <Icon name="box" size={15} color={t.textoSub}/> Etiquetas de ingresos y gastos
      </div>
      <p style={{color:t.textoMuted,fontSize:13,margin:"8px 0 16px",lineHeight:1.5}}>
        Estas son las opciones que ven los colaboradores al registrar una venta o un gasto. Agrega o quita las que necesites — los registros ya guardados no se ven afectados.
      </p>
      {msg && (
        <div style={{background:modoOscuro?"rgba(248,113,113,0.08)":"rgba(220,38,38,0.08)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:10,padding:"8px 14px",marginBottom:14,fontSize:13,color:t.rojo,fontWeight:600}}>
          {msg}
        </div>
      )}
      <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
        <Lista tipo="ingreso" titulo="Ingresos / Servicios" color={t.verde} nuevoValor={nuevaIng} setNuevoValor={setNuevaIng}/>
        <Lista tipo="egreso"  titulo="Gastos"               color={t.rojo}  nuevoValor={nuevaEgr} setNuevoValor={setNuevaEgr}/>
      </div>
    </div>
  );
}

function VistaConfig({modoOscuro,claves,onGuardarClaves,estados,onGuardarEstados,etiquetas,onGuardarEtiquetas,t}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16,maxWidth:720,margin:"0 auto"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{background:modoOscuro?"rgba(217,70,239,0.1)":"rgba(13,148,136,0.1)",border:`1px solid ${t.borderActivo}`,borderRadius:12,padding:12,display:"flex",boxShadow:t.sombraBtn}}>
          <Icon name="settings" size={24} color={t.acento}/>
        </div>
        <div>
          <div style={{fontWeight:800,fontSize:17,color:t.texto}}>Configuración</div>
          <div style={{color:t.textoMuted,fontSize:12}}>Apariencia · Usuarios · Etiquetas · Sistema</div>
        </div>
      </div>

      {/* Gestión de usuarios inline */}
      <VistaUsuarios claves={claves} onGuardarClaves={onGuardarClaves} estados={estados} onGuardarEstados={onGuardarEstados} t={t} modoOscuro={modoOscuro}/>

      {/* Gestión de etiquetas de ingresos/gastos */}
      <VistaEtiquetas etiquetas={etiquetas} onGuardarEtiquetas={onGuardarEtiquetas} t={t} modoOscuro={modoOscuro}/>

      {/* Info sistema */}
      <div style={{...card(t),borderRadius:14,padding:"16px 18px",boxShadow:t.sombraBtn}}>
        <div style={{fontWeight:700,fontSize:12,color:t.textoMuted,textTransform:"uppercase",letterSpacing:.6,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
          <Icon name="box" size={13} color={t.textoMuted}/> Sistema
        </div>
        {[
          ["Versión","3.0.0"],
          ["Locales","Internet La 52 · Trámites y Servicios"],
          ["Base de datos","Supabase (registros_caja)"],
          ["Zona horaria","Colombia (UTC-5)"],
          ["Bonificación","Top 2 · 3.5% de ventas propias c/u"],
        ].map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${t.border}`,fontSize:13}}>
            <span style={{color:t.textoMuted}}>{k}</span>
            <span style={{color:t.textoSub,fontWeight:600}}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CAMBIAR PROPIA CLAVE ─────────────────────────────────────────────────────
function VistaCambiarClave({usuario, claves, onGuardar, t, modoOscuro, onVolver}){
  const [actual,    setActual]    = useState("");
  const [nueva,     setNueva]     = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [msg,       setMsg]       = useState(null);
  const [showPwd,   setShowPwd]   = useState(false);

  const guardar = () => {
    if(claves[usuario.id] !== actual){ setMsg({tipo:"error",texto:"La clave actual es incorrecta"}); return; }
    if(nueva.length < 4){ setMsg({tipo:"error",texto:"La nueva clave debe tener al menos 4 caracteres"}); return; }
    if(nueva !== confirmar){ setMsg({tipo:"error",texto:"Las claves nuevas no coinciden"}); return; }
    onGuardar({...claves, [usuario.id]: nueva});
    setMsg({tipo:"ok",texto:"¡Clave actualizada correctamente!"});
    setActual(""); setNueva(""); setConfirmar("");
    setTimeout(()=>{ setMsg(null); onVolver(); }, 2500);
  };

  return(
    <div style={{maxWidth:480,margin:"0 auto"}}>
      <div style={{...card(t),borderRadius:18,padding:"32px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
          <div style={{background:modoOscuro?"rgba(217,70,239,0.1)":"rgba(13,148,136,0.1)",border:`1px solid ${t.borderActivo}`,borderRadius:12,padding:12,display:"flex",boxShadow:t.sombraBtn}}>
            <Icon name="key" size={24} color={t.acento}/>
          </div>
          <div>
            <div style={{fontWeight:800,fontSize:17,color:t.texto}}>Cambiar mi clave</div>
            <div style={{color:t.textoMuted,fontSize:12}}>{usuario.nombre}</div>
          </div>
        </div>

        {msg && (
          <div style={{
            background:msg.tipo==="ok"?(modoOscuro?"rgba(52,211,153,0.08)":"rgba(22,163,74,0.08)"):(modoOscuro?"rgba(248,113,113,0.08)":"rgba(220,38,38,0.08)"),
            border:`1px solid ${msg.tipo==="ok"?"rgba(52,211,153,0.3)":"rgba(239,68,68,0.3)"}`,
            borderRadius:10,padding:"10px 14px",marginBottom:18,display:"flex",alignItems:"center",gap:8,fontSize:13,
            color:msg.tipo==="ok"?t.verde:t.rojo,fontWeight:600,
          }}>
            <Icon name={msg.tipo==="ok"?"check":"alert"} size={15}/> {msg.texto}
          </div>
        )}

        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <label style={labelStyle(t)}>Clave actual</label>
            <input type={showPwd?"text":"password"} style={inputStyle(t,modoOscuro)} value={actual} onChange={e=>{setActual(e.target.value);setMsg(null);}} placeholder="Tu clave actual"/>
          </div>
          <div>
            <label style={labelStyle(t)}>Nueva clave</label>
            <input type={showPwd?"text":"password"} style={inputStyle(t,modoOscuro)} value={nueva} onChange={e=>{setNueva(e.target.value);setMsg(null);}} placeholder="Mínimo 4 caracteres"/>
          </div>
          <div>
            <label style={labelStyle(t)}>Confirmar nueva clave</label>
            <input type={showPwd?"text":"password"} style={inputStyle(t,modoOscuro)} value={confirmar} onChange={e=>{setConfirmar(e.target.value);setMsg(null);}} onKeyDown={e=>e.key==="Enter"&&guardar()} placeholder="Repetir nueva clave"/>
          </div>
        </div>

        <div style={{display:"flex",gap:10,marginTop:22,flexWrap:"wrap",alignItems:"center"}}>
          <button className="neo-btn" style={{...btnPrimary(t),width:"auto",padding:"11px 22px",boxShadow:`0 4px 18px ${t.acento}44`}} onClick={()=>{playSound("success");guardar();}}>
            <Icon name="lock" size={15}/> Actualizar clave
          </button>
          <button className="neo-btn" style={btnSecundario(t,modoOscuro)} onClick={onVolver}>Cancelar</button>
          <button className="neo-btn" onClick={()=>setShowPwd(!showPwd)} style={{...btnSecundario(t,modoOscuro),display:"flex",alignItems:"center",gap:5,fontSize:12}}>
            <Icon name="eye" size={13}/> {showPwd?"Ocultar":"Ver claves"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTES AUXILIARES ───────────────────────────────────────────────────
function Paso({titulo,sub,children,t}){
  return(
    <div>
      <div style={{color:t.texto,fontWeight:700,fontSize:17,marginBottom:3}}>{titulo}</div>
      <div style={{color:t.textoMuted,fontSize:12,marginBottom:16}}>{sub}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{children}</div>
    </div>
  );
}

function OpcionBtn({num,label,icon,color,small,onClick,sound="select",t,modoOscuro}){
  const [pressed, setPressed] = useState(false);
  useEffect(()=>{
    const h=(e)=>{ if(e.key===String(num)){ playSound(sound); onClick(); } };
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[num,onClick,sound]);
  return(
    <button
      className="neo-btn"
      onMouseDown={()=>setPressed(true)}
      onMouseUp={()=>setPressed(false)}
      onMouseLeave={()=>setPressed(false)}
      onClick={()=>{ playSound(sound); onClick(); }}
      style={{
        background: modoOscuro?"rgba(15,23,42,0.6)":"rgba(218,227,240,0.7)",
        border: `1.5px solid ${color}55`,
        borderRadius:12,
        padding: small?"8px 12px":"12px 16px",
        cursor:"pointer",fontWeight:600,
        fontSize: small?12:13,
        display:"flex",alignItems:"center",gap:10,
        transition:"box-shadow 0.12s",
        boxShadow: pressed ? t.sombraBtnActivo : t.sombraBtn,
        minWidth: small?120:140,
      }}
    >
      <span style={{
        width:32,height:32,borderRadius:9,
        background:`${color}18`,
        border:`1px solid ${color}33`,
        color,display:"flex",alignItems:"center",justifyContent:"center",
        flexShrink:0,
        boxShadow:pressed?`inset 2px 2px 4px ${color}22`:`2px 2px 5px rgba(0,0,0,0.2)`,
      }}>
        <Icon name={icon} size={15} color={color}/>
      </span>
      <span style={{color:t.texto,flex:1}}>{label}</span>
      <span style={{
        background:`${color}18`,
        border:`1.5px solid ${color}44`,
        borderRadius:6,padding:"2px 7px",
        fontSize:11,color:color,fontWeight:700,
        boxShadow:pressed?t.sombraBtnActivo:t.sombraBtn,
      }}>{num}</span>
    </button>
  );
}

// ─── HELPERS DE ESTILO ────────────────────────────────────────────────────────
const card = (t) => ({
  background: t.glassBg,
  backdropFilter: t.glassBlur,
  border: `1px solid ${t.border}`,
  boxShadow: t.sombra,
});

const labelStyle = (t) => ({
  display:"block",color:t.textoMuted,fontSize:11,marginBottom:5,
  textTransform:"uppercase",letterSpacing:.5,fontWeight:700,
});

const inputStyle = (t, modoOscuro) => ({
  width:"100%",
  background: modoOscuro?"rgba(10,15,30,0.85)":"rgba(218,227,240,0.8)",
  border:`1.5px solid ${t.border}`,color:t.texto,
  padding:"10px 13px",borderRadius:10,fontSize:14,
  boxSizing:"border-box",outline:"none",boxShadow:t.sombraBtn,cursor:"text",
});

const inputMonto = (t, modoOscuro) => ({
  background: modoOscuro?"rgba(10,15,30,0.85)":"rgba(218,227,240,0.8)",
  border:`2px solid ${t.borderActivo}`,color:t.texto,
  padding:"14px 16px",borderRadius:12,fontSize:22,fontWeight:700,
  width:180,outline:"none",boxShadow:t.sombraBtn,
});

const btnPrimary = (t) => ({
  width:"100%",background:`linear-gradient(135deg,${t.acento},${t.acentoHover})`,
  color:"#fff",border:"none",padding:"11px",borderRadius:10,cursor:"pointer",
  fontWeight:700,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:6,
  boxShadow:`0 4px 14px ${t.acento}44`,
});

const btnSecundario = (t, modoOscuro) => ({
  background: modoOscuro?"rgba(30,41,59,0.8)":"rgba(218,227,240,0.8)",
  border:`1px solid ${t.border}`,color:t.textoSub,
  padding:"9px 16px",borderRadius:9,cursor:"pointer",fontSize:13,boxShadow:t.sombraBtn,
});

const btnOk = (t) => ({
  background:`linear-gradient(135deg,${t.acento},${t.acentoHover})`,color:"#fff",border:"none",
  padding:"14px 18px",borderRadius:12,cursor:"pointer",fontWeight:700,fontSize:15,
  boxShadow:`0 4px 14px ${t.acento}44`,
});

const btnCancelar = (t) => ({
  background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.22)",color:"#f87171",
  padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:12,
  display:"flex",alignItems:"center",gap:5,
});

// ─── TOAST NOTIFICACIONES EN TIEMPO REAL ─────────────────────────────────────
function ToastNotif({notifs, onDismiss, modoOscuro}) {
  if(!notifs || notifs.length===0) return null;
  return (
    <div style={{position:"fixed",top:70,right:16,zIndex:9999,display:"flex",flexDirection:"column",gap:8,pointerEvents:"none"}}>
      <style>{`
        @keyframes slideInRight{from{opacity:0;transform:translateX(110%)}to{opacity:1;transform:translateX(0)}}
        @keyframes slideOutRight{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(110%)}}
        .toast-notif{animation:slideInRight 0.3s ease forwards;pointer-events:auto;}
      `}</style>
      {notifs.map(n=>(
        <div key={n.id} className="toast-notif" style={{
          background: n.tipo==="ingreso"
            ? (modoOscuro?"rgba(22,101,52,0.95)":"rgba(220,252,231,0.97)")
            : (modoOscuro?"rgba(127,29,29,0.95)":"rgba(254,226,226,0.97)"),
          border: `1px solid ${n.tipo==="ingreso"?"rgba(34,197,94,0.4)":"rgba(239,68,68,0.4)"}`,
          borderLeft: `3px solid ${n.tipo==="ingreso"?"#22c55e":"#ef4444"}`,
          borderRadius:12,
          padding:"10px 14px",
          maxWidth:280,
          display:"flex",alignItems:"flex-start",gap:8,
          boxShadow:"0 4px 16px rgba(0,0,0,0.25)",
          backdropFilter:"blur(10px)",
        }}>
          <span style={{fontSize:16,flexShrink:0}}>{n.tipo==="ingreso"?"💚":"🔴"}</span>
          <span style={{flex:1,fontSize:12,fontWeight:600,color:n.tipo==="ingreso"?(modoOscuro?"#86efac":"#166534"):(modoOscuro?"#fca5a5":"#991b1b"),lineHeight:1.4}}>{n.texto}</span>
          <button onClick={()=>onDismiss(n.id)} style={{background:"transparent",border:"none",cursor:"pointer",color:"inherit",opacity:0.6,padding:2,flexShrink:0,fontSize:14}}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ─── BOTTOM NAV MÓVIL ─────────────────────────────────────────────────────────
function BottomNav({esAdmin, usuario, vista, setVista, alertas, t, modoOscuro}) {
  const navItemsAdmin = [
    {id:"registro",   icon:"plus",      label:"Registrar"},
    {id:"dashboard",  icon:"chart",     label:"Dashboard"},
    {id:"historial",  icon:"list",      label:"Historial"},
    {id:"bonos",      icon:"trophy",    label:"Bonos"},
    {id:"compromisos",icon:"repeat",    label:"Compromisos", badge: alertas.length},
    ...(usuario?.id==="ivan" ? [{id:"finanzasivan", icon:"wallet", label:"Mi Caja"}] : []),
    {id:"config",     icon:"settings",  label:"Config"},
  ];
  const navItemsEmpleado = [
    {id:"registro",  icon:"plus",    label:"Registrar"},
    {id:"ranking",   icon:"trophy",  label:"Ranking"},
    {id:"clave",     icon:"key",     label:"Mi clave"},
  ];
  const navItems = esAdmin ? navItemsAdmin : navItemsEmpleado;

  return (
    <nav style={{
      position:"fixed",
      bottom:0,left:0,right:0,
      zIndex:200,
      background:modoOscuro?"rgba(16,10,26,0.97)":"rgba(238,230,215,0.97)",
      backdropFilter:"blur(20px)",
      borderTop:`1px solid ${t.border}`,
      display:"flex",
      justifyContent:"space-around",
      padding:"6px 0 calc(6px + env(safe-area-inset-bottom, 0px))",
      boxShadow:modoOscuro?"0 -4px 20px rgba(0,0,0,0.5)":"0 -4px 16px rgba(149,165,185,0.3)",
    }}>
      {navItems.map(item=>{
        const active = vista===item.id;
        return (
          <button key={item.id} onClick={()=>{ playSound("nav"); setVista(item.id); }}
            style={{
              background:"transparent",
              border:"none",
              display:"flex",flexDirection:"column",alignItems:"center",gap:3,
              padding:"4px 8px",
              cursor:"pointer",
              color:active?t.acento:t.textoMuted,
              fontSize:10,fontWeight:active?700:400,
              position:"relative",
              minWidth:44,
              transition:"color 0.15s",
            }}>
            {active && <div style={{position:"absolute",top:0,left:"20%",right:"20%",height:2,borderRadius:"0 0 3px 3px",background:t.acento}}/>}
            {item.badge>0 && (
              <div style={{position:"absolute",top:2,right:4,background:t.rojo,color:"#fff",borderRadius:8,fontSize:9,fontWeight:700,padding:"1px 5px",minWidth:14,textAlign:"center"}}>
                {item.badge}
              </div>
            )}
            <Icon name={item.icon} size={20} color={active?t.acento:t.textoMuted}/>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
