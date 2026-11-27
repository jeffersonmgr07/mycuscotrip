# Fase 1: optimización de portada

Base: 27-11-2026. Portadas ES, EN, PT, FR, DE, IT, ZH, JA.

## Cambios
- Un solo elemento de video: los dos MP4 originales tienen el mismo blob y pesan 8 293 001 bytes cada uno. Se conservan ambos archivos para compatibilidad con otras rutas.
- Carga del MP4 después del evento load y tiempo ocioso; imagen de respaldo inmediata. Se mantiene la velocidad de reproducción según pantalla. Sin autoplay para ahorro de datos, red 2G o preferencia de movimiento reducido.
- Decodificación asíncrona de las imágenes lazy existentes en las portadas.
- Sin cambios a precios, formularios, CSS de diseño, APIs, checkout ni Apps Script.

## Validación antes de publicar
- Chrome DevTools, caché deshabilitada, comparar móvil y escritorio, red normal y Slow 4G. Verificar un solo MP4 solicitado por portada, ninguno antes de load; comprobar que en ahorro de datos/2G/movimiento reducido no se solicite.
- Verificar imagen de respaldo, reproducción, navegación, buscador, productos destacados, modal y enlaces a cotizador/checkout. Revisar las ocho portadas.
- Registrar LCP, CLS, INP (si hay datos de campo), bytes transferidos y solicitudes en Lighthouse/PageSpeed y DevTools; repetir tres veces.

## Pendientes
Comprimir MP4 con FFmpeg manteniendo el original; generar WebP de las imágenes de portada, medir tamaños y calidad antes de reemplazar referencias. No se han medido aún las transferencias reales ni ejecutado pruebas de navegador.
