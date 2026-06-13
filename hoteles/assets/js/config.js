/* My Cusco Trip · Hoteles Marketplace Config
   Configuración centralizada para la sección hoteles.
   La URL /exec de Apps Script se define aquí una sola vez.
*/
window.MCT_HOTEL_MARKETPLACE_CONFIG = window.MCT_HOTEL_MARKETPLACE_CONFIG || {
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbx7zclo0SnYqT0NMP6Uph3oB9XbTGeIIoWj6hWZ7lx2s3ftWMmIpshJ-XtgjEuijsLN/exec',
  paypalClientId: 'AUdRf58xVpVo-Iv_L_Je8UgE6ukF79cLynwRXUk3wU9WA4bfremVO0yRpkS3kFTUOE7O5ZOfoWMw8TlJ'
};

// Compatibilidad con versiones anteriores que usaban esta variable global.
window.MCT_HOTEL_MARKETPLACE_APPS_SCRIPT_URL =
  window.MCT_HOTEL_MARKETPLACE_APPS_SCRIPT_URL ||
  window.MCT_HOTEL_MARKETPLACE_CONFIG.appsScriptUrl ||
  '';

window.MCT_HOTEL_PAYPAL_CLIENT_ID =
  window.MCT_HOTEL_PAYPAL_CLIENT_ID ||
  window.MCT_HOTEL_MARKETPLACE_CONFIG.paypalClientId ||
  '';
