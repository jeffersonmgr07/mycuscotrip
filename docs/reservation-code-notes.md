# Código de reserva CUZ — formato V93 (30 de julio de 2026)

## Formato visible

El checkout de `product.html` usa el formato solicitado:

```text
CUZ + 6 caracteres hexadecimales en mayúsculas
```

Ejemplo:

```text
CUZ1A2B3C
```

La generación está implementada en `assets/js/pages/product.js`, dentro del parche **MCT V93**.

## Cómo se genera

1. Se toma la marca temporal del momento en que se crea la pre-reserva mediante `Date.now()`.
2. Se agrega la medición de alta resolución de `performance.now()`, convertida a microsegundos aproximados.
3. Se incorpora un contador de reintento local.
4. La cadena temporal se mezcla mediante FNV-1a y se reduce a 24 bits.
5. El valor se representa como seis dígitos hexadecimales y se antepone `CUZ`.

El navegador no garantiza microsegundos absolutos del sistema operativo: `performance.now()` ofrece una medición de alta resolución cuyo nivel exacto puede reducirse por políticas de privacidad del navegador. Por ello, el valor debe considerarse una derivación temporal de alta resolución, no un reloj forense.

## Límite matemático y unicidad

Seis caracteres hexadecimales ofrecen **16,777,216 combinaciones**. El frontend revisa las reservas guardadas en el mismo navegador y reintenta hasta 32 veces ante una coincidencia local.

Esto no garantiza unicidad entre dispositivos. El backend debe ser la autoridad final:

1. Guardar el código en una columna o índice único.
2. Rechazar una colisión y devolver un código nuevo.
3. Devolver siempre el código definitivo al frontend antes de crear la orden PayPal.
4. No utilizar el código como único factor de autenticación para consultar datos personales.

## Compatibilidad

La página `mi-reserva.html` no limita la búsqueda a nueve caracteres; mantiene compatibilidad con códigos históricos de mayor longitud. El placeholder muestra el formato nuevo `CUZ1A2B3C`.
