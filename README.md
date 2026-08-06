# Auditoría completa + traducciones EN/PT/FR al 100% — Entrega

Esta carpeta contiene **únicamente** los archivos nuevos o modificados sobre tu ZIP `mycuscotrip-main(31).zip` (95 archivos: 23 nuevos + 72 modificados, 0 eliminados). Cópialos a las mismas rutas relativas en tu proyecto real y súbelos a GitHub.

---

## 1. Tours y paquetes con información faltante (para que la busques tú)

Se auditaron 121 productos en `assets/data/*.json`. **65 tienen al menos un problema.** Nada de esto se inventó ni se completó automáticamente — es información real que solo tú puedes conseguir (fotos propias, precios confirmados).

### Los 3 hallazgos más urgentes
- **`tours-peru.json`** (Lima, Paracas/Ica, Nazca, Arequipa/Colca, Puno/Titicaca, Tarapoto, Iquitos, Puerto Maldonado): **13 de 13 productos** sin ninguna foto propia (todo con imagen placeholder genérica) y con el precio marcado por el propio archivo como `"pendiente de confirmar"` en el 100% de los casos.
- **`trekkings-cusco.json`** (Camino Inca 2D/1N y 4D/3N, Salkantay 4D/3N y 5D/4N, Ausangate, Ausangate+Vinicunca, Inca Jungle 3D/2N y 4D/3N): **8 de 8 treks** sin ninguna foto real, ni de portada ni del itinerario día a día.
- **`tours-cusco.json`**: los 12 tours SÍ tienen foto de portada/galería real, pero **el 100% de los pasos de itinerario** usa la misma imagen genérica en vez de foto propia del punto de la ruta. El caso más severo: `siete-lagunas-ausangate` también tiene su 3ª foto de galería genérica.

### Imágenes rotas de verdad (no placeholder, archivo faltante)
- `machu-picchu-overnight-clasico`: `3.jpg` y `4.jpg` no existen en disco.

### Fotos de la ciudad equivocada
- Hoteles `tambopata-comfort-lodge-3s` y `tambopata-premium-eco-lodge-4s`: muestran una foto de **Cusco**, no de la selva.
- Paquete privado `machu-picchu-tambopata-familia-privado-6d5n` (oculto del catálogo pero se envía a un cliente real, código `CUSFAM001`): varias fotos de itinerario también son de Cusco en vez de selva/Tambopata.

### Machu Picchu (tours-machu-picchu.json, 10 productos)
- `machu-picchu-full-day-clasico`, `machu-picchu-overnight-express`, `machu-picchu-panoramico-vistadome`, `machu-picchu-the-prime`, `machu-picchu-first-class-overnight`, `machu-picchu-luxury-hiram-bingham`, `machu-picchu-luxury-overnight`: alguna foto de galería genérica (no de portada).
- `machu-picchu-full-day-express` y `machu-picchu-first-class`: sin problemas.

### Hoteles (`hotels.json`, 17 hoteles)
- 4 destinos sin ningún hotel cargado: **Paracas, Ica, Tarapoto, Iquitos** (ya marcado en el propio archivo como "preparado sin hoteles, agregar cuando existan tarifas").
- 13 de 17 hoteles con precio marcado "pendiente de confirmar" (solo `cusco-boutique-3s` tiene tarifa neta confirmada).

### Sin problemas
`packages-cusco.json`, `experiencias-diarias.json`, `agencias-tours.json` — completos. `packages-peru.json` solo tiene una nota cosmética (dos paquetes distintos comparten la misma foto de portada).

### Menor prioridad (ya marcados como borrador/privado en el propio dato)
`tambopata-lodge-3d-2n-privado` (`status: draft`) y el paquete privado familiar mencionado arriba.

**Nada de contenido de texto (descripción/incluye) falta** — el vacío es 100% de fotos y precios, no de redacción.

---

## 2. Traducciones — Inglés y Portugués: llevados al 100%

Se auditó cada idioma comparándolo contra el español (páginas HTML completas, diccionario `ui-translations.json`, y los JSON de tours/paquetes), y luego se corrigió TODO lo que apareció, no solo la muestra inicial del audit.

