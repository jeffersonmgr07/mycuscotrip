# Historial técnico legacy consolidado

> Archivo de consulta. Consolida notas de cambios históricas que estaban sueltas en la raíz. No forma parte del runtime de la web.

> Generado: 30 de agosto de 2026. Archivos consolidados: 76.

---

## Fuente: `AUDITORIA_CARPETAS_V34.md`

# Auditoría rápida de carpetas - My Cusco Trip V34

## Carpeta que sí estaba de más

- `/js`: era una copia exacta de `/assets/js` y no aparece referenciada por los HTML. Se retiró del proyecto completo V34 para evitar confusión. La ruta correcta de JavaScript es siempre `/assets/js/...`.

## Carpetas que sí debes conservar

- `/assets`: CSS, JS, imágenes y JSON principales del sitio.
- `/components`: header/footer cargados dinámicamente.
- `/trenes`: flujo independiente de trenes.
- `/agencias`: portal de agencias.
- `/en`, `/pt`, `/fr`, `/de`, `/it`, `/ja`, `/zh`: versiones multilenguaje.
- `/restaurantes`: sección independiente de restaurantes.
- `/pages`: páginas internas informativas/legales.
- `/public`: favicon y recursos públicos usados por varias páginas.

## Carpetas informativas o de desarrollo

Estas no suelen ser necesarias para que el sitio público funcione, pero conviene conservarlas si quieres mantener documentación o herramientas del proyecto:

- `/docs`
- `/seo`
- `/tools`
- `/backend`

Si buscas limpiar solo para producción, esas carpetas pueden separarse en un ZIP de respaldo antes de eliminarlas del hosting.

---

## Fuente: `CAMBIOS_CUPONES_V8.md`

# Cambios técnicos V8

## Resumen móvil de la landing

- Nombre del servicio en la primera línea.
- Fecha debajo del nombre.
- Precio alineado a la derecha en una sola línea.
- `USD` aparece en un tamaño menor que el importe.
- El cambio se limita a `.mpt-payment-review__services`.

## Cupones

- Google Sheets pasa a ser la única fuente de validación en producción.
- Se elimina el fallback público hacia `discount-codes.json`.
- Compatibilidad con `percent` y `fixed`.
- Validación central en landings ES/EN/PT, `product.js` y `quote-packages.js`.
- Generación única con `LockService`.
- Vigencia de 48 horas más gracia hasta el final del día.
- Correo personalizado en español, inglés y portugués.
- Validación por correo al confirmar una reserva personal.
- Revalidación antes de crear la orden PayPal.
- Canje únicamente después del pago confirmado.
- Regreso de una cancelación PayPal a la landing de origen cuando corresponda.

---

## Fuente: `CAMBIOS_LANDING_V2.md`

# Landing Machu Picchu + experiencias — ajustes V2

Fecha: 3 de agosto de 2026

## Archivos modificados

- `landing/machu-picchu-y-tours-peru.html`
- `assets/css/landing-machu-picchu-tours.css`
- `assets/js/pages/landing-machu-picchu-tours.js`
- `assets/data/landing-machu-picchu-tours.json`

## Cambios aplicados

- Hero con los videos existentes del index: `assets/videos/hero.mp4` y `assets/videos/hero-movil.mp4`.
- Orden móvil del hero: badge, imagen, título y beneficios.
- Nuevo título comercial y beneficios más visuales.
- Corrección del espacio entre logo, navegación y acciones en escritorio intermedio.
- Beneficios rápidos movidos debajo del encabezado del configurador.
- Título del configurador cambiado a “Da el primer paso para tu viaje”.
- Badge principal cambiado a “Bestseller”.
- Textos de incluidos de Machu Picchu actualizados.
- Campo obligatorio “Hotel o dirección de recojo en Cusco” agregado al modal de pasajeros y al objeto de pre-reserva.
- Eliminado el aviso “Recuperamos tu selección anterior”.
- Botón “Aplicar” del cupón compactado.
- Eliminada la sección duplicada “Qué incluye cada experiencia”.
- Agregados como complementos: Montaña de Colores, Valle Sagrado, Bienvenida Ancestral, Siete Lagunas del Ausangate y Valle Sur.
- Cards adicionales en móvil: imagen, nombre, precio y botón desplegable “Ver qué incluye”.
- Al añadir una experiencia se muestra el selector de fecha y la opción de quitarla.
- Sección SEO visible y ampliada, además de metadatos y datos estructurados complementarios.

## Validaciones realizadas

- Sintaxis JavaScript validada con `node --check`.
- JSON validado.
- Prueba de DOM y estilos en viewports de 1440 px y 390 px.
- En móvil, las cards se muestran en una columna, el contenido está colapsado inicialmente y se expande correctamente.
- El campo de recojo aparece como obligatorio en el modal de pasajeros.
- Separación calculada entre logo y navegación en escritorio de prueba: 20 px.

## Instalación

Copiar el contenido de este parche sobre la raíz del proyecto y aceptar el reemplazo de los cuatro archivos. No reemplaza ni modifica el header global, PayPal, cupones ni otros productos.

---

## Fuente: `CAMBIOS_LANDING_V3.md`

# Landing Machu Picchu + tours — V3

Cambios limitados a la landing:

- Opacidad verde del hero reducida aproximadamente 5 puntos para mostrar mejor el video.
- Imagen del hero ampliada horizontalmente y espacios laterales reducidos.
- Título del hero móvil ligeramente más pequeño.
- Viñetas del hero móvil con peso normal y menor tamaño.
- Cards informativas “Tours según tus fechas / Experiencias en Cusco y Lima / Una reserva y un pago” movidas debajo del configurador, las experiencias y el resumen.
- Estado inicial: 1 adulto, solo Machu Picchu Full Day seleccionado y total USD 399.00.
- Nueva clave de borrador para evitar recuperar selecciones antiguas de Humantay o Paracas.
- Orden de experiencias: Bienvenida Ancestral, Laguna Humantay, Montaña de Colores, Valle Sagrado, Siete Lagunas, Valle Sur y Paracas–Ica–Huacachina.
- SEO existente preservado: metadatos, canonical, Open Graph, Twitter Cards, TouristTrip, ItemList, FAQPage, contenido visible y preguntas frecuentes.
- Cache busting V3 en CSS y JavaScript.

---

## Fuente: `CAMBIOS_LANDING_V4.md`

# Landing Machu Picchu + Tours — V4

Cambios aplicados sobre V3:

- Hero con una capa verde ligeramente más transparente para mostrar mejor el video.
- Card principal de Machu Picchu con imagen horizontal y contenido debajo.
- Lista de servicios incluidos con círculos y check.
- Tours adicionales en tres columnas en escritorio, dos en tablet y una en móvil.
- Título del hero ligeramente más pequeño en móvil.
- Se mantiene la selección inicial de 1 adulto, 0 niños, únicamente Machu Picchu Full Day y total USD 399.00.
- Se incrementó la clave de borrador a V4 para no restaurar selecciones antiguas.
- Nueva versión inglesa completa en `/en/landing/machu-picchu-y-tours-peru.html`.
- Nuevo JSON inglés y JavaScript inglés para que formularios, validaciones, resumen, cupones y modales estén en inglés.
- `hreflang` español/inglés y canonical independiente para cada URL.

Archivos nuevos o modificados:

- `landing/machu-picchu-y-tours-peru.html`
- `en/landing/machu-picchu-y-tours-peru.html`
- `assets/css/landing-machu-picchu-tours.css`
- `assets/js/pages/landing-machu-picchu-tours.js`
- `assets/js/pages/landing-machu-picchu-tours-en.js`
- `assets/data/i18n/en/landing-machu-picchu-tours.json`

---

## Fuente: `CAMBIOS_LANDING_V5_PAYPAL_PT_STICKY.md`

# Landing Machu Picchu + Tours — V5

Fecha: 3 de agosto de 2026

## Escritorio
- Se conserva la estructura en dos columnas: configurador a la izquierda y resumen a la derecha.
- Las experiencias adicionales se muestran en dos tarjetas por fila dentro de la columna izquierda.
- El resumen queda fijo (sticky) durante el desplazamiento, con separación calculada según la altura real de la cabecera.
- Si el resumen supera la altura disponible, utiliza desplazamiento interno.
- Las reglas móviles existentes no fueron modificadas.

## Modal y datos de pasajeros
- La landing usa un modal de pasajeros con el mismo lenguaje visual del checkout de `product.html`.
- Solicita titular, documento, nacionalidad, fecha de nacimiento, WhatsApp, correo, idioma y hotel/dirección de recojo en Cusco.
- Permite completar o aplazar los datos de pasajeros adicionales.
- Antes del pago muestra una revisión final de servicios, fechas y total.

## PayPal y Apps Script
- El flujo ahora registra primero la pre-reserva mediante `createPreReservation`.
- Luego crea la orden mediante `createPayPalOrder` por el 100% del total calculado.
- Guarda código, correo y apellido en almacenamiento local antes de redirigir.
- Conserva el borrador para que la selección pueda recuperarse si el pago se cancela o se abandona.
- La redirección solo ocurre cuando el backend devuelve `approvalUrl`.

## Idiomas
- Se mantiene español.
- Se mantiene la versión inglesa completa.
- Se agregó la versión portuguesa completa en `/pt/landing/machu-picchu-y-tours-peru.html`.
- HTML, contenido comercial, JSON, JavaScript, calendarios, resumen, cupones, validaciones y modal están localizados.
- Se añadieron canonical, hreflang y sitemap para portugués.

## Archivos principales
- `landing/machu-picchu-y-tours-peru.html`
- `en/landing/machu-picchu-y-tours-peru.html`
- `pt/landing/machu-picchu-y-tours-peru.html`
- `assets/css/landing-machu-picchu-tours.css`
- `assets/css/landing-reservation-modal.css`
- `assets/js/pages/landing-machu-picchu-tours.js`
- `assets/js/pages/landing-machu-picchu-tours-en.js`
- `assets/js/pages/landing-machu-picchu-tours-pt.js`
- `assets/data/i18n/pt/landing-machu-picchu-tours.json`
- `sitemap.xml`

## Nota operativa
La integración de frontend utiliza la URL de Apps Script configurada en `assets/data/backend-config.json`. Para cobrar en vivo, el despliegue de Apps Script debe tener activas las acciones `createPreReservation` y `createPayPalOrder`, además de credenciales PayPal válidas en el entorno correspondiente.

---

## Fuente: `CAMBIOS_LANDING_V6_MODAL_COMPARTIDO_SCROLL.md`

# CAMBIOS LANDING V6 — modal compartido, campos internacionales y scroll

- La landing conserva la integración PayPal de V5.
- El modal de la landing usa el mismo sistema visual y la misma hoja compartida que los modales generales de producto.
- Nacionalidad ahora es una lista de países.
- WhatsApp ahora separa código internacional y número.
- Idioma permanece como lista desplegable.
- El botón final dice “Pagar” / “Pay” / “Pagar”.
- “Monto a pagar ahora” usa peso tipográfico normal en escritorio y móvil.
- Se corrigió el scroll del modal general de todos los product.html: la cabecera queda visible y el cuerpo puede desplazarse hasta los botones.
- Se enlazó la corrección en español, inglés, portugués, francés, alemán, italiano, chino y japonés para los productos generales.
- En la landing se aplicó en español, inglés y portugués.

---

## Fuente: `CAMBIOS_LANDING_V71_SOCIAL_SHARE.md`

# Landing V7.1 — imagen para compartir en WhatsApp y redes

Se modificaron únicamente los metadatos sociales de la landing en español, inglés y portugués.

## Imagen utilizada

`https://mycuscotrip.com/public/share-image-v2.jpg`

Es la misma imagen social utilizada por el index principal. Tiene formato JPEG y dimensiones 1200 × 630 px.

## Metadatos añadidos o corregidos

- `og:image`
- `og:image:secure_url`
- `og:image:type`
- `og:image:width`
- `og:image:height`
- `og:image:alt`
- `twitter:image`
- `twitter:image:alt`
- `og:locale:alternate`

No se modificaron estilos, JavaScript, PayPal, modales, precios ni contenido visual de la landing.

---

## Fuente: `CAMBIOS_LANDING_V7_CHECKOUT_PAYPAL.md`

# My Cusco Trip — Landing V7

Fecha: 3 de agosto de 2026

## Alcance

Corrección puntual del checkout de la landing `machu-picchu-y-tours-peru.html` en español, inglés y portugués. No se modificaron precios, tours, estructura del hero, cards ni lógica de selección.

## Cambios

1. **WhatsApp en una sola línea**
   - El selector de prefijo internacional y el número aparecen en la misma fila en escritorio y móvil.
   - El prefijo mantiene un ancho compacto de 76–78 px y el número usa el espacio restante.

2. **Pantalla de procesamiento al pagar**
   - El botón conserva el texto `Pagar / Pay / Pagar`.
   - Al pulsarlo se bloquea temporalmente la interfaz con un overlay, spinner y mensajes localizados:
     - Generando tu reserva.
     - Conectando de forma segura con PayPal.
   - Si ocurre un error, el overlay se cierra, el botón se reactiva y se muestra el mensaje del backend.

3. **Jerarquía y espaciado del resumen**
   - Se añadió separación entre las tarjetas de titular/recojo y el encabezado de Servicios.
   - El total final y el monto superior usan un peso medio para mejorar lectura sin verse excesivamente gruesos.
   - El código de reserva se muestra con un peso menor.

4. **Cancelación de PayPal**
   - La orden envía, además de los datos anteriores, la página de origen y URLs de retorno/cancelación.
   - Si el backend continúa enviando al usuario a `product.html`, `product.js` reconoce que la reserva nació en la landing y redirige a la landing correspondiente en ES/EN/PT.
   - La landing recupera la pre-reserva guardada en el navegador, restaura selección y pasajeros, abre directamente `Resumen de tu reserva` y deja disponible nuevamente el botón Pagar.
   - Se aceptan parámetros `payment/paypal` y `reservationCode/codigo/code` para mayor compatibilidad.

## Archivos modificados

- `assets/css/landing-reservation-modal.css`
- `assets/js/pages/landing-machu-picchu-tours.js`
- `assets/js/pages/landing-machu-picchu-tours-en.js`
- `assets/js/pages/landing-machu-picchu-tours-pt.js`
- `assets/js/pages/product.js`
- Landing HTML ES/EN/PT
- `product.html` en los ocho idiomas, únicamente para actualizar la versión de caché de `product.js`.

## Caché

Los recursos modificados usan la versión `20260803-7`.

## Validación pendiente en producción

Debe realizarse una prueba real de cancelación en PayPal con el Apps Script desplegado. El frontend contempla tanto el uso de la `cancelUrl` enviada al backend como un redireccionamiento de respaldo desde `product.html` en el mismo navegador.

---

## Fuente: `CAMBIOS_V35_NAV_HOTELES_QUOTE.md`

# Cambios V35 - Navegación, Hoteles y Quote Package

## Navegación principal
Se reestructuró el menú principal para dejar solo cinco opciones visibles:

1. Experiencias
   - Tours a Machu Picchu → `machu-picchu-tours.html`
   - Tours en Cusco → `cusco-tours.html`
   - Paquetes completos Cusco → `paquetes-cusco.html`
   - Paquetes completos Perú → `explora-peru.html`
2. Trekking
   - Camino Inca
   - Ruta Machu Picchu
   - Inca Jungle
3. Restaurantes → `/restaurantes/`
4. Hoteles → `hoteles.html`
5. Trenes → `/trenes/`

También se corrigió el comportamiento del dropdown en móvil para que al tocar Experiencias o Trekking se abra el submenú en lugar de navegar de inmediato.

## Nuevo HTML de hoteles
Se creó `hoteles.html` con vitrina de hoteles tipo cards. La información se carga desde:

`assets/data/hotels.json`

Cada hotel permite:
- Filtrar por destino.
- Buscar por nombre, destino, dirección o ubicación.
- Abrir un modal de detalle.
- Elegir fecha de entrada y salida.
- Elegir adultos, niños y tipo de habitación.
- Enviar solicitud de disponibilidad por WhatsApp.

Archivos nuevos:

- `hoteles.html`
- `assets/css/hoteles.css`
- `assets/js/pages/hoteles.js`

## Quote Package
Cambios realizados:

- El botón principal ahora dice solo `Reservar` tanto en escritorio como en móvil.
- Se cambió el verde del botón a un tono más claro.
- En móvil, el botón Imprimir queda con fondo gris claro, borde verde oscuro y letras verde oscuro.
- En el modal de hoteles, la opción sin hotel ahora es compacta y dice solo `Opción sin hotel` con precio `0.00` según la moneda seleccionada.
- Se redujeron las etiquetas/gadgets de características de hoteles en móvil.
- Se eliminó la repetición `Desayuno: Desayuno semi buffet`; ahora queda solo `Desayuno semi buffet`.
- En las tarjetas de tren del modal se quitaron textos de notas/capturas/rutas largas. Ahora quedan solo título, logo, salida, llegada y precio.
- En el recuadro de tren seleccionado, el logo de PeruRail/IncaRail ocupa todo el espacio asignado, sin padding blanco innecesario.

## Archivos modificados principales

- `components/header.html`
- `assets/js/components/header.js`
- `assets/css/header.css`
- `quote-packages.html`
- `assets/js/pages/quote-packages.js`
- `assets/css/quote-packages.css`
- `assets/data/ui-translations.json`
- `assets/data/i18n/*/ui-translations.json`

---

## Fuente: `CAMBIOS_V36_HOTELES_PAYPAL.md`

# Cambios V36 - Hoteles HTML

## Cambios visuales
- El título principal del hero queda en color blanco.
- Se eliminó el texto anterior del hero y se reemplazó por: “Tenemos la mejor selección de hoteles de todas las categorías para tu viaje por Cusco y Machu Picchu.”
- Se eliminó el recuadro “Reserva tipo vitrina”.
- Se eliminó la etiqueta “Catálogo”; queda solo “Hoteles disponibles”.
- El filtro de destinos muestra únicamente: Todos los destinos, Cusco, Aguas Calientes, Lima, Paracas / Ica, Arequipa, Puno y Uyuni.
- Se excluyen del filtro visible Tarapoto, Iquitos y Tambopata.

## Modal de hotel
- La cabecera del modal ahora es verde oscuro con texto blanco.
- El título ahora dice “Detalles de la reserva de hotel”.
- Se eliminó la ubicación duplicada superior.
- El bloque de fechas ahora se llama “Detalles de tu reserva”.
- Entrada mínima: mañana.
- Salida mínima: un día después de la entrada.
- Al cambiar la fecha de entrada, la fecha de salida se ajusta automáticamente al día siguiente.
- Las habitaciones/accommodaciones ya no aparecen al abrir el modal; primero se debe hacer clic en “Ver disponibilidad”.
- Después de ver disponibilidad, se muestran las habitaciones compatibles según adultos, niños y capacidad.
- Después de elegir habitación, el botón “Reservar” muestra el bloque de pago.

## PayPal y órdenes
- El HTML incluye PayPal en sandbox con `client-id=sb`.
- Para producción, reemplazar `sb` por el Client ID público real.
- El Secret ID no debe colocarse en el HTML.
- Para guardar órdenes en Google Sheet, usar `google-apps-script-hoteles.gs` y pegar la URL `/exec` en:

