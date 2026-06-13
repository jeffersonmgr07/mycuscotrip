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