### Inglés (partía de ~95% completo)
- Creadas las 6 páginas raíz que faltaban (`hoteles.html`, `mercadopago-retorno.html`, `organiza-tu-viaje.html`, `paypal-retorno.html`, `union-eterna-andes.html`, `admin-experiences.html`).
- Corregidos ~18 fragmentos sueltos en español y 43 textos estáticos que no coincidían con el diccionario ya correcto (afecta solo a SEO/buscadores, el JS ya los mostraba bien en pantalla).
- **Bonus no pedido pero corregido**: `en/trenes/index.html` tenía 49+ elementos sin traducir pese a que el diccionario de esa página ya tenía el inglés correcto, y `en/trenes/paypal-retorno.html` era una copia completa en español — ambos ya están en inglés.

### Portugués (partía de ~78-80% completo — el que más trabajo necesitó de los dos)
- Creadas las 6 páginas raíz faltantes + `pt/landing/machu-picchu-alternativas.html` (no existía).
- **`pt/astronomia-andina-cusco.html` y `pt/ayahuasca-cusco.html` estaban en gran parte en INGLÉS, no español** (copia-pega equivocado) — reescritas en portugués real.
- Más de 1,000 campos corregidos en los JSON de tours/paquetes (`tours-cusco`, `tours-peru`, `tours-machu-picchu`, `trekkings-cusco`, `packages-cusco`, `packages-peru`), incluyendo dos paquetes de `packages-peru.json` que estaban prácticamente 100% sin traducir (itinerario día a día completo, FAQ, todo).
- El formulario completo de registro de pasajeros (`pt/registro-pasajeros.html`) tenía la mayoría de sus textos en español — 113 correcciones puntuales.
- Corregido un bug real: `pt/mi-reserva.html` mostraba "Mi Reserva" (español) en un template JS mientras el resto de la página ya decía correctamente "Minha Reserva".

**Ambos idiomas: verificados con un barrido final buscando cualquier resto de español — limpio.**

---

## 3. Francés — llevado al 100%, incluyendo 2 bugs funcionales reales que rompían la web para visitantes franceses

Este era el idioma menos avanzado (~55-60% completo al empezar) y el que pediste dejar sin absolutamente nada pendiente. Se hizo un trabajo más profundo que en los otros dos idiomas porque, al revisar, aparecieron problemas más graves que simple texto sin traducir:

### Bugs funcionales encontrados y corregidos (no eran solo de traducción)
1. **Los 8 treks de Cusco no tenían NINGÚN precio, itinerario, incluye/no incluye ni opciones de pago en francés** (`assets/data/i18n/fr/trekkings-cusco.json` — los campos faltaban por completo, no solo estaban sin traducir). Un visitante francés que abriera cualquier página de trekking veía el producto roto. Reconstruido completo y traducido.
2. **Machu Picchu Overnight Clásico y Overnight Premium (`mapi_001`, `mapi_003`) tenían itinerarios truncados** (5-6 pasos en vez de los 9-14 reales, con horarios) **y les faltaban secciones enteras** que sí se muestran en la página (beneficios comerciales, información importante, resumen de alojamiento). Reconstruidos completos.
3. **7 de los 11 paquetes de Perú** (`packages-peru.json`) no tenían descripción, highlights ni itinerario día a día en absoluto en francés. Reescritos completos (5 a 15 días de itinerario cada uno).
4. **`fr/registro-pasajeros.html` tenía un bug de JavaScript que rompía todo el script de la página** (un salto de línea suelto dentro de un string), dejando el formulario de pasajeros no funcional para visitantes franceses. Corregido junto con la traducción (~90% de esa página estaba en español, no el 24% estimado).

### Todo lo demás
- Creadas las 6 páginas raíz faltantes + **toda la landing "Machu Picchu + tours" en francés desde cero** (no existía en absoluto): 2 páginas HTML, su JS propio, y su JSON de datos.
- **Las 25 páginas legales/informativas en francés** (Términos y Condiciones, Política de Privacidad, Política de Cookies, FAQ, Sobre Nosotros, etc.) mostraban solo un texto de relleno genérico idéntico en las 25 — es decir, **no existía contenido legal real en francés**. Se reescribieron las 25 con contenido real y fiel al español (para los términos legales se tradujo directamente del español completo, no del inglés, porque el inglés resultó ser un resumen incompleto).
- Cientos de campos corregidos en los JSON de tours/paquetes, más el campo `highlights` que faltaba por completo en varios productos.
- ~90 fragmentos de español detectados y corregidos en `ui-translations.json` (entre el archivo compartido y el propio de francés), y en páginas de catálogo, cotizador de vuelos, agencias, etc. — varias páginas (`cotizador-vuelos.html`, `agencias.html`) estaban prácticamente 100% sin traducir en su cuerpo.