```js
window.MCT_HOTEL_APPS_SCRIPT_URL = "";
```

## Importante
El botón PayPal puede cobrar directamente, pero sin Apps Script no quedará una orden registrada en Google Sheet. Para que funcione como trenes, sí conviene usar Google Sheet + Apps Script.

---

## Fuente: `CAMBIOS_V37_HOTELES_MODAL.md`

# V37 - Mejoras Hoteles

## Color usado
Se aplicó el mismo tono base del overlay del hero de `quote-packages.html`:

- Verde base: `#062803`
- RGB: `6, 40, 3`
- Overlay recomendado: `rgba(6, 40, 3, 0.78)`
- Botón verde: `#1f7a45`

## Cambios aplicados

- Hero de hoteles con overlay verde igual al hero del cotizador.
- Botones `Ver hotel`, `Ver disponibilidad`, `Reservar` y `Continuar con PayPal` con verde unificado.
- Encabezado del modal en verde oscuro con texto blanco.
- Nombre del hotel queda en fondo blanco con letras verde oscuro.
- Estrellas y dirección quedan más pegadas al nombre del hotel.
- Galería del hotel ahora usa tamaño fijo y no se estira al crecer el modal.
- Galería con botones anterior/siguiente cuando hay más de una imagen.
- Después de elegir habitación y presionar `Reservar`, el sistema solicita:
  - nombres,
  - apellidos,
  - tipo de documento,
  - número de documento,
  - nacionalidad,
  - celular / WhatsApp,
  - correo.
- Recién después de completar esos datos aparece PayPal.
- Se eliminó el texto visible sobre configurar Google Sheet / Apps Script.
- Apps Script actualizado para guardar también los datos del titular.

## Imágenes de hoteles
No hay rutas rotas: todas las imágenes configuradas en `assets/data/hotels.json` existen físicamente.

Lo que sí existe es uso de imágenes repetidas/fallback. Estos hoteles necesitan imágenes propias para evitar que se repita la imagen de Cusco Boutique o el fallback de Cusco:

| Destino | Hotel | Imagen usada actualmente |
|---|---|---|
| Lima | Tierra Viva Miraflores | `assets/img/hotels/cusco-boutique/cover.jpg` |
| Arequipa | Catedral Boutique Arequipa | `assets/img/hotels/cusco-boutique/cover.jpg` |
| Arequipa | Hotel Riviera Arequipa | `assets/img/hotels/cusco-boutique/cover.jpg` |
| Puno | Hotel Conde de Lemos | `assets/img/hotels/cusco-boutique/cover.jpg` |
| Puno | Hotel Qalasaya | `assets/img/hotels/cusco-boutique/cover.jpg` |
| Tambopata | Tambopata Comfort Lodge | `assets/img/quote/fallbacks/cusco.jpg` |
| Tambopata | Tambopata Premium Eco Lodge | `assets/img/quote/fallbacks/cusco.jpg` |

Recomendación de carpetas para subir imágenes propias:

```text
assets/img/hotels/tierra-viva-miraflores/
assets/img/hotels/catedral-boutique-arequipa/
assets/img/hotels/hotel-riviera-arequipa/
assets/img/hotels/hotel-conde-de-lemos/
assets/img/hotels/hotel-qalasaya/
assets/img/hotels/tambopata-comfort-lodge/
assets/img/hotels/tambopata-premium-eco-lodge/
```

Cada hotel debería tener como mínimo:

```text
cover.jpg
1.jpg
2.jpg
3.jpg
```

---

## Fuente: `CAMBIOS_V38_HOTELES_UX_MODAL.md`

# V38 - Hoteles: mejoras UX/UI del modal de reserva

Cambios aplicados:

- Título del modal en mayúsculas y con mayor presencia visual.
- Menor espacio entre la barra superior del modal y la imagen del hotel.
- Slider de imágenes con esquinas redondeadas y tamaño estable.
- Nuevo selector de fechas tipo rango en un solo calendario: entrada + salida.
- Cálculo automático de noches: por ejemplo, “5 noches de alojamiento”.
- La disponibilidad ahora genera acomodaciones exactas según cantidad de pasajeros.
  - Ejemplo 3 pasajeros: triple, doble + simple, matrimonial + simple, 3 simples, etc., si existen en el JSON.
- Se eliminó el botón extra “Reservar”.
- Al elegir una acomodación aparece directamente el formulario del titular.
- Se eliminó el botón “Continuar con PayPal”.
- PayPal queda bloqueado hasta completar todos los datos obligatorios del titular.
- Botones principales usando el verde del overlay del hero: #062803.

Archivos modificados:

- hoteles.html
- assets/css/hoteles.css
- assets/js/pages/hoteles.js

---

## Fuente: `CAMBIOS_V39_HOTELES_MODAL_PREMIUM.md`

# Cambios V39 - Hoteles modal premium

- Rebalanceo del modal en PC: imagen + información del hotel a la izquierda; detalles de reserva a la derecha.
- Menos espacio entre barra superior e imagen.
- Slider con esquinas redondeadas y tamaño estable.
- Subtítulo destacado para Datos del titular de reserva.
- Campos del titular con estilo más fino, nacionalidad con listado de países y celular con código de país.
- Correo a ancho completo.
- Texto de bloqueo actualizado: “Completa los datos del titular de reserva para continuar al pago.”
- PayPal sigue oculto hasta completar todos los campos obligatorios.

---

## Fuente: `CAMBIOS_V40_HOTELES_AFINACION.md`

# V40 - Afinación modal de hoteles

## Cambios visuales y UX

- El primer clic del calendario ahora marca la fecha de entrada en verde oscuro inmediatamente.
- Al presionar **Ver disponibilidad**, el modal hace scroll automático hacia las acomodaciones disponibles.
- El mismo comportamiento se mantiene al elegir una acomodación: baja hacia los datos del titular.
- Se separó visualmente el radio button del texto en las cards de habitación.
- En escritorio, el formulario del titular queda más ordenado:
  - Nombres y apellidos en la primera fila.
  - Tipo y número de documento en la misma fila.
  - Nacionalidad en fila completa.
  - Celular / WhatsApp en fila completa, con más espacio para el número.
  - Correo en fila completa.
- En móvil se mantiene el diseño anterior, porque ya funcionaba correctamente.

## Estado actual de hoteles

Actualmente el catálogo de hoteles se alimenta desde:

`assets/data/hotels.json`

Las reservas generadas después del pago o registro manual se pueden enviar a Google Sheets mediante Apps Script configurando:

`window.MCT_HOTEL_APPS_SCRIPT_URL`

---

## Fuente: `CAMBIOS_V41_HOTELES_CALENDARIO_COMPACTO.md`

# V41 Hoteles - Calendario compacto

- El calendario del modal de hoteles ahora permanece oculto por defecto.
- Al tocar Entrada o Salida se abre un único calendario para seleccionar rango.
- Entrada y salida se muestran lado a lado en móvil.
- La estadía/noches queda debajo para ahorrar espacio.
- Se agregó botón OK para cerrar el calendario después de elegir el rango.
- Se mantiene el cálculo automático de noches y la disponibilidad por pasajeros.

---

## Fuente: `CAMBIOS_V42_HOTELES_VALIDACIONES.md`

# V42 – Hoteles: validaciones finales y nombres de habitaciones

## Cambios aplicados

1. Se eliminó el texto de ayuda del calendario:
   "Elige primero la entrada y luego la salida en el mismo calendario."

2. Los nombres de habitaciones ahora se muestran con formato de título:
   - Habitación Simple
   - Habitación Doble Twin
   - Habitación Matrimonial
   - Habitación Triple
   - Habitación Familiar

3. Validaciones del titular de reserva:
   - Nombres: solo letras, espacios y signos comunes de nombres.
   - Apellidos: solo letras, espacios y signos comunes de apellidos.
   - WhatsApp: solo números, máximo 15 dígitos.
   - Correo: debe tener formato de correo válido.
   - Documento:
     - Si el tipo es DNI: solo números y exactamente 8 dígitos.
     - Si es Pasaporte, Carnet de extranjería u Otro: permite texto alfanumérico.

4. PayPal sigue bloqueado hasta que todos los campos obligatorios sean válidos.

## Archivos modificados

- hoteles.html
- assets/js/pages/hoteles.js

---

## Fuente: `CAMBIOS_V43_HOTELES_CARPETA_MARKETPLACE.md`

# V43 - Organización y ruta marketplace de hoteles

## Organización nueva

La sección de hoteles ahora vive en:

```text
hoteles/
├── index.html
├── assets/
│   ├── css/
│   │   ├── main.css
│   │   ├── header.css
│   │   ├── footer.css
│   │   └── hoteles.css
│   ├── data/
│   │   └── hotels.json
│   ├── img/
│   │   ├── hotels/
│   │   ├── quote/
│   │   └── logos/
│   └── js/
│       ├── i18n.js
│       ├── components/header.js
│       └── pages/hoteles.js
├── components/
│   ├── header.html
│   └── footer.html
└── backend/
    └── google-apps-script-hoteles.gs
```

`hoteles.html` queda como redirección hacia `/hoteles/` para no romper enlaces antiguos.

## Barra marketplace

La barra del hero ahora tiene:

- Destino
- Buscar hotel
- Entrada
- Salida
- Categoría

Si el usuario no coloca fechas, se muestran hoteles según destino, nombre y categoría. Si coloca fechas, el filtro está preparado para revisar disponibilidad cuando exista información `availability` en cada hotel o cuando se conecte a Apps Script.

## Etapa marketplace recomendada

En primera etapa, el JSON puede seguir como catálogo público. La disponibilidad real debe pasar a Google Sheets mediante Apps Script.

Hojas sugeridas:

```text
Hotel_Users
Properties
Rooms
Availability
Hotel_Orders
Payments
```

La lógica ideal es:

```text
Hotelero inicia sesión
→ crea hotel/apartamento/habitación
→ crea habitaciones/tarifas
→ bloquea fechas
→ cliente busca por destino/fechas/categoría
→ se muestran alojamientos disponibles
→ cliente reserva y paga
→ la orden bloquea automáticamente esas fechas
```

Para 30 alojamientos, Apps Script + Google Sheets es viable como MVP.

---

## Fuente: `CAMBIOS_V44_HOTELES_HERO_MARKETPLACE.md`

# V44 - Hoteles: buscador con calendario compacto + marketplace hotelero inicial

## 1. Buscador del hero

La barra del hero ahora tiene:

- Destino
- Buscar hotel
- Entrada / Salida con calendario de rango compacto
- Categoría
- Botón Buscar

El calendario del hero replica el comportamiento del modal: se abre al tocar Entrada o Salida, se elige entrada y salida en el mismo calendario y se confirma con OK.

Reglas:

- Entrada mínima: mañana.
- Salida mínima: un día después de entrada.
- Si no se eligen fechas, se muestran hoteles por destino, nombre y categoría.
- Si se eligen fechas, se filtra según disponibilidad configurada en el hotel.

## 2. Fechas del hero conectadas al modal

Cuando el cliente elige fechas en el hero y luego abre un hotel, el modal toma automáticamente esas fechas como entrada y salida inicial.

El cliente puede modificarlas dentro del modal si desea.

## 3. Carpeta Hoteles consolidada

La sección principal vive en:

```text
hoteles/index.html
hoteles/assets/css/hoteles.css
hoteles/assets/js/pages/hoteles.js
hoteles/assets/data/hotels.json
```

`hoteles.html` en la raíz queda como redirección para no romper enlaces antiguos.

## 4. Marketplace hotelero inicial

Se agregaron páginas base:

```text
hoteles/registro-hotelero.html
hoteles/login-hotelero.html
hoteles/panel-hotelero.html
hoteles/assets/js/pages/hotel-marketplace.js
```

El panel permite empezar a visualizar:

- Registro de hotelero.
- Login demo.
- Crear alojamiento: hotel, apartamento o habitación.
- Crear habitación.
- Bloquear fechas.
- Definir modo de confirmación: instantánea o manual.

## 5. Apps Script marketplace

Se amplió:

```text
hoteles/backend/google-apps-script-hoteles-marketplace.gs
```

Nuevas acciones preparadas:

- register_owner
- create_property
- create_room
- block_dates
- update_confirmation_mode
- create_order

## 6. Archivos antiguos que puedes borrar

Como Hoteles ya vive dentro de `hoteles/`, puedes borrar estos archivos antiguos de la raíz si existen:

```text
assets/css/hoteles.css
assets/js/pages/hoteles.js
google-apps-script-hoteles.gs
```

No borres todavía:

```text
assets/data/hotels.json
assets/img/hotels/
```

porque el Quote Package todavía puede seguir usando el catálogo y fotos globales.

Tampoco borres:

```text
hoteles.html
```

porque funciona como redirección hacia `/hoteles/`.

## 7. PayPal: confirmación instantánea vs manual

Para confirmación instantánea se puede usar el flujo actual de captura inmediata.

Para confirmación manual tipo Airbnb se debe usar PayPal con autorización y captura posterior:

- El cliente autoriza el pago.
- La reserva queda pendiente de confirmación.
- El hotelero confirma desde su panel o enlace.
- El backend / Apps Script captura el pago autorizado.

Esto requiere backend/AppScript con Client Secret. El Secret nunca debe estar en HTML.

---

## Fuente: `CAMBIOS_V45_HOTELES_ADMIN_MARKETPLACE.md`

# V45 - Hoteles: hero, registro hotelero y panel marketplace

## Cambios visuales del index de hoteles

- Se corrigió el z-index del calendario del hero para que aparezca por encima de las cards de hoteles.
- Los campos Entrada y Salida ahora tienen el label fuera del botón, igual que Destino y Buscar hotel.
- En Categoría, el texto por defecto ahora es “Todas”.
- Se mantuvo el botón Buscar.

## Nuevas rutas profesionales

Se crearon nuevas rutas dentro de la carpeta hoteles:

- `hoteles/register-manager-hotel.html`
- `hoteles/login-admin-hotel.html`
- `hoteles/panel-admin-hotel.html`

Las rutas antiguas quedan como redirección para no romper enlaces:

- `hoteles/registro-hotelero.html` → `register-manager-hotel.html`
- `hoteles/login-hotelero.html` → `login-admin-hotel.html`
- `hoteles/panel-hotelero.html` → `panel-admin-hotel.html`

## Registro de administradores

El registro ahora permite elegir:

- Persona natural
- Empresa

Si se elige persona natural, se solicitan:

- Tipo de documento
- Número de documento
- Nacionalidad

Si se elige empresa, se solicitan:

- Razón social
- RUC

Nombres y apellidos se mantienen como datos del representante.

## Validaciones agregadas

- Nombres y apellidos: solo letras.
- DNI: solo números y 8 dígitos.
- RUC: solo números y 11 dígitos.
- Otros documentos: alfanuméricos.
- WhatsApp: solo números.
- Correo: formato válido de correo.
- Nacionalidad: lista desplegable de países.
- Celular: selector de código de país dentro del mismo campo.

## Login hotelero

- Nueva ruta: `login-admin-hotel.html`.
- Título: “Acceso para hoteles”.
- Fondo con imagen y overlay verde.
- Se eliminó texto informativo innecesario.
- Botón “Crear cuenta” alineado.

## Panel de administración

- Nueva ruta: `panel-admin-hotel.html`.
- Secciones por botones, no una debajo de otra:
  - Mi cuenta
  - Alojamientos
  - Bloquear fechas
  - Confirmación
- Mi cuenta muestra datos principales y botón para editar información.
- Crear alojamiento y crear habitación ahora abren modales.
- Bloquear fechas permite elegir alojamiento, habitación y motivo.
- Motivos disponibles:
  - Bloqueado por solicitud especial
  - Reserva confirmada
  - Mantenimiento programado

## Fotos

Las fotos no pueden guardarse directamente en GitHub desde el navegador. Opciones recomendadas:

1. Subirlas a Google Drive vía Apps Script y guardar la URL pública en Google Sheets.
2. Usar Cloudinary, Supabase Storage o Firebase Storage.
3. Usar URLs públicas manuales durante el MVP.

## Google Sheet recomendado

Hojas:

- `Hotel_Users`
- `Properties`
- `Rooms`
- `Availability`
- `Hotel_Orders`
- `Payments`
- `Photo_Assets`

## Disponibilidad

La hoja `Availability` debe guardar una fila por fecha bloqueada. Ejemplo:

- propertyId
- roomId
- date
- status
- source
- orderId

Cuando un cliente reserva desde Hoteles, Quote Package o un paquete, se debe insertar bloqueo de fechas con `source` distinto:

- `hoteles`
- `quote_package`
- `manual_owner`
- `package_booking`

---

## Fuente: `CAMBIOS_V46_HOTELES_REGISTRO_PANEL.md`

# V46 - Hoteles: registro, login y panel marketplace

## Registro `register-manager-hotel.html`

- Corregido el cambio dinámico entre Persona natural y Empresa.
- Persona natural muestra: tipo de documento, número de documento y nacionalidad.
- Empresa muestra: razón social y RUC.
- Agregada subsección `Datos de inicio de sesión`.
- Correo, contraseña y confirmar contraseña quedan al final del formulario.
- Contraseña con botón para ver/ocultar.
- Requisitos visuales de contraseña:
  - mínimo 8 caracteres,
  - una mayúscula,
  - un número,
  - un carácter especial,
  - confirmación coincidente.
- Validaciones:
  - nombres/apellidos solo letras,
  - RUC solo números de 11 dígitos,
  - DNI solo números de 8 dígitos,
  - WhatsApp solo números,
  - correo con formato válido.
- Fondo cambiado a imagen de Machu Picchu con overlay verde.

## Login `login-admin-hotel.html`

- Fondo cambiado a imagen de Machu Picchu con overlay verde.
- Contraseña con botón para ver/ocultar.
- Botón Crear cuenta centrado.

## Panel `panel-admin-hotel.html`

- Crear alojamiento ahora tiene destino como menú desplegable restringido a destinos operativos.
- Agregado campo de enlace de Google Maps.
- Cambiado `URL de portada` por `Página web del alojamiento`.
- Fotos del alojamiento exige mínimo 5 fotos o 5 URLs de galería.
- Agregada sección de Confirmación y comisión:
  - confirmación instantánea,
  - confirmación manual,
  - comisión My Cusco Trip: 10%, 15%, 20% o 30%.
- Crear habitación ahora incluye cantidad disponible y fotos/URLs de habitación.
- Confirmación del panel ahora muestra resumen y botón `Editar modo` en modal.

## Backend Apps Script

Actualizado `google-apps-script-hoteles-marketplace.gs` para guardar nuevos campos:

- mapUrl,
- website,
- commissionRate,
- photoCount,
- stock,
- roomGalleryJson,
- roomPhotoCount.

---

## Fuente: `CAMBIOS_V47_HOTELES_PANEL_SHEET.md`

# V47 - Panel hotelero + plantilla Google Sheet

## Cambios visuales y funcionales

### Panel de administración / Mi cuenta
- Se amplió la sección **Mi cuenta** para mostrar datos completos:
  - Tipo de cuenta
  - Nombres del representante
  - Apellidos del representante
  - Tipo y número de documento
  - Nacionalidad
  - Celular / WhatsApp
  - Correo
  - Página web
  - Razón social y RUC cuando aplique empresa
