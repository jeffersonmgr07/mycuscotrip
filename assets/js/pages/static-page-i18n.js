(function () {
  const SUPPORTED = ["es", "en", "pt", "fr", "de", "it", "zh", "ja"];

  function locale() {
    const params = new URLSearchParams(window.location.search);
    const value = String(params.get("lang") || window.MyCuscoTripI18n?.getLocaleFromUrl?.() || "es").toLowerCase();
    return SUPPORTED.includes(value) ? value : "es";
  }

  function basePath() {
    return window.location.hostname.includes("github.io") ? "/mycuscotrip/" : "/";
  }

  function pageKey() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts[0] === "mycuscotrip") parts.shift();
    if (SUPPORTED.includes(parts[0]) && parts[0] !== "es") parts.shift();
    return parts.join("/");
  }

  function localizeInternalLinks(lang) {
    document.querySelectorAll('a[href]').forEach((link) => {
      const raw = link.getAttribute("href") || "";
      if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:") || raw.startsWith("http")) return;
      const url = new URL(raw, window.location.origin);
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "mycuscotrip") parts.shift();
      if (SUPPORTED.includes(parts[0]) && parts[0] !== "es") parts.shift();
      const clean = parts.join("/");
      const params = new URLSearchParams(url.search);
      if (clean.startsWith("pages/")) {
        if (lang === "es") params.delete("lang");
        else params.set("lang", lang);
        link.setAttribute("href", `${basePath()}${clean}${params.toString() ? `?${params}` : ""}${url.hash}`);
      }
    });
  }

  function applyTextMap(root, map) {
    if (!root || !map) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return String(node.nodeValue || "").trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const raw = String(node.nodeValue || "");
      const trimmed = raw.trim().replace(/\s+/g, " ");
      if (!Object.prototype.hasOwnProperty.call(map, trimmed)) return;
      const leading = raw.match(/^\s*/)?.[0] || "";
      const trailing = raw.match(/\s*$/)?.[0] || "";
      node.nodeValue = `${leading}${map[trimmed]}${trailing}`;
    });
  }

  function applyAttributes(root, attributes) {
    Object.entries(attributes || {}).forEach(([selector, values]) => {
      root.querySelectorAll(selector).forEach((node) => {
        Object.entries(values || {}).forEach(([name, value]) => node.setAttribute(name, value));
      });
    });
  }

  function applyContent(root, content) {
    Object.entries(content || {}).forEach(([selector, value]) => {
      root.querySelectorAll(selector).forEach((node) => {
        if (value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "html")) node.innerHTML = value.html;
        else node.textContent = value && typeof value === "object" ? (value.text || "") : String(value || "");
      });
    });
  }

  async function loadDictionary() {
    try {
      const response = await fetch(`${basePath()}assets/data/static-page-translations.json`, { cache: "no-store" });
      if (!response.ok) return {};
      return await response.json();
    } catch (error) {
      console.warn("Static page translations could not be loaded", error);
      return {};
    }
  }

  async function init() {
    const lang = locale();
    document.documentElement.lang = lang;
    localStorage.setItem("site_lang", lang);
    localizeInternalLinks(lang);

    if (lang === "es") return;
    const data = await loadDictionary();
    const entry = data?.[pageKey()]?.[lang];
    const main = document.querySelector("main");
    if (!entry || !main) {
      document.body.dataset.staticTranslation = "missing";
      return;
    }

    if (entry.mainHtml) main.innerHTML = entry.mainHtml;
    if (entry.textMap) applyTextMap(main, entry.textMap);
    if (entry.content) applyContent(main, entry.content);
    if (entry.attributes) applyAttributes(main, entry.attributes);
    if (entry.title) document.title = entry.title;
    if (entry.description) document.querySelector('meta[name="description"]')?.setAttribute("content", entry.description);
    document.body.dataset.staticTranslation = lang;
    localizeInternalLinks(lang);
    window.MyCuscoTripI18n?.applyTranslations?.(undefined, document);
    document.dispatchEvent(new CustomEvent("mct:static-page-translated", { detail: { lang, page: pageKey() } }));
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
