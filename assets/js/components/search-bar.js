class MyCuscoTripSearchBar {
  constructor() {
    this.root = document.querySelector(".search-bar.mct-search");
    if (!this.root) return;

    this.form = this.root.querySelector("#mctForm");
    this.tabs = this.root.querySelectorAll(".mct-tab");
    this.tabTours = this.root.querySelector('.mct-tab[data-tab="tours"]');
    this.tabPackages = this.root.querySelector('.mct-tab[data-tab="paquetes"]');

    this.destinoSelect = this.root.querySelector("#mctDestino");
    this.dateInput = this.root.querySelector("#mctFecha");
    this.dateField = this.root.querySelector(".mct-fecha-field");
    this.durationEl = this.root.querySelector("#mctDuration");

    this.qtyToggle = this.root.querySelector(".mct-qty-toggle");
    this.qtyPanel = this.root.querySelector(".mct-qty-panel");
    this.qtyDone = this.root.querySelector(".mct-qty-done");
    this.qtyLabel = this.root.querySelector("#mctQtyLabel");

    this.chips = this.root.querySelectorAll(".mct-chip");

    this.modalOverlay = document.getElementById("modalOverlay");
    this.modalContent = document.getElementById("modalContent");

    this.adults = 2;
    this.children = 0;
    this.currentTab = "tours";
    this.currentOpenComponent = null;
    this.flatpickrInstance = null;

    this.DAY = 24 * 60 * 60 * 1000;

    this.init();
  }

  init() {
    if (typeof flatpickr === "undefined") {
      console.error("Flatpickr no está cargado.");
      return;
    }

    this.setupFlatpickr();
    this.setupTabs();
    this.setupQuantityControls();
    this.setupPopularChips();
    this.setupEventListeners();
    this.updateQuantityLabel();
    this.applyTabRules();

    console.log("SearchBar initialized successfully");
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

    this.applyTabRules();
    this.clearDates();
  }

  applyTabRules() {
    if (!this.destinoSelect) return;

    if (this.currentTab === "paquetes") {
      if ([...this.destinoSelect.options].some(opt => opt.value === "paquetes")) {
        this.destinoSelect.value = "paquetes";
      }
      this.dateInput.placeholder = "Selecciona rango de fechas";
    } else {
      if (this.destinoSelect.value === "paquetes") {
        this.destinoSelect.value = "machu-picchu";
      }
      this.dateInput.placeholder = "Selecciona fecha";
    }

    if (this.flatpickrInstance) {
      this.flatpickrInstance.set("mode", this.currentTab === "paquetes" ? "range" : "single");
    }
  }

  setupFlatpickr() {
    if (this.dateInput._flatpickr) {
      this.dateInput._flatpickr.destroy();
    }

    const locale = flatpickr.l10ns.es || flatpickr.l10ns.default;

    this.flatpickrInstance = flatpickr(this.dateInput, {
      locale,
      altInput: true,
      altFormat: "d M Y",
      dateFormat: "Y-m-d",
      mode: "single",
      minDate: "today",
      clickOpens: true,
      disableMobile: true,
      static: false,
      onOpen: () => {
        this.closeQuantityPanel();
        this.currentOpenComponent = "datepicker";
      },
      onClose: () => {
        this.currentOpenComponent = null;
      },
      onChange: (selectedDates) => {
        this.handleDateChange(selectedDates);
      }
    });

    this.dateInput._flatpickr = this.flatpickrInstance;

    const visibleInput = this.flatpickrInstance.altInput || this.dateInput;
    visibleInput.style.cursor = "pointer";

    const openCalendar = (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.closeQuantityPanel();
      this.flatpickrInstance.open();
      this.currentOpenComponent = "datepicker";
    };

    visibleInput.addEventListener("click", openCalendar);
    this.dateField?.addEventListener("click", openCalendar);
  }

  handleDateChange(selectedDates) {
    if (!this.durationEl) return;

    if (this.currentTab === "paquetes") {
      if (selectedDates.length === 2) {
        const nights = Math.round((selectedDates[1] - selectedDates[0]) / this.DAY);
        const days = nights + 1;
        this.durationEl.innerHTML = `<i class="fa-regular fa-moon"></i> ${days} días / ${nights} noches`;
        this.durationEl.style.display = "block";
      } else {
        this.durationEl.textContent = "";
        this.durationEl.style.display = "none";
      }
    } else {
      if (selectedDates.length >= 1) {
        this.durationEl.innerHTML = `<i class="fa-regular fa-calendar-check"></i> Salida seleccionada`;
        this.durationEl.style.display = "block";
      } else {
        this.durationEl.textContent = "";
        this.durationEl.style.display = "none";
      }
    }
  }

  clearDates() {
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
      this.closeAllComponents();

      if (isHidden) {
        this.qtyPanel.removeAttribute("hidden");
        this.qtyToggle.setAttribute("aria-expanded", "true");
        this.currentOpenComponent = "qtyPanel";
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
    this.qtyLabel.textContent = `${total} ${total === 1 ? "pasajero" : "pasajeros"}`;
  }

  closeQuantityPanel() {
    if (!this.qtyPanel || !this.qtyToggle) return;

    this.qtyPanel.setAttribute("hidden", "");
    this.qtyToggle.setAttribute("aria-expanded", "false");
    this.currentOpenComponent = null;
  }

  closeAllComponents() {
    this.closeQuantityPanel();

    if (this.flatpickrInstance) {
      this.flatpickrInstance.close();
    }
  }

  setupPopularChips() {
    this.chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const destino = chip.dataset.destino;
        if (!destino || !this.destinoSelect) return;

        this.destinoSelect.value = destino;

        if (destino === "paquetes") {
          this.setActiveTab("paquetes");
        } else {
          this.setActiveTab("tours");
        }
      });
    });
  }

  setupEventListeners() {
    this.form?.addEventListener("submit", (event) => this.handleSubmit(event));

    document.addEventListener("click", (event) => {
      const insideQty = this.qtyPanel?.contains(event.target) || this.qtyToggle?.contains(event.target);
      const altInput = this.flatpickrInstance?.altInput;
      const insideDate = this.dateField?.contains(event.target) || (altInput && event.target === altInput);

      if (!insideQty && !insideDate) {
        this.closeAllComponents();
      }
    });
  }

  handleSubmit(event) {
    event.preventDefault();

    const tipo = this.currentTab;
    const destino = this.destinoSelect?.value || "machu-picchu";
    const fecha = this.dateInput?.value || "";

    if (tipo === "tours" && !fecha) {
      this.flatpickrInstance?.open();
      return;
    }

    if (tipo === "paquetes") {
      const parts = fecha.split(" to ").length > 1 ? fecha.split(" to ") : fecha.split(" → ");
      if (!fecha || parts.length < 2) {
        this.flatpickrInstance?.open();
        return;
      }
    }

    const url = this.buildSearchUrl({ tipo, destino, fecha });
    window.location.href = url;
  }

  buildSearchUrl({ tipo, destino, fecha }) {
    const params = new URLSearchParams();

    params.set("tipo", tipo);
    params.set("destino", destino);
    params.set("adultos", this.adults);
    params.set("ninos", this.children);

    if (fecha) {
      if (tipo === "paquetes") {
        const parts = fecha.split(" to ").length > 1 ? fecha.split(" to ") : fecha.split(" → ");
        if (parts.length === 2) {
          params.set("fecha_inicio", parts[0]);
          params.set("fecha_fin", parts[1]);
        }
      } else {
        params.set("fecha", fecha);
      }
    }

    const routeMap = {
      "machu-picchu": "./all-experiences.html",
      "cusco": "./all-experiences.html",
      "paquetes": "./all-experiences.html",
      "peru": "./all-experiences.html"
    };

    const basePath = routeMap[destino] || "./all-experiences.html";
    return `${basePath}?${params.toString()}`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof flatpickr === "undefined") {
    console.error("Flatpickr no está cargado. La barra de búsqueda no funcionará correctamente.");
    return;
  }

  window.MyCuscoTripSearchBar = new MyCuscoTripSearchBar();
});