- Se agregó botón **Cambiar contraseña** con modal independiente.

### Crear alojamiento
- Se resaltó en negrita solamente la instrucción **Sube mínimo 5 fotos generales del alojamiento**.
- El texto de comisión quedó en estilo normal.
- Se agregó apoyo para ubicación:
  - campo de enlace de Google Maps,
  - botón **Usar mi ubicación** con geolocalización del navegador,
  - botón **Abrir Google Maps** para copiar/pegar enlace.

> Nota técnica: para elegir el punto dentro de un mapa embebido hace falta Google Maps Platform / Places API con API Key. Para MVP se deja enlace manual + geolocalización del navegador.

### Confirmación
- Se mejoró el texto de recomendación en la sección Confirmación.
- Se separó visualmente el bloque explicativo del resumen de alojamientos.
- El modal de edición de modo de confirmación ahora incluye la misma recomendación con texto ordenado.

### Apps Script
- Se agregó acción base `change_password`.
- Se mantiene la estructura de hojas:
  - Hotel_Users
  - Properties
  - Rooms
  - Availability
  - Hotel_Orders
  - Payments
  - Photo_Assets

## Plantilla de Google Sheet

Se agregó:

`hoteles/backend/mycuscotrip_hotel_marketplace_template.xlsx`

También se entrega como archivo independiente:

`mycuscotrip_hotel_marketplace_template.xlsx`

## Instrucciones rápidas Apps Script

1. Sube la plantilla `.xlsx` a Google Drive.
2. Ábrela con Google Sheets.
3. Ve a **Extensiones → Apps Script**.
4. Copia el contenido de:
   `hoteles/backend/google-apps-script-hoteles-marketplace.gs`
5. Guarda el proyecto.
6. Ejecuta manualmente `setupHotelMarketplaceSheets()` una vez.
7. Despliega como Web App:
   - Ejecutar como: tú
   - Acceso: cualquiera con el enlace
8. Copia la URL `/exec` y pégala en los HTML donde está:
   `window.MCT_HOTEL_MARKETPLACE_APPS_SCRIPT_URL = "";`

---

## Fuente: `CAMBIOS_V48_HOTELES_LOGIN_VERIFICACION.md`

# V48 - Hoteles: login real, verificación por correo y panel sin datos demo

## Correcciones aplicadas

### Registro de administrador de alojamientos
- Se corrigió el botón de ver/ocultar contraseña en:
  - Contraseña
  - Confirmar contraseña
- Al registrar una cuenta, el mensaje ahora indica:
  "Hemos enviado un correo de verificación a tu bandeja. Revisa ese correo para activar tu cuenta."
- El Apps Script ahora genera un token de verificación y envía un correo al usuario.
- Cuando el usuario abre el enlace del correo, la cuenta cambia a estado aprobado.

### Login hotelero
- Se corrigió el botón de ver/ocultar contraseña.
- El login ya no usa datos demo cuando existe Apps Script configurado.
- El login valida correo, contraseña y estado de cuenta contra Google Sheet.
- Si la cuenta no está aprobada/verificada, muestra advertencia.

### Panel de administración
- El panel ahora carga los datos reales del usuario logueado desde Google Sheet.
- Se eliminó el texto de placeholder que decía que al conectar Google Sheet aparecerían los hoteles.
- Si no existen alojamientos, se muestra solamente:
  "Aún no hay alojamientos registrados. Crea tu primer alojamiento para que aparezca en este panel."
- Se agregó botón Cerrar sesión.
- Al cerrar sesión se limpia localStorage y se vuelve al login.

### Apps Script
- Se agregaron acciones:
  - login_owner
  - get_owner
  - get_properties
  - verify_owner
- Se ampliaron cabeceras de Hotel_Users:
  - verificationToken
  - verifiedAt
  - sessionToken
  - lastLoginAt
- Se añadió envío de correo con MailApp.

## Instrucción importante
Después de copiar el nuevo Apps Script, ejecutar una vez:

setupHotelMarketplaceSheets()

Esto agregará columnas faltantes sin borrar datos existentes.

---

## Fuente: `CAMBIOS_V50_CONFIG_APPSCRIPT_PAYPAL.md`

# V50 · Configuración Apps Script y PayPal

## Cambios aplicados

- Se configuró la URL real del Apps Script en `hoteles/assets/js/config.js`.
- Se configuró el Client ID público de PayPal en `hoteles/assets/js/config.js`.
- Se reemplazó el `client-id=sb` del SDK de PayPal en `hoteles/index.html` por el Client ID real.
- Se actualizó la caché a `v=50` en los HTML del marketplace hotelero.
- También se reemplazó el PayPal sandbox de `quote-packages.html` por el mismo Client ID público indicado.

## Apps Script configurado

```text
https://script.google.com/macros/s/AKfycbx7zclo0SnYqT0NMP6Uph3oB9XbTGeIIoWj6hWZ7lx2s3ftWMmIpshJ-XtgjEuijsLN/exec
```

## PayPal Client ID configurado

```text
AUdRf58xVpVo-Iv_L_Je8UgE6ukF79cLynwRXUk3wU9WA4bfremVO0yRpkS3kFTUOE7O5ZOfoWMw8TlJ
```

## Archivo central

Desde ahora la conexión principal de hoteles se controla en:

```text
hoteles/assets/js/config.js
```

---

## Fuente: `CAMBIOS_V51_CONEXION_APPSCRIPT_RESTAURADA.md`

# V51 · Conexión Apps Script restaurada

Se comparó V48, V49 y V50. La V49/V50 centralizó la URL en `hoteles/assets/js/config.js`, pero eliminó la variable inline que antes era fácil de verificar en los HTML.

En esta versión se aplican ambas formas para evitar fallos:

- `hoteles/assets/js/config.js` contiene la URL `/exec`.
- `register-manager-hotel.html`, `login-admin-hotel.html` y `panel-admin-hotel.html` vuelven a declarar la URL inline antes de cargar `config.js` y `hotel-marketplace.js`.
- `hoteles/index.html` también usa la URL para reservas de hoteles.
- Se actualizó la caché a `?v=51`.

URL configurada:

```text
https://script.google.com/macros/s/AKfycbx7zclo0SnYqT0NMP6Uph3oB9XbTGeIIoWj6hWZ7lx2s3ftWMmIpshJ-XtgjEuijsLN/exec
```

PayPal Client ID configurado:

```text
AUdRf58xVpVo-Iv_L_Je8UgE6ukF79cLynwRXUk3wU9WA4bfremVO0yRpkS3kFTUOE7O5ZOfoWMw8TlJ
```

Archivos clave:

```text
hoteles/assets/js/config.js
hoteles/assets/js/pages/hotel-marketplace.js
hoteles/register-manager-hotel.html
hoteles/login-admin-hotel.html
hoteles/panel-admin-hotel.html
hoteles/index.html
```

---

## Fuente: `CAMBIOS_V52_APPSCRIPT_JSONP_CORREO.md`

# V52 · Corrección de conexión Apps Script y correo de verificación

## Problema detectado
El registro sí llegaba a Google Sheet, pero el navegador mostraba:

> No se pudo conectar con Google Sheet. Revisa la URL del Apps Script.

Esto ocurre porque Google Apps Script puede ejecutar la escritura correctamente, pero el navegador puede bloquear la lectura de la respuesta por CORS desde GitHub Pages.

## Solución aplicada
- Se cambió la comunicación del panel hotelero a JSONP para recibir respuesta real desde Apps Script sin error de CORS.
- Se corrigió un error de JavaScript en `hotel-marketplace.js` causado por una variable duplicada.
- Se actualizó el Apps Script para aceptar llamadas por JSONP usando `callback` y `payload`.
- Se agregó control de error para el envío del correo de verificación.
- Se agregó la función `testHotelVerificationEmail()` para autorizar MailApp.

## Archivos modificados
- `hoteles/assets/js/pages/hotel-marketplace.js`
- `hoteles/backend/google-apps-script-hoteles-marketplace.gs`
- `hoteles/register-manager-hotel.html`
- `hoteles/login-admin-hotel.html`
- `hoteles/panel-admin-hotel.html`
- `hoteles/index.html`
- `hoteles/assets/js/config.js`

## Pasos obligatorios en Apps Script
1. Copiar el nuevo contenido de `hoteles/backend/google-apps-script-hoteles-marketplace.gs`.
2. Guardar.
3. Ejecutar una vez `setupHotelMarketplaceSheets()`.
4. Ejecutar una vez `testHotelVerificationEmail()` para autorizar MailApp.
5. Volver a implementar como nueva versión de Web App.
6. Verificar que el acceso esté como `Cualquier usuario`.

## Nota
Si el registro se guarda pero no llega correo, revisar en Apps Script:
- Permisos de MailApp autorizados.
- Carpeta spam/promociones.
- Columna `verificationEmailError` en `Hotel_Users`.

---

## Fuente: `CAMBIOS_V53_HOTELES_LOADER_VERIFICACION.md`

# V53 - Hoteles: loader y verificación por dominio

## Cambios aplicados

1. Se agregó un loader genérico para acciones de usuario.
   - Muestra: “Un momento, por favor...”, “Enviando registro...”, “Validando acceso...” o “Guardando cambios...”.
   - Solo aparece cuando el usuario hace clic en acciones que requieren espera.
   - No aparece en cargas invisibles del panel.
   - Deshabilita temporalmente el botón para evitar doble envío.

2. Se ajustó la plantilla del correo de verificación.
   - Título actualizado: “Verifica tu cuenta para administración de alojamientos”.
   - Asunto actualizado con el mismo criterio.

3. Se corrigió el enlace de verificación.
   - Antes el correo abría directamente una URL de Apps Script.
   - Ahora abre una página propia dentro de Hoteles:
     `hoteles/verify-owner.html?token=...`
   - Esa página valida el token contra Apps Script y muestra una pantalla de éxito/error dentro del sitio.

4. Se agregó:
   - `hoteles/verify-owner.html`

5. Se actualizó el Apps Script para que `verify_owner` también responda por JSONP, necesario para GitHub Pages.

## Archivos modificados

- hoteles/assets/js/config.js
- hoteles/assets/js/pages/hotel-marketplace.js
- hoteles/backend/google-apps-script-hoteles-marketplace.gs
- hoteles/register-manager-hotel.html
- hoteles/login-admin-hotel.html
- hoteles/panel-admin-hotel.html
- hoteles/index.html
- hoteles/verify-owner.html

## Importante

Después de subir esta versión, reemplaza el Apps Script con el nuevo archivo:

`hoteles/backend/google-apps-script-hoteles-marketplace.gs`

Luego:

1. Ejecuta `setupHotelMarketplaceSheets()`.
2. Ejecuta `testHotelVerificationEmail()` para autorizar MailApp.
3. Implementa una nueva versión del Web App.
4. Mantén acceso como “Cualquier usuario”.

---

## Fuente: `CAMBIOS_V55_VERIFICACION_LOADER_DEFINITIVO.md`

# V55 - Verificación y loader definitivo

Cambios:
- El loader se oculta automáticamente al finalizar una acción y también tiene seguro de 30 segundos.
- El mensaje de resultado fuerza el cierre del loader para evitar bloqueos visuales.
- La página `hoteles/verify-owner.html` ya no depende de leer JSONP directamente; ahora usa un iframe oculto hacia Apps Script y recibe el resultado mediante `postMessage`.
- El Apps Script permite iframe con `setXFrameOptionsMode(ALLOWALL)` y envía el resultado de verificación a la página pública de MyCuscoTrip.
- Caché actualizada a `?v=55`.

---

## Fuente: `CAMBIOS_V56_VERIFICACION_JSONP_SUCCESS.md`

# V56 - Verificación JSONP y confirmación de registro limpia

- `verify-owner.html` deja de usar iframe/postMessage y verifica con JSONP directo al Apps Script.
- Esto usa el mismo mecanismo que ya funciona para registrar usuarios desde GitHub Pages.
- Al registrar correctamente, el formulario se limpia y se oculta.
- Se muestra una pantalla amable: “Revisa tu correo y verifica tu cuenta”.
- Se mantiene botón para ir al acceso y botón para registrar otra cuenta.
- Se actualizó caché a `?v=56`.

---

## Fuente: `CAMBIOS_V57_VERIFICACION_REDIRECT.md`

# V57 - Verificación por redirección segura y estable

## Problema detectado
La URL del Apps Script respondía correctamente al probar manualmente:

```js
test({"ok":false,"error":"Enlace no válido o ya usado."});
```

Eso confirma que el Apps Script estaba bien desplegado. El fallo estaba en la forma en que `verify-owner.html` intentaba leer la respuesta desde el dominio público.

## Corrección definitiva
Se reemplazó el intento de verificación por JSONP/iframe por un flujo de redirección:

1. El correo abre `https://www.mycuscotrip.com/hoteles/verify-owner.html?token=...`.
2. Esa página muestra “Verificando tu cuenta”.
3. Redirige al Apps Script con `action=verify_owner_redirect`.
4. Apps Script verifica el token en Google Sheet.
5. Apps Script redirige de vuelta a MyCuscoTrip con `status=success` o `status=error`.
6. `verify-owner.html` muestra el resultado final en el dominio propio.

## Archivos modificados

- `hoteles/verify-owner.html`
- `hoteles/backend/google-apps-script-hoteles-marketplace.gs`
- `hoteles/assets/js/config.js`
- `CAMBIOS_V57_VERIFICACION_REDIRECT.md`

## Importante
Después de copiar el nuevo Apps Script, se debe implementar una nueva versión del Web App.

---

## Fuente: `CAMBIOS_V58_VERIFICACION_DIRECTA.md`

# V58 - Verificación directa sin redirección a Apps Script

## Problema corregido
La V57 abría primero `verify-owner.html`, pero luego redirigía el navegador al Apps Script. En algunos navegadores/Gmail esa pantalla de Apps Script terminaba mostrando el error de Google Drive: `No se pudo abrir el archivo en este momento`.

## Solución
- `hoteles/verify-owner.html` ya no redirige al Apps Script.
- La página permanece siempre en el dominio `mycuscotrip.com`.
- La verificación se hace con JSONP directo contra el Web App.
- La URL `/exec` queda escrita directamente en `verify-owner.html` para evitar fallas por caché de `config.js`.
- El Apps Script ya no devuelve HTML en `verify_owner`; devuelve JSON/JSONP.
- El correo genera enlaces con `v=58`.

## Archivos modificados
- `hoteles/verify-owner.html`
- `hoteles/backend/google-apps-script-hoteles-marketplace.gs`
- `hoteles/assets/js/config.js`

---

## Fuente: `CAMBIOS_V59_LOGIN_APPSCRIPT_PAYLOAD.md`

# V59 - Corrección login Apps Script y payload JSONP

## Problema corregido
El registro y verificación funcionaban, pero el login podía mostrar:

> No se pudo cargar el Apps Script. Revisa la URL /exec y los permisos de implementación.

La causa probable era la forma en que el frontend enviaba el `payload` JSON por URL y cómo Apps Script lo decodificaba. Apps Script ya entrega `e.parameter.payload` decodificado; hacer `decodeURIComponent()` nuevamente puede romper la lectura cuando existen caracteres especiales en contraseñas o datos.

## Cambios
- `hotel-marketplace.js`: ahora construye la URL JSONP con `URLSearchParams`, sin doble codificación manual.
- `google-apps-script-hoteles-marketplace.gs`: ahora primero intenta `JSON.parse(params.payload)` y solo usa `decodeURIComponent` como respaldo.
- Se actualizó cache a `?v=59` en páginas de hoteles.

## Archivos modificados
- `hoteles/assets/js/pages/hotel-marketplace.js`
- `hoteles/backend/google-apps-script-hoteles-marketplace.gs`
- `hoteles/assets/js/config.js`
- `hoteles/register-manager-hotel.html`
- `hoteles/login-admin-hotel.html`
- `hoteles/panel-admin-hotel.html`
- `hoteles/index.html`
- `hoteles/verify-owner.html`

---

## Fuente: `CAMBIOS_V61_PANEL_ALOJAMIENTOS_UX.md`

# V61 - Panel de alojamientos UX

## Cambios principales

- El panel abre primero en **Administrar alojamientos** después del login.
- Registro hotelero bloquea duplicados por:
  - correo,
  - número de documento,
  - RUC.
- Crear alojamiento:
  - limpia el formulario cada vez que se abre como nuevo alojamiento,
  - elimina botón “Abrir Google Maps”,
  - mantiene “Usar mi ubicación actual”,
  - agrega vista previa de mapa embebido cuando hay ubicación,
  - elimina campo “URLs de galería”,
  - cambia texto de fotos a recomendación de 5 fotos,
  - exige mínimo 1 foto al crear,
  - muestra vista previa de imágenes seleccionadas.
- Cards de alojamientos:
  - nombre del alojamiento más visible,
  - tipo/categoría como dato secundario,
  - botones “Editar alojamiento” y “Crear habitación” dentro de cada card.
- Crear habitación:
  - se abre desde la card del alojamiento,
  - ya no pide seleccionar alojamiento,
  - título dinámico “Crear habitación - Nombre del alojamiento”,
  - tipo de habitación como desplegable,
  - capacidad adultos y niños,
  - servicios incluidos con checkboxes,
  - elimina campo URLs de fotos,
  - muestra vista previa de imágenes seleccionadas.
- Backend:
  - agrega `update_property`,
  - guarda datos por encabezado para evitar columnas desplazadas,
  - agrega columnas nuevas a `Rooms` y `Properties` sin borrar datos existentes.

## Archivos modificados

- `hoteles/panel-admin-hotel.html`
- `hoteles/assets/js/pages/hotel-marketplace.js`
- `hoteles/assets/css/hoteles.css`
- `hoteles/backend/google-apps-script-hoteles-marketplace.gs`
- `CAMBIOS_V61_PANEL_ALOJAMIENTOS_UX.md`

## Nota importante sobre imágenes

En esta versión las imágenes seleccionadas se muestran como vista previa y se guardan como conteo/nombres en la hoja. Para almacenar los archivos reales se necesita implementar subida a Google Drive o a un servicio de storage como Cloudinary/Supabase/Firebase.

---

## Fuente: `CAMBIOS_V61_RESTAURACION_MODAL.md`

# My Cusco Trip — V6.1 Restauración del modal

## Motivo
La V6 añadió `passenger-reservation-modal-v6.css`, una hoja global que reemplazó colores, tamaños, espaciados, anchos y disposición del modal original. Esto deformó el modal general en `product.html`, especialmente en escritorio y móvil.

## Corrección
- Se retiró esa hoja global de todos los `product.html` y de las tres landings.
- Los `product.html` vuelven a utilizar exactamente el diseño existente en `product-page.css`.
- Se añadió `passenger-modal-scroll-fix.css`, que solo convierte el cuerpo del modal en un área desplazable y no modifica el diseño.
- La landing conserva las mejoras funcionales de V6: países, prefijo telefónico, idiomas, resumen y PayPal.
- El modal de la landing usa nuevamente `landing-reservation-modal.css`, con scroll interno y monto sin negrita.
- Al abrir el modal o pasar al resumen, el scroll interno vuelve al inicio.

