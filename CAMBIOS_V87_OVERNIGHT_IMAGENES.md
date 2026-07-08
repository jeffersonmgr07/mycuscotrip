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
