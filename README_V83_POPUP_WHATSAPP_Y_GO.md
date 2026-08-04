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
