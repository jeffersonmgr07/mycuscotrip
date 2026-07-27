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
