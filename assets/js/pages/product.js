class MyCuscoTripProductPage {
  constructor() {
    this.params = new URLSearchParams(window.location.search);
    this.slug = this.params.get("slug");

    this.product = null;
    this.tours = [];

    this.adults = 2;
    this.children = 0;
    this.selectedExtras = new Set();
    this.paymentMode = "full";
    this.date = "";

    this.init();
  }

  async init() {
    if (!this.slug) {
      this.renderNotFound("No se recibió un tour válido.");
      return;
    }

    try {
      this.tours = await this.loadTours();
      const product = this.tours.find((item) => item.slug === this.slug);

      if (!product) {
        this.renderNotFound("No encontramos esta experiencia.");
        return;
      }

      this.product = product;
      this.renderProduct(product);
      this.initBookingLogic();
    } catch (error) {
      console.error("Error loading product:", error);
      this.renderNotFound("No se pudo cargar la experiencia.");
    }
  }

  async loadTours() {
    const localProducts = JSON.parse(localStorage.getItem("experiences") || "[]");
    if (localProducts.length > 0) return localProducts;

    const response = await fetch("./assets/data/tours.json", { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo cargar tours.json");

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("tours.json no contiene un array válido");

    return data.filter((item) => item.status !== "draft");
  }

  renderProduct(product) {
    const title = product.title || "Experiencia";
    const description =
      product.description ||
      product.shortDescription ||
      "Pronto agregaremos más detalles de esta experiencia.";

    const badge = product.badge || "Destacado";
    const basePrice = product.basePricing?.adult || 0;
    const currency = product.currency || "USD";
    const location = product.location || "Cusco, Perú";
    const duration = product.duration?.label || "Duración por confirmar";
    const languages = product.duration?.guideLanguages?.length
      ? product.duration.guideLanguages.join(", ")
      : "Por confirmar";
    const capacity = product.capacity || product.duration?.maxGroupSize || "Por confirmar";

    document.title = `${title} | My Cusco Trip`;

    this.setText("productBadge", badge);
    this.setText("productTitle", title);
    this.setText("productDescription", description);
    this.setText("productBasePrice", `${currency} ${this.formatMoney(basePrice)}`);

    this.setText("detailCapacity", `Máximo ${capacity} viajeros por grupo`);
    this.setText("detailDuration", duration);
    this.setText("detailLanguages", `Guía en ${languages}`);
    this.setText("detailLocation", location);

    this.renderGallery(product.images);
    this.renderIncludes(product.includes || []);
    this.renderExcludes(product.excludes || []);
    this.renderHighlights(product);
    this.renderItinerary(product.itinerary || []);
    this.renderFaq(product.faq || []);
    this.renderExtras(product.extras || []);
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
        onChange: (selectedDates, dateStr) => {
          this.date = dateStr;
        }
      });
    }

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
        this.updatePricing();
      });
    });

    const paymentMode = document.getElementById("paymentMode");
    paymentMode?.addEventListener("change", () => {
      this.paymentMode = paymentMode.value;
      this.updatePricing();
    });

    document.getElementById("paypalButton")?.addEventListener("click", () => {
      this.handlePaypalAction();
    });

    document.getElementById("bookingPreviewButton")?.addEventListener("click", () => {
      this.showBookingPreview();
    });

    this.updatePassengersUI();
    this.updatePricing();
  }

  renderGallery(images = {}) {
    const gallery = document.getElementById("productGallery");
    if (!gallery) return;

    const cover = images.cover ? [images.cover] : [];
    const galleryImages = Array.isArray(images.gallery) ? images.gallery : [];
    const finalImages = [...new Set([...cover, ...galleryImages])];

    if (!finalImages.length) {
      gallery.innerHTML = `<div class="experience-gallery__main"><img src="./assets/img/tours/machu-picchu-full-day/cover.jpg" alt="Imagen referencial"></div>`;
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
      product.shortDescription,
      `Ubicación: ${product.location || "Cusco, Perú"}`,
      `Duración: ${product.duration?.label || "Por confirmar"}`,
      product.typeLabel ? `Tipo: ${product.typeLabel}` : null,
      product.duration?.guideLanguages?.length
        ? `Idiomas: ${product.duration.guideLanguages.join(", ")}`
        : null
    ].filter(Boolean);

    target.innerHTML = highlights
      .map((item) => `<li>${this.escapeHtml(item)}</li>`)
      .join("");
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
      return;
    }

    section.hidden = false;
    container.innerHTML = extras.map((extra) => {
      const extraPrice = `${this.product.currency || "USD"} ${this.formatMoney(extra.price || 0)}`;
      return `
        <label class="booking-extra-item" for="extra-${extra.code}">
          <div>
            <strong>${this.escapeHtml(extra.label)}</strong>
            <small>${extra.perPerson ? "· Precio por persona" : "· Precio por reserva"} · ${extraPrice}</small>
          </div>
          <input type="checkbox" id="extra-${extra.code}" data-extra-code="${this.escapeHtml(extra.code)}" />
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

  renderSimilarExperiences() {
    const target = document.getElementById("similarExperiences");
    if (!target) return;

    const similar = this.tours
      .filter((item) => item.slug !== this.product.slug)
      .filter((item) => item.category === this.product.category || item.featured)
      .slice(0, 3);

    if (!similar.length) {
      target.innerHTML = "<p>No hay experiencias similares disponibles por ahora.</p>";
      return;
    }

    target.innerHTML = similar.map((item) => `
      <article class="similar-card">
        <img src="${item.images?.cover || "./assets/img/tours/machu-picchu-full-day/cover.jpg"}" alt="${this.escapeHtml(item.title)}" loading="lazy" />
        <div class="similar-card__content">
          <h3>${this.escapeHtml(item.title)}</h3>
          <p>${this.escapeHtml(item.shortDescription || "Experiencia disponible.")}</p>
          <a class="btn" href="./product.html?slug=${encodeURIComponent(item.slug)}">Ver experiencia</a>
        </div>
      </article>
    `).join("");
  }

  updatePassengersUI() {
    this.setText("adultsCount", String(this.adults));
    this.setText("childrenCount", String(this.children));
  }

  updatePricing() {
    if (!this.product) return;

    const currency = this.product.currency || "USD";
    const adultPrice = this.product.basePricing?.adult || 0;
    const childPrice = this.product.basePricing?.child || adultPrice;

    const adultsTotal = this.adults * adultPrice;
    const childrenTotal = this.children * childPrice;
    const extrasTotal = this.calculateExtrasTotal();

    const subtotal = adultsTotal + childrenTotal + extrasTotal;

    const fullDiscountPercent = this.product.paymentOptions?.fullPaymentDiscountPercent || 0;
    const partialPerPerson = this.product.paymentOptions?.partialPaymentPerPerson || 49.9;

    let discount = 0;
    let payNow = subtotal;
    let infoText = "";

    if (this.paymentMode === "full") {
      discount = subtotal * (fullDiscountPercent / 100);
      payNow = subtotal - discount;
      infoText = fullDiscountPercent > 0
        ? `Pagando el total ahora accedes a un descuento del ${fullDiscountPercent}%.`
        : "Pagarás el total completo ahora.";
    } else {
      const totalPassengers = this.adults + this.children;
      payNow = totalPassengers * partialPerPerson;
      infoText =
        this.product.paymentOptions?.partialPaymentLabel ||
        `Separas tu cupo pagando ${currency} ${this.formatMoney(partialPerPerson)} por persona.`;
    }

    this.setText("adultsTotal", `${currency} ${this.formatMoney(adultsTotal)}`);
    this.setText("childrenTotal", `${currency} ${this.formatMoney(childrenTotal)}`);
    this.setText("extrasTotal", `${currency} ${this.formatMoney(extrasTotal)}`);
    this.setText("serviceTotal", `${currency} ${this.formatMoney(subtotal)}`);
    this.setText("payNowTotal", `${currency} ${this.formatMoney(payNow)}`);
    this.setText("discountTotal", `- ${currency} ${this.formatMoney(discount)}`);
    this.setText("payNowLabel", this.paymentMode === "full" ? "Pagar ahora" : "Separar ahora");

    const discountRow = document.getElementById("discountRow");
    if (discountRow) {
      discountRow.hidden = !(this.paymentMode === "full" && discount > 0);
    }

    const paymentInfo = document.getElementById("paymentInfo");
    if (paymentInfo) paymentInfo.textContent = infoText;
  }

  calculateExtrasTotal() {
    if (!this.product?.extras?.length) return 0;

    const passengers = this.adults + this.children;

    return this.product.extras.reduce((total, extra) => {
      if (!this.selectedExtras.has(extra.code)) return total;

      const price = extra.price || 0;
      if (extra.perPerson) return total + (price * passengers);
      return total + price;
    }, 0);
  }

  handlePaypalAction() {
    const summary = this.getBookingSummary();
    alert(
      `Aquí conectarás PayPal.\n\n` +
      `Tour: ${summary.title}\n` +
      `Fecha: ${summary.date}\n` +
      `Adultos: ${summary.adults}\n` +
      `Niños: ${summary.children}\n` +
      `Extras: ${summary.extras.join(", ") || "Ninguno"}\n` +
      `Modalidad: ${summary.paymentMode}\n` +
      `Monto a pagar ahora: ${summary.payNow}`
    );
  }

  showBookingPreview() {
    const summary = this.getBookingSummary();
    alert(
      `Resumen de reserva:\n\n` +
      `Tour: ${summary.title}\n` +
      `Fecha: ${summary.date}\n` +
      `Adultos: ${summary.adults}\n` +
      `Niños: ${summary.children}\n` +
      `Extras: ${summary.extras.join(", ") || "Ninguno"}\n` +
      `Servicio total: ${summary.serviceTotal}\n` +
      `Pagar ahora: ${summary.payNow}\n` +
      `Modalidad: ${summary.paymentMode}`
    );
  }

  getBookingSummary() {
    const currency = this.product.currency || "USD";
    const adultPrice = this.product.basePricing?.adult || 0;
    const childPrice = this.product.basePricing?.child || adultPrice;

    const adultsTotal = this.adults * adultPrice;
    const childrenTotal = this.children * childPrice;
    const extrasTotal = this.calculateExtrasTotal();
    const subtotal = adultsTotal + childrenTotal + extrasTotal;

    const fullDiscountPercent = this.product.paymentOptions?.fullPaymentDiscountPercent || 0;
    const partialPerPerson = this.product.paymentOptions?.partialPaymentPerPerson || 49.9;

    let payNow = subtotal;
    if (this.paymentMode === "full") {
      payNow = subtotal - (subtotal * (fullDiscountPercent / 100));
    } else {
      const totalPassengers = this.adults + this.children;
      payNow = totalPassengers * partialPerPerson;
    }

    const selectedExtras = (this.product.extras || [])
      .filter((extra) => this.selectedExtras.has(extra.code))
      .map((extra) => extra.label);

    return {
      title: this.product.title,
      date: this.date || "No seleccionada",
      adults: this.adults,
      children: this.children,
      extras: selectedExtras,
      serviceTotal: `${currency} ${this.formatMoney(subtotal)}`,
      payNow: `${currency} ${this.formatMoney(payNow)}`,
      paymentMode: this.paymentMode === "full" ? "Pago completo" : "Separar cupo"
    };
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
            <a class="btn" href="./all-experiences.html">Ver todas las experiencias</a>
          </div>
        </div>
      </section>
    `;
  }

  setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  formatMoney(value) {
    return Number(value || 0).toFixed(2);
  }

  escapeHtml(value) {
    return String(value)
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
