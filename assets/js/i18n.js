(function () {
  const SUPPORTED_LOCALES = ["es", "en", "pt", "fr"];
  const DEFAULT_LOCALE = "es";
  const STORAGE_KEY = "site_lang";

  function getBasePath() {
    return window.location.hostname.includes("github.io") ? "/mycuscotrip/" : "/";
  }

  function normalizeLocale(locale) {
    const value = String(locale || "").toLowerCase().slice(0, 2);
    return SUPPORTED_LOCALES.includes(value) ? value : DEFAULT_LOCALE;
  }

  function getLocaleFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return normalizeLocale(params.get("lang") || localStorage.getItem(STORAGE_KEY) || DEFAULT_LOCALE);
  }

  async function loadTranslations(locale) {
    const lang = normalizeLocale(locale);
    const response = await fetch(`${getBasePath()}assets/data/ui-translations.json`, { cache: "no-store" });
    if (!response.ok) throw new Error(`No se pudo cargar ui-translations.json: ${response.status}`);
    const translations = await response.json();
    return {
      locale: lang,
      dictionary: Object.assign({}, translations[DEFAULT_LOCALE] || {}, translations[lang] || {})
    };
  }

  function applyTranslations(dictionary) {
    if (!dictionary) return;

    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.dataset.i18n;
      if (dictionary[key]) node.textContent = dictionary[key];
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      const key = node.dataset.i18nPlaceholder;
      if (dictionary[key]) node.setAttribute("placeholder", dictionary[key]);
    });

    document.querySelectorAll("[data-i18n-label]").forEach((node) => {
      const key = node.dataset.i18nLabel;
      if (dictionary[key]) node.setAttribute("aria-label", dictionary[key]);
    });
  }

  async function initI18n(locale) {
    const lang = normalizeLocale(locale || getLocaleFromUrl());
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute("lang", lang);

    try {
      const result = await loadTranslations(lang);
      applyTranslations(result.dictionary);
      window.dispatchEvent(new CustomEvent("mct:i18n-ready", { detail: result }));
      return result;
    } catch (error) {
      console.warn("No se pudo inicializar i18n:", error);
      return { locale: lang, dictionary: {} };
    }
  }

  window.MyCuscoTripI18n = {
    supportedLocales: SUPPORTED_LOCALES,
    defaultLocale: DEFAULT_LOCALE,
    getLocaleFromUrl,
    loadTranslations,
    applyTranslations,
    init: initI18n
  };

  document.addEventListener("DOMContentLoaded", () => {
    initI18n();
  });
})();
