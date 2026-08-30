"use strict";

/**
 * My Cusco Trip - Tracking configuration
 *
 * IDs configurados:
 * - Google Analytics 4
 * - Google Tag Manager
 * - Meta / Facebook Pixel
 * - TikTok Pixel
 */
window.MCT_TRACKING_CONFIG = {
  enabled: true,
  debug: false,

  // Meta / Facebook Pixel
  facebookPixelId: "265041872328503",

  // Google Analytics 4
  googleAnalyticsId: "G-KKBCNTBG7L",

  // Google Tag Manager
  googleTagManagerId: "GTM-TCTMMDS",

  // TikTok Pixel
  tiktokPixelId: "D81D3UJC77U9TECLNF10",

  // Google Ads conversion tracking, opcional para campañas de búsqueda/display.
  googleAdsConversionId: "",
  googleAdsConversionLabel: "",

  business: {
    name: "My Cusco Trip",
    currency: "USD",
    whatsapp: "51900608980"
  }
};

/**
 * Configuración comercial pública — lanzamiento septiembre 2026.
 *
 * Esta capa NO reemplaza costos internos, tarifarios de proveedor ni lógica del cotizador.
 * Centraliza únicamente valores que deben mostrarse/cobrarse en la web pública.
 * Los códigos internos son estables entre ES/EN aunque los slugs localizados cambien.
 */
