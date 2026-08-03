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
