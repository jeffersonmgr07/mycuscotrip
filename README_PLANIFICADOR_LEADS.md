# My Cusco Trip — Planificador de viaje / calificación de prospectos

Versión del backend integrado: `2026-08-09-v4.3-trip-planner-leads`

## 1. Diagnóstico de la estructura actual

La implementación se diseñó reutilizando la arquitectura existente de My Cusco Trip:

- `components/header.html` y `components/footer.html` se cargan dinámicamente.
- Identidad visual: `assets/css/main.css`, `components.css`, `header.css`, `footer.css`, `responsive.css`.
- Tipografías actuales: Montserrat + Open Sans.
- Lista de países existente: `assets/data/countries.json` (240 registros).
- Backend compartido: `assets/js/core/api-client.js` + `assets/data/backend-config.json`.
- Tracking compartido: `assets/js/config/tracking-config.js` + `assets/js/components/tracking.js`.
- Meta Pixel existente: el helper ya mapea `generate_lead` a `Lead`; no se agrega ningún Pixel nuevo.

La nueva funcionalidad usa `MyCuscoTripApiClient.postAction()` para hablar con el mismo Google Apps Script. Por eso **no fue necesario modificar `api-client.js`, `tracking.js`, header, footer ni archivos existentes del frontend**.

## 2. Archivos a crear / modificar

### Crear en GitHub

1. `planifica-tu-viaje.html`
2. `assets/css/trip-planner.css`
3. `assets/js/pages/trip-planner.js`

### Google Apps Script

Reemplazar el `Code.gs` actual por el archivo completo:

- `google-apps-script/Code.gs`

Ese archivo parte del backend actual V4.2 de cupones/correos y conserva las funciones existentes de cupones, reservas, PayPal, Mercado Pago y vouchers. Agrega únicamente el módulo `LEADS_WEB` y las acciones de verificación.

### No modificar

No hace falta modificar:

- `components/header.html`
- `components/footer.html`
- `assets/js/core/api-client.js`
- `assets/js/components/tracking.js`
- `assets/data/backend-config.json`, siempre que siga apuntando a la misma implementación `/exec` que vas a actualizar.
- cupones, PayPal, Mercado Pago, product pages o landings.

## 3. Estructura exacta de Google Sheets

La función `setupLeadPlannerSystem()` crea/verifica una hoja llamada `LEADS_WEB` con este orden:

1. ID
2. FechaRegistro
3. FechaActualizacion
4. Estado
5. Nombre
6. Apellido
7. Email
8. EmailVerificado
9. WhatsApp
10. PaisTelefono
11. Adultos
12. Ninos
13. EdadesNinos
14. EstadoFechas
15. FechaInicio
16. FechaFin
17. MesEstimado
18. SemanaEstimada
19. DuracionDias
20. EstadoVuelos
21. OrigenViaje
22. TipoServicio
23. Destinos
24. OtrosDestino
25. AlcanceViaje
26. AlcanceOtrosDestinos
27. Comentarios
28. OrigenLead
29. PaisCampana
30. CampanaParametro
31. UTMSource
32. UTMMedium
33. UTMCampaign
34. UTMContent
35. UTMTerm
36. FBCLID
37. PaginaOrigen
38. Referrer
39. ClientRequestID
40. CodigoVerificacion
41. CodigoExpira
42. UltimoEnvioCodigo
43. Reenvios
44. IntentosVerificacion
45. FechaVerificacion
46. NotificacionInternaEn
47. JSON

### Seguridad del código

`CodigoVerificacion` **NO almacena los 6 números en texto plano**. Guarda un hash SHA-256 construido con:

- ID del lead
- email
- código
- un `LEAD_VERIFICATION_PEPPER` privado guardado en Script Properties

Al verificar, el backend vuelve a generar el hash y compara. Tras una verificación correcta, el hash se borra.

## 4. Estados

Al solicitar una propuesta:

`PENDING_EMAIL`

Después de verificar correctamente el código:

`VERIFIED`

También se establece:

- `EmailVerificado = TRUE`
- `FechaVerificacion = fecha/hora`
- se borra el hash del código
- se envía el email interno a reservas

## 5. Implementación de Google Apps Script

1. Abre el Apps Script que ya usa My Cusco Trip.
2. Haz una copia de seguridad del `Code.gs` actual.
3. Reemplaza todo su contenido por `google-apps-script/Code.gs`.
4. Guarda.
5. En el selector de funciones ejecuta:

```javascript
setupLeadPlannerSystem
```

6. Autoriza los permisos solicitados.
7. Confirma que apareció la hoja `LEADS_WEB`.

`setupLeadPlannerSystem()` agrega estas propiedades sin borrar las credenciales de PayPal/Mercado Pago:

- `LEAD_CODE_TTL_MINUTES = 10`
- `LEAD_RESEND_COOLDOWN_SECONDS = 60`
- `LEAD_MAX_RESENDS = 5`
- `LEAD_MAX_VERIFY_ATTEMPTS = 8`
- `LEAD_CREATE_WINDOW_MINUTES = 15`
- `LEAD_CREATE_MAX_PER_WINDOW = 3`
- `LEAD_TIME_ZONE = America/Lima`
- `LEAD_NOTIFICATION_EMAIL = reservas@mycuscotrip.com`
- `LEAD_PLAN_URL = https://mycuscotrip.com/planifica-tu-viaje.html`
- `LEAD_VERIFICATION_PEPPER` generado automáticamente si no existe.

No necesitas ejecutar otra vez `setupScriptPropertiesExample()`.

## 6. Publicar / reimplementar Apps Script

Usa la implementación existente para conservar la misma URL:

1. Apps Script → **Implementar** → **Administrar implementaciones**.
2. Abre la aplicación web actual.
3. Editar.
4. Elige **Nueva versión**.
5. Ejecutar como: **Tú**.
6. Acceso: el mismo acceso público que ya utiliza tu backend actual.
7. Implementar.

Si conservaste la implementación, la URL `/exec` no cambia y no hay que tocar `backend-config.json`.

### Verificación del backend

Abre:

`TU_URL_EXEC?action=health`

Debe devolver una respuesta que incluya:

`2026-08-09-v4.3-trip-planner-leads`

## 7. Subir frontend a GitHub

Copia estos tres archivos en sus rutas exactas:

- `/planifica-tu-viaje.html`
- `/assets/css/trip-planner.css`
- `/assets/js/pages/trip-planner.js`

El formulario reutiliza los componentes y estilos existentes; no sobrescribe otros archivos.

La URL será:

`https://mycuscotrip.com/planifica-tu-viaje.html`

## 8. Flujo implementado

1. Datos del viajero.
2. Adultos/niños y edades dinámicas.
3. Fechas exactas, aproximadas o planificación.
4. Vuelos.
5. Duración si no existen fechas exactas.
6. Tipo de servicio.
7. Destinos múltiples.
8. Alcance Cusco / Perú.
9. Comentarios opcionales.
10. Resumen.
11. `Solicitar mi propuesta` crea registro provisional.
12. Backend genera código de 6 dígitos.
13. En Sheets solo guarda su hash.
14. Código dura 10 minutos.
15. Modal solicita los 6 dígitos.
16. Reenvío con cooldown visual y backend de 60 segundos.
17. Verificación actualiza a `VERIFIED`.
18. Se envía notificación interna.
19. Se dispara `generate_lead` mediante el tracking existente; Meta lo recibe como `Lead`.
20. Se muestra pantalla de éxito + WhatsApp.

## 9. Prellenado de WhatsApp y campañas

Prueba con:

`https://mycuscotrip.com/planifica-tu-viaje.html?phone=573001234567&country=CO&campaign=meta_colombia&utm_source=facebook&utm_medium=paid_social&utm_campaign=colombia_machu&utm_content=video_01&utm_term=viaje_cusco&fbclid=TEST123`

El frontend intenta separar automáticamente:

- país `CO`
- código `+57`
- número `3001234567`

Y guarda en Sheets:

- `PaisCampana = CO`
- `CampanaParametro = meta_colombia`
- UTM source/medium/campaign/content/term
- FBCLID
- URL original y referrer

## 10. Probar que el lead se guarda

1. Abre la página.
2. Completa los pasos.
3. Pulsa `Solicitar mi propuesta` una sola vez.
4. Revisa `LEADS_WEB`.

Antes de validar el correo debe verse:

- `Estado = PENDING_EMAIL`
- `EmailVerificado = FALSE`
- `CodigoVerificacion =` cadena hash larga, NO seis números
- `CodigoExpira =` aproximadamente 10 minutos después
- `ClientRequestID` informado

El `ClientRequestID` da idempotencia y reduce registros duplicados por doble clic o reintentos del navegador.

## 11. Probar el correo de 6 dígitos

Prueba real:

1. Introduce un correo que controles en el formulario.
2. En Sheets debe aparecer el lead.
3. Debes recibir asunto:

`Confirma los datos de tu viaje | My Cusco Trip`

4. El correo incluye el logo `Logo1.png`, el código grande y una vigencia de 10 minutos.
5. Introduce el código en el modal.

Prueba manual desde Apps Script:

1. Crea Script Property:
   - clave: `LEAD_EMAIL_TEST_TO`
   - valor: un correo donde quieras recibir la prueba.
2. Ejecuta la función visible:

```javascript
testLeadPlannerEmail
```

Envía un código visual de prueba `583921`; no crea un lead real.

## 12. Probar reenvío

- El botón permanece bloqueado 60 segundos.
- El backend también valida los 60 segundos; cambiar JavaScript desde DevTools no permite saltarse la regla.
- Cada reenvío genera un código nuevo, invalida el anterior y vuelve a dar 10 minutos.
- Máximo predeterminado: 5 reenvíos por lead.

## 13. Probar Meta Pixel Lead

El formulario NO dispara Lead al abrir la página ni al guardar `PENDING_EMAIL`.

Solo después de una transición correcta a `VERIFIED` llama:

`MyCuscoTripTracking.track('generate_lead', ...)`

El helper existente lo traduce a Meta estándar `Lead`.

Para revisar desde el navegador después de verificar:

```javascript
JSON.parse(localStorage.getItem('mct_tracking_debug_events') || '[]')
  .filter(e => e.eventName === 'generate_lead')
```

Debe existir un evento para ese lead.

También puedes abrir DevTools → Network y filtrar solicitudes de Meta; el evento enviado debe ser `Lead`.

Se usa una llave local por ID de lead para no volver a dispararlo al repetir la misma pantalla en ese navegador. El backend además devuelve `shouldTrackLead=true` únicamente en la primera transición real de `PENDING_EMAIL` a `VERIFIED`.

## 14. Probar UTMs

Abre la URL de prueba del punto 9 y verifica en `LEADS_WEB`:

- UTMSource = facebook
- UTMMedium = paid_social
- UTMCampaign = colombia_machu
- UTMContent = video_01
- UTMTerm = viaje_cusco
- FBCLID = TEST123

## 15. Notificación interna

Después de verificar se envía a:

`reservas@mycuscotrip.com`

El correo incluye:

- nombre
- WhatsApp
- email
- pasajeros
- fechas/mes
- duración
- vuelos
- tipo de servicio
- destinos
- comentarios
- origen/campaña
- botón `Contactar por WhatsApp`

Se registra `NotificacionInternaEn` para saber que fue enviada.

## 16. Rate limiting / protección

El backend implementa:

- botón frontend deshabilitado durante procesamiento
- idempotencia por `ClientRequestID`
- máximo 3 nuevas solicitudes por mismo email o WhatsApp en una ventana de 15 minutos
- cooldown servidor de 60 s para reenvío
- máximo 5 reenvíos
- máximo 8 intentos de código
- código expira en 10 minutos
- hash + pepper; código no visible en frontend/Sheets
- sanitización y límites de longitud
- validación servidor de fechas, pasajeros, opciones, email y teléfono
- `LockService` para evitar carreras/dobles envíos simultáneos

Todos estos valores se pueden ajustar en Script Properties sin editar código.

## 17. CORS / Google Apps Script

No se añadió una integración nueva de red. Se reutiliza el `api-client.js` existente, que para Apps Script envía `POST` como:

- `Content-Type: text/plain;charset=utf-8`
- `credentials: omit`
- URL `/exec`

Esto evita un preflight innecesario y mantiene el mismo mecanismo que ya usa el proyecto para cupones/reservas.

Si falla la conexión:

1. confirma que `backend-config.json` apunta a la implementación `/exec` correcta;
2. confirma que publicaste **Nueva versión** después de cambiar `Code.gs`;
3. abre `?action=health` y verifica la versión V4.3;
4. revisa que la aplicación web tenga el mismo acceso público que el backend que ya funciona;
5. no uses la URL `/dev` en producción;
6. abre DevTools → Network y revisa la respuesta del POST.

## 18. Alcance de esta entrega

Se creó una página nueva y dos assets nuevos. No se alteraron los HTML de productos, landings, checkout, PayPal, cupones, header ni footer. El único reemplazo funcional existente es el `Code.gs`, entregado completo para conservar todo el backend previo y sumar el módulo de leads.
