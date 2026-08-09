# My Cusco Trip — Afinación Planificador V2

## Archivos que debes reemplazar

En GitHub:

- `planifica-tu-viaje.html`
- `assets/css/trip-planner.css`
- `assets/js/pages/trip-planner.js`

En Google Apps Script:

- reemplazar completamente `Code.gs` por `google-apps-script/Code.gs`

No se modifica ningún otro HTML, producto, landing, PayPal, Mercado Pago ni componente global.

## Cambios visuales y de flujo

- El título queda dentro de la card del formulario y se elimina el badge superior y la descripción larga.
- Título: `Cuéntanos sobre tu próximo viaje 🇵🇪`.
- Se compactan márgenes superiores, progreso, cabecera de cada paso y espacio inferior.
- Paso 1 usa el nuevo texto de itinerarios.
- Si el usuario marca `Todavía estoy planificando`, no se pregunta por vuelos. El backend registra ese estado como `planning` automáticamente.
- Se elimina la pregunta redundante sobre combinar Cusco con otros destinos. Los destinos seleccionados arriba son suficientes.
- El botón del paso 4 queda como `Revisar`.
- El botón final queda como `Enviar`.

## Cupón por completar el planificador

El cupón se genera **solo después de verificar correctamente el email**.

Características:

- 10% de descuento.
- Un solo uso.
- Sin fecha de caducidad.
- Personal y vinculado al correo del prospecto.
- Se guarda en la misma hoja `Cupones` utilizada por landings y productos.
- `Fuente = trip_planner_verified`.
- No es acumulable con otros cupones porque el checkout actual admite un único cupón.

### Control para no llenar la hoja de cupones

El backend busca primero si ese correo ya recibió un cupón de beneficio del planificador.

- Si existe y sigue disponible, reutiliza el mismo código.
- Si ya fue canjeado, no genera uno nuevo para ese mismo correo.
- Por tanto, repetir el formulario no crea una cadena de cupones permanentes.

El popup normal del sitio **no se modifica**. Puede seguir ofreciendo su cupón temporal del 15% con la vigencia que ya tienes configurada. El cliente puede tener ambos códigos, pero solo puede aplicar uno por reserva.

## Nuevas columnas de LEADS_WEB

`setupLeadPlannerSystem()` agrega al final, sin borrar datos existentes:

- `CodigoCuponBeneficio`
- `CuponBeneficioEnviadoEn`

## Nuevas propiedades del script

`setupLeadPlannerSystem()` registra, sin sobrescribir credenciales existentes:

- `LEAD_REWARD_COUPON_ENABLED = true`
- `LEAD_REWARD_COUPON_PERCENT = 10`
- `LEAD_REWARD_COUPON_URL = https://mycuscotrip.com/go`

## Instalación

1. Reemplaza `Code.gs` completo.
2. Guarda el proyecto de Apps Script.
3. Ejecuta una vez `setupLeadPlannerSystem()`.
4. Autoriza si Google lo solicita.
5. Ve a **Implementar → Administrar implementaciones → Editar**.
6. Selecciona **Nueva versión** y vuelve a implementar la misma aplicación web.
7. No cambies la URL `/exec` en `backend-config.json` si actualizaste la implementación existente.
8. Sube a GitHub los tres archivos indicados arriba.

## Prueba recomendada

1. Abre la página en incógnito.
2. Completa el formulario con un email de prueba.
3. En Paso 2 elige `Todavía estoy planificando`: no debe aparecer la pregunta de vuelos.
4. Finaliza y pulsa `Enviar`.
5. Verifica el email con el código de 6 dígitos.
6. Comprueba que `LEADS_WEB` pase a `VERIFIED`.
7. Comprueba que se llenen `CodigoCuponBeneficio` y `CuponBeneficioEnviadoEn`.
8. Comprueba en `Cupones` un registro con:
   - `Tipo = percent`
   - `Valor = 10`
   - `MaxUsos = 1`
   - `VigenteHasta` vacío
   - `Fuente = trip_planner_verified`
9. Debe llegar un segundo correo con el cupón del 10% y enlace a `https://mycuscotrip.com/go`.
10. Prueba el código en una landing/producto con campo cupón.

## Importante

No ejecutes `setupScriptPropertiesExample()` si ya tienes credenciales reales de PayPal y Mercado Pago configuradas. Para esta actualización solo necesitas ejecutar `setupLeadPlannerSystem()`.