## Archivos principales
- `assets/css/passenger-modal-scroll-fix.css`
- `assets/css/landing-reservation-modal.css`
- `product.html` y versiones idiomáticas
- `landing/machu-picchu-y-tours-peru.html`
- `en/landing/machu-picchu-y-tours-peru.html`
- `pt/landing/machu-picchu-y-tours-peru.html`
- JavaScript ES, EN y PT de la landing

## Importante
El archivo antiguo `assets/css/passenger-reservation-modal-v6.css` puede permanecer en el repositorio, pero ya no está enlazado. Se puede eliminar después sin afectar el funcionamiento.

---

## Fuente: `CAMBIOS_V62_MACHU_PICCHU_CLASICO_CHECKOUT_TRENES.md`

# Cambios V62 - Machu Picchu Full Day Clásico: checkout, trenes y contenido comercial

## Archivos modificados
- `assets/data/tours-machu-picchu.json`
- `assets/js/pages/product.js`
- `assets/css/product-page.css`
- `product.html`
- `en/product.html`, `pt/product.html`, `fr/product.html`, `de/product.html`, `it/product.html`, `zh/product.html`, `ja/product.html`

## Cambios principales

### 1. Recuperación de reserva cuando PayPal se cancela
- Si PayPal devuelve a `product.html?payment=cancelled&reservationCode=...` sin `slug`, la página ahora intenta recuperar la pre-reserva desde `localStorage`/`sessionStorage` usando el código.
- Si encuentra la reserva, reconstruye el `slug`, actualiza la URL y muestra la experiencia correcta.
- Se muestra un aviso dentro del panel de reserva indicando que el pago no se completó, pero que la pre-reserva se mantiene guardada en ese navegador.
- Antes de redirigir a PayPal, se guarda una copia local de la reserva y otra copia de pago pendiente.

### 2. Modal de pasajeros mejorado
- El modal ahora usa el título “Detalles de reserva”.
- El código de reserva y la fecha de generación se mantienen, con fecha en tamaño pequeño.
- El campo WhatsApp ahora tiene selector de código de país.
- Antes de enviar a PayPal, el usuario pasa por un paso de revisión: experiencia, fecha, pasajeros, trenes, extras, total, monto a pagar ahora y saldo pendiente.
- Si hay pasajeros adicionales pendientes, el resumen lo indica claramente.

### 3. Machu Picchu Full Day Clásico afinado
- Nuevo resumen comercial solicitado.
- Capacidad actualizada a máximo 12 viajeros por grupo.
- Idiomas: español, inglés y otros idiomas bajo consulta.
- “Reserva online con cálculo automático” cambiado a “Reserva online y confirmación instantánea”.
- Se eliminó visualmente la sección de “Aspectos destacados” para este producto.
- Incluye, no incluye, recojo, punto de encuentro e información importante actualizados.
- Itinerario full day con horas aproximadas y estilo de timeline.

### 4. Upgrade de trenes por modal
- En el summary ya no se muestran selects cargados ni texto repetido de tren turístico.
- Se muestran solo tren de ida, tren de retorno y botón “Upgrade de trenes”.
- Al hacer clic se abre un modal con logo de compañía, horario, estación, ruta y excedente por persona.
- Trenes de ida filtrados entre 05:00 y 08:00.
- Trenes de retorno filtrados entre 18:00 y 22:00.
- Excluidos: Hiram Bingham, First Class y tren local.
- Si se elige ida Inca Rail, el retorno muestra Inca Rail; si se elige ida PeruRail, el retorno muestra PeruRail.
- El excedente se calcula por diferencia positiva contra el tren base, sin descontar si un tramo más barato compensa otro más caro.

### 5. Extras de almuerzo excluyentes
- Solo se puede elegir una opción de almuerzo:
  - Tinkuy buffet lunch by Belmond Sanctuary Lodge: USD 48.90 p/p.
  - Almuerzo turístico en Full House Machu Picchu: USD 25.90 p/p.
- Se agregó opción “Sin almuerzo adicional”.

---

## Fuente: `CAMBIOS_V65_MODAL_SUMMARY_TRENES.md`

# Cambios V65 - Corrección layout summary, modal trenes y modal pasajeros

- Corrige los recuadros de trenes en el summary para que no queden reducidos ni con espacio vacío lateral.
- En desktop muestra tren de ida y tren de retorno lado a lado, con el botón Upgrade de trenes centrado debajo.
- Elimina el texto/summary técnico debajo del botón de upgrade.
- Corrige el modal de trenes eliminando el bloque vacío superior y alineando trenes desde arriba.
- Ajusta logos de PeruRail/Inca Rail en tarjetas de tren para que llenen mejor el contenedor, con bordes redondeados.
- Corrige el modal de pasajeros quitando la franja verde vacía del encabezado.
- Vuelve a mostrar correctamente el resumen lateral de la reserva, que estaba oculto por una regla CSS con selector ID.
- Mejora alineación, tarjetas, botones y estructura del modal de pasajeros.

---

## Fuente: `CAMBIOS_V75_MOBILE_TRENES.md`

# Cambios V75 - Modal de trenes en móvil

- Ajuste solo para vista móvil del modal de upgrade de trenes en `product.html`.
- Cards de tren en móvil reorganizadas con estilo tipo selector premium:
  - título y compañía arriba,
  - salida, duración y llegada en una fila visual,
  - cargo adicional / incluido en una sola línea inferior,
  - card expandida con imagen, características y botón de selección.
- Cards seleccionadas en móvil más compactas y mejor distribuidas.
- Footer del modal móvil con botones `Cancelar` y `Aplicar` en la misma línea.
- El botón `Aplicar selección` en móvil se muestra como `Aplicar` para evitar que el texto se salga del botón.
- No se modificó la vista desktop del modal.
- Se actualizó cache de `product.html` a `v=75`.

---

## Fuente: `CAMBIOS_V76_MOBILE_CHECKOUT_TRENES.md`

# Cambios V76 - Mobile checkout y modal de trenes

Cambios aplicados solo para mejorar la vista móvil del producto y del modal de upgrade de trenes.

## Modal upgrade de trenes - móvil
- Ajuste de cards para que salida, duración y llegada queden en la misma fila visual.
- Reducción de tamaños de texto y badges para evitar cortes en móvil.
- Badge de cargo adicional/incluido en una sola línea visual.
- Cards expandidas mantienen imagen, características y botón de selección.
- Botones Cancelar y Aplicar conservados en la misma línea.

## Modal pasajeros / resumen - móvil
- Botones Cancelar / Continuar y Cancelar / Pagar forzados en una misma línea.
- Se reduce separación de acciones con el formulario.
- Datos de pasajeros en resumen reorganizados: título del pasajero arriba, nombre/pendiente debajo y documento debajo.
- Trenes en resumen separados en una línea para ida y otra para retorno.
- Ocultado el título duplicado interno del resumen.

## iPhone / Safari
- Se fuerza `font-size: 16px` en campos del modal para evitar zoom automático al enfocar inputs/selects.

## Cache
- `product.html` actualizado a `v=76` para CSS y JS.

---

## Fuente: `CAMBIOS_V77_AJUSTE_TAMANOS_TRENES_MOVIL.md`

# Cambios V77 - Ajuste fino móvil del modal de trenes

Se aplicaron únicamente ajustes visuales para vista móvil del modal de upgrade de trenes.

## Cambios

- Se redujo ligeramente el tamaño de las horas de salida y llegada dentro de las cards móviles.
- Se redujo el tamaño del badge inferior de cargo adicional / incluido.
- Se redujo el tamaño de `Incluido` y de `+ USD ...` para que no se vea tan grande.
- Se ajustó también el tamaño del texto `Cargo adicional` dentro del badge.
- No se tocó la vista de escritorio.
- Se actualizó `product.html` a `v=77` para forzar recarga de CSS/JS.

## Archivos modificados

- `product.html`
- `assets/css/product-page.css`

---

## Fuente: `CAMBIOS_V78_SEARCHBAR_COTIZADOR_HOME.md`

# Cambios V78 - Search bar conectado al cotizador

## Objetivo
Conectar la barra principal del home con el flujo comercial definido para MyCuscoTrip:

- Tab **Tours**: mantiene navegación directa a la ficha del producto seleccionado.
- Tab **Paquetes completos**: envía al usuario a `quote-packages.html` con parámetros precargados.

## Archivos modificados

- `components/search-bar.html`
- `assets/js/components/search-bar.js`
- `assets/js/pages/quote-packages.js`
- `assets/data/ui-translations.json`

## URLs generadas para paquetes

Ejemplo:

```txt
quote-packages.html?source=home-search&intent=cusco-magico-5d4n&adultos=2&ninos=0&arrivalTime=09%3A00&departureTime=20%3A00&fechaInicio=2026-07-10&fechaFin=2026-07-14&days=5&nights=4
```

## Parámetros que lee quote-packages.html

- `source`
- `intent`
- `adultos` / `adults`
- `ninos` / `children`
- `fechaInicio` / `startDate`
- `fechaFin` / `endDate`
- `days`
- `nights`
- `arrivalTime`
- `departureTime`
- `currency`
- `nationality`

## Presets de paquetes

- `machu-picchu-overnight-2d1n` → 2 días / 1 noche
- `cusco-machu-picchu-3d2n` → 3 días / 2 noches
- `cusco-magico-5d4n` → 5 días / 4 noches

## Nota importante

El tab **Tours** no se envía al cotizador de paquetes porque muchos tours son Full Day / 0 noches, y `quote-packages.html` está diseñado para paquetes con noches de alojamiento. Esto evita romper el flujo actual.

---

## Fuente: `CAMBIOS_V79_SEARCHBAR_COTIZADOR_REFINADO.md`

# CAMBIOS V79 - Search bar refinado y conectado al cotizador

## Archivos modificados

- `components/search-bar.html`
- `assets/js/components/search-bar.js`
- `assets/js/pages/quote-packages.js`
- `assets/js/pages/product.js`
- `assets/data/ui-translations.json`

## Cambios principales

### 1. Pestaña Tours

Se reemplazó la lista corta por una lista comercial enfocada:

- Machu Picchu Full Day Clásico
- Machu Picchu Full Day Express
- Machu Picchu Overnight 2D/1N
- Machu Picchu Panorámico
- Machu Picchu Luxury Hiram Bingham
- Bienvenida a Cusco
- Todos los tours de Machu Picchu
- Todos los tours de Cusco

Cada producto directo abre `product.html` con parámetros de búsqueda:

```txt
product.html?slug=...&source=home-search&intent=...&adultos=2&ninos=0&fecha=YYYY-MM-DD
```

Las opciones “Todos los tours” abren `all-experiences.html` con filtro por destino:

```txt
all-experiences.html?destino=machu-picchu&tipo=tour
all-experiences.html?destino=cusco&tipo=tour
```

### 2. Carga de fecha y pasajeros en producto

`assets/js/pages/product.js` ahora lee desde la URL:

- `fecha` / `fechaInicio`
- `adultos` / `adults`
- `ninos` / `niños` / `children`
- `departureTime` / `horaSalida`

Y precarga el calendario, adultos, niños y precios del producto.

### 3. Pestaña Paquetes completos

Se agregaron estas opciones:

- Machu Picchu 2 días / 1 noche
- Cusco Machu Picchu 3 días / 2 noches
- Cusco Valle Machu Picchu 4 días / 3 noches
- Cusco Valle Machu Picchu 5 días / 4 noches
- Cusco Valle Machu Picchu 6 días / 5 noches
- Paquete personalizado Cusco Machu Picchu
- Unión Ancestral en los Andes / Matrimonio Andino

### 4. Fechas inteligentes

Para paquetes con duración fija, el usuario elige solo la fecha de inicio.
La fecha final se calcula automáticamente:

- 2D/1N: +1 noche
- 3D/2N: +2 noches
- 4D/3N: +3 noches
- 5D/4N: +4 noches
- 6D/5N: +5 noches

Para `Paquete personalizado Cusco Machu Picchu` y `Unión Ancestral en los Andes / Matrimonio Andino`, el calendario se mantiene como rango para que el cliente elija fecha de llegada y fecha de salida.

### 5. Cotizador `quote-packages.html`

`quote-packages.js` ahora reconoce más intenciones comerciales desde el home:

- `machu-picchu-2d1n`
- `cusco-machu-picchu-3d2n`
- `cusco-valle-machu-picchu-4d3n`
- `cusco-valle-machu-picchu-5d4n`
- `cusco-valle-machu-picchu-6d5n`

También se agregó un respaldo mínimo para Machu Picchu 2D/1N si el generador automático no devuelve una ruta compatible.

## Notas

- Se corrigió una duplicación de variable `baseAdult` en `quote-packages.js`.
- Se agregaron traducciones nuevas en `ui-translations.json`.

---

## Fuente: `CAMBIOS_V80_PRINT_FORMAT.md`

# Cambios V80 - Formato de impresión y precio por pasajero

- Se mejora el formato imprimible del product HTML.
- Se agrega descripción debajo del título.
- Se agrega banner con imagen principal del tour.
- Se ajusta destino del Machu Picchu Full Day Clásico a Centro arqueológico de Machu Picchu.
- Se agrega precio final por pasajero al summary y a la impresión.
- Se reorganiza bloque de pago: fecha de cotización, fecha de viaje, pasajeros, modo de pago, precio por pasajero, total de servicios, descuento y monto total a pagar.
- Si se selecciona almuerzo como extra, aparece como almuerzo incluido en la impresión.
- Se mantiene la guía profesional como: español, inglés (otros idiomas, consultar).

---

## Fuente: `CAMBIOS_V81_PRINT_FORMAT.md`

# CAMBIOS V81 - Formato de impresión Product HTML

## Objetivo
Ajustar el formato de impresión del `product.html` sin alterar la lógica de reserva ni el modal de trenes.

## Cambios

1. **Descripción movida**
   - La descripción ya no aparece debajo del título principal.
   - Ahora aparece después de la sección **Itinerario según tu selección**, en una sección propia llamada **Descripción**.

2. **Imágenes del tour**
   - Se reemplazó el banner único por una grilla de 3 imágenes.
   - Usa la imagen principal y las dos primeras imágenes de galería del tour.
   - Las imágenes tienen bordes redondeados y formato estático tipo recuadros.

3. **Itinerario y paginación**
   - Se compactó el itinerario para reducir el salto completo a la segunda hoja.
   - Se permitió que la sección de itinerario pueda partir entre páginas si es necesario, evitando que toda la sección se empuje completa a la página 2.
   - Se ajustaron márgenes de impresión A4 para que la segunda hoja tenga margen superior correcto.

4. **Cache**
   - `product.html` actualizado a `v=81` para CSS y JS.

## Archivos modificados

- `product.html`
- `assets/css/product-page.css`
- `assets/js/pages/product.js`

---

## Fuente: `CAMBIOS_V82_PRINT_PRECIO_90.md`

# CAMBIOS V82 - Formato de impresión y precio .90

## Archivos modificados
- `product.html`
- `assets/css/product-page.css`
- `assets/js/pages/product.js`

## Cambios aplicados

### Formato de impresión
- Se refuerza el logo sobre el texto **ITINERARIO DE VIAJE** para que vuelva a mostrarse en la impresión.
- Se agregan secciones nuevas:
  - **No incluye**
  - **Información importante**
- El bloque **Monto total a pagar** se destaca con mayor tamaño.
- El footer ahora indica:
  - que los horarios finales se confirmarán según disponibilidad operativa,
  - que la cotización tiene vigencia de 2 días hábiles,
  - que pasado ese plazo debe volver a cotizarse.

### Precio desde / precio base
- Para Machu Picchu Full Day Clásico, el precio base por pasajero se redondea visualmente y operativamente a terminación `.90`.
- Ejemplo: `448.38` pasa a mostrarse como `448.90`.

### Cache
- `product.html` actualizado a `v=82` para forzar recarga de CSS y JS.

---

## Fuente: `CAMBIOS_V83_PRINT_HORAS_QR.md`

# CAMBIOS V83 - Formato de impresión: horas, URL y QR

## Cambios aplicados

1. Horarios del itinerario en impresión
   - Se normalizan las horas al formato `04.00 a.m.` / `08.20 p.m.`.
   - El texto `(approx.)` aparece debajo de la hora, en una segunda línea.
   - Este cambio aplica solo al formato de impresión.

2. Trenes seleccionados en impresión
   - Las horas de salida y llegada de trenes también se muestran con formato a.m. / p.m.
   - Ejemplo: `Ollantaytambo 06.40 a.m. → Machu Picchu 08.01 a.m.`.

3. URL y QR para reservar
   - Debajo de Información importante se agrega la sección: `Puedes reservar este itinerario en:`.
   - Se muestra el URL del producto con su slug.
   - Se genera un QR usando el URL del producto para facilitar la reserva desde celular.

4. Cache
   - `product.html` actualizado a `v=83` para CSS y JS.

## Archivos modificados

- product.html
- assets/css/product-page.css
- assets/js/pages/product.js

---

## Fuente: `CAMBIOS_V84_OVERNIGHT_QR.md`

# Cambios V84 - QR robusto y Machu Picchu Overnight Clásico

## QR en formato de impresión
- Se mantiene el QR existente, pero ahora la impresión espera a que las imágenes del formato imprimible terminen de cargar antes de abrir el diálogo de impresión.
- Esto evita que el QR aparezca como un cuadrado blanco cuando la API externa del QR tarda unos milisegundos más en responder.

## Machu Picchu Overnight Clásico
- Se habilitó la estructura especial de precio para `machu-picchu-overnight-clasico`.
- Se usa lógica similar al Machu Picchu Full Day Clásico:
  - base neta por pasajero,
  - guía prorrateada como costo fijo de grupo,
  - PayPal 5.4% + USD 0.30,
  - retiro bancario 3%,
  - buffer para 10% de descuento por pago completo,
  - redondeo final a `.90`.
- Se agregó costo hotelero incluido:
  - USD 45 para 1 pasajero,
  - USD 22.50 por pasajero desde 2 pasajeros.

## Trenes Overnight
- Tren por defecto de ida: Inca Rail The Voyager 16:36 Ollantaytambo → Machu Picchu.
- Tren por defecto de retorno: Inca Rail The Voyager 20:20 Machu Picchu → Cusco.
- Ida permite trenes comerciales disponibles durante el día.
- Retorno permite trenes desde las 15:00 en adelante.
- Mantiene el mismo modal y estilo del upgrade de trenes.

## Hotel Overnight
- Se agregó alojamiento incluido en Aguas Calientes.
- Hotel por defecto: Hotel Luz Garden Machu Picchu 3 estrellas.
- Se habilita opción de upgrade de hotel usando el selector de hoteles existente.

## Archivos modificados
- `product.html`
- `assets/js/pages/product.js`
- `assets/data/tours-machu-picchu.json`

---

## Fuente: `CAMBIOS_V85_OVERNIGHT_CLASICO.md`

# Cambios V85 - Machu Picchu Overnight Clásico