window.MCT_COMMERCIAL_CONFIG = {
  tripadvisorRating: 4.4,
  autoFullPaymentDiscountPercent: 0,
  incompleteSeoLocales: ["pt", "fr", "it", "de", "ja", "zh"],

  productsByCode: {
    MAPI001: { adult: 399.90, priceMode: "public_fixed" },
    MAPI002: { adult: 429.90, priceMode: "public_fixed" },
    MAPI003: { adult: 449.90, priceMode: "public_fixed" },
    MAPI004: { adult: 479.90, priceMode: "public_fixed" },
    MAPI005: { adult: 469.90, priceMode: "public_fixed" },
    MAPI006: { adult: 459.90, priceMode: "public_fixed" },
    MAPI007: { priceMode: "on_request" },
    MAPI008: { priceMode: "on_request" },
    MAPI009: { priceMode: "on_request" },
    MAPI010: { priceMode: "on_request" },

    CUZ001: { adult: 24.90, priceMode: "public_fixed" },
    CUZ002: { adult: 19.90, priceMode: "public_fixed" },
    CUZ003FD: { adult: 39.90, priceMode: "public_fixed" },
    CUZ003CON: { adult: 39.90, priceMode: "public_fixed" },
    CUZ003VIP: { adult: 49.90, priceMode: "public_fixed" },
    CUZ003VIPCON: { adult: 49.90, priceMode: "public_fixed" },
    CUZ004: { adult: 24.90, priceMode: "public_fixed" },
    CUZ005: { adult: 24.90, priceMode: "public_fixed" },
    CUZ006: { adult: 49.90, priceMode: "public_fixed" },
    CUZ007: { adult: 39.90, priceMode: "public_fixed" },
    CUZ008: { adult: 49.90, priceMode: "public_fixed" }
    // CUZ009 (Siete Lagunas) queda deliberadamente fuera: revisión manual pendiente.
  },

  homeFeaturedIdentities: ["MAPI001", "MAPI003", "CUZ007", "CUZ006", "CUZ003FD", "pkg_cusco_4d3n"],
  quoteOnlyIdentities: ["pkg_cusco_4d3n"],

  // Permite resolver URLs ES/EN hacia el mismo producto sin duplicar datos.
  slugToIdentity: {
    "machu-picchu-full-day-clasico": "MAPI001",
    "machu-picchu-full-day-classic": "MAPI001",
    "machu-picchu-full-day-express": "MAPI002",
    "machu-picchu-overnight-clasico": "MAPI003",
    "machu-picchu-overnight-classic": "MAPI003",
    "machu-picchu-overnight-express": "MAPI004",
    "machu-picchu-panoramico-vistadome": "MAPI005",
    "machu-picchu-the-prime": "MAPI006",
    "machu-picchu-first-class": "MAPI007",
    "machu-picchu-first-class-overnight": "MAPI008",
    "machu-picchu-luxury-hiram-bingham": "MAPI009",
    "machu-picchu-luxury-overnight": "MAPI010",
    "bienvenida-ancestral-cusco": "CUZ001",
    "ancestral-welcome-to-cusco": "CUZ001",
    "city-tour-cusco": "CUZ002",
    "cusco-city-tour-archaeological-sites": "CUZ002",
    "valle-sagrado-full-day": "CUZ003FD",
    "sacred-valley-of-the-incas-full-day": "CUZ003FD",
    "valle-sagrado-conexion-machu-picchu": "CUZ003CON",
    "sacred-valley-connection-to-machu-picchu": "CUZ003CON",
    "valle-sagrado-vip-full-day": "CUZ003VIP",
    "sacred-valley-vip-full-day": "CUZ003VIP",
    "valle-sagrado-vip-conexion-machu-picchu": "CUZ003VIPCON",
    "sacred-valley-vip-connection-to-machu-picchu": "CUZ003VIPCON",
    "maras-y-moray": "CUZ004",
    "maras-and-moray": "CUZ004",
    "valle-sur": "CUZ005",
    "south-valley-cusco": "CUZ005",
    "laguna-humantay": "CUZ006",
    "humantay-lake": "CUZ006",
    "montana-de-colores": "CUZ007",
    "rainbow-mountain-vinicunca": "CUZ007",
    "montana-palcoyo": "CUZ008",
    "palcoyo-rainbow-mountain": "CUZ008",
    "siete-lagunas-ausangate": "CUZ009",
    "seven-lakes-of-ausangate": "CUZ009",
    "paquetes-cusco-3-dias-2-noches": "pkg_cusco_3d2n",
    "cusco-package-3-days-2-nights": "pkg_cusco_3d2n",
    "paquetes-cusco-4-dias-3-noches": "pkg_cusco_4d3n",
    "cusco-package-4-days-3-nights": "pkg_cusco_4d3n",
    "paquetes-cusco-5-dias-4-noches": "pkg_cusco_5d4n",
    "cusco-package-5-days-4-nights": "pkg_cusco_5d4n",
    "paquetes-cusco-6-dias-5-noches": "pkg_cusco_6d5n",
    "cusco-package-6-days-5-nights": "pkg_cusco_6d5n",
    "paquetes-cusco-7-dias-6-noches": "pkg_cusco_7d6n",
    "cusco-package-7-days-6-nights": "pkg_cusco_7d6n",
    "paquetes-cusco-8-dias-7-noches": "pkg_cusco_8d7n",
    "cusco-package-8-days-7-nights": "pkg_cusco_8d7n",
    "paquetes-cusco-9-dias-8-noches": "pkg_cusco_9d8n",
    "cusco-package-9-days-8-nights": "pkg_cusco_9d8n",
    "paquetes-cusco-10-dias-9-noches": "pkg_cusco_10d9n",
    "cusco-package-10-days-9-nights": "pkg_cusco_10d9n"
  },

  localizedSlugsByIdentity: {
    MAPI001: { es: "machu-picchu-full-day-clasico", en: "machu-picchu-full-day-classic" },
    MAPI002: { es: "machu-picchu-full-day-express", en: "machu-picchu-full-day-express" },
    MAPI003: { es: "machu-picchu-overnight-clasico", en: "machu-picchu-overnight-classic" },
    MAPI004: { es: "machu-picchu-overnight-express", en: "machu-picchu-overnight-express" },
    MAPI005: { es: "machu-picchu-panoramico-vistadome", en: "machu-picchu-panoramico-vistadome" },
    MAPI006: { es: "machu-picchu-the-prime", en: "machu-picchu-the-prime" },
    MAPI007: { es: "machu-picchu-first-class", en: "machu-picchu-first-class" },
    MAPI008: { es: "machu-picchu-first-class-overnight", en: "machu-picchu-first-class-overnight" },
    MAPI009: { es: "machu-picchu-luxury-hiram-bingham", en: "machu-picchu-luxury-hiram-bingham" },
    MAPI010: { es: "machu-picchu-luxury-overnight", en: "machu-picchu-luxury-overnight" },
    CUZ001: { es: "bienvenida-ancestral-cusco", en: "ancestral-welcome-to-cusco" },
    CUZ002: { es: "city-tour-cusco", en: "cusco-city-tour-archaeological-sites" },
    CUZ003FD: { es: "valle-sagrado-full-day", en: "sacred-valley-of-the-incas-full-day" },
    CUZ003CON: { es: "valle-sagrado-conexion-machu-picchu", en: "sacred-valley-connection-to-machu-picchu" },
    CUZ003VIP: { es: "valle-sagrado-vip-full-day", en: "sacred-valley-vip-full-day" },
    CUZ003VIPCON: { es: "valle-sagrado-vip-conexion-machu-picchu", en: "sacred-valley-vip-connection-to-machu-picchu" },
    CUZ004: { es: "maras-y-moray", en: "maras-and-moray" },
    CUZ005: { es: "valle-sur", en: "south-valley-cusco" },
    CUZ006: { es: "laguna-humantay", en: "humantay-lake" },
    CUZ007: { es: "montana-de-colores", en: "rainbow-mountain-vinicunca" },
    CUZ008: { es: "montana-palcoyo", en: "palcoyo-rainbow-mountain" },
    CUZ009: { es: "siete-lagunas-ausangate", en: "seven-lakes-of-ausangate" },
    pkg_cusco_3d2n: { es: "paquetes-cusco-3-dias-2-noches", en: "cusco-package-3-days-2-nights" },
    pkg_cusco_4d3n: { es: "paquetes-cusco-4-dias-3-noches", en: "cusco-package-4-days-3-nights" },
    pkg_cusco_5d4n: { es: "paquetes-cusco-5-dias-4-noches", en: "cusco-package-5-days-4-nights" },
    pkg_cusco_6d5n: { es: "paquetes-cusco-6-dias-5-noches", en: "cusco-package-6-days-5-nights" },
    pkg_cusco_7d6n: { es: "paquetes-cusco-7-dias-6-noches", en: "cusco-package-7-days-6-nights" },
    pkg_cusco_8d7n: { es: "paquetes-cusco-8-dias-7-noches", en: "cusco-package-8-days-7-nights" },
    pkg_cusco_9d8n: { es: "paquetes-cusco-9-dias-8-noches", en: "cusco-package-9-days-8-nights" },
    pkg_cusco_10d9n: { es: "paquetes-cusco-10-dias-9-noches", en: "cusco-package-10-days-9-nights" }
  }
};

