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
