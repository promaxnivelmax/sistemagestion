# Sistema de Iván — guía del proyecto

Todo lo de los negocios de Iván Rodríguez (Barrancabermeja): las cajas, los clientes con sus hojas de vida, las finanzas, la página del buscador de vacantes y la búsqueda automática de vacantes.

> En este archivo no van claves ni contraseñas. Las claves están en Vercel (variables) y en Supabase.

---

## 1. Los sitios

| Dirección | Qué es | De dónde sale |
|---|---|---|
| **caja.ivanrodriguez.app** | Caja de **Internet La 52** (ventas, cierres, clientes, finanzas, vacantes nuevas) | Este repositorio → Vercel, proyecto `sistemagestion` |
| **laura.ivanrodriguez.app** | Caja de **Trámites y Servicios Laura** (la misma app, plata aparte; administradora: Sandra) | Este repositorio, mismo proyecto |
| **hv.ivanrodriguez.app/&lt;enlace&gt;** | Enlace privado de la hoja de vida de un cliente (se ve y se descarga en Word gratis) | Este repositorio (`public/perfil.html`) |
| **ivanrodriguez.app** | La página pública: buscador de vacantes, guías, calculadoras, hoja de vida de $5.000, documentos. `/cv` es la hoja de vida de Iván | Repositorio `promaxnivelmax/IvanRodriguez` → Vercel, proyecto `ivanrodriguez` (este pasa `/buscador`, `/api`, `/vacante`, `/vacantes` y el mapa del sitio al proyecto `buscador-vacantes`) |
| **ivanrodriguez.app/buscador/admin.html** | Panel de Iván para **publicar vacantes** y ver ventas de la página (pide la clave `ADMIN_KEY`) | Proyecto Vercel `buscador-vacantes` |

**Ojo:** el proyecto `buscador-vacantes` **no está en GitHub**: se ha publicado directo a Vercel. Su código solo existe en Vercel (pestaña *Source* de cada publicación).

## 2. Cómo se publica

- **Caja y enlace de HV:** cambiar archivos en `public/` de este repositorio. Vercel publica solo en ~1 minuto.
  - Al cambiar `app.js`, `cli.js`, `fz.js`, `styles.css`, etc., subir el número `?v=` en `public/index.html` **y** en la lista `BASE` de `public/sw.js`, y cambiar el nombre de caché `V` en `sw.js`. Si no, los celulares siguen con la versión vieja.
  - `vercel.json` debe ser JSON válido. Si se daña, **ninguna** publicación sale (pasó el 6 de octubre de 2026).
- **ivanrodriguez.app (/cv, mapa del sitio, cabeceras):** repositorio `IvanRodriguez`.
- **Buscador (`buscador-vacantes`):** solo desde Vercel. A octubre de 2026 la conexión de Vercel con Claude no tiene acceso al equipo "Ivan Rodriguez's projects" (falla de Vercel), así que hay cambios esperando (ver Pendientes).

## 3. Archivos de la caja (`public/`)

| Archivo | Qué hace |
|---|---|
| `index.html` | Carga todo (con versiones `?v=`) |
| `app.js` | La caja: entrar con clave, abrir/cerrar caja, ventas, gastos, retiros, reportes, historial, ajustes, guía de la primera vez (Laura), pestaña **Vacantes** (solo admin de La 52). Decide el negocio por la dirección: `laura.` = Trámites y Servicios Laura (funciones con prefijo `tl_`) |
| `cli.js` | Clientes: datos de cada persona, varias hojas de vida, documentos en Word, cuentas de cobro, trámites, enlace privado de la HV, subir HV en Word/PDF/foto |
| `hvd.js` | Lee hojas de vida en Word (.docx) |
| `ocr.js` | Lector de PDF y fotos (Tesseract + pdf.js). Al **subir una HV** se lee **solo el texto** (`leerHVTexto`); los soportes (cédula, diplomas, certificados) se leen aparte con su botón (`leerSoportes`) |
| `fz.js` | Finanzas (solo admin): resumen y meta del día, gastos del local, **🌐 Página** (ventas por Wompi), nómina, casa, configurar |
| `tram.js` | Portafolio de trámites con enlaces |
| `perfil.html` | Página del enlace privado de la HV. El botón **Descargar en Word** usa la función `hv-enlace` |
| `sw.js` | Guarda la app en el celular para que abra rápido |

