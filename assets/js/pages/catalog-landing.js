"use strict";

(function () {
  const DATA_SOURCES = [
    {
      key: "tours-cusco",
      url: "./assets/data/tours-cusco.json",
      collectionKeys: ["products"],
      defaultKind: "tour",
      defaultFamily: "cusco-tour"
    },
    {
      key: "tours-machu-picchu",
      url: "./assets/data/tours-machu-picchu.json",
      collectionKeys: ["tours", "products"],
      defaultKind: "tour",
      defaultFamily: "machu-picchu-tour"
    },
    {
      key: "tours-peru",
      url: "./assets/data/tours-peru.json",
      collectionKeys: ["products", "tours"],
      defaultKind: "tour",
      defaultFamily: "peru-tour"
    },
    {
      key: "packages-cusco",
      url: "./assets/data/packages-cusco.json",
      collectionKeys: ["packageCards"],
      defaultKind: "package",
      defaultFamily: "cusco-package"
    },
    {
      key: "packages-peru",
      url: "./assets/data/packages-peru.json",
      collectionKeys: ["packageCards"],
      defaultKind: "package",
      defaultFamily: "peru-package"
    }
  ];

  const state = {
    catalog: [],
    filtered: []
  };

  function qs(selector) {
    return document.querySelector(selector);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function formatMoney(value, currency = "USD") {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return "Consultar";

    try {
      return new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(number);
    } catch (error) {
      return `${currency} ${number.toFixed(2)}`;
    }
  }

  function formatDuration(item) {
    if (item.typeLabel) return item.typeLabel;
    if (item.duration?.label) return item.duration.label;

    const days = Number(item.days || 0);
    const nights = Number(item.nights || 0);

    if (days > 0 && nights > 0) return `${days} días / ${nights} noches`;
    if (days === 1) return "Full day";
    if (days > 1) return `${days} días`;

    return "Experiencia";
  }

  function getPrice(item) {
    if (item.priceMode && String(item.priceMode).includes("dynamic")) return null;
    if (item.basePricing?.adult) return Number(item.basePricing.adult);
    if (item.pricing?.publishedAdultUSD) return Number(item.pricing.publishedAdultUSD);
    if (item.price?.adult) return Number(item.price.adult);
    if (item.price) return Number(item.price);
    return null;
  }

  function getImage(item) {
    if (typeof item.image === "string" && item.image) return item.image;
    if (item.images?.cover) return item.images.cover;
    if (Array.isArray(item.images?.gallery) && item.images.gallery[0]) return item.images.gallery[0];
    return "./assets/img/tours/machu-picchu-full-day-clasico/cover.jpg";
  }

  function normalizeProduct(item, source) {
    const productKind = item.productKind === "package"
      ? "package"
      : item.search?.kind === "package"
        ? "package"
        : source.defaultKind;

    const productFamily = item.productFamily || item.search?.productFamily || source.defaultFamily;
    const currency = item.currency || item.defaultCurrency || "USD";
    const price = getPrice(item);

    return {
      raw: item,
      sourceKey: source.key,
      id: item.id || item.slug || `${source.key}-${Math.random().toString(36).slice(2)}`,
      slug: item.slug || "",
      title: item.title || "Experiencia",
      productKind,
      productFamily,
      typeLabel: formatDuration(item),
      badge: item.badge || (productKind === "package" ? "Paquete" : "Tour"),
      location: item.location || "Perú",
      shortDescription: item.shortDescription || item.description || "Experiencia seleccionada por My Cusco Trip.",
      image: getImage(item),
      featured: Boolean(item.featured),
      status: item.status || "published",
      days: Number(item.days || 0),
      nights: Number(item.nights || 0),
      price,
      currency,
      search: item.search || {},
      url: item.slug ? `./product.html?slug=${encodeURIComponent(item.slug)}` : "./all-experiences.html"
    };
  }

  async function loadJson(source) {
    try {
      const response = await fetch(source.url, { cache: "no-store" });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.warn(`No se pudo cargar ${source.url}`, error);
      return null;
    }
  }

  function extractItems(data, source) {
    if (!data) return [];

    return source.collectionKeys.flatMap((key) => {
      const collection = data[key];
      return Array.isArray(collection) ? collection : [];
    });
  }

  async function buildCatalog() {
    const loaded = await Promise.all(DATA_SOURCES.map(async (source) => {
      const data = await loadJson(source);
      return extractItems(data, source).map((item) => normalizeProduct(item, source));
    }));

    state.catalog = loaded
      .flat()
      .filter((item) => item.slug && item.status !== "hidden" && item.status !== "archived");
  }

  function getPageConfig() {
    const body = document.body;

    return {
      kind: body.dataset.catalogKind || "",
      family: body.dataset.catalogFamily || "",
      mode: body.dataset.catalogMode || "",
      destinations: (body.dataset.catalogDestinations || "")
        .split(",")
        .map((item) => normalizeText(item))
        .filter(Boolean),
      themes: (body.dataset.catalogThemes || "")
        .split(",")
        .map((item) => normalizeText(item))
        .filter(Boolean),
      keywords: (body.dataset.catalogKeywords || "")
        .split(",")
        .map((item) => normalizeText(item))
        .filter(Boolean),
      limit: Number(body.dataset.catalogLimit || 0)
    };
  }

  function productMatchesDestination(item, destinations) {
    if (!destinations.length) return true;

    const haystack = [
      item.location,
      ...(item.search.destinations || []),
      ...(item.search.keywords || []),
      ...(item.search.includedTags || [])
    ].map(normalizeText);

    return destinations.some((destination) => haystack.some((entry) => entry.includes(destination)));
  }

  function productMatchesThemes(item, themes) {
    if (!themes.length) return true;

    const haystack = [
      ...(item.search.themes || []),
      ...(item.search.includedTags || []),
      ...(item.search.keywords || [])
    ].map(normalizeText);

    return themes.some((theme) => haystack.some((entry) => entry.includes(theme)));
  }

  function productMatchesKeywords(item, keywords) {
    if (!keywords.length) return true;

    const haystack = [
      item.title,
      item.location,
      item.typeLabel,
      ...(item.search.keywords || []),
      ...(item.search.themes || []),
      ...(item.search.includedTags || []),
      ...(item.search.durationKeys || []),
      ...(item.search.destinations || [])
    ].map(normalizeText);

    return keywords.some((keyword) => haystack.some((entry) => entry.includes(keyword)));
  }

  function isTrekkingCandidate(item) {
    const terms = [
      item.title,
      item.location,
      item.typeLabel,
      ...(item.search.keywords || []),
      ...(item.search.themes || []),
      ...(item.search.includedTags || [])
    ].map(normalizeText);

    const trekkingWords = [
      "trekking",
      "trek",
      "camino inca",
      "inca trail",
      "salkantay",
      "inca jungle",
      "lares",
      "choquequirao",
      "humantay",
      "vinicunca",
      "palcoyo",
      "ausangate",
      "siete lagunas"
    ];

    return trekkingWords.some((word) => terms.some((term) => term.includes(word)));
  }

  function applyCatalogFilter() {
    const config = getPageConfig();

    let filtered = state.catalog.filter((item) => {
      if (config.kind && item.productKind !== config.kind) return false;
      if (config.family && item.productFamily !== config.family) return false;
      if (!productMatchesDestination(item, config.destinations)) return false;
      if (!productMatchesThemes(item, config.themes)) return false;
      if (!productMatchesKeywords(item, config.keywords)) return false;
      if (config.mode === "trekkings" && !isTrekkingCandidate(item)) return false;
      return true;
    });

    filtered = filtered.sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      if (a.productKind !== b.productKind) return a.productKind === "tour" ? -1 : 1;
      if (a.days !== b.days) return a.days - b.days;
      return a.title.localeCompare(b.title, "es");
    });

    if (config.limit > 0) filtered = filtered.slice(0, config.limit);

    state.filtered = filtered;
  }

  function renderStats() {
    const count = qs("#catalogLandingCount");
    if (!count) return;

    const total = state.filtered.length;
    count.textContent = `${total} ${total === 1 ? "experiencia encontrada" : "experiencias encontradas"}`;
  }

  function renderCards() {
    const grid = qs("#catalogLandingGrid");
    const empty = qs("#catalogLandingEmpty");

    if (!grid) return;

    if (!state.filtered.length) {
      grid.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;

    grid.innerHTML = state.filtered.map((item) => {
      const priceLabel = item.price
        ? `Desde ${formatMoney(item.price, item.currency)}`
        : item.productKind === "package"
          ? "Cotización flexible"
          : "Consultar precio";

      const chips = buildChips(item);

      return `
        <article class="catalog-card">
          <a class="catalog-card__image" href="${escapeHtml(item.url)}" aria-label="Ver ${escapeHtml(item.title)}">
            <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy" />
            <span class="catalog-card__badge">${escapeHtml(item.badge)}</span>
          </a>

          <div class="catalog-card__body">
            <p class="catalog-card__meta">${escapeHtml(item.typeLabel)} · ${escapeHtml(item.location)}</p>
            <h2>${escapeHtml(item.title)}</h2>
            <p class="catalog-card__description">${escapeHtml(item.shortDescription)}</p>

            <div class="catalog-card__chips">
              ${chips.map((chip) => `<span>${escapeHtml(chip)}</span>`).join("")}
            </div>

            <div class="catalog-card__footer">
              <strong>${escapeHtml(priceLabel)}</strong>
              <a class="btn catalog-card__button" href="${escapeHtml(item.url)}">Ver experiencia</a>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  function buildChips(item) {
    const chips = [];

    if (item.productFamily === "machu-picchu-tour") chips.push("Machu Picchu");
    if (item.productFamily === "cusco-tour") chips.push("Tour en Cusco");
    if (item.productFamily === "peru-tour") chips.push("Experiencia Perú");
    if (item.productFamily === "cusco-package") chips.push("Paquete Cusco");
    if (item.productFamily === "peru-package") chips.push("Multidestino");

    const themes = Array.isArray(item.search.themes) ? item.search.themes : [];
    if (themes.includes("aventura")) chips.push("Aventura");
    if (themes.includes("naturaleza")) chips.push("Naturaleza");
    if (themes.includes("cultural")) chips.push("Cultural");

    const tags = Array.isArray(item.search.includedTags) ? item.search.includedTags : [];
    if (tags.some((tag) => String(tag).includes("tren"))) chips.push("Con tren");
    if (item.productKind === "package") chips.push("Hotel configurable");

    return Array.from(new Set(chips)).slice(0, 4);
  }

  function renderIntroLinks() {
    const allExperiencesLink = qs("#catalogLandingAllExperiencesLink");
    if (!allExperiencesLink) return;

    const config = getPageConfig();
    const params = new URLSearchParams();

    if (config.kind) params.set("tipo", config.kind === "package" ? "paquetes" : "tours");
    if (config.family === "machu-picchu-tour") params.set("destino", "machu-picchu");
    if (config.family === "cusco-tour") params.set("destino", "cusco");
    if (config.family === "cusco-package") params.set("destino", "cusco");
    if (config.family === "peru-package") params.set("destino", "peru");
    if (config.mode === "trekkings") params.set("q", "trekking");

    allExperiencesLink.href = `./all-experiences.html${params.toString() ? `?${params.toString()}` : ""}`;
  }

  async function init() {
    const grid = qs("#catalogLandingGrid");
    if (!grid) return;

    grid.innerHTML = `
      <div class="catalog-loading">
        <i class="fas fa-spinner fa-spin"></i>
        <span>Cargando experiencias...</span>
      </div>
    `;

    await buildCatalog();
    applyCatalogFilter();
    renderStats();
    renderCards();
    renderIntroLinks();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