- Corrige hotel incluido para que Hotel Luz Garden aparezca con cargo 0 / incluido.
- Elimina opción sin alojamiento para este producto.
- Calcula upgrade de hotel restando el crédito incluido del alojamiento base.
- Fuerza visibilidad del upgrade de trenes en el summary del producto.
- Actualiza itinerario detallado de Día 1 y Día 2.
- Agrega hotel seleccionado con 3 imágenes al formato de impresión.
- Mantiene estructura de precios redondeada y precio final por pasajero.

---

## Fuente: `CAMBIOS_V86_OVERNIGHT_TRENES_ITINERARIO.md`

# Cambios V86 - Overnight clásico: trenes e itinerario visual

## Archivos modificados
- `product.html`
- `assets/js/pages/product.js`
- `assets/css/product-page.css`

## Cambios
1. Se fuerza la visibilidad del bloque **Upgrade de trenes** para `machu-picchu-overnight-clasico`.
2. Se define configuración de trenes overnight:
   - Ida por defecto: `INCA_OLLA_MAPI_VOYAGER_1636_OLLANTAYTAMB`.
   - Retorno por defecto: `INCA_MAPI_CUSCO_VOYAGER_2020_MACHU_PICCHU`.
   - Retornos disponibles desde las 15:00.
   - Compañías permitidas: Inca Rail y PeruRail.
3. Se refuerza el modal de hotel para Overnight:
   - Sin opción “sin alojamiento”.
   - Hotel Luz Garden queda como “Hotel incluido en el precio”.
   - Los upgrades se calculan descontando el crédito incluido del alojamiento base.
4. Se agregó un render especial del itinerario del Overnight con estilo visual tipo timeline, agrupado por Día 1 y Día 2.
5. Se actualizó cache de `product.html` a `v=86`.

## Rutas de imágenes recomendadas
- Imágenes del tour Overnight:
  - `assets/img/tours/machu-picchu-overnight-clasico/cover.jpg`
  - `assets/img/tours/machu-picchu-overnight-clasico/1.jpg`
  - `assets/img/tours/machu-picchu-overnight-clasico/2.jpg`
  - `assets/img/tours/machu-picchu-overnight-clasico/3.jpg`

- Hotel Luz Garden:
  - `assets/img/hotels/luz-garden/cover.jpg`
  - `assets/img/hotels/luz-garden/1.jpg`
  - `assets/img/hotels/luz-garden/2.jpg`
  - `assets/img/hotels/luz-garden/3.jpg`

- Hotel Vista Machu Picchu:
  - `assets/img/hotels/vista-machu-picchu/cover.jpg`
  - `assets/img/hotels/vista-machu-picchu/1.jpg`
  - `assets/img/hotels/vista-machu-picchu/2.jpg`
  - `assets/img/hotels/vista-machu-picchu/3.jpg`

---

## Fuente: `CAMBIOS_V87_OVERNIGHT_IMAGENES.md`

# CAMBIOS V87 — Imágenes Machu Picchu Overnight Clásico

## Problema detectado
El producto `machu-picchu-overnight-clasico` sí tenía configurada la ruta de carpeta del tour, pero el JSON seguía apuntando así:

- `images.cover`: `./assets/img/tours/machu-picchu-overnight-clasico/cover.jpg`
- `images.gallery`: placeholders genéricos `./assets/img/placeholder/experience.jpg`

Por eso, aunque se subieron correctamente estas imágenes y cargaban por URL pública:

- `assets/img/tours/machu-picchu-overnight-clasico/1.jpg`
- `assets/img/tours/machu-picchu-overnight-clasico/2.jpg`

el `product.html` no las mostraba, porque el producto no busca automáticamente imágenes dentro de la carpeta; solo renderiza las rutas declaradas en `assets/data/tours-machu-picchu.json` o en el JSON del idioma activo.

## Corrección aplicada
Se actualizó el producto Overnight Clásico en:

- `assets/data/tours-machu-picchu.json`
- `assets/data/i18n/de/tours-machu-picchu.json`
- `assets/data/i18n/en/tours-machu-picchu.json`
- `assets/data/i18n/fr/tours-machu-picchu.json`
- `assets/data/i18n/it/tours-machu-picchu.json`
- `assets/data/i18n/ja/tours-machu-picchu.json`
- `assets/data/i18n/pt/tours-machu-picchu.json`
- `assets/data/i18n/zh/tours-machu-picchu.json`

Nueva configuración:

```json
"images": {
  "cover": "./assets/img/tours/machu-picchu-overnight-clasico/1.jpg",
  "gallery": [
    "./assets/img/tours/machu-picchu-overnight-clasico/2.jpg"
  ]
},
"fallbackImage": "./assets/img/tours/machu-picchu-overnight-clasico/1.jpg"
```

## Nota
Si luego subes una tercera imagen, puedes agregarla al `gallery` como:

```json
"./assets/img/tours/machu-picchu-overnight-clasico/3.jpg"
```

## Cache
Se actualizó `product.html` a `v=87` para forzar la recarga del CSS/JS en navegador.

---

## Fuente: `CAMBIOS_V88_ITINERARIO_COVER_CTA.md`

# CAMBIOS V88 - Itinerario, cover y CTAs

- Se uniformó el estilo visual de los badges del itinerario para que Overnight mantenga el estilo compacto del Full Day clásico.
- Se restauró la ruta de imagen cover para Machu Picchu Overnight Clásico.
- Se agregaron rutas de galería 1.jpg a 4.jpg, con fallback/ocultamiento si alguna imagen aún no existe.
- El botón de upgrade de hotel ahora mantiene el estilo del botón de upgrade de trenes.
- El CTA principal cambió a color fucsia para destacar la acción de reserva.
- Se actualizó product.html a v=88.

---

## Fuente: `CAMBIOS_V89_BADGES_HOTEL.md`

# Cambios V89 - Badges itinerario y botón upgrade hotel

- Se fuerza el texto blanco dentro de los badges de hora para todos los itinerarios visuales.
- Se mantiene el ancho/alto compacto del badge para evitar diferencias entre Full Day y Overnight.
- Se centra el botón Upgrade de hotel dentro del recuadro de alojamiento del Overnight Clásico.
- Se ajusta el botón Upgrade de hotel para usar tamaño y tipografía similares al botón Upgrade de trenes.
- Se compacta la imagen del hotel seleccionado para reducir espacio vacío.
- Se actualiza cache de product.html a v=89.

---

## Fuente: `CAMBIOS_V90_BADGES_ITINERARIO.md`

# Cambios V90 - Badges del itinerario uniformes

## Problema corregido
En el tour Machu Picchu Overnight Clásico, la hora dentro del badge del itinerario se veía más grande que en Machu Picchu Full Day Clásico.

La causa era que Overnight renderiza la hora dentro de un `<strong>`, y una regla global de `.experience-itinerary-activity strong` aumentaba el tamaño de ese texto.

## Cambios aplicados
- Se agregó un override final para los badges de hora dentro de `#itinerary`.
- Se fuerza texto blanco para todo el contenido del badge.
- Se iguala el tamaño de la hora y del texto `aprox.` entre Full Day, Overnight y futuros itinerarios visuales.
- No se modificó la lógica JS ni la información de los tours.

## Archivos modificados
- `product.html`
- `assets/css/product-page.css`

---

## Fuente: `CAMBIOS_V91_REESTRUCTURACION_MENU.md`

# CAMBIOS V91 — REESTRUCTURACIÓN DEL MENÚ PRINCIPAL

## Menú Machu Picchu
- Todo Machu Picchu
- Full Days
- Overnight
- Premium Train Experiences
- Luxury Hiram Bingham Train

## Menú Cusco
- Tours en Cusco
- Paquetes completos Cusco
- Trekkings en Cusco
- Todo Cusco

## Experiencias Ancestrales
- Se mantiene Bienvenida Ancestral.
- Se mantiene Unión Eterna en los Andes.
- Se eliminan Pago a la Tierra y Renovación de votos andina del menú.
- Se agrega Astronomía Andina y Observación de Estrellas.
- Se agrega una página informativa y de registro de interés para Ayahuasca, sin carrito ni compra directa.

## Trekking y Naturaleza
- Camino Inca
- Inca Jungle
- Salkantay Trek
- Ausangate Trek
- Todos los trekkings

## Archivos nuevos principales
- machu-picchu-full-days.html
- machu-picchu-overnight.html
- machu-picchu-premium-trains.html
- machu-picchu-hiram-bingham.html
- trekking-cusco.html
- todo-cusco.html
- astronomia-andina-cusco.html
- ayahuasca-cusco.html
- assets/css/special-experience.css
- assets/js/pages/special-experience-lead.js

