"use strict";

class MyCuscoTripProductPage {
  constructor() {
    this.params = new URLSearchParams(window.location.search);
    this.slug = this.params.get("slug");
    this.requestedPackageOptionIndex = this.getRequestedPackageOptionIndex();

    this.basePath = window.location.hostname.includes("github.io") ? "/mycuscotrip/" : "/";

    this.product = null;
    this.tours = [];
    this.hotelsData = { destinations: {} };

    this.allData = null;
    this.catalog = [];
    this.productType = null;

    this.packageOptions = [];
    this.selectedPackageOption = null;
    this.selectedPackageOptionIndex = 0;
    this.selectedItinerary = [];
    this.accommodationPlan = [];
    this.selectedPackageExtraCodes = [];
    this.packageContent = null;
    this.dynamicQuote = null;

    this.adults = 2;
    this.children = 0;
    this.selectedExtras = new Set();
    this.paymentMode = "full";
    this.date = "";
    this.selectedDepartureTime = "";

    this.serviceMode = "group";

    this.selectedHotelsByDestination = {};
    this.selectedCombinationsByDestination = {};

    this.activeHotelModalDestination = null;

    this.init();
  }

  async init() {
    if (!this.slug) {
      this.renderNotFound("No se recibió un producto válido.");
      return;
    }

    try {
      await this.loadProductData();

      const product = this.resolveProductFromCatalog(this.slug);

      if (!product) {
        this.renderNotFound("No encontramos esta experiencia.");
        return;
      }

      if (!product.paymentOptions || typeof product.paymentOptions !== "object") {
        product.paymentOptions = {};
      }

      if (!product.paymentOptions.fullPaymentDiscountPercent) {
        product.paymentOptions.fullPaymentDiscountPercent = 10;
      }

      this.product = product;
      this.productType = product.productKind || (this.isPackage(product) ? "package" : "tour");

      try {
        this.renderProduct(product);
      } catch (renderError) {
        console.error("Error rendering product:", renderError);
        console.error(renderError?.stack || "Sin stack");
        this.renderNotFound("La experiencia existe, pero ocurrió un error al mostrarla.");
        return;
      }

      if (this.productType === "package") {
        try {
          if (this.isPeruPackage(product)) {
            this.renderPeruPackageFallback(product);
          } else {
            this.initDynamicPackageEngine();
          }
        } catch (packageError) {
          console.error("Error initializing package content:", packageError);
          console.error(packageError?.stack || "Sin stack");
        }
      }

      try {
        this.initBookingLogic();
      } catch (bookingError) {
        console.error("Error initializing booking logic:", bookingError);
        console.error(bookingError?.stack || "Sin stack");
      }
    } catch (error) {
      console.error("Error loading product data:", error);
      console.error(error?.stack || "Sin stack");
      this.renderNotFound("No se pudo cargar la experiencia.");
    }
  }

  async loadProductData() {
    if (window.MyCuscoTripDataLoader && window.MyCuscoTripCatalogNormalizer) {
      this.allData = await window.MyCuscoTripDataLoader.loadAllData();

      this.catalog = window.MyCuscoTripCatalogNormalizer.normalizeCatalog(this.allData);

      this.tours = Array.isArray(this.catalog)
        ? this.catalog.filter((item) => item.status !== "draft")
        : [];

      const loadedHotels = this.allData?.data?.hotels;

      this.hotelsData =
        loadedHotels && typeof loadedHotels === "object"
          ? loadedHotels
          : { destinations: {} };

      return;
    }

    this.tours = await this.loadTours();

    try {
      this.hotelsData = await this.loadHotels();
    } catch (hotelError) {
      console.error("Error loading hotels:", hotelError);
      console.error(hotelError?.stack || "Sin stack");
      this.hotelsData = { destinations: {} };
    }
  }

  resolveProductFromCatalog(slug) {
    if (window.MyCuscoTripCatalogNormalizer && Array.isArray(this.catalog) && this.catalog.length) {
      const product = window.MyCuscoTripCatalogNormalizer.getProductBySlug(slug, this.catalog);
      return product ? this.hydrateProductForLegacyUI(product) : null;
    }

    const product = this.tours.find((item) => item.slug === slug);
    return product ? this.hydrateProductForLegacyUI(product) : null;
  }

  hydrateProductForLegacyUI(product) {
    const raw = product?.raw && typeof product.raw === "object" ? product.raw : {};

    const merged = {
      ...raw,
      ...product
    };

    merged.raw = raw;

    merged.slug = product.slug || raw.slug || "";
    merged.title = product.title || raw.title || "Experiencia";
    merged.description =
      product.description ||
      raw.description ||
      product.shortDescription ||
      raw.shortDescription ||
      "";
    merged.shortDescription = product.shortDescription || raw.shortDescription || "";
    merged.productKind =
      product.productKind ||
      raw.productKind ||
      (this.isPackage(raw) ? "package" : "tour");
    merged.productFamily = product.productFamily || raw.productFamily || "";
    merged.category =
      product.category ||
      raw.category ||
      (merged.productKind === "package" ? "paquetes" : "");
    merged.currency =
      product.currency ||
      raw.currency ||
      product.price?.currency ||
      raw.basePricing?.currency ||
      "USD";

    merged.images = raw.images || product.images || {
      cover: product.image || raw.image || "",
      gallery: []
    };

    merged.basePricing = raw.basePricing || product.basePricing || {
      adult: Number(product.price?.amount || raw.price || 0),
      child: Number(product.price?.amount || raw.price || 0),
      currency: merged.currency
    };

    merged.duration = raw.duration || product.duration || {
      label: product.typeLabel || raw.typeLabel || ""
    };

    merged.duration.label =
      merged.duration.label ||
      product.typeLabel ||
      raw.typeLabel ||
      "";

    merged.includes = Array.isArray(raw.includes) ? raw.includes : [];
    merged.excludes = Array.isArray(raw.excludes) ? raw.excludes : [];
    merged.extras = Array.isArray(raw.extras) ? raw.extras : [];
    merged.itinerary = Array.isArray(raw.itinerary) ? raw.itinerary : [];
    merged.faq = Array.isArray(raw.faq) ? raw.faq : [];
    merged.serviceModes = raw.serviceModes || product.serviceModes || {};
    merged.paymentOptions = raw.paymentOptions || product.paymentOptions || {};
    merged.days = Number(product.days || raw.days || 0);
    merged.nights = Number(product.nights || raw.nights || 0);
    merged.typeLabel = product.typeLabel || raw.typeLabel || merged.duration.label || "";

    if (merged.productKind === "package") {
      merged.category = "paquetes";
    }

    return merged;
  }

