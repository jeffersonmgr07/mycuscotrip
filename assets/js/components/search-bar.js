class MyCuscoTripSearchBar {
constructor() {
this.root = document.querySelector(".search-bar.mct-search");
if (!this.root) return;

```
this.form = this.root.querySelector("#mctForm");
this.tabs = this.root.querySelectorAll(".mct-tab");
this.destinoSelect = this.root.querySelector("#mctDestino");
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
this.DAY = 24 * 60 * 60 * 1000;

this.init();
```

}

init() {
if (typeof flatpickr === "undefined") return;

```
this.setupFlatpickr();
this.setupTabs();
this.setupQuantityControls();
this.setupEventListeners();
this.updateQuantityLabel();
this.applyTabRules();
```

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

```
this.tabs.forEach((tab) => {
  tab.classList.toggle("is-active", tab.dataset.tab === tabName);
});

this.applyTabRules();
this.clearDates();
```

}

applyTabRules() {
if (!this.destinoSelect) return;

```
this.dateInput.placeholder =
  this.currentTab === "paquetes"
    ? "Selecciona rango de fechas"
    : "Selecciona fecha";

if (this.flatpickrInstance) {
  this.flatpickrInstance.set(
    "mode",
    this.currentTab === "paquetes" ? "range" : "single"
  );
}
```

}

setupFlatpickr() {
if (this.dateInput._flatpickr) {
this.dateInput._flatpickr.destroy();
}

```
const locale = flatpickr.l10ns.es || flatpickr.l10ns.default;
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

this.flatpickrInstance = flatpickr(this.dateInput, {
  locale,
  altInput: true,
  altFormat: "d M Y",
  dateFormat: "Y-m-d",
  mode: "single",
  minDate: "today",
  clickOpens: false,
  disableMobile: true,
  plugins,
  onOpen: () => this.closeQuantityPanel(),
  onChange: (selectedDates) => this.handleDateChange(selectedDates)
});

const visibleInput = this.flatpickrInstance.altInput || this.dateInput;
visibleInput.setAttribute("readonly", "readonly");
visibleInput.style.cursor = "pointer";

const openCalendar = (event) => {
  event.preventDefault();
  event.stopPropagation();
  this.closeQuantityPanel();
  if (!this.flatpickrInstance.isOpen) {
    this.flatpickrInstance.open();
  }
};

visibleInput.addEventListener("click", openCalendar);
this.dateField?.addEventListener("click", openCalendar);
```

}

handleDateChange(selectedDates) {
if (!this.durationEl) return;

```
if (this.currentTab === "paquetes") {
  if (selectedDates.length === 2) {
    const nights = Math.round((selectedDates[1] - selectedDates[0]) / this.DAY);
    const days = nights + 1;
    this.durationEl.innerHTML = `<i class="fa-regular fa-moon"></i> ${days} días / ${nights} noches`;
    this.durationEl.style.display = "block";
  } else {
    this.durationEl.style.display = "none";
  }
} else {
  if (selectedDates.length >= 1) {
    this.durationEl.innerHTML = `<i class="fa-regular fa-calendar-check"></i> Fecha seleccionada`;
    this.durationEl.style.display = "block";
  } else {
    this.durationEl.style.display = "none";
  }
}
```

}

clearDates() {
this.flatpickrInstance?.clear();
if (this.durationEl) {
this.durationEl.style.display = "none";
}
}

setupQuantityControls() {
if (!this.qtyPanel || !this.qtyToggle) return;

```
this.qtyToggle.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  this.qtyPanel.toggleAttribute("hidden");
});

this.qtyDone?.addEventListener("click", () => this.closeQuantityPanel());

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
```

}

syncPassengerInputs() {
const adultInput = this.qtyPanel?.querySelector('[data-type="adultos"] input');
const childInput = this.qtyPanel?.querySelector('[data-type="ninos"] input');

```
if (adultInput) adultInput.value = this.adults;
if (childInput) childInput.value = this.children;

this.updateQuantityLabel();
```

}

updateQuantityLabel() {
if (!this.qtyLabel) return;
const total = this.adults + this.children;
this.qtyLabel.textContent = `${total} ${total === 1 ? "pasajero" : "pasajeros"}`;
}

closeQuantityPanel() {
this.qtyPanel?.setAttribute("hidden", "");
}

setupEventListeners() {
this.form?.addEventListener("submit", (event) => this.handleSubmit(event));

```
document.addEventListener("click", (event) => {
  const insideQty = this.qtyPanel?.contains(event.target) || this.qtyToggle?.contains(event.target);
  const altInput = this.flatpickrInstance?.altInput;
  const insideDate = this.dateField?.contains(event.target) || event.target === altInput;

  if (!insideQty && !insideDate) {
    this.closeQuantityPanel();
  }
});
```

}

handleSubmit(event) {
event.preventDefault();

```
const tipo = this.currentTab;
const destino = this.destinoSelect?.value || "machu-picchu";
const fecha = this.dateInput?.value || "";

// 🔥 YA NO FORZAMOS CALENDARIO
// solo advertencia opcional
if (!fecha) {
  console.warn("Búsqueda sin fecha");
}

const params = new URLSearchParams();
params.set("tipo", tipo);
params.set("destino", destino);
params.set("adultos", this.adults);
params.set("ninos", this.children);

if (fecha) {
  params.set("fecha", fecha);
}

window.location.href = `./all-experiences.html?${params.toString()}`;
```

}
}

document.addEventListener("DOMContentLoaded", () => {
if (typeof flatpickr === "undefined") return;
window.MyCuscoTripSearchBar = new MyCuscoTripSearchBar();
});
