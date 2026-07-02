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
