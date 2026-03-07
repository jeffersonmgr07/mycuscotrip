export async function loadTranslations(locale = "es") {
  const response = await fetch("/assets/data/ui-translations.json");
  const translations = await response.json();

  return translations[locale] || translations.es;
}

export function applyTranslations(dict) {
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    if (dict[key]) node.textContent = dict[key];
  });
}

export function getLocaleFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("lang") || "es";
}
