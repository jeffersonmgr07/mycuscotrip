# Hotfix V8.1 — validación de cupones

## Problemas corregidos

1. La landing reconstruía el resumen después de validar el cupón. Esa reconstrucción eliminaba el mensaje de éxito/error y vaciaba el campo cuando el cupón era rechazado.
2. La migración V8 podía dejar los encabezados nuevos de `Cupones` desplazados por columnas vacías.
3. `BETSWELCOME05` no se reactivaba si ya existía como expirado, canjeado o incompleto.
4. No había una forma sencilla de comprobar qué versión del Apps Script estaba atendiendo la web.

## Instalación

### 1. Google Apps Script

- Reemplaza `Code.gs` por `google-apps-script/Code.gs`.
- Ejecuta una vez `setupCouponSystem()`.
- No ejecutes `setupScriptPropertiesExample()` si tus credenciales de PayPal ya están configuradas.
- Actualiza la implementación existente: **Implementar > Administrar implementaciones > Editar > Nueva versión**.

### 2. Verificación del backend

Abre la URL `/exec` de tu Apps Script con:

```text
?action=health
```

Debe devolver la versión:

```text
2026-08-03-v4.1-cupones-validacion-ui-fix
```

Prueba el cupón público con:

```text
?action=couponHealth&couponCode=BETSWELCOME05&subtotal=399&currency=USD&locale=es
```

Debe devolver:

```json
{
  "validation": {
    "valid": true,
    "value": 5,
    "discountAmount": 19.95
  }
}
```

### 3. GitHub

Copia sobre la raíz del proyecto:

- `assets/js/pages/landing-machu-picchu-tours.js`
- `assets/js/pages/landing-machu-picchu-tours-en.js`
- `assets/js/pages/landing-machu-picchu-tours-pt.js`
- `landing/machu-picchu-y-tours-peru.html`
- `en/landing/machu-picchu-y-tours-peru.html`
- `pt/landing/machu-picchu-y-tours-peru.html`

Los HTML cambian la versión del JavaScript a `20260803-81` para evitar caché.

## Comportamiento esperado

- Un cupón inválido o vencido permanece escrito en el campo y muestra el motivo debajo.
- Un cupón válido permanece visible, muestra confirmación y actualiza subtotal, descuento y total.
- `BETSWELCOME05` aplica 5% y se mantiene como cupón público de uso ilimitado mientras esté activo.
- Los cupones personales generados desde el popup aplican 15%, duran al menos 48 horas y vencen al final de ese día.
