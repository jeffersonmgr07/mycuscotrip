"use strict";

/**
 * My Cusco Trip - Product Page
 * Detecta si el producto es tour o package.
 * Busca por slug en todos los JSON cargados.
 * Integra motor dinámico inicial para paquetes Cusco.
 */

(function () {
  const state = {
    allData: null,
    catalog: [],
    product: null,
    productType: null,
    packageOptions: [],
    selectedPackageOption: null,
    selectedItinerary: [],
    accommodationPlan: [],
    quote: null
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

  function ensureContainer(id, afterSelector) {
    let element = document.getElementById(id);

    if (element) return element;

    const reference = qs(afterSelector) || qs("#packageContent") || qs("#productPageRoot");

    if (!reference || !reference.parentNode) return null;

    element = document.createElement("div");
    element.id = id;
    reference.parentNode.insertBefore(element, reference.nextSibling);

    return element;
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

  function formatMoney(amount, currency = "USD") {
    if (window.MyCuscoTripCurrencyService && state.allData) {
      return window.MyCuscoTripCurrencyService.formatMoney(amount, currency, state.allData);
    }

    const value = Number(amount || 0);

    return `${currency} ${Number.isFinite(value) ? value.toFixed(2) : "0.00"}`;
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
        <p>No es un itinerario hardcodeado. Las opciones se construyen desde los JSON y reglas del sistema.</p>
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
        <strong>Generando itinerarios disponibles</strong>
        <p>El sistema está preparando opciones dinámicas según las reglas del paquete.</p>
      </div>
    `);

    preparePackageContainers();
    renderDynamicPackageEngine(product);
  }

  function preparePackageContainers() {
    ensureContainer("packageOptions", "#packageBasicInfo");
    ensureContainer("productHotels", "#productItinerary");
    ensureContainer("packageQuote", "#productHotels");
    ensureContainer("packagePayment", "#packageQuote");
  }

  function renderDynamicPackageEngine(product) {
    if (!window.MyCuscoTripPackageGenerator) {
      setHtml("#productItinerary", `
        <div class="product-note-box">
          <strong>Motor de paquetes no disponible</strong>
          <p>Verifica que package-generator.js esté cargado antes de product.js.</p>
        </div>
      `);
      return;
    }

    try {
      const options = window.MyCuscoTripPackageGenerator.generatePackageOptions(
        {
          productFamily: product.productFamily,
          days: product.days,
          nights: product.nights,
          arrivalTime: "09:00",
          departureTime: "20:00",
          adults: 2,
          children: 0,
          nationality: "foreign"
        },
        state.allData
      );

      state.packageOptions = options;

      if (!options.length) {
        setHtml("#productItinerary", `
          <div class="product-note-box">
            <strong>No se encontraron opciones dinámicas</strong>
            <p>Revisa la configuración de duración, tours permitidos y reglas operativas en packages-cusco.json.</p>
          </div>
        `);
        return;
      }

      renderPackageOptions(options);
      renderSelectedPackageOption(options[0], 0);
    } catch (error) {
      console.error("[MyCuscoTrip Product] Error en motor dinámico:", error);

      setHtml("#productItinerary", `
        <div class="product-note-box">
          <strong>Error al generar paquete dinámico</strong>
          <p>Revisa consola para ver el detalle técnico.</p>
        </div>
      `);
    }
  }

  function renderPackageOptions(options) {
    const html = `
      <section class="package-options-section">
        <div class="package-options-section__header">
          <h2>Opciones de itinerario disponibles</h2>
          <p>Elige una opción generada dinámicamente según la duración del paquete.</p>
        </div>

        <div class="package-options-list">
          ${options.map((option, index) => renderPackageOptionButton(option, index)).join("")}
        </div>
      </section>
    `;

    setHtml("#packageOptions", html);

    document.querySelectorAll(".package-option-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.index);
        renderSelectedPackageOption(state.packageOptions[index], index);
      });
    });
  }

  function renderPackageOptionButton(option, index) {
    const codes = Array.isArray(option.includedTourCodes) ? option.includedTourCodes : [];
    const tourCount = codes.length;
    const label = option.generationReason || "dynamic";

    return `
      <button
        type="button"
        class="package-option-btn ${index === 0 ? "is-selected" : ""}"
        data-index="${index}"
      >
        <strong>Opción ${index + 1}</strong>
        <span>${tourCount} experiencia${tourCount === 1 ? "" : "s"}</span>
        <small>${escapeHtml(label)}</small>
      </button>
    `;
  }

  function renderSelectedPackageOption(option, index = 0) {
    if (!option) return;

    state.selectedPackageOption = option;

    document.querySelectorAll(".package-option-btn").forEach((button) => {
      button.classList.toggle("is-selected", Number(button.dataset.index) === index);
    });

    renderDynamicItinerary(option);
    renderDynamicHotels(option);
    renderDynamicPrice(option);
    renderDynamicPayment();
  }

  function renderDynamicItinerary(option) {
    if (!window.MyCuscoTripItineraryBuilder) {
      setHtml("#productItinerary", `
        <div class="product-note-box">
          <strong>Constructor de itinerario no disponible</strong>
          <p>Verifica que itinerary-builder.js esté cargado antes de product.js.</p>
        </div>
      `);
      return;
    }

    const itinerary = window.MyCuscoTripItineraryBuilder.buildItinerary(
      option,
      {
        packagesCusco: state.allData?.data?.packagesCusco
      }
    );

    state.selectedItinerary = itinerary;

    const html = `
      <section class="package-itinerary-section">
        <h2>Itinerario sugerido</h2>
        ${itinerary.map((day) => `
          <article class="product-itinerary-step itinerary-day">
            <span>${escapeHtml(day.day)}</span>
            <div>
              <h3>Día ${escapeHtml(day.day)}</h3>
              ${day.items.map((item) => `
                <div class="itinerary-day-item">
                  <strong>${escapeHtml(item.title || "Actividad")}</strong>
                  ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
                  ${item.duration ? `<small>${escapeHtml(item.duration)}</small>` : ""}
                </div>
              `).join("")}
            </div>
          </article>
        `).join("")}
      </section>
    `;

    setHtml("#productItinerary", html);
  }

  function renderDynamicHotels(option) {
    if (!window.MyCuscoTripHotelService) {
      setHtml("#productHotels", "");
      return;
    }

    const itinerary = state.selectedItinerary.length
      ? state.selectedItinerary
      : window.MyCuscoTripItineraryBuilder.buildItinerary(
          option,
          {
            packagesCusco: state.allData?.data?.packagesCusco
          }
        );

    const accommodationPlan = window.MyCuscoTripHotelService.resolveAccommodationPlan(
      option,
      itinerary,
      { adults: 2, children: 0 },
      state.allData
    );

    state.accommodationPlan = accommodationPlan;

    const html = `
      <section class="package-hotels-section">
        <h2>Alojamiento detectado</h2>
        <p>Hoteles resueltos automáticamente según el destino real de pernocte.</p>

        <div class="package-hotels-grid">
          ${accommodationPlan.map((item) => `
            <article class="hotel-block">
              <h3>${escapeHtml(item.label)}</h3>
              <p>${escapeHtml(item.nights)} noche${item.nights === 1 ? "" : "s"}</p>
              <p>${escapeHtml(item.hotels.length)} hotel${item.hotels.length === 1 ? "" : "es"} disponible${item.hotels.length === 1 ? "" : "s"}</p>
              ${renderHotelPreview(item.hotels)}
            </article>
          `).join("")}
        </div>
      </section>
    `;

    setHtml("#productHotels", html);
  }

  function renderHotelPreview(hotels) {
    if (!Array.isArray(hotels) || !hotels.length) {
      return `<small>No hay hoteles publicados para este destino.</small>`;
    }

    const firstHotel = hotels[0];

    return `
      <div class="hotel-preview">
        <strong>${escapeHtml(firstHotel.hotelName || "")}</strong>
        <small>${escapeHtml(firstHotel.stars || 0)}★ · ${escapeHtml(firstHotel.location || "")}</small>
      </div>
    `;
  }

  function renderDynamicPrice(option) {
    if (!window.MyCuscoTripPricingEngine) {
      setHtml("#packageQuote", "");
      return;
    }

    const quote = window.MyCuscoTripPricingEngine.calculatePackagePrice(
      option,
      {
        adults: 2,
        children: 0,
        nationality: "foreign",
        hotels: [],
        trains: [],
        extras: []
      },
      {
        allData: state.allData
      }
    );

    state.quote = quote;

    setText("#productPrice", formatMoney(quote.total, quote.currency));

    const html = `
      <section class="package-quote-section">
        <h2>Cotización inicial</h2>
        <div class="package-quote-box">
          ${quote.sections.map((section) => `
            <div class="package-quote-row">
              <span>${escapeHtml(getQuoteSectionLabel(section.type))}</span>
              <strong>${escapeHtml(formatMoney(section.total, section.currency || quote.currency))}</strong>
            </div>
          `).join("")}

          <div class="package-quote-row package-quote-row--total">
            <span>Total estimado</span>
            <strong>${escapeHtml(formatMoney(quote.total, quote.currency))}</strong>
          </div>

          <div class="package-quote-row">
            <span>Anticipo referencial</span>
            <strong>${escapeHtml(formatMoney(quote.partialPayment, quote.currency))}</strong>
          </div>

          <div class="package-quote-row">
            <span>Saldo</span>
            <strong>${escapeHtml(formatMoney(quote.balance, quote.currency))}</strong>
          </div>
        </div>
      </section>
    `;

    setHtml("#packageQuote", html);
  }

  function renderDynamicPayment() {
    if (!window.MyCuscoTripPaymentService || !state.quote) {
      setHtml("#packagePayment", "");
      return;
    }

    const payment = window.MyCuscoTripPaymentService.buildPaymentIntentPayload(
      state.quote,
      {
        paymentMode: "partial",
        currency: state.quote.currency,
        market: state.quote.currency === "PEN" ? "peru" : "default"
      },
      state.allData
    );

    const readiness = window.MyCuscoTripPaymentService.getCheckoutReadiness(
      payment.providerCode,
      state.allData
    );

    const html = `
      <section class="package-payment-section">
        <h2>Pago preparado</h2>
        <div class="product-note-box">
          <strong>${escapeHtml(payment.providerLabel)}</strong>
          <p>Modalidad: ${escapeHtml(payment.paymentMode === "partial" ? "Separar cupo" : "Pago completo")}</p>
          <p>Monto a pagar: ${escapeHtml(formatMoney(payment.amount, payment.currency))}</p>
          <p>Estado: ${escapeHtml(readiness.reason)}</p>
        </div>
      </section>
    `;

    setHtml("#packagePayment", html);
  }

  function getQuoteSectionLabel(type) {
    const labels = {
      tours: "Tours",
      machu_picchu: "Machu Picchu",
      hotels: "Hoteles",
      train_adjustments: "Trenes / upgrades",
      extras: "Extras"
    };

    return labels[type] || type || "Concepto";
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
