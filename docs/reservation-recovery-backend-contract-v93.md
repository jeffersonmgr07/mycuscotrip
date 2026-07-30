# Contrato backend V93 — recuperación de reservas y pagos pendientes

## Objetivo

Permitir que un cliente que salió o canceló PayPal recupere la pre-reserva desde otro navegador o dispositivo usando:

- código de reserva; y
- correo registrado **o** apellido del titular.

La búsqueda nunca debe devolver una reserva completa usando solo el código.

## 1. Crear pre-reserva

Acción Apps Script:

```json
{
  "action": "createPreReservation",
  "payload": {
    "code": "CUZ1A2B3C",
    "holder": {
      "firstName": "Ana",
      "lastName": "Pérez",
      "email": "ana@example.com"
    },
    "productSlug": "machu-picchu-full-day-express",
    "paymentStatus": "pending"
  }
}
```

El backend debe normalizar y almacenar como mínimo:

- `reservationCode` en mayúsculas;
- `holderEmailNormalized` en minúsculas y sin espacios laterales;
- `holderLastNameNormalized` sin tildes, en mayúsculas y sin espacios duplicados;
- `productSlug`;
- payload completo de la pre-reserva;
- estado de reserva y estado de pago;
- fechas de creación y actualización;
- identificador de la orden PayPal, cuando exista.

La columna `reservationCode` debe ser única. Si el código provisional ya existe, el backend debe generar o solicitar otro código y devolver el definitivo.

Respuesta esperada:

```json
{
  "ok": true,
  "reservationCode": "CUZ1A2B3C",
  "paymentStatus": "pending"
}
```

## 2. Buscar reserva

Acción Apps Script/API:

```json
{
  "action": "lookupReservation",
  "payload": {
    "code": "CUZ1A2B3C",
    "reservationCode": "CUZ1A2B3C",
    "email": "ana@example.com",
    "lastName": "",
    "identifier": "ana@example.com"
  }
}
```

También se admite búsqueda con apellido:

```json
{
  "reservationCode": "CUZ1A2B3C",
  "lastName": "Pérez"
}
```

Reglas:

1. Exigir código y al menos un identificador.
2. Comparar correo normalizado o apellido normalizado.
3. Aplicar límite de intentos por IP/sesión y registro de auditoría.
4. No indicar si el código existe cuando el identificador no coincide; devolver un mensaje genérico.
5. No devolver documentos completos, fechas de nacimiento ni otros datos sensibles antes de validar la identidad.

Respuesta encontrada:

```json
{
  "ok": true,
  "found": true,
  "reservation": {
    "reservationCode": "CUZ1A2B3C",
    "productSlug": "machu-picchu-full-day-express",
    "paymentStatus": "pending",
    "payload": {}
  }
}
```

Respuesta no encontrada o identidad inválida:

```json
{
  "ok": true,
  "found": false,
  "message": "No se encontró una reserva con esos datos."
}
```

## 3. Crear orden PayPal

El backend debe crear la orden con el código definitivo y asociar el `orderId` a la pre-reserva. La URL de cancelación debe regresar al producto con:

```text
product.html?payment=cancelled&reservationCode=CUZ1A2B3C&slug=...
```

La URL de retorno debe incluir el código o permitir resolverlo desde el `orderId`.

## 4. Reanudar el pago

Después de validar código + identidad, el backend debe devolver la pre-reserva vigente. Antes de crear una nueva orden PayPal debe:

- recalcular el precio desde el catálogo del servidor;
- verificar disponibilidad, fecha, trenes, entradas y extras;
- invalidar órdenes anteriores aún abiertas cuando corresponda;
- registrar el nuevo intento de pago.

## 5. Estado del frontend V93

El frontend ya:

- guarda temporalmente código, correo, apellido y payload antes de redirigir a PayPal;
- muestra un aviso amigable cuando el pago no se completa;
- ofrece el enlace `mi-reserva.html?codigo=...`;
- exige código + correo o apellido;
- intenta recuperar primero el borrador local y luego llama a `lookupReservation`.

La recuperación entre dispositivos requiere publicar una versión del Apps Script/API que implemente este contrato.
