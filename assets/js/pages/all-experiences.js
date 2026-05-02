"use strict";

/**
 * My Cusco Trip - All Experiences Page
 * Vitrina general de tours y paquetes.
 * Requiere:
 * - assets/js/core/data-loader.js
 * - assets/js/core/catalog-normalizer.js
 * - assets/js/core/search-service.js
 */

(function () {
  const state = {
    allData: null,
    catalog: [],
    filteredCatalog: [],
    filters: {
      q: "",
      destination: "",
      kind: "",
      days: "",
      nights: "",
      durationKey: "",
      sort: "featured"
    }
  };

  const selectors = {
    grid: "#experiencesGrid, #allExperiencesGrid, #productsGrid",
    empty: "#emptyState, #experiencesEmptyState",
    count: "#resultsCount, #experiencesCount",
    searchInput: "#searchInput, #experienceSearch, #allExperienceSearch",
    destinationSelect: "#destinationFilter, #filterDestination",
    kindSelect: "#kindFilter, #typeFilter, #productKindFilter",
    durationSelect: "#durationFilter, #filterDuration",
    sortSelect: "#sortFilter, #orderFilter",
    loader: "#pageLoader, #experiencesLoader"
  };

  function qs(selector) {
    return document.querySelector(selector);
  }

  function getFirstElement(selectorList) {
    return qs(selectorList);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getParamsFromUrl() {
    const params = new URLSearchParams(window.location.search);

    return {
      q: params.get("q") || params.get("search") || "",
      destination: params.get("destino") || params.get("destination") || "",
      kind: params.get("tipo") || params.get("kind") || params.get("productKind") || "",
      days: params.get("days") || "",
      nights: params.get("nights") || "",
      durationKey: params.get("duration") || params.get("durationKey") || "",
      sort: params.get("sort") || params.get("order") || "featured"
    };
  }

  function updateUrlFromFilters() {
    const params = new URLSearchParams();

    if (state.filters.q) params.set("q", state.filters.q);
    if (state.filters.destination) params.set("destino", state.filters.destination);
    if (state.filters.kind) params.set("tipo", state.filters.kind);
    if (state.filters.days) params.set("days", state.filters.days);
    if (state.filters.nights) params.set("nights", state.filters.nights);
    if (state.filters.durationKey) params.set("duration", state.filters.durationKey);
    if (state.filters.sort && state.filters.sort !== "featured") {
      params.set("sort", state.filters.sort);
    }

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    window.history.replaceState({}, "", newUrl);
  }

  function setLoader(isVisible) {
    const loader = getFirstElement(selectors.loader);
    if (loader) loader.hidden = !isVisible;
  }

  function setElementValue(selectorList, value) {
    const element = getFirstElement(selectorList);
    if (element) element.value = value || "";
  }

  function hydrateFiltersFromUrl() {
    state.filters = {
      ...state.filters,
      ...getParamsFromUrl()
    };

    setElementValue(selectors.searchInput, state.filters.q);
    setElementValue(selectors.destinationSelect, state.filters.destination);
    setElementValue(selectors.kindSelect, state.filters.kind);
    setElementValue(selectors.durationSelect, state.filters.durationKey || buildDurationKey(state.filters.days, state.filters.nights));
    setElementValue(selectors.sortSelect, state.filters.sort);
  }

  function buildDurationKey(days, nights) {
    const d = Number(days);
    const n = Number(nights);

    if (!Number.isFinite(d) || d <= 0) return "";
    if (!Number.isFinite(n) || n < 0) return `${d}d`;

    return `${d}d${n}n`;
  }

  function parseDurationValue(value) {
    const clean = String(value || "").trim().toLowerCase();

    if (!clean) {
      return {
        days: "",
        nights: "",
        durationKey: ""
      };
    }

    const match = clean.match(/^(\d+)d(?:(\d+)n)?$/);

    if (!match) {
      return {
        days: "",
        nights: "",
        durationKey: clean
      };
    }

    return {
      days: match[1] || "",
      nights: match[2] || "",
      durationKey: clean
    };
  }

  function populateDestinationFilter() {
    const select = getFirstElement(selectors.destinationSelect);
    if (!select || !window.MyCuscoTripSearchService) return;

    const currentValue = select.value || state.filters.destination;
    const destinations = window.MyCuscoTripSearchService.getAvailableDestinations(state.catalog);

    select.innerHTML = `
      <option value="">Todos los destinos</option>
      ${destinations.map((destination) => `
        <option value="${escapeHtml(destination)}">${formatLabel(destination)}</option>
      `).join("")}
    `;

    select.value = currentValue;
  }

  function populateDurationFilter() {
    const select = getFirstElement(selectors.durationSelect);
    if (!select || !window.MyCuscoTripSearchService) return;

    const currentValue = select.value || state.filters.durationKey || buildDurationKey(state.filters.days, state.filters.nights);
    const durations = window.MyCuscoTripSearchService.getAvailableDurations(state.catalog);

    select.innerHTML = `
      <option value="">Todas las duraciones</option>
      <option value="medio-dia">Medio día</option>
      <option value="full-day">Full day</option>
      ${durations.map((duration) => `
        <option value="${escapeHtml(duration.key)}">${escapeHtml(duration.label)}</option>
      `).join("")}
    `;

    select.value = currentValue;
  }

  function formatLabel(value) {
    return String(value || "")
      .replace(/-/g, " ")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function getProductUrl(product) {
    return `product.html?slug=${encodeURIComponent(product.slug)}`;
  }

  function getPriceLabel(product) {
    if (!product) return "";

    if (product.productKind === "package" || product.priceMode === "dynamic_from_selected_itinerary") {
      return "Precio dinámico";
    }

    const amount = Number(product.price?.amount || 0);
    const currency = product.price?.currency || product.currency || "USD";

    if (!Number.isFinite(amount) || amount <= 0) {
      return "Consultar";
    }

    return `${currency} ${amount.toFixed(2)}`;
  }

  function renderProductCard(product) {
    const image = product.image || "./assets/img/placeholder/experience.jpg";
    const badge = product.badge || (product.productKind === "package" ? "Paquete" : "Tour");
    const kindLabel = product.productKind === "package" ? "Paquete" : "Tour";

    return `
      <article class="experience-card" data-product-kind="${escapeHtml(product.productKind)}" data-product-family="${escapeHtml(product.productFamily)}">
        <a class="experience-card__link" href="${escapeHtml(getProductUrl(product))}" aria-label="Ver ${escapeHtml(product.title)}">
          <div class="experience-card__media">
            <img src="${escapeHtml(image)}" alt="${escapeHtml(product.title)}" loading="lazy">
            ${badge ? `<span class="experience-card__badge">${escapeHtml(badge)}</span>` : ""}
          </div>

          <div class="experience-card__body">
            <div class="experience-card__meta">
              <span>${escapeHtml(kindLabel)}</span>
              ${product.typeLabel ? `<span>${escapeHtml(product.typeLabel)}</span>` : ""}
            </div>

            <h3 class="experience-card__title">${escapeHtml(product.title)}</h3>

            ${product.location ? `
              <p class="experience-card__location">${escapeHtml(product.location)}</p>
            ` : ""}

            ${product.shortDescription ? `
              <p class="experience-card__description">${escapeHtml(product.shortDescription)}</p>
            ` : ""}

            <div class="experience-card__footer">
              <strong>${escapeHtml(getPriceLabel(product))}</strong>
              <span>Ver detalle</span>
            </div>
          </div>
        </a>
      </article>
    `;
  }

  function renderProducts() {
    const grid = getFirstElement(selectors.grid);
    const empty = getFirstElement(selectors.empty);
    const count = getFirstElement(selectors.count);

    if (!grid) {
      console.warn("[MyCuscoTrip AllExperiences] No se encontró contenedor de cards.");
      return;
    }

    if (count) {
      count.textContent = `${state.filteredCatalog.length} experiencia${state.filteredCatalog.length === 1 ? "" : "s"}`;
    }

    if (!state.filteredCatalog.length) {
      grid.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;

    grid.innerHTML = state.filteredCatalog.map(renderProductCard).join("");
  }

  function applyFilters({ updateUrl = true } = {}) {
    if (!window.MyCuscoTripSearchService) {
      console.error("[MyCuscoTrip AllExperiences] Falta search-service.js");
      return;
    }

    state.filteredCatalog = window.MyCuscoTripSearchService.filterProducts(
      state.catalog,
      state.filters
    );

    if (updateUrl) updateUrlFromFilters();

    renderProducts();
  }

  function bindFilters() {
    const searchInput = getFirstElement(selectors.searchInput);
    const destinationSelect = getFirstElement(selectors.destinationSelect);
    const kindSelect = getFirstElement(selectors.kindSelect);
    const durationSelect = getFirstElement(selectors.durationSelect);
    const sortSelect = getFirstElement(selectors.sortSelect);

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        state.filters.q = searchInput.value.trim();
        applyFilters();
      });
    }

    if (destinationSelect) {
      destinationSelect.addEventListener("change", () => {
        state.filters.destination = destinationSelect.value;
        applyFilters();
      });
    }

    if (kindSelect) {
      kindSelect.addEventListener("change", () => {
        state.filters.kind = kindSelect.value;
        applyFilters();
      });
    }

    if (durationSelect) {
      durationSelect.addEventListener("change", () => {
        const parsed = parseDurationValue(durationSelect.value);
        state.filters.days = parsed.days;
        state.filters.nights = parsed.nights;
        state.filters.durationKey = parsed.durationKey;
        applyFilters();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener("change", () => {
        state.filters.sort = sortSelect.value || "featured";
        applyFilters();
      });
    }
  }

  async function initAllExperiencesPage() {
    setLoader(true);

    try {
      if (!window.MyCuscoTripDataLoader) {
        throw new Error("Falta data-loader.js");
      }

      if (!window.MyCuscoTripCatalogNormalizer) {
        throw new Error("Falta catalog-normalizer.js");
      }

      if (!window.MyCuscoTripSearchService) {
        throw new Error("Falta search-service.js");
      }

      const loaded = await window.MyCuscoTripDataLoader.loadAllData();

      state.allData = loaded;
      state.catalog = window.MyCuscoTripCatalogNormalizer.normalizeCatalog(loaded);
      state.filteredCatalog = [...state.catalog];

      if (loaded.hasErrors) {
        console.warn("[MyCuscoTrip AllExperiences] Algunos JSON no cargaron:", loaded.errors);
      }

      hydrateFiltersFromUrl();
      populateDestinationFilter();
      populateDurationFilter();
      bindFilters();
      applyFilters({ updateUrl: false });
    } catch (error) {
      console.error("[MyCuscoTrip AllExperiences] Error inicializando página:", error);

      const grid = getFirstElement(selectors.grid);
      if (grid) {
        grid.innerHTML = `
          <div class="experiences-error">
            <h3>No se pudieron cargar las experiencias</h3>
            <p>Revisa que los archivos JSON existan y que las rutas relativas sean correctas.</p>
          </div>
        `;
      }
    } finally {
      setLoader(false);
    }
  }

  document.addEventListener("DOMContentLoaded", initAllExperiencesPage);

  window.MyCuscoTripAllExperiences = {
    state,
    applyFilters,
    renderProducts,
    initAllExperiencesPage
  };
})();
