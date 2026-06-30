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
