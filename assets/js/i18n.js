(function () {
  const SUPPORTED_LOCALES = ["es", "en", "pt", "fr", "de", "it", "zh", "ja"];
  const DEFAULT_LOCALE = "es";
  const STORAGE_KEY = "site_lang";

  function getBasePath() {
    return window.location.hostname.includes("github.io") ? "/mycuscotrip/" : "/";
  }

  function getCurrentFolderLocale() {
    const segment = window.location.pathname.split("/").filter(Boolean)[0] || "";
    return SUPPORTED_LOCALES.includes(segment) && segment !== DEFAULT_LOCALE ? segment : "";
  }

  function normalizeLocale(locale) {
    const raw = String(locale || "").toLowerCase();
    const value = raw.startsWith("zh") ? "zh" : raw.slice(0, 2);
    return SUPPORTED_LOCALES.includes(value) ? value : DEFAULT_LOCALE;
  }

  function getLocaleFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return normalizeLocale(params.get("lang") || getCurrentFolderLocale() || localStorage.getItem(STORAGE_KEY) || DEFAULT_LOCALE);
  }

  function getAssetPath(path) {
    const clean = String(path || "").replace(/^\.?\//, "");
    return `${getBasePath()}${clean}`;
  }

  async function fetchJsonIfExists(path) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  async function loadTranslations(locale) {
    const lang = normalizeLocale(locale);
    const baseTranslations = await fetchJsonIfExists(getAssetPath("assets/data/ui-translations.json")) || {};
    const localeTranslations = lang === DEFAULT_LOCALE
      ? {}
      : await fetchJsonIfExists(getAssetPath(`assets/data/i18n/${lang}/ui-translations.json`)) || {};

    return {
      locale: lang,
      dictionary: Object.assign(
        {},
        baseTranslations[DEFAULT_LOCALE] || {},
        baseTranslations[lang] || {},
        localeTranslations
      )
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

  function getLocalizedPath(locale, path) {
    const lang = normalizeLocale(locale);
    const url = new URL(path || window.location.href, window.location.origin);
    const parts = url.pathname.split("/").filter(Boolean);
    if (SUPPORTED_LOCALES.includes(parts[0])) parts.shift();
    const cleanPath = parts.join("/") || "index.html";
    const prefix = lang === DEFAULT_LOCALE ? "/" : `/${lang}/`;
    return `${prefix}${cleanPath === "index.html" ? "" : cleanPath}${url.search}${url.hash}`;
  }

  async function initI18n(locale) {
    const lang = normalizeLocale(locale || getLocaleFromUrl());
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute("lang", lang === "zh" ? "zh-Hans" : lang);
    document.body?.setAttribute("data-locale", lang);

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
    getBasePath,
    getAssetPath,
    getLocalizedPath,
    getLocaleFromUrl,
    normalizeLocale,
    loadTranslations,
    applyTranslations,
    init: initI18n
  };

  document.addEventListener("DOMContentLoaded", () => {
    initI18n();
  });
})();
