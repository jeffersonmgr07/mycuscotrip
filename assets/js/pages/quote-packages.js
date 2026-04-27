class MyCuscoTripQuotePackages {
  constructor() {
    this.basePath = window.location.hostname.includes("github.io") ? "/mycuscotrip/" : "/";

    this.packagesData = { packages: [], paymentOptions: {}, currencyRules: {} };
    this.trainsData = { routes: {}, trainCategories: {}, exchangeRate: {} };
    this.hotelsData = { destinations: {} };
    this.discountCodes = [];

    this.packages = [];
    this.selectedPackage = null;
    this.selectedItineraryOption = null;

    this.adults = 2;
    this.children = 0;
    this.nationality = "national";
    this.quoteCurrency = "PEN";
    this.paymentMode = "full";

    this.travelStartDate = "";
    this.travelEndDate = "";
    this.travelDays = 0;
    this.travelNights = 0;
    this.arrivalTime = "";
    this.departureTime = "";

    this.exchangeRate = 3.75;

    this.selectedHotelsByDestination = {};
    this.selectedCombinationsByDestination = {};
    this.activeHotelModalDestination = null;
    this.pendingHotelSelection = null;

    this.selectedOutboundTrainCode = "";
    this.selectedReturnTrainCode = "";
    this.activeTrainDirection = null;
    this.pendingTrainCode = "";

    this.selectedExtras = new Set();
    this.appliedDiscountCode = null;

    this.quoteReference = this.getStableQuoteReference();
    this.printCoupon = this.getStablePrintCoupon();

    this.init();
  }

  async init() {
    try {
      await this.loadAllData();
      this.enhancePrintableTemplate();
      this.bindBaseEvents();
      this.initDatePicker();
      this.initTimePickers();
      this.applyCurrencyRulesByNationality();
      this.updateReferenceUI();
      this.updatePassengersUI();
      this.updateExchangeRateHelp();
      this.renderInitialState();
      this.updatePricing();
      this.updatePrintQuotation();
    } catch (error) {
      console.error("Error inicializando cotizador:", error);
      alert("No se pudo cargar el cotizador. Revisa que existan packages-peru.json, trains.json, hotels.json y discount-codes.json.");
    }
  }

  async loadAllData() {
    const [packagesData, trainsData, hotelsData, discountCodes] = await Promise.all([
      this.fetchJson("assets/data/packages-peru.json"),
      this.fetchJson("assets/data/trains.json"),
      this.fetchJson("assets/data/hotels.json"),
      this.fetchOptionalJson("assets/data/discount-codes.json")
    ]);

    this.packagesData = packagesData || { packages: [], paymentOptions: {}, currencyRules: {} };
    this.trainsData = trainsData || { routes: {}, trainCategories: {}, exchangeRate: {} };
    this.hotelsData = hotelsData || { destinations: {} };
    this.discountCodes = Array.isArray(discountCodes) ? discountCodes : [];

    this.packages = Array.isArray(this.packagesData.packages)
      ? this.packagesData.packages.filter((item) => item.status !== "draft")
      : [];

    this.exchangeRate = Number(this.trainsData?.exchangeRate?.fallbackRate || 3.75);

    await this.loadExchangeRate();
  }

  async fetchJson(path) {
    const response = await fetch(this.resolvePath(path), { cache: "no-store" });
    if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
    return response.json();
  }

  async fetchOptionalJson(path) {
    try {
      const response = await fetch(this.resolvePath(path), { cache: "no-store" });
      if (!response.ok) return [];
      return response.json();
    } catch (error) {
      console.warn(`No se pudo cargar ${path}. Se continuará sin códigos de descuento.`);
      return [];
    }
  }

  async loadExchangeRate() {
    try {
      const response = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
      const data = await response.json();
      if (data && data.rates && Number(data.rates.PEN) > 0) {
        this.exchangeRate = Number(data.rates.PEN);
      }
    } catch (error) {
      console.warn("No se pudo obtener tipo de cambio online. Se usará respaldo:", this.exchangeRate);
    }
  }

  enhancePrintableTemplate() {
    const printBrand = document.querySelector(".print-header > div:first-child h2");
    if (printBrand) {
      printBrand.outerHTML = `
        <img
          class="print-logo"
          src="${this.resolveAssetPath("assets/img/reserva/logo-color.png")}"
          alt="My Cusco Trip"
        />
      `;
    }
  }

  bindBaseEvents() {
    document.querySelectorAll(".quote-qty-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.target;
        const action = button.dataset.action;

        if (target === "adults") {
          if (action === "minus") this.adults = Math.max(1, this.adults - 1);
          if (action === "plus") this.adults += 1;
        }

        if (target === "children") {
          if (action === "minus") this.children = Math.max(0, this.children - 1);
          if (action === "plus") this.children += 1;
        }

        this.updatePassengersUI();
        this.refreshAccommodationSelections();
        this.renderPackageOptions();
        this.renderTrainSelectors();
        this.updatePricing();
        this.updatePrintQuotation();
      });
    });

    document.getElementById("nationality")?.addEventListener("change", (event) => {
      this.nationality = event.target.value;
      this.applyCurrencyRulesByNationality();
      this.selectedOutboundTrainCode = "";
      this.selectedReturnTrainCode = "";
      this.renderPackageOptions();
      this.renderTrainSelectors();
      this.updatePricing();
      this.updatePrintQuotation();
    });

    document.getElementById("quoteCurrency")?.addEventListener("change", (event) => {
      this.quoteCurrency = event.target.value;
      this.renderPackageOptions();
      this.renderAccommodationOptions();
      this.renderTrainSelectors();
      this.renderExtras();
      this.updateExchangeRateHelp();
      this.updatePricing();
      this.updatePrintQuotation();
    });

    document.getElementById("paymentMode")?.addEventListener("change", (event) => {
      this.paymentMode = event.target.value;
      this.updatePricing();
      this.updatePrintQuotation();
    });

    document.getElementById("arrivalTime")?.addEventListener("change", (event) => {
      this.arrivalTime = event.target.value || "";
      this.refreshItineraryByTimeRules();
      this.updatePrintQuotation();
    });

    document.getElementById("departureTime")?.addEventListener("change", (event) => {
      this.departureTime = event.target.value || "";
      this.refreshItineraryByTimeRules();
      this.updatePrintQuotation();
    });

    document.getElementById("applyDiscountCodeBtn")?.addEventListener("click", () => {
      this.applyManualDiscountCode();
    });

    document.getElementById("discountCodeInput")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.applyManualDiscountCode();
      }
    });

    document.getElementById("discountCodeInput")?.addEventListener("input", (event) => {
      event.target.value = event.target.value.toUpperCase();
    });

    document.getElementById("printQuoteBtn")?.addEventListener("click", () => {
      this.updatePrintQuotation();
      window.print();
    });

    document.getElementById("savePdfBtn")?.addEventListener("click", () => {
      this.saveQuotationAsPdf();
    });

    document.getElementById("continuePaymentBtn")?.addEventListener("click", () => {
      this.continueToPayment();
    });

    document.getElementById("openOutboundTrainModalBtn")?.addEventListener("click", () => {
      this.openTrainSelectionModal("outbound");
    });

    document.getElementById("openReturnTrainModalBtn")?.addEventListener("click", () => {
      this.openTrainSelectionModal("return");
    });

    ["clientName", "clientPhone", "clientEmail", "clientDocument", "clientNotes"].forEach((id) => {
      document.getElementById(id)?.addEventListener("input", () => this.updatePrintQuotation());
    });

    this.bindHotelModalEvents();
    this.bindTrainSelectionModalEvents();
    this.bindTrainDetailsModalEvents();
  }

  initDatePicker() {
    const input = document.getElementById("travelRange");
    if (!input || typeof flatpickr === "undefined") return;

    flatpickr(input, {
      locale: flatpickr.l10ns.es,
      mode: "range",
      minDate: "today",
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "d M Y",
      onReady: (_, __, instance) => {
        if (instance.altInput) instance.altInput.setAttribute("readonly", "readonly");
      },
      onChange: (selectedDates) => {
        if (selectedDates.length === 2) {
          this.travelStartDate = this.formatDateInput(selectedDates[0]);
          this.travelEndDate = this.formatDateInput(selectedDates[1]);

          const diffMs = selectedDates[1].getTime() - selectedDates[0].getTime();
          this.travelNights = Math.max(0, Math.round(diffMs / 86400000));
          this.travelDays = this.travelNights + 1;

          this.setText(
            "travelRangeHelp",
            `${this.travelDays} día${this.travelDays !== 1 ? "s" : ""} / ${this.travelNights} noche${this.travelNights !== 1 ? "s" : ""}`
          );

          this.selectedPackage = null;
          this.selectedItineraryOption = null;
          this.selectedHotelsByDestination = {};
          this.selectedCombinationsByDestination = {};
          this.selectedOutboundTrainCode = "";
          this.selectedReturnTrainCode = "";
          this.selectedExtras.clear();
          this.clearAppliedDiscountCode(false);

          this.detectPackageByDates();
          this.updatePricing();
          this.updatePrintQuotation();
        }
      }
    });
  }

  initTimePickers() {
    if (typeof flatpickr === "undefined") return;

    const timeConfig = {
      enableTime: true,
      noCalendar: true,
      dateFormat: "H:i",
      altInput: true,
      altFormat: "h:i K",
      time_24hr: false,
      minuteIncrement: 15,
      allowInput: false,
      locale: flatpickr.l10ns.es
    };

    const arrivalInput = document.getElementById("arrivalTime");
    const departureInput = document.getElementById("departureTime");

    if (arrivalInput) {
      flatpickr(arrivalInput, {
        ...timeConfig,
        onChange: (_, value) => {
          this.arrivalTime = value || "";
          this.refreshItineraryByTimeRules();
          this.updatePrintQuotation();
        }
      });
    }

    if (departureInput) {
      flatpickr(departureInput, {
        ...timeConfig,
        onChange: (_, value) => {
          this.departureTime = value || "";
          this.refreshItineraryByTimeRules();
          this.updatePrintQuotation();
        }
      });
    }
  }

  renderInitialState() {
    this.renderPackageOptions();
    this.renderTrainSelectors();
    this.hideSection("itinerarySection");
    this.hideSection("hotelSection");
    this.hideSection("trainSection");
    this.hideSection("extrasSection");
  }

  detectPackageByDates() {
    const compatible = this.getCompatiblePackages();

    if (!compatible.length) {
      this.selectedPackage = null;
      this.selectedItineraryOption = null;
      this.renderPackageOptions();
      this.hideSection("itinerarySection");
      this.hideSection("hotelSection");
      this.hideSection("trainSection");
      this.hideSection("extrasSection");
      return;
    }

    const pkg = compatible[0];
    this.selectPackage(pkg);
  }

  getCompatiblePackages() {
    if (!this.travelDays || !this.travelNights) return [];

    return this.packages.filter((pkg) => {
      return Number(pkg.days) === this.travelDays && Number(pkg.nights) === this.travelNights;
    });
  }

  applyCurrencyRulesByNationality() {
    const currencySelect = document.getElementById("quoteCurrency");
    if (!currencySelect) return;

    const rules = this.packagesData.currencyRules?.[this.nationality];
    const allowedCurrencies = rules?.allowedCurrencies || (this.nationality === "national" ? ["PEN", "USD"] : ["USD"]);
    const defaultCurrency = rules?.defaultCurrency || allowedCurrencies[0] || "USD";

    Array.from(currencySelect.options).forEach((option) => {
      option.disabled = !allowedCurrencies.includes(option.value);
      option.hidden = !allowedCurrencies.includes(option.value);
    });

    if (!allowedCurrencies.includes(this.quoteCurrency)) {
      this.quoteCurrency = defaultCurrency;
      currencySelect.value = defaultCurrency;
    } else {
      currencySelect.value = this.quoteCurrency;
    }

    const help = document.getElementById("nationalityHelp");
    if (help) {
      if (this.nationality === "national") {
        help.textContent = "Como turista peruano puedes cotizar en soles o dólares. También podrás ver la opción de tren local, sujeta a disponibilidad presencial.";
      } else if (this.nationality === "andean_community") {
        help.textContent = "Para turistas de Comunidad Andina, la cotización se mostrará en dólares americanos.";
      } else {
        help.textContent = "Para turistas extranjeros, la cotización se mostrará únicamente en dólares americanos.";
      }
    }

    const trainSectionText = document.querySelector("#trainSection .quote-card__header p");
    if (trainSectionText) {
      if (this.nationality === "national") {
        trainSectionText.textContent = "Selecciona tu tren de ida y retorno a Machu Picchu. Como turista nacional peruano, también podrás ver la opción de tren local sujeta a disponibilidad.";
      } else {
        trainSectionText.textContent = "Selecciona tu tren turístico de ida y retorno a Machu Picchu según horario, categoría y disponibilidad.";
      }
    }

    this.updateExchangeRateHelp();
  }

  renderPackageOptions() {
    const target = document.getElementById("packageOptions");
    if (!target) return;

    if (!this.travelDays || !this.travelNights) {
      target.innerHTML = `<div class="quote-empty-state">Selecciona tus fechas de viaje para detectar automáticamente el paquete compatible.</div>`;
      return;
    }

    const compatible = this.getCompatiblePackages();

    if (!compatible.length) {
      target.innerHTML = `
        <div class="quote-empty-state">
          No tenemos un paquete configurado para ${this.travelDays} días / ${this.travelNights} noches.
          Puedes ajustar las fechas o crear una versión personalizada.
        </div>
      `;
      return;
    }

    const pkg = this.selectedPackage || compatible[0];
    const pricing = this.getBasePricingForPackage(pkg);
    const adultPrice = this.convertMoney(Number(pricing.adult || 0), pricing.currency, this.quoteCurrency);
    const childPrice = this.convertMoney(Number(pricing.child || pricing.adult || 0), pricing.currency, this.quoteCurrency);
    const optionsCount = Array.isArray(pkg.itineraryOptions) ? pkg.itineraryOptions.length : 0;

    target.innerHTML = `
      <article class="quote-package-card is-selected quote-package-card--detected" aria-label="Paquete detectado automáticamente">
        <div class="quote-package-card__top">
          <div>
            <span class="quote-badge quote-badge--muted">Paquete detectado según tus fechas</span>
            <h3>${this.escapeHtml(pkg.title)}</h3>
            <p>Tu viaje será de <strong>${this.travelDays} días / ${this.travelNights} noches</strong>.</p>
          </div>
          <span class="quote-badge">${this.escapeHtml(pkg.typeLabel || `${this.travelDays}D/${this.travelNights}N`)}</span>
        </div>

        <p>
          <strong>Desde ${this.formatCurrency(adultPrice, this.quoteCurrency)} por adulto</strong>
          ${this.children > 0 ? ` · Niño ${this.formatCurrency(childPrice, this.quoteCurrency)}` : ""}
        </p>

        <p>
          ${optionsCount} opción${optionsCount !== 1 ? "es" : ""} de itinerario disponible${optionsCount !== 1 ? "s" : ""}.
          Precio base sin tren ni alojamiento.
        </p>
      </article>
    `;
  }

  selectPackage(pkg) {
    this.selectedPackage = pkg;

    const availableOptions = this.getAvailableItineraryOptions();
    this.selectedItineraryOption =
      availableOptions.length
        ? availableOptions.find((item) => item.recommended) || availableOptions[0]
        : Array.isArray(pkg.itineraryOptions) && pkg.itineraryOptions.length
          ? pkg.itineraryOptions.find((item) => item.recommended) || pkg.itineraryOptions[0]
          : null;

    this.selectedHotelsByDestination = {};
    this.selectedCombinationsByDestination = {};
    this.selectedOutboundTrainCode = "";
    this.selectedReturnTrainCode = "";
    this.selectedExtras.clear();
    this.clearAppliedDiscountCode(false);

    this.renderPackageOptions();
    this.renderItineraryOptions();
    this.renderPackageIncludes();
    this.refreshAccommodationSelections();

    /* IMPORTANTE: Los trenes se inician sin selección para que el precio base sea más bajo */
    this.selectedOutboundTrainCode = "";
    this.selectedReturnTrainCode = "";

    this.renderTrainSelectors();
    this.renderExtras();
    this.updatePricing();
    this.updatePrintQuotation();

    this.showSection("itinerarySection");
    this.showSection("hotelSection");
    this.showSection("trainSection");

    if (Array.isArray(pkg.extras) && pkg.extras.length) this.showSection("extrasSection");
    else this.hideSection("extrasSection");
  }

  refreshItineraryByTimeRules() {
    if (!this.selectedPackage) return;

    const availableOptions = this.getAvailableItineraryOptions();
    if (!availableOptions.length) {
      this.renderItineraryOptions();
      this.updatePrintQuotation();
      return;
    }

    const currentStillAvailable = availableOptions.some((option) => option.code === this.selectedItineraryOption?.code);

    if (!currentStillAvailable) {
      this.selectedItineraryOption =
        availableOptions.find((option) => option.recommended) ||
        availableOptions[0];
    }

    this.renderItineraryOptions();
    this.updatePrintQuotation();
  }

  getAvailableItineraryOptions() {
    const options = Array.isArray(this.selectedPackage?.itineraryOptions)
      ? this.selectedPackage.itineraryOptions
      : [];

    if (!options.length) return [];

    return options.filter((option) => this.isItineraryAllowedByTime(option));
  }

  isItineraryAllowedByTime(option) {
    const text = `${option.code || ""} ${option.label || ""} ${option.summary || ""} ${(option.itinerary || []).map((item) => `${item.title || ""} ${item.description || ""}`).join(" ")}`.toLowerCase();

    const arrivalMinutes = this.timeToMinutes(this.arrivalTime);
    const departureMinutes = this.timeToMinutes(this.departureTime);

    const hasCityTourFirstDay =
      text.includes("city tour") ||
      text.includes("qoricancha") ||
      text.includes("sacsayhuamán") ||
      text.includes("sacsayhuaman");

    const hasWelcome =
      text.includes("bienvenida") ||
      text.includes("ancestral");

    const hasFullDayLastDay =
      text.includes("montaña de colores") ||
      text.includes("vinicunca") ||
      text.includes("humantay") ||
      text.includes("siete lagunas") ||
      text.includes("valle sagrado full") ||
      text.includes("full day valle sagrado");

    const hasShortLastDay =
      text.includes("maras") ||
      text.includes("moray") ||
      text.includes("valle sur") ||
      text.includes("walking tour") ||
      text.includes("caminata");

    if (arrivalMinutes !== null) {
      if (arrivalMinutes > this.timeToMinutes("12:00") && hasCityTourFirstDay) {
        return false;
      }

      if (arrivalMinutes > this.timeToMinutes("17:00") && hasWelcome) {
        return false;
      }
    }

    if (departureMinutes !== null) {
      if (departureMinutes < this.timeToMinutes("14:00") && (hasFullDayLastDay || hasShortLastDay)) {
        return false;
      }

      if (departureMinutes < this.timeToMinutes("19:00") && hasFullDayLastDay) {
        return false;
      }
    }

    return true;
  }

  renderItineraryOptions() {
    const section = document.getElementById("itinerarySection");
    const target = document.getElementById("itineraryOptions");
    const preview = document.getElementById("itineraryPreview");

    if (!section || !target || !preview || !this.selectedPackage) return;

    const allOptions = this.selectedPackage.itineraryOptions || [];
    const options = this.getAvailableItineraryOptions();

    if (!allOptions.length) {
      section.hidden = true;
      return;
    }

    section.hidden = false;

    if (!options.length) {
      target.innerHTML = `
        <div class="quote-empty-state">
          No encontramos una opción compatible con los horarios ingresados.
          Puedes dejar los horarios en blanco o escribirnos para armar una versión personalizada.
        </div>
      `;
      preview.innerHTML = `<div class="quote-empty-state">Itinerario por confirmar.</div>`;
      return;
    }

    target.innerHTML = options.map((option) => {
      const isSelected = this.selectedItineraryOption?.code === option.code;
      const trainHint = this.getRecommendedTrainHintForItinerary(option);

      return `
        <article class="quote-itinerary-option ${isSelected ? "is-selected" : ""}" data-itinerary-code="${this.escapeHtml(option.code)}">
          <h3>${this.escapeHtml(option.label)}</h3>
          <p>${this.escapeHtml(option.summary || "")}</p>
          ${option.recommended ? `<span class="quote-badge quote-badge--gold">Recomendado</span>` : ""}
          ${trainHint ? `<p class="quote-itinerary-train-hint">${this.escapeHtml(trainHint)}</p>` : ""}
        </article>
      `;
    }).join("");

    target.querySelectorAll(".quote-itinerary-option").forEach((card) => {
      card.addEventListener("click", () => {
        const code = card.dataset.itineraryCode;
        this.selectedItineraryOption = options.find((item) => item.code === code) || options[0];

        /* Al cambiar itinerario, limpiamos trenes para evitar combinaciones incompatibles */
        this.selectedOutboundTrainCode = "";
        this.selectedReturnTrainCode = "";

        this.renderItineraryOptions();
        this.renderTrainSelectors();
        this.updatePricing();
        this.updatePrintQuotation();
      });
    });

    this.renderItineraryPreview();
  }

  renderItineraryPreview() {
    const preview = document.getElementById("itineraryPreview");
    if (!preview) return;

    const itinerary = this.selectedItineraryOption?.itinerary || [];

    if (!itinerary.length) {
      preview.innerHTML = `<div class="quote-empty-state">Itinerario por confirmar.</div>`;
      return;
    }

    preview.innerHTML = itinerary.map((item) => `
      <div class="quote-itinerary-item">
        <h4>${this.escapeHtml(item.title || `Día ${item.day || ""}`)}</h4>
        <p>${this.escapeHtml(item.description || "")}</p>
      </div>
    `).join("");
  }

  renderPackageIncludes() {
    const existing = document.getElementById("packageIncludesBox");
    if (existing) existing.remove();

    if (!this.selectedPackage) return;

    const itinerarySection = document.getElementById("itinerarySection");
    if (!itinerarySection) return;

    const includes = Array.isArray(this.selectedPackage.includes)
      ? this.selectedPackage.includes
      : [];

    if (!includes.length) return;

    const box = document.createElement("div");
    box.id = "packageIncludesBox";
    box.className = "quote-package-includes";

    box.innerHTML = `
      <h3>Este paquete incluye</h3>
      <p>Tu paquete base ya considera los servicios esenciales para operar el itinerario seleccionado. El tren y el alojamiento se cotizan aparte según tus preferencias.</p>
      <ul>
        ${includes.map((item) => `<li>${this.escapeHtml(item)}</li>`).join("")}
      </ul>
    `;

    const preview = document.querySelector(".quote-itinerary-preview");
    if (preview) {
      preview.insertAdjacentElement("afterend", box);
    } else {
      itinerarySection.appendChild(box);
    }
  }

  renderAccommodationOptions() {
    const section = document.getElementById("hotelSection");
    const container = document.getElementById("hotelSelectorsContainer");

    if (!section || !container) return;

    section.hidden = true;
    container.innerHTML = "";

    if (!this.selectedPackage) return;

    const summary = this.getAccommodationSummary();
    if (!summary.length) return;

    section.hidden = false;

    container.innerHTML = summary.map((item) => {
      const selection = this.getSelectedAccommodationForDestination(item.destination);
      const additional = this.calculateAccommodationAdditional(item.destination);
      const destinationLabel = this.getDestinationLabel(item.destination);
      const hasSelection = Boolean(selection?.hotel && selection?.combination);

      const hotelText = selection?.hotel
        ? selection.hotel.hotelCode === "no-hotel"
          ? "Sin alojamiento"
          : `${this.escapeHtml(selection.hotel.hotelName)}${selection.hotel.stars > 0 ? ` · ${selection.hotel.stars}★` : ""}`
        : "Sin hotel seleccionado";

      const comboText = selection?.combination
        ? selection.hotel?.hotelCode === "no-hotel"
          ? "El cliente gestionará su alojamiento por cuenta propia."
          : this.escapeHtml(selection.combination.label)
        : "Acomodación por confirmar";

      return `
        <div class="quote-accommodation-card">
          <div class="quote-accommodation-card__header">
            <strong>${this.escapeHtml(destinationLabel)}</strong>
            <small>${item.nights} noche${item.nights > 1 ? "s" : ""}</small>
          </div>

          <div class="quote-accommodation-card__body">
            <p>${hotelText}</p>
            <p>${comboText}</p>
            <p class="quote-accommodation-card__price">
              + ${this.formatCurrency(additional, this.quoteCurrency)} por estadía
            </p>
            <button type="button" class="btn quote-secondary-btn open-hotel-modal-btn" data-destination="${this.escapeHtml(item.destination)}">
              ${hasSelection ? "Cambiar hotel" : "Elegir hotel"}
            </button>
          </div>
        </div>
      `;
    }).join("");

    container.querySelectorAll(".open-hotel-modal-btn").forEach((button) => {
      button.addEventListener("click", () => this.openHotelModal(button.dataset.destination));
    });
  }

  refreshAccommodationSelections() {
    if (!this.selectedPackage) return;

    const summary = this.getAccommodationSummary();
    const passengers = this.getTotalPassengers();

    summary.forEach((item) => {
      const hotels = this.getHotelsByDestination(item.destination);
      const allHotels = [this.getNoHotelOption(item.destination), ...hotels];

      let hotelCode = this.selectedHotelsByDestination[item.destination];
      let hotel =
        hotelCode === "no-hotel"
          ? allHotels.find((h) => h.hotelCode === "no-hotel")
          : this.getHotelByCode(item.destination, hotelCode);

      if (!hotel) {
        hotel = allHotels[0];
        hotelCode = hotel.hotelCode;
        this.selectedHotelsByDestination[item.destination] = hotelCode;
      }

      const combinations = this.generateAccommodationCombinations(
        hotel.rooms || [],
        passengers,
        Number(item.nights || 0)
      );

      const selectedKey = this.selectedCombinationsByDestination[item.destination]?.key;
      const stillValid = combinations.find((combo) => combo.key === selectedKey);

      if (!stillValid) {
        this.selectedCombinationsByDestination[item.destination] = combinations[0] || null;
      }
    });

    this.renderAccommodationOptions();
  }

  openHotelModal(destination) {
    const modal = document.getElementById("hotelSelectionModal");
    const title = document.getElementById("hotelModalTitle");
    const subtitle = document.getElementById("hotelModalSubtitle");
    const list = document.getElementById("hotelModalList");

    if (!modal || !title || !subtitle || !list || !this.selectedPackage) return;

    this.activeHotelModalDestination = destination;

    const currentHotelCode = this.selectedHotelsByDestination[destination] || "no-hotel";
    const currentComboKey = this.selectedCombinationsByDestination[destination]?.key || "";

    this.pendingHotelSelection = {
      destination,
      hotelCode: currentHotelCode,
      comboKey: currentComboKey
    };

    const destinationLabel = this.getDestinationLabel(destination);
    const summaryItem = this.getAccommodationSummary().find((item) => item.destination === destination);
    const nights = Number(summaryItem?.nights || 0);
    const passengers = this.getTotalPassengers();

    title.textContent = `Elige tu hotel en ${destinationLabel}`;
    subtitle.textContent = `Compara opciones para ${nights} noche${nights !== 1 ? "s" : ""} y ${passengers} pasajero${passengers !== 1 ? "s" : ""}.`;

    const hotels = [this.getNoHotelOption(destination), ...this.getHotelsByDestination(destination)];

    list.innerHTML = hotels.map((hotel) => {
      const combinations = this.generateAccommodationCombinations(hotel.rooms || [], passengers, nights);
      const isSelectedHotel = this.pendingHotelSelection.hotelCode === hotel.hotelCode;
      const initialCombo =
        combinations.find((combo) => isSelectedHotel && combo.key === this.pendingHotelSelection.comboKey) ||
        combinations[0] ||
        null;

      if (isSelectedHotel && initialCombo) {
        this.pendingHotelSelection.comboKey = initialCombo.key;
      }

      const images = [...new Set([
        ...(hotel.images?.cover ? [hotel.images.cover] : []),
        ...(Array.isArray(hotel.images?.gallery) ? hotel.images.gallery : [])
      ])];

      const firstPrice = combinations[0]
        ? this.convertMoney(Number(combinations[0].totalForStay || 0), "USD", this.quoteCurrency)
        : 0;

      return `
        <article
          class="hotel-option-card ${isSelectedHotel ? "is-selected" : ""} ${hotel.hotelCode === "no-hotel" ? "hotel-option-card--no-hotel" : ""}"
          data-destination="${this.escapeHtml(destination)}"
          data-hotel-code="${this.escapeHtml(hotel.hotelCode)}"
          data-selected-combo-key="${this.escapeHtml(initialCombo?.key || "")}"
        >
          <div class="hotel-option-card__header">
            <div>
              <h3>${hotel.hotelCode === "no-hotel" ? "Opción sin alojamiento" : this.escapeHtml(hotel.hotelName)}</h3>
              ${hotel.hotelCode === "no-hotel"
                ? `<p>El cliente gestionará su alojamiento por cuenta propia. No se agregará costo de hotel.</p>`
                : `<p>${hotel.stars || 0}★ · ${this.escapeHtml(hotel.location || destinationLabel)}</p>`}
              ${hotel.address ? `<p>${this.escapeHtml(hotel.address)}</p>` : ""}
            </div>
            <div class="hotel-option-card__badge">
              ${hotel.hotelCode === "no-hotel" ? this.formatCurrency(0, this.quoteCurrency) : `Desde ${this.formatCurrency(firstPrice, this.quoteCurrency)}`}
            </div>
          </div>

          <div class="hotel-option-card__content ${hotel.hotelCode === "no-hotel" ? "hotel-option-card__content--no-hotel" : ""}">
            ${hotel.hotelCode === "no-hotel" ? "" : `
              <div class="hotel-option-card__media">
                ${this.renderHotelGallery(images, hotel.hotelName)}
                ${hotel.summary ? `<p class="hotel-option-card__summary">${this.escapeHtml(hotel.summary)}</p>` : ""}
                ${Array.isArray(hotel.features) && hotel.features.length ? `
                  <div class="hotel-option-card__features">
                    ${hotel.features.map((feature) => `<span>${this.escapeHtml(feature)}</span>`).join("")}
                  </div>
                ` : ""}
                <div class="hotel-option-card__meta">
                  ${hotel.amenities?.checkin ? `<span>Check-in: ${this.escapeHtml(hotel.amenities.checkin)}</span>` : ""}
                  ${hotel.amenities?.checkout ? `<span>Check-out: ${this.escapeHtml(hotel.amenities.checkout)}</span>` : ""}
                  ${hotel.amenities?.breakfast ? `<span>Desayuno: ${this.escapeHtml(hotel.amenities.breakfast)}</span>` : ""}
                </div>
              </div>
            `}

            <div class="hotel-option-card__body">
              ${hotel.hotelCode === "no-hotel" ? "" : `<label>Selecciona acomodación</label>`}
              <div class="hotel-option-card__options">
                ${combinations.length ? combinations.map((combo) => {
                  const totalStay = this.convertMoney(Number(combo.totalForStay || 0), "USD", this.quoteCurrency);
                  const perPerson = passengers > 0 ? totalStay / passengers : 0;
                  const isSelectedCombo = isSelectedHotel && this.pendingHotelSelection.comboKey === combo.key;

                  return `
                    <button
                      type="button"
                      class="hotel-combo-btn ${isSelectedCombo ? "is-selected" : ""}"
                      data-destination="${this.escapeHtml(destination)}"
                      data-hotel-code="${this.escapeHtml(hotel.hotelCode)}"
                      data-combo-key="${this.escapeHtml(combo.key)}"
                    >
                      <span class="hotel-combo-radio" aria-hidden="true"></span>
                      <span class="hotel-combo-btn__main">
                        ${hotel.hotelCode === "no-hotel" ? "Continuar sin alojamiento" : this.escapeHtml(combo.label)}
                      </span>
                      <span class="hotel-combo-btn__sub">
                        ${hotel.hotelCode === "no-hotel"
                          ? "No se agregará costo de alojamiento."
                          : `${combo.totalRooms} hab. · Total estadía ${this.formatCurrency(totalStay, this.quoteCurrency)} · ${this.formatCurrency(perPerson, this.quoteCurrency)} por persona`}
                      </span>
                    </button>
                  `;
                }).join("") : `<p>No hay acomodaciones válidas para ${passengers} pasajero${passengers !== 1 ? "s" : ""}.</p>`}
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("");

    this.bindHotelModalSelectionEvents();
    this.bindHotelGalleryEvents();

    modal.hidden = false;
    document.body.classList.add("quote-modal-open");
  }

  bindHotelModalEvents() {
    const modal = document.getElementById("hotelSelectionModal");
    const closeBtn = document.getElementById("closeHotelModalBtn");
    const confirmBtn = document.getElementById("confirmHotelModalBtn");

    closeBtn?.addEventListener("click", () => this.closeHotelModal());

    modal?.querySelectorAll("[data-close-hotel-modal]").forEach((el) => {
      el.addEventListener("click", () => this.closeHotelModal());
    });

    confirmBtn?.addEventListener("click", () => this.confirmHotelModalSelection());

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal && !modal.hidden) this.closeHotelModal();
    });
  }

  bindHotelModalSelectionEvents() {
    document.querySelectorAll(".hotel-option-card").forEach((card) => {
      card.addEventListener("click", (event) => {
        if (event.target.closest(".hotel-gallery-nav")) return;

        const firstCombo = card.querySelector(".hotel-combo-btn");
        if (!firstCombo) return;

        this.pendingHotelSelection = {
          destination: card.dataset.destination,
          hotelCode: card.dataset.hotelCode,
          comboKey: card.dataset.selectedComboKey || firstCombo.dataset.comboKey
        };

        document.querySelectorAll(".hotel-option-card").forEach((item) => item.classList.remove("is-selected"));
        card.classList.add("is-selected");

        card.querySelectorAll(".hotel-combo-btn").forEach((btn) => {
          btn.classList.toggle("is-selected", btn.dataset.comboKey === this.pendingHotelSelection.comboKey);
        });
      });
    });

    document.querySelectorAll(".hotel-combo-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();

        const card = button.closest(".hotel-option-card");
        if (!card) return;

        card.dataset.selectedComboKey = button.dataset.comboKey || "";

        this.pendingHotelSelection = {
          destination: card.dataset.destination,
          hotelCode: card.dataset.hotelCode,
          comboKey: button.dataset.comboKey || ""
        };

        document.querySelectorAll(".hotel-option-card").forEach((item) => item.classList.remove("is-selected"));
        card.classList.add("is-selected");

        card.querySelectorAll(".hotel-combo-btn").forEach((btn) => {
          btn.classList.toggle("is-selected", btn.dataset.comboKey === button.dataset.comboKey);
        });
      });
    });
  }

  confirmHotelModalSelection() {
    if (!this.pendingHotelSelection) return;

    const { destination, hotelCode, comboKey } = this.pendingHotelSelection;
    if (!destination || !hotelCode || !comboKey) return;

    const hotel =
      hotelCode === "no-hotel"
        ? this.getNoHotelOption(destination)
        : this.getHotelByCode(destination, hotelCode);

    const summaryItem = this.getAccommodationSummary().find((item) => item.destination === destination);
    const combinations = this.generateAccommodationCombinations(
      hotel?.rooms || [],
      this.getTotalPassengers(),
      Number(summaryItem?.nights || 0)
    );

    const combo = combinations.find((item) => item.key === comboKey);
    if (!hotel || !combo) return;

    this.selectedHotelsByDestination[destination] = hotelCode;
    this.selectedCombinationsByDestination[destination] = combo;

    this.renderAccommodationOptions();
    this.updatePricing();
    this.updatePrintQuotation();
    this.closeHotelModal();
  }

  closeHotelModal() {
    const modal = document.getElementById("hotelSelectionModal");
    if (!modal) return;

    modal.hidden = true;
    document.body.classList.remove("quote-modal-open");
    this.activeHotelModalDestination = null;
    this.pendingHotelSelection = null;
  }

  renderHotelGallery(images, hotelName) {
    const finalImages = images.length ? images : ["assets/img/tours/machu-picchu-full-day/cover.jpg"];
    const json = this.escapeHtml(JSON.stringify(finalImages));

    return `
      <div class="hotel-gallery-main" data-images='${json}' data-current-image-index="0">
        <img class="hotel-gallery-main-img" src="${this.resolveAssetPath(finalImages[0])}" alt="${this.escapeHtml(hotelName)}" loading="lazy" />
        ${finalImages.length > 1 ? `
          <button type="button" class="hotel-gallery-nav hotel-gallery-prev" aria-label="Imagen anterior">‹</button>
          <button type="button" class="hotel-gallery-nav hotel-gallery-next" aria-label="Imagen siguiente">›</button>
        ` : ""}
      </div>
    `;
  }

  bindHotelGalleryEvents() {
    document.querySelectorAll(".hotel-gallery-prev, .hotel-gallery-next").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();

        const gallery = button.closest(".hotel-gallery-main");
        const img = gallery?.querySelector(".hotel-gallery-main-img");
        if (!gallery || !img) return;

        let images = [];
        try {
          images = JSON.parse(gallery.dataset.images || "[]");
        } catch {
          images = [];
        }

        if (!images.length) return;

        const current = Number(gallery.dataset.currentImageIndex || 0);
        const next = button.classList.contains("hotel-gallery-next")
          ? (current + 1) % images.length
          : (current - 1 + images.length) % images.length;

        gallery.dataset.currentImageIndex = String(next);
        img.src = this.resolveAssetPath(images[next]);
      });
    });
  }

  renderTrainSelectors() {
    const section = document.getElementById("trainSection");
    if (!section) return;

    if (!this.selectedPackage?.trainSelection?.required) {
      section.hidden = true;
      return;
    }

    section.hidden = false;
    this.updateTrainSelectorCard("outbound");
    this.updateTrainSelectorCard("return");
  }

  updateTrainSelectorCard(direction) {
    const trainCode = direction === "outbound" ? this.selectedOutboundTrainCode : this.selectedReturnTrainCode;
    const train = this.findTrainByCode(trainCode);

    const titleId = direction === "outbound" ? "outboundTrainSelectedTitle" : "returnTrainSelectedTitle";
    const metaId = direction === "outbound" ? "outboundTrainSelectedMeta" : "returnTrainSelectedMeta";

    if (!train) {
      this.setText(titleId, "Por seleccionar");
      this.setText(metaId, direction === "outbound" ? "Elige el tren de ida para completar la cotización." : "Elige el tren de retorno para completar la cotización.");
      return;
    }

    const price = this.convertMoney(Number(train.pricePerPerson || 0), train.currency || "USD", this.quoteCurrency);

    this.setText(titleId, `${train.company || ""} - ${train.serviceName || ""}`);
    this.setText(
      metaId,
      `${train.departureTime || "--:--"} a ${train.arrivalTime || "--:--"} · ${this.formatCurrency(price, this.quoteCurrency)} por persona`
    );
  }

  openTrainSelectionModal(direction) {
    if (!this.selectedPackage?.trainSelection) return;

    const modal = document.getElementById("trainSelectionModal");
    const title = document.getElementById("trainModalTitle");
    const subtitle = document.getElementById("trainModalSubtitle");
    const list = document.getElementById("trainModalList");

    if (!modal || !title || !subtitle || !list) return;

    this.activeTrainDirection = direction;
    this.pendingTrainCode = direction === "outbound" ? this.selectedOutboundTrainCode : this.selectedReturnTrainCode;

    const routeCode = direction === "outbound"
      ? this.selectedPackage.trainSelection.outboundRoute
      : this.selectedPackage.trainSelection.returnRoute;

    const route = this.trainsData.routes?.[routeCode];
    const options = this.getTrainOptionsForRoute(routeCode);
    const recommendedCode = this.getRecommendedTrainCode(direction, options);
    const recommendedTrain = recommendedCode ? options.find((train) => train.code === recommendedCode) : null;

    title.textContent = direction === "outbound" ? "Elige tren de ida" : "Elige tren de retorno";
    subtitle.textContent = route?.description || "Compara horarios, categorías y precios disponibles.";

    const recommendationBox = recommendedTrain
      ? `
        <div class="quote-train-recommendation">
          <strong>Tren recomendado para este itinerario:</strong>
          <span>${this.escapeHtml(recommendedTrain.company || "")} - ${this.escapeHtml(recommendedTrain.serviceName || "")} · ${this.escapeHtml(recommendedTrain.departureTime || "--:--")}</span>
          <small>Recomendación referencial según la opción de itinerario elegida. Puedes seleccionar otro tren si prefieres.</small>
        </div>
      `
      : "";

    list.innerHTML = options.length
      ? `${recommendationBox}${options.map((train) => this.renderTrainCard(train, direction, recommendedCode)).join("")}`
      : `<div class="quote-empty-state">No hay trenes disponibles para esta nacionalidad.</div>`;

    this.bindTrainSelectionEvents();

    modal.hidden = false;
    document.body.classList.add("quote-modal-open");
  }

  getTrainOptionsForRoute(routeCode) {
    const route = this.trainsData.routes?.[routeCode];
    const options = Array.isArray(route?.options) ? route.options : [];

    return options.filter((train) => {
      const allowed = Array.isArray(train.allowedNationalities) ? train.allowedNationalities : [];
      if (allowed.length && !allowed.includes(this.nationality)) return false;
      if (train.isLocalTrain && this.nationality !== "national") return false;
      return true;
    });
  }

  getRecommendedTrainCode(direction, options = []) {
    if (!Array.isArray(options) || !options.length) return "";

    if (direction === "return") {
      return this.findRecommendedTrainByTime(options, "20:20")?.code || "";
    }

    const itineraryType = this.getSelectedItineraryTrainType();

    if (itineraryType === "valle-conexion") {
      return this.findRecommendedTrainByTime(options, "16:36")?.code || "";
    }

    if (itineraryType === "machu-picchu-full-day") {
      return (
        this.findRecommendedTrainByTime(options, "04:00")?.code ||
        this.findRecommendedTrainByTime(options, "04:30")?.code ||
        this.findEarlyCuscoTrain(options)?.code ||
        ""
      );
    }

    return options.find((train) => train.isRecommended && !train.isLocalTrain)?.code || "";
  }

  findRecommendedTrainByTime(options, targetTime) {
    const target = this.timeToMinutes(targetTime);
    if (target === null) return null;

    let best = null;
    let bestDiff = Infinity;

    options.forEach((train) => {
      const departure = this.timeToMinutes(train.departureTime);
      if (departure === null) return;

      const isIncaRail = String(train.company || "").toLowerCase().includes("inca");
      const diff = Math.abs(departure - target);

      if (isIncaRail && diff < bestDiff) {
        best = train;
        bestDiff = diff;
      }
    });

    return best || null;
  }

  findEarlyCuscoTrain(options) {
    return options
      .filter((train) => {
        const company = String(train.company || "").toLowerCase();
        const origin = String(train.origin || "").toLowerCase();
        const departure = this.timeToMinutes(train.departureTime);

        return company.includes("inca") && origin.includes("cusco") && departure !== null && departure <= this.timeToMinutes("05:00");
      })
      .sort((a, b) => this.timeToMinutes(a.departureTime) - this.timeToMinutes(b.departureTime))[0] || null;
  }

  getSelectedItineraryTrainType() {
    const option = this.selectedItineraryOption;
    if (!option) return "";

    const text = `${option.code || ""} ${option.label || ""} ${option.summary || ""} ${(option.itinerary || []).map((item) => `${item.title || ""} ${item.description || ""}`).join(" ")}`.toLowerCase();

    if (
      text.includes("valle conexión") ||
      text.includes("valle conexion") ||
      text.includes("valle sagrado conexión") ||
      text.includes("valle sagrado conexion") ||
      text.includes("ollantaytambo") ||
      text.includes("conexión")
    ) {
      return "valle-conexion";
    }

    if (
      text.includes("full day machu picchu") ||
      text.includes("machu picchu full day") ||
      text.includes("machu picchu en un día") ||
      text.includes("machu picchu en un dia")
    ) {
      return "machu-picchu-full-day";
    }

    return "";
  }

  getRecommendedTrainHintForItinerary(option) {
    const text = `${option.code || ""} ${option.label || ""} ${option.summary || ""} ${(option.itinerary || []).map((item) => `${item.title || ""} ${item.description || ""}`).join(" ")}`.toLowerCase();

    if (
      text.includes("valle conexión") ||
      text.includes("valle conexion") ||
      text.includes("valle sagrado conexión") ||
      text.includes("valle sagrado conexion") ||
      text.includes("ollantaytambo")
    ) {
      return "Tren sugerido: ida aproximada 16:36 desde Ollantaytambo y retorno 20:20.";
    }

    if (
      text.includes("full day machu picchu") ||
      text.includes("machu picchu full day") ||
      text.includes("machu picchu en un día") ||
      text.includes("machu picchu en un dia")
    ) {
      return "Tren sugerido: ida muy temprano desde Cusco y retorno aproximado 20:20.";
    }

    return "";
  }

  renderTrainCard(train, direction, recommendedCode = "") {
    const category = this.trainsData.trainCategories?.[train.categoryCode] || {};
    const price = this.convertMoney(Number(train.pricePerPerson || 0), train.currency || "USD", this.quoteCurrency);
    const regular = Number(train.regularPricePerPerson || 0) > 0
      ? this.convertMoney(Number(train.regularPricePerPerson), train.currency || "USD", this.quoteCurrency)
      : 0;

    const isSelected = this.pendingTrainCode === train.code;
    const isRecommended = recommendedCode && train.code === recommendedCode;

    return `
      <article class="quote-train-card ${isSelected ? "is-selected" : ""} ${isRecommended ? "is-recommended" : ""}" data-train-code="${this.escapeHtml(train.code)}" data-direction="${direction}">
        ${isRecommended ? `<div class="quote-train-recommended-badge">Recomendado para tu itinerario</div>` : ""}

        <div class="quote-train-card__body">
          <div class="quote-train-service">
            ${this.escapeHtml(train.company || "")}
            <small>${this.escapeHtml(category.label || train.serviceName || "Tren")}</small>
          </div>

          <div class="quote-train-time">
            <strong>${this.escapeHtml(train.departureTime || "--:--")}</strong>
            <span>${this.escapeHtml(train.origin || "Origen por confirmar")}</span>
          </div>

          <div class="quote-train-middle">
            <div class="quote-train-duration">${this.escapeHtml(train.duration || "Sujeto a disponibilidad")}</div>
            <small>${this.escapeHtml(train.transferInfo || train.routeType || "")}</small>
          </div>

          <div class="quote-train-time">
            <strong>${this.escapeHtml(train.arrivalTime || "--:--")}</strong>
            <span>${this.escapeHtml(train.destination || "Destino por confirmar")}</span>
          </div>

          <div class="quote-train-price">
            <small>Por persona</small>
            <strong>${this.formatCurrency(price, this.quoteCurrency)}</strong>
            ${regular > price ? `<del>${this.formatCurrency(regular, this.quoteCurrency)}</del>` : ""}
            <div class="quote-train-actions">
              <button type="button" class="quote-small-btn view-train-details-btn">Detalles</button>
            </div>
          </div>
        </div>

        ${train.isLocalTrain ? `
          <div class="quote-local-warning">
            ${this.escapeHtml(train.warning || category.importantMessage || "Tren local sujeto a disponibilidad presencial.")}
          </div>
        ` : ""}
      </article>
    `;
  }

  bindTrainSelectionEvents() {
    document.querySelectorAll("#trainModalList .quote-train-card").forEach((card) => {
      const trainCode = card.dataset.trainCode;

      card.addEventListener("click", () => {
        this.pendingTrainCode = trainCode;
        document.querySelectorAll("#trainModalList .quote-train-card").forEach((item) => {
          item.classList.toggle("is-selected", item.dataset.trainCode === trainCode);
        });
      });

      card.querySelector(".view-train-details-btn")?.addEventListener("click", (event) => {
        event.stopPropagation();
        this.openTrainDetailsModal(trainCode);
      });
    });
  }

  bindTrainSelectionModalEvents() {
    const modal = document.getElementById("trainSelectionModal");
    const closeBtn = document.getElementById("closeTrainModalBtn");
    const confirmBtn = document.getElementById("confirmTrainModalBtn");

    closeBtn?.addEventListener("click", () => this.closeTrainSelectionModal());
    confirmBtn?.addEventListener("click", () => this.confirmTrainSelection());

    modal?.querySelectorAll("[data-close-train-modal]").forEach((el) => {
      el.addEventListener("click", () => this.closeTrainSelectionModal());
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal && !modal.hidden) this.closeTrainSelectionModal();
    });
  }

  confirmTrainSelection() {
    if (!this.pendingTrainCode || !this.activeTrainDirection) return;

    if (this.activeTrainDirection === "outbound") this.selectedOutboundTrainCode = this.pendingTrainCode;
    if (this.activeTrainDirection === "return") this.selectedReturnTrainCode = this.pendingTrainCode;

    this.renderTrainSelectors();
    this.updatePricing();
    this.updatePrintQuotation();
    this.closeTrainSelectionModal();
  }

  closeTrainSelectionModal() {
    const modal = document.getElementById("trainSelectionModal");
    if (!modal) return;

    modal.hidden = true;
    document.body.classList.remove("quote-modal-open");
    this.activeTrainDirection = null;
    this.pendingTrainCode = "";
  }

  openTrainDetailsModal(trainCode) {
    const train = this.findTrainByCode(trainCode);
    if (!train) return;

    const category = this.trainsData.trainCategories?.[train.categoryCode] || {};
    const modal = document.getElementById("trainDetailsModal");
    const title = document.getElementById("trainDetailsModalTitle");
    const subtitle = document.getElementById("trainDetailsModalSubtitle");
    const content = document.getElementById("trainDetailsModalContent");

    if (!modal || !title || !subtitle || !content) return;

    title.textContent = category.label || train.serviceName || "Tren";
    subtitle.textContent = `${train.company || ""} · ${train.serviceName || ""}`;

    content.innerHTML = `
      <p><strong>Descripción:</strong> ${this.escapeHtml(category.shortDescription || "Servicio de tren turístico.")}</p>
      <p><strong>Ruta:</strong> ${this.escapeHtml(train.origin || "")} → ${this.escapeHtml(train.destination || "")}</p>
      <p><strong>Horario:</strong> ${this.escapeHtml(train.departureTime || "--:--")} - ${this.escapeHtml(train.arrivalTime || "--:--")}</p>
      <p><strong>Duración:</strong> ${this.escapeHtml(train.duration || "Sujeto a disponibilidad")}</p>
      ${train.isLocalTrain && category.importantMessage ? `
        <p><strong>Importante:</strong> ${this.escapeHtml(category.importantMessage)}</p>
        ${Array.isArray(category.purchaseRequirements) ? `
          <ul>
            ${category.purchaseRequirements.map((item) => `<li>${this.escapeHtml(item)}</li>`).join("")}
          </ul>
        ` : ""}
      ` : ""}
    `;

    modal.hidden = false;
  }

  bindTrainDetailsModalEvents() {
    const modal = document.getElementById("trainDetailsModal");
    const closeBtn = document.getElementById("closeTrainDetailsModalBtn");
    const cancelBtn = document.getElementById("cancelTrainDetailsModalBtn");

    closeBtn?.addEventListener("click", () => this.closeTrainDetailsModal());
    cancelBtn?.addEventListener("click", () => this.closeTrainDetailsModal());

    modal?.querySelectorAll("[data-close-train-details-modal]").forEach((el) => {
      el.addEventListener("click", () => this.closeTrainDetailsModal());
    });
  }

  closeTrainDetailsModal() {
    const modal = document.getElementById("trainDetailsModal");
    if (!modal) return;

    modal.hidden = true;

    const trainSelectionModal = document.getElementById("trainSelectionModal");
    if (!trainSelectionModal || trainSelectionModal.hidden) {
      document.body.classList.remove("quote-modal-open");
    }
  }

  renderExtras() {
    const section = document.getElementById("extrasSection");
    const target = document.getElementById("extrasContainer");

    if (!section || !target) return;

    const extras = this.selectedPackage?.extras || [];

    if (!extras.length) {
      section.hidden = true;
      target.innerHTML = "";
      return;
    }

    section.hidden = false;

    target.innerHTML = extras.map((extra) => {
      const price = this.convertMoney(Number(extra.price || 0), extra.currency || this.selectedPackage.currency || "PEN", this.quoteCurrency);
      const isChecked = this.selectedExtras.has(extra.code);

      return `
        <label class="quote-extra-item ${isChecked ? "is-selected" : ""}" for="extra-${this.escapeHtml(extra.code)}">
          <input type="checkbox" id="extra-${this.escapeHtml(extra.code)}" data-extra-code="${this.escapeHtml(extra.code)}" ${isChecked ? "checked" : ""} />
          <div>
            <strong>${this.escapeHtml(extra.label)}</strong>
            <p>${extra.perPerson ? "Por persona" : "Por reserva"} · ${this.formatCurrency(price, this.quoteCurrency)}</p>
          </div>
        </label>
      `;
    }).join("");

    target.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const code = checkbox.dataset.extraCode;
        if (checkbox.checked) this.selectedExtras.add(code);
        else this.selectedExtras.delete(code);

        this.renderExtras();
        this.updatePricing();
        this.updatePrintQuotation();
      });
    });
  }

  applyManualDiscountCode() {
    const input = document.getElementById("discountCodeInput");
    const rawCode = input?.value?.trim().toUpperCase() || "";

    if (!rawCode) {
      this.clearAppliedDiscountCode(false);
      this.setDiscountCodeMessage("Ingresa un código de descuento.", "error");
      this.updatePricing();
      this.updatePrintQuotation();
      return;
    }

    const found = this.discountCodes.find((item) => {
      return String(item.code || "").toUpperCase() === rawCode;
    });

    if (!found || found.active !== true) {
      this.appliedDiscountCode = null;
      this.setDiscountCodeMessage("Código inválido, vencido o no disponible.", "error");
      this.updatePricing();
      this.updatePrintQuotation();
      return;
    }

    const type = String(found.type || "").toLowerCase();
    const value = Number(found.value || 0);

    if (!["percent", "fixed"].includes(type) || value <= 0) {
      this.appliedDiscountCode = null;
      this.setDiscountCodeMessage("Este código no tiene una configuración válida.", "error");
      this.updatePricing();
      this.updatePrintQuotation();
      return;
    }

    this.appliedDiscountCode = {
      code: String(found.code || "").toUpperCase(),
      type,
      value,
      currency: found.currency || "USD",
      label: found.label || "Descuento aplicado"
    };

    this.setDiscountCodeMessage(`${this.appliedDiscountCode.label} aplicado correctamente.`, "success");
    this.updatePricing();
    this.updatePrintQuotation();
  }

  clearAppliedDiscountCode(clearInput = true) {
    this.appliedDiscountCode = null;

    if (clearInput) {
      const input = document.getElementById("discountCodeInput");
      if (input) input.value = "";
    }

    this.setDiscountCodeMessage("Ingresa tu código promocional si tienes uno.", "");
  }

  setDiscountCodeMessage(message, type) {
    const el = document.getElementById("discountCodeMessage");
    if (!el) return;

    el.textContent = message;
    el.classList.remove("is-success", "is-error");

    if (type === "success") el.classList.add("is-success");
    if (type === "error") el.classList.add("is-error");
  }

  calculateAppliedManualDiscount(subtotalAfterPaymentDiscount) {
    if (!this.appliedDiscountCode || subtotalAfterPaymentDiscount <= 0) return 0;

    if (this.appliedDiscountCode.type === "percent") {
      return subtotalAfterPaymentDiscount * (Number(this.appliedDiscountCode.value || 0) / 100);
    }

    if (this.appliedDiscountCode.type === "fixed") {
      return this.convertMoney(
        Number(this.appliedDiscountCode.value || 0),
        this.appliedDiscountCode.currency || "USD",
        this.quoteCurrency
      );
    }

    return 0;
  }

  /**
   * Actualiza todos los precios en el sidebar y las filas de pasajeros (adultos/niños)
   */
  updatePricing() {
    const summary = this.calculateQuote();

    this.setText("basePackageTotal", summary.basePackageFormatted);
    this.setText("childrenTotal", summary.childrenFormatted);
    this.setText("hotelsTotal", summary.hotelsFormatted);
    this.setText("trainsTotal", summary.trainsFormatted);
    this.setText("extrasTotal", summary.extrasFormatted);
    this.setText("quoteSubtotal", summary.subtotalFormatted);
    this.setText("discountTotal", `- ${summary.discountFormatted}`);
    this.setText("quoteTotal", summary.totalFormatted);
    this.setText("advanceTotal", summary.advanceFormatted);
    this.setText("balanceTotal", summary.balanceFormatted);

    const discountLabel = document.querySelector("#discountSummaryRow span");
    if (discountLabel) {
      discountLabel.textContent = summary.manualDiscount > 0 ? "Descuentos aplicados" : "Descuento pago total";
    }

    // Mostrar/ocultar líneas monetarias según corresponda
    this.toggleRow("childrenSummaryRow", this.children > 0);
    this.toggleRow("hotelSummaryRow", summary.hotelsTotal > 0);
    this.toggleRow("trainSummaryRow", summary.trainsTotal > 0);
    this.toggleRow("extrasSummaryRow", summary.extrasTotal > 0);
    this.toggleRow("discountSummaryRow", summary.discount > 0);
    this.toggleRow("advanceSummaryRow", this.paymentMode === "partial");
    this.toggleRow("balanceSummaryRow", this.paymentMode === "partial");

    // ---------- NUEVO: Mostrar cantidad de adultos y niños ----------
    this.updatePassengerDetailsRow();

    const paymentInfo = document.getElementById("paymentInfo");
    if (paymentInfo) {
      if (!this.selectedPackage) {
        paymentInfo.textContent = "Selecciona fechas para detectar el paquete y generar la cotización.";
      } else {
        const parts = [];

        if (this.paymentMode === "full") {
          parts.push(`Pago 100%: se aplica ${summary.fullDiscountPercent}% de descuento sobre el subtotal.`);
        } else {
          parts.push(`Anticipo: se paga el ${summary.partialPaymentPercent}% del total. No aplica descuento por pago total.`);
        }

        if (summary.manualDiscount > 0 && this.appliedDiscountCode) {
          parts.push(`Código ${this.appliedDiscountCode.code}: ${summary.manualDiscountFormatted} de descuento adicional.`);
        }

        paymentInfo.textContent = parts.join(" ");
      }
    }
  }

  /**
   * Crea o actualiza las filas dinámicas que muestran la cantidad de adultos y niños
   * dentro del contenedor .quote-summary, justo después de la línea de paquete base.
   */
  updatePassengerDetailsRow() {
    const summaryContainer = document.querySelector(".quote-summary");
    if (!summaryContainer) return;

    // Eliminar filas existentes para no duplicar (si ya existen)
    const existingAdultsRow = document.getElementById("adultsDetailRow");
    const existingChildrenRow = document.getElementById("childrenDetailRow");
    if (existingAdultsRow) existingAdultsRow.remove();
    if (existingChildrenRow) existingChildrenRow.remove();

    // Buscar la fila de "Paquete base" para insertar después
    const basePackageLine = document.getElementById("basePackageTotal")?.closest(".quote-summary__line");
    if (!basePackageLine) return;

    // Crear fila de adultos
    const adultsRow = document.createElement("div");
    adultsRow.id = "adultsDetailRow";
    adultsRow.className = "quote-summary__line";
    adultsRow.style.fontSize = "0.9rem";
    adultsRow.style.paddingTop = "4px";
    adultsRow.innerHTML = `
      <span>Adultos (${this.adults})</span>
      <strong>${this.formatCurrency(0, this.quoteCurrency)}</strong>
    `;
    // El precio ya está incluido en el total, aquí solo mostramos la cantidad
    // pero mantenemos un formato consistente

    // Insertar después de la línea de paquete base
    basePackageLine.insertAdjacentElement("afterend", adultsRow);

    // Si hay niños, crear fila para niños
    if (this.children > 0) {
      const childrenRow = document.createElement("div");
      childrenRow.id = "childrenDetailRow";
      childrenRow.className = "quote-summary__line";
      childrenRow.style.fontSize = "0.9rem";
      childrenRow.style.paddingTop = "4px";
      childrenRow.innerHTML = `
        <span>Niños (${this.children})</span>
        <strong>${this.formatCurrency(0, this.quoteCurrency)}</strong>
      `;
      adultsRow.insertAdjacentElement("afterend", childrenRow);
    }
  }

  calculateQuote() {
    const currency = this.quoteCurrency;
    const fullDiscountPercent = Number(this.packagesData.paymentOptions?.fullPaymentDiscountPercent || 5);
    const partialPaymentPercent = Number(this.packagesData.paymentOptions?.partialPaymentPercent || 30);

    if (!this.selectedPackage) {
      return this.emptySummary(currency, fullDiscountPercent, partialPaymentPercent);
    }

    const pricing = this.getBasePricingForPackage(this.selectedPackage);

    const adultBase = this.convertMoney(Number(pricing.adult || 0), pricing.currency, currency);
    const childBase = this.convertMoney(Number(pricing.child || pricing.adult || 0), pricing.currency, currency);

    const adultsTotal = adultBase * this.adults;
    const childrenTotal = childBase * this.children;
    const basePackageTotal = adultsTotal + childrenTotal;
    const hotelsTotal = this.calculateAccommodationTotal();
    const trainsTotal = this.calculateTrainTotal();
    const extrasTotal = this.calculateExtrasTotal();

    const subtotal = basePackageTotal + hotelsTotal + trainsTotal + extrasTotal;
    const paymentDiscount = this.paymentMode === "full" ? subtotal * (fullDiscountPercent / 100) : 0;
    const subtotalAfterPaymentDiscount = Math.max(0, subtotal - paymentDiscount);
    const manualDiscountRaw = this.calculateAppliedManualDiscount(subtotalAfterPaymentDiscount);
    const manualDiscount = Math.min(manualDiscountRaw, subtotalAfterPaymentDiscount);
    const discount = paymentDiscount + manualDiscount;
    const total = Math.max(0, subtotal - discount);
    const advance = this.paymentMode === "partial" ? total * (partialPaymentPercent / 100) : total;
    const balance = this.paymentMode === "partial" ? total - advance : 0;

    return {
      currency,
      adultBase,
      childBase,
      adultsTotal,
      childrenTotal,
      basePackageTotal,
      hotelsTotal,
      trainsTotal,
      extrasTotal,
      subtotal,
      paymentDiscount,
      manualDiscount,
      discount,
      total,
      advance,
      balance,
      fullDiscountPercent,
      partialPaymentPercent,
      basePackageFormatted: this.formatCurrency(basePackageTotal, currency),
      childrenFormatted: this.formatCurrency(childrenTotal, currency),
      hotelsFormatted: this.formatCurrency(hotelsTotal, currency),
      trainsFormatted: this.formatCurrency(trainsTotal, currency),
      extrasFormatted: this.formatCurrency(extrasTotal, currency),
      subtotalFormatted: this.formatCurrency(subtotal, currency),
      paymentDiscountFormatted: this.formatCurrency(paymentDiscount, currency),
      manualDiscountFormatted: this.formatCurrency(manualDiscount, currency),
      discountFormatted: this.formatCurrency(discount, currency),
      totalFormatted: this.formatCurrency(total, currency),
      advanceFormatted: this.formatCurrency(advance, currency),
      balanceFormatted: this.formatCurrency(balance, currency)
    };
  }

  emptySummary(currency, fullDiscountPercent, partialPaymentPercent) {
    return {
      currency,
      adultBase: 0,
      childBase: 0,
      adultsTotal: 0,
      childrenTotal: 0,
      basePackageTotal: 0,
      hotelsTotal: 0,
      trainsTotal: 0,
      extrasTotal: 0,
      subtotal: 0,
      paymentDiscount: 0,
      manualDiscount: 0,
      discount: 0,
      total: 0,
      advance: 0,
      balance: 0,
      fullDiscountPercent,
      partialPaymentPercent,
      basePackageFormatted: this.formatCurrency(0, currency),
      childrenFormatted: this.formatCurrency(0, currency),
      hotelsFormatted: this.formatCurrency(0, currency),
      trainsFormatted: this.formatCurrency(0, currency),
      extrasFormatted: this.formatCurrency(0, currency),
      subtotalFormatted: this.formatCurrency(0, currency),
      paymentDiscountFormatted: this.formatCurrency(0, currency),
      manualDiscountFormatted: this.formatCurrency(0, currency),
      discountFormatted: this.formatCurrency(0, currency),
      totalFormatted: this.formatCurrency(0, currency),
      advanceFormatted: this.formatCurrency(0, currency),
      balanceFormatted: this.formatCurrency(0, currency)
    };
  }

  getBasePricingForPackage(pkg) {
    const byNationality = pkg?.basePricingByNationality?.[this.nationality];

    if (byNationality) {
      return {
        adult: Number(byNationality.adult || 0),
        child: Number(byNationality.child || byNationality.adult || 0),
        currency: byNationality.currency || "PEN"
      };
    }

    return {
      adult: Number(pkg?.basePricing?.adult || 0),
      child: Number(pkg?.basePricing?.child || pkg?.basePricing?.adult || 0),
      currency: pkg?.currency || "PEN"
    };
  }

  calculateAccommodationTotal() {
    if (!this.selectedPackage) return 0;

    return this.getAccommodationSummary().reduce((sum, item) => {
      const hotelCode = this.selectedHotelsByDestination[item.destination];
      const combo = this.selectedCombinationsByDestination[item.destination];

      if (!hotelCode || hotelCode === "no-hotel" || !combo) return sum;

      return sum + this.convertMoney(Number(combo.totalForStay || 0), "USD", this.quoteCurrency);
    }, 0);
  }

  calculateAccommodationAdditional(destination) {
    const hotelCode = this.selectedHotelsByDestination[destination];
    const combo = this.selectedCombinationsByDestination[destination];

    if (!hotelCode || hotelCode === "no-hotel" || !combo) return 0;

    return this.convertMoney(Number(combo.totalForStay || 0), "USD", this.quoteCurrency);
  }

  calculateTrainTotal() {
    const outbound = this.findTrainByCode(this.selectedOutboundTrainCode);
    const returned = this.findTrainByCode(this.selectedReturnTrainCode);
    const passengers = this.getTotalPassengers();

    const outboundTotal = outbound
      ? this.convertMoney(Number(outbound.pricePerPerson || 0), outbound.currency || "USD", this.quoteCurrency) * passengers
      : 0;

    const returnTotal = returned
      ? this.convertMoney(Number(returned.pricePerPerson || 0), returned.currency || "USD", this.quoteCurrency) * passengers
      : 0;

    return outboundTotal + returnTotal;
  }

  calculateExtrasTotal() {
    const extras = this.selectedPackage?.extras || [];
    const passengers = this.getTotalPassengers();

    return extras.reduce((sum, extra) => {
      if (!this.selectedExtras.has(extra.code)) return sum;

      const price = this.convertMoney(
        Number(extra.price || 0),
        extra.currency || this.selectedPackage.currency || "PEN",
        this.quoteCurrency
      );

      return sum + (extra.perPerson ? price * passengers : price);
    }, 0);
  }

  updatePrintQuotation() {
    const summary = this.calculateQuote();
    const packageTitle = this.selectedPackage?.title || "Paquete no seleccionado";
    const packageDescription = this.selectedPackage?.description || "Selecciona un paquete para completar esta sección.";
    const itinerary = this.selectedItineraryOption?.itinerary || [];

    this.setText("printReference", this.quoteReference);
    this.setText("printIssueDate", this.formatDateDisplay(new Date()));
    this.setText("printValidUntil", this.formatDateDisplay(this.addBusinessDaysSkippingSunday(new Date(), 3)));

    this.setText("printCouponCode", this.printCoupon.code);
    this.setText("printCouponDiscount", `${this.printCoupon.discountPercent}%`);
    this.setText("printCouponValidUntil", this.formatDateDisplay(this.printCoupon.validUntil));

    this.setText("printClientName", this.valueOrDefault("clientName"));
    this.setText("printClientPhone", this.valueOrDefault("clientPhone"));
    this.setText("printClientEmail", this.valueOrDefault("clientEmail"));
    this.setText("printClientDocument", this.valueOrDefault("clientDocument"));

    this.setText("printTravelDates", this.travelStartDate && this.travelEndDate ? `${this.travelStartDate} al ${this.travelEndDate}` : "Por completar");
    this.setText("printDuration", this.travelDays ? `${this.travelDays} días / ${this.travelNights} noches` : "Por completar");
    this.setText("printArrivalTime", this.arrivalTime ? this.formatTimeForDisplay(this.arrivalTime) : "No indicado");
    this.setText("printDepartureTime", this.departureTime ? this.formatTimeForDisplay(this.departureTime) : "No indicado");
    this.setText("printTravelers", `${this.adults} adulto${this.adults !== 1 ? "s" : ""}${this.children > 0 ? `, ${this.children} niño${this.children !== 1 ? "s" : ""}` : ""}`);
    this.setText("printNationality", this.getNationalityLabel(this.nationality));

    this.setText("printPackageTitle", packageTitle);
    this.setText("printPackageDescription", packageDescription);
    this.setText("printItineraryOption", this.selectedItineraryOption?.label || "Por completar");

    const itineraryList = document.getElementById("printItineraryList");
    if (itineraryList) {
      itineraryList.innerHTML = itinerary.length
        ? itinerary.map((item) => `
          <div class="print-itinerary-item">
            <strong>${this.escapeHtml(item.title || "")}</strong>
            <span>${this.escapeHtml(item.description || "")}</span>
          </div>
        `).join("")
        : "Por completar";
    }

    this.setText("printHotels", this.getHotelsPrintText());
    this.setText("printOutboundTrain", this.getTrainPrintText(this.selectedOutboundTrainCode));
    this.setText("printReturnTrain", this.getTrainPrintText(this.selectedReturnTrainCode));
    this.setText("printExtras", this.getExtrasPrintText());

    this.setText("printBaseTotal", summary.basePackageFormatted);
    this.setText("printHotelsTotal", summary.hotelsFormatted);
    this.setText("printTrainsTotal", summary.trainsFormatted);
    this.setText("printExtrasTotal", summary.extrasFormatted);
    this.setText("printSubtotal", summary.subtotalFormatted);
    this.setText("printDiscount", `- ${summary.discountFormatted}`);
    this.setText("printTotal", summary.totalFormatted);
    this.setText("printPaymentMode", this.paymentMode === "full" ? "Pago 100% con descuento" : "Anticipo sin descuento");
    this.setText("printAdvance", summary.advanceFormatted);
    this.setText("printBalance", summary.balanceFormatted);

    const appliedText = this.appliedDiscountCode
      ? `${this.appliedDiscountCode.code} - ${this.appliedDiscountCode.label}`
      : "Ninguno";

    this.setText("printAppliedDiscount", appliedText);
  }

  saveQuotationAsPdf() {
    this.updatePrintQuotation();

    const element = document.getElementById("printQuotation");
    const sheet = document.querySelector("#printQuotation .print-sheet");

    if (!element || !sheet || typeof html2pdf === "undefined") {
      window.print();
      return;
    }

    const previousDisplay = element.style.display;
    element.style.display = "block";

    const fileName = `${this.quoteReference || "cotizacion-my-cusco-trip"}.pdf`;

    const options = {
      margin: 8,
      filename: fileName,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait"
      }
    };

    html2pdf()
      .set(options)
      .from(sheet)
      .save()
      .finally(() => {
        element.style.display = previousDisplay;
      });
  }

  continueToPayment() {
    const summary = this.calculateQuote();

    if (!this.selectedPackage) {
      alert("Selecciona tus fechas para detectar el paquete antes de continuar al pago.");
      return;
    }

    if (!this.selectedOutboundTrainCode || !this.selectedReturnTrainCode) {
      alert("Selecciona el tren de ida y retorno antes de continuar al pago.");
      return;
    }

    const paymentData = {
      quoteReference: this.quoteReference,
      gateway: this.quoteCurrency === "USD" ? "paypal" : "mercado_pago",
      currency: this.quoteCurrency,
      amount: summary.total,
      amountFormatted: summary.totalFormatted,
      paymentMode: this.paymentMode,
      packageId: this.selectedPackage.id,
      packageTitle: this.selectedPackage.title,
      itineraryCode: this.selectedItineraryOption?.code || "",
      client: {
        name: document.getElementById("clientName")?.value.trim() || "",
        phone: document.getElementById("clientPhone")?.value.trim() || "",
        email: document.getElementById("clientEmail")?.value.trim() || "",
        document: document.getElementById("clientDocument")?.value.trim() || ""
      }
    };

    sessionStorage.setItem("myCuscoTripPendingPayment", JSON.stringify(paymentData));

    if (this.quoteCurrency === "USD") {
      alert("Siguiente paso: conectar PayPal para pagos en dólares. La cotización ya quedó preparada.");
      return;
    }

    alert("Siguiente paso: conectar Mercado Pago para pagos en soles. La cotización ya quedó preparada.");
  }

  getHotelsPrintText() {
    const summary = this.getAccommodationSummary();
    if (!summary.length) return "No aplica";

    const parts = summary.map((item) => {
      const selection = this.getSelectedAccommodationForDestination(item.destination);

      if (!selection?.hotel || selection.hotel.hotelCode === "no-hotel") {
        return `${this.getDestinationLabel(item.destination)}: Sin alojamiento`;
      }

      return `${this.getDestinationLabel(item.destination)}: ${selection.hotel.hotelName} - ${selection.combination?.label || "Acomodación por confirmar"} (${item.nights} noche${item.nights !== 1 ? "s" : ""})`;
    });

    return parts.join(" | ");
  }

  getTrainPrintText(trainCode) {
    const train = this.findTrainByCode(trainCode);
    if (!train) return "Por completar";

    return `${train.company} - ${train.serviceName} | ${train.departureTime || "--:--"} a ${train.arrivalTime || "--:--"} | ${train.origin || ""} → ${train.destination || ""}`;
  }

  getExtrasPrintText() {
    const extras = this.selectedPackage?.extras || [];
    const selected = extras.filter((extra) => this.selectedExtras.has(extra.code));

    if (!selected.length) return "Ninguno";
    return selected.map((extra) => extra.label).join(", ");
  }

  getAccommodationSummary() {
    return Array.isArray(this.selectedPackage?.accommodationSummary)
      ? this.selectedPackage.accommodationSummary
      : [];
  }

  getHotelsByDestination(destination) {
    return this.hotelsData?.destinations?.[destination]?.hotels || [];
  }

  getHotelByCode(destination, hotelCode) {
    return this.getHotelsByDestination(destination).find((hotel) => hotel.hotelCode === hotelCode) || null;
  }

  getDestinationLabel(destination) {
    return this.hotelsData?.destinations?.[destination]?.label || this.titleCase(String(destination || "").replaceAll("-", " "));
  }

  getSelectedAccommodationForDestination(destination) {
    const hotelCode = this.selectedHotelsByDestination[destination];

    let hotel = null;
    if (hotelCode === "no-hotel") hotel = this.getNoHotelOption(destination);
    else hotel = this.getHotelByCode(destination, hotelCode);

    const combination = this.selectedCombinationsByDestination[destination] || null;
    return { hotel, combination };
  }

  getNoHotelOption(destination) {
    return {
      hotelCode: "no-hotel",
      hotelName: "Opción sin alojamiento",
      stars: 0,
      location: this.getDestinationLabel(destination),
      address: "",
      summary: "El cliente gestionará su alojamiento por cuenta propia.",
      features: ["Sin costo de alojamiento", "Alojamiento por cuenta del cliente"],
      images: { cover: "", gallery: [] },
      amenities: {},
      rooms: [
        {
          roomType: "no-hotel",
          label: "Sin alojamiento",
          bedType: "No incluye alojamiento",
          capacity: Math.max(this.getTotalPassengers(), 1),
          pricePerNight: 0
        }
      ]
    };
  }

  generateAccommodationCombinations(rooms, passengers, nights) {
    const defs = (Array.isArray(rooms) ? rooms : [])
      .map((room) => ({
        roomType: String(room.roomType || ""),
        label: room.label || room.roomType || "Habitación",
        bedType: room.bedType || "",
        capacity: Number(room.capacity || 0),
        pricePerNight: Number(room.pricePerNight || 0),
        helperText: room.helperText || ""
      }))
      .filter((room) => room.capacity > 0 && room.pricePerNight >= 0)
      .sort((a, b) => a.capacity - b.capacity || a.pricePerNight - b.pricePerNight);

    if (!defs.length || passengers <= 0) return [];

    const results = [];
    const seen = new Set();

    const backtrack = (index, remaining, counts) => {
      if (index === defs.length) {
        if (remaining === 0) {
          const used = counts
            .map((count, i) => ({ room: defs[i], count }))
            .filter((entry) => entry.count > 0);

          if (!used.length) return;

          const key = used.map((entry) => `${entry.room.roomType}:${entry.count}`).join("|");
          if (seen.has(key)) return;

          seen.add(key);

          const totalRooms = used.reduce((sum, entry) => sum + entry.count, 0);
          const totalPerNight = used.reduce((sum, entry) => sum + (entry.room.pricePerNight * entry.count), 0);
          const totalForStay = totalPerNight * Number(nights || 0);

          results.push({
            key,
            rooms: used.map((entry) => ({
              roomType: entry.room.roomType,
              label: entry.room.label,
              bedType: entry.room.bedType,
              capacity: entry.room.capacity,
              pricePerNight: entry.room.pricePerNight,
              count: entry.count
            })),
            totalRooms,
            totalPerNight,
            totalForStay,
            additionalPerPerson: passengers > 0 ? totalForStay / passengers : 0,
            label: this.buildCombinationLabel(used)
          });
        }
        return;
      }

      const room = defs[index];
      const maxCount = Math.ceil(remaining / room.capacity);

      for (let count = 0; count <= maxCount; count += 1) {
        const covered = count * room.capacity;
        if (covered > remaining) break;

        counts[index] = count;
        backtrack(index + 1, remaining - covered, counts);
      }

      counts[index] = 0;
    };

    backtrack(0, passengers, new Array(defs.length).fill(0));

    return results.sort((a, b) => {
      if (a.totalForStay !== b.totalForStay) return a.totalForStay - b.totalForStay;
      if (a.totalRooms !== b.totalRooms) return a.totalRooms - b.totalRooms;
      return a.label.localeCompare(b.label, "es");
    });
  }

  buildCombinationLabel(usedRooms) {
    return usedRooms.map((entry) => {
      if (entry.room.roomType === "no-hotel") return entry.room.label;
      return `${entry.count} ${entry.room.label}${entry.count > 1 ? "s" : ""}`;
    }).join(" + ");
  }

  findTrainByCode(code) {
    if (!code) return null;

    const allRoutes = Object.values(this.trainsData.routes || {});
    for (const route of allRoutes) {
      const found = (route.options || []).find((train) => train.code === code);
      if (found) return found;
    }

    return null;
  }

  getTotalPassengers() {
    return this.adults + this.children;
  }

  timeToMinutes(time) {
    if (!time || typeof time !== "string") return null;

    const match = time.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

    return hours * 60 + minutes;
  }

  formatTimeForDisplay(time) {
    const minutes = this.timeToMinutes(time);
    if (minutes === null) return time || "No indicado";

    const hours24 = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const suffix = hours24 >= 12 ? "p.m." : "a.m.";
    const hours12 = hours24 % 12 || 12;

    return `${hours12}:${String(mins).padStart(2, "0")} ${suffix}`;
  }

  convertMoney(amount, fromCurrency, toCurrency) {
    const value = Number(amount || 0);
    const from = String(fromCurrency || "PEN").toUpperCase();
    const to = String(toCurrency || "PEN").toUpperCase();

    if (from === to) return value;
    if (from === "USD" && to === "PEN") return value * this.exchangeRate;
    if (from === "PEN" && to === "USD") return value / this.exchangeRate;

    return value;
  }

  formatCurrency(amount, currency = this.quoteCurrency) {
    const value = Number(amount || 0);
    if (currency === "USD") return `USD ${value.toFixed(2)}`;
    return `S/ ${value.toFixed(2)}`;
  }

  updatePassengersUI() {
    this.setText("adultsCount", String(this.adults));
    this.setText("childrenCount", String(this.children));
    // Al actualizar la UI de pasajeros también refrescamos las filas de detalle
    this.updatePricing();
  }

  updateReferenceUI() {
    this.setText("quoteReference", this.quoteReference);
  }

  updateExchangeRateHelp() {
    const help = document.getElementById("exchangeRateHelp");
    if (!help) return;

    if (this.nationality !== "national") {
      help.textContent = "Para esta nacionalidad, la cotización se muestra únicamente en dólares americanos.";
      return;
    }

    help.textContent = `Tipo de cambio referencial: 1 USD = S/ ${this.exchangeRate.toFixed(3)}. Se actualiza automáticamente si la fuente online responde.`;
  }

  getNationalityLabel(code) {
    const options = {
      national: "Nacionales peruanos",
      foreign: "Extranjeros",
      andean_community: "Comunidad Andina"
    };

    return options[code] || code || "Por completar";
  }

  getStableQuoteReference() {
    const key = "myCuscoTripQuoteReference";
    const saved = sessionStorage.getItem(key);

    if (saved) return saved;

    const generated = this.generateReference();
    sessionStorage.setItem(key, generated);
    return generated;
  }

  getStablePrintCoupon() {
    const key = "myCuscoTripPrintCoupon";
    const saved = sessionStorage.getItem(key);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          code: parsed.code,
          discountPercent: Number(parsed.discountPercent || 10),
          validUntil: new Date(parsed.validUntil)
        };
      } catch {
        sessionStorage.removeItem(key);
      }
    }

    const discounts = [5, 10, 15, 20];
    const discountPercent = discounts[Math.floor(Math.random() * discounts.length)];
    const validDays = Math.floor(Math.random() * 3) + 3;
    const validUntil = this.addBusinessDaysSkippingSunday(new Date(), validDays);
    const code = `MCT-${discountPercent}-${this.randomCodeSegment(4)}-${this.randomCodeSegment(4)}`;

    const coupon = { code, discountPercent, validUntil };
    sessionStorage.setItem(key, JSON.stringify({
      code,
      discountPercent,
      validUntil: validUntil.toISOString()
    }));

    return coupon;
  }

  randomCodeSegment(length) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let output = "";

    for (let i = 0; i < length; i += 1) {
      output += chars[Math.floor(Math.random() * chars.length)];
    }

    return output;
  }

  addBusinessDaysSkippingSunday(date, days) {
    const copy = new Date(date);
    let added = 0;

    while (added < Number(days || 0)) {
      copy.setDate(copy.getDate() + 1);

      if (copy.getDay() !== 0) {
        added += 1;
      }
    }

    return copy;
  }

  generateReference() {
    const now = new Date();
    const y = String(now.getFullYear()).slice(-2);
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const rand = Math.floor(1000 + Math.random() * 9000);

    return `COT-PE-${y}${m}${d}-${rand}`;
  }

  formatDateInput(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  formatDateDisplay(date) {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

  addDays(date, days) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + Number(days || 0));
    return copy;
  }

  valueOrDefault(id) {
    const value = document.getElementById(id)?.value?.trim();
    return value || "Por completar";
  }

  setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  toggleRow(id, show) {
    const row = document.getElementById(id);
    if (row) row.hidden = !show;
  }

  showSection(id) {
    const section = document.getElementById(id);
    if (section) section.hidden = false;
  }

  hideSection(id) {
    const section = document.getElementById(id);
    if (section) section.hidden = true;
  }

  resolvePath(path) {
    const cleanPath = String(path || "").replace(/^\.?\//, "");
    return `${this.basePath}${cleanPath}`;
  }

  resolveAssetPath(path) {
    const raw = String(path || "");
    if (!raw) return "";
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    return this.resolvePath(raw);
  }

  titleCase(value) {
    return String(value || "").replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
    });
  }

  escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new MyCuscoTripQuotePackages();
});