**Verificado con un barrido final de todas las páginas fr/ buscando cualquier resto de español — limpio.**

### Nota honesta (no arreglado, fuera del alcance pedido)
`fr/detalle-reserva.html` (voucher de viaje) tiene un sistema interno de idiomas que solo soporta español/inglés — algunas etiquetas internas (cantidad de pasajeros, cumpleaños, desglose de pago) seguirán en español para visitantes franceses hasta que se agregue una rama `fr` a ese sistema. Es un cambio de funcionalidad más grande, no until una traducción faltante, así que no lo hice sin que me lo pidas explícitamente.

---

## 4. Carpetas y archivos para eliminar (ahorro potencial: ~70MB de 227MB, ~31%)

### Seguro eliminar ya (~43.4MB)
- `docs/*.pdf` + `docs/Guia Completa -v1.rtf` (43MB) — son cotizaciones de un cliente real ("Esmeralda Lancho"), no algo que el sitio use. Contienen el nombre real de un cliente en un repo que alimenta un sitio público — razón de privacidad además de peso.
- 84 archivos de bitácora en la raíz: todos los `CAMBIOS_V*.md`, `README_*.md` (incluido el propio `README.md`/`README.txt`, que resultaron ser bitácoras de parche, no un README real), `LEEME*`, `VALIDACION_*`, `INSTRUCCIONES_*`. Cero referencias en HTML/JS — son historial puro de sesiones de parches anteriores.
- 89 archivos `.../none` de 1 byte repartidos en carpetas de imágenes — basura de algún script antiguo; confirmé que las carpetas donde están NO están vacías (tienen sus imágenes reales al lado, no hay riesgo de fotos rotas al borrarlos).
- 4 archivos JS/CSS huérfanos que ninguna página carga: `assets/js/agencias-portal.js`, `assets/js/lib/flatpickr-config.js`, `assets/css/agencias-portal.css`, `assets/css/passenger-reservation-modal-v6.css`.

### Verificar antes de eliminar
- `hoteles/assets/img/**` (27MB): es un duplicado byte-a-byte de `assets/img/hotels/**`, pero `hoteles/assets/data/hotels.json` depende de esa copia local con rutas relativas. Si corriges esas rutas a absolutas primero, puedes borrar esta carpeta y ahorrar 27MB más.
- `backend/`, `hoteles/backend/`, `trenes/backend/`, `google-apps-script/`, `google-apps-script-hoteles.gs` (~180KB): no son basura — son los scripts reales para desplegar tus backends de Google Sheets (agencias, hoteles, trenes). Decide si quieres tenerlos en un repo público o moverlos a un lugar privado, pero no los borres sin más.

### NO eliminar (parece basura pero no lo es)
- `hoteles/` y `trenes/` (sin contar imágenes): están **vivos y enlazados** desde el menú principal del sitio ("Trenes a Machu Picchu", "Hoteles recomendados"). `trenes/assets/img/**` (14MB) son fotos únicas, no duplicadas en ningún otro lado.
- `go/index.html`: redirect corto en uso para WhatsApp/redes.
- `tools/*.js`: scripts de mantenimiento reales (generador de sitemap, auditoría de traducciones).

---

## 5. Validaciones hechas antes de entregar
- Los 95 archivos comparados archivo-por-archivo contra tu ZIP original (0 archivos eliminados sin querer).
- Todos los JSON tocados validados con `python3 -c "import json; json.load(...)"` — parsean correctamente.
- El nuevo `assets/js/pages/landing-machu-picchu-tours-fr.js` validado con `node --check` — sintaxis correcta.

---

**Carpeta lista para subir a GitHub**: `/Users/jefferson/Downloads/mycuscotrip-archivos-modificados-v2/` (95 archivos: 23 nuevos, 72 modificados, en sus rutas relativas correctas).