window.MCT_getCommercialProductIdentity = function (itemOrSlug) {
  const config = window.MCT_COMMERCIAL_CONFIG || {};
  if (typeof itemOrSlug === "string") {
    const slug = itemOrSlug.trim().toLowerCase();
    return config.slugToIdentity?.[slug] || slug;
  }
  const item = itemOrSlug || {};
  return String(item.internalCode || item.id || config.slugToIdentity?.[String(item.slug || "").toLowerCase()] || item.slug || "").trim();
};

window.MCT_getCommercialProductRule = function (itemOrSlug) {
  const config = window.MCT_COMMERCIAL_CONFIG || {};
  const identity = window.MCT_getCommercialProductIdentity(itemOrSlug);
  if (!identity) return null;
  if (config.productsByCode?.[identity]) return config.productsByCode[identity];
  if (config.quoteOnlyIdentities?.includes(identity)) return { priceMode: "quote" };
  return null;
};

(function applyCommercialTrustValues() {
  const render = () => {
    const rating = Number(window.MCT_COMMERCIAL_CONFIG?.tripadvisorRating || 0).toFixed(1);
    document.querySelectorAll("[data-mct-tripadvisor-rating]").forEach((node) => {
      node.textContent = rating;
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render, { once: true });
  else render();
  window.addEventListener("mct:i18n-ready", render);
})();

