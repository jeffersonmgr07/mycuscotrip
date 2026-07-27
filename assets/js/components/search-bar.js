class MyCuscoTripSearchBar {
  constructor() {
    this.root = document.querySelector(".search-bar.mct-search");
    if (!this.root) return;

    // Evita doble inicialización cuando el componente se carga por HTML + JS global.
    if (this.root.dataset.mctSearchInitialized === "true") return;
    this.root.dataset.mctSearchInitialized = "true";

    this.form = this.root.querySelector("#mctForm");
    this.tabs = this.root.querySelectorAll(".mct-tab");
    this.intentSelect = this.root.querySelector("#mctIntent");
    this.intentLabel = this.root.querySelector("#mctIntentLabel");
    this.submitText = this.root.querySelector("#mctSubmitText");
    this.dateInput = this.root.querySelector("#mctFecha");
    this.dateField = this.root.querySelector(".mct-fecha-field");
    this.durationEl = this.root.querySelector("#mctDuration");

    this.qtyToggle = this.root.querySelector(".mct-qty-toggle");
    this.qtyPanel = this.root.querySelector(".mct-qty-panel");
    this.qtyDone = this.root.querySelector(".mct-qty-done");
    this.qtyLabel = this.root.querySelector("#mctQtyLabel");

    this.adults = 2;
    this.children = 0;
    this.currentTab = "tours";
    this.flatpickrInstance = null;
    this.currentCalendarMode = "single";
    this.DAY = 24 * 60 * 60 * 1000;

    this.selectedDate = "";
    this.selectedStartDate = "";
    this.selectedEndDate = "";
    this.selectedDays = "";
    this.selectedNights = "";

    this.options = {
      tours: [
        {
          value: "machu-picchu",
          labelKey: "search.categoryMachuPicchu",
          fallback: "Machu Picchu",
          url: "./machu-picchu-tours.html"
        },
        {
          value: "tours-cusco",
          labelKey: "search.categoryCuscoTours",
          fallback: "Tours en Cusco",
          url: "./cusco-tours.html"
        },
        {
          value: "experiencias-ancestrales",
          labelKey: "search.categoryAncestral",
          fallback: "Experiencias ancestrales",
          url: "./all-experiences.html?q=ancestral&destino=cusco"
        },
        {
          value: "trekkings-naturaleza",
          labelKey: "search.categoryTrekkingsNature",
          fallback: "Trekkings y naturaleza",
          url: "./trekkings.html"
        }
      ],
      paquetes: [
        {
          value: "solo-machu-picchu",
          labelKey: "search.packageOnlyMachuPicchu",
          fallback: "Paquetes solo a Machu Picchu",
          url: "./machu-picchu-overnight.html"
        },
        {
          value: "cusco-machu-picchu",
          labelKey: "search.packageCuscoMachuPicchu",
          fallback: "Paquetes Cusco y Machu Picchu",
          url: "./paquetes-cusco.html"
        },
        {
          value: "machu-picchu-trekking",
          labelKey: "search.packageMachuPicchuTrekking",
          fallback: "Machu Picchu + trekking",
          url: "./trekkings.html?tipo=paquete&destino=machu-picchu"
        },
        {
          value: "aventura-naturaleza",
          labelKey: "search.packageAdventureNature",
          fallback: "Paquetes de aventura y naturaleza",
          url: "./trekking-cusco.html?tipo=paquete"
        },
        {
          value: "peru-personalizado",
          labelKey: "search.packagePeruCustom",
          fallback: "Perú multidestino o personalizado",
          url: "./explora-peru.html"
        }
      ]
    };

    this.init();
  }

  t(key, fallback = "", params = {}) {
    let value = window.MyCuscoTripI18n?.t?.(key, fallback) || fallback || key;
    Object.entries(params || {}).forEach(([name, val]) => {
      value = String(value).replace(new RegExp(`\\{${name}\\}`, "g"), val);
    });
    return value;
  }

  init() {
    this.renderIntentOptions();
    this.setupTabs();
    this.setupQuantityControls();
    this.setupEventListeners();
    this.updateQuantityLabel();

    if (typeof flatpickr !== "undefined") {
      this.setupFlatpickr();
    }

    this.applyTabRules({ clearDates: false });
  }

  setupTabs() {
    this.tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabName = tab.dataset.tab || "tours";
        this.setActiveTab(tabName);
      });
    });
  }

  setActiveTab(tabName) {
    this.currentTab = tabName;

    this.tabs.forEach((tab) => {
      tab.classList.toggle("is-active", tab.dataset.tab === tabName);
    });

    this.renderIntentOptions();
    this.applyTabRules({ clearDates: true });
  }

  getCurrentOptions() {
    return this.options[this.currentTab] || this.options.tours;
  }

  getCurrentOption() {
    const value = this.intentSelect?.value || "";
    return this.getCurrentOptions().find((option) => option.value === value) || this.getCurrentOptions()[0] || null;
  }

  isFixedPackageOption() {
    return false;
  }

  isRangePackageOption() {
    return this.currentTab === "paquetes";
  }

  getCalendarMode() {
    return this.currentTab === "paquetes" ? "range" : "single";
  }

  renderIntentOptions() {
    if (!this.intentSelect) return;
    const previousValue = this.intentSelect.value;
    const options = this.getCurrentOptions();

    this.intentSelect.innerHTML = options.map((option) => `
      <option value="${option.value}">${this.t(option.labelKey, option.fallback)}</option>
    `).join("");

    const stillExists = options.some((option) => option.value === previousValue);
    this.intentSelect.value = stillExists ? previousValue : options[0]?.value || "";
  }

  applyTabRules(options = {}) {
    if (!this.dateInput) return;
    const shouldClearDates = options.clearDates !== false;
    const option = this.getCurrentOption();
    const nextMode = this.getCalendarMode();

    if (this.currentTab === "paquetes") {
      if (this.intentLabel) {
        this.intentLabel.dataset.i18n = "search.packageDestinationStyle";
        this.intentLabel.textContent = this.t("search.packageDestinationStyle", "Destino o estilo");
      }
      if (this.submitText) {
        this.submitText.dataset.i18n = "search.findPackages";
        this.submitText.textContent = this.t("search.findPackages", "Buscar paquetes");
      }
      this.dateInput.placeholder = this.t("search.selectDateRange", "Selecciona rango de fechas");
    } else {
      if (this.intentLabel) {
        this.intentLabel.dataset.i18n = "search.type";
        this.intentLabel.textContent = this.t("search.type", "Tipo");
      }
      if (this.submitText) {
        this.submitText.dataset.i18n = "search.submit";
        this.submitText.textContent = this.t("search.submit", "Buscar experiencias");
      }
      this.dateInput.placeholder = this.t("search.selectDate", "Selecciona fecha");
    }

    if (this.flatpickrInstance && this.currentCalendarMode !== nextMode) {
      this.flatpickrInstance.set("mode", nextMode);
      this.currentCalendarMode = nextMode;
    }

    if (shouldClearDates) this.clearDates();
  }

  setupFlatpickr() {
    if (!this.dateInput) return;

    if (this.dateInput._flatpickr) {
      this.dateInput._flatpickr.destroy();
    }

    const activeLocale = window.MyCuscoTripI18n?.locale || window.MyCuscoTripI18n?.getLocaleFromUrl?.() || "es";
    const locale = flatpickr.l10ns[activeLocale] || flatpickr.l10ns.es || flatpickr.l10ns.default;
    const plugins = [];

    if (typeof confirmDatePlugin !== "undefined") {
      plugins.push(
        new confirmDatePlugin({
          confirmText: "OK",
          showAlways: true,
          theme: "light"
        })
      );
    }

    this.currentCalendarMode = this.getCalendarMode();
    this.flatpickrInstance = flatpickr(this.dateInput, {
      locale,
      altInput: true,
      altFormat: "d M Y",
      dateFormat: "Y-m-d",
      mode: this.currentCalendarMode,
      minDate: "today",
      clickOpens: false,
      disableMobile: true,
      static: false,
      plugins,
      onOpen: () => {
        this.closeQuantityPanel();
      },
      onChange: (selectedDates) => {
        this.handleDateChange(selectedDates);
      }
    });

    this.dateInput._flatpickr = this.flatpickrInstance;

    const visibleInput = this.flatpickrInstance.altInput || this.dateInput;
    visibleInput.setAttribute("readonly", "readonly");
    visibleInput.style.cursor = "pointer";

    const openCalendar = (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.closeQuantityPanel();

      if (!this.flatpickrInstance?.isOpen) {
        this.flatpickrInstance?.open();
      }
    };

    visibleInput.addEventListener("click", openCalendar);
    this.dateField?.addEventListener("click", openCalendar);
  }

  formatDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  formatDateHuman(isoDate) {
    const date = this.parseDate(isoDate);
    if (!date) return "";
    try {
      return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short" }).format(date);
    } catch (_) {
      return isoDate;
    }
  }

  parseDate(value) {
    if (!value) return null;
    const parts = String(value).split("-").map(Number);
    if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  addDaysToISO(isoDate, days) {
    const date = this.parseDate(isoDate);
    if (!date) return "";
    date.setDate(date.getDate() + Number(days || 0));
    return this.formatDate(date);
  }

  resetSelectedDates() {
    this.selectedDate = "";
    this.selectedStartDate = "";
    this.selectedEndDate = "";
    this.selectedDays = "";
    this.selectedNights = "";
  }

  handleDateChange(selectedDates) {
    this.resetSelectedDates();

    if (!this.durationEl) return;

    if (this.currentTab === "paquetes") {
      const currentOption = this.getCurrentOption();

      if (this.isFixedPackageOption(currentOption)) {
        if (selectedDates.length >= 1) {
          this.selectedStartDate = this.formatDate(selectedDates[0]);
          this.selectedDays = String(currentOption.days);
          this.selectedNights = String(currentOption.nights);
          this.selectedEndDate = this.addDaysToISO(this.selectedStartDate, currentOption.nights);

          const startLabel = this.formatDateHuman(this.selectedStartDate);
          const endLabel = this.formatDateHuman(this.selectedEndDate);
          this.durationEl.innerHTML = `<i class="fa-regular fa-moon"></i> ${this.t("search.fixedDurationHint", "{days} días / {nights} noches · {start} al {end}", { days: currentOption.days, nights: currentOption.nights, start: startLabel, end: endLabel })}`;
          this.durationEl.style.display = "block";
        } else {
          this.durationEl.textContent = "";
          this.durationEl.style.display = "none";
        }
        return;
      }

      if (selectedDates.length >= 1) {
        this.selectedStartDate = this.formatDate(selectedDates[0]);
      }

      if (selectedDates.length === 2) {
        const nights = Math.max(0, Math.round((selectedDates[1] - selectedDates[0]) / this.DAY));
        const days = nights + 1;

        this.selectedEndDate = this.formatDate(selectedDates[1]);
        this.selectedDays = String(days);
        this.selectedNights = String(nights);

        this.durationEl.innerHTML = `<i class="fa-regular fa-moon"></i> ${this.t("search.daysNights", "{days} días / {nights} noches", { days, nights })}`;
        this.durationEl.style.display = "block";
      } else if (selectedDates.length === 1) {
        this.durationEl.innerHTML = `<i class="fa-regular fa-calendar-days"></i> ${this.t("search.selectEndDateHint", "Selecciona también la fecha de salida")}`;
        this.durationEl.style.display = "block";
      } else {
        this.durationEl.textContent = "";
        this.durationEl.style.display = "none";
      }
    } else {
      if (selectedDates.length >= 1) {
        this.selectedDate = this.formatDate(selectedDates[0]);
        this.selectedDays = "";
        this.selectedNights = "";

        this.durationEl.innerHTML = `<i class="fa-regular fa-calendar-check"></i> ${this.t("search.selectedDate", "Fecha seleccionada")}`;
        this.durationEl.style.display = "block";
      } else {
        this.durationEl.textContent = "";
        this.durationEl.style.display = "none";
      }
    }
  }

  clearDates() {
    this.resetSelectedDates();

    if (this.flatpickrInstance) {
      this.flatpickrInstance.clear();
    }
    if (this.durationEl) {
      this.durationEl.textContent = "";
      this.durationEl.style.display = "none";
    }
  }

  setupQuantityControls() {
    if (!this.qtyPanel || !this.qtyToggle) return;

    this.qtyToggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const isHidden = this.qtyPanel.hasAttribute("hidden");
      if (isHidden) {
        this.qtyPanel.removeAttribute("hidden");
        this.qtyToggle.setAttribute("aria-expanded", "true");
      } else {
        this.closeQuantityPanel();
      }
    });

    this.qtyDone?.addEventListener("click", () => {
      this.closeQuantityPanel();
    });

    const adultMinus = this.qtyPanel.querySelector('[data-type="adultos"] .minus');
    const adultPlus = this.qtyPanel.querySelector('[data-type="adultos"] .plus');
    const childMinus = this.qtyPanel.querySelector('[data-type="ninos"] .minus');
    const childPlus = this.qtyPanel.querySelector('[data-type="ninos"] .plus');

    adultMinus?.addEventListener("click", () => {
      this.adults = Math.max(1, this.adults - 1);
      this.syncPassengerInputs();
    });

    adultPlus?.addEventListener("click", () => {
      this.adults = Math.min(20, this.adults + 1);
      this.syncPassengerInputs();
    });

    childMinus?.addEventListener("click", () => {
      this.children = Math.max(0, this.children - 1);
      this.syncPassengerInputs();
    });

    childPlus?.addEventListener("click", () => {
      this.children = Math.min(10, this.children + 1);
      this.syncPassengerInputs();
    });

    this.syncPassengerInputs();
  }

  syncPassengerInputs() {
    const adultInput = this.qtyPanel?.querySelector('[data-type="adultos"] input');
    const childInput = this.qtyPanel?.querySelector('[data-type="ninos"] input');

    if (adultInput) adultInput.value = this.adults;
    if (childInput) childInput.value = this.children;

    this.updateQuantityLabel();
  }

  updateQuantityLabel() {
    if (!this.qtyLabel) return;
    const total = this.adults + this.children;
    this.qtyLabel.textContent = `${total} ${total === 1 ? this.t("search.passenger", "pasajero") : this.t("search.passengers", "pasajeros")}`;
  }

  closeQuantityPanel() {
    if (!this.qtyPanel || !this.qtyToggle) return;
    this.qtyPanel.setAttribute("hidden", "");
    this.qtyToggle.setAttribute("aria-expanded", "false");
  }

  setupEventListeners() {
    this.form?.addEventListener("submit", (event) => this.handleSubmit(event));
    this.intentSelect?.addEventListener("change", () => {
      this.applyTabRules({ clearDates: true });
    });

    document.addEventListener("click", (event) => {
      const insideQty =
        this.qtyPanel?.contains(event.target) ||
        this.qtyToggle?.contains(event.target);

      const altInput = this.flatpickrInstance?.altInput;
      const insideDate =
        this.dateField?.contains(event.target) ||
        (altInput && event.target === altInput);

      if (!insideQty && !insideDate) {
        this.closeQuantityPanel();
      }
    });

    window.addEventListener("resize", () => {
      this.closeQuantityPanel();
    });
  }

  buildTourUrl() {
    const option = this.getCurrentOption();
    const params = new URLSearchParams();
    params.set("source", "home-search");
    params.set("intent", option?.value || "tour");
    params.set("adultos", String(this.adults));
    params.set("ninos", String(this.children));
    if (this.selectedDate) {
      params.set("fecha", this.selectedDate);
      params.set("fechaInicio", this.selectedDate);
    }

    const base = option?.url || "./all-experiences.html";
    const connector = base.includes("?") ? "&" : "?";
    return `${base}${connector}${params.toString()}`;
  }

  buildPackageCatalogUrl() {
    const option = this.getCurrentOption();
    const params = new URLSearchParams();
    params.set("source", "home-search");
    params.set("intent", option?.value || "paquete");
    params.set("adultos", String(this.adults));
    params.set("ninos", String(this.children));
    if (this.selectedStartDate) params.set("fechaInicio", this.selectedStartDate);
    if (this.selectedEndDate) params.set("fechaFin", this.selectedEndDate);

    const base = option?.url || "./paquetes-cusco.html";
    const connector = base.includes("?") ? "&" : "?";
    return `${base}${connector}${params.toString()}`;
  }

  handleSubmit(event) {
    event.preventDefault();
    this.closeQuantityPanel();
    window.location.href = this.currentTab === "paquetes"
      ? this.buildPackageCatalogUrl()
      : this.buildTourUrl();
  }

  refreshTranslations() {
    const currentValue = this.intentSelect?.value;
    this.renderIntentOptions();
    if (currentValue && this.intentSelect) this.intentSelect.value = currentValue;
    this.applyTabRules({ clearDates: false });
    this.updateQuantityLabel();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (!window.__mctSearchBarInitialized) {
    window.__mctSearchBarInitialized = true;
    window.mctSearchBarInstance = new MyCuscoTripSearchBar();
  }
});

window.addEventListener("mct:i18n-ready", () => {
  if (window.mctSearchBarInstance) {
    window.mctSearchBarInstance.refreshTranslations();
  }
});