## Archivos modificados principales
- components/header.html
- assets/css/header.css
- assets/js/components/header.js
- assets/js/pages/catalog-landing.js
- assets/data/ui-translations.json
- assets/data/i18n/*/ui-translations.json
- trekkings.html y sus versiones por idioma
- sitemap.xml

## Nota funcional
Los productos de trekking que todavía están en estado draft se muestran como “Próximamente” únicamente en páginas de trekking y conducen a una consulta por WhatsApp, no a una compra directa.

---

## Fuente: `CAMBIOS_V92_AJUSTES_INDEX_CONTENIDO_FORMULARIOS.md`

# My Cusco Trip V92 — Index, contenidos, formularios y servicios

## Buscador del inicio

- La pestaña **Tours** ahora trabaja por categorías:
  - Machu Picchu.
  - Tours en Cusco.
  - Experiencias ancestrales.
  - Trekkings y naturaleza.
- La pestaña **Paquetes completos** ahora trabaja por destino o estilo:
  - Solo Machu Picchu.
  - Cusco y Machu Picchu.
  - Machu Picchu + trekking.
  - Aventura y naturaleza.
  - Perú multidestino o personalizado.
- Las búsquedas conservan fecha(s), adultos y niños en los parámetros de destino.
- Se añadieron traducciones para los ocho idiomas del proyecto.

## Cabecera y pie

- “Guía de viaje” se reemplazó por **Complementa tu viaje**.
- El nuevo menú contiene trenes, hoteles y restaurantes.
- Se retiraron del desplegable principal los enlaces a boletos, cómo llegar y preguntas frecuentes; continúan accesibles desde el footer.
- La cabecera y el pie del marketplace de hoteles se sincronizaron con el sitio principal.
- “Unión Eterna en los Andes” dirige al nuevo producto especial.

## Correcciones visuales

- Títulos en blanco en:
  - Plan de Sostenibilidad.
  - Experiencia de Ayahuasca.
  - Astronomía Andina.
- Se reforzó la legibilidad con sombra sobre imágenes hero.
- Las tarjetas de agencias, hoteles, restaurantes y artesanos tienen imágenes diferenciadas.

## Contenidos ampliados

- Planifica tu viaje.
- Viajes en grupo o privados.
- Delegaciones de estudiantes.
- Blog de viajes y experiencias con filtros.
- Cómo llegar a Machu Picchu.
- Trenes a Machu Picchu: PeruRail, Inca Rail y categorías.
- Boletos, circuitos, rutas y tarifas referenciales de Machu Picchu.
- Preguntas frecuentes orientadas a una agencia turística.

## Páginas legales

Se ampliaron:

- Términos y condiciones.
- Términos y condiciones generales.
- Términos de uso del sitio web.
- Política de privacidad.
- Política de cookies.
- Política del sistema integrado de gestión.
- Contrato de servicios.
- Libro de Reclamaciones virtual.

El Libro incluye identificación correlativa, consumidor, representante de menor, servicio, reclamo/queja, detalle, pedido, consentimiento y constancia por correo.

**Pendiente obligatorio:** colocar razón social, RUC y domicilio antes de publicar.

## Formularios nuevos

- Libro de Reclamaciones.
- Delegaciones estudiantiles, académicas y otras.
- Trabaja con nosotros.
- Cambios y postergaciones.
- Solicitud informativa de Ayahuasca.
- Solicitud de Matrimonio Andino.

Todos usan lista internacional de países y códigos de llamada, validación de correo y envío al backend unificado.

## Documentos de reserva

- Búsqueda de travel voucher mediante código de reserva y correo registrado.
- Búsqueda de tickets de tren, Machu Picchu, Consettur y otros documentos.
- Botones de descarga e impresión donde corresponde.
- La consulta se alimenta de la hoja `Documentos_Reserva`.

## Producto especial

Se creó `union-eterna-andes.html` con tres modalidades:

- Esencia Andina — USD 200.
- Unión Sagrada — USD 385.
- Celebración de los Andes — USD 959, hasta 10 invitados.

Se aclara que es una ceremonia simbólica y cultural sin efectos civiles o religiosos oficiales.

## Backend

Se amplió `landing/google-apps-script-machu-picchu-alternativas.gs` para:

- Mantener el formulario anterior de la landing.
- Registrar todos los formularios nuevos en hojas independientes.
- Enviar notificaciones a `contact@mycuscotrip.com` y `reservas@mycuscotrip.com`.
- Enviar constancias a los clientes.
- Consultar documentos mediante JSONP con código + correo.

Revisar `INSTRUCCIONES_FORMULARIOS_Y_DOCUMENTOS.md` antes de publicar.

## Corrección Registrar pasajeros

Se corrigió el error de sintaxis en `registro-pasajeros.html` que detenía el JavaScript antes de cargar la cabecera y el footer.

---

## Fuente: `CAMBIOS_V93_MODAL_RESERVAS_I18N_CIRCUITOS.md`

# My Cusco Trip — Cambios V93

Fecha: 30 de julio de 2026

## 1. Modal de pasajeros y resumen

- Eliminado el rótulo lateral “RESERVA MY CUSCO TRIP”.
- Cabecera verde oscuro con títulos blancos.
- Título contextual:
  - “Datos de los pasajeros” durante el registro.
  - “Resumen de tu reserva” durante la revisión.
- Código visible con etiqueta “Código de reserva:” y badge blanco.
- Botón de cierre visible permanentemente.
- Ocultada la línea “Reserva generada”.
- Código nuevo `CUZ` + seis dígitos hexadecimales.
- Más padding en tarjetas, campos y resumen.
- Aviso largo convertido en desplegable “Información importante”.
- Botones móviles apilados y centrados para evitar cortes.

## 2. Pago cancelado y recuperación

- Mensaje de cancelación más amigable.
- Muestra el código y, cuando existe localmente, el correo enmascarado.
- Nuevo CTA “Recuperar y pagar reserva”.
- Nuevo enlace de recuperación en el footer.
- `mi-reserva.html` ahora solicita código + correo registrado o apellido.
- Recuperación local de pre-reservas pendientes y preparación para `lookupReservation` de backend.
- Documento de contrato: `docs/reservation-recovery-backend-contract-v93.md`.

## 3. Buscador del inicio

- Eliminado el check “Fechas flexibles”.
- La función residual devuelve `false` para conservar compatibilidad sin mostrar el control.

## 4. Páginas del footer e idiomas

- Las rutas `/pages/...` ya no se convierten en rutas inexistentes como `/pt/pages/...`.
- El idioma se conserva mediante `?lang=pt`, `?lang=en`, etc.
- Agregado motor `assets/js/pages/static-page-i18n.js`.
- Agregado diccionario `assets/data/static-page-translations.json` para 31 páginas y siete idiomas adicionales.
- Formularios conservan su estructura y funcionalidad durante la traducción.
- Rutas compatibles con dominio propio y con la base `/mycuscotrip/` de GitHub Pages.

## 5. Circuitos por Perú

- Completados diez itinerarios de 5, 6, 7, 8, 9, 10, 12, 14 y 15 días.
- Cada día incluye título, descripción, pernocte e imagen existente en el repositorio.
- Itinerarios completos en español e inglés.
- Corregidos slugs ingleses y contenido residual en español de los circuitos de 8 días y Perú–Bolivia de 10 días.
- Añadidas imágenes válidas para Uyuni, Amazonía y la costa sur.

## 6. Archivos principales modificados

- `product.html` y versiones `en`, `pt`, `fr`, `de`, `it`, `zh`, `ja`.
- `assets/css/product-page.css`.
- `assets/js/pages/product.js`.
- `mi-reserva.html` y versiones localizadas.
- `assets/js/pages/reservation-recovery.js`.
- `components/search-bar.html`.
- `assets/js/components/search-bar.js`.
- `components/footer.html`.
- `assets/js/components/header.js`.
- `assets/js/components/footer.js`.
- `assets/js/i18n.js`.
- `assets/data/ui-translations.json`.
- `assets/data/static-page-translations.json`.
- `assets/data/packages-peru.json`.
- `assets/data/i18n/en/packages-peru.json`.

---

## Fuente: `CAMBIOS_V94_NUEVO_CIRCUITO_PERU_7D6N.md`

# My Cusco Trip V94 — Nuevo circuito Perú 7 días / 6 noches

## Producto agregado
- Lima, Paracas, Islas Ballestas, Ica, Huacachina, Cusco, Valle Sagrado, Machu Picchu, Laguna Humantay y City Tour.
- Versiones completas en español e inglés.
- URL ES: `product.html?slug=peru-lima-paracas-huacachina-cusco-machu-picchu-humantay-7-dias-6-noches`
- URL EN: `en/product.html?slug=peru-lima-paracas-huacachina-cusco-machu-picchu-humantay-7-days-6-nights`

## Tarifa base
- USD 1,529.90 por persona.
- Incluye hoteles base: Arawi Miraflores Express (2 noches), Hotel Cusco Boutique (3 noches) y Hotel Luz Garden (1 noche).
- Incluye tren base Inca Rail The Voyager 16:36 ida y The Voyager 20:20 retorno.
- No incluye vuelos nacionales ni internacionales.
- La tarifa está protegida para descuento máximo de 15%, comisión PayPal de 5.4% y objetivo promedio de utilidad de USD 200 por persona.

## Ajustes técnicos
- Activado selector/modal de hoteles para paquetes que declaran `hotelsIncludedInBase`.
- Hoteles preseleccionados desde `defaultHotelSelections`.
- El precio solo suma la diferencia de un upgrade respecto del hotel base incluido.
- Activado selector/modal de trenes para paquetes con `customerCanChangeTrain: true`.

---

## Fuente: `CAMBIOS_V951_RESTAURACION_HOTELES_TRENES_E_IMPRESION.md`

# My Cusco Trip V95.1 — Restauración acumulativa del circuito 7D/6N

Fecha: 2026-08-01

## Objetivo

Conservar íntegramente la configuración correcta de V94 para el producto `pkg_peru_7d6n_humantay` y añadir únicamente las mejoras de impresión solicitadas en V95.

## Configuración preservada de V94

- Hoteles obligatorios e incluidos en la tarifa base.
- Hoteles preseleccionados:
  - Lima: `arawi-miraflores-3s`.
  - Cusco: `cusco-boutique-3s`.
  - Aguas Calientes: `luz-garden-3s`.
- Modal para cambiar hotel y calcular solo el suplemento.
- Trenes preseleccionados:
  - Ida: `INCA_OLLA_MAPI_VOYAGER_1636_OLLANTAYTAMB`.
  - Retorno: `INCA_MAPI_CUSCO_VOYAGER_2020_MACHU_PICCHU`.
- Modal de trenes y cálculo de diferencias.

## Únicas mejoras funcionales añadidas desde V95

- Imágenes de cada día en la versión impresa.
- Badge de día y fecha calculada junto a cada jornada.
- El año se muestra únicamente cuando la fecha pertenece a un año distinto del año actual.
- Espera breve para cargar imágenes antes de abrir la impresión.

## Corrección del paquete

El parche V95 anterior contenía solo los archivos de impresión y estaba dentro de una carpeta adicional. Este parche V95.1 es acumulativo, se entrega desde la raíz y vuelve a incluir los JSON de V94 que contienen la configuración de hoteles, trenes e itinerario del producto.

---

## Fuente: `CAMBIOS_V95_IMPRESION_ITINERARIO.md`

# My Cusco Trip V95 — Impresión de itinerarios por día

## Cambios

- La versión impresa de circuitos de varios días muestra una tarjeta independiente para cada día.
- Cada tarjeta incluye:
  - badge «Día N»;
  - fecha calculada desde la fecha de viaje seleccionada;
  - imagen del día tomada del mismo itinerario que se muestra en el HTML;
  - título, descripción y alojamiento/pernocte.
- La fecha del Día 1 coincide con la fecha elegida en el selector del producto.
- Los días siguientes se calculan consecutivamente mediante días calendario.
- Regla del año:
  - si la fecha pertenece al año actual, se muestra día y mes;
  - si pertenece a otro año, también se muestra el año.
- Las imágenes se cargan como elementos `<img>` y el flujo de impresión espera su carga antes de abrir el diálogo de impresión.
- El cambio se aplica a todos los paquetes/circuitos multidía que tengan itinerario estructurado, no solo al circuito V94.

## Archivos modificados

- `assets/js/pages/product.js`
- `assets/css/product-page.css`

## Ejemplo

Si la fecha seleccionada es `2027-01-03`:

- Día 1 — 3 de enero de 2027
- Día 2 — 4 de enero de 2027
- Día 3 — 5 de enero de 2027

Si la fecha seleccionada pertenece al año actual, por ejemplo `2026-08-20`:

- Día 1 — 20 de agosto
- Día 2 — 21 de agosto

---

## Fuente: `CORRECCIONES_AGENCIAS_TRENES.md`

# Correcciones aplicadas - agencias y trenes

## Módulo agencias
Archivos modificados:
- `agencias/assets/js/pages/agencias-i18n.js`
- `agencias/assets/js/pages/agencias.js`
- `agencias/assets/js/pages/ordenes-agencias.js`

Cambios:
- Se agregó el diccionario completo en español para evitar que se muestren claves como `agency.book`, `agency.viewItinerary`, `agency.perPerson`, `agency.selectCountry`, `orders.viewDetails`, etc.
- Se reforzó la función `t()` para usar textos de respaldo si alguna clave no existe.
- No se cambió la conexión de pagos ni la lógica de guardado de órdenes.

## Módulo trenes
Archivos modificados:
- `trenes/index.html`
- `de/trenes/index.html`
- `en/trenes/index.html`
- `fr/trenes/index.html`
- `it/trenes/index.html`
- `ja/trenes/index.html`
- `pt/trenes/index.html`
- `zh/trenes/index.html`
- `trenes/assets/css/trenes.css`
- `trenes/assets/js/trenes.js`

Cambios:
- Hero actualizado con el texto: “Compra tu tren a Machu Picchu y obtén los mejores beneficios”.
- Textos del hero en blanco y badges nuevos:
  - Tour guiado gratuito dentro de Machu Picchu
  - Asistencia 24/7
  - Beneficios exclusivos por tu compra
- Se eliminó visualmente el badge “Mejor opción”.
- “Ida y vuelta” y “Solo ida” se mantienen en una sola línea.
- Se redujeron espacios entre buscador, rutas y resultados.
- Se agregó selección progresiva dentro del módulo trenes:
  1. El usuario marca un tren.
  2. Aparece el botón “Seleccionar este tren”.
  3. Al confirmar, se muestra solo el tren elegido y aparece “Modificar tren de ida/retorno”.
  4. Luego se muestra la lista de retorno.
  5. Al confirmar retorno, quedan visibles los trenes seleccionados y el resumen.
- La asistencia incluida ahora aparece como nota simple: “Asistencia personalizada 24/7 incluida sin costo”.

Nota: Para la selección progresiva fue necesario tocar únicamente `trenes/assets/js/trenes.js`, sin modificar otros JS del proyecto.

---

## Fuente: `ENGLISH_FINAL_CORRECTION_REPORT.md`

# English Final Correction Report

This package focuses on completing the English version while keeping Spanish as the main root language and leaving the other language folders visible for later review.

## Main files updated

- `assets/data/i18n/en/ui-translations.json`
- `assets/data/ui-translations.json`
- `assets/data/i18n/en/packages-peru.json`
- `assets/data/i18n/en/packages-cusco.json`
- `assets/data/i18n/en/tours-cusco.json`
- `assets/data/i18n/en/tours-machu-picchu.json`
- `assets/data/i18n/en/tours-peru.json`
- `assets/data/i18n/en/trekkings-cusco.json`
- `assets/data/i18n/en/private-packages.json`
- `assets/data/i18n/en/destinations.json`
- `assets/data/i18n/en/hotels.json`
- `assets/data/i18n/en/trains.json`
- `assets/data/i18n/en/seo-pages.json`
- `assets/js/pages/product.js`
- selected English HTML pages in `/en/`

## What was improved

- Product detail labels, tabs, badges and fallback texts in English.
- Peru 10-day package copy, highlights, includes, excludes, pickup info, important info and SEO.
- Hotel/accommodation booking cards and hotel modal labels in English.
- Guide language display changed to natural English: `Professional guide: Spanish and English; Other languages available upon request`.
- Itinerary day labels use `Day`.
- Pickup and important information accordion titles translated.
- Common Spanish fragments in English JSON files cleaned up.

## Recommended upload order

1. `assets/data/i18n/en/`
2. `assets/data/ui-translations.json`
3. `assets/js/pages/product.js`
4. `/en/` folder
5. `ENGLISH_FINAL_CORRECTION_REPORT.md` optional

## Production note

The English experience is now the priority language after Spanish. Other language folders remain available but should be reviewed one by one before advertising or active SEO campaigns.

---

## Fuente: `MULTILANGUAGE_FIX_REPORT.md`

# Multilanguage Fix Report - My Cusco Trip

## Main issues found

1. **Localized pages were loading components from the wrong path.**
   Several pages inside `/en/`, `/pt/`, `/fr/`, etc. used `BASE_PATH = './'`. From `/en/cusco-tours.html`, that makes the browser request `/en/components/header.html` instead of `/components/header.html`. This caused header/footer to disappear.

2. **Images used relative paths that break inside language folders.**
   Many sections used `url('./assets/...')` or JS image paths that resolved to `/en/assets/...`. Those files do not exist. They were changed to root-based asset paths like `/assets/...` or resolved through the global base path.

3. **The product page did not load the i18n script.**
   Product pages such as `/en/product.html` had translated JSON available, but the UI labels could not be translated because `assets/js/i18n.js` was missing from product pages.

4. **i18n ran before dynamic components were inserted.**
   Header/footer are loaded after page load. The previous i18n applied translations only once, so the footer remained in Spanish. The i18n script now observes inserted DOM nodes and reapplies translations automatically.

5. **Static UI text in product pages was not wired to i18n.**
   Labels such as Share, Save, Summary, Details, Similar, Highlights, Includes, Excludes, Pickup, Payment details, Pay later, etc. now use `data-i18n` keys.

6. **Card rendering JS had hardcoded Spanish strings.**
   `Desde`, `Ver experiencia`, `Cotización flexible`, chips like `Con tren`, and catalog card labels are now read from i18n.

7. **The 10D/9N Peru package had only partial translation.**
   The package `pkg_peru_10d9n` was completed in the localized `packages-peru.json` files, with special focus on English and improved localized structure for the rest.

## Important files changed

- `assets/js/i18n.js`
- `assets/js/core/data-loader.js`
- `assets/js/components/products.js`
- `assets/js/pages/catalog-landing.js`
- `assets/js/pages/product.js`
- `components/footer.html`
- `product.html`
- `/en/product.html`, `/pt/product.html`, `/fr/product.html`, `/de/product.html`, `/it/product.html`, `/zh/product.html`, `/ja/product.html`
- `/en/index.html`, `/pt/index.html`, `/fr/index.html`, `/de/index.html`, `/it/index.html`, `/zh/index.html`, `/ja/index.html`
- `/en/*.html`, `/pt/*.html`, `/fr/*.html`, `/de/*.html`, `/it/*.html`, `/zh/*.html`, `/ja/*.html` path fixes
- `assets/data/ui-translations.json`
- `assets/data/i18n/*/ui-translations.json`
- `assets/data/i18n/*/packages-peru.json`
- common cleanup in localized catalog JSON files

## Validations performed

- JSON validation for all `assets/data/**/*.json`
- JavaScript syntax validation with `node --check`
- Search check for broken localized asset patterns such as `url('./assets` and `src="./assets/img`
- Search check for localized component loader using `./` as base path

## Recommended next QA URLs

- `/en/`
- `/fr/`
- `/en/cusco-tours.html`
- `/fr/cusco-tours.html`
- `/en/product.html?slug=peru-10-day-tour-lima-huacachina-cusco-machu-picchu-titicaca-arequipa`
- `/fr/product.html?slug=circuit-perou-10-jours-lima-huacachina-cusco-machu-picchu-titicaca-arequipa`

## Note

This correction fixes the technical multilingual structure and the most visible mixed-language issues. Long catalog descriptions in every language should still receive final human review before indexing all languages in Google.

---

## Fuente: `MULTILANGUAGE_IMPLEMENTATION_REPORT.md`

# Implementación multidioma My Cusco Trip

Se conservó el español como idioma principal en la raíz del sitio y se agregaron carpetas nativas para SEO:

- `/en/` inglés
- `/pt/` portugués
- `/fr/` francés
- `/de/` alemán
- `/it/` italiano
- `/zh/` chino simplificado
- `/ja/` japonés

## Páginas HTML generadas por idioma

- `/en/index.html`
- `/pt/index.html`
- `/fr/index.html`
- `/de/index.html`
- `/it/index.html`
- `/zh/index.html`
- `/ja/index.html`

Cada idioma incluye las páginas públicas principales copiadas en su carpeta, con `lang`, canonical, robots y hreflang propios.

## Datos dinámicos traducidos

Se crearon archivos por idioma en:

`assets/data/i18n/<idioma>/`

Incluye:

- `ui-translations.json`
- `seo-pages.json`
- `tours-cusco.json`
- `tours-machu-picchu.json`
- `tours-peru.json`
- `trekkings-cusco.json`
- `packages-cusco.json`
- `packages-peru.json`
- `private-packages.json`
- `destinations.json`
- `hotels.json`
- `trains.json`

## Archivos modificados

- `assets/js/i18n.js`
- `assets/js/core/data-loader.js`
- `assets/js/pages/product.js`
- `assets/js/pages/quote-packages.js`
- `assets/js/components/header.js`
- `components/header.html`
- `components/footer.html`
- `sitemap.xml`
- HTML principales de la raíz para ampliar hreflang

## Nota importante

La estructura técnica SEO multidioma está creada. Las traducciones largas de productos son una primera versión editable y deben revisarse comercialmente antes de campañas fuertes, especialmente condiciones de reserva, cancelaciones, trenes, entradas, hoteles y políticas de pago.

## Prioridad sugerida de revisión humana

1. Inglés: revisar primero y publicar.
2. Portugués y francés: revisar segundo.
3. Alemán e italiano: revisar tercero.
4. Chino simplificado y japonés: revisar con especial cuidado cultural antes de indexar campañas pagadas.

---

## Fuente: `PRE_BACKEND_FIX_REPORT.md`

# My Cusco Trip - Correcciones pre-backend

Fecha de intervención: 2026-05-21

## Resumen ejecutivo

Se aplicaron correcciones para dejar el frontend más estable antes de conectarlo a backend y pagos con PayPal. El proyecto sigue funcionando como sitio estático, pero ahora cuenta con un adaptador API en modo `mock`, filtros de productos publicados, cotizador funcional, mejoras de seguridad para datos locales y documentación técnica para implementar backend.

## Correcciones aplicadas

### 1. Cotizador de paquetes
- Se reemplazó `assets/js/pages/quote-packages.js`, que estaba roto con un texto inválido de error de servidor.
- Se agregó un cotizador ligero en `quote-packages.html` y versiones localizadas.
- El cotizador genera solicitudes con código `QTC...` y queda preparado para enviar datos a `/api/quotes`.
- En modo actual, guarda solo un borrador seguro de prueba mediante el adaptador API.

### 2. Adaptador API listo para backend
- Se creó `assets/js/core/api-client.js`.
- Se creó `assets/data/backend-config.json`.
- El frontend ya tiene métodos preparados para:
  - `POST /api/quotes`
  - `POST /api/pre-reservations`
  - `POST /api/payments/paypal/orders`
  - `POST /api/payments/paypal/orders/{orderId}/capture`
- El modo actual está configurado como `mock` para evitar envíos reales sin backend.

### 3. Preparación para PayPal
- La reserva ahora genera un payload compatible con integración de pago posterior.
- Se dejó explícito que PayPal requiere backend para crear/capturar órdenes de forma segura.
- No se incluyeron credenciales ni secretos en frontend.

### 4. Seguridad de reservas y pasajeros
- Se retiró el guardado directo de pre-reservas completas con datos sensibles en `localStorage` desde la página de producto.
- En modo `mock`, el adaptador local elimina o reduce datos sensibles antes de guardar el borrador.
- Se añadió política de almacenamiento temporal en `backend-config.json`.

### 5. Portal de agencias
- Se modificó el registro e inicio de sesión demo para evitar guardar contraseñas en texto plano.
- Ahora se usa hash SHA-256 con salt mediante WebCrypto como mejora para prototipo.
- Nota: para producción, la autenticación debe migrarse al backend con hash robusto, sesiones/JWT y roles.

### 6. Filtro de productos públicos
- Se agregó `isPublicProduct()` en `assets/js/core/catalog-normalizer.js`.
- Se aplicó filtro `status === "published"` en catálogo, experiencias y detalle de producto.
- Esto evita mostrar productos en borrador, privados, archivados u ocultos en páginas públicas.

### 7. Traducciones UI
- Se completaron claves funcionales faltantes en los archivos de traducción UI.
- Se añadieron nuevas claves para mensajes de reserva, disponibilidad y pago.
- Los archivos localizados ya no presentan claves faltantes frente al diccionario base.
- Recomendación: hacer revisión nativa de textos largos comerciales/SEO antes de campañas internacionales.

### 8. Imágenes y fallbacks
- Se crearon placeholders para imágenes faltantes:
  - `assets/img/placeholder/experience.jpg`
  - `assets/img/products/default.jpg`
  - `assets/img/airlines/default.png`
  - `assets/img/agentes/jefferson-garcia.jpg`
- Se corrigieron referencias faltantes en JSON para evitar tarjetas rotas.
- Se corrigieron rutas de logos de aerolíneas en cotizadores localizados.

### 9. SEO y metadatos básicos
- Se corrigieron referencias incorrectas de `quote-packages.html` que apuntaban a `explora-peru.html`.
- Se alinearon URLs de schema/OG/canonical en la página de cotización y versiones localizadas.

### 10. Tracking
- Se cambió `debug: true` a `debug: false` en `assets/js/config/tracking-config.js`.

## Archivos técnicos agregados

- `assets/js/core/api-client.js`
- `assets/data/backend-config.json`
- `docs/BACKEND_PAYPAL_RECOMMENDATION.md`
- `docs/prisma-reservation-schema.prisma`
- `PRE_BACKEND_FIX_REPORT.md`

## Validaciones realizadas

- Validación de sintaxis JavaScript con `node --check`: correcta.
- Validación de JSON: correcta en 188 archivos.
- Búsqueda del texto inválido original en archivos funcionales: sin ocurrencias.
- Validación de claves UI faltantes por idioma: 0 faltantes frente al diccionario base.
- Revisión de referencias de imágenes en JSON: sin faltantes detectados.

## Pendientes recomendados antes del backend productivo

1. Convertir `product.js` en módulos más pequeños.
2. Implementar backend real con validaciones de precio y disponibilidad.
3. Crear panel admin para reservas, pasajeros, pagos y agencias.
4. Implementar PayPal Orders API desde backend, nunca con secretos en frontend.
5. Agregar webhooks de PayPal para confirmar pagos de forma confiable.
6. Revisar textos SEO largos por hablantes nativos para EN/PT/FR/DE/IT/ZH/JA.
7. Definir política legal de privacidad, cookies, cambios y cancelaciones según operación real.

---

## Fuente: `QUOTE_PACKAGE_V33_CAMBIOS.md`

# Quote Package V33 - Ajuste móvil, reserva y PayPal

## Archivos modificados

- `quote-packages.html`
- `assets/css/quote-packages.css`
- `js/pages/quote-packages.js`

## Cambios aplicados

1. **Panel inferior móvil corregido**
   - Se agregó el botón móvil `Ver más / Ver menos`.
   - En móvil, el resumen ahora se despliega como bottom sheet hacia arriba.
   - El panel inferior queda por encima del contenido y ya no es tapado por el botón flotante de WhatsApp.
   - Cuando el resumen está expandido o se abre el modal de reserva, el botón flotante de WhatsApp se oculta para evitar superposición.

2. **Botones móviles simplificados**
   - Se eliminó visualmente y del HTML el botón `Descargar PDF`.
   - Se mantiene solo `Imprimir` y `Iniciar reserva`.
   - El botón principal antes decía `Pagar`; ahora dice `Iniciar reserva` en escritorio y `Reservar` en móvil.

3. **Modal de reserva agregado al Quote Package**
   - El botón `Iniciar reserva` abre un modal nuevo similar al flujo de Peru Nature.
   - El modal genera formularios dinámicos según la cantidad de pasajeros elegida.
   - El pasajero 1 es obligatorio para habilitar PayPal.
   - Los demás pasajeros quedan colapsados y opcionales para no hacer pesado el flujo.

4. **PayPal integrado en el modal**
   - Se agregó el SDK de PayPal en modo sandbox: `client-id=sb`.
   - El pago se procesa en USD.
   - Si la cotización está en PEN, el monto a pagar se convierte a USD usando el tipo de cambio del cotizador.
   - El monto enviado a PayPal es el `advance` si el modo de pago es anticipo, o el total si el modo es pago completo.
   - Se dejó preparado soporte opcional para backend con `window.MCT_QUOTE_APPS_SCRIPT_URL` o `window.MCT_APPS_SCRIPT_URL`.

## Cómo se calcula la cotización actualmente

El archivo principal de lógica es `js/pages/quote-packages.js`.

### 1. Datos cargados

El cotizador carga estos JSON:

- `assets/data/packages-cusco.json`: configuración general del motor de paquetes, reglas de duración y tipo de cambio referencial.
- `assets/data/tours-cusco.json`: tours simples de Cusco y sus precios publicados.
- `assets/data/tours-machu-picchu.json`: tours de Machu Picchu, reglas de tren y precios por nacionalidad.
- `assets/data/trekkings-cusco.json`: trekkings o experiencias adicionales.
- `assets/data/hotels.json`: hoteles, habitaciones y tarifas por noche.
- `assets/data/trains.json`: trenes, rutas, horarios, empresas y precios por adulto/niño.
- `assets/data/discount-codes.json`: cupones manuales.

### 2. Precio base de tours

Cada tour toma precio publicado desde:

- `tour.nationalityPricing[nationality][adult/child]`, si existe.
- Si no existe, usa `tour.basePricing[adult/child]`.
- Si no existe, usa valores alternativos como `price`, `adult`, `basePrice`.

El paquete suma adultos y niños según la cantidad elegida.

### 3. Hoteles

Los hoteles se toman de `assets/data/hotels.json`, agrupados por destino.

El sistema calcula noches según el itinerario:

- Cusco.
- Aguas Calientes, cuando el paquete requiere noche previa o conexión a Machu Picchu.

Después arma combinaciones de habitaciones compatibles con la cantidad de pasajeros. El precio del hotel se calcula así:

`precio habitación por noche × número de noches`

Si el usuario elige `Sin hotel`, el costo de alojamiento es 0.

### 4. Trenes

Los trenes se toman de `assets/data/trains.json`.

El sistema filtra por:

- dirección: ida o retorno,
- ruta permitida,
- horario compatible,
- nacionalidad,
- empresa elegida en la ida para filtrar el retorno,
- reglas del tour Machu Picchu seleccionado.

El precio se calcula así:

`precio adulto tren × adultos + precio niño tren × niños`

Luego se convierte a la moneda visible del cotizador.

### 5. Extras

Los extras vienen de los tours disponibles o de servicios adicionales compatibles. Solo se suman cuando el usuario los marca.

### 6. Descuentos y modalidad de pago

El subtotal se calcula así:

`base tours + hoteles + trenes + extras`

Luego aplica:

- cupón manual, si existe;
- o descuento automático de 5% si elige pago 100% y no hay cupón manual.

El total final queda así:

`subtotal - descuentos`

Si se elige anticipo, el sistema cobra ahora:

`USD 49.90 × número de pasajeros`

convertido a la moneda visible. El saldo queda como pendiente.

## Sobre cargos ocultos

En el cálculo actual del `quote-packages.js` no se está agregando una comisión separada de PayPal ni una línea oculta adicional al final del resumen.

Pero algunos JSON sí pueden tener precios ya protegidos comercialmente. Por ejemplo, ciertos catálogos describen precios publicados pensados para cubrir descuentos o comisiones. Eso significa que el margen puede estar embebido dentro del precio publicado del tour, no agregado como una línea extra al final.

## Recomendación para pasar precios a Google Sheets

Para afinar precios manualmente, conviene migrar primero estos catálogos a Google Sheets:

1. `Tours_Precios`
   - código del tour,
   - nombre,
   - precio adulto nacional,
   - precio niño nacional,
   - precio adulto extranjero,
   - precio niño extranjero,
   - moneda,
   - activo.

2. `Hoteles_Tarifas`
   - código hotel,
   - destino,
   - categoría,
   - tipo habitación estándar,
   - tipo habitación superior,
   - precio por noche,
   - moneda,
   - vigencia desde/hasta.

3. `Trenes_Tarifas`
   - empresa,
   - servicio,
   - ruta,
   - código tren,
   - hora salida,
   - hora llegada,
   - adulto,
   - niño,
   - moneda,
   - activo.

4. `Reglas_Paquetes`
   - duración,
   - tours compatibles,
   - si requiere Machu Picchu,
   - si requiere noche en Aguas Calientes,
   - reglas de llegada/salida.

La forma más segura es crear un Apps Script que publique esos datos como JSON y que el HTML consuma ese endpoint. Así mantienes el frontend estático en GitHub Pages, pero administras precios desde Google Sheets.

---

## Fuente: `QUOTE_PACKAGE_V34_CAMBIOS.md`

# Quote Package V34 - Corrección funcional

## Archivos corregidos

- `quote-packages.html`
- `assets/css/quote-packages.css`
- `assets/js/pages/quote-packages.js`

## Correcciones

1. Se subió el cache-busting a `v=34` para evitar que el navegador use el JS anterior.
2. El botón móvil `Ver más / Ver menos` ahora tiene listener directo y respaldo por delegación.
3. El botón `Iniciar reserva` ya no debe redirigir a WhatsApp; abre el modal `quoteReservationModal`.
4. Si el modal no existe en el HTML publicado, muestra alerta técnica en vez de redirigir a WhatsApp.
5. El botón `Iniciar reserva / Reservar` ahora usa verde oscuro con texto blanco.
6. El botón `Imprimir` queda más discreto: fondo gris claro, borde verde oscuro y texto verde oscuro.
7. La carpeta `/js` de raíz era duplicada exacta de `/assets/js` y no está referenciada por los HTML, por eso se retiró del proyecto completo corregido.

## PayPal y Google Sheets

El modal puede abrir sin Apps Script. Para que las reservas se guarden automáticamente en Google Sheets, debes configurar `window.MCT_QUOTE_APPS_SCRIPT_URL` con la URL `/exec` de una Web App de Google Apps Script que acepte las acciones `saveQuoteReservation`, `createPayPalOrder` y `capturePayPalOrder`.

PayPal actualmente está en sandbox con `client-id=sb`. Para producción, reemplaza ese valor en `quote-packages.html` por el Client ID público real de PayPal de My Cusco Trip.

---

## Fuente: `README_AFINACION_PLANIFICADOR_V2.md`

# My Cusco Trip — Afinación Planificador V2

## Archivos que debes reemplazar

En GitHub:

- `planifica-tu-viaje.html`
- `assets/css/trip-planner.css`
- `assets/js/pages/trip-planner.js`

En Google Apps Script:

- reemplazar completamente `Code.gs` por `google-apps-script/Code.gs`

No se modifica ningún otro HTML, producto, landing, PayPal, Mercado Pago ni componente global.

## Cambios visuales y de flujo

- El título queda dentro de la card del formulario y se elimina el badge superior y la descripción larga.
- Título: `Cuéntanos sobre tu próximo viaje 🇵🇪`.
- Se compactan márgenes superiores, progreso, cabecera de cada paso y espacio inferior.
- Paso 1 usa el nuevo texto de itinerarios.
- Si el usuario marca `Todavía estoy planificando`, no se pregunta por vuelos. El backend registra ese estado como `planning` automáticamente.
- Se elimina la pregunta redundante sobre combinar Cusco con otros destinos. Los destinos seleccionados arriba son suficientes.
- El botón del paso 4 queda como `Revisar`.
- El botón final queda como `Enviar`.

## Cupón por completar el planificador

El cupón se genera **solo después de verificar correctamente el email**.

Características:

- 10% de descuento.
- Un solo uso.
- Sin fecha de caducidad.
- Personal y vinculado al correo del prospecto.
- Se guarda en la misma hoja `Cupones` utilizada por landings y productos.
- `Fuente = trip_planner_verified`.
- No es acumulable con otros cupones porque el checkout actual admite un único cupón.

### Control para no llenar la hoja de cupones

El backend busca primero si ese correo ya recibió un cupón de beneficio del planificador.

- Si existe y sigue disponible, reutiliza el mismo código.
- Si ya fue canjeado, no genera uno nuevo para ese mismo correo.
- Por tanto, repetir el formulario no crea una cadena de cupones permanentes.

El popup normal del sitio **no se modifica**. Puede seguir ofreciendo su cupón temporal del 15% con la vigencia que ya tienes configurada. El cliente puede tener ambos códigos, pero solo puede aplicar uno por reserva.

## Nuevas columnas de LEADS_WEB

`setupLeadPlannerSystem()` agrega al final, sin borrar datos existentes:

- `CodigoCuponBeneficio`
- `CuponBeneficioEnviadoEn`

## Nuevas propiedades del script

`setupLeadPlannerSystem()` registra, sin sobrescribir credenciales existentes:

- `LEAD_REWARD_COUPON_ENABLED = true`
- `LEAD_REWARD_COUPON_PERCENT = 10`
- `LEAD_REWARD_COUPON_URL = https://mycuscotrip.com/go`

## Instalación

1. Reemplaza `Code.gs` completo.
2. Guarda el proyecto de Apps Script.
3. Ejecuta una vez `setupLeadPlannerSystem()`.
4. Autoriza si Google lo solicita.
5. Ve a **Implementar → Administrar implementaciones → Editar**.
6. Selecciona **Nueva versión** y vuelve a implementar la misma aplicación web.
7. No cambies la URL `/exec` en `backend-config.json` si actualizaste la implementación existente.
8. Sube a GitHub los tres archivos indicados arriba.

## Prueba recomendada

1. Abre la página en incógnito.
2. Completa el formulario con un email de prueba.
3. En Paso 2 elige `Todavía estoy planificando`: no debe aparecer la pregunta de vuelos.
4. Finaliza y pulsa `Enviar`.
5. Verifica el email con el código de 6 dígitos.
6. Comprueba que `LEADS_WEB` pase a `VERIFIED`.
7. Comprueba que se llenen `CodigoCuponBeneficio` y `CuponBeneficioEnviadoEn`.
8. Comprueba en `Cupones` un registro con:
   - `Tipo = percent`
   - `Valor = 10`
   - `MaxUsos = 1`
   - `VigenteHasta` vacío
   - `Fuente = trip_planner_verified`
9. Debe llegar un segundo correo con el cupón del 10% y enlace a `https://mycuscotrip.com/go`.
10. Prueba el código en una landing/producto con campo cupón.

## Importante

No ejecutes `setupScriptPropertiesExample()` si ya tienes credenciales reales de PayPal y Mercado Pago configuradas. Para esta actualización solo necesitas ejecutar `setupLeadPlannerSystem()`.

---

## Fuente: `README_CAMBIOS_TARIFAS.md`

# My Cusco Trip - Fix tarifas quote-packages v80

Archivos modificados:

- `quote-packages.html`
- `assets/js/pages/quote-packages.js`
- `assets/css/quote-packages.css`

Cambios principales:

1. Tours base se calculan desde costos operativos en PEN x 1.5.
2. Machu Picchu se desglosa en guía + entrada + bus, según nacionalidad, sin incluir tren.
3. Recojo aeropuerto y traslado final se agregan al precio base por pasajero.
4. Hoteles usan `room.netCost` x 1.2 cuando el dato existe.
5. Extras/tickets se cobran separados, sin 1.5 general y sin descuentos.
6. Boleto turístico general reemplaza los boletos parciales cuando hay más de un tour que lo requiere.
7. Se evita que cupones y descuento de pago total afecten extras/tickets.
8. Se redondean importes comerciales hacia arriba a múltiplos de 0.50.

Nota:
El archivo activo del cotizador raíz es `quote-packages.html` (plural). El usuario lo mencionó como `quote-package.html`, pero en el proyecto existe como `quote-packages.html`.

---

## Fuente: `README_CAMBIOS_TARIFAS_V81.md`

# Corrección de tarifas v81 - quote-packages

Hallazgo principal: si todavía ves S/ 1,429 para el paquete 9D/8N, la web sigue cargando el JS antiguo.
Ese monto coincide exactamente con la suma antigua de tarifas base en USD:
CUZ002 + CUZ001 + CUZ003VIPCON + CUZ006 + CUZ007 + CUZ008 + CUZ009 + CUZ005 + MAPI004 = USD 381.10 = S/ 1,429.12 con TC 3.75.

Se corrigió:
- quote-packages.html ahora llama quote-packages.js?v=81 y package-generator.js?v=81 para romper caché.
- quote-packages.js usa costos operativos PEN x 1.5 para tours base.
- Machu Picchu se calcula como guía + entrada + bus según nacionalidad, x 1.5, sin duplicar tren.
- Extras/tickets se calculan aparte, sin descuento y sin markup general.
- Boleto Turístico General se cobra una sola vez cuando hay más de un tour con boleto parcial.
- Hoteles usan netCost x 1.2 cuando existe netCost.
- El estado local cambió a mct_quote_package_state_v81 para evitar arrastre de cotizaciones guardadas.

Subir reemplazando exactamente estas rutas:
- /quote-packages.html
- /assets/js/pages/quote-packages.js
- /assets/css/quote-packages.css

No subir una carpeta adicional llamada mct_quote_tarifas_fix_v81_root; los archivos deben quedar en esas rutas del proyecto.

---

## Fuente: `README_HOTFIX_CUPONES_V81.md`

# Hotfix V8.1 — validación de cupones

## Problemas corregidos

1. La landing reconstruía el resumen después de validar el cupón. Esa reconstrucción eliminaba el mensaje de éxito/error y vaciaba el campo cuando el cupón era rechazado.
2. La migración V8 podía dejar los encabezados nuevos de `Cupones` desplazados por columnas vacías.
3. `BETSWELCOME05` no se reactivaba si ya existía como expirado, canjeado o incompleto.
4. No había una forma sencilla de comprobar qué versión del Apps Script estaba atendiendo la web.

## Instalación

### 1. Google Apps Script

- Reemplaza `Code.gs` por `google-apps-script/Code.gs`.
- Ejecuta una vez `setupCouponSystem()`.
- No ejecutes `setupScriptPropertiesExample()` si tus credenciales de PayPal ya están configuradas.
- Actualiza la implementación existente: **Implementar > Administrar implementaciones > Editar > Nueva versión**.

### 2. Verificación del backend

Abre la URL `/exec` de tu Apps Script con:

```text
?action=health
```

Debe devolver la versión:

```text
2026-08-03-v4.1-cupones-validacion-ui-fix
```

Prueba el cupón público con:

```text
?action=couponHealth&couponCode=BETSWELCOME05&subtotal=399&currency=USD&locale=es
```

Debe devolver:

```json
{
  "validation": {
    "valid": true,
    "value": 5,
    "discountAmount": 19.95
  }
}
```

### 3. GitHub

Copia sobre la raíz del proyecto:

- `assets/js/pages/landing-machu-picchu-tours.js`
- `assets/js/pages/landing-machu-picchu-tours-en.js`
- `assets/js/pages/landing-machu-picchu-tours-pt.js`
- `landing/machu-picchu-y-tours-peru.html`
- `en/landing/machu-picchu-y-tours-peru.html`
- `pt/landing/machu-picchu-y-tours-peru.html`

Los HTML cambian la versión del JavaScript a `20260803-81` para evitar caché.

## Comportamiento esperado

- Un cupón inválido o vencido permanece escrito en el campo y muestra el motivo debajo.
- Un cupón válido permanece visible, muestra confirmación y actualiza subtotal, descuento y total.
- `BETSWELCOME05` aplica 5% y se mantiene como cupón público de uso ilimitado mientras esté activo.
- Los cupones personales generados desde el popup aplican 15%, duran al menos 48 horas y vencen al final de ese día.

---

## Fuente: `README_INSTALACION_CUPONES_V8.md`

# My Cusco Trip — Cupones Google Sheets V8

Este parche parte de `mycuscotrip-main-v71-imagen-social.zip` y contiene dos cambios delimitados:

1. Alineación del detalle de servicios en el resumen móvil de la landing.
2. Centralización de cupones en Google Sheets mediante Google Apps Script.

## 1. Subir el parche a GitHub

Copia el contenido del ZIP sobre la raíz del repositorio y acepta el reemplazo de archivos.

Los cupones ya no se validan desde `assets/data/discount-codes.json`. Ese archivo queda vacío de forma intencional. Las landings, `product.html` y `quote-packages.html` consultan el mismo Apps Script mediante `MyCuscoTripApiClient.validateCoupon()`.

## 2. Actualizar Google Apps Script

1. Abre el Apps Script vinculado a tu Google Sheet.
2. Reemplaza el contenido de `Code.gs` por `google-apps-script/Code.gs`.
3. Guarda.
4. Ejecuta **`setupCouponSystem()` una sola vez** y acepta los permisos.
5. Ve a **Implementar > Administrar implementaciones**.
6. Edita la implementación web, elige **Nueva versión** y vuelve a implementar.

Si actualizas la implementación existente, la URL `/exec` se mantiene y no necesitas modificar `assets/data/backend-config.json`.

`setupCouponSystem()` conserva las credenciales PayPal y Mercado Pago existentes. Solo actualiza las propiedades del sistema de cupones.

## 3. Estructura de la hoja `Cupones`

El script conserva las columnas antiguas y añade las nuevas automáticamente. Las columnas principales para crear cupones manuales son:

- `CodigoCupon`: ejemplo `PROMO15`.
- `Estado`: `Vigente`, `Expirado`, `Canjeado` o `Anulado`.
- `Tipo`: `percent` o `fixed`.
- `Valor`: `15` para 15%, o `100` para USD 100.
- `Moneda`: `USD` o `PEN`; se usa principalmente con cupones `fixed`.
- `Activo`: `TRUE` o `FALSE`.
- `VigenteDesde`: fecha y hora de inicio, opcional.
- `VigenteHasta`: fecha y hora de vencimiento, opcional para cupones manuales.
- `MaxUsos`: `1` para un solo uso; `0` para uso ilimitado.
- `Usos`: empieza en `0`.
- `CorreoVinculado`: opcional. Si se completa, el cupón solo puede confirmarse con ese correo.

### Ejemplo porcentual

- `CodigoCupon`: `PROMO15`
- `Estado`: `Vigente`
- `Tipo`: `percent`
- `Valor`: `15`
- `Moneda`: `USD`
- `Activo`: `TRUE`
- `MaxUsos`: `100`
- `Usos`: `0`

### Ejemplo de monto fijo

- `CodigoCupon`: `MCT100USD`
- `Estado`: `Vigente`
- `Tipo`: `fixed`
- `Valor`: `100`
- `Moneda`: `USD`
- `Activo`: `TRUE`
- `MaxUsos`: `1`
- `Usos`: `0`

Los cupones de monto fijo solo se aplican cuando la moneda del cupón coincide con la moneda de la reserva.

## 4. Cupones generados desde el popup

Al registrar nombre, WhatsApp y correo:

- El código se genera en el servidor y se comprueba que sea único.
- Se guarda en la hoja `Cupones`.
- Se vincula al correo registrado.
- Tiene `MaxUsos = 1`.
- Tiene una vigencia mínima de 48 horas.
- La gracia se extiende hasta las 23:59:59 del día en que se cumplen las 48 horas, usando `America/Lima`.

Ejemplo: si se genera el 3 de agosto a las 20:15, las 48 horas se cumplen el 5 de agosto a las 20:15 y el cupón caduca el 5 de agosto a las 23:59:59.

## 5. Cuándo se marca como usado

El cupón no se canjea al pulsar **Pagar**. Se marca como usado únicamente después de que PayPal o Mercado Pago confirman el pago.

## 6. Pruebas recomendadas

1. Ejecutar `setupCouponSystem()`.
2. Registrarse en el popup con un correo de prueba.
3. Confirmar que se creó una fila en `Cupones`.
4. Aplicar el código en la landing.
5. Aplicarlo en un `product.html`.
6. Crear un cupón manual `fixed` de USD 10 y comprobar el descuento.
7. Intentar usar un cupón vencido.
8. Intentar confirmar un cupón personal con otro correo.
9. Completar un pago sandbox y comprobar que `Estado` cambie a `Canjeado` y `Usos` a `1`.

---

## Fuente: `README_PLANIFICADOR_LEADS.md`

# My Cusco Trip — Planificador de viaje / calificación de prospectos

Versión del backend integrado: `2026-08-09-v4.3-trip-planner-leads`

## 1. Diagnóstico de la estructura actual

La implementación se diseñó reutilizando la arquitectura existente de My Cusco Trip:

- `components/header.html` y `components/footer.html` se cargan dinámicamente.
- Identidad visual: `assets/css/main.css`, `components.css`, `header.css`, `footer.css`, `responsive.css`.
- Tipografías actuales: Montserrat + Open Sans.
- Lista de países existente: `assets/data/countries.json` (240 registros).
- Backend compartido: `assets/js/core/api-client.js` + `assets/data/backend-config.json`.
- Tracking compartido: `assets/js/config/tracking-config.js` + `assets/js/components/tracking.js`.
- Meta Pixel existente: el helper ya mapea `generate_lead` a `Lead`; no se agrega ningún Pixel nuevo.

La nueva funcionalidad usa `MyCuscoTripApiClient.postAction()` para hablar con el mismo Google Apps Script. Por eso **no fue necesario modificar `api-client.js`, `tracking.js`, header, footer ni archivos existentes del frontend**.

## 2. Archivos a crear / modificar

### Crear en GitHub

1. `planifica-tu-viaje.html`
2. `assets/css/trip-planner.css`
3. `assets/js/pages/trip-planner.js`

### Google Apps Script

Reemplazar el `Code.gs` actual por el archivo completo:

- `google-apps-script/Code.gs`

Ese archivo parte del backend actual V4.2 de cupones/correos y conserva las funciones existentes de cupones, reservas, PayPal, Mercado Pago y vouchers. Agrega únicamente el módulo `LEADS_WEB` y las acciones de verificación.

### No modificar

No hace falta modificar:

- `components/header.html`
- `components/footer.html`
- `assets/js/core/api-client.js`
- `assets/js/components/tracking.js`
- `assets/data/backend-config.json`, siempre que siga apuntando a la misma implementación `/exec` que vas a actualizar.
- cupones, PayPal, Mercado Pago, product pages o landings.

## 3. Estructura exacta de Google Sheets

La función `setupLeadPlannerSystem()` crea/verifica una hoja llamada `LEADS_WEB` con este orden:

1. ID
2. FechaRegistro
3. FechaActualizacion
4. Estado
5. Nombre
6. Apellido
7. Email
8. EmailVerificado
9. WhatsApp
10. PaisTelefono
11. Adultos
12. Ninos
13. EdadesNinos
14. EstadoFechas
15. FechaInicio
16. FechaFin
17. MesEstimado
18. SemanaEstimada
19. DuracionDias
20. EstadoVuelos
21. OrigenViaje
22. TipoServicio
23. Destinos
24. OtrosDestino
25. AlcanceViaje
26. AlcanceOtrosDestinos
27. Comentarios
28. OrigenLead
29. PaisCampana
30. CampanaParametro
31. UTMSource
32. UTMMedium
33. UTMCampaign
34. UTMContent
35. UTMTerm
36. FBCLID
37. PaginaOrigen
38. Referrer
39. ClientRequestID
40. CodigoVerificacion
41. CodigoExpira
42. UltimoEnvioCodigo
43. Reenvios
44. IntentosVerificacion
45. FechaVerificacion
46. NotificacionInternaEn
47. JSON

### Seguridad del código

`CodigoVerificacion` **NO almacena los 6 números en texto plano**. Guarda un hash SHA-256 construido con:

- ID del lead
- email
- código
- un `LEAD_VERIFICATION_PEPPER` privado guardado en Script Properties

Al verificar, el backend vuelve a generar el hash y compara. Tras una verificación correcta, el hash se borra.

## 4. Estados

Al solicitar una propuesta:

`PENDING_EMAIL`

Después de verificar correctamente el código:

`VERIFIED`

También se establece:

- `EmailVerificado = TRUE`
- `FechaVerificacion = fecha/hora`
- se borra el hash del código
- se envía el email interno a reservas

## 5. Implementación de Google Apps Script

1. Abre el Apps Script que ya usa My Cusco Trip.
2. Haz una copia de seguridad del `Code.gs` actual.
3. Reemplaza todo su contenido por `google-apps-script/Code.gs`.
4. Guarda.
5. En el selector de funciones ejecuta:

```javascript
setupLeadPlannerSystem
```

6. Autoriza los permisos solicitados.
7. Confirma que apareció la hoja `LEADS_WEB`.

`setupLeadPlannerSystem()` agrega estas propiedades sin borrar las credenciales de PayPal/Mercado Pago:

- `LEAD_CODE_TTL_MINUTES = 10`
- `LEAD_RESEND_COOLDOWN_SECONDS = 60`
- `LEAD_MAX_RESENDS = 5`
- `LEAD_MAX_VERIFY_ATTEMPTS = 8`
- `LEAD_CREATE_WINDOW_MINUTES = 15`
- `LEAD_CREATE_MAX_PER_WINDOW = 3`
- `LEAD_TIME_ZONE = America/Lima`
- `LEAD_NOTIFICATION_EMAIL = reservas@mycuscotrip.com`
- `LEAD_PLAN_URL = https://mycuscotrip.com/planifica-tu-viaje.html`
- `LEAD_VERIFICATION_PEPPER` generado automáticamente si no existe.

No necesitas ejecutar otra vez `setupScriptPropertiesExample()`.

## 6. Publicar / reimplementar Apps Script

Usa la implementación existente para conservar la misma URL:

1. Apps Script → **Implementar** → **Administrar implementaciones**.
2. Abre la aplicación web actual.
3. Editar.
4. Elige **Nueva versión**.
5. Ejecutar como: **Tú**.
6. Acceso: el mismo acceso público que ya utiliza tu backend actual.
7. Implementar.

Si conservaste la implementación, la URL `/exec` no cambia y no hay que tocar `backend-config.json`.

### Verificación del backend

Abre:

`TU_URL_EXEC?action=health`

Debe devolver una respuesta que incluya:

`2026-08-09-v4.3-trip-planner-leads`

## 7. Subir frontend a GitHub

Copia estos tres archivos en sus rutas exactas:

- `/planifica-tu-viaje.html`
- `/assets/css/trip-planner.css`
- `/assets/js/pages/trip-planner.js`

El formulario reutiliza los componentes y estilos existentes; no sobrescribe otros archivos.

La URL será:

`https://mycuscotrip.com/planifica-tu-viaje.html`

## 8. Flujo implementado

1. Datos del viajero.
2. Adultos/niños y edades dinámicas.
3. Fechas exactas, aproximadas o planificación.
4. Vuelos.
5. Duración si no existen fechas exactas.
6. Tipo de servicio.
7. Destinos múltiples.
8. Alcance Cusco / Perú.
9. Comentarios opcionales.
10. Resumen.
11. `Solicitar mi propuesta` crea registro provisional.
12. Backend genera código de 6 dígitos.
13. En Sheets solo guarda su hash.
14. Código dura 10 minutos.
15. Modal solicita los 6 dígitos.
16. Reenvío con cooldown visual y backend de 60 segundos.
17. Verificación actualiza a `VERIFIED`.
18. Se envía notificación interna.
19. Se dispara `generate_lead` mediante el tracking existente; Meta lo recibe como `Lead`.
20. Se muestra pantalla de éxito + WhatsApp.

## 9. Prellenado de WhatsApp y campañas

Prueba con:

`https://mycuscotrip.com/planifica-tu-viaje.html?phone=573001234567&country=CO&campaign=meta_colombia&utm_source=facebook&utm_medium=paid_social&utm_campaign=colombia_machu&utm_content=video_01&utm_term=viaje_cusco&fbclid=TEST123`

El frontend intenta separar automáticamente:

- país `CO`
- código `+57`
- número `3001234567`

Y guarda en Sheets:

- `PaisCampana = CO`
- `CampanaParametro = meta_colombia`
- UTM source/medium/campaign/content/term
- FBCLID
- URL original y referrer

## 10. Probar que el lead se guarda

1. Abre la página.
2. Completa los pasos.
3. Pulsa `Solicitar mi propuesta` una sola vez.
4. Revisa `LEADS_WEB`.

Antes de validar el correo debe verse:

- `Estado = PENDING_EMAIL`
- `EmailVerificado = FALSE`
- `CodigoVerificacion =` cadena hash larga, NO seis números
- `CodigoExpira =` aproximadamente 10 minutos después
- `ClientRequestID` informado

El `ClientRequestID` da idempotencia y reduce registros duplicados por doble clic o reintentos del navegador.

## 11. Probar el correo de 6 dígitos

Prueba real:

1. Introduce un correo que controles en el formulario.
2. En Sheets debe aparecer el lead.
3. Debes recibir asunto:

`Confirma los datos de tu viaje | My Cusco Trip`

4. El correo incluye el logo `Logo1.png`, el código grande y una vigencia de 10 minutos.
5. Introduce el código en el modal.

Prueba manual desde Apps Script:

1. Crea Script Property:
   - clave: `LEAD_EMAIL_TEST_TO`
   - valor: un correo donde quieras recibir la prueba.
2. Ejecuta la función visible:

```javascript
testLeadPlannerEmail
```

Envía un código visual de prueba `583921`; no crea un lead real.

## 12. Probar reenvío

- El botón permanece bloqueado 60 segundos.
- El backend también valida los 60 segundos; cambiar JavaScript desde DevTools no permite saltarse la regla.
- Cada reenvío genera un código nuevo, invalida el anterior y vuelve a dar 10 minutos.
- Máximo predeterminado: 5 reenvíos por lead.

## 13. Probar Meta Pixel Lead

El formulario NO dispara Lead al abrir la página ni al guardar `PENDING_EMAIL`.

Solo después de una transición correcta a `VERIFIED` llama:

`MyCuscoTripTracking.track('generate_lead', ...)`

El helper existente lo traduce a Meta estándar `Lead`.

Para revisar desde el navegador después de verificar:

```javascript
JSON.parse(localStorage.getItem('mct_tracking_debug_events') || '[]')
  .filter(e => e.eventName === 'generate_lead')
```

Debe existir un evento para ese lead.

También puedes abrir DevTools → Network y filtrar solicitudes de Meta; el evento enviado debe ser `Lead`.

Se usa una llave local por ID de lead para no volver a dispararlo al repetir la misma pantalla en ese navegador. El backend además devuelve `shouldTrackLead=true` únicamente en la primera transición real de `PENDING_EMAIL` a `VERIFIED`.

## 14. Probar UTMs

Abre la URL de prueba del punto 9 y verifica en `LEADS_WEB`:

- UTMSource = facebook
- UTMMedium = paid_social
- UTMCampaign = colombia_machu
- UTMContent = video_01
- UTMTerm = viaje_cusco
- FBCLID = TEST123

## 15. Notificación interna

Después de verificar se envía a:

`reservas@mycuscotrip.com`

El correo incluye:

- nombre
- WhatsApp
- email
- pasajeros
- fechas/mes
- duración
- vuelos
- tipo de servicio
- destinos
- comentarios
- origen/campaña
- botón `Contactar por WhatsApp`

Se registra `NotificacionInternaEn` para saber que fue enviada.

## 16. Rate limiting / protección

El backend implementa:

- botón frontend deshabilitado durante procesamiento
- idempotencia por `ClientRequestID`
- máximo 3 nuevas solicitudes por mismo email o WhatsApp en una ventana de 15 minutos
- cooldown servidor de 60 s para reenvío
- máximo 5 reenvíos
- máximo 8 intentos de código
- código expira en 10 minutos
- hash + pepper; código no visible en frontend/Sheets
- sanitización y límites de longitud
- validación servidor de fechas, pasajeros, opciones, email y teléfono
- `LockService` para evitar carreras/dobles envíos simultáneos

Todos estos valores se pueden ajustar en Script Properties sin editar código.

## 17. CORS / Google Apps Script

No se añadió una integración nueva de red. Se reutiliza el `api-client.js` existente, que para Apps Script envía `POST` como:

- `Content-Type: text/plain;charset=utf-8`
- `credentials: omit`
- URL `/exec`

Esto evita un preflight innecesario y mantiene el mismo mecanismo que ya usa el proyecto para cupones/reservas.

Si falla la conexión:

1. confirma que `backend-config.json` apunta a la implementación `/exec` correcta;
2. confirma que publicaste **Nueva versión** después de cambiar `Code.gs`;
3. abre `?action=health` y verifica la versión V4.3;
4. revisa que la aplicación web tenga el mismo acceso público que el backend que ya funciona;
5. no uses la URL `/dev` en producción;
6. abre DevTools → Network y revisa la respuesta del POST.

## 18. Alcance de esta entrega

Se creó una página nueva y dos assets nuevos. No se alteraron los HTML de productos, landings, checkout, PayPal, cupones, header ni footer. El único reemplazo funcional existente es el `Code.gs`, entregado completo para conservar todo el backend previo y sumar el módulo de leads.

---

## Fuente: `README_V4_FORM1_SEO_COMPACTO.md`

# My Cusco Trip – Planificador V4

Cambios limitados a:

1. `planifica-tu-viaje.html`
   - Título visible: `Planifica tu viaje`
   - `<title>` SEO: `Planifica tu viaje a Machu Picchu`
   - Meta description, Open Graph y Twitter optimizados.
   - Misma imagen social: `/public/share-image-v2.jpg`.
   - Cache bust del CSS a `20260809-4`.

2. `assets/css/trip-planner.css`
   - Reducción puntual de espacios verticales del contenedor, intro, progreso, cabeceras, secciones y navegación.
   - Sin cambios funcionales.

3. `form1/index.html`
   - URL corta: `https://mycuscotrip.com/form1/`
   - Redirige a `/planifica-tu-viaje.html`.
   - Conserva query string y hash (UTM, country, campaign, phone, fbclid, etc.).
   - Incluye Open Graph/Twitter para que al compartir `/form1/` aparezca la imagen social.
   - Usa canonical hacia la página real y `noindex,follow` para evitar duplicidad SEO.

No se modificó JavaScript, Google Apps Script, cupones, leads, Pixel, PayPal, header ni footer.

---

## Fuente: `README_V82_AJUSTES_PUNTUALES.md`

# My Cusco Trip — parche V8.2 (ajustes puntuales)

Este parche modifica únicamente:

1. El color del párrafo desplegado dentro de **Información importante** en el modal de pasajeros: blanco.
2. La posición del logo: se elimina el ajuste exclusivo de la landing y se usa el mismo header global que en el index.
3. La navegación de escritorio: si los elementos no caben, los últimos pasan a un botón compacto de más opciones, evitando superposición con el logo o el selector de idioma.
4. La carga del popup de cupón en las landings ES, EN y PT.

No cambia cupones, PayPal, precios, cards, formulario de pasajeros ni lógica de reservas.

## Instalación

Copia el contenido del ZIP sobre la raíz del repositorio y acepta el reemplazo de los archivos.

Para comprobar el popup como visitante nuevo, usa una ventana privada. El componente respeta su estado en `localStorage`, por lo que no vuelve a mostrarse inmediatamente si ya fue cerrado o si el usuario ya se registró.

---

## Fuente: `README_V83_POPUP_WHATSAPP_Y_GO.md`

# My Cusco Trip V8.3 — ajuste puntual del popup y URL corta

## Cambios realizados

1. El campo WhatsApp del popup se divide en una sola línea:
   - selector compacto de código internacional;
   - campo amplio para el número.
2. El selector carga todos los países desde `assets/data/countries.json`.
3. El valor enviado al Apps Script conserva el formato completo, por ejemplo: `+51987654321`.
4. Se añadieron únicamente dos textos de interfaz para el selector y el número en los idiomas existentes.
5. Se actualizaron las referencias de caché del popup para que el navegador cargue el cambio.
6. Se añadió `go/index.html`, que permite usar:
   - `https://mycuscotrip.com/go`
   - el navegador puede normalizarlo visualmente como `https://mycuscotrip.com/go/`.

La URL corta redirige a:

`/landing/machu-picchu-y-tours-peru.html`

También conserva parámetros y fragmentos de la URL. Incluye las mismas etiquetas de imagen social para que WhatsApp pueda mostrar la vista previa.

## Instalación

Copia el contenido del ZIP sobre la raíz del repositorio y acepta el reemplazo.

No se requiere cambiar ni volver a desplegar Google Apps Script.

---

## Fuente: `README_V97_GITHUB_Y_DEPLOY.md`

# My Cusco Trip V97 — Mi Reserva / Travel Voucher / Tickets

Este paquete contiene únicamente archivos aptos para el repositorio público.
No contiene pasajeros, números de documento ni seeds de reservas reales.

## Archivos que deben reemplazarse en GitHub

- `mi-reserva.html`
- `detalle-reserva.html`
- `verificar-reserva.html`
- `assets/js/pages/reservation-recovery.js`
- `assets/js/components/public-forms.js`
- `pages/ayuda/descargar-travel-voucher.html`
- `pages/ayuda/descargar-tickets-servicios.html`
- `google-apps-script/Code.gs` (copia fuente/versionada; además debe desplegarse en Google Apps Script)
- `landing/google-apps-script-machu-picchu-alternativas.gs` (copia fuente/versionada; además debe desplegarse en su Google Apps Script)

## Importante

Subir los `.gs` a GitHub NO actualiza el backend que está ejecutando Google.
Después del commit se debe copiar el contenido de los `.gs` a sus proyectos correspondientes de Google Apps Script y crear una nueva versión de las implementaciones web.

Si se edita una implementación existente, su URL `/exec` normalmente se conserva y no hay que cambiar el frontend. Si se crea una implementación completamente nueva, actualizar la URL correspondiente en la configuración del sitio.

## Reserva manual ya pagada

Los datos de una reserva real deben insertarse únicamente en el backend privado/Google Sheets. Nunca agregar números de pasaporte/documento, seeds privados ni payloads de pasajeros al repositorio público.

---

## Fuente: `README_V98_GITHUB_Y_DEPLOY.md`

# My Cusco Trip V98 — Travel Voucher

## Archivos públicos para GitHub
Esta V98 conserva los archivos públicos de V97 y actualiza principalmente:
- `detalle-reserva.html`

Cambios visuales del Travel Voucher:
- Fechas de servicios en formato día mes año.
- Fecha de nacimiento vacía cuando no existe dato.
- Sección Incluye con grupos y checks verdes.
- Formato de impresión con margen superior de 15 mm.
- Reducción del espacio interno superior del bloque Travel Voucher.

## Datos de reservas concretas
Los datos personales de pasajeros no deben almacenarse en GitHub. Las reservas concretas se actualizan en Google Sheets mediante scripts privados temporales ejecutados desde el Apps Script principal.

## Pasos
1. Subir/reemplazar los archivos de este paquete en GitHub manteniendo las rutas.
2. Esperar a que GitHub Pages publique la nueva versión.
3. Ejecutar por separado, en Google Apps Script, cualquier script privado de actualización de reserva.
4. Verificar la reserva desde Mi Reserva.
5. Eliminar del proyecto de Apps Script el archivo temporal con datos personales una vez comprobada la actualización.

## Backend
No es necesario reemplazar nuevamente `Code.gs` si el backend principal ya está en V97 y contiene la consulta de apellidos flexible y las funciones de reserva manual incorporadas en esa versión.