Los documentos en Word (HV, cuentas de cobro, renuncia, etc.) los arma el servidor del buscador: `https://ivanrodriguez.app/api/hv`. La caja le manda su sesión (`caja_token`) y por eso no le cobra.

## 4. Base de datos (Supabase, proyecto `sbuyguoxwgpzsqtyhjaf`)

- **Esquema `public`** = Internet La 52. **Esquema `tl`** = Trámites y Servicios Laura (las mismas tablas, plata aparte). Los **clientes** (`public.cj_clientes`) se comparten entre los dos.
- Todo se hace con funciones (no se leen tablas directo desde el navegador):
  - `cj_*` caja, clientes, sesiones (`cj_auth` revisa la sesión; `cj_solo_admin` solo administrador).
  - `tl_cj_*`, `tl_fz_*` las mismas para Laura.
  - `fz_*` finanzas. `fz_ventas_web` = ventas de la página para la pestaña 🌐 Página.
  - `vac_*` vacantes publicadas y pagos de Wompi (`vac_pagos`). Protegidas con la clave del panel.
  - `cj_hv_link` / `cj_hv_publica` enlace privado de la HV (`cj_hv_links`).
  - `cj_vac_nuevas`, `cj_vac_buscar` pestaña Vacantes de la caja.
- **Usuario de sistema `enlace-hv`**: inactivo, no aparece al entrar y no puede usar la caja. Solo existe para que la función `hv-enlace` pida el Word al servidor como lo hace la caja. No borrarlo.

## 5. Funciones del servidor (Supabase Edge Functions)

| Función | Qué hace |
|---|---|
| `buscar-vacantes` | Busca vacantes nuevas: en el **Servicio de Empleo** revisa los consecutivos siguientes de cada empresa ya conocida (`vac_rastreo`); en la **Agencia del SENA** revisa los códigos nuevos y guarda solo los de Barrancabermeja. Deja lo encontrado en `vac_nuevas`. Solo responde con la clave interna de `vac_bot` |
| `hv-enlace` | Descarga en Word del enlace privado de la HV. La seguridad es el mismo enlace secreto |

## 6. Tareas automáticas (pg_cron)

| Tarea | Cuándo (hora Colombia) | Qué hace |
|---|---|---|
| `buscar-vacantes` | 6:17 y 6:21 a. m., 6:17 y 6:21 p. m. | Llama a la función `buscar-vacantes` |
| `limpiar-vacantes-nuevas` | 1:05 a. m. | Borra de `vac_nuevas` lo que ya cerró, ya se publicó o tiene más de 30 días |
| `/api/limpiar` (Vercel) | todos los días | Limpia vacantes vencidas del buscador |

**Límite conocido:** en el Servicio de Empleo solo se siguen las empresas que ya se publicaron alguna vez. Una empresa nueva se publica a mano la primera vez; desde ahí se sigue sola.

## 7. Cómo se usa cada día

1. **Vacantes:** caja → **Vacantes** → *Copiar todas* → abrir el panel de publicar → pegar → *Publicar vacantes*.
2. **Caja:** anotar cada venta y cada gasto en el momento; cerrar la caja al final del día.
3. **Lunes:** Finanzas → Resumen y 🌐 Página.

## 8. Google AdSense

- Las páginas `/vacante/*` llevan `X-Robots-Tag: noindex` (se configura en `vercel.json` del repositorio `IvanRodriguez`) y no están en el mapa del sitio (`sitemap.xml` estático en ese repositorio, con las 37 páginas propias: guías, calculadoras, herramientas, etc.). Razón: eran texto copiado del portal y Google las contaba como "contenido de poco valor".
- `/cv` no tiene anuncios.
- Se pidió revisión el 9 de octubre de 2026.

## 9. Pendientes

- [ ] Quitar anuncios de las páginas de pago del buscador (hoja de vida, cuenta de cobro, apoyar) → necesita publicar en `buscador-vacantes` (falla de la conexión de Vercel).
- [ ] Mejorar el panel de publicar (ventas y vacantes nuevas ahí mismo) → igual.
- [ ] Links sin `/buscador` (por ejemplo `ivanrodriguez.app/guias`) → después de que AdSense apruebe.
- [ ] Pasar `buscador-vacantes` a GitHub para que se publique como la caja.
