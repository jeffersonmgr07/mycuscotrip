"use strict";

/**
 * My Cusco Trip - Product Page
 * Detecta si el producto es tour o package.
 * Busca por slug en todos los JSON cargados.
 * Base preparada para conectar package-generator.js después.
 */

(function () {
  const state = {
    allData: null,
    catalog: [],
    product: null,
    productType: null
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

  function getSlugFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("slug") || "";
  }

  function isTour(product) {
    return product?.productKind === "tour";
  }

  function isPackage(product) {
    return product?.productKind === "package";
  }

  function setText(selector, value) {
    const element = qs(selector);
    if (element) element.textContent = value || "";
  }

  function setHtml(selector, value) {
    const element = qs(selector);
    if (element) element.innerHTML = value || "";
  }

  function showElement(selector, show = true) {
    const element = qs(selector);
    if (element) element.hidden = !show;
  }

  function getProductPriceLabel(product) {
    if (!product) return "";

    if (isPackage(product) || product.priceMode === "dynamic_from_selected_itinerary") {
      return "Precio dinámico según itinerario";
    }

    const amount = Number(product.price?.amount || 0);
    const currency = product.price?.currency || product.currency || "USD";

    if (!Number.isFinite(amount) || amount <= 0) {
      return "Consultar";
    }

    return `${currency} ${amount.toFixed(2)}`;
  }

  function getProductImage(product) {
    return product?.image || "./assets/img/placeholder/experience.jpg";
  }

  function renderHero(product) {
    setText("#productTitle", product.title);
    setText("#productSubtitle", product.shortDescription || product.description || "");
    setText("#productLocation", product.location || "");
    setText("#productDuration", product.typeLabel || "");
    setText("#productBadge", product.badge || "");
    setText("#productPrice", getProductPriceLabel(product));

    const image = qs("#productImage");
    if (image) {
      image.src = getProductImage(product);
      image.alt = product.title || "My Cusco Trip";
    }

    document.title = `${product.title} | My Cusco Trip`;
  }

  function renderTour(product) {
    showElement("#tourContent", true);
    showElement("#packageContent", false);

    const raw = product.raw || {};

    setHtml("#productDescription", `
      <p>${escapeHtml(raw.description || product.description || product.shortDescription || "")}</p>
    `);

    renderList("#productIncludes", raw.includes);
    renderList("#productExcludes", raw.excludes);
    renderSimpleItinerary("#productItinerary", raw.itinerary);
    renderExtras("#productExtras", raw.extras);
  }

  function renderPackage(product) {
    showElement("#tourContent", false);
    showElement("#packageContent", true);

    const raw = product.raw || {};

    setHtml("#productDescription", `
      <p>${escapeHtml(product.shortDescription || product.description || "")}</p>
      <p>Este paquete se genera dinámicamente según duración, horarios, destinos, hoteles, trenes y reglas operativas.</p>
    `);

    setHtml("#packageDynamicNotice", `
      <div class="product-note-box">
        <strong>Paquete dinámico</strong>
        <p>No es un itinerario hardcodeado. Las opciones se construirán desde los JSON y reglas del sistema.</p>
      </div>
    `);

    setHtml("#packageBasicInfo", `
      <div class="product-info-grid">
        <div>
          <span>Duración</span>
          <strong>${escapeHtml(product.typeLabel || "")}</strong>
        </div>
        <div>
          <span>Días</span>
          <strong>${escapeHtml(product.days)}</strong>
        </div>
        <div>
          <span>Noches</span>
          <strong>${escapeHtml(product.nights)}</strong>
        </div>
        <div>
          <span>Tipo</span>
          <strong>${escapeHtml(product.productFamily)}</strong>
        </div>
      </div>
    `);

    renderPackageSearchSummary(product);
    renderList("#productIncludes", raw.includes);
    renderList("#productExcludes", raw.excludes);

    setHtml("#productItinerary", `
      <div class="product-note-box">
        <strong>Itinerarios disponibles</strong>
        <p>Se conectará con package-generator.js e itinerary-builder.js en el siguiente paso.</p>
      </div>
    `);
  }

  function renderPackageSearchSummary(product) {
    const search = product.search || {};

    const html = `
      <div class="product-package-summary">
        ${renderTagGroup("Destinos", search.destinations)}
        ${renderTagGroup("Experiencias base", search.includedTourCodes)}
        ${renderTagGroup("Temas", search.themes)}
        ${renderTagGroup("Etiquetas", search.includedTags)}
      </div>
    `;

    setHtml("#packageSearchSummary", html);
  }

  function renderTagGroup(title, items) {
    if (!Array.isArray(items) || !items.length) return "";

    return `
      <div class="product-tag-group">
        <h4>${escapeHtml(title)}</h4>
        <div class="product-tags">
          ${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      </div>
    `;
  }

  function renderList(selector, items) {
    const element = qs(selector);
    if (!element) return;

    if (!Array.isArray(items) || !items.length) {
      element.innerHTML = "";
      return;
    }

    element.innerHTML = `
      <ul>
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    `;
  }

  function renderSimpleItinerary(selector, itinerary) {
    const element = qs(selector);
    if (!element) return;

    if (!Array.isArray(itinerary) || !itinerary.length) {
      element.innerHTML = "";
      return;
    }

    element.innerHTML = itinerary.map((step, index) => `
      <article class="product-itinerary-step">
        <span>${index + 1}</span>
        <div>
          <h3>${escapeHtml(step.title || `Actividad ${index + 1}`)}</h3>
          <p>${escapeHtml(step.description || "")}</p>
        </div>
      </article>
    `).join("");
  }

  function renderExtras(selector, extras) {
    const element = qs(selector);
    if (!element) return;

    if (!Array.isArray(extras) || !extras.length) {
      element.innerHTML = "";
      return;
    }

    element.innerHTML = extras.map((extra) => `
      <article class="product-extra-card">
        <h4>${escapeHtml(extra.label || extra.code || "Extra")}</h4>
        <p>${extra.required ? "Obligatorio" : "Opcional"}</p>
      </article>
    `).join("");
  }

  function renderNotFound() {
    setHtml("#productPageRoot", `
      <section class="product-error">
        <h1>Producto no encontrado</h1>
        <p>No se encontró una experiencia con el slug indicado.</p>
        <a href="all-experiences.html">Volver a experiencias</a>
      </section>
    `);
  }

  function renderProduct(product) {
    if (!product) {
      renderNotFound();
      return;
    }

    renderHero(product);

    if (isTour(product)) {
      state.productType = "tour";
      renderTour(product);
      return;
    }

    if (isPackage(product)) {
      state.productType = "package";
      renderPackage(product);
      return;
    }

    renderNotFound();
  }

  async function initProductPage() {
    try {
      const slug = getSlugFromUrl();

      if (!slug) {
        renderNotFound();
        return;
      }

      if (!window.MyCuscoTripDataLoader) {
        throw new Error("Falta data-loader.js");
      }

      if (!window.MyCuscoTripCatalogNormalizer) {
        throw new Error("Falta catalog-normalizer.js");
      }

      const loaded = await window.MyCuscoTripDataLoader.loadAllData();

      state.allData = loaded;
      state.catalog = window.MyCuscoTripCatalogNormalizer.normalizeCatalog(loaded);
      state.product = window.MyCuscoTripCatalogNormalizer.getProductBySlug(slug, state.catalog);

      renderProduct(state.product);
    } catch (error) {
      console.error("[MyCuscoTrip Product] Error inicializando producto:", error);
      renderNotFound();
    }
  }

  document.addEventListener("DOMContentLoaded", initProductPage);

  window.MyCuscoTripProductPage = {
    state,
    isTour,
    isPackage,
    renderProduct,
    initProductPage
  };
})();
