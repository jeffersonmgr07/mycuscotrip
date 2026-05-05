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
    this.visibleItineraryOptionsCount = 4;

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
      this.enhanceDomForCurrentHtml();
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
      this.initDesktopQuotePanelFixed();
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

  enhanceDomForCurrentHtml() {
    this.fixTravelFieldLabels();
    this.enhancePrintableTemplate();
    this.ensureMobileSummaryToggle();
    this.addQuoteDetailTitle();
    this.changePdfButtonText();
  }

  fixTravelFieldLabels() {
    const arrivalLabel = document.querySelector('label[for="arrivalTime"]');
    const departureLabel = document.querySelector('label[for="departureTime"]');
    const arrivalHelp = document.getElementById("arrivalTime")?.closest(".quote-field")?.querySelector("small");
    const departureHelp = document.getElementById("departureTime")?.closest(".quote-field")?.querySelector("small");

    if (arrivalLabel) arrivalLabel.textContent = "Hora de llegada";
    if (departureLabel) departureLabel.textContent = "Hora de salida";

    if (arrivalHelp) {
      arrivalHelp.textContent = "Ingresa la hora aproximada de llegada a Cusco para calcular mejor el itinerario.";
    }

    if (departureHelp) {
      departureHelp.textContent = "Ingresa la hora aproximada de salida de Cusco para saber si el último día permite actividades.";
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

    const printHeader = document.querySelector("#printQuotation .print-header");
    if (printHeader) {
      printHeader.classList.add("print-header--two-columns");
    }

    const packageSection = document.getElementById("printPackageTitle")?.closest(".print-section");
    if (packageSection) {
      packageSection.remove();
    }

    const paymentTitle = Array.from(document.querySelectorAll("#printQuotation .print-section h3"))
      .find((title) => title.textContent.trim().toLowerCase().includes("resumen económico"));

    if (paymentTitle) {
      paymentTitle.textContent = "Detalles de pago";
    }

    const baseLabel = document.getElementById("basePackageTotal")?.closest(".quote-summary__line")?.querySelector("span");
    if (baseLabel) {
      baseLabel.textContent = "Itinerario base";
    }

    const couponValidUntil = document.getElementById("printCouponValidUntil")?.closest("small");
    if (couponValidUntil) {
      couponValidUntil.remove();
    }
  }

  addQuoteDetailTitle() {
    const panel = document.querySelector(".quote-summary-panel");
    if (!panel || panel.querySelector(".quote-detail-title")) return;

    const title = document.createElement("h2");
    title.className = "quote-detail-title";
    title.textContent = "Detalle de cotización";
    panel.insertBefore(title, panel.firstChild);
  }

  changePdfButtonText() {
    const pdfBtn = document.getElementById("savePdfBtn");
    if (pdfBtn) {
      const span = pdfBtn.querySelector("span");
      if (span) span.textContent = "Descargar";
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

    const isMobile = window.innerWidth < 768;
    const pickerParent = isMobile ? document.body : input.closest(".quote-field") || document.body;

    flatpickr(input, {
      locale: flatpickr.l10ns.es,
      mode: "range",
      minDate: "today",
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "d M Y",
      appendTo: pickerParent,
      positionElement: input,
      static: !isMobile,
      disableMobile: true,
      onReady: (_, __, instance) => {
        if (instance.altInput) instance.altInput.setAttribute("readonly", "readonly");
      },
      onOpen: () => {
        document.body.classList.add("quote-datepicker-open");
      },
      onClose: () => {
        document.body.classList.remove("quote-datepicker-open");
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
          this.visibleItineraryOptionsCount = 4;
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

    const isMobile = window.innerWidth < 768;

    const createTimePicker = (input, onChange) => {
      if (!input) return;

      flatpickr(input, {
        enableTime: true,
        noCalendar: true,
        dateFormat: "H:i",
        altInput: true,
        altFormat: "h:i K",
        time_24hr: false,
        minuteIncrement: 15,
        allowInput: false,
        disableMobile: true,
        locale: flatpickr.l10ns.es,
        appendTo: isMobile ? document.body : input.closest(".quote-field") || document.body,
        positionElement: input,
        static: !isMobile,
        onChange
      });
    };

    createTimePicker(document.getElementById("arrivalTime"), (_, value) => {
      this.arrivalTime = value || "";
      this.visibleItineraryOptionsCount = 4;
      this.refreshItineraryByTimeRules();
      this.updatePrintQuotation();
    });

    createTimePicker(document.getElementById("departureTime"), (_, value) => {
      this.departureTime = value || "";
      this.visibleItineraryOptionsCount = 4;
      this.refreshItineraryByTimeRules();
      this.updatePrintQuotation();
    });
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

    target.innerHTML = "";

    if (!this.travelDays || !this.travelNights) {
      target.innerHTML = `
        <div class="quote-empty-state">
          Selecciona tus fechas de viaje para detectar automáticamente el itinerario compatible.
        </div>
      `;
      return;
    }

    const compatible = this.getCompatiblePackages();

    if (!compatible.length) {
      target.innerHTML = `
        <div class="quote-empty-state">
          No tenemos un itinerario configurado para ${this.travelDays} días / ${this.travelNights} noches.
          Puedes ajustar las fechas o crear una versión personalizada.
        </div>
      `;
    }
  }

  selectPackage(pkg) {
    this.selectedPackage = pkg;
    this.visibleItineraryOptionsCount = 4;

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
      this.selectedItineraryOption = null;
      this.selectedOutboundTrainCode = "";
      this.selectedReturnTrainCode = "";
      this.renderItineraryOptions();
      this.renderTrainSelectors();
      this.updatePricing();
      this.updatePrintQuotation();
      return;
    }

    const currentStillAvailable = availableOptions.some((option) => {
      return option.code === this.selectedItineraryOption?.code;
    });

    if (!currentStillAvailable) {
      this.selectedItineraryOption =
        availableOptions.find((option) => option.recommended) ||
        availableOptions[0];

      this.selectedOutboundTrainCode = "";
      this.selectedReturnTrainCode = "";
    }

    this.renderItineraryOptions();
    this.renderTrainSelectors();
    this.updatePricing();
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
    const itinerary = Array.isArray(option?.itinerary) ? option.itinerary : [];
    if (!itinerary.length) return true;

    const arrivalMinutes = this.getEffectiveArrivalMinutes();
    const departureMinutes = this.getEffectiveDepartureMinutes();

    const firstDay = this.getFirstItineraryDay(itinerary);
    const lastDay = this.getLastItineraryDay(itinerary);

    const firstDayStart = this.getItineraryDayStartMinutes(firstDay);
    const lastDayEnd = this.getItineraryDayEndMinutes(lastDay);

    const firstDayIsOnlyTransfer = this.isOnlyTransferDay(firstDay);
    const lastDayIsOnlyTransfer = this.isOnlyTransferDay(lastDay);

    if (
      arrivalMinutes !== null &&
      firstDayStart !== null &&
      firstDayStart < arrivalMinutes &&
      !firstDayIsOnlyTransfer
    ) {
      return false;
    }

    if (
      departureMinutes !== null &&
      lastDayEnd !== null &&
      lastDayEnd > departureMinutes &&
      !lastDayIsOnlyTransfer
    ) {
      return false;
    }

    return true;
  }

  isOnlyTransferDay(dayItem) {
    if (!dayItem) return false;

    const tourCodes = Array.isArray(dayItem.tourCodes) ? dayItem.tourCodes : [];
    const text = `${dayItem.title || ""} ${dayItem.description || ""} ${tourCodes.join(" ")}`.toLowerCase();

    return (
      tourCodes.includes("arrival_transfer") ||
      tourCodes.includes("departure_transfer") ||
      text.includes("traslado de llegada") ||
      text.includes("traslado de salida") ||
      text.includes("día libre") ||
      text.includes("dia libre") ||
      text.includes("recepción") ||
      text.includes("recojo del aeropuerto")
    );
  }

  getFirstItineraryDay(itinerary) {
    if (!Array.isArray(itinerary) || !itinerary.length) return null;

    return itinerary.reduce((first, item) => {
      const firstDay = Number(first?.day || 9999);
      const currentDay = Number(item?.day || 9999);
      return currentDay < firstDay ? item : first;
    }, itinerary[0]);
  }

  getLastItineraryDay(itinerary) {
    if (!Array.isArray(itinerary) || !itinerary.length) return null;

    return itinerary.reduce((last, item) => {
      const lastDay = Number(last?.day || 0);
      const currentDay = Number(item?.day || 0);
      return currentDay > lastDay ? item : last;
    }, itinerary[0]);
  }

  getItineraryDayStartMinutes(dayItem) {
    if (!dayItem) return null;

    const directTime =
      dayItem.startTime ||
      dayItem.start ||
      dayItem.startHour ||
      dayItem.horaInicio ||
      dayItem.hora_inicio ||
      dayItem.timeStart;

    const directMinutes = this.timeToMinutes(directTime);
    if (directMinutes !== null) return directMinutes;

    const text = `${dayItem.title || ""} ${dayItem.description || ""}`.toLowerCase();

    if (text.includes("machu picchu full day") || text.includes("machu picchu express")) {
      return this.timeToMinutes("04:00");
    }

    if (text.includes("vinicunca") || text.includes("montaña de colores")) {
      return this.timeToMinutes("04:00");
    }

    if (text.includes("humantay")) {
      return this.timeToMinutes("04:00");
    }

    if (text.includes("siete lagunas") || text.includes("ausangate")) {
      return this.timeToMinutes("04:00");
    }

    if (text.includes("city tour")) {
      return this.timeToMinutes("13:00");
    }

    if (text.includes("bienvenida") || text.includes("ancestral")) {
      return this.timeToMinutes("09:00");
    }

    return null;
  }

  getFlexibleFirstDayStartMinutes(dayItem) {
    if (!dayItem) return null;

    const text = `${dayItem.title || ""} ${dayItem.description || ""} ${(dayItem.tourCodes || []).join(" ")}`.toLowerCase();

    if (text.includes("arrival_transfer")) {
      if (text.includes("city") || text.includes("city tour")) {
        return this.timeToMinutes("13:00");
      }

      if (text.includes("bienvenida") || text.includes("ancestral") || text.includes("panorámico") || text.includes("panoramico")) {
        return this.timeToMinutes("13:00");
      }
    }

    return this.getItineraryDayStartMinutes(dayItem);
  }

  getItineraryDayEndMinutes(dayItem) {
    if (!dayItem) return null;

    const directTime =
      dayItem.endTime ||
      dayItem.end ||
      dayItem.endHour ||
      dayItem.horaFin ||
      dayItem.hora_fin ||
      dayItem.timeEnd;

    const directMinutes = this.timeToMinutes(directTime);
    if (directMinutes !== null) return directMinutes;

    const text = `${dayItem.title || ""} ${dayItem.description || ""}`.toLowerCase();

    if (text.includes("machu picchu full day")) {
      return this.timeToMinutes("23:30");
    }

    if (text.includes("machu picchu express")) {
      return this.timeToMinutes("19:00");
    }

    if (
      text.includes("vinicunca") ||
      text.includes("montaña de colores") ||
      text.includes("humantay") ||
      text.includes("siete lagunas") ||
      text.includes("ausangate")
    ) {
      return this.timeToMinutes("17:00");
    }

    if (
      text.includes("maras") ||
      text.includes("moray") ||
      text.includes("valle sur")
    ) {
      return this.timeToMinutes("15:00");
    }

    if (text.includes("city tour")) {
      return this.timeToMinutes("18:00");
    }

    if (text.includes("bienvenida") || text.includes("ancestral")) {
      return this.timeToMinutes("18:00");
    }

    return null;
  }

  getEffectiveArrivalMinutes() {
    const rawArrivalMinutes = this.timeToMinutes(this.arrivalTime);
    return rawArrivalMinutes === null ? null : Math.min(rawArrivalMinutes + 120, 1439);
  }

  getEffectiveDepartureMinutes() {
    const rawDepartureMinutes = this.timeToMinutes(this.departureTime);
    return rawDepartureMinutes === null ? null : Math.max(rawDepartureMinutes - 120, 0);
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
    this.updateItinerarySectionIntro(options.length);

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

    if (!options.some((option) => option.code === this.selectedItineraryOption?.code)) {
      this.selectedItineraryOption = options.find((option) => option.recommended) || options[0];
    }

    const visibleOptions = options.slice(0, this.visibleItineraryOptionsCount);
    const hasMoreOptions = options.length > visibleOptions.length;

    target.innerHTML = `
      ${visibleOptions.map((option) => {
        const isSelected = this.selectedItineraryOption?.code === option.code;
        const title = this.getCleanItineraryOptionTitle(option);
        const description = this.getItineraryMarketingDescription(option);
        const timeLabel = this.getItineraryOptionTimeLabel(option);

        return `
          <article class="quote-itinerary-option ${isSelected ? "is-selected" : ""}" data-itinerary-code="${this.escapeHtml(option.code)}">
            <div class="quote-itinerary-option__top">
              <h3>${this.escapeHtml(title)}</h3>
              ${option.recommended ? `<span class="quote-badge quote-badge--gold">Recomendado</span>` : ""}
            </div>
            <p>${this.escapeHtml(description)}</p>
            ${timeLabel ? `<span class="quote-itinerary-time">${this.escapeHtml(timeLabel)}</span>` : ""}
          </article>
        `;
      }).join("")}

      ${hasMoreOptions ? `
        <button type="button" class="btn quote-secondary-btn quote-load-more-itineraries" id="loadMoreItinerariesBtn">
          Ver más itinerarios
        </button>
      ` : ""}
    `;

    target.querySelectorAll(".quote-itinerary-option").forEach((card) => {
      card.addEventListener("click", () => {
        const code = card.dataset.itineraryCode;
        this.selectedItineraryOption = options.find((item) => item.code === code) || options[0];

        this.selectedOutboundTrainCode = "";
        this.selectedReturnTrainCode = "";

        this.renderItineraryOptions();
        this.renderTrainSelectors();
        this.updatePricing();
        this.updatePrintQuotation();
      });
    });

    document.getElementById("loadMoreItinerariesBtn")?.addEventListener("click", () => {
      this.visibleItineraryOptionsCount += 4;
      this.renderItineraryOptions();
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

    preview.innerHTML = itinerary.map((item) => {
      const start = this.getItineraryDayStartMinutes(item);
      const end = this.getItineraryDayEndMinutes(item);
      const cleanTitle = this.cleanDayTitle(item.title || "", item.day);
      const dateLabel = this.getItineraryDateLabel(item.day);

      const timeInfo =
        start !== null || end !== null
          ? `
            <span class="quote-itinerary-time">
              ${start !== null ? `Inicio ${this.minutesToTimeLabel(start)}` : "Inicio por confirmar"}
              ·
              ${end !== null ? `Fin ${this.minutesToTimeLabel(end)}` : "Fin por confirmar"}
            </span>
          `
          : "";

      return `
        <div class="quote-itinerary-item">
          <h4>
            Día ${this.escapeHtml(item.day)}:
            ${dateLabel ? `<span class="itinerary-date">(${this.escapeHtml(dateLabel)})</span>` : ""}
            ${this.escapeHtml(cleanTitle)}
          </h4>
          <p>${this.escapeHtml(item.description || "")}</p>
          ${timeInfo}
        </div>
      `;
    }).join("");
  }
  getCleanItineraryOptionTitle(option) {
    const rawLabel = option?.label || "Opción de itinerario";

    let clean = String(rawLabel)
      .replace(/\s*\+\s*(salida libre|llegada tarde|early departure|late arrival|free day|día libre|dia libre)\s*/gi, "")
      .replace(/\b(salida libre|llegada tarde|early departure|late arrival|free day|día libre|dia libre)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+\+/g, " +")
      .replace(/\+\s*$/g, "")
      .trim();

    return clean || rawLabel;
  }

  cleanDayTitle(title, dayNumber) {
    let clean = String(title || "").trim();

    clean = clean.replace(new RegExp(`^Día\\s*${dayNumber}\\s*:\\s*`, "i"), "");
    clean = clean.replace(new RegExp(`^Dia\\s*${dayNumber}\\s*:\\s*`, "i"), "");
    clean = clean.replace(/^Día\s*\d+\s*:\s*/i, "");
    clean = clean.replace(/^Dia\s*\d+\s*:\s*/i, "");

    return clean.trim();
  }

  getItineraryDateLabel(dayNumber) {
    if (!this.travelStartDate || !dayNumber) return "";

    const baseDate = new Date(`${this.travelStartDate}T00:00:00`);
    if (Number.isNaN(baseDate.getTime())) return "";

    baseDate.setDate(baseDate.getDate() + Number(dayNumber || 1) - 1);

    return baseDate.toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  updateItinerarySectionIntro(optionsCount = 0) {
    const headerText =
      document.getElementById("itinerarySectionIntro") ||
      document.querySelector("#itinerarySection .quote-card__header p");

    if (!headerText || !this.selectedPackage) return;

    const duration = `${this.travelDays} días / ${this.travelNights} noches`;

    headerText.innerHTML = `
      Estos son los itinerarios disponibles según tus fechas y horas de estadía.
      <br>
      Actualmente tienes ${optionsCount} opción${optionsCount !== 1 ? "es" : ""} para
      <span class="quote-badge quote-badge--muted quote-duration-inline">${this.escapeHtml(duration)}</span>.
    `;
  }

  getItineraryOptionTimeLabel(option) {
    const itinerary = Array.isArray(option?.itinerary) ? option.itinerary : [];
    if (!itinerary.length) return "";

    const firstDay = this.getFirstItineraryDay(itinerary);
    const lastDay = this.getLastItineraryDay(itinerary);

    const start = this.getItineraryDayStartMinutes(firstDay);
    const end = this.getItineraryDayEndMinutes(lastDay);

    if (start === null && end === null) return "";

    const startText = start !== null ? this.minutesToTimeLabel(start) : "por confirmar";
    const endText = end !== null ? this.minutesToTimeLabel(end) : "por confirmar";

    return `Inicia el primer día desde las ${startText} y finaliza el último día hasta las ${endText}.`;
  }

  getItineraryMarketingDescription(option) {
    const itinerary = Array.isArray(option?.itinerary) ? option.itinerary : [];

    if (itinerary.length) {
      return itinerary.map((item) => {
        const cleanTitle = this.cleanDayTitle(item.title || "", item.day);
        const description = cleanTitle || item.description || "Actividad programada";
        return `Día ${item.day} ${description}`;
      }).join(". ") + ".";
    }

    return option?.summary || "Itinerario disponible para tus fechas, con servicios organizados según la duración seleccionada.";
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
      const hotelImage = this.getHotelCoverImage(selection?.hotel);
      const isNoHotel = selection?.hotel?.hotelCode === "no-hotel";

      return `
        <div class="quote-accommodation-card ${hotelImage && !isNoHotel ? "has-hotel-image" : ""}">
          <div class="quote-accommodation-card__header">
            <strong>${this.escapeHtml(destinationLabel)}</strong>
            <small>${item.nights} noche${item.nights > 1 ? "s" : ""}</small>
          </div>

          <div class="quote-accommodation-card__body">
            ${
              hotelImage && !isNoHotel
                ? `<img class="quote-accommodation-card__image" src="${this.resolveAssetPath(hotelImage)}" alt="${this.escapeHtml(selection?.hotel?.hotelName || "Hotel seleccionado")}" />`
                : ""
            }

            <div class="quote-accommodation-card__content">
              <p><strong>${this.escapeHtml(selection?.hotel?.hotelName || "Sin hotel seleccionado")}</strong></p>
              <p class="quote-accommodation-card__price">
                + ${this.formatCurrency(additional, this.quoteCurrency)}
              </p>

              <button type="button" class="btn quote-secondary-btn open-hotel-modal-btn" data-destination="${this.escapeHtml(item.destination)}">
                Elegir hotel
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    container.querySelectorAll(".open-hotel-modal-btn").forEach((button) => {
      button.addEventListener("click", () => this.openHotelModal(button.dataset.destination));
    });
  }

  getHotelCoverImage(hotel) {
    if (!hotel || hotel.hotelCode === "no-hotel") return "";

    if (hotel.images?.cover) return hotel.images.cover;
    if (Array.isArray(hotel.images)) return hotel.images[0];
    if (hotel.image) return hotel.image;

    return "";
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

      const currentCombinationKey = this.selectedCombinationsByDestination[item.destination];
      const stillValid = combinations.some((combo) => combo.key === currentCombinationKey);

      if (!stillValid) {
        this.selectedCombinationsByDestination[item.destination] = combinations[0]?.key || "";
      }
    });

    this.renderAccommodationOptions();
  }

  getAccommodationSummary() {
    if (!this.selectedPackage) return [];

    const fromItinerary = this.selectedItineraryOption?.accommodationSummary;
    if (Array.isArray(fromItinerary) && fromItinerary.length) return fromItinerary;

    const fromOverride = this.selectedItineraryOption?.accommodationOverride;
    if (Array.isArray(fromOverride) && fromOverride.length) return fromOverride;

    const fromPackage = this.selectedPackage.accommodationSummary;
    if (Array.isArray(fromPackage) && fromPackage.length) return fromPackage;

    return [];
  }

  getNoHotelOption(destination) {
    return {
      hotelCode: "no-hotel",
      hotelName: "Opción sin alojamiento",
      destination,
      stars: 0,
      location: this.getDestinationLabel(destination),
      address: "",
      summary: "El cliente gestionará su alojamiento por cuenta propia.",
      features: [],
      amenities: {},
      images: {
        cover: "",
        gallery: []
      },
      rooms: [
        {
          roomType: "no-room",
          roomCode: "no-room",
          roomName: "Sin habitación",
          label: "Sin habitación",
          bedType: "No incluye alojamiento",
          capacity: 99,
          currency: this.quoteCurrency,
          pricePerNight: 0
        }
      ]
    };
  }

  getHotelsByDestination(destination) {
    const destinationData = this.hotelsData?.destinations?.[destination];

    if (Array.isArray(destinationData)) return destinationData;
    if (Array.isArray(destinationData?.hotels)) return destinationData.hotels;

    return [];
  }

  getHotelByCode(destination, hotelCode) {
    if (!hotelCode || hotelCode === "no-hotel") return null;

    return this.getHotelsByDestination(destination).find((hotel) => {
      return hotel.hotelCode === hotelCode || hotel.code === hotelCode || hotel.id === hotelCode;
    }) || null;
  }

  getSelectedAccommodationForDestination(destination) {
    const hotelCode = this.selectedHotelsByDestination[destination];
    const isNoHotel = hotelCode === "no-hotel";

    const hotel = isNoHotel
      ? this.getNoHotelOption(destination)
      : this.getHotelByCode(destination, hotelCode);

    if (!hotel) return null;

    const summary = this.getAccommodationSummary().find((item) => item.destination === destination);
    const nights = Number(summary?.nights || 0);

    const combinations = this.generateAccommodationCombinations(
      hotel.rooms || [],
      this.getTotalPassengers(),
      nights
    );

    const selectedCombinationKey = this.selectedCombinationsByDestination[destination];
    const combination = combinations.find((item) => item.key === selectedCombinationKey) || combinations[0] || null;

    return { hotel, combination };
  }

  calculateAccommodationAdditional(destination) {
    const selection = this.getSelectedAccommodationForDestination(destination);
    if (!selection?.hotel || !selection?.combination) return 0;

    return this.convertCurrency(
      Number(selection.combination.total || 0),
      selection.combination.currency || this.quoteCurrency,
      this.quoteCurrency
    );
  }

  getDestinationLabel(destination) {
    const destinationData = this.hotelsData?.destinations?.[destination];

    if (destinationData?.label) return destinationData.label;

    const labels = {
      cusco: "Cusco",
      "aguas-calientes": "Aguas Calientes",
      aguas_calientes: "Aguas Calientes",
      machu_picchu: "Machu Picchu Pueblo",
      sacred_valley: "Valle Sagrado"
    };

    return labels[destination] || String(destination || "").replace(/_/g, " ").replace(/-/g, " ");
  }

  getHotelImages(hotel) {
    if (!hotel || hotel.hotelCode === "no-hotel") return [];

    const images = [];

    if (hotel.images?.cover) images.push(hotel.images.cover);

    if (Array.isArray(hotel.images?.gallery)) {
      hotel.images.gallery.forEach((image) => images.push(image));
    }

    if (Array.isArray(hotel.images)) {
      hotel.images.forEach((image) => images.push(image));
    }

    if (Array.isArray(hotel.gallery)) {
      hotel.gallery.forEach((image) => images.push(image));
    }

    if (hotel.image) images.push(hotel.image);
    if (hotel.cover) images.push(hotel.cover);

    return [...new Set(images.filter(Boolean))];
  }

  generateAccommodationCombinations(rooms = [], passengers = 1, nights = 1) {
    const safePassengers = Math.max(1, Number(passengers || 1));
    const safeNights = Math.max(0, Number(nights || 0));

    if (!Array.isArray(rooms) || !rooms.length) {
      return [
        {
          key: "no-room",
          label: "Sin habitación",
          description: "No se agregará costo de alojamiento.",
          total: 0,
          currency: this.quoteCurrency,
          rooms: []
        }
      ];
    }

    const normalizedRooms = rooms.map((room) => ({
      ...room,
      roomCode: room.roomCode || room.code || room.id || room.roomType || room.roomName || room.label || "room",
      roomName: room.roomName || room.name || room.label || room.roomType || "Habitación",
      capacity: Number(room.capacity || room.maxOccupancy || room.guests || 1),
      pricePerNight: Number(room.pricePerNight || room.price || room.rate || 0),
      currency: room.currency || "USD"
    }));

    const exact = normalizedRooms
      .filter((room) => room.capacity >= safePassengers)
      .map((room) => ({
        key: `${room.roomCode}-x1`,
        label: `${room.roomName} x 1`,
        description: `${safeNights} noche${safeNights !== 1 ? "s" : ""}`,
        total: room.pricePerNight * safeNights,
        currency: room.currency,
        rooms: [{ room, quantity: 1 }]
      }));

    const combinations = [...exact];

    normalizedRooms.forEach((room) => {
      const quantity = Math.ceil(safePassengers / Math.max(1, room.capacity));

      if (quantity > 1) {
        combinations.push({
          key: `${room.roomCode}-x${quantity}`,
          label: `${room.roomName} x ${quantity}`,
          description: `${safeNights} noche${safeNights !== 1 ? "s" : ""}`,
          total: room.pricePerNight * safeNights * quantity,
          currency: room.currency,
          rooms: [{ room, quantity }]
        });
      }
    });

    combinations.sort((a, b) => {
      const aValue = this.convertCurrency(a.total, a.currency, this.quoteCurrency);
      const bValue = this.convertCurrency(b.total, b.currency, this.quoteCurrency);
      return aValue - bValue;
    });

    return combinations.length ? combinations : [
      {
        key: "no-room",
        label: "Sin habitación",
        description: "No se agregará costo de alojamiento.",
        total: 0,
        currency: this.quoteCurrency,
        rooms: []
      }
    ];
  }

  openHotelModal(destination) {
    this.activeHotelModalDestination = destination;

    const modal = document.getElementById("hotelModal");
    const list = document.getElementById("hotelModalList");
    const title = document.getElementById("hotelModalTitle");
    const intro = document.getElementById("hotelModalIntro");

    if (!modal || !list) return;

    const destinationLabel = this.getDestinationLabel(destination);
    const summary = this.getAccommodationSummary().find((item) => item.destination === destination);
    const nights = Number(summary?.nights || 0);

    if (title) title.textContent = `Elige alojamiento en ${destinationLabel}`;
    if (intro) intro.textContent = `Selecciona una opción para ${nights} noche${nights !== 1 ? "s" : ""}.`;

    this.pendingHotelSelection = {
      hotelCode: this.selectedHotelsByDestination[destination] || "no-hotel",
      combinationKey: this.selectedCombinationsByDestination[destination] || ""
    };

    this.renderHotelModalOptions(destination);

    modal.hidden = false;
    document.body.classList.add("quote-modal-open");
  }

  renderHotelModalOptions(destination) {
    const list = document.getElementById("hotelModalList");
    if (!list) return;

    const summary = this.getAccommodationSummary().find((item) => item.destination === destination);
    const nights = Number(summary?.nights || 0);
    const hotels = [this.getNoHotelOption(destination), ...this.getHotelsByDestination(destination)];
    const passengers = this.getTotalPassengers();

    list.innerHTML = hotels.map((hotel) => {
      const isSelectedHotel = this.pendingHotelSelection?.hotelCode === hotel.hotelCode;
      const isNoHotel = hotel.hotelCode === "no-hotel";

      if (isNoHotel) {
        const priceZero = this.formatCurrency(0, this.quoteCurrency);

        return `
          <article class="hotel-option-card hotel-option-card--no-hotel ${isSelectedHotel ? "is-selected" : ""}">
            <div class="hotel-option-card__header">
              <div>
                <h3>Opción sin alojamiento</h3>
                <p>El cliente gestionará su alojamiento por cuenta propia.</p>
              </div>
              <span class="hotel-option-card__badge">${priceZero}</span>
            </div>

            <div class="hotel-option-card__content">
              <div class="hotel-option-card__body">
                <div class="hotel-option-card__options">
                  <button
                    type="button"
                    class="hotel-combo-btn ${isSelectedHotel ? "is-selected" : ""}"
                    data-hotel-code="no-hotel"
                    data-combo-key="no-room"
                  >
                    <span class="hotel-combo-btn__radio"></span>
                    <span class="hotel-combo-btn__main">Seleccionar sin alojamiento</span>
                    <span class="hotel-combo-btn__sub">${priceZero}</span>
                  </button>
                </div>
              </div>
            </div>
          </article>
        `;
      }

      const images = this.getHotelImages(hotel);
      const combinations = this.generateAccommodationCombinations(hotel.rooms || [], passengers, nights);

      const comboHtml = combinations.map((combo) => {
        const isSelectedCombo =
          isSelectedHotel &&
          (this.pendingHotelSelection?.combinationKey === combo.key || !this.pendingHotelSelection?.combinationKey);

        return `
          <button
            type="button"
            class="hotel-combo-btn ${isSelectedCombo ? "is-selected" : ""}"
            data-hotel-code="${this.escapeHtml(hotel.hotelCode)}"
            data-combo-key="${this.escapeHtml(combo.key)}"
          >
            <span class="hotel-combo-btn__radio"></span>
            <span class="hotel-combo-btn__main">${this.escapeHtml(combo.label)}</span>
            <span class="hotel-combo-btn__sub">
              ${this.escapeHtml(combo.description)} · ${this.formatCurrency(
                this.convertCurrency(combo.total, combo.currency, this.quoteCurrency),
                this.quoteCurrency
              )}
            </span>
          </button>
        `;
      }).join("");

      return `
        <article class="hotel-option-card ${isSelectedHotel ? "is-selected" : ""}">
          <div class="hotel-option-card__header">
            <div>
              <h3>${this.escapeHtml(hotel.hotelName || hotel.name || "Hotel")}</h3>
              <p>${Number(hotel.stars || 0)} estrellas · ${this.escapeHtml(hotel.location || this.getDestinationLabel(destination))}</p>
              ${hotel.address ? `<p>${this.escapeHtml(hotel.address)}</p>` : ""}
            </div>
            <span class="hotel-option-card__badge">Hotel</span>
          </div>

          <div class="hotel-option-card__content">
            <div class="hotel-option-card__media">
              ${
                images.length
                  ? `
                    <div class="hotel-gallery-main">
                      <img class="hotel-gallery-main-img" src="${this.escapeHtml(this.resolveAssetPath(images[0]))}" alt="${this.escapeHtml(hotel.hotelName || "Hotel")}" loading="lazy" />
                    </div>
                    <div class="hotel-gallery-thumbs">
                      ${images.map((image, index) => `
                        <button type="button" class="hotel-gallery-thumb ${index === 0 ? "is-active" : ""}">
                          <img src="${this.escapeHtml(this.resolveAssetPath(image))}" alt="${this.escapeHtml(hotel.hotelName || "Hotel")}" loading="lazy" />
                        </button>
                      `).join("")}
                    </div>
                  `
                  : `
                    <div class="hotel-gallery-main--empty">
                      <div class="hotel-gallery-empty-state">
                        <strong>Imagen no disponible</strong>
                        <span>Puedes agregar fotos del hotel en hotels.json.</span>
                      </div>
                    </div>
                  `
              }
            </div>

            <div class="hotel-option-card__body">
              <label>Opciones disponibles</label>
              <div class="hotel-option-card__options">
                ${comboHtml}
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("");

    list.querySelectorAll(".hotel-combo-btn").forEach((button) => {
      button.addEventListener("click", () => {
        this.pendingHotelSelection = {
          hotelCode: button.dataset.hotelCode,
          combinationKey: button.dataset.comboKey
        };

        this.renderHotelModalOptions(destination);
      });
    });

    list.querySelectorAll(".hotel-gallery-thumb").forEach((button) => {
      button.addEventListener("click", () => {
        const card = button.closest(".hotel-option-card");
        const mainImage = card?.querySelector(".hotel-gallery-main-img");
        const thumbImage = button.querySelector("img");

        if (!mainImage || !thumbImage) return;

        mainImage.src = thumbImage.src;

        card.querySelectorAll(".hotel-gallery-thumb").forEach((thumb) => {
          thumb.classList.toggle("is-active", thumb === button);
        });
      });
    });
  }

  bindHotelModalEvents() {
    document.addEventListener("click", (event) => {
      const closeBtn = event.target.closest("[data-close-modal], .quote-modal__close");

      if (closeBtn && closeBtn.closest("#hotelModal")) {
        this.closeHotelModal();
      }
    });

    document.getElementById("confirmHotelSelectionBtn")?.addEventListener("click", () => {
      if (!this.activeHotelModalDestination || !this.pendingHotelSelection) {
        this.closeHotelModal();
        return;
      }

      this.selectedHotelsByDestination[this.activeHotelModalDestination] =
        this.pendingHotelSelection.hotelCode;

      this.selectedCombinationsByDestination[this.activeHotelModalDestination] =
        this.pendingHotelSelection.combinationKey;

      this.renderAccommodationOptions();
      this.updatePricing();
      this.updatePrintQuotation();
      this.closeHotelModal();
    });
  }

  closeHotelModal() {
    const modal = document.getElementById("hotelModal");
    if (modal) modal.hidden = true;

    this.activeHotelModalDestination = null;
    this.pendingHotelSelection = null;

    document.body.classList.remove("quote-modal-open");
  }
  renderTrainSelectors() {
    const section = document.getElementById("trainSection");
    const outboundCard = document.getElementById("outboundTrainSelected");
    const returnCard = document.getElementById("returnTrainSelected");

    if (!section || !outboundCard || !returnCard) return;

    if (!this.selectedPackage || !this.selectedItineraryOption) {
      section.hidden = true;
      outboundCard.innerHTML = this.getTrainSelectorEmptyHtml("Tren de ida", "outbound");
      returnCard.innerHTML = this.getTrainSelectorEmptyHtml("Tren de retorno", "return");
      return;
    }

    const trainConfig = this.getTrainSelectionConfig();

    if (!trainConfig.required) {
      section.hidden = true;
      return;
    }

    section.hidden = false;

    const outboundTrain = this.getTrainByCode(trainConfig.outboundRoute, this.selectedOutboundTrainCode);
    const returnTrain = this.getTrainByCode(trainConfig.returnRoute, this.selectedReturnTrainCode);

    outboundCard.innerHTML = this.getTrainSelectorCardHtml({
      direction: "outbound",
      label: "Tren de ida",
      train: outboundTrain,
      routeCode: trainConfig.outboundRoute
    });

    returnCard.innerHTML = this.getTrainSelectorCardHtml({
      direction: "return",
      label: "Tren de retorno",
      train: returnTrain,
      routeCode: trainConfig.returnRoute
    });
  }

  getTrainSelectionConfig() {
    const packageConfig = this.selectedPackage?.trainSelection || {};
    const optionTrainMode = this.selectedItineraryOption?.trainMode || packageConfig.mode || "full_day";

    const modeRoutes = {
      full_day: {
        outboundRoute: "machu_picchu_full_day_outbound",
        returnRoute: "machu_picchu_return"
      },
      express: {
        outboundRoute: "machu_picchu_full_day_outbound",
        returnRoute: "machu_picchu_return"
      },
      sacred_valley_connection: {
        outboundRoute: "sacred_valley_connection_outbound",
        returnRoute: "machu_picchu_return"
      },
      connection: {
        outboundRoute: "sacred_valley_connection_outbound",
        returnRoute: "machu_picchu_return"
      },
      overnight: {
        outboundRoute: "sacred_valley_connection_outbound",
        returnRoute: "machu_picchu_return"
      },
      mixed: {
        outboundRoute: "machu_picchu_full_day_outbound",
        returnRoute: "machu_picchu_return"
      }
    };

    const fallbackRoutes = modeRoutes[optionTrainMode] || modeRoutes.full_day;

    let outboundRoute =
      this.selectedItineraryOption?.outboundRoute ||
      packageConfig.outboundRoute ||
      fallbackRoutes.outboundRoute;

    let returnRoute =
      this.selectedItineraryOption?.returnRoute ||
      packageConfig.returnRoute ||
      fallbackRoutes.returnRoute;

    if (!outboundRoute || outboundRoute === "dynamic_by_itinerary_option") {
      outboundRoute = fallbackRoutes.outboundRoute;
    }

    if (!returnRoute || returnRoute === "dynamic_by_itinerary_option") {
      returnRoute = fallbackRoutes.returnRoute;
    }

    if (!this.trainsData?.routes?.[outboundRoute]) {
      outboundRoute = fallbackRoutes.outboundRoute;
    }

    if (!this.trainsData?.routes?.[returnRoute]) {
      returnRoute = fallbackRoutes.returnRoute;
    }

    return {
      required: packageConfig.required !== false,
      mode: optionTrainMode,
      outboundRoute,
      returnRoute
    };
  }

  getTrainSelectorEmptyHtml(label, direction = "") {
    return `
      <div>
        <span>${this.escapeHtml(label)}</span>
        <strong>Sin selección</strong>
        <p>Elige una opción de tren para completar la cotización.</p>
      </div>
      <button
        type="button"
        class="btn quote-secondary-btn"
        data-train-direction="${this.escapeHtml(direction)}"
      >
        Elegir tren
      </button>
    `;
  }

  getTrainSelectorCardHtml({ direction, label, train, routeCode }) {
    const companyLogo = train ? this.getTrainCompanyLogo(train) : "";
    const companyLabel = train ? this.getTrainCompanyLabel(train) : "";
    const buttonText = train ? "Cambiar tren" : "Elegir tren";
    const trainName = train ? this.getTrainDisplayName(train) : "Sin selección";
    const timeText = train ? this.getTrainShortScheduleText(train, direction) : "Selecciona horario y categoría.";

    return `
      <div>
        <span>${this.escapeHtml(label)}</span>
        ${
          companyLogo
            ? `
              <div class="train-option-card__company">
                <img class="train-option-card__logo" src="${this.escapeHtml(companyLogo)}" alt="${this.escapeHtml(companyLabel)}" loading="lazy" />
                <strong>${this.escapeHtml(trainName)}</strong>
              </div>
            `
            : `<strong>${this.escapeHtml(trainName)}</strong>`
        }
        <p>${this.escapeHtml(timeText)}</p>
      </div>
      <button
        type="button"
        class="btn quote-secondary-btn"
        data-train-direction="${this.escapeHtml(direction)}"
        data-route-code="${this.escapeHtml(routeCode)}"
      >
        ${this.escapeHtml(buttonText)}
      </button>
    `;
  }

  bindTrainSelectionModalEvents() {
    document.addEventListener("click", (event) => {
      const closeBtn = event.target.closest("[data-close-modal], .quote-modal__close");

      if (closeBtn && closeBtn.closest("#trainSelectionModal")) {
        this.closeTrainSelectionModal();
        return;
      }

      const dynamicButton = event.target.closest("[data-train-direction]");
      if (dynamicButton) {
        const direction = dynamicButton.dataset.trainDirection;
        if (direction === "outbound" || direction === "return") {
          this.openTrainSelectionModal(direction);
        }
      }
    });

    document.getElementById("confirmTrainSelectionBtn")?.addEventListener("click", () => {
      this.confirmTrainSelection();
    });
  }

  bindTrainDetailsModalEvents() {
    const modal = document.getElementById("trainDetailsModal");
    if (!modal) return;

    modal.querySelectorAll("[data-close-modal]").forEach((button) => {
      button.addEventListener("click", () => {
        modal.hidden = true;
        document.body.classList.remove("quote-modal-open");
      });
    });
  }

  openTrainSelectionModal(direction) {
    if (!this.selectedPackage || !this.selectedItineraryOption) return;

    const trainConfig = this.getTrainSelectionConfig();
    const routeCode = direction === "outbound" ? trainConfig.outboundRoute : trainConfig.returnRoute;

    this.activeTrainDirection = direction;
    this.pendingTrainCode = direction === "outbound" ? this.selectedOutboundTrainCode : this.selectedReturnTrainCode;

    const modal = document.getElementById("trainSelectionModal");
    const title = document.getElementById("trainSelectionModalTitle");
    const intro = document.getElementById("trainSelectionModalIntro");

    if (!modal) return;

    const route = this.trainsData?.routes?.[routeCode];
    const directionLabel = direction === "outbound" ? "ida" : "retorno";

    if (title) {
      title.textContent = `Elige tu tren de ${directionLabel}`;
    }

    if (intro) {
      intro.textContent = route?.description || "Selecciona una opción disponible para completar la cotización.";
    }

    this.renderTrainModalOptions(routeCode);

    modal.hidden = false;
    document.body.classList.add("quote-modal-open");
  }

  renderTrainModalOptions(routeCode) {
    const list = document.getElementById("trainSelectionModalList");
    if (!list) return;

    const route = this.trainsData?.routes?.[routeCode];
    const allOptions = Array.isArray(route?.options) ? route.options : [];
    const options = allOptions.filter((train) => this.isTrainAllowedForNationality(train));

    if (!options.length) {
      list.innerHTML = `
        <div class="quote-empty-state">
          No hay trenes disponibles para esta ruta y nacionalidad seleccionada.
        </div>
      `;
      return;
    }

    list.innerHTML = options.map((train) => {
      const isSelected = this.pendingTrainCode === train.code;
      const category = this.trainsData?.trainCategories?.[train.categoryCode] || {};
      const logo = this.getTrainCompanyLogo(train);
      const companyLabel = this.getTrainCompanyLabel(train);
      const displayName = this.getTrainDisplayName(train);
      const price = this.getTrainPriceInQuoteCurrency(train);
      const isLocal = Boolean(train.isLocalTrain || train.categoryCode === "local_train");
      const recommended = Boolean(train.isRecommended);

      return `
        <article
          class="train-option-card ${isSelected ? "is-selected" : ""} ${isLocal ? "train-option-card--local" : ""}"
          data-train-code="${this.escapeHtml(train.code)}"
          data-route-code="${this.escapeHtml(routeCode)}"
        >
          <div class="train-option-card__header">
            <div class="train-option-card__company">
              ${
                logo
                  ? `<img class="train-option-card__logo" src="${this.escapeHtml(logo)}" alt="${this.escapeHtml(companyLabel)}" loading="lazy" />`
                  : ""
              }
              <div>
                <h3>${this.escapeHtml(displayName)}</h3>
                <p>${this.escapeHtml(companyLabel)} · ${this.escapeHtml(train.displayCategory || category.displayCategory || "Tren")}</p>
                ${recommended ? `<span class="train-recommended-badge">Recomendado</span>` : ""}
              </div>
            </div>

            <div class="train-option-card__price">
              ${this.formatCurrency(price, this.quoteCurrency)}
            </div>
          </div>

          <div class="train-option-card__body">
            <div class="train-option-card__schedule">
              <div>
                <span>Salida</span>
                <strong>${this.escapeHtml(this.formatTrainTime(train.departureTime))}</strong>
                <small>${this.escapeHtml(train.origin || "Por confirmar")}</small>
              </div>

              <div>
                <span>Llegada</span>
                <strong>${this.escapeHtml(this.formatTrainTime(train.arrivalTime))}</strong>
                <small>${this.escapeHtml(train.destination || "Por confirmar")}</small>
              </div>

              <div>
                <span>Duración</span>
                <strong>${this.escapeHtml(train.duration || "Por confirmar")}</strong>
                <small>${this.escapeHtml(train.transferInfo || train.routeType || "Tren")}</small>
              </div>
            </div>

            <p class="train-option-card__description">
              ${this.escapeHtml(category.shortDescription || train.description || "Opción de tren disponible para Machu Picchu.")}
            </p>

            ${
              train.warning || category.importantMessage
                ? `<p class="train-option-card__warning">${this.escapeHtml(train.warning || category.importantMessage)}</p>`
                : ""
            }

            <div class="train-option-card__actions">
              <button
                type="button"
                class="btn quote-main-btn select-train-option-btn"
                data-train-code="${this.escapeHtml(train.code)}"
              >
                ${isSelected ? "Seleccionado" : "Seleccionar tren"}
              </button>

              <button
                type="button"
                class="btn quote-secondary-btn view-train-details-btn"
                data-route-code="${this.escapeHtml(routeCode)}"
                data-train-code="${this.escapeHtml(train.code)}"
              >
                Ver detalles
              </button>
            </div>
          </div>
        </article>
      `;
    }).join("");

    list.querySelectorAll(".select-train-option-btn").forEach((button) => {
      button.addEventListener("click", () => {
        this.pendingTrainCode = button.dataset.trainCode || "";
        this.renderTrainModalOptions(routeCode);
      });
    });

    list.querySelectorAll(".view-train-details-btn").forEach((button) => {
      button.addEventListener("click", () => {
        this.openTrainDetailsModal(button.dataset.routeCode, button.dataset.trainCode);
      });
    });

    list.querySelectorAll(".train-option-card").forEach((card) => {
      card.addEventListener("click", (event) => {
        if (event.target.closest("button")) return;
        this.pendingTrainCode = card.dataset.trainCode || "";
        this.renderTrainModalOptions(routeCode);
      });
    });
  }

  confirmTrainSelection() {
    if (!this.activeTrainDirection || !this.pendingTrainCode) {
      this.closeTrainSelectionModal();
      return;
    }

    if (this.activeTrainDirection === "outbound") {
      this.selectedOutboundTrainCode = this.pendingTrainCode;
    }

    if (this.activeTrainDirection === "return") {
      this.selectedReturnTrainCode = this.pendingTrainCode;
    }

    this.renderTrainSelectors();
    this.updatePricing();
    this.updatePrintQuotation();
    this.closeTrainSelectionModal();
  }

  closeTrainSelectionModal() {
    const modal = document.getElementById("trainSelectionModal");
    if (modal) modal.hidden = true;

    this.activeTrainDirection = null;
    this.pendingTrainCode = "";

    document.body.classList.remove("quote-modal-open");
  }

  openTrainDetailsModal(routeCode, trainCode) {
    const modal = document.getElementById("trainDetailsModal");
    const title = document.getElementById("trainDetailsModalTitle");
    const intro = document.getElementById("trainDetailsModalIntro");
    const content = document.getElementById("trainDetailsModalContent");

    if (!modal || !content) return;

    const train = this.getTrainByCode(routeCode, trainCode);
    if (!train) return;

    const category = this.trainsData?.trainCategories?.[train.categoryCode] || {};
    const logo = this.getTrainCompanyLogo(train);
    const companyLabel = this.getTrainCompanyLabel(train);

    if (title) title.textContent = this.getTrainDisplayName(train);
    if (intro) intro.textContent = `${companyLabel} · ${train.displayCategory || category.displayCategory || "Tren"}`;

    content.innerHTML = `
      <div class="train-detail-box">
        ${
          logo
            ? `<img class="train-detail-logo" src="${this.escapeHtml(logo)}" alt="${this.escapeHtml(companyLabel)}" loading="lazy" />`
            : ""
        }

        <p>${this.escapeHtml(category.shortDescription || train.description || "Opción de tren disponible para Machu Picchu.")}</p>

        <ul>
          <li><strong>Salida:</strong> ${this.escapeHtml(this.formatTrainTime(train.departureTime))} - ${this.escapeHtml(train.origin || "Por confirmar")}</li>
          <li><strong>Llegada:</strong> ${this.escapeHtml(this.formatTrainTime(train.arrivalTime))} - ${this.escapeHtml(train.destination || "Por confirmar")}</li>
          <li><strong>Duración:</strong> ${this.escapeHtml(train.duration || "Por confirmar")}</li>
          <li><strong>Tipo de ruta:</strong> ${this.escapeHtml(train.transferInfo || train.routeType || "Tren")}</li>
          <li><strong>Precio:</strong> ${this.formatCurrency(this.getTrainPriceInQuoteCurrency(train), this.quoteCurrency)}</li>
        </ul>

        ${
          category.importantMessage
            ? `<p class="train-option-card__warning">${this.escapeHtml(category.importantMessage)}</p>`
            : ""
        }

        ${
          Array.isArray(category.purchaseRequirements) && category.purchaseRequirements.length
            ? `
              <h4>Condiciones importantes</h4>
              <ul>
                ${category.purchaseRequirements.map((item) => `<li>${this.escapeHtml(item)}</li>`).join("")}
              </ul>
            `
            : ""
        }
      </div>
    `;

    modal.hidden = false;
    document.body.classList.add("quote-modal-open");
  }

  getTrainByCode(routeCode, trainCode) {
    if (!routeCode || !trainCode) return null;

    const route = this.trainsData?.routes?.[routeCode];
    const options = Array.isArray(route?.options) ? route.options : [];

    return options.find((train) => train.code === trainCode) || null;
  }

  isTrainAllowedForNationality(train) {
    if (!train) return false;

    const allowed = Array.isArray(train.allowedNationalities) ? train.allowedNationalities : [];
    const notAllowed = Array.isArray(train.notAllowedNationalities) ? train.notAllowedNationalities : [];

    if (allowed.length && !allowed.includes(this.nationality)) return false;
    if (notAllowed.length && notAllowed.includes(this.nationality)) return false;

    if (train.isLocalTrain && this.nationality !== "national") return false;

    return true;
  }

  getTrainCompanyLogo(train) {
    const company = String(train?.company || "").toLowerCase();

    if (company.includes("inca")) {
      return this.resolveAssetPath("assets/img/trains/inca-rail.png");
    }

    if (company.includes("peru") || company.includes("perú")) {
      return this.resolveAssetPath("assets/img/trains/perurail.png");
    }

    return "";
  }

  getTrainCompanyLabel(train) {
    return train?.company || "Compañía de tren";
  }

  getTrainDisplayName(train) {
    if (!train) return "Sin selección";

    return train.serviceName || train.name || train.label || train.displayName || train.code || "Tren seleccionado";
  }

  getTrainShortScheduleText(train, direction = "") {
    if (!train) return "Selecciona horario y categoría.";

    const from = train.origin || "Origen por confirmar";
    const to = train.destination || "Destino por confirmar";
    const depart = this.formatTrainTime(train.departureTime);
    const arrive = this.formatTrainTime(train.arrivalTime);

    if (!train.departureTime && !train.arrivalTime) {
      return train.warning || "Horario sujeto a disponibilidad.";
    }

    const label = direction === "return" ? "Retorno" : "Ida";
    return `${label}: ${depart} - ${arrive} · ${from} → ${to}`;
  }

  formatTrainTime(time) {
    if (!time) return "Por confirmar";

    const minutes = this.timeToMinutes(time);
    if (minutes === null) return String(time);

    return this.minutesToTimeLabel(minutes);
  }

  getTrainPriceInQuoteCurrency(train) {
    if (!train) return 0;

    const rawPrice = Number(train.pricePerPerson || train.price || train.amount || 0);
    const currency = train.currency || this.quoteCurrency;

    return this.convertCurrency(rawPrice, currency, this.quoteCurrency);
  }

  calculateTrainAdditional() {
    if (!this.selectedPackage || !this.selectedItineraryOption) return 0;

    const trainConfig = this.getTrainSelectionConfig();

    if (!trainConfig.required) return 0;

    const outboundTrain = this.getTrainByCode(trainConfig.outboundRoute, this.selectedOutboundTrainCode);
    const returnTrain = this.getTrainByCode(trainConfig.returnRoute, this.selectedReturnTrainCode);

    const outbound = this.getTrainPriceInQuoteCurrency(outboundTrain);
    const back = this.getTrainPriceInQuoteCurrency(returnTrain);

    return (outbound + back) * this.getTotalPassengers();
  }
  renderExtras() {
    const section = document.getElementById("extrasSection");
    const container = document.getElementById("extrasContainer");

    if (!section || !container) return;

    const extras = Array.isArray(this.selectedPackage?.extras) ? this.selectedPackage.extras : [];

    if (!this.selectedPackage || !extras.length) {
      section.hidden = true;
      container.innerHTML = "";
      return;
    }

    section.hidden = false;

    container.innerHTML = extras.map((extra) => {
      const checked = this.selectedExtras.has(extra.code);
      const price = this.convertCurrency(Number(extra.price || 0), extra.currency || "USD", this.quoteCurrency);

      return `
        <label class="quote-extra-item ${checked ? "is-selected" : ""}">
          <input type="checkbox" value="${this.escapeHtml(extra.code)}" ${checked ? "checked" : ""} />
          <div>
            <strong>${this.escapeHtml(extra.label || "Extra")}</strong>
            <p>${this.formatCurrency(price, this.quoteCurrency)} ${extra.perPerson ? "por persona" : "por reserva"}</p>
          </div>
        </label>
      `;
    }).join("");

    container.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (input.checked) this.selectedExtras.add(input.value);
        else this.selectedExtras.delete(input.value);

        this.renderExtras();
        this.updatePricing();
        this.updatePrintQuotation();
      });
    });
  }

  getPricingBreakdown() {
    const basePricing = this.getBasePricing();
    const adultBase = this.convertCurrency(basePricing.adult, basePricing.currency, this.quoteCurrency);
    const childBase = this.convertCurrency(basePricing.child, basePricing.currency, this.quoteCurrency);

    const adultTotal = adultBase * this.adults;
    const childTotal = childBase * this.children;

    const hotelTotal = this.getAccommodationTotal();
    const trainTotal = this.getTrainTotal();
    const extrasTotal = this.getExtrasTotal();

    const subtotal = adultTotal + childTotal + hotelTotal + trainTotal + extrasTotal;

    const discountTotal = this.calculateManualDiscount(subtotal);
    const fullPaymentDiscount = this.paymentMode === "full"
      ? this.calculateFullPaymentDiscount(subtotal - discountTotal)
      : 0;

    const total = Math.max(0, subtotal - discountTotal - fullPaymentDiscount);

    const paymentOptions = this.packagesData.paymentOptions || {};
    const partialPercent = Number(paymentOptions.partialPaymentPercent || 30);

    const advancePayment = this.paymentMode === "partial"
      ? total * (partialPercent / 100)
      : total;

    const balance = Math.max(0, total - advancePayment);

    return {
      adultBase,
      childBase,
      adultTotal,
      childTotal,
      hotelTotal,
      trainTotal,
      extrasTotal,
      subtotal,
      discountTotal,
      fullPaymentDiscount,
      total,
      advancePayment,
      balance
    };
  }

  getBasePricing() {
    const byNationality = this.selectedPackage?.basePricingByNationality?.[this.nationality];

    if (byNationality) {
      return {
        adult: Number(byNationality.adult || 0),
        child: Number(byNationality.child || byNationality.adult || 0),
        currency: byNationality.currency || this.selectedPackage?.currency || "PEN"
      };
    }

    return {
      adult: Number(this.selectedPackage?.basePricing?.adult || 0),
      child: Number(this.selectedPackage?.basePricing?.child || this.selectedPackage?.basePricing?.adult || 0),
      currency: this.selectedPackage?.currency || "PEN"
    };
  }

  getAccommodationTotal() {
    return this.getAccommodationSummary().reduce((total, item) => {
      return total + this.calculateAccommodationAdditional(item.destination);
    }, 0);
  }

  getTrainTotal() {
    if (!this.selectedPackage || !this.selectedItineraryOption) return 0;

    const config = this.getTrainSelectionConfig();
    const outbound = this.getTrainByCode(config.outboundRoute, this.selectedOutboundTrainCode);
    const returning = this.getTrainByCode(config.returnRoute, this.selectedReturnTrainCode);
    const passengers = this.getTotalPassengers();

    const outboundTotal = outbound
      ? this.convertCurrency(Number(outbound.pricePerPerson || 0), outbound.currency || "USD", this.quoteCurrency) * passengers
      : 0;

    const returnTotal = returning
      ? this.convertCurrency(Number(returning.pricePerPerson || 0), returning.currency || "USD", this.quoteCurrency) * passengers
      : 0;

    return outboundTotal + returnTotal;
  }

  getExtrasTotal() {
    const extras = Array.isArray(this.selectedPackage?.extras) ? this.selectedPackage.extras : [];
    const passengers = this.getTotalPassengers();

    return extras.reduce((total, extra) => {
      if (!this.selectedExtras.has(extra.code)) return total;

      const price = this.convertCurrency(Number(extra.price || 0), extra.currency || "USD", this.quoteCurrency);
      return total + (extra.perPerson ? price * passengers : price);
    }, 0);
  }

  calculateManualDiscount(subtotal) {
    if (!this.appliedDiscountCode) return 0;

    if (this.appliedDiscountCode.type === "percent") {
      return subtotal * (Number(this.appliedDiscountCode.value || 0) / 100);
    }

    if (this.appliedDiscountCode.type === "fixed") {
      return this.convertCurrency(
        Number(this.appliedDiscountCode.value || 0),
        this.appliedDiscountCode.currency || this.quoteCurrency,
        this.quoteCurrency
      );
    }

    return 0;
  }

  calculateFullPaymentDiscount(amount) {
    const percent = Number(this.packagesData?.paymentOptions?.fullPaymentDiscountPercent || 0);
    return Math.max(0, amount) * (percent / 100);
  }

  updatePricing() {
    const breakdown = this.getPricingBreakdown();

    this.setText("adultSummaryLabel", `Adultos x${this.adults}`);
    this.setText("adultSummaryTotal", this.formatCurrency(breakdown.adultTotal, this.quoteCurrency));

    const childrenRow = document.getElementById("childrenSummaryRow");
    if (childrenRow) childrenRow.hidden = this.children <= 0;
    this.setText("childrenSummaryLabel", `Niños x${this.children}`);
    this.setText("childrenSummaryTotal", this.formatCurrency(breakdown.childTotal, this.quoteCurrency));

    const hotelRow = document.getElementById("hotelSummaryRow");
    if (hotelRow) hotelRow.hidden = breakdown.hotelTotal <= 0;
    this.setText("hotelSummaryTotal", this.formatCurrency(breakdown.hotelTotal, this.quoteCurrency));

    const trainRow = document.getElementById("trainSummaryRow");
    if (trainRow) trainRow.hidden = breakdown.trainTotal <= 0;
    this.setText("trainSummaryTotal", this.formatCurrency(breakdown.trainTotal, this.quoteCurrency));

    const extrasRow = document.getElementById("extrasSummaryRow");
    if (extrasRow) extrasRow.hidden = breakdown.extrasTotal <= 0;
    this.setText("extrasSummaryTotal", this.formatCurrency(breakdown.extrasTotal, this.quoteCurrency));

    const totalDiscount = breakdown.discountTotal + breakdown.fullPaymentDiscount;
    const discountRow = document.getElementById("discountSummaryRow");
    if (discountRow) discountRow.hidden = totalDiscount <= 0;
    this.setText("discountSummaryTotal", `- ${this.formatCurrency(totalDiscount, this.quoteCurrency)}`);

    this.setText("quoteGrandTotal", this.formatCurrency(breakdown.total, this.quoteCurrency));
    this.setText("advanceSummaryTotal", this.formatCurrency(breakdown.advancePayment, this.quoteCurrency));

    const balanceRow = document.getElementById("balanceSummaryRow");
    if (balanceRow) balanceRow.hidden = this.paymentMode !== "partial";
    this.setText("balanceSummaryTotal", this.formatCurrency(breakdown.balance, this.quoteCurrency));

    const advanceLabel = this.paymentMode === "partial" ? "Pagar ahora" : "Pagar ahora";
    this.setText("advanceSummaryLabel", advanceLabel);

    this.updatePaymentInfo(breakdown);
    this.updateMobileSummaryTotal(breakdown);
  }

  updatePaymentInfo(breakdown = this.getPricingBreakdown()) {
    const target = document.getElementById("paymentInfoText");
    if (!target) return;

    if (!this.selectedPackage) {
      target.textContent = "Selecciona fechas, itinerario, hotel y tren para generar la cotización.";
      return;
    }

    if (this.paymentMode === "full") {
      const discountPercent = Number(this.packagesData?.paymentOptions?.fullPaymentDiscountPercent || 0);
      target.textContent = discountPercent > 0
        ? `Pagando el total ahora accedes a un descuento del ${discountPercent}%.`
        : "Pagando el total ahora confirmas la cotización completa.";
      return;
    }

    const partialPercent = Number(this.packagesData?.paymentOptions?.partialPaymentPercent || 30);
    target.textContent = `Reserva con el ${partialPercent}% ahora y completa el saldo pendiente antes del viaje.`;
  }

  updateMobileSummaryTotal(breakdown = this.getPricingBreakdown()) {
    const panel = document.querySelector(".quote-summary-panel");
    if (!panel) return;

    panel.dataset.mobileTotal = this.formatCurrency(breakdown.total, this.quoteCurrency);
  }

  applyManualDiscountCode() {
    const input = document.getElementById("discountCodeInput");
    const message = document.getElementById("discountCodeMessage");

    if (!input) return;

    const code = String(input.value || "").trim().toUpperCase();

    if (!code) {
      this.clearAppliedDiscountCode(true);
      return;
    }

    const found = this.discountCodes.find((item) => {
      return String(item.code || "").trim().toUpperCase() === code;
    });

    if (!found) {
      this.appliedDiscountCode = null;

      if (message) {
        message.textContent = "Código no válido o no disponible.";
        message.classList.remove("is-success");
        message.classList.add("is-error");
      }

      this.updatePricing();
      this.updatePrintQuotation();
      return;
    }

    this.appliedDiscountCode = found;

    if (message) {
      message.textContent = "Código aplicado correctamente.";
      message.classList.remove("is-error");
      message.classList.add("is-success");
    }

    this.updatePricing();
    this.updatePrintQuotation();
  }

  clearAppliedDiscountCode(showMessage = true) {
    this.appliedDiscountCode = null;

    const input = document.getElementById("discountCodeInput");
    const message = document.getElementById("discountCodeMessage");

    if (input) input.value = "";

    if (message && showMessage) {
      message.textContent = "Ingresa tu código promocional si tienes uno.";
      message.classList.remove("is-success", "is-error");
    }

    this.updatePricing();
    this.updatePrintQuotation();
  }

  updatePassengersUI() {
    this.setText("adultsCount", this.adults);
    this.setText("childrenCount", this.children);
  }

  getTotalPassengers() {
    return Math.max(1, Number(this.adults || 0) + Number(this.children || 0));
  }

  updateReferenceUI() {
    this.setText("quoteReference", this.quoteReference);
    this.setText("printQuoteReference", this.quoteReference);
  }

  updateExchangeRateHelp() {
    const help = document.getElementById("exchangeRateHelp");
    if (!help) return;

    help.textContent = `Tipo de cambio referencial: 1 USD = ${this.exchangeRate.toFixed(2)} PEN.`;
  }

  ensureMobileSummaryToggle() {
    const panel = document.querySelector(".quote-summary-panel");
    if (!panel || panel.querySelector(".quote-mobile-summary-toggle")) return;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "quote-mobile-summary-toggle";
    toggle.innerHTML = `<i class="fas fa-angle-double-up"></i><span>Ver detalles</span>`;

    panel.insertBefore(toggle, panel.firstChild);

    toggle.addEventListener("click", () => {
      const expanded = panel.classList.toggle("is-expanded");
      document.body.classList.toggle("quote-summary-expanded", expanded);

      toggle.innerHTML = expanded
        ? `<i class="fas fa-angle-double-down"></i><span>Ocultar detalles</span>`
        : `<i class="fas fa-angle-double-up"></i><span>Ver detalles</span>`;
    });
  }

  initDesktopQuotePanelFixed() {
    const panel = document.querySelector(".quote-summary-panel");
    if (!panel) return;

    this.updateMobileSummaryTotal();
  }

  continueToPayment() {
    if (!this.selectedPackage) {
      alert("Primero selecciona tus fechas para detectar un itinerario.");
      return;
    }

    const breakdown = this.getPricingBreakdown();

    const paymentData = {
      quoteReference: this.quoteReference,
      packageId: this.selectedPackage?.id || "",
      packageTitle: this.selectedPackage?.title || "",
      itineraryCode: this.selectedItineraryOption?.code || "",
      itineraryLabel: this.selectedItineraryOption?.label || "",
      travelStartDate: this.travelStartDate,
      travelEndDate: this.travelEndDate,
      travelDays: this.travelDays,
      travelNights: this.travelNights,
      arrivalTime: this.arrivalTime,
      departureTime: this.departureTime,
      adults: this.adults,
      children: this.children,
      nationality: this.nationality,
      currency: this.quoteCurrency,
      paymentMode: this.paymentMode,
      selectedHotelsByDestination: this.selectedHotelsByDestination,
      selectedCombinationsByDestination: this.selectedCombinationsByDestination,
      selectedOutboundTrainCode: this.selectedOutboundTrainCode,
      selectedReturnTrainCode: this.selectedReturnTrainCode,
      selectedExtras: Array.from(this.selectedExtras),
      totals: breakdown
    };

    sessionStorage.setItem("myCuscoTripQuotePayment", JSON.stringify(paymentData));

    alert("Cotización lista para continuar al pago.");
  }

  async saveQuotationAsPdf() {
    this.updatePrintQuotation();

    const source = document.getElementById("printQuotation");
    if (!source) {
      alert("No se encontró la plantilla de impresión.");
      return;
    }

    if (typeof html2pdf === "undefined") {
      window.print();
      return;
    }

    document.body.classList.add("is-generating-pdf");

    const clone = source.cloneNode(true);
    clone.classList.add("print-quotation--pdf-export");

    const wrapper = document.createElement("div");
    wrapper.className = "pdf-export-wrapper";
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    const filename = `${this.quoteReference || "cotizacion-my-cusco-trip"}.pdf`;

    try {
      await html2pdf()
        .set({
          margin: 0,
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            scrollX: 0,
            scrollY: 0
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait"
          }
        })
        .from(clone)
        .save();
    } finally {
      wrapper.remove();
      document.body.classList.remove("is-generating-pdf");
    }
  }
  renderPackageIncludes() {
    const existing = document.getElementById("packageIncludesBox");
    if (existing) existing.remove();

    if (!this.selectedPackage) return;

    const itinerarySection = document.getElementById("itinerarySection");
    if (!itinerarySection) return;

    const includes = Array.isArray(this.selectedPackage.includes) ? this.selectedPackage.includes : [];
    if (!includes.length) return;

    const box = document.createElement("div");
    box.id = "packageIncludesBox";
    box.className = "quote-package-includes";

    box.innerHTML = `
      <h3>Este itinerario incluye</h3>
      <p>El itinerario base considera los servicios esenciales para operar la ruta seleccionada. El tren y el alojamiento se cotizan aparte según tus preferencias.</p>
      <ul>
        ${includes.map((item) => `<li>${this.escapeHtml(item)}</li>`).join("")}
      </ul>
    `;

    const preview = document.querySelector(".quote-itinerary-preview");
    if (preview) preview.insertAdjacentElement("afterend", box);
    else itinerarySection.appendChild(box);
  }

  updatePrintQuotation() {
    const breakdown = this.getPricingBreakdown();

    const issueDate = new Date();
    const validUntil = new Date();
    const validityDays = Number(this.packagesData?.paymentOptions?.quoteValidityDays || 2);
    validUntil.setDate(validUntil.getDate() + validityDays);

    this.setText("printQuoteReference", this.quoteReference);
    this.setText("printIssueDate", this.formatDisplayDate(issueDate));
    this.setText("printValidUntil", this.formatDisplayDate(validUntil));

    this.setText("printClientName", this.getInputValue("clientName") || "Por completar");
    this.setText("printClientPhone", this.getInputValue("clientPhone") || "Por completar");
    this.setText("printClientEmail", this.getInputValue("clientEmail") || "Por completar");
    this.setText("printClientDocument", this.getInputValue("clientDocument") || "Por completar");
    this.setText("printClientNotes", this.getInputValue("clientNotes") || "Sin comentarios adicionales");

    const startDate = this.travelStartDate ? new Date(`${this.travelStartDate}T00:00:00`) : null;
    const endDate = this.travelEndDate ? new Date(`${this.travelEndDate}T00:00:00`) : null;

    const travelDates =
      startDate && endDate
        ? `${this.formatDisplayDate(startDate)} al ${this.formatDisplayDate(endDate)}`
        : "Por completar";

    this.setText("printTravelDates", travelDates);
    this.setText(
      "printTravelDuration",
      this.travelDays && this.travelNights
        ? `${this.travelDays} días / ${this.travelNights} noches`
        : "Por completar"
    );

    this.setText(
      "printPassengerSummary",
      `${this.adults} adulto${this.adults !== 1 ? "s" : ""}${this.children > 0 ? `, ${this.children} niño${this.children !== 1 ? "s" : ""}` : ""}`
    );

    this.setText("printArrivalTime", this.arrivalTime ? this.minutesToTimeLabel(this.timeToMinutes(this.arrivalTime)) : "Por completar");
    this.setText("printDepartureTime", this.departureTime ? this.minutesToTimeLabel(this.timeToMinutes(this.departureTime)) : "Por completar");
    this.setText("printNationality", this.getNationalityLabel());
    this.setText("printCurrency", this.quoteCurrency);

    const printCouponBox = document.getElementById("printCouponBox");
    if (printCouponBox) {
      printCouponBox.hidden = !this.printCoupon?.code;
    }

    this.setText("printCouponCode", this.printCoupon?.code || "MCT-XXXX");
    this.setText("printCouponDiscount", `${Number(this.printCoupon?.discount || 0)}%`);

    const itineraryTarget = document.getElementById("printItinerary");
    if (itineraryTarget) {
      const itinerary = Array.isArray(this.selectedItineraryOption?.itinerary)
        ? this.selectedItineraryOption.itinerary
        : [];

      if (!itinerary.length) {
        itineraryTarget.innerHTML = `<p>Itinerario por confirmar.</p>`;
      } else {
        itineraryTarget.innerHTML = itinerary.map((item) => {
          const start = this.getItineraryDayStartMinutes(item);
          const end = this.getItineraryDayEndMinutes(item);
          const cleanTitle = this.cleanDayTitle(item.title || "", item.day);
          const dateLabel = this.getItineraryDateLabel(item.day);

          const timeInfo =
            start !== null || end !== null
              ? `
                <span class="print-itinerary-time">
                  ${start !== null ? `Inicio ${this.minutesToTimeLabel(start)}` : "Inicio por confirmar"}
                  ·
                  ${end !== null ? `Fin ${this.minutesToTimeLabel(end)}` : "Fin por confirmar"}
                </span>
              `
              : "";

          return `
            <div class="print-itinerary-item">
              <h4>
                Día ${this.escapeHtml(item.day)}:
                ${dateLabel ? `(${this.escapeHtml(dateLabel)})` : ""}
                ${this.escapeHtml(cleanTitle)}
              </h4>
              <p>${this.escapeHtml(item.description || "")}</p>
              ${timeInfo}
            </div>
          `;
        }).join("");
      }
    }

    this.renderPrintSelectedServices();
    this.renderPrintPaymentDetails(breakdown);
  }

  renderPrintSelectedServices() {
    const servicesTarget = document.getElementById("printSelectedServices");
    const hotelImagesTarget = document.getElementById("printHotelImages");

    if (!servicesTarget && !hotelImagesTarget) return;

    const trainConfig = this.selectedPackage && this.selectedItineraryOption
      ? this.getTrainSelectionConfig()
      : null;

    const outboundTrain = trainConfig
      ? this.getTrainByCode(trainConfig.outboundRoute, this.selectedOutboundTrainCode)
      : null;

    const returnTrain = trainConfig
      ? this.getTrainByCode(trainConfig.returnRoute, this.selectedReturnTrainCode)
      : null;

    const selectedExtras = this.getSelectedExtras();

    const serviceRows = [];

    serviceRows.push(`
      <div class="print-service-row">
        <span>Itinerario seleccionado</span>
        <strong>${this.escapeHtml(this.getCleanItineraryOptionTitle(this.selectedItineraryOption) || "Por confirmar")}</strong>
      </div>
    `);

    if (outboundTrain) {
      serviceRows.push(`
        <div class="print-service-row">
          <span>Tren de ida</span>
          <strong>${this.escapeHtml(this.getTrainDisplayName(outboundTrain))}</strong>
        </div>
      `);
    }

    if (returnTrain) {
      serviceRows.push(`
        <div class="print-service-row">
          <span>Tren de retorno</span>
          <strong>${this.escapeHtml(this.getTrainDisplayName(returnTrain))}</strong>
        </div>
      `);
    }

    if (selectedExtras.length) {
      serviceRows.push(`
        <div class="print-service-row">
          <span>Extras</span>
          <strong>${this.escapeHtml(selectedExtras.map((item) => item.label).join(", "))}</strong>
        </div>
      `);
    }

    if (servicesTarget) {
      servicesTarget.innerHTML = `
        <div class="print-services-list">
          ${serviceRows.join("")}
        </div>
      `;
    }

    if (hotelImagesTarget) {
      const hotelRows = this.getPrintHotelRows();

      if (!hotelRows.length) {
        hotelImagesTarget.innerHTML = `<p>Sin alojamiento seleccionado.</p>`;
      } else {
        hotelImagesTarget.innerHTML = hotelRows.join("");
      }
    }
  }

  getPrintHotelRows() {
    const summary = this.getAccommodationSummary();
    if (!summary.length) return [];

    return summary.map((item) => {
      const selection = this.getSelectedAccommodationForDestination(item.destination);
      const hotel = selection?.hotel;

      if (!hotel || hotel.hotelCode === "no-hotel") {
        return `
          <div class="print-hotel-row">
            <div class="print-hotel-info">
              <strong>Hotel en ${this.escapeHtml(this.getDestinationLabel(item.destination))}</strong>
              <span>Sin alojamiento seleccionado</span>
              <span>${item.nights} noche${item.nights !== 1 ? "s" : ""}</span>
            </div>
          </div>
        `;
      }

      const images = this.getHotelImages(hotel).slice(0, 4);

      return `
        <div class="print-hotel-row">
          <div class="print-hotel-info">
            <strong>Hotel en ${this.escapeHtml(this.getDestinationLabel(item.destination))}</strong>
            <span>${this.escapeHtml(hotel.hotelName || "Hotel seleccionado")}</span>
            <span>${item.nights} noche${item.nights !== 1 ? "s" : ""}</span>
            <span>Categoría ${Number(hotel.stars || 0)} estrellas</span>
          </div>

          ${
            images.length
              ? `
                <div class="print-hotel-gallery">
                  ${images.map((image) => `
                    <img src="${this.escapeHtml(this.resolveAssetPath(image))}" alt="${this.escapeHtml(hotel.hotelName || "Hotel")}" />
                  `).join("")}
                </div>
              `
              : ""
          }
        </div>
      `;
    });
  }

  renderPrintPaymentDetails(breakdown = this.getPricingBreakdown()) {
    const target = document.getElementById("printPaymentDetails");
    if (!target) return;

    const rows = [];

    rows.push(`
      <div class="print-payment-row">
        <span>Adultos x${this.adults}</span>
        <strong>${this.formatCurrency(breakdown.adultTotal, this.quoteCurrency)}</strong>
      </div>
    `);

    if (this.children > 0) {
      rows.push(`
        <div class="print-payment-row">
          <span>Niños x${this.children}</span>
          <strong>${this.formatCurrency(breakdown.childTotal, this.quoteCurrency)}</strong>
        </div>
      `);
    }

    rows.push(`
      <div class="print-payment-row">
        <span>Itinerario base</span>
        <strong>${this.formatCurrency(breakdown.adultTotal + breakdown.childTotal, this.quoteCurrency)}</strong>
      </div>
    `);

    if (breakdown.hotelTotal > 0) {
      rows.push(`
        <div class="print-payment-row">
          <span>Alojamiento</span>
          <strong>${this.formatCurrency(breakdown.hotelTotal, this.quoteCurrency)}</strong>
        </div>
      `);
    }

    if (breakdown.trainTotal > 0) {
      rows.push(`
        <div class="print-payment-row">
          <span>Trenes</span>
          <strong>${this.formatCurrency(breakdown.trainTotal, this.quoteCurrency)}</strong>
        </div>
      `);
    }

    if (breakdown.extrasTotal > 0) {
      rows.push(`
        <div class="print-payment-row">
          <span>Extras</span>
          <strong>${this.formatCurrency(breakdown.extrasTotal, this.quoteCurrency)}</strong>
        </div>
      `);
    }

    if (this.appliedDiscountCode && breakdown.discountTotal > 0) {
      rows.push(`
        <div class="print-payment-row">
          <span>Cupón de descuento (${this.escapeHtml(this.appliedDiscountCode.code || "")})</span>
          <strong>- ${this.formatCurrency(breakdown.discountTotal, this.quoteCurrency)}</strong>
        </div>
      `);
    }

    if (breakdown.fullPaymentDiscount > 0) {
      rows.push(`
        <div class="print-payment-row">
          <span>Descuento por modalidad de pago</span>
          <strong>- ${this.formatCurrency(breakdown.fullPaymentDiscount, this.quoteCurrency)}</strong>
        </div>
      `);
    }

    rows.push(`
      <div class="print-payment-row print-payment-row--total">
        <span>Total cotizado</span>
        <strong>${this.formatCurrency(breakdown.total, this.quoteCurrency)}</strong>
      </div>
    `);

    rows.push(`
      <div class="print-payment-row">
        <span>Pagar ahora</span>
        <strong>${this.formatCurrency(breakdown.advancePayment, this.quoteCurrency)}</strong>
      </div>
    `);

    if (this.paymentMode === "partial") {
      rows.push(`
        <div class="print-payment-row">
          <span>Saldo pendiente</span>
          <strong>${this.formatCurrency(breakdown.balance, this.quoteCurrency)}</strong>
        </div>
      `);
    }

    target.innerHTML = `
      <div class="print-payment-list">
        ${rows.join("")}
      </div>
    `;
  }

  getSelectedExtras() {
    const extras = Array.isArray(this.selectedPackage?.extras) ? this.selectedPackage.extras : [];
    return extras.filter((extra) => this.selectedExtras.has(extra.code));
  }

  convertCurrency(amount, fromCurrency, toCurrency) {
    const value = Number(amount || 0);
    const from = fromCurrency || "USD";
    const to = toCurrency || "USD";

    if (from === to) return value;

    if (from === "USD" && to === "PEN") return value * this.exchangeRate;
    if (from === "PEN" && to === "USD") return value / this.exchangeRate;

    return value;
  }

  formatCurrency(amount, currency = this.quoteCurrency) {
    const value = Number(amount || 0);

    if (currency === "PEN") {
      return `S/ ${value.toFixed(2)}`;
    }

    return `USD ${value.toFixed(2)}`;
  }

  formatDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  formatDisplayDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString("es-PE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  }

  timeToMinutes(value) {
    if (!value || typeof value !== "string") return null;

    const match = value.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

    return hours * 60 + minutes;
  }

  minutesToTimeLabel(minutes) {
    const value = Number(minutes);
    if (Number.isNaN(value)) return "";

    const hours = Math.floor(value / 60);
    const mins = value % 60;

    const suffix = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;

    return `${String(displayHour).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${suffix}`;
  }

  getNationalityLabel() {
    const option = this.packagesData?.nationalityOptions?.find((item) => item.code === this.nationality);
    return option?.label || this.nationality;
  }

  getInputValue(id) {
    return document.getElementById(id)?.value?.trim() || "";
  }

  setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  showSection(id) {
    const section = document.getElementById(id);
    if (section) section.hidden = false;
  }

  hideSection(id) {
    const section = document.getElementById(id);
    if (section) section.hidden = true;
  }

  escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  resolvePath(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;

    const cleanPath = String(path).replace(/^\.?\//, "");

    if (this.basePath.endsWith("/")) {
      return `${this.basePath}${cleanPath}`;
    }

    return `${this.basePath}/${cleanPath}`;
  }

  resolveAssetPath(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;

    const cleanPath = String(path).replace(/^\.?\//, "");

    if (cleanPath.startsWith("assets/")) {
      return this.resolvePath(cleanPath);
    }

    return this.resolvePath(`assets/${cleanPath}`);
  }

  getStableQuoteReference() {
    const key = "myCuscoTripQuoteReference";
    const existing = sessionStorage.getItem(key);

    if (existing) return existing;

    const now = new Date();
    const datePart = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0")
    ].join("");

    const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
    const reference = `COT-${datePart}-${randomPart}`;

    sessionStorage.setItem(key, reference);
    return reference;
  }

  getStablePrintCoupon() {
    const key = "myCuscoTripPrintCoupon";
    const existing = sessionStorage.getItem(key);

    if (existing) {
      try {
        return JSON.parse(existing);
      } catch (error) {
        sessionStorage.removeItem(key);
      }
    }

    const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
    const coupon = {
      code: `MCT-${randomPart}`,
      discount: 5
    };

    sessionStorage.setItem(key, JSON.stringify(coupon));
    return coupon;
  }
}

/* =========================================================
   PATCH 2026-05 - Adaptación cotizador a arquitectura modular
   - Soporta estructura antigua packages[] y nueva packageCards[].
   - Usa package-generator.js si está disponible para paquetes Cusco.
   - Mantiene compatibilidad con hoteles, trenes, extras, impresión y pago.
   ========================================================= */

MyCuscoTripQuotePackages.prototype.loadAllData = async function () {
  const [
    packagesPeruData,
    packagesCuscoData,
    toursCuscoData,
    toursMachuPicchuData,
    toursPeruData,
    trainsData,
    hotelsData,
    discountCodes
  ] = await Promise.all([
    this.fetchOptionalJson("assets/data/packages-peru.json"),
    this.fetchOptionalJson("assets/data/packages-cusco.json"),
    this.fetchOptionalJson("assets/data/tours-cusco.json"),
    this.fetchOptionalJson("assets/data/tours-machu-picchu.json"),
    this.fetchOptionalJson("assets/data/tours-peru.json"),
    this.fetchOptionalJson("assets/data/trains.json"),
    this.fetchOptionalJson("assets/data/hotels.json"),
    this.fetchOptionalJson("assets/data/discount-codes.json")
  ]);

  this.packagesPeruData = packagesPeruData || {};
  this.packagesCuscoData = packagesCuscoData || {};
  this.toursCuscoData = toursCuscoData || {};
  this.toursMachuPicchuData = toursMachuPicchuData || {};
  this.toursPeruData = toursPeruData || {};

  this.packagesData = this.buildQuotePackagesDataAdapter(this.packagesPeruData, this.packagesCuscoData);
  this.trainsData = trainsData || { routes: {}, trainCategories: {}, exchangeRate: { fallbackRate: 3.75 } };
  this.hotelsData = hotelsData || { destinations: {} };
  this.discountCodes = Array.isArray(discountCodes) ? discountCodes : [];

  this.exchangeRate = Number(this.trainsData?.exchangeRate?.fallbackRate || 3.75);

  this.tourIndex = this.buildQuoteTourIndex();
  this.staticPackages = this.extractLegacyQuotePackages();
  this.dynamicPackageCards = this.extractDynamicPackageCards();
  this.packages = [...this.staticPackages, ...this.dynamicPackageCards];

  await this.loadExchangeRate();
};

MyCuscoTripQuotePackages.prototype.buildQuotePackagesDataAdapter = function (packagesPeruData = {}, packagesCuscoData = {}) {
  const paymentOptions =
    packagesPeruData.paymentOptions ||
    packagesCuscoData.paymentOptions ||
    {
      quoteValidityDays: 2,
      partialPaymentPercent: 30,
      fullPaymentDiscountPercent: 0
    };

  const currencyRules =
    packagesPeruData.currencyRules ||
    packagesCuscoData.currencyRules ||
    {
      national: { allowedCurrencies: ["PEN", "USD"], defaultCurrency: "PEN" },
      foreign: { allowedCurrencies: ["USD"], defaultCurrency: "USD" },
      andean_community: { allowedCurrencies: ["USD"], defaultCurrency: "USD" }
    };

  return {
    version: "quote-adapter-2026-05",
    paymentOptions,
    currencyRules,
    packages: []
  };
};

MyCuscoTripQuotePackages.prototype.getProductsFromQuoteSource = function (source) {
  if (!source) return [];
  if (Array.isArray(source)) return source;
  if (Array.isArray(source.products)) return source.products;
  if (Array.isArray(source.tours)) return source.tours;
  return [];
};

MyCuscoTripQuotePackages.prototype.buildQuoteTourIndex = function () {
  const index = new Map();

  [
    ...this.getProductsFromQuoteSource(this.toursCuscoData),
    ...this.getProductsFromQuoteSource(this.toursMachuPicchuData),
    ...this.getProductsFromQuoteSource(this.toursPeruData)
  ].forEach((tour) => {
    if (!tour) return;
    [tour.internalCode, tour.code, tour.id, tour.slug].filter(Boolean).forEach((key) => {
      index.set(String(key), tour);
    });
  });

  return index;
};

MyCuscoTripQuotePackages.prototype.extractLegacyQuotePackages = function () {
  const legacy = [];

  [this.packagesPeruData, this.packagesCuscoData].forEach((source) => {
    if (Array.isArray(source?.packages)) {
      source.packages
        .filter((item) => item && item.status !== "draft" && item.status !== "archived" && item.status !== "hidden")
        .forEach((item) => legacy.push({ ...item, __quoteSource: "legacy" }));
    }
  });

  return legacy;
};

MyCuscoTripQuotePackages.prototype.extractDynamicPackageCards = function () {
  const cards = [];

  const addCards = (source, family) => {
    if (!Array.isArray(source?.packageCards)) return;

    source.packageCards
      .filter((card) => card && card.status !== "draft" && card.status !== "archived" && card.status !== "hidden")
      .forEach((card) => {
        cards.push({
          ...card,
          productKind: "package",
          productFamily: card.productFamily || family,
          __quoteSource: "packageCard",
          __sourceFamily: card.productFamily || family
        });
      });
  };

  addCards(this.packagesCuscoData, "cusco-package");
  addCards(this.packagesPeruData, "peru-package");

  return cards;
};

MyCuscoTripQuotePackages.prototype.getCompatiblePackages = function () {
  if (!this.travelDays || !this.travelNights) return [];

  return this.packages
    .filter((pkg) => Number(pkg.days) === this.travelDays && Number(pkg.nights) === this.travelNights)
    .map((pkg) => {
      if (pkg.__quoteSource === "packageCard") return this.buildQuotePackageFromCard(pkg);
      return pkg;
    })
    .filter(Boolean);
};

MyCuscoTripQuotePackages.prototype.buildQuotePackageFromCard = function (card) {
  const family = card.productFamily || card.__sourceFamily || "cusco-package";
  const isCuscoPackage = family === "cusco-package";
  const isPeruPackage = family === "peru-package";

  const options = isCuscoPackage
    ? this.buildCuscoDynamicItineraryOptions(card)
    : this.buildPeruQuoteItineraryOptions(card);

  const recommendedOption = options.find((option) => option.recommended) || options[0] || null;
  const accommodationSummary = this.getAccommodationSummaryForQuotePackage(card, recommendedOption);
  const basePricing = this.estimateQuoteBasePricing(card, recommendedOption);

  return {
    ...card,
    id: card.id || card.slug || `quote-${card.days}d${card.nights}n`,
    code: card.code || card.id || card.slug,
    title: card.title || `Paquete ${card.days} días / ${card.nights} noches`,
    currency: card.currency || card.defaultCurrency || "USD",
    basePricing,
    basePricingByNationality: card.basePricingByNationality || null,
    itineraryOptions: options,
    accommodationSummary,
    trainSelection: this.getTrainSelectionForQuotePackage(card, recommendedOption),
    extras: Array.isArray(card.extras) ? card.extras : [],
    includes: this.getQuotePackageIncludes(card, isPeruPackage),
    __quoteSource: "packageCard"
  };
};

MyCuscoTripQuotePackages.prototype.buildCuscoDynamicItineraryOptions = function (card) {
  const generator = window.MyCuscoTripPackageGenerator;
  let generated = [];

  if (generator && typeof generator.generatePackageOptions === "function") {
    generated = generator.generatePackageOptions(
      {
        days: Number(card.days || this.travelDays),
        nights: Number(card.nights || this.travelNights),
        arrivalTime: this.arrivalTime || "09:00",
        departureTime: this.departureTime || "20:00",
        productFamily: "cusco-package"
      },
      {
        data: {
          packagesCusco: this.packagesCuscoData,
          toursCusco: this.toursCuscoData,
          toursMachuPicchu: this.toursMachuPicchuData,
          toursPeru: this.toursPeruData
        }
      }
    );
  }

  if (!Array.isArray(generated) || !generated.length) {
    generated = [
      {
        ...card,
        includedTourCodes: Array.isArray(card.search?.includedTourCodes) ? card.search.includedTourCodes : [],
        generationReason: "quote-fallback"
      }
    ];
  }

  return generated.map((option, index) => this.adaptGeneratedOptionForQuote(card, option, index));
};

MyCuscoTripQuotePackages.prototype.buildPeruQuoteItineraryOptions = function (card) {
  const codes = Array.isArray(card.search?.includedTourCodes) ? card.search.includedTourCodes : [];

  return [
    {
      code: `${card.slug || card.id || "peru-package"}-ruta-sugerida`,
      label: "Ruta sugerida",
      recommended: true,
      summary: card.shortDescription || "Ruta multidestino de cotización flexible.",
      itinerary: this.buildSimpleItineraryFromCodes(codes, Number(card.days || this.travelDays), {
        peruMode: true,
        card
      }),
      includedTourCodes: codes,
      tourTitles: this.getTourTitlesFromCodes(codes),
      accommodationSummary: this.getAccommodationSummaryForPeruCard(card),
      trainMode: codes.some((code) => String(code).startsWith("MAPI")) ? "full_day" : "none",
      outboundRoute: "machu_picchu_full_day_outbound",
      returnRoute: "machu_picchu_return"
    }
  ];
};

MyCuscoTripQuotePackages.prototype.adaptGeneratedOptionForQuote = function (card, option, index) {
  const codes = Array.isArray(option.includedTourCodes)
    ? option.includedTourCodes
    : Array.isArray(card.search?.includedTourCodes)
      ? card.search.includedTourCodes
      : [];

  const itinerary = this.buildSimpleItineraryFromCodes(codes, Number(card.days || this.travelDays), {
    option,
    card
  });

  const letter = String.fromCharCode(65 + index);
  const title = index === 0 ? "Itinerario A · Recomendado" : `Itinerario ${letter}`;
  const trainMode = this.inferTrainModeFromCodes(codes);

  return {
    code: option.signature || option.id || `${card.slug || card.id}-option-${index}`,
    label: title,
    recommended: index === 0 || Boolean(option.recommended),
    summary: this.getOptionSummaryFromCodes(codes),
    itinerary,
    includedTourCodes: codes,
    tourTitles: this.getTourTitlesFromCodes(codes),
    accommodationSummary: this.getAccommodationSummaryForCuscoCodes(card, codes),
    trainMode,
    outboundRoute: this.getOutboundRouteForTrainMode(trainMode),
    returnRoute: trainMode === "none" ? "" : "machu_picchu_return"
  };
};

MyCuscoTripQuotePackages.prototype.getTourTitlesFromCodes = function (codes = []) {
  return codes.map((code) => {
    const tour = this.tourIndex?.get(String(code));
    return tour?.title || this.getFriendlyCodeLabel(code);
  });
};

MyCuscoTripQuotePackages.prototype.getFriendlyCodeLabel = function (code) {
  const labels = {
    arrival_transfer: "Traslado de llegada",
    departure_transfer: "Traslado de salida",
    CUZ001: "Bienvenida Ancestral",
    CUZ002: "City Tour Cusco",
    CUZ003FD: "Valle Sagrado",
    CUZ003CON: "Valle Sagrado conexión",
    CUZ003VIP: "Valle Sagrado VIP",
    CUZ003VIPCON: "Valle Sagrado VIP conexión",
    CUZ004: "Maras y Moray",
    CUZ005: "Valle Sur",
    CUZ006: "Laguna Humantay",
    CUZ007: "Montaña de Colores",
    CUZ008: "Palcoyo",
    CUZ009: "Siete Lagunas",
    MAPI001: "Machu Picchu Full Day",
    MAPI002: "Machu Picchu Express",
    MAPI003: "Machu Picchu Overnight",
    MAPI004: "Machu Picchu Overnight Express",
    PER001: "Lima",
    PER002: "Paracas e Ica",
    PER003: "Arequipa",
    PER004: "Puno"
  };

  return labels[code] || String(code || "Actividad");
};

MyCuscoTripQuotePackages.prototype.getOptionSummaryFromCodes = function (codes = []) {
  const titles = this.getTourTitlesFromCodes(codes).slice(0, 6);
  if (!titles.length) return "Ruta sugerida para la duración seleccionada.";
  return titles.join(" · ");
};

MyCuscoTripQuotePackages.prototype.buildSimpleItineraryFromCodes = function (codes = [], days = 1, options = {}) {
  const safeDays = Math.max(1, Number(days || 1));
  const remainingCodes = [...new Set(codes.filter(Boolean))];
  const itinerary = [];
  const used = new Set();

  const take = (matchFn) => {
    const code = remainingCodes.find((item) => !used.has(item) && matchFn(String(item)));
    if (code) used.add(code);
    return code;
  };

  const takeMany = (matchFn, max = 2) => {
    const result = [];
    remainingCodes.forEach((code) => {
      if (result.length >= max || used.has(code)) return;
      if (matchFn(String(code))) {
        used.add(code);
        result.push(code);
      }
    });
    return result;
  };

  const dayOneCodes = takeMany((code) => ["CUZ001", "CUZ002"].includes(code), 2);
  const valleyConnection = take((code) => ["CUZ003CON", "CUZ003VIPCON"].includes(code));
  const valleyFull = take((code) => ["CUZ003FD", "CUZ003VIP"].includes(code));
  const machuOvernight = take((code) => ["MAPI003", "MAPI004"].includes(code));
  const machuFull = take((code) => ["MAPI001", "MAPI002"].includes(code));

  const freeCodes = remainingCodes.filter((code) => !used.has(code));

  const pushDay = (day, title, dayCodes = [], description = "") => {
    const cleanCodes = dayCodes.filter(Boolean);
    itinerary.push({
      day,
      title: `Día ${day}: ${title}`,
      description: description || this.getDayDescriptionFromCodes(cleanCodes, title),
      tourCodes: cleanCodes
    });
  };

  if (dayOneCodes.length) {
    pushDay(1, "Bienvenida a Cusco", ["arrival_transfer", ...dayOneCodes], "Llegada a Cusco, traslado de bienvenida y primeras experiencias de aclimatación según tu itinerario.");
  } else if (valleyConnection) {
    pushDay(1, "Valle Sagrado conexión", ["arrival_transfer", valleyConnection], "Llegada a Cusco y salida hacia el Valle Sagrado con conexión hacia Machu Picchu Pueblo según la ruta seleccionada.");
  } else {
    pushDay(1, "Llegada a Cusco", ["arrival_transfer"], "Recepción en Cusco y tiempo de aclimatación antes de iniciar las experiencias principales.");
  }

  let day = 2;

  if (valleyConnection && !itinerary.some((item) => item.tourCodes?.includes(valleyConnection)) && day < safeDays) {
    pushDay(day++, "Valle Sagrado conexión", [valleyConnection], "Recorrido por el Valle Sagrado y conexión hacia Machu Picchu Pueblo.");
  }

  if (valleyFull && day < safeDays) {
    pushDay(day++, "Valle Sagrado de los Incas", [valleyFull], "Día dedicado a recorrer el Valle Sagrado y sus principales atractivos culturales.");
  }

  if (machuOvernight && day < safeDays) {
    pushDay(day++, "Machu Picchu", [machuOvernight], "Visita a Machu Picchu según el programa overnight seleccionado, con retorno coordinado a Cusco.");
  } else if (machuFull && day < safeDays) {
    pushDay(day++, "Machu Picchu Full Day", [machuFull], "Experiencia full day a Machu Picchu con tren, bus, ingreso y guía según disponibilidad.");
  }

  freeCodes.forEach((code) => {
    if (day >= safeDays) return;
    pushDay(day++, this.getFriendlyCodeLabel(code), [code]);
  });

  while (day < safeDays) {
    pushDay(day++, "Experiencia en Cusco", [], "Día disponible para actividades complementarias según la ruta seleccionada.");
  }

  if (safeDays > 1) {
    pushDay(safeDays, "Traslado de salida", ["departure_transfer"], "Traslado al aeropuerto o terminal terrestre de Cusco según tu horario de salida.");
  }

  return itinerary.slice(0, safeDays);
};

MyCuscoTripQuotePackages.prototype.getDayDescriptionFromCodes = function (codes = [], fallbackTitle = "") {
  const titles = this.getTourTitlesFromCodes(codes).filter((title) => !String(title).toLowerCase().includes("traslado"));
  if (!titles.length) return fallbackTitle || "Actividad programada según itinerario.";
  return `Incluye ${titles.join(", ")} dentro de la ruta seleccionada.`;
};

MyCuscoTripQuotePackages.prototype.inferTrainModeFromCodes = function (codes = []) {
  if (codes.some((code) => ["MAPI003", "MAPI004"].includes(code))) return "overnight";
  if (codes.some((code) => ["CUZ003CON", "CUZ003VIPCON"].includes(code))) return "sacred_valley_connection";
  if (codes.some((code) => ["MAPI001", "MAPI002"].includes(code))) return "full_day";
  return "none";
};

MyCuscoTripQuotePackages.prototype.getOutboundRouteForTrainMode = function (mode) {
  if (mode === "overnight" || mode === "sacred_valley_connection" || mode === "connection") {
    return "sacred_valley_connection_outbound";
  }

  if (mode === "none") return "";
  return "machu_picchu_full_day_outbound";
};

MyCuscoTripQuotePackages.prototype.getAccommodationSummaryForQuotePackage = function (card, option) {
  if (Array.isArray(option?.accommodationSummary) && option.accommodationSummary.length) return option.accommodationSummary;
  if (card.productFamily === "peru-package" || card.__sourceFamily === "peru-package") return this.getAccommodationSummaryForPeruCard(card);
  return this.getAccommodationSummaryForCuscoCodes(card, option?.includedTourCodes || card.search?.includedTourCodes || []);
};

MyCuscoTripQuotePackages.prototype.getAccommodationSummaryForCuscoCodes = function (card, codes = []) {
  const nights = Number(card.nights || this.travelNights || 0);
  const hasOvernightMachu = codes.some((code) => ["MAPI003", "MAPI004"].includes(code));
  const aguasNights = hasOvernightMachu ? 1 : 0;
  const cuscoNights = Math.max(0, nights - aguasNights);
  const summary = [];

  if (cuscoNights > 0) summary.push({ destination: "cusco", nights: cuscoNights });
  if (aguasNights > 0) summary.push({ destination: "aguas-calientes", nights: aguasNights });

  return summary;
};

MyCuscoTripQuotePackages.prototype.getAccommodationSummaryForPeruCard = function (card) {
  const nights = Number(card.nights || this.travelNights || 0);
  const destinations = Array.isArray(card.search?.destinations) ? card.search.destinations : [];
  const summary = [];

  if (destinations.includes("lima")) summary.push({ destination: "lima", nights: 1 });
  if (destinations.includes("arequipa")) summary.push({ destination: "arequipa", nights: 1 });
  if (destinations.includes("puno")) summary.push({ destination: "puno", nights: 1 });
  if (destinations.includes("paracas") || destinations.includes("ica")) summary.push({ destination: "ica", nights: 1 });

  const assigned = summary.reduce((total, item) => total + Number(item.nights || 0), 0);
  const remaining = Math.max(0, nights - assigned);
  if (remaining > 0) summary.push({ destination: "cusco", nights: remaining });

  return summary;
};

MyCuscoTripQuotePackages.prototype.getTrainSelectionForQuotePackage = function (card, option) {
  const codes = option?.includedTourCodes || card.search?.includedTourCodes || [];
  const mode = this.inferTrainModeFromCodes(codes);

  if (mode === "none") return { required: false, mode: "none" };

  return {
    required: true,
    mode,
    outboundRoute: this.getOutboundRouteForTrainMode(mode),
    returnRoute: "machu_picchu_return"
  };
};

MyCuscoTripQuotePackages.prototype.getQuotePackageIncludes = function (card, isPeruPackage = false) {
  if (Array.isArray(card.includes) && card.includes.length) return card.includes;

  if (isPeruPackage) {
    return [
      "Ruta sugerida multidestino",
      "Experiencias principales según itinerario",
      "Alojamiento configurable",
      "Trenes y servicios sujetos a disponibilidad",
      "Asesoría personalizada para ajustar la cotización"
    ];
  }

  return [
    "Traslados de llegada y salida",
    "Experiencias principales del itinerario seleccionado",
    "Machu Picchu según disponibilidad oficial",
    "Alojamiento configurable por destino",
    "Trenes turísticos seleccionables cuando aplica"
  ];
};

MyCuscoTripQuotePackages.prototype.estimateQuoteBasePricing = function (card, option) {
  if (card.basePricing?.adult) return card.basePricing;

  const codes = option?.includedTourCodes || card.search?.includedTourCodes || [];
  const totals = codes.reduce((acc, code) => {
    const tour = this.tourIndex?.get(String(code));
    const pricing = tour?.basePricing || tour?.pricing || {};
    const adult = Number(pricing.adult || pricing.publishedAdultUSD || pricing.price || 0);
    const child = Number(pricing.child || pricing.publishedChildUSD || pricing.adult || pricing.publishedAdultUSD || 0);

    acc.adult += Number.isFinite(adult) ? adult : 0;
    acc.child += Number.isFinite(child) ? child : adult;
    return acc;
  }, { adult: 0, child: 0 });

  if (totals.adult <= 0) {
    const fallbackAdult = Math.max(120, Number(card.days || this.travelDays || 1) * 70);
    return { adult: fallbackAdult, child: Math.round(fallbackAdult * 0.85), currency: "USD" };
  }

  return {
    adult: Number(totals.adult.toFixed(2)),
    child: Number((totals.child || totals.adult).toFixed(2)),
    currency: "USD"
  };
};

MyCuscoTripQuotePackages.prototype.renderPackageOptions = function () {
  const target = document.getElementById("packageOptions");
  if (!target) return;

  target.innerHTML = "";

  if (!this.travelDays || !this.travelNights) {
    target.innerHTML = `
      <div class="quote-empty-state">
        Selecciona tus fechas de viaje para detectar automáticamente el paquete compatible.
      </div>
    `;
    return;
  }

  const compatible = this.getCompatiblePackages();

  if (!compatible.length) {
    target.innerHTML = `
      <div class="quote-empty-state">
        No tenemos un paquete configurado para ${this.travelDays} días / ${this.travelNights} noches.
        Puedes ajustar las fechas o solicitar una versión personalizada.
      </div>
    `;
    return;
  }

  if (compatible.length <= 1 && this.selectedPackage) {
    target.innerHTML = "";
    return;
  }

  target.innerHTML = compatible.map((pkg) => {
    const selected = this.selectedPackage?.slug === pkg.slug;
    return `
      <article class="quote-package-card ${selected ? "is-selected" : ""}" data-package-slug="${this.escapeHtml(pkg.slug || pkg.id)}">
        <div class="quote-package-card__top">
          <div>
            <h3>${this.escapeHtml(pkg.title || "Paquete")}</h3>
            <p>${this.escapeHtml(pkg.shortDescription || `${pkg.days} días / ${pkg.nights} noches`)}</p>
          </div>
          <span class="quote-badge quote-badge--muted">${this.escapeHtml(pkg.days)}D / ${this.escapeHtml(pkg.nights)}N</span>
        </div>
      </article>
    `;
  }).join("");

  target.querySelectorAll(".quote-package-card").forEach((card) => {
    card.addEventListener("click", () => {
      const slug = card.dataset.packageSlug;
      const pkg = compatible.find((item) => (item.slug || item.id) === slug) || compatible[0];
      this.selectPackage(pkg);
    });
  });
};
/* =========================================================
   PATCH 2026-05-04 - Correcciones operativas cotizador
   - Hoteles: destinos con alias, precios más robustos y solo habitaciones compatibles.
   - Trenes: compatibilidad con rutas nuevas/antiguas y nacionalidad normalizada.
   - Horarios: llegada tarde y salida tarde sí afectan opciones de itinerario.
   ========================================================= */

MyCuscoTripQuotePackages.prototype.normalizeDestinationKeyForQuote = function (destination) {
  const raw = String(destination || "").toLowerCase().trim().replace(/_/g, "-");
  const aliases = {
    cusco: ["cusco", "cuzco"],
    "aguas-calientes": ["aguas-calientes", "aguas_calientes", "machu-picchu", "machu_picchu", "machu-picchu-pueblo", "machu_picchu_pueblo"],
    lima: ["lima"],
    ica: ["ica", "paracas", "paracas-ica", "paracas_ica"],
    arequipa: ["arequipa"],
    puno: ["puno"],
    "sacred-valley": ["sacred-valley", "sacred_valley", "valle-sagrado", "valle_sagrado"]
  };

  for (const [canonical, values] of Object.entries(aliases)) {
    if (values.includes(raw)) return canonical;
  }

  return raw;
};

MyCuscoTripQuotePackages.prototype.getDestinationAliasesForQuote = function (destination) {
  const canonical = this.normalizeDestinationKeyForQuote(destination);
  const aliases = {
    cusco: ["cusco", "cuzco"],
    "aguas-calientes": ["aguas-calientes", "aguas_calientes", "machu-picchu", "machu_picchu", "machu-picchu-pueblo", "machu_picchu_pueblo"],
    lima: ["lima"],
    ica: ["ica", "paracas", "paracas-ica", "paracas_ica"],
    arequipa: ["arequipa"],
    puno: ["puno"],
    "sacred-valley": ["sacred-valley", "sacred_valley", "valle-sagrado", "valle_sagrado"]
  };

  return [canonical, ...(aliases[canonical] || [])].filter(Boolean);
};

MyCuscoTripQuotePackages.prototype.getHotelsByDestination = function (destination) {
  const destinations = this.hotelsData?.destinations || {};
  const aliases = this.getDestinationAliasesForQuote(destination);

  for (const key of aliases) {
    const destinationData = destinations[key];
    if (Array.isArray(destinationData)) return destinationData;
    if (Array.isArray(destinationData?.hotels)) return destinationData.hotels;
  }

  const normalizedTarget = this.normalizeDestinationKeyForQuote(destination);
  const matchedKey = Object.keys(destinations).find((key) => {
    return this.normalizeDestinationKeyForQuote(key) === normalizedTarget;
  });

  if (matchedKey) {
    const destinationData = destinations[matchedKey];
    if (Array.isArray(destinationData)) return destinationData;
    if (Array.isArray(destinationData?.hotels)) return destinationData.hotels;
  }

  return [];
};

MyCuscoTripQuotePackages.prototype.getDestinationLabel = function (destination) {
  const aliases = this.getDestinationAliasesForQuote(destination);
  for (const key of aliases) {
    const destinationData = this.hotelsData?.destinations?.[key];
    if (destinationData?.label) return destinationData.label;
  }

  const labels = {
    cusco: "Cusco",
    "aguas-calientes": "Aguas Calientes",
    aguas_calientes: "Aguas Calientes",
    machu_picchu: "Machu Picchu Pueblo",
    "machu-picchu": "Machu Picchu Pueblo",
    lima: "Lima",
    ica: "Ica / Paracas",
    paracas: "Paracas",
    arequipa: "Arequipa",
    puno: "Puno",
    "sacred-valley": "Valle Sagrado",
    sacred_valley: "Valle Sagrado"
  };

  const normalized = this.normalizeDestinationKeyForQuote(destination);
  return labels[normalized] || labels[destination] || String(destination || "").replace(/_/g, " ").replace(/-/g, " ");
};

MyCuscoTripQuotePackages.prototype.getRoomPriceInfoForQuote = function (room = {}) {
  const rateObject = room.rates || room.prices || room.priceByCurrency || room.pricePerNightByCurrency || {};
  const preferredCurrency = this.quoteCurrency || room.currency || "USD";

  const candidates = [
    { value: room.pricePerNight, currency: room.currency },
    { value: room.price, currency: room.currency },
    { value: room.rate, currency: room.currency },
    { value: room.amount, currency: room.currency },
    { value: room.nightlyRate, currency: room.currency },
    { value: room.pricePerNightUSD, currency: "USD" },
    { value: room.priceUSD, currency: "USD" },
    { value: room.rateUSD, currency: "USD" },
    { value: room.pricePerNightPEN, currency: "PEN" },
    { value: room.pricePEN, currency: "PEN" },
    { value: room.ratePEN, currency: "PEN" },
    { value: rateObject[preferredCurrency], currency: preferredCurrency },
    { value: rateObject.USD, currency: "USD" },
    { value: rateObject.PEN, currency: "PEN" }
  ];

  const found = candidates.find((item) => Number(item.value) > 0);
  return {
    pricePerNight: found ? Number(found.value) : 0,
    currency: found?.currency || room.currency || preferredCurrency || "USD"
  };
};

MyCuscoTripQuotePackages.prototype.normalizeRoomForQuote = function (room = {}) {
  const priceInfo = this.getRoomPriceInfoForQuote(room);
  const capacity = Number(room.capacity || room.maxOccupancy || room.maxGuests || room.guests || room.occupancy || 1);
  const minOccupancy = Number(room.minOccupancy || room.minGuests || 1);
  const roomCode = room.roomCode || room.code || room.id || room.roomType || room.roomName || room.label || "room";
  const roomName = room.roomName || room.name || room.label || room.roomType || "Habitación";

  return {
    ...room,
    roomCode,
    roomName,
    capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : 1,
    minOccupancy: Number.isFinite(minOccupancy) && minOccupancy > 0 ? minOccupancy : 1,
    pricePerNight: priceInfo.pricePerNight,
    currency: priceInfo.currency || "USD"
  };
};

MyCuscoTripQuotePackages.prototype.isRoomExactForPassengers = function (room, passengers) {
  if (!room) return false;
  if (room.roomCode === "no-room" || room.roomType === "no-room") return true;
  const safePassengers = Math.max(1, Number(passengers || 1));
  const capacity = Number(room.capacity || 1);
  const minOccupancy = Number(room.minOccupancy || 1);
  return capacity === safePassengers || (minOccupancy === safePassengers && capacity === safePassengers);
};

MyCuscoTripQuotePackages.prototype.generateAccommodationCombinations = function (rooms = [], passengers = 1, nights = 1) {
  const safePassengers = Math.max(1, Number(passengers || 1));
  const safeNights = Math.max(0, Number(nights || 0));

  if (!Array.isArray(rooms) || !rooms.length) {
    return [{ key: "no-room", label: "Sin habitación", description: "No se agregará costo de alojamiento.", total: 0, currency: this.quoteCurrency, rooms: [] }];
  }

  const normalizedRooms = rooms.map((room) => this.normalizeRoomForQuote(room));
  const noRoom = normalizedRooms.find((room) => room.roomCode === "no-room" || room.roomType === "no-room");
  if (noRoom) return [{ key: "no-room", label: "Sin habitación", description: "No se agregará costo de alojamiento.", total: 0, currency: this.quoteCurrency, rooms: [] }];

  let compatibleRooms = normalizedRooms.filter((room) => this.isRoomExactForPassengers(room, safePassengers));
  if (!compatibleRooms.length) compatibleRooms = normalizedRooms.filter((room) => Number(room.capacity || 0) >= safePassengers);

  const combinations = compatibleRooms.map((room) => ({
    key: `${room.roomCode}-x1`,
    label: `${room.roomName} x 1`,
    description: `${safeNights} noche${safeNights !== 1 ? "s" : ""}`,
    total: Number(room.pricePerNight || 0) * safeNights,
    currency: room.currency || this.quoteCurrency,
    rooms: [{ room, quantity: 1 }]
  }));

  if (!combinations.length) {
    const sortedRooms = normalizedRooms.filter((room) => Number(room.capacity || 0) > 0).sort((a, b) => Number(a.capacity || 0) - Number(b.capacity || 0));
    sortedRooms.forEach((room) => {
      const quantity = Math.ceil(safePassengers / Math.max(1, Number(room.capacity || 1)));
      combinations.push({
        key: `${room.roomCode}-x${quantity}`,
        label: `${room.roomName} x ${quantity}`,
        description: `${safeNights} noche${safeNights !== 1 ? "s" : ""}`,
        total: Number(room.pricePerNight || 0) * safeNights * quantity,
        currency: room.currency || this.quoteCurrency,
        rooms: [{ room, quantity }]
      });
    });
  }

  combinations.sort((a, b) => this.convertCurrency(a.total, a.currency, this.quoteCurrency) - this.convertCurrency(b.total, b.currency, this.quoteCurrency));
  return combinations;
};

MyCuscoTripQuotePackages.prototype.normalizeTrainNationalityValue = function (value) {
  const raw = String(value || "").toLowerCase().trim().replace(/\s+/g, "_").replace(/-/g, "_");
  const aliases = {
    national: "national", peruvian: "national", peruano: "national", peru: "national", pe: "national", peruvian_national: "national",
    foreign: "foreign", foreigner: "foreign", international: "foreign", general: "general", all: "general",
    andean: "andean_community", andean_community: "andean_community", comunidad_andina: "andean_community"
  };
  return aliases[raw] || raw;
};

MyCuscoTripQuotePackages.prototype.isTrainAllowedForNationality = function (train) {
  if (!train) return false;
  const current = this.normalizeTrainNationalityValue(this.nationality);
  const allowed = Array.isArray(train.allowedNationalities) ? train.allowedNationalities.map((item) => this.normalizeTrainNationalityValue(item)) : [];
  const notAllowed = Array.isArray(train.notAllowedNationalities) ? train.notAllowedNationalities.map((item) => this.normalizeTrainNationalityValue(item)) : [];
  const market = this.normalizeTrainNationalityValue(train.market || train.audience || train.passengerType || "general");
  if (notAllowed.includes(current)) return false;
  if (allowed.length && !allowed.includes(current) && !allowed.includes("general")) return false;
  if (train.isLocalTrain && current !== "national") return false;
  if (market === "national" && current !== "national") return false;
  if (market === "foreign" && current === "national") return false;
  return true;
};

MyCuscoTripQuotePackages.prototype.getTrainRouteAliasesForQuote = function (routeCode) {
  const aliases = {
    machu_picchu_full_day_outbound: ["machu_picchu_full_day_outbound", "CUSCO_MAPI", "CUSCO_MAPI_BIMODAL", "CUSCO_MAPI_DIRECT", "POROY_MAPI", "WANCHAQ_MAPI", "OLLA_MAPI", "OLLANTAYTAMBO_MAPI", "SACRED_VALLEY_MAPI"],
    sacred_valley_connection_outbound: ["sacred_valley_connection_outbound", "OLLA_MAPI", "OLLANTAYTAMBO_MAPI", "SACRED_VALLEY_MAPI"],
    machu_picchu_return: ["machu_picchu_return", "MAPI_CUSCO", "MAPI_WANCHAQ", "MAPI_POROY", "MAPI_OLLA", "MAPI_OLLANTAYTAMBO"]
  };
  return aliases[routeCode] || [routeCode];
};

MyCuscoTripQuotePackages.prototype.collectTrainOptionsForRoute = function (routeCode) {
  const routes = this.trainsData?.routes || {};
  const aliases = this.getTrainRouteAliasesForQuote(routeCode);
  const options = [];

  aliases.forEach((alias) => {
    const route = routes[alias];
    if (Array.isArray(route?.options)) route.options.forEach((train) => options.push({ ...train, __routeKey: alias }));
  });

  Object.entries(routes).forEach(([key, route]) => {
    const routeOptions = Array.isArray(route?.options) ? route.options : [];
    routeOptions.forEach((train) => {
      const trainRoute = train.route || train.routeCode || train.routeKey || train.direction || key;
      if (aliases.includes(trainRoute) || aliases.includes(key)) options.push({ ...train, __routeKey: key });
    });
  });

  const flatOptions = Array.isArray(this.trainsData?.trains) ? this.trainsData.trains : [];
  flatOptions.forEach((train) => {
    const trainRoute = train.route || train.routeCode || train.routeKey || train.direction;
    if (aliases.includes(trainRoute)) options.push({ ...train, __routeKey: trainRoute });
  });

  const seen = new Set();
  return options.filter((train) => {
    const code = train.code || train.trainCode || train.id || `${train.company}-${train.serviceName}-${train.departureTime}-${train.arrivalTime}`;
    if (seen.has(code)) return false;
    seen.add(code);
    return true;
  });
};

MyCuscoTripQuotePackages.prototype.getTrainRouteForQuote = function (routeCode) {
  const existing = this.trainsData?.routes?.[routeCode];
  if (existing && Array.isArray(existing.options) && existing.options.length) return existing;
  const options = this.collectTrainOptionsForRoute(routeCode);
  if (!options.length) return existing || null;
  return { code: routeCode, label: existing?.label || routeCode, description: existing?.description || "Selecciona una opción de tren disponible para esta ruta.", options };
};

MyCuscoTripQuotePackages.prototype.getTrainByCode = function (routeCode, trainCode) {
  if (!routeCode || !trainCode) return null;
  const route = this.getTrainRouteForQuote(routeCode);
  const options = Array.isArray(route?.options) ? route.options : [];
  return options.find((train) => train.code === trainCode || train.trainCode === trainCode || train.id === trainCode) || null;
};

MyCuscoTripQuotePackages.prototype.renderTrainModalOptions = function (routeCode) {
  const list = document.getElementById("trainSelectionModalList");
  if (!list) return;
  const route = this.getTrainRouteForQuote(routeCode);
  const allOptions = Array.isArray(route?.options) ? route.options : [];
  const options = allOptions.filter((train) => this.isTrainAllowedForNationality(train));

  if (!options.length) {
    list.innerHTML = `<div class="quote-empty-state">No hay trenes disponibles para esta ruta y nacionalidad seleccionada. Revisa que trains.json tenga opciones para ${this.escapeHtml(routeCode)} o sus rutas equivalentes.</div>`;
    return;
  }

  list.innerHTML = options.map((train) => {
    const trainCode = train.code || train.trainCode || train.id || "";
    const isSelected = this.pendingTrainCode === trainCode;
    const category = this.trainsData?.trainCategories?.[train.categoryCode] || {};
    const logo = this.getTrainCompanyLogo(train);
    const companyLabel = this.getTrainCompanyLabel(train);
    const displayName = this.getTrainDisplayName(train);
    const price = this.getTrainPriceInQuoteCurrency(train);
    const isLocal = Boolean(train.isLocalTrain || train.categoryCode === "local_train");
    const recommended = Boolean(train.isRecommended);

    return `
      <article class="train-option-card ${isSelected ? "is-selected" : ""} ${isLocal ? "train-option-card--local" : ""}" data-train-code="${this.escapeHtml(trainCode)}" data-route-code="${this.escapeHtml(routeCode)}">
        <div class="train-option-card__header">
          <div class="train-option-card__company">
            ${logo ? `<img class="train-option-card__logo" src="${this.escapeHtml(logo)}" alt="${this.escapeHtml(companyLabel)}" loading="lazy" />` : ""}
            <div><h3>${this.escapeHtml(displayName)}</h3><p>${this.escapeHtml(companyLabel)} · ${this.escapeHtml(train.displayCategory || category.displayCategory || train.categoryCode || "Tren")}</p>${recommended ? `<span class="train-recommended-badge">Recomendado</span>` : ""}</div>
          </div>
          <div class="train-option-card__price">${this.formatCurrency(price, this.quoteCurrency)}</div>
        </div>
        <div class="train-option-card__body">
          <div class="train-option-card__schedule">
            <div><span>Salida</span><strong>${this.escapeHtml(this.formatTrainTime(train.departureTime))}</strong><small>${this.escapeHtml(train.origin || train.departureStation || "Por confirmar")}</small></div>
            <div><span>Llegada</span><strong>${this.escapeHtml(this.formatTrainTime(train.arrivalTime))}</strong><small>${this.escapeHtml(train.destination || train.arrivalStation || "Por confirmar")}</small></div>
            <div><span>Duración</span><strong>${this.escapeHtml(train.duration || "Por confirmar")}</strong><small>${this.escapeHtml(train.transferInfo || train.routeType || train.route || "Tren")}</small></div>
          </div>
          <p class="train-option-card__description">${this.escapeHtml(category.shortDescription || train.description || "Opción de tren disponible para Machu Picchu.")}</p>
          ${train.warning || category.importantMessage ? `<p class="train-option-card__warning">${this.escapeHtml(train.warning || category.importantMessage)}</p>` : ""}
          <div class="train-option-card__actions">
            <button type="button" class="btn quote-main-btn select-train-option-btn" data-train-code="${this.escapeHtml(trainCode)}">${isSelected ? "Seleccionado" : "Seleccionar tren"}</button>
            <button type="button" class="btn quote-secondary-btn view-train-details-btn" data-route-code="${this.escapeHtml(routeCode)}" data-train-code="${this.escapeHtml(trainCode)}">Ver detalles</button>
          </div>
        </div>
      </article>`;
  }).join("");

  list.querySelectorAll(".select-train-option-btn").forEach((button) => button.addEventListener("click", () => { this.pendingTrainCode = button.dataset.trainCode || ""; this.renderTrainModalOptions(routeCode); }));
  list.querySelectorAll(".view-train-details-btn").forEach((button) => button.addEventListener("click", () => this.openTrainDetailsModal(button.dataset.routeCode, button.dataset.trainCode)));
  list.querySelectorAll(".train-option-card").forEach((card) => card.addEventListener("click", (event) => { if (event.target.closest("button")) return; this.pendingTrainCode = card.dataset.trainCode || ""; this.renderTrainModalOptions(routeCode); }));
};

MyCuscoTripQuotePackages.prototype.openTrainSelectionModal = function (direction) {
  if (!this.selectedPackage || !this.selectedItineraryOption) return;
  const trainConfig = this.getTrainSelectionConfig();
  const routeCode = direction === "outbound" ? trainConfig.outboundRoute : trainConfig.returnRoute;
  this.activeTrainDirection = direction;
  this.pendingTrainCode = direction === "outbound" ? this.selectedOutboundTrainCode : this.selectedReturnTrainCode;
  const modal = document.getElementById("trainSelectionModal");
  const title = document.getElementById("trainSelectionModalTitle");
  const intro = document.getElementById("trainSelectionModalIntro");
  if (!modal) return;
  const route = this.getTrainRouteForQuote(routeCode);
  const directionLabel = direction === "outbound" ? "ida" : "retorno";
  if (title) title.textContent = `Elige tu tren de ${directionLabel}`;
  if (intro) intro.textContent = route?.description || "Selecciona una opción disponible para completar la cotización.";
  this.renderTrainModalOptions(routeCode);
  modal.hidden = false;
  document.body.classList.add("quote-modal-open");
};

MyCuscoTripQuotePackages.prototype.getTrainPriceInQuoteCurrency = function (train) {
  if (!train) return 0;
  const rawPrice = Number(train.pricePerPerson || train.price || train.amount || train.adultCostUSD || train.adultCost || train.priceUSD || train.fareUSD || 0);
  const currency = train.currency || (train.adultCostUSD || train.priceUSD || train.fareUSD ? "USD" : this.quoteCurrency);
  return this.convertCurrency(rawPrice, currency, this.quoteCurrency);
};

MyCuscoTripQuotePackages.prototype.getTrainDisplayName = function (train) {
  if (!train) return "Sin selección";
  return train.serviceName || train.name || train.label || train.displayName || train.trainCode || train.code || "Tren seleccionado";
};

MyCuscoTripQuotePackages.prototype.getTrainShortScheduleText = function (train, direction = "") {
  if (!train) return "Selecciona horario y categoría.";
  const from = train.origin || train.departureStation || "Origen por confirmar";
  const to = train.destination || train.arrivalStation || "Destino por confirmar";
  const depart = this.formatTrainTime(train.departureTime);
  const arrive = this.formatTrainTime(train.arrivalTime);
  if (!train.departureTime && !train.arrivalTime) return train.warning || "Horario sujeto a disponibilidad.";
  const label = direction === "return" ? "Retorno" : "Ida";
  return `${label}: ${depart} - ${arrive} · ${from} → ${to}`;
};

MyCuscoTripQuotePackages.prototype.getTrainSelectionConfig = function () {
  const packageConfig = this.selectedPackage?.trainSelection || {};
  const optionTrainMode = this.selectedItineraryOption?.trainMode || packageConfig.mode || "full_day";
  const modeRoutes = {
    full_day: { outboundRoute: "machu_picchu_full_day_outbound", returnRoute: "machu_picchu_return" },
    express: { outboundRoute: "machu_picchu_full_day_outbound", returnRoute: "machu_picchu_return" },
    sacred_valley_connection: { outboundRoute: "sacred_valley_connection_outbound", returnRoute: "machu_picchu_return" },
    connection: { outboundRoute: "sacred_valley_connection_outbound", returnRoute: "machu_picchu_return" },
    overnight: { outboundRoute: "sacred_valley_connection_outbound", returnRoute: "machu_picchu_return" },
    mixed: { outboundRoute: "machu_picchu_full_day_outbound", returnRoute: "machu_picchu_return" },
    none: { outboundRoute: "", returnRoute: "" }
  };
  const fallbackRoutes = modeRoutes[optionTrainMode] || modeRoutes.full_day;
  let outboundRoute = this.selectedItineraryOption?.outboundRoute || packageConfig.outboundRoute || fallbackRoutes.outboundRoute;
  let returnRoute = this.selectedItineraryOption?.returnRoute || packageConfig.returnRoute || fallbackRoutes.returnRoute;
  if (!outboundRoute || outboundRoute === "dynamic_by_itinerary_option") outboundRoute = fallbackRoutes.outboundRoute;
  if (!returnRoute || returnRoute === "dynamic_by_itinerary_option") returnRoute = fallbackRoutes.returnRoute;
  const required = packageConfig.required !== false && optionTrainMode !== "none";
  return { required, mode: optionTrainMode, outboundRoute, returnRoute };
};

MyCuscoTripQuotePackages.prototype.isOnlyTransferDay = function (dayItem) {
  if (!dayItem) return false;
  const tourCodes = Array.isArray(dayItem.tourCodes) ? dayItem.tourCodes : [];
  const realTourCodes = tourCodes.filter((code) => !["arrival_transfer", "departure_transfer", "free_day"].includes(String(code)));
  if (realTourCodes.length) return false;
  const text = `${dayItem.title || ""} ${dayItem.description || ""}`.toLowerCase();
  return tourCodes.includes("arrival_transfer") || tourCodes.includes("departure_transfer") || text.includes("traslado de llegada") || text.includes("traslado de salida") || text.includes("día libre") || text.includes("dia libre") || text.includes("recepción") || text.includes("recojo del aeropuerto");
};

MyCuscoTripQuotePackages.prototype.getItineraryDayStartMinutes = function (dayItem) {
  if (!dayItem) return null;
  const directTime = dayItem.startTime || dayItem.start || dayItem.startHour || dayItem.horaInicio || dayItem.hora_inicio || dayItem.timeStart;
  const directMinutes = this.timeToMinutes(directTime);
  if (directMinutes !== null) return directMinutes;
  const codes = Array.isArray(dayItem.tourCodes) ? dayItem.tourCodes.map(String) : [];
  const text = `${dayItem.title || ""} ${dayItem.description || ""} ${codes.join(" ")}`.toLowerCase();
  if (codes.some((code) => ["MAPI001", "MAPI002", "CUZ006", "CUZ007", "CUZ008", "CUZ009"].includes(code))) return this.timeToMinutes("04:00");
  if (codes.some((code) => ["CUZ003FD", "CUZ003CON", "CUZ003VIP", "CUZ003VIPCON"].includes(code))) return this.timeToMinutes("07:00");
  if (codes.some((code) => ["CUZ004", "CUZ005"].includes(code))) return this.timeToMinutes("08:30");
  if (codes.includes("CUZ001")) return this.timeToMinutes("09:00");
  if (codes.includes("CUZ002")) return this.timeToMinutes("13:00");
  if (text.includes("machu picchu full day") || text.includes("machu picchu express")) return this.timeToMinutes("04:00");
  if (text.includes("vinicunca") || text.includes("montaña de colores") || text.includes("humantay") || text.includes("siete lagunas") || text.includes("ausangate")) return this.timeToMinutes("04:00");
  if (text.includes("valle sagrado")) return this.timeToMinutes("07:00");
  if (text.includes("maras") || text.includes("moray") || text.includes("valle sur")) return this.timeToMinutes("08:30");
  if (text.includes("city tour")) return this.timeToMinutes("13:00");
  if (text.includes("bienvenida") || text.includes("ancestral")) return this.timeToMinutes("09:00");
  return null;
};

MyCuscoTripQuotePackages.prototype.getItineraryDayEndMinutes = function (dayItem) {
  if (!dayItem) return null;
  const directTime = dayItem.endTime || dayItem.end || dayItem.endHour || dayItem.horaFin || dayItem.hora_fin || dayItem.timeEnd;
  const directMinutes = this.timeToMinutes(directTime);
  if (directMinutes !== null) return directMinutes;
  const codes = Array.isArray(dayItem.tourCodes) ? dayItem.tourCodes.map(String) : [];
  const text = `${dayItem.title || ""} ${dayItem.description || ""} ${codes.join(" ")}`.toLowerCase();
  if (codes.some((code) => ["MAPI001"].includes(code))) return this.timeToMinutes("23:30");
  if (codes.some((code) => ["MAPI002"].includes(code))) return this.timeToMinutes("19:00");
  if (codes.some((code) => ["CUZ006", "CUZ007", "CUZ008", "CUZ009"].includes(code))) return this.timeToMinutes("17:00");
  if (codes.some((code) => ["CUZ003FD", "CUZ003CON", "CUZ003VIP", "CUZ003VIPCON"].includes(code))) return this.timeToMinutes("18:30");
  if (codes.some((code) => ["CUZ004", "CUZ005"].includes(code))) return this.timeToMinutes("15:00");
  if (codes.includes("CUZ002")) return this.timeToMinutes("18:00");
  if (codes.includes("CUZ001")) return this.timeToMinutes("16:00");
  if (text.includes("machu picchu full day")) return this.timeToMinutes("23:30");
  if (text.includes("machu picchu express")) return this.timeToMinutes("19:00");
  if (text.includes("vinicunca") || text.includes("montaña de colores") || text.includes("humantay") || text.includes("siete lagunas") || text.includes("ausangate")) return this.timeToMinutes("17:00");
  if (text.includes("maras") || text.includes("moray") || text.includes("valle sur")) return this.timeToMinutes("15:00");
  if (text.includes("city tour") || text.includes("bienvenida") || text.includes("ancestral")) return this.timeToMinutes("18:00");
  return null;
};

MyCuscoTripQuotePackages.prototype.buildSimpleItineraryFromCodes = function (codes = [], days = 1, options = {}) {
  const safeDays = Math.max(1, Number(days || 1));
  const allCodes = [...new Set(codes.filter(Boolean).map(String))];
  const itinerary = [];
  const used = new Set();
  const arrivalMinutes = this.getEffectiveArrivalMinutes();
  const departureMinutes = this.getEffectiveDepartureMinutes();
  const canUseFirstDay = arrivalMinutes === null || arrivalMinutes <= this.timeToMinutes("14:00");
  const canUseLastDay = departureMinutes === null || departureMinutes >= this.timeToMinutes("17:00");

  const takeMany = (matchFn, max = 2) => {
    const result = [];
    allCodes.forEach((code) => {
      if (result.length >= max || used.has(code)) return;
      if (matchFn(code)) { used.add(code); result.push(code); }
    });
    return result;
  };
  const takeOne = (matchFn) => takeMany(matchFn, 1)[0] || "";
  const pushDay = (day, title, dayCodes = [], description = "") => {
    const cleanCodes = dayCodes.filter(Boolean);
    itinerary.push({ day, title: `Día ${day}: ${title}`, description: description || this.getDayDescriptionFromCodes(cleanCodes, title), tourCodes: cleanCodes });
  };

  if (canUseFirstDay) {
    const dayOneCodes = takeMany((code) => ["CUZ001", "CUZ002"].includes(code), 2);
    if (dayOneCodes.length) pushDay(1, "Bienvenida a Cusco", ["arrival_transfer", ...dayOneCodes], "Llegada a Cusco, traslado de bienvenida y primeras experiencias de aclimatación según tu itinerario.");
    else pushDay(1, "Llegada a Cusco", ["arrival_transfer"], "Recepción en Cusco y tiempo de aclimatación antes de iniciar las experiencias principales.");
  } else {
    pushDay(1, "Llegada a Cusco", ["arrival_transfer"], "Recepción en Cusco y descanso. Por tu horario de llegada, este día queda libre para aclimatarte.");
  }

  const valleyConnection = takeOne((code) => ["CUZ003CON", "CUZ003VIPCON"].includes(code));
  const valleyFull = takeOne((code) => ["CUZ003FD", "CUZ003VIP"].includes(code));
  const machuOvernight = takeOne((code) => ["MAPI003", "MAPI004"].includes(code));
  const machuFull = takeOne((code) => ["MAPI001", "MAPI002"].includes(code));
  let day = 2;
  const middleLimit = safeDays - 1;
  const addMiddle = (title, dayCodes, description = "") => {
    if (day <= middleLimit) pushDay(day++, title, dayCodes, description);
    else dayCodes.forEach((code) => used.delete(code));
  };

  if (valleyConnection) addMiddle("Valle Sagrado conexión", [valleyConnection], "Recorrido por el Valle Sagrado y conexión hacia Machu Picchu Pueblo.");
  if (valleyFull) addMiddle("Valle Sagrado de los Incas", [valleyFull], "Día dedicado a recorrer el Valle Sagrado y sus principales atractivos culturales.");
  if (machuOvernight) addMiddle("Machu Picchu", [machuOvernight], "Visita a Machu Picchu según el programa overnight seleccionado, con retorno coordinado a Cusco.");
  else if (machuFull) addMiddle("Machu Picchu Full Day", [machuFull], "Experiencia full day a Machu Picchu con tren, bus, ingreso y guía según disponibilidad.");

  const lastDayPriority = ["CUZ006", "CUZ007", "CUZ008", "CUZ009", "CUZ004", "CUZ005", "CUZ003FD", "CUZ003VIP", "CUZ001", "CUZ002"];
  let lastDayTour = "";
  if (canUseLastDay && safeDays > 1) {
    lastDayTour = lastDayPriority.find((code) => allCodes.includes(code) && !used.has(code)) || "";
    if (lastDayTour) used.add(lastDayTour);
  }

  allCodes.forEach((code) => {
    if (used.has(code)) return;
    if (day <= middleLimit) { used.add(code); pushDay(day++, this.getFriendlyCodeLabel(code), [code]); }
  });

  while (day <= middleLimit) pushDay(day++, "Experiencia en Cusco", [], "Día disponible para actividades complementarias según la ruta seleccionada.");

  if (safeDays > 1) {
    if (lastDayTour) pushDay(safeDays, `${this.getFriendlyCodeLabel(lastDayTour)} y traslado de salida`, [lastDayTour, "departure_transfer"], `Última experiencia del viaje: ${this.getFriendlyCodeLabel(lastDayTour)}. Luego realizaremos el traslado al aeropuerto o terminal terrestre según tu horario de salida.`);
    else pushDay(safeDays, "Traslado de salida", ["departure_transfer"], "Traslado al aeropuerto o terminal terrestre de Cusco según tu horario de salida.");
  }
  return itinerary.slice(0, safeDays);
};


/* =========================================================
   PATCH FINAL - Cotizador hoteles, trenes y opciones dinámicas
   - Carga múltiples opciones usando package-generator.js.
   - Lee precios nuevos de hoteles publishedPricing.amount.
   - Lee precios nuevos de trenes price.adult / price.child.
   - Usa trenes como diferencia respecto al tren base incluido.
   - Selecciona por defecto el primer hotel real, no "sin hotel".
   ========================================================= */

MyCuscoTripQuotePackages.prototype.getRoomPriceInfoForQuote = function (room = {}) {
  const rateObject = room.rates || room.prices || room.priceByCurrency || room.pricePerNightByCurrency || {};
  const published = room.publishedPricing || room.publicPricing || room.displayPricing || {};
  const preferredCurrency = this.quoteCurrency || published.currency || room.currency || "USD";

  const candidates = [
    { value: published.amount, currency: published.currency || "USD" },
    { value: published.adult, currency: published.currency || "USD" },
    { value: published.price, currency: published.currency || "USD" },
    { value: room.pricePerNight, currency: room.currency },
    { value: room.price, currency: room.currency },
    { value: room.rate, currency: room.currency },
    { value: room.amount, currency: room.currency },
    { value: room.nightlyRate, currency: room.currency },
    { value: room.pricePerNightUSD, currency: "USD" },
    { value: room.priceUSD, currency: "USD" },
    { value: room.rateUSD, currency: "USD" },
    { value: room.pricePerNightPEN, currency: "PEN" },
    { value: room.pricePEN, currency: "PEN" },
    { value: room.ratePEN, currency: "PEN" },
    { value: rateObject[preferredCurrency], currency: preferredCurrency },
    { value: rateObject.USD, currency: "USD" },
    { value: rateObject.PEN, currency: "PEN" }
  ];

  const found = candidates.find((item) => Number(item.value) > 0);
  return {
    pricePerNight: found ? Number(found.value) : 0,
    currency: found?.currency || published.currency || room.currency || preferredCurrency || "USD"
  };
};

MyCuscoTripQuotePackages.prototype.getDefaultHotelForDestination = function (destination) {
  const hotels = this.getHotelsByDestination(destination);
  return hotels.find((hotel) => hotel && hotel.status !== "hidden" && hotel.status !== "archived") || this.getNoHotelOption(destination);
};

MyCuscoTripQuotePackages.prototype.refreshAccommodationSelections = function () {
  if (!this.selectedPackage) return;

  const summary = this.getAccommodationSummary();
  const passengers = this.getTotalPassengers();

  summary.forEach((item) => {
    const destination = item.destination;
    const hotels = this.getHotelsByDestination(destination);
    const noHotel = this.getNoHotelOption(destination);

    let hotelCode = this.selectedHotelsByDestination[destination];
    let hotel = null;

    if (hotelCode === "no-hotel") {
      hotel = noHotel;
    } else if (hotelCode) {
      hotel = this.getHotelByCode(destination, hotelCode);
    }

    if (!hotel) {
      hotel = hotels[0] || noHotel;
      hotelCode = hotel.hotelCode;
      this.selectedHotelsByDestination[destination] = hotelCode;
    }

    const combinations = this.generateAccommodationCombinations(
      hotel.rooms || [],
      passengers,
      Number(item.nights || 0)
    );

    const currentCombinationKey = this.selectedCombinationsByDestination[destination];
    const stillValid = combinations.some((combo) => combo.key === currentCombinationKey);

    if (!stillValid) {
      this.selectedCombinationsByDestination[destination] = combinations[0]?.key || "";
    }
  });

  this.renderAccommodationOptions();
};

MyCuscoTripQuotePackages.prototype.getSelectedAccommodationForDestination = function (destination) {
  let hotelCode = this.selectedHotelsByDestination[destination];
  let hotel = null;

  if (hotelCode === "no-hotel") {
    hotel = this.getNoHotelOption(destination);
  } else if (hotelCode) {
    hotel = this.getHotelByCode(destination, hotelCode);
  }

  if (!hotel) {
    hotel = this.getDefaultHotelForDestination(destination);
    this.selectedHotelsByDestination[destination] = hotel.hotelCode;
  }

  const summary = this.getAccommodationSummary().find((item) => item.destination === destination);
  const nights = Number(summary?.nights || 0);
  const combinations = this.generateAccommodationCombinations(hotel.rooms || [], this.getTotalPassengers(), nights);
  const selectedCombinationKey = this.selectedCombinationsByDestination[destination];
  const combination = combinations.find((item) => item.key === selectedCombinationKey) || combinations[0] || null;

  if (combination && this.selectedCombinationsByDestination[destination] !== combination.key) {
    this.selectedCombinationsByDestination[destination] = combination.key;
  }

  return { hotel, combination };
};

MyCuscoTripQuotePackages.prototype.getTrainRawPrice = function (train, passengerType = "adult") {
  if (!train) return 0;

  const priceObject = train.price || train.pricing || train.fare || train.rates || train.prices || {};
  const childKeys = [priceObject.child, priceObject.children, train.childPrice, train.childRate, train.childCost, train.priceChild, train.fareChild];
  const adultKeys = [
    priceObject.adult,
    priceObject.adultUSD,
    priceObject.priceAdult,
    priceObject.foreignAdult,
    train.pricePerPerson,
    train.adultPrice,
    train.adultRate,
    train.adultCostUSD,
    train.adultCost,
    train.priceUSD,
    train.fareUSD,
    train.amount,
    typeof train.price === "number" ? train.price : null
  ];

  const keys = passengerType === "child" ? [...childKeys, ...adultKeys] : adultKeys;
  const found = keys.find((value) => Number(value) > 0);
  return found ? Number(found) : 0;
};

MyCuscoTripQuotePackages.prototype.getTrainPriceInQuoteCurrency = function (train, passengerType = "adult") {
  if (!train) return 0;
  const rawPrice = this.getTrainRawPrice(train, passengerType);
  const currency = train.currency || train.price?.currency || train.pricing?.currency || "USD";
  return this.convertCurrency(rawPrice, currency, this.quoteCurrency);
};

MyCuscoTripQuotePackages.prototype.getRecommendedTrainForRoute = function (routeCode) {
  const route = this.getTrainRouteForQuote(routeCode);
  const options = Array.isArray(route?.options) ? route.options.filter((train) => this.isTrainAllowedForNationality(train)) : [];
  if (!options.length) return null;

  return (
    options.find((train) => train.recommendedDefault === true && this.getTrainRawPrice(train, "adult") > 0) ||
    options.find((train) => train.isRecommended === true && this.getTrainRawPrice(train, "adult") > 0) ||
    options.find((train) => Array.isArray(train.tags) && train.tags.some((tag) => String(tag).includes("base")) && this.getTrainRawPrice(train, "adult") > 0) ||
    options.find((train) => this.getTrainRawPrice(train, "adult") > 0) ||
    options[0]
  );
};

MyCuscoTripQuotePackages.prototype.renderTrainSelectors = function () {
  const section = document.getElementById("trainSection");
  const outboundCard = document.getElementById("outboundTrainSelected");
  const returnCard = document.getElementById("returnTrainSelected");
  if (!section || !outboundCard || !returnCard) return;

  if (!this.selectedPackage || !this.selectedItineraryOption) {
    section.hidden = true;
    outboundCard.innerHTML = this.getTrainSelectorEmptyHtml("Tren de ida", "outbound");
    returnCard.innerHTML = this.getTrainSelectorEmptyHtml("Tren de retorno", "return");
    return;
  }

  const trainConfig = this.getTrainSelectionConfig();
  if (!trainConfig.required) {
    section.hidden = true;
    return;
  }

  section.hidden = false;

  if (!this.selectedOutboundTrainCode) {
    const defaultOutbound = this.getRecommendedTrainForRoute(trainConfig.outboundRoute);
    this.selectedOutboundTrainCode = defaultOutbound?.code || defaultOutbound?.trainCode || defaultOutbound?.id || "";
  }

  if (!this.selectedReturnTrainCode) {
    const defaultReturn = this.getRecommendedTrainForRoute(trainConfig.returnRoute);
    this.selectedReturnTrainCode = defaultReturn?.code || defaultReturn?.trainCode || defaultReturn?.id || "";
  }

  const outboundTrain = this.getTrainByCode(trainConfig.outboundRoute, this.selectedOutboundTrainCode);
  const returnTrain = this.getTrainByCode(trainConfig.returnRoute, this.selectedReturnTrainCode);

  outboundCard.innerHTML = this.getTrainSelectorCardHtml({ direction: "outbound", label: "Tren de ida", train: outboundTrain, routeCode: trainConfig.outboundRoute });
  returnCard.innerHTML = this.getTrainSelectorCardHtml({ direction: "return", label: "Tren de retorno", train: returnTrain, routeCode: trainConfig.returnRoute });
};

MyCuscoTripQuotePackages.prototype.getTrainTotal = function () {
  if (!this.selectedPackage || !this.selectedItineraryOption) return 0;
  const config = this.getTrainSelectionConfig();
  if (!config.required) return 0;

  const outbound = this.getTrainByCode(config.outboundRoute, this.selectedOutboundTrainCode);
  const returning = this.getTrainByCode(config.returnRoute, this.selectedReturnTrainCode);
  const defaultOutbound = this.getRecommendedTrainForRoute(config.outboundRoute);
  const defaultReturn = this.getRecommendedTrainForRoute(config.returnRoute);

  const adultDiff = Math.max(0, this.getTrainPriceInQuoteCurrency(outbound, "adult") - this.getTrainPriceInQuoteCurrency(defaultOutbound, "adult")) +
    Math.max(0, this.getTrainPriceInQuoteCurrency(returning, "adult") - this.getTrainPriceInQuoteCurrency(defaultReturn, "adult"));
  const childDiff = Math.max(0, this.getTrainPriceInQuoteCurrency(outbound, "child") - this.getTrainPriceInQuoteCurrency(defaultOutbound, "child")) +
    Math.max(0, this.getTrainPriceInQuoteCurrency(returning, "child") - this.getTrainPriceInQuoteCurrency(defaultReturn, "child"));

  return (adultDiff * this.adults) + (childDiff * this.children);
};

MyCuscoTripQuotePackages.prototype.calculateTrainAdditional = function () {
  return this.getTrainTotal();
};

MyCuscoTripQuotePackages.prototype.getAvailableItineraryOptions = function () {
  const options = Array.isArray(this.selectedPackage?.itineraryOptions) ? this.selectedPackage.itineraryOptions : [];
  if (!options.length) return [];
  return options.map((option) => this.adaptItineraryOptionToCurrentTimes(option)).filter(Boolean);
};

MyCuscoTripQuotePackages.prototype.adaptItineraryOptionToCurrentTimes = function (option) {
  if (!option || !Array.isArray(option.itinerary)) return option;

  const arrival = this.timeToMinutes(this.arrivalTime);
  const departure = this.timeToMinutes(this.departureTime);
  const clone = JSON.parse(JSON.stringify(option));
  const firstDay = this.getFirstItineraryDay(clone.itinerary);
  const lastDay = this.getLastItineraryDay(clone.itinerary);

  if (firstDay && arrival !== null) {
    const lateArrival = arrival >= this.timeToMinutes("14:00");
    const midArrival = arrival >= this.timeToMinutes("10:30");
    let codes = Array.isArray(firstDay.tourCodes) ? firstDay.tourCodes.map(String) : [];

    if (lateArrival) {
      codes = codes.filter((code) => code === "arrival_transfer");
      firstDay.title = `Día ${firstDay.day}: Llegada a Cusco`;
      firstDay.description = "Recepción en Cusco y descanso. Por el horario de llegada, este día queda libre para aclimatarte.";
      firstDay.tourCodes = codes.includes("arrival_transfer") ? codes : ["arrival_transfer"];
    } else if (midArrival) {
      codes = codes.filter((code) => !["CUZ001"].includes(code));
      if (codes.includes("CUZ002")) {
        firstDay.title = `Día ${firstDay.day}: Llegada a Cusco + City Tour`;
        firstDay.description = "Recepción en Cusco y City Tour por la tarde, siempre que el horario de llegada permita la operación.";
        firstDay.tourCodes = codes.includes("arrival_transfer") ? codes : ["arrival_transfer", ...codes];
      } else {
        firstDay.title = `Día ${firstDay.day}: Llegada a Cusco`;
        firstDay.description = "Recepción en Cusco y tiempo de aclimatación antes de iniciar las experiencias principales.";
        firstDay.tourCodes = ["arrival_transfer"];
      }
    }
  }

  if (lastDay && departure !== null) {
    const earlyDeparture = departure <= this.timeToMinutes("14:00");
    if (earlyDeparture) {
      lastDay.title = `Día ${lastDay.day}: Traslado de salida`;
      lastDay.description = "Traslado al aeropuerto o terminal terrestre de Cusco según tu horario de salida.";
      lastDay.tourCodes = ["departure_transfer"];
    }
  }

  return clone;
};

MyCuscoTripQuotePackages.prototype.buildCuscoDynamicItineraryOptions = function (card) {
  const generator = window.MyCuscoTripPackageGenerator;
  let generated = [];

  if (generator && typeof generator.generatePackageOptions === "function") {
    generated = generator.generatePackageOptions(
      {
        days: Number(card.days || this.travelDays),
        nights: Number(card.nights || this.travelNights),
        arrivalTime: "09:00",
        departureTime: "20:00",
        productFamily: "cusco-package"
      },
      {
        data: {
          packagesCusco: this.packagesCuscoData,
          toursCusco: this.toursCuscoData,
          toursMachuPicchu: this.toursMachuPicchuData,
          toursPeru: this.toursPeruData
        }
      }
    );
  }

  if (!Array.isArray(generated) || !generated.length) {
    generated = [
      {
        ...card,
        includedTourCodes: Array.isArray(card.search?.includedTourCodes) ? card.search.includedTourCodes : [],
        generationReason: "quote-fallback"
      }
    ];
  }

  return generated.map((option, index) => this.adaptGeneratedOptionForQuote(card, option, index));
};

MyCuscoTripQuotePackages.prototype.estimateQuoteBasePricing = function (card, option) {
  if (card.basePricing?.adult) return card.basePricing;

  const codes = option?.includedTourCodes || card.search?.includedTourCodes || [];
  const totals = codes.reduce((acc, code) => {
    const tour = this.tourIndex?.get(String(code));
    const pricing = tour?.basePricing || tour?.pricing || {};
    const adult = Number(pricing.adult || pricing.publishedAdultUSD || pricing.price || 0);
    const child = Number(pricing.child || pricing.publishedChildUSD || pricing.adult || pricing.publishedAdultUSD || 0);

    acc.adult += Number.isFinite(adult) ? adult : 0;
    acc.child += Number.isFinite(child) ? child : adult;
    return acc;
  }, { adult: 0, child: 0 });

  if (totals.adult <= 0) {
    const fallbackAdult = Math.max(120, Number(card.days || this.travelDays || 1) * 70);
    return { adult: fallbackAdult, child: Math.round(fallbackAdult * 0.85), currency: "USD" };
  }

  return { adult: Number(totals.adult.toFixed(2)), child: Number((totals.child || totals.adult).toFixed(2)), currency: "USD" };
};

document.addEventListener("DOMContentLoaded", () => {
  new MyCuscoTripQuotePackages();
});