  async loadTours() {
    const localProducts = JSON.parse(localStorage.getItem("experiences") || "[]");

    if (Array.isArray(localProducts) && localProducts.length > 0) {
      return localProducts.filter((item) => item.status !== "draft");
    }

    const response = await fetch(this.resolvePath("assets/data/tours.json"), {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("No se pudo cargar tours.json");
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("tours.json no contiene un array válido");
    }

    return data.filter((item) => item.status !== "draft");
  }

  async loadHotels() {
    try {
      const response = await fetch(this.resolvePath("assets/data/hotels.json"), {
        cache: "no-store"
      });

      if (!response.ok) {
        console.warn("No se pudo cargar hotels.json. Se continuará sin hoteles dinámicos.");
        return { destinations: {} };
      }

      const data = await response.json();

      if (!data || typeof data !== "object") {
        return { destinations: {} };
      }

      return {
        destinations:
          data.destinations && typeof data.destinations === "object"
            ? data.destinations
            : {}
      };
    } catch (error) {
      console.warn("Error loading hotels.json:", error);
      return { destinations: {} };
    }
  }
  renderProduct(product) {
    const title = product?.title || "Experiencia";
    const description =
      product?.description ||
      product?.shortDescription ||
      "Pronto agregaremos más detalles de esta experiencia.";

    const badge = product?.badge || "Destacado";
    const basePrice = product?.basePricing?.adult || product?.price?.amount || 0;
    const currency = product?.currency || product?.price?.currency || "USD";
    const location = product?.location || "Cusco, Perú";
    const duration = product?.duration?.label || product?.typeLabel || "Duración por confirmar";
    const languages = product?.duration?.guideLanguages?.length
      ? product.duration.guideLanguages.join(", ")
      : "Por confirmar";
    const capacity = product?.capacity || product?.duration?.maxGroupSize || "Por confirmar";

    document.title = `${title} | My Cusco Trip`;

    this.setText("productBadge", badge);
    this.setText("productTitle", title);
    this.setText("productDescription", description);
    if (this.isPeruPackage(product)) {
      this.setText("productBasePrice", "Cotización flexible");
    } else {
      this.setText("productBasePrice", `${currency} ${this.formatMoney(basePrice)}`);
    }

    this.setText("detailCapacity", `Máximo ${capacity} viajeros por grupo`);
    this.setText("detailDuration", duration);
    this.setText("detailLanguages", `Guía en ${languages}`);
    this.setText("detailLocation", location);

    this.renderGallery(product?.images || {});
    this.renderIncludes(product?.includes || []);
    this.renderExcludes(product?.excludes || []);
    this.renderHighlights(product || {});
    this.renderItinerary(product?.itinerary || []);
    this.renderFaq(product?.faq || []);
    this.renderExtras(product?.extras || []);
    this.renderServiceModes(product || {});
    this.renderDepartureTimeOptions(product || {});
    this.renderAccommodationOptions(product || {});
    this.renderSimilarExperiences();
  }

  initBookingLogic() {
    const dateInput = document.getElementById("travelDate");

    if (dateInput && typeof flatpickr !== "undefined") {
      flatpickr(dateInput, {
        locale: flatpickr.l10ns.es,
        minDate: "today",
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "d M Y",
        onReady: (_, __, instance) => {
          if (instance.altInput) {
            instance.altInput.setAttribute("readonly", "readonly");
            instance.altInput.style.width = "100%";
            instance.altInput.style.maxWidth = "100%";
            instance.altInput.style.boxSizing = "border-box";
          }
        },
        onChange: (_, dateStr, instance) => {
          this.date = dateStr;

          if (instance.altInput) {
            instance.altInput.style.width = "100%";
            instance.altInput.style.maxWidth = "100%";
            instance.altInput.style.boxSizing = "border-box";
          }
        }
      });
    }

    const departureTimeSelect = document.getElementById("departureTimeSelect");

    departureTimeSelect?.addEventListener("change", () => {
      this.selectedDepartureTime = departureTimeSelect.value || "";
    });

    document.querySelectorAll(".qty-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        const target = btn.dataset.target;

        if (target === "adults") {
          if (action === "minus") this.adults = Math.max(1, this.adults - 1);
          if (action === "plus") this.adults += 1;
        }

        if (target === "children") {
          if (action === "minus") this.children = Math.max(0, this.children - 1);
          if (action === "plus") this.children += 1;
        }

        this.updatePassengersUI();

        if (this.productType === "package" && this.selectedPackageOption) {
          this.resolveDynamicAccommodationPlan();
          this.renderDynamicPackageContent();
        }

        this.refreshAccommodationSelections();
        this.updatePricing();
      });
    });

    const paymentMode = document.getElementById("paymentMode");

    paymentMode?.addEventListener("change", () => {
      this.paymentMode = paymentMode.value;
      this.updatePricing();
    });

    const serviceModeSelect = document.getElementById("serviceMode");

    serviceModeSelect?.addEventListener("change", () => {
      this.serviceMode = serviceModeSelect.value;
      this.updatePricing();
    });

    document.getElementById("paypalButton")?.addEventListener("click", () => {
      this.handlePaypalAction();
    });

    this.bindAccommodationEvents();
    this.bindHotelModalEvents();

    this.updatePassengersUI();
    this.refreshAccommodationSelections();
    this.updatePricing();
  }

  renderGallery(images = {}) {
    const gallery = document.getElementById("productGallery");

    if (!gallery) return;

    const cover = images.cover ? [this.resolveAssetPath(images.cover)] : [];

    const galleryImages = Array.isArray(images.gallery)
      ? images.gallery.map((src) => this.resolveAssetPath(src))
      : [];

    const finalImages = [...new Set([...cover, ...galleryImages])];

    if (!finalImages.length) {
      gallery.innerHTML = `
        <div class="experience-gallery__main">
          <img src="${this.resolvePath("assets/img/tours/machu-picchu-full-day/cover.jpg")}" alt="Imagen referencial" />
        </div>
      `;
      return;
    }

    const mainImage = finalImages[0];
    const sideImages = finalImages.slice(1, 3);

    gallery.innerHTML = `
      <div class="experience-gallery__main">
        <img src="${mainImage}" alt="${this.escapeHtml(this.product?.title || "Experiencia")}" loading="eager" />
      </div>
      <div class="experience-gallery__side">
        ${sideImages.map((src, index) => `
          <div class="experience-gallery__side-item">
            <img src="${src}" alt="Galería ${index + 2}" loading="lazy" />
          </div>
        `).join("")}
      </div>
    `;
  }

  renderIncludes(items) {
    const target = document.getElementById("productIncludes");

    if (!target) return;

    target.innerHTML = items.length
      ? items.map((item) => `<li>${this.escapeHtml(item)}</li>`).join("")
      : "<li>Información por confirmar.</li>";
  }

  renderExcludes(items) {
    const target = document.getElementById("productExcludes");

    if (!target) return;

    target.innerHTML = items.length
      ? items.map((item) => `<li>${this.escapeHtml(item)}</li>`).join("")
      : "<li>Información por confirmar.</li>";
  }

  renderHighlights(product) {
    const target = document.getElementById("productHighlights");

    if (!target) return;

    const highlights = [
      product?.shortDescription,
      `Ubicación: ${product?.location || "Cusco, Perú"}`,
      `Duración: ${product?.duration?.label || product?.typeLabel || "Por confirmar"}`,
      product?.typeLabel ? `Tipo: ${product.typeLabel}` : null,
      product?.duration?.guideLanguages?.length
        ? `Idiomas: ${product.duration.guideLanguages.join(", ")}`
        : null
    ].filter(Boolean);

    target.innerHTML = highlights.map((item) => `<li>${this.escapeHtml(item)}</li>`).join("");
  }

  renderItinerary(items) {
    const target = document.getElementById("productItinerary");

    if (!target) return;

    if (!items.length) {
      target.innerHTML = "<p>Itinerario por confirmar.</p>";
      return;
    }

    target.innerHTML = items.map((item) => `
      <div class="experience-itinerary-item">
        <h3>${this.escapeHtml(item.title || "Paso del itinerario")}</h3>
        <p>${this.escapeHtml(item.description || "")}</p>
      </div>
    `).join("");
  }

  renderFaq(items) {
    const target = document.getElementById("productFaq");

    if (!target) return;

    if (!items.length) {
      target.innerHTML = "<p>Pronto agregaremos preguntas frecuentes.</p>";
      return;
    }

    target.innerHTML = items.map((item) => `
      <div class="experience-faq-item">
        <h3>${this.escapeHtml(item.q || "Pregunta")}</h3>
        <p>${this.escapeHtml(item.a || "")}</p>
      </div>
    `).join("");
  }

  renderExtras(extras) {
    const section = document.getElementById("extrasSection");
    const container = document.getElementById("extrasContainer");

    if (!section || !container) return;

    if (!extras.length) {
      section.hidden = true;
      container.innerHTML = "";
      return;
    }

    section.hidden = false;

    container.innerHTML = extras.map((extra) => {
      const extraPrice = `${this.product.currency || "USD"} ${this.formatMoney(extra.price || extra.publishedPriceUSD || extra.publishedPricing?.amount || 0)}`;

      return `
        <label class="booking-extra-item" for="extra-${this.escapeHtml(extra.code)}">
          <input type="checkbox" id="extra-${this.escapeHtml(extra.code)}" data-extra-code="${this.escapeHtml(extra.code)}" />
          <div class="booking-extra-text">
            <strong>${this.escapeHtml(extra.label)}</strong>
            <small>${extra.perPerson ? "Precio por persona" : "Precio por reserva"} · ${extraPrice}</small>
          </div>
        </label>
      `;
    }).join("");

    container.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const code = checkbox.dataset.extraCode;

        if (checkbox.checked) {
          this.selectedExtras.add(code);
        } else {
          this.selectedExtras.delete(code);
        }

        this.updatePricing();
      });
    });
  }

  getRequestedPackageOptionIndex() {
    const value = this.params.get("option") || this.params.get("opcion") || "";
    const index = Number(value);

    if (!Number.isInteger(index) || index < 0) return 0;
    return index;
  }

  getValidPackageOptionIndex(index) {
    const requested = Number(index || 0);

    if (!Array.isArray(this.packageOptions) || !this.packageOptions.length) return 0;
    if (!Number.isInteger(requested) || requested < 0) return 0;
    if (requested >= this.packageOptions.length) return 0;

    return requested;
  }

  getProductStartTimes(product) {
    const rawTimes = [
      ...(Array.isArray(product?.operationalSchedule?.startTimes) ? product.operationalSchedule.startTimes : []),
      ...(Array.isArray(product?.operation?.startTimes) ? product.operation.startTimes : [])
    ];

    return Array.from(new Set(rawTimes.map((time) => String(time || "").trim()).filter(Boolean)));
  }

  renderDepartureTimeOptions(product) {
    const section = document.getElementById("departureTimeSection");
    const select = document.getElementById("departureTimeSelect");
    const fixed = document.getElementById("departureTimeFixed");
    const help = document.getElementById("departureTimeHelp");

    if (!section || !select || !fixed) return;

    const times = this.getProductStartTimes(product);

    section.hidden = true;
    select.hidden = true;
    select.disabled = false;
    select.style.display = "none";
    fixed.hidden = true;
    fixed.style.display = "none";
    select.innerHTML = "";
    fixed.textContent = "";
    if (help) help.textContent = "";
    this.selectedDepartureTime = "";

    // Los paquetes no muestran horario de salida general; el horario se resuelve por itinerario.
    if (this.isPackage(product)) {
      return;
    }

    if (!times.length) {
      return;
    }

    section.hidden = false;
    select.hidden = false;
    select.style.display = "";

    if (times.length === 1) {
      this.selectedDepartureTime = times[0];
      select.disabled = true;
      select.innerHTML = `<option value="${this.escapeHtml(times[0])}" selected>Salida ${this.escapeHtml(times[0])}</option>`;
      fixed.hidden = true;
      fixed.style.display = "none";
      if (help) help.textContent = "Este tour tiene un horario fijo de salida.";
      return;
    }

    select.disabled = false;
    select.innerHTML = `
      <option value="">Selecciona un horario</option>
      ${times.map((time) => `<option value="${this.escapeHtml(time)}">${this.escapeHtml(time)}</option>`).join("")}
    `;

    if (help) {
      help.textContent = "Elige el horario que prefieres. La disponibilidad final será confirmada por el equipo de reservas.";
    }
  }

  getSelectedDepartureTimeLabel() {
    if (this.selectedDepartureTime) return this.selectedDepartureTime;

    const times = this.getProductStartTimes(this.product);
    if (times.length === 1) return times[0];
    if (times.length > 1) return "Pendiente de selección";

    return "No aplica";
  }

  isPeruPackage(product) {
    if (!product) return false;
    return String(product.productFamily || "").toLowerCase() === "peru-package";
  }

  getTourTitleByCode(code) {
    const clean = String(code || "").trim();
    if (!clean) return "";

    const match = (this.tours || []).find((item) => {
      return item?.internalCode === clean || item?.id === clean || item?.slug === clean;
    });

    return match?.title || clean;
  }

  renderPeruPackageFallback(product) {
    const packageOptionsTarget = document.getElementById("packageOptions");
    const itineraryTarget = document.getElementById("productItinerary");
    const paypalButton = document.getElementById("paypalButton");

    if (packageOptionsTarget) packageOptionsTarget.innerHTML = "";
    if (paypalButton) paypalButton.textContent = "Solicitar cotización";

    if (!itineraryTarget) return;

    const search = product?.search || {};
    const destinations = Array.isArray(search.destinations) ? search.destinations : [];
    const tourCodes = Array.isArray(search.includedTourCodes) ? search.includedTourCodes : [];
    const themes = Array.isArray(search.themes) ? search.themes : [];

    const destinationLabels = destinations
      .filter((destination) => destination && destination !== "peru")
      .map((destination) => this.getDestinationLabel(destination));

    const tourTitles = tourCodes.map((code) => this.getTourTitleByCode(code));

    itineraryTarget.innerHTML = `
      <div class="experience-itinerary-item">
        <h3>Ruta sugerida</h3>
        <p>${this.escapeHtml(product.shortDescription || product.description || "Paquete multidestino preparado para cotización personalizada.")}</p>
      </div>

      <div class="experience-itinerary-item">
        <h3>Destinos incluidos</h3>
        <p>${this.escapeHtml(destinationLabels.length ? destinationLabels.join(" / ") : product.location || "Perú")}</p>
      </div>

      <div class="experience-itinerary-item">
        <h3>Experiencias principales</h3>
        ${tourTitles.length
          ? `<ul>${tourTitles.map((title) => `<li>${this.escapeHtml(title)}</li>`).join("")}</ul>`
          : `<p>Experiencias principales por confirmar según la ruta elegida.</p>`}
      </div>

      <div class="experience-itinerary-item">
        <h3>Hoteles configurables</h3>
        <p>El alojamiento se puede ajustar por destino, categoría y disponibilidad. La propuesta final se confirmará mediante cotización personalizada.</p>
      </div>

      <div class="experience-itinerary-item">
        <h3>Solicitar cotización</h3>
        <p>Este paquete todavía no usa itinerario dinámico día por día. Nuestro equipo puede preparar la ruta final según fechas, hoteles, vuelos internos y preferencias de viaje.</p>
        ${themes.length ? `<p><small>Estilo de viaje: ${this.escapeHtml(themes.join(" · "))}</small></p>` : ""}
      </div>
    `;
  }

  renderServiceModes(product) {
    const section = document.getElementById("serviceModeSection");
    const select = document.getElementById("serviceMode");
    const help = document.getElementById("serviceModeHelp");

    if (!section || !select) return;

    const modes = product?.serviceModes || {};
    const groupEnabled = Boolean(modes.group?.enabled);
    const privateEnabled = Boolean(modes.private?.enabled);

    if (!groupEnabled && !privateEnabled) {
      section.hidden = true;
      return;
    }

    section.hidden = false;

    select.innerHTML = `
      ${groupEnabled ? `<option value="group">${this.escapeHtml(modes.group?.label || "Tour en grupo")}</option>` : ""}
      ${privateEnabled ? `<option value="private">${this.escapeHtml(modes.private?.label || "Tour privado")}</option>` : ""}
    `;

    this.serviceMode = groupEnabled ? "group" : "private";

    if (help) {
      help.textContent = privateEnabled
        ? "Selecciona si deseas viajar en servicio compartido o privado."
        : "Esta experiencia se ofrece actualmente en servicio grupal.";
    }
  }
  renderAccommodationOptions(product) {
    const section = document.getElementById("packageAccommodationSection");
    const container = document.getElementById("hotelSelectorsContainer");

    if (!section || !container) return;

    section.hidden = true;
    container.innerHTML = "";

    if (!this.isPackage(product)) return;

    const summary = this.getAccommodationSummary(product);

    if (!summary.length) return;

    section.hidden = false;

    container.innerHTML = summary.map((item) => {
      const selection = this.getSelectedAccommodationForDestination(item.destination);
      const additionalPerPerson = this.calculateAccommodationAdditionalPerPerson(item.destination);

      const destinationLabel = this.getDestinationLabel(item.destination);

      const cardTitle = destinationLabel.toLowerCase().includes("cusco")
        ? "Hotel en Cusco"
        : destinationLabel.toLowerCase().includes("aguas")
          ? "Hotel en Aguas Calientes"
          : `Hotel en ${destinationLabel}`;

      return `
        <div class="booking-accommodation-card">
          <div class="booking-accommodation-card__header">
            <strong>${this.escapeHtml(cardTitle)}</strong>
            <small>${item.nights} noche${item.nights > 1 ? "s" : ""}</small>
          </div>

          <div class="booking-accommodation-card__body">
            <p class="booking-accommodation-card__selected">
              ${selection?.hotel
                ? `${this.escapeHtml(selection.hotel.hotelName)}${selection.hotel.stars > 0 ? ` · ${this.renderStars(selection.hotel.stars)}` : ""}`
                : "Sin hotel seleccionado"}
            </p>

            <p class="booking-accommodation-card__selected">
              ${selection?.combination
                ? this.escapeHtml(selection.combination.label)
                : "Acomodación por confirmar"}
            </p>

            <p class="booking-accommodation-card__price">
              + ${this.product.currency || "USD"} ${this.formatMoney(additionalPerPerson)} por persona
            </p>

            <button
              type="button"
              class="btn booking-secondary-btn open-hotel-modal-btn"
              data-destination="${this.escapeHtml(item.destination)}"
            >
              Seleccionar hotel
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  bindAccommodationEvents() {
    document.querySelectorAll(".open-hotel-modal-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const destination = button.dataset.destination;
        this.openHotelModal(destination);
      });
    });
  }

  bindHotelModalEvents() {
    const modal = document.getElementById("hotelSelectionModal");
    const closeBtn = document.getElementById("closeHotelModalBtn");
    const cancelBtn = document.getElementById("cancelHotelModalBtn");

    if (!modal) return;

    closeBtn?.addEventListener("click", () => this.closeHotelModal());
    cancelBtn?.addEventListener("click", () => this.confirmHotelModalSelection());

    modal.querySelectorAll("[data-close-hotel-modal]").forEach((el) => {
      el.addEventListener("click", () => this.closeHotelModal());
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) {
        this.closeHotelModal();
      }
    });
  }

  openHotelModal(destination) {
    const modal = document.getElementById("hotelSelectionModal");
    const title = document.getElementById("hotelModalTitle");
    const subtitle = document.getElementById("hotelModalSubtitle");
    const list = document.getElementById("hotelModalList");
    const cancelBtn = document.getElementById("cancelHotelModalBtn");

    if (!modal || !title || !subtitle || !list) return;

    this.activeHotelModalDestination = destination;

    if (cancelBtn) {
      cancelBtn.textContent = "Seleccionar Hotel y acomodación";
    }

    const destinationLabel = this.getDestinationLabel(destination);
    const summaryItem = this.getAccommodationSummary(this.product).find((item) => item.destination === destination);
    const nights = Number(summaryItem?.nights || 0);

    title.textContent = `Elige tu hotel en ${destinationLabel}`;
    subtitle.textContent = `Compara hoteles, fotos y opciones de acomodación para ${nights} noche${nights !== 1 ? "s" : ""}.`;

    const hotels = this.getHotelsByDestination(destination);
    const passengers = this.getTotalPassengers();

    const noHotelOption = {
      hotelCode: "no-hotel",
      hotelName: "Opción sin hotel",
      stars: 0,
      location: destinationLabel,
      address: "",
      images: {
        cover: "",
        gallery: []
      },
      amenities: {
        checkin: "",
        checkout: "",
        breakfast: ""
      },
      rooms: [
        {
          roomType: "no-hotel",
          label: "Reservaré mi hotel por cuenta propia",
          bedType: "",
          capacity: Math.max(passengers, 1),
          pricePerNight: 0,
          helperText: "Brindaré los datos de mi alojamiento luego."
        }
      ]
    };

    const allHotels = [noHotelOption, ...hotels];

    const pendingHotelCode = this.selectedHotelsByDestination[destination] || "";
    const pendingCombinationKey = this.selectedCombinationsByDestination[destination]?.key || "";

    list.innerHTML = allHotels.map((hotel) => {
      const combinations = this.generateAccommodationCombinations(
        hotel.rooms || [],
        passengers,
        nights
      );

      const currentHotelCode = pendingHotelCode;
      const currentCombinationKey = pendingCombinationKey;
      const isSelectedHotel = currentHotelCode === hotel.hotelCode;

      const initialCombo =
        combinations.find((combo) => isSelectedHotel && combo.key === currentCombinationKey) ||
        combinations[0] ||
        null;

      const images = [...new Set([
        ...(hotel.images?.cover ? [hotel.images.cover] : []),
        ...(Array.isArray(hotel.images?.gallery) ? hotel.images.gallery : [])
      ])];

      return `
        <article
          class="hotel-option-card ${isSelectedHotel ? "is-selected" : ""} ${hotel.hotelCode === "no-hotel" ? "hotel-option-card--no-hotel" : ""}"
          data-hotel-card="${this.escapeHtml(hotel.hotelCode)}"
          data-destination="${this.escapeHtml(destination)}"
          data-hotel-code="${this.escapeHtml(hotel.hotelCode)}"
          data-selected-combo-key="${this.escapeHtml(initialCombo?.key || "")}"
        >
          <div class="hotel-option-card__header">
            <div>
              <h3>${this.escapeHtml(hotel.hotelName)}</h3>
              ${
                hotel.hotelCode === "no-hotel"
                  ? ""
                  : `<p>${this.renderStars(hotel.stars || 0)} · ${this.escapeHtml(hotel.location || destinationLabel)}</p>`
              }
              ${hotel.address ? `<p>${this.escapeHtml(hotel.address)}</p>` : ""}
            </div>

            <div class="hotel-option-card__badge">
              ${combinations.length
                ? `+ ${this.product.currency || "USD"} ${this.formatMoney(combinations[0].additionalPerPerson)} por persona`
                : "Sin opciones válidas"}
            </div>
          </div>

          <div class="hotel-option-card__content ${hotel.hotelCode === "no-hotel" ? "hotel-option-card__content--no-hotel" : ""}">
            ${
              hotel.hotelCode === "no-hotel"
                ? ""
                : `
                  <div class="hotel-option-card__media">
                    <div class="hotel-option-card__gallery">
                      ${this.renderHotelModalGallery(images, hotel.hotelName)}
                    </div>

                    <div class="hotel-option-card__meta">
                      ${hotel.amenities?.checkin ? `<span>Check-in: ${this.escapeHtml(hotel.amenities.checkin)}</span>` : ""}
                      ${hotel.amenities?.checkout ? `<span>Check-out: ${this.escapeHtml(hotel.amenities.checkout)}</span>` : ""}
                      ${hotel.amenities?.breakfast ? `<span>Desayuno: ${this.escapeHtml(hotel.amenities.breakfast)}</span>` : ""}
                    </div>
                  </div>
                `
            }

            <div class="hotel-option-card__body ${hotel.hotelCode === "no-hotel" ? "hotel-option-card__body--no-hotel" : ""}">
              ${hotel.hotelCode === "no-hotel" ? "" : `<label>Selecciona tipo habitación</label>`}

              <div class="hotel-option-card__options">
                ${combinations.length
                  ? combinations.map((combo) => `
                      <button
                        type="button"
                        class="hotel-combo-btn ${isSelectedHotel && currentCombinationKey === combo.key ? "is-selected" : ""}"
                        data-destination="${this.escapeHtml(destination)}"
                        data-hotel-code="${this.escapeHtml(hotel.hotelCode)}"
                        data-combo-key="${this.escapeHtml(combo.key)}"
                      >
                        <span class="hotel-combo-radio" aria-hidden="true"></span>
                        <span class="hotel-combo-btn__main">
                          ${this.escapeHtml(combo.label)}
                        </span>
                        <span class="hotel-combo-btn__sub">
                          ${
                            hotel.hotelCode === "no-hotel"
                              ? "Brindaré los datos de mi alojamiento luego."
                              : `${combo.totalRooms} hab. | Total + ${this.product.currency || "USD"} ${this.formatMoney(combo.additionalPerPerson)} por persona`
                          }
                        </span>
                      </button>
                    `).join("")
                  : `<p>No hay acomodaciones válidas para ${passengers} pasajero${passengers !== 1 ? "s" : ""}.</p>`
                }
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("");

    this.bindHotelModalSelectionEvents();
    this.bindHotelModalGalleryEvents();

    modal.hidden = false;
    document.body.classList.add("hotel-modal-open");
  }

  closeHotelModal() {
    const modal = document.getElementById("hotelSelectionModal");
    const cancelBtn = document.getElementById("cancelHotelModalBtn");

    if (!modal) return;

    modal.hidden = true;
    document.body.classList.remove("hotel-modal-open");
    this.activeHotelModalDestination = null;

    if (cancelBtn) {
      cancelBtn.textContent = "Cerrar";
    }
  }

  confirmHotelModalSelection() {
    const destination = this.activeHotelModalDestination;

    if (!destination) {
      this.closeHotelModal();
      return;
    }

    const selectedButton = document.querySelector(
      `.hotel-combo-btn.is-selected[data-destination="${CSS.escape(destination)}"]`
    );

    const card =
      selectedButton?.closest(".hotel-option-card") ||
      document.querySelector(
        `.hotel-option-card[data-destination="${CSS.escape(destination)}"][data-selected-combo-key]:not([data-selected-combo-key=""])`
      );

    if (!card) {
      this.closeHotelModal();
      return;
    }

    const hotelCode = card.dataset.hotelCode;
    const comboKey = card.dataset.selectedComboKey || "";

    if (!comboKey) return;

    let hotel;

    if (hotelCode === "no-hotel") {
      hotel = {
        hotelCode: "no-hotel",
        hotelName: "Opción sin hotel",
        stars: 0,
        location: this.getDestinationLabel(destination),
        address: "",
        images: {
          cover: "",
          gallery: []
        },
        amenities: {
          checkin: "",
          checkout: "",
          breakfast: ""
        },
        rooms: [
          {
            roomType: "no-hotel",
            label: "Reservaré mi hotel por cuenta propia",
            bedType: "",
            capacity: Math.max(this.getTotalPassengers(), 1),
            pricePerNight: 0,
            helperText: "Brindaré los datos de mi alojamiento luego."
          }
        ]
      };
    } else {
      hotel = this.getHotelByCode(destination, hotelCode);
    }

    const summaryItem = this.getAccommodationSummary(this.product).find((item) => item.destination === destination);

    const combinations = this.generateAccommodationCombinations(
      hotel?.rooms || [],
      this.getTotalPassengers(),
      Number(summaryItem?.nights || 0)
    );

    const combo = combinations.find((item) => item.key === comboKey);

    if (!hotel || !combo) return;

    this.selectedHotelsByDestination[destination] = hotelCode;
    this.selectedCombinationsByDestination[destination] = combo;

    this.renderAccommodationOptions(this.product);
    this.bindAccommodationEvents();
    this.updatePricing();
    this.closeHotelModal();
  }

  bindHotelModalSelectionEvents() {
    document.querySelectorAll(".hotel-combo-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const card = button.closest(".hotel-option-card");

        if (!card) return;

        const destination = button.dataset.destination;
        const hotelCode = button.dataset.hotelCode;
        const comboKey = button.dataset.comboKey;

        card.dataset.selectedComboKey = comboKey;

        document.querySelectorAll(`.hotel-combo-btn[data-destination="${CSS.escape(destination)}"]`).forEach((btn) => {
          btn.classList.toggle(
            "is-selected",
            btn.dataset.hotelCode === hotelCode && btn.dataset.comboKey === comboKey
          );
        });

        document.querySelectorAll(`.hotel-option-card[data-destination="${CSS.escape(destination)}"]`).forEach((optionCard) => {
          optionCard.classList.toggle("is-selected", optionCard.dataset.hotelCode === hotelCode);

          if (optionCard.dataset.hotelCode !== hotelCode) {
            optionCard.dataset.selectedComboKey = "";
          }
        });
      });
    });
  }

  bindHotelModalGalleryEvents() {
    document.querySelectorAll(".hotel-gallery-prev, .hotel-gallery-next").forEach((button) => {
      button.addEventListener("click", () => {
        const gallery = button.closest(".hotel-gallery-main");

        if (!gallery) return;

        const mainImg = gallery.querySelector(".hotel-gallery-main-img");

        if (!mainImg) return;

        const imagesRaw = gallery.dataset.images || "[]";
        let images = [];

        try {
          images = JSON.parse(imagesRaw);
        } catch {
          images = [];
        }

        if (!images.length) return;

        const currentIndex = Number(gallery.dataset.currentImageIndex || 0);
        const isNext = button.classList.contains("hotel-gallery-next");

        const nextIndex = isNext
          ? (currentIndex + 1) % images.length
          : (currentIndex - 1 + images.length) % images.length;

        gallery.dataset.currentImageIndex = String(nextIndex);
        mainImg.src = this.resolveAssetPath(images[nextIndex]);
      });
    });
  }

  renderHotelModalGallery(images, hotelName) {
    const finalImages = images.length
      ? images
      : ["assets/img/tours/machu-picchu-full-day/cover.jpg"];

    const mainImage = finalImages[0];
    const imagesJson = this.escapeHtml(JSON.stringify(finalImages));

    return `
      <div class="hotel-gallery-main" data-images='${imagesJson}' data-current-image-index="0">
        <img
          class="hotel-gallery-main-img"
          src="${this.resolveAssetPath(mainImage)}"
          alt="${this.escapeHtml(hotelName)}"
          loading="lazy"
        />
        ${finalImages.length > 1 ? `
          <button type="button" class="hotel-gallery-nav hotel-gallery-prev" aria-label="Imagen anterior">‹</button>
          <button type="button" class="hotel-gallery-nav hotel-gallery-next" aria-label="Imagen siguiente">›</button>
        ` : ""}
      </div>
    `;
  }
  renderSimilarExperiences() {
    const desktopTarget = document.getElementById("similarExperiencesDesktop");
    const mobileTarget = document.getElementById("similarExperiencesMobile");

    if (!this.product || !Array.isArray(this.tours)) {
      if (desktopTarget) desktopTarget.innerHTML = "<p>No hay experiencias similares disponibles por ahora.</p>";
      if (mobileTarget) mobileTarget.innerHTML = "<p>No hay experiencias similares disponibles por ahora.</p>";
      return;
    }

    const similar = this.tours
      .filter((item) => item && item.slug && item.slug !== this.product.slug)
      .filter((item) => item.category === this.product.category || item.featured)
      .slice(0, 3);

    const html = !similar.length
      ? "<p>No hay experiencias similares disponibles disponibles por ahora.</p>"
      : similar.map((item) => `
        <article class="similar-card">
          <img src="${this.resolveAssetPath(item?.images?.cover || item?.image || "assets/img/tours/machu-picchu-full-day/cover.jpg")}" alt="${this.escapeHtml(item?.title || "Experiencia")}" loading="lazy" />
          <div class="similar-card__content">
            <h3>${this.escapeHtml(item?.title || "Experiencia")}</h3>
            <p>${this.escapeHtml(item?.shortDescription || "Experiencia disponible.")}</p>
            <a class="btn" href="${this.resolvePath(`product.html?slug=${encodeURIComponent(item.slug)}`)}">Ver experiencia</a>
          </div>
        </article>
      `).join("");

    if (desktopTarget) desktopTarget.innerHTML = html;
    if (mobileTarget) mobileTarget.innerHTML = html;
  }

  updatePassengersUI() {
    this.setText("adultsCount", String(this.adults));
    this.setText("childrenCount", String(this.children));
  }

  updatePricing() {
    if (!this.product) return;

    if (this.productType === "package" && this.selectedPackageOption) {
      const handled = this.updateDynamicPackagePricing();

      if (handled) return;
    }

    const currency = this.product.currency || "USD";
    const adultPrice = Number(this.product.basePricing?.adult || 0);
    const childPrice = Number(this.product.basePricing?.child || adultPrice);

    const adultsTotal = this.adults * adultPrice;
    const childrenTotal = this.children * childPrice;
    const extrasTotal = this.calculateExtrasTotal();

    const accommodationSummary = this.getAccommodationSummary(this.product);

    const activeAccommodationItems = accommodationSummary.filter((item) => {
      const hotelCode = this.selectedHotelsByDestination[item.destination];
      const combo = this.selectedCombinationsByDestination[item.destination];

      if (!hotelCode || hotelCode === "no-hotel") return false;
      if (!combo) return false;

      return Number(combo.totalForStay || 0) > 0;
    });

    const accommodationTotal = activeAccommodationItems.reduce((sum, item) => {
      const combo = this.selectedCombinationsByDestination[item.destination];
      return sum + Number(combo?.totalForStay || 0);
    }, 0);

    const totalAccommodationNights = activeAccommodationItems.reduce(
      (sum, item) => sum + Number(item.nights || 0),
      0
    );

    const serviceTotal = adultsTotal + childrenTotal + extrasTotal + accommodationTotal;

    const fullDiscountPercent = Number(this.product.paymentOptions?.fullPaymentDiscountPercent || 10);
    const partialPerPerson = Number(this.product.paymentOptions?.partialPaymentPerPerson || 49.9);

    let discount = 0;
    let payNow = serviceTotal;
    let payLater = 0;
    let infoText = "";

    if (this.paymentMode === "full") {
      discount = serviceTotal * (fullDiscountPercent / 100);
      payNow = serviceTotal - discount;
      payLater = 0;
      infoText = `Pagando el total ahora accedes a un descuento del ${fullDiscountPercent}%.`;
    } else {
      const totalPassengers = this.getTotalPassengers();
      payNow = totalPassengers * partialPerPerson;
      payLater = serviceTotal - payNow;

      if (payLater < 0) payLater = 0;

      infoText =
        this.product.paymentOptions?.partialPaymentLabel ||
        `Reserva con ${currency} ${this.formatMoney(partialPerPerson)} por persona y completa el saldo antes del viaje.`;
    }

    this.setText("adultsTotal", `${currency} ${this.formatMoney(adultsTotal)}`);
    this.setText("childrenTotal", `${currency} ${this.formatMoney(childrenTotal)}`);
    this.setText("extrasTotal", `${currency} ${this.formatMoney(extrasTotal)}`);
    this.setText("serviceTotal", `${currency} ${this.formatMoney(serviceTotal)}`);
    this.setText("payNowTotal", `${currency} ${this.formatMoney(payNow)}`);
    this.setText("discountTotal", `- ${currency} ${this.formatMoney(discount)}`);
    this.setText("payLaterTotal", `${currency} ${this.formatMoney(payLater)}`);
    this.setText("accommodationTotal", `${currency} ${this.formatMoney(accommodationTotal)}`);

    const paymentModeSelect = document.getElementById("paymentMode");

    if (paymentModeSelect) {
      const partialOption = paymentModeSelect.querySelector('option[value="partial"]');

      if (partialOption) {
        partialOption.textContent = "Pagar solo un adelanto";
      }
    }

    const payNowLabel = document.getElementById("payNowLabel");

    if (payNowLabel) {
      payNowLabel.textContent = "Pagar ahora";
    }

    const adultsRow = document.getElementById("adultsTotal")?.closest(".booking-summary__line");

    if (adultsRow) {
      const adultsLabel = adultsRow.querySelector("span");

      if (adultsLabel) {
        adultsLabel.textContent = `Adultos x${String(this.adults).padStart(2, "0")}`;
      }

      adultsRow.hidden = false;
    }

    const childrenRow = document.getElementById("childrenTotal")?.closest(".booking-summary__line");

    if (childrenRow) {
      const hasChildren = this.children > 0;
      childrenRow.hidden = !hasChildren;

      const childrenLabel = childrenRow.querySelector("span");

      if (childrenLabel) {
        childrenLabel.textContent = `Niños x${String(this.children).padStart(2, "0")}`;
      }
    }

    const accommodationRow = document.getElementById("accommodationTotalRow");

    if (accommodationRow) {
      const showAccommodation = accommodationTotal > 0 && totalAccommodationNights > 0;
      accommodationRow.hidden = !showAccommodation;

      const accommodationLabel = accommodationRow.querySelector("span");

      if (accommodationLabel) {
        accommodationLabel.textContent = `Alojamiento x${String(totalAccommodationNights).padStart(2, "0")} noches`;
      }
    }

    const extrasRow = document.getElementById("extrasTotal")?.closest(".booking-summary__line");

    if (extrasRow) {
      const showExtras = extrasTotal > 0;
      extrasRow.hidden = !showExtras;

      const extrasLabel = extrasRow.querySelector("span");

      if (extrasLabel) {
        extrasLabel.textContent = "Extras";
      }
    }

    const serviceTotalRow = document.getElementById("serviceTotal")?.closest(".booking-summary__line");

    if (serviceTotalRow) {
      const serviceLabel = serviceTotalRow.querySelector("span");

      if (serviceLabel) {
        serviceLabel.textContent = "Total servicio";
      }

      serviceTotalRow.hidden = false;
    }

    const discountRow = document.getElementById("discountRow");

    if (discountRow) {
      const showDiscount = this.paymentMode === "full" && discount > 0;
      discountRow.hidden = !showDiscount;

      const discountLabel = discountRow.querySelector("span");

      if (discountLabel) {
        discountLabel.textContent = "Descuento";
      }
    }

    const payLaterRow = document.getElementById("payLaterRow");

    if (payLaterRow) {
      const payLaterLabel = payLaterRow.querySelector("span");

      if (payLaterLabel) {
        payLaterLabel.textContent = "Pagarás luego";
      }

      payLaterRow.hidden = this.paymentMode === "full" || payLater <= 0;
    }

    const paymentInfo = document.getElementById("paymentInfo");

    if (paymentInfo) {
      paymentInfo.textContent = infoText;
    }
  }

  updateDynamicPackagePricing() {
    if (!this.selectedPackageOption || !window.MyCuscoTripPricingEngine) {
      return false;
    }

    const selectedExtras = this.getSelectedDynamicPackageExtras();

    const quote = window.MyCuscoTripPricingEngine.calculatePackagePrice(
      this.selectedPackageOption,
      {
        adults: this.adults,
        children: this.children,
        nationality: "foreign",
        hotels: [],
        trains: [],
        extras: selectedExtras
      },
      {
        allData: this.allData
      }
    );

    const accommodationSummary = this.getAccommodationSummary(this.product);

    const activeAccommodationItems = accommodationSummary.filter((item) => {
      const hotelCode = this.selectedHotelsByDestination[item.destination];
      const combo = this.selectedCombinationsByDestination[item.destination];

      if (!hotelCode || hotelCode === "no-hotel") return false;
      if (!combo) return false;

      return Number(combo.totalForStay || 0) > 0;
    });

    const accommodationTotal = activeAccommodationItems.reduce((sum, item) => {
      const combo = this.selectedCombinationsByDestination[item.destination];
      return sum + Number(combo?.totalForStay || 0);
    }, 0);

    const totalAccommodationNights = activeAccommodationItems.reduce(
      (sum, item) => sum + Number(item.nights || 0),
      0
    );

    const currency = quote.currency || this.product.currency || "USD";
    const toursTotal = Number(quote.sections?.find((section) => section.type === "tours")?.total || 0);
    const machuPicchuTotal = Number(quote.sections?.find((section) => section.type === "machu_picchu")?.total || 0);
    const trainTotal = Number(quote.sections?.find((section) => section.type === "train_adjustments")?.total || 0);
    const extrasTotal = Number(quote.sections?.find((section) => section.type === "extras")?.total || 0);

    const baseServiceTotal = Number(quote.total || 0);
    const serviceTotal = baseServiceTotal + accommodationTotal;

    const fullDiscountPercent = Number(this.product.paymentOptions?.fullPaymentDiscountPercent || 10);
    const partialPerPerson = Number(this.product.paymentOptions?.partialPaymentPerPerson || 49.9);

    let discount = 0;
    let payNow = serviceTotal;
    let payLater = 0;
    let infoText = "";

    if (this.paymentMode === "full") {
      discount = serviceTotal * (fullDiscountPercent / 100);
      payNow = serviceTotal - discount;
      payLater = 0;
      infoText = `Pagando el total ahora accedes a un descuento del ${fullDiscountPercent}%.`;
    } else {
      const totalPassengers = this.getTotalPassengers();
      payNow = totalPassengers * partialPerPerson;
      payLater = serviceTotal - payNow;

      if (payLater < 0) payLater = 0;

      infoText =
        this.product.paymentOptions?.partialPaymentLabel ||
        `Reserva con ${currency} ${this.formatMoney(partialPerPerson)} por persona y completa el saldo antes del viaje.`;
    }

    this.dynamicQuote = {
      ...quote,
      accommodationTotal,
      serviceTotal,
      discount,
      payNow,
      payLater
    };

    this.setText("adultsTotal", `${currency} ${this.formatMoney(toursTotal + machuPicchuTotal + trainTotal)}`);
    this.setText("childrenTotal", `${currency} ${this.formatMoney(0)}`);
    this.setText("extrasTotal", `${currency} ${this.formatMoney(extrasTotal)}`);
    this.setText("serviceTotal", `${currency} ${this.formatMoney(serviceTotal)}`);
    this.setText("payNowTotal", `${currency} ${this.formatMoney(payNow)}`);
    this.setText("discountTotal", `- ${currency} ${this.formatMoney(discount)}`);
    this.setText("payLaterTotal", `${currency} ${this.formatMoney(payLater)}`);
    this.setText("accommodationTotal", `${currency} ${this.formatMoney(accommodationTotal)}`);

    const paymentModeSelect = document.getElementById("paymentMode");

    if (paymentModeSelect) {
      const partialOption = paymentModeSelect.querySelector('option[value="partial"]');

      if (partialOption) {
        partialOption.textContent = "Pagar solo un adelanto";
      }
    }

    const payNowLabel = document.getElementById("payNowLabel");

    if (payNowLabel) {
      payNowLabel.textContent = "Pagar ahora";
    }

    const adultsRow = document.getElementById("adultsTotal")?.closest(".booking-summary__line");

    if (adultsRow) {
      const adultsLabel = adultsRow.querySelector("span");

      if (adultsLabel) {
        adultsLabel.textContent = "Tours y Machu Picchu";
      }

      adultsRow.hidden = false;
    }

    const childrenRow = document.getElementById("childrenTotal")?.closest(".booking-summary__line");

    if (childrenRow) {
      childrenRow.hidden = true;
    }

    const accommodationRow = document.getElementById("accommodationTotalRow");

    if (accommodationRow) {
      accommodationRow.hidden = !(accommodationTotal > 0 && totalAccommodationNights > 0);

      const accommodationLabel = accommodationRow.querySelector("span");

      if (accommodationLabel) {
        accommodationLabel.textContent = `Alojamiento x${String(totalAccommodationNights).padStart(2, "0")} noches`;
      }
    }

    const extrasRow = document.getElementById("extrasTotal")?.closest(".booking-summary__line");

    if (extrasRow) {
      extrasRow.hidden = !(extrasTotal > 0);

      const extrasLabel = extrasRow.querySelector("span");

      if (extrasLabel) {
        extrasLabel.textContent = "Extras";
      }
    }

    const serviceTotalRow = document.getElementById("serviceTotal")?.closest(".booking-summary__line");

    if (serviceTotalRow) {
      const serviceLabel = serviceTotalRow.querySelector("span");

      if (serviceLabel) {
        serviceLabel.textContent = "Total servicio";
      }

      serviceTotalRow.hidden = false;
    }

    const discountRow = document.getElementById("discountRow");

    if (discountRow) {
      discountRow.hidden = !(this.paymentMode === "full" && discount > 0);

      const discountLabel = discountRow.querySelector("span");

      if (discountLabel) {
        discountLabel.textContent = "Descuento";
      }
    }

    const payLaterRow = document.getElementById("payLaterRow");

    if (payLaterRow) {
      const payLaterLabel = payLaterRow.querySelector("span");

      if (payLaterLabel) {
        payLaterLabel.textContent = "Pagarás luego";
      }

      payLaterRow.hidden = this.paymentMode === "full" || payLater <= 0;
    }

    const paymentInfo = document.getElementById("paymentInfo");

    if (paymentInfo) {
      paymentInfo.textContent = infoText;
    }

    return true;
  }

  calculateExtrasTotal() {
    if (!this.product?.extras?.length) return 0;

    const passengers = this.getTotalPassengers();

    return this.product.extras.reduce((total, extra) => {
      if (!this.selectedExtras.has(extra.code)) return total;

      const price = Number(
        extra.price ||
        extra.publishedPriceUSD ||
        extra.publishedPricing?.amount ||
        0
      );

      if (extra.perPerson) return total + (price * passengers);

      return total + price;
    }, 0);
  }

  calculateAccommodationTotal() {
    if (!this.product || !this.isPackage(this.product)) return 0;

    const summary = this.getAccommodationSummary(this.product);

    return summary.reduce((total, item) => {
      const hotelCode = this.selectedHotelsByDestination[item.destination];
      const selectedCombo = this.selectedCombinationsByDestination[item.destination];

      if (!hotelCode || hotelCode === "no-hotel") return total;
      if (!selectedCombo) return total;

      return total + Number(selectedCombo.totalForStay || 0);
    }, 0);
  }

  calculateAccommodationAdditionalPerPerson(destination) {
    const hotelCode = this.selectedHotelsByDestination[destination];

    if (!hotelCode || hotelCode === "no-hotel") return 0;

    const combo = this.selectedCombinationsByDestination[destination];

    return Number(combo?.additionalPerPerson || 0);
  }

  getBookingSummary() {
    if (this.productType === "package" && this.dynamicQuote) {
      const currency = this.dynamicQuote.currency || this.product.currency || "USD";

      const selectedExtras = this.packageContent?.extras
        ? this.packageContent.extras
            .filter((extra) => this.selectedPackageExtraCodes.includes(extra.code))
            .map((extra) => extra.label)
        : [];

      const accommodation = this.getAccommodationSummary(this.product)
        .map((item) => {
          const hotelCode = this.selectedHotelsByDestination[item.destination];

          if (!hotelCode || hotelCode === "no-hotel") return null;

          const selection = this.getSelectedAccommodationForDestination(item.destination);

          if (!selection?.hotel || !selection?.combination) return null;

          return `${item.label || this.getDestinationLabel(item.destination)} - ${selection.hotel.hotelName} - ${selection.combination.label}`;
        })
        .filter(Boolean);

      return {
        title: this.product.title,
        date: this.date || "No seleccionada",
        adults: this.adults,
        children: this.children,
        departureTime: this.getSelectedDepartureTimeLabel(),
        serviceMode: this.serviceMode === "private" ? "Tour privado" : "Tour en grupo",
        accommodation,
        extras: selectedExtras,
        serviceTotal: `${currency} ${this.formatMoney(this.dynamicQuote.serviceTotal || this.dynamicQuote.total || 0)}`,
        payNow: `${currency} ${this.formatMoney(this.dynamicQuote.payNow || 0)}`,
        payLater: `${currency} ${this.formatMoney(this.dynamicQuote.payLater || 0)}`,
        paymentMode: this.paymentMode === "full" ? "Pago completo" : "Pagar solo un adelanto"
      };
    }

    const currency = this.product.currency || "USD";
    const adultPrice = Number(this.product.basePricing?.adult || 0);
    const childPrice = Number(this.product.basePricing?.child || adultPrice);

    const adultsTotal = this.adults * adultPrice;
    const childrenTotal = this.children * childPrice;
    const extrasTotal = this.calculateExtrasTotal();
    const accommodationTotal = this.calculateAccommodationTotal();
    const serviceTotal = adultsTotal + childrenTotal + extrasTotal + accommodationTotal;

    const fullDiscountPercent = Number(this.product.paymentOptions?.fullPaymentDiscountPercent || 10);
    const partialPerPerson = Number(this.product.paymentOptions?.partialPaymentPerPerson || 49.9);

    let payNow = serviceTotal;
    let payLater = 0;

    if (this.paymentMode === "full") {
      payNow = serviceTotal - (serviceTotal * (fullDiscountPercent / 100));
      payLater = 0;
    } else {
      const totalPassengers = this.getTotalPassengers();
      payNow = totalPassengers * partialPerPerson;
      payLater = serviceTotal - payNow;

      if (payLater < 0) payLater = 0;
    }

    const selectedExtras = (this.product.extras || [])
      .filter((extra) => this.selectedExtras.has(extra.code))
      .map((extra) => extra.label);

    const accommodation = this.getAccommodationSummary(this.product)
      .map((item) => {
        const hotelCode = this.selectedHotelsByDestination[item.destination];

        if (!hotelCode || hotelCode === "no-hotel") return null;

        const selection = this.getSelectedAccommodationForDestination(item.destination);

        if (!selection?.hotel || !selection?.combination) return null;

        return `${item.label || this.getDestinationLabel(item.destination)} - ${selection.hotel.hotelName} - ${selection.combination.label}`;
      })
      .filter(Boolean);

    return {
      title: this.product.title,
      date: this.date || "No seleccionada",
      adults: this.adults,
      children: this.children,
      departureTime: this.getSelectedDepartureTimeLabel(),
      serviceMode: this.serviceMode === "private" ? "Tour privado" : "Tour en grupo",
      accommodation,
      extras: selectedExtras,
      serviceTotal: `${currency} ${this.formatMoney(serviceTotal)}`,
      payNow: `${currency} ${this.formatMoney(payNow)}`,
      payLater: `${currency} ${this.formatMoney(payLater)}`,
      paymentMode: this.paymentMode === "full" ? "Pago completo" : "Pagar solo un adelanto"
    };
  }

  handlePaypalAction() {
    const summary = this.getBookingSummary();
    const actionTitle = this.isPeruPackage(this.product) ? "Aquí conectarás la solicitud de cotización." : "Aquí conectarás PayPal.";

    alert(
      `${actionTitle}\n\n` +
      `Tour: ${summary.title}\n` +
      `Fecha: ${summary.date}\n` +
      `Horario: ${summary.departureTime || "No aplica"}\n` +
      `Adultos: ${summary.adults}\n` +
      `Niños: ${summary.children}\n` +
      `Modalidad servicio: ${summary.serviceMode}\n` +
      `Alojamiento: ${summary.accommodation.join(" | ") || "No aplica"}\n` +
      `Extras: ${summary.extras.join(", ") || "Ninguno"}\n` +
      `Modalidad pago: ${summary.paymentMode}\n` +
      `Monto a pagar ahora: ${summary.payNow}\n` +
      `Pagarás luego: ${summary.payLater}`
    );
  }
  initDynamicPackageEngine() {
    if (!this.product || !this.isPackage(this.product)) return;

    if (!window.MyCuscoTripPackageGenerator) {
      console.warn("Falta package-generator.js. Se mostrará el paquete sin motor dinámico.");
      return;
    }

    const options = window.MyCuscoTripPackageGenerator.generatePackageOptions(
      {
        productFamily: this.product.productFamily,
        days: this.product.days,
        nights: this.product.nights,
        arrivalTime: "09:00",
        departureTime: "20:00",
        adults: this.adults,
        children: this.children,
        nationality: "foreign"
      },
      this.allData
    );

    this.packageOptions = Array.isArray(options) ? options : [];

    if (!this.packageOptions.length) {
      console.warn("No se generaron opciones dinámicas para este paquete.");
      return;
    }

    this.renderDynamicPackageOptions();
    const initialOptionIndex = this.getValidPackageOptionIndex(this.requestedPackageOptionIndex);
    this.selectDynamicPackageOption(initialOptionIndex);
  }

  renderDynamicPackageOptions() {
    const target =
      document.getElementById("packageOptions") ||
      this.createDynamicSection("packageOptions", "productItinerary");

    if (!target) return;

    target.innerHTML = `
      <section class="package-options-section">
        <div class="package-options-section__header">
          <h2>Opciones de itinerario disponibles</h2>
          <p>Opciones generadas dinámicamente desde la configuración del paquete.</p>
        </div>

        <div class="package-options-list">
          ${this.packageOptions.map((option, index) => {
            const codes = Array.isArray(option.includedTourCodes)
              ? option.includedTourCodes
              : [];

            const tourCount = codes.length;
            const label = option.generationReason || "dinámica";

            return `
              <button
                type="button"
                class="package-option-btn ${index === this.selectedPackageOptionIndex ? "is-selected" : ""}"
                data-package-option-index="${index}"
              >
                <strong>Opción ${index + 1}</strong>
                <span>${tourCount} experiencia${tourCount === 1 ? "" : "s"}</span>
                <small>${this.escapeHtml(label)}</small>
              </button>
            `;
          }).join("")}
        </div>
      </section>
    `;

    target.querySelectorAll("[data-package-option-index]").forEach((button) => {
      button.addEventListener("click", () => {
        this.selectDynamicPackageOption(Number(button.dataset.packageOptionIndex || 0));
      });
    });
  }

  selectDynamicPackageOption(index = 0) {
    const option = this.packageOptions[index];

    if (!option) return;

    this.selectedPackageOption = option;
    this.selectedPackageOptionIndex = index;
    this.selectedPackageExtraCodes = [];
    this.packageContent = null;
    this.dynamicQuote = null;

    document.querySelectorAll("[data-package-option-index]").forEach((button) => {
      button.classList.toggle(
        "is-selected",
        Number(button.dataset.packageOptionIndex || 0) === index
      );
    });

    this.renderDynamicPackageItinerary();
    this.resolveDynamicAccommodationPlan();
    this.renderDynamicPackageContent();
    this.refreshAccommodationSelections();
    this.updatePricing();
  }

  renderDynamicPackageItinerary() {
    if (!this.selectedPackageOption || !window.MyCuscoTripItineraryBuilder) return;

    this.selectedItinerary = window.MyCuscoTripItineraryBuilder.buildItinerary(
      this.selectedPackageOption,
      {
        mode: "showcase",
        arrivalTime: "09:00",
        departureTime: "20:00",
        packagesCusco: this.allData?.data?.packagesCusco,
        itineraryHints: this.selectedPackageOption.itineraryHints || {}
      }
    );

    const target = document.getElementById("productItinerary");

    if (!target) return;

    target.innerHTML = this.selectedItinerary.map((day) => `
      <div class="experience-itinerary-item">
        <h3>Día ${this.escapeHtml(day.day)}</h3>
        ${(day.items || []).map((item) => `
          <p>
            <strong>${this.escapeHtml(item.title || "Actividad")}</strong>
            ${item.description ? `<br>${this.escapeHtml(item.description)}` : ""}
            ${item.duration ? `<br><small>${this.escapeHtml(item.duration)}</small>` : ""}
          </p>
        `).join("")}
      </div>
    `).join("");
  }

  resolveDynamicAccommodationPlan() {
    if (!this.selectedPackageOption || !window.MyCuscoTripHotelService) {
      this.accommodationPlan = [];
      return;
    }

    this.accommodationPlan = window.MyCuscoTripHotelService.resolveAccommodationPlan(
      this.selectedPackageOption,
      this.selectedItinerary,
      {
        adults: this.adults,
        children: this.children
      },
      this.allData
    );

    this.product.accommodationSummary = this.accommodationPlan.map((item) => ({
      destination: item.destination,
      nights: item.nights,
      label: `${item.label} - ${item.nights} noche${item.nights === 1 ? "" : "s"}`
    }));
  }

  renderDynamicPackageContent() {
    if (!this.selectedPackageOption || !window.MyCuscoTripPackageContentService) return;

    const content = window.MyCuscoTripPackageContentService.buildPackageContent(
      this.selectedPackageOption,
      {
        accommodationPlan: this.accommodationPlan,
        selectedExtraCodes: this.selectedPackageExtraCodes
      }
    );

    this.packageContent = content;

    this.renderIncludes(content.includes || []);
    this.renderExcludes(content.excludes || []);
    this.renderDynamicPackageExtras(content);
  }

  renderDynamicPackageExtras(content) {
    const section = document.getElementById("extrasSection");
    const container = document.getElementById("extrasContainer");

    if (!section || !container) return;

    const extras = Array.isArray(content?.extras) ? content.extras : [];

    if (!extras.length) {
      section.hidden = true;
      container.innerHTML = "";
      return;
    }

    section.hidden = false;

    const allInclusiveChecked =
      Array.isArray(content.recommendedExtraCodes) &&
      content.recommendedExtraCodes.length > 0 &&
      content.recommendedExtraCodes.every((code) => this.selectedPackageExtraCodes.includes(code));

    container.innerHTML = `
      <div class="booking-extra-all-inclusive">
        ${content.allInclusiveAvailable ? `
          <label class="booking-extra-item booking-extra-item--all-inclusive" for="package-all-inclusive">
            <input
              type="checkbox"
              id="package-all-inclusive"
              ${allInclusiveChecked ? "checked" : ""}
            />
            <div class="booking-extra-text">
              <strong>Servicios todo incluido</strong>
              <small>Agrega automáticamente tickets, entradas, almuerzos y servicios recomendados.</small>
            </div>
          </label>
        ` : ""}
      </div>

      ${extras.map((extra) => `
        <label class="booking-extra-item" for="package-extra-${this.escapeHtml(extra.code)}">
          <input
            type="checkbox"
            id="package-extra-${this.escapeHtml(extra.code)}"
            data-package-extra-code="${this.escapeHtml(extra.code)}"
            ${this.selectedPackageExtraCodes.includes(extra.code) ? "checked" : ""}
          />
          <div class="booking-extra-text">
            <strong>${this.escapeHtml(extra.label || extra.code || "Servicio adicional")}</strong>
            <small>
              ${extra.recommended ? "Recomendado" : "Opcional"}
              ${extra.sourceTourTitle ? ` · ${this.escapeHtml(extra.sourceTourTitle)}` : ""}
            </small>
          </div>
        </label>
      `).join("")}
    `;

    container.querySelectorAll("[data-package-extra-code]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const code = checkbox.dataset.packageExtraCode;

        if (!code) return;

        if (checkbox.checked) {
          this.selectedPackageExtraCodes = Array.from(new Set([
            ...this.selectedPackageExtraCodes,
            code
          ]));
        } else {
          this.selectedPackageExtraCodes = this.selectedPackageExtraCodes.filter((item) => item !== code);
        }

        this.renderDynamicPackageContent();
        this.updatePricing();
      });
    });

    const allInclusive = document.getElementById("package-all-inclusive");

    allInclusive?.addEventListener("change", () => {
      if (allInclusive.checked) {
        this.selectedPackageExtraCodes = window.MyCuscoTripPackageContentService.applyAllInclusive(
          this.selectedPackageOption
        );
      } else {
        this.selectedPackageExtraCodes = [];
      }

      this.renderDynamicPackageContent();
      this.updatePricing();
    });
  }

  getSelectedDynamicPackageExtras() {
    if (!this.selectedPackageOption || !window.MyCuscoTripPackageContentService) return [];

    return window.MyCuscoTripPackageContentService
      .getSelectedExtras(this.selectedPackageOption, this.selectedPackageExtraCodes)
      .map((extra) => extra.raw || extra);
  }

  createDynamicSection(id, afterElementId) {
    const existing = document.getElementById(id);

    if (existing) return existing;

    const reference = document.getElementById(afterElementId);

    if (!reference || !reference.parentNode) return null;

    const section = document.createElement("div");
    section.id = id;
    reference.parentNode.insertBefore(section, reference.nextSibling);

    return section;
  }
  renderNotFound(message) {
    const main = document.querySelector(".product-page");

    if (!main) return;

    main.innerHTML = `
      <section class="experience-content">
        <div class="container">
          <div class="experience-card">
            <h1>Experiencia no disponible</h1>
            <p>${this.escapeHtml(message)}</p>
            <br />
            <a class="btn" href="${this.resolvePath("all-experiences.html")}">Ver todas las experiencias</a>
          </div>
        </div>
      </section>
    `;
  }

  isPackage(product) {
    if (!product) return false;
    if (product.productKind === "package") return true;
    if (product.category === "paquetes") return true;
    if (typeof product.type === "string" && product.type.toLowerCase().includes("package")) return true;
    if (typeof product.productFamily === "string" && product.productFamily.toLowerCase().includes("package")) return true;
    if (Array.isArray(product.accommodationPlan) && product.accommodationPlan.length > 0) return true;
    if (Array.isArray(product.accommodationSummary) && product.accommodationSummary.length > 0) return true;
    return false;
  }

  getAccommodationSummary(product) {
    if (!product) return [];

    if (Array.isArray(product.accommodationSummary) && product.accommodationSummary.length) {
      return product.accommodationSummary
        .map((item) => ({
          destination: item.destination,
          nights: Number(item.nights || 0),
          label: item.label || `${this.getDestinationLabel(item.destination)} - ${item.nights || 0} noche(s)`
        }))
        .filter((item) => item.destination && item.nights > 0);
    }

    if (Array.isArray(product.accommodationPlan) && product.accommodationPlan.length) {
      const grouped = product.accommodationPlan.reduce((acc, item) => {
        const destination = item.destination;

        if (!destination) return acc;

        if (!acc[destination]) {
          acc[destination] = {
            destination,
            nights: 0,
            label: this.getDestinationLabel(destination)
          };
        }

        acc[destination].nights += 1;

        return acc;
      }, {});

      return Object.values(grouped).map((item) => ({
        destination: item.destination,
        nights: item.nights,
        label: `${item.label} - ${item.nights} noche${item.nights > 1 ? "s" : ""}`
      }));
    }

    return [];
  }

  getHotelsByDestination(destination) {
    const resolvedDestination =
      window.MyCuscoTripDestinationService && this.allData
        ? window.MyCuscoTripDestinationService.resolveHotelDestination(destination, this.allData)
        : destination;

    return this.hotelsData?.destinations?.[resolvedDestination]?.hotels || [];
  }

  getHotelByCode(destination, hotelCode) {
    return this.getHotelsByDestination(destination).find((hotel) => hotel.hotelCode === hotelCode) || null;
  }

  getDefaultHotelCodeForDestination(destination) {
    const normalized = String(destination || "").toLowerCase();

    if (normalized.includes("cusco")) return "cusco-boutique";
    if (normalized.includes("aguas")) return "luz-garden";
    if (normalized.includes("machu")) return "luz-garden";

    return "";
  }

  getSelectedAccommodationForDestination(destination) {
    const hotelCode = this.selectedHotelsByDestination[destination];

    if (!hotelCode || hotelCode === "no-hotel") {
      return {
        hotel: null,
        combination: null
      };
    }

    const hotel = this.getHotelByCode(destination, hotelCode);
    const combination = this.selectedCombinationsByDestination[destination] || null;

    return {
      hotel,
      combination
    };
  }

  getTotalPassengers() {
    return this.adults + this.children;
  }

  normalizeRoomDefinition(room) {
    return {
      roomType: String(room.roomType || ""),
      label: room.label || room.roomType || "Habitación",
      bedType: room.bedType || "",
      capacity: Number(room.capacity || 0),
      pricePerNight: Number(
        room.pricePerNight ??
        room.publishedPricing?.amount ??
        room.price?.amount ??
        0
      ),
      helperText: room.helperText || "",
      publishedPricing: room.publishedPricing || null
    };
  }

  generateAccommodationCombinations(rooms, passengers, nights) {
    const defs = (Array.isArray(rooms) ? rooms : [])
      .map((room) => this.normalizeRoomDefinition(room))
      .filter((room) => room.capacity > 0 && room.pricePerNight >= 0)
      .sort((a, b) => a.capacity - b.capacity || a.pricePerNight - b.pricePerNight);

    if (!defs.length || passengers <= 0) return [];

    const results = [];
    const seen = new Set();

    const backtrack = (index, remainingPassengers, currentCounts) => {
      if (index === defs.length) {
        if (remainingPassengers === 0) {
          const used = currentCounts
            .map((count, i) => ({
              room: defs[i],
              count
            }))
            .filter((entry) => entry.count > 0);

          if (!used.length) return;

          const key = used
            .map((entry) => `${entry.room.roomType}:${entry.count}`)
            .join("|");

          if (seen.has(key)) return;

          seen.add(key);

          const totalRooms = used.reduce((sum, entry) => sum + entry.count, 0);

          const totalPerNight = used.reduce(
            (sum, entry) => sum + (entry.room.pricePerNight * entry.count),
            0
          );

          const totalForStay = totalPerNight * Number(nights || 0);
          const additionalPerPerson = passengers > 0 ? totalForStay / passengers : 0;

          results.push({
            key,
            rooms: used.map((entry) => ({
              roomType: entry.room.roomType,
              label: entry.room.label,
              bedType: entry.room.bedType,
              capacity: entry.room.capacity,
              pricePerNight: entry.room.pricePerNight,
              count: entry.count,
              helperText: entry.room.helperText,
              publishedPricing: entry.room.publishedPricing || null
            })),
            totalRooms,
            totalPerNight,
            totalForStay,
            additionalPerPerson,
            label: this.buildCombinationLabel(used),
            helperText: used[0]?.room?.helperText || ""
          });
        }

        return;
      }

      const room = defs[index];
      const maxCount = Math.ceil(remainingPassengers / room.capacity);

      for (let count = 0; count <= maxCount; count += 1) {
        const covered = count * room.capacity;

        if (covered > remainingPassengers) break;

        currentCounts[index] = count;
        backtrack(index + 1, remainingPassengers - covered, currentCounts);
      }

      currentCounts[index] = 0;
    };

    backtrack(0, passengers, new Array(defs.length).fill(0));

    return results.sort((a, b) => {
      if (a.totalPerNight !== b.totalPerNight) return a.totalPerNight - b.totalPerNight;
      if (a.totalRooms !== b.totalRooms) return a.totalRooms - b.totalRooms;
      return a.label.localeCompare(b.label, "es");
    });
  }

  buildCombinationLabel(usedRooms) {
    return usedRooms
      .map((entry) => {
        if (entry.room.roomType === "no-hotel") {
          return entry.room.label;
        }

        return `${entry.count} ${entry.room.label}${entry.count > 1 ? "s" : ""}`;
      })
      .join(" + ");
  }

  refreshAccommodationSelections() {
    if (!this.product || !this.isPackage(this.product)) return;

    const summary = this.getAccommodationSummary(this.product);
    const passengers = this.getTotalPassengers();

    summary.forEach((item) => {
      const hotels = this.getHotelsByDestination(item.destination);

      const allHotels = [
        {
          hotelCode: "no-hotel",
          hotelName: "Opción sin hotel",
          stars: 0,
          location: this.getDestinationLabel(item.destination),
          address: "",
          images: {
            cover: "",
            gallery: []
          },
          amenities: {
            checkin: "",
            checkout: "",
            breakfast: ""
          },
          rooms: [
            {
              roomType: "no-hotel",
              label: "Reservaré mi hotel por cuenta propia",
              bedType: "",
              capacity: Math.max(passengers, 1),
              pricePerNight: 0,
              helperText: "Brindaré los datos de mi alojamiento luego."
            }
          ]
        },
        ...hotels
      ];

      let hotelCode = this.selectedHotelsByDestination[item.destination];

      if (!hotelCode) {
        this.selectedHotelsByDestination[item.destination] = "no-hotel";
        this.selectedCombinationsByDestination[item.destination] = null;
        return;
      }

      if (hotelCode === "no-hotel") {
        this.selectedCombinationsByDestination[item.destination] = null;
        return;
      }

      const hotel = allHotels.find((itemHotel) => itemHotel.hotelCode === hotelCode);

      if (!hotel) {
        this.selectedHotelsByDestination[item.destination] = "no-hotel";
        this.selectedCombinationsByDestination[item.destination] = null;
        return;
      }

      const combinations = this.generateAccommodationCombinations(
        hotel?.rooms || [],
        passengers,
        Number(item.nights || 0)
      );

      const selectedKey = this.selectedCombinationsByDestination[item.destination]?.key;
      const stillValid = combinations.find((combo) => combo.key === selectedKey);

      if (!stillValid) {
        this.selectedCombinationsByDestination[item.destination] = combinations[0] || null;
      }
    });

    this.renderAccommodationOptions(this.product);
    this.bindAccommodationEvents();
  }

  renderRoomTypeSummary() {
    return;
  }

  renderSelectedHotelGallery() {
    return;
  }

  renderStars(stars) {
    const total = Number(stars || 0);

    if (total <= 0) return "";

    return "★".repeat(total);
  }

  getDestinationLabel(destination) {
    const resolvedDestination =
      window.MyCuscoTripDestinationService && this.allData
        ? window.MyCuscoTripDestinationService.resolveHotelDestination(destination, this.allData)
        : destination;

    if (window.MyCuscoTripDestinationService && this.allData) {
      return window.MyCuscoTripDestinationService.getDestinationLabel(resolvedDestination, this.allData);
    }

    return this.hotelsData?.destinations?.[resolvedDestination]?.label || resolvedDestination || "Destino";
  }

  resolvePath(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    if (path.startsWith("/")) return path;

    return `${this.basePath}${String(path).replace(/^\.?\//, "")}`;
  }

  resolveAssetPath(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;

    return this.resolvePath(path);
  }

  setText(id, value) {
    const el = document.getElementById(id);

    if (el) el.textContent = value;
  }

  formatMoney(value) {
    if (window.MyCuscoTripCurrencyService && this.allData && this.product?.currency) {
      return window.MyCuscoTripCurrencyService
        .formatMoney(value, this.product.currency, this.allData)
        .replace(`${this.product.currency} `, "")
        .replace("US$ ", "")
        .replace("S/ ", "");
    }

    return Number(value || 0).toFixed(2);
  }

  escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.MyCuscoTripProductPage = new MyCuscoTripProductPage();
});
