class RestaurantsDirectory {
  constructor() {
    this.restaurants = [];
    this.filteredRestaurants = [];
    this.activeRestaurant = null;
    this.elements = {
      grid: document.getElementById("restaurantsGrid"),
      empty: document.getElementById("restaurantsEmpty"),
      count: document.getElementById("restaurantsCount"),
      search: document.getElementById("restaurantSearch"),
      cuisine: document.getElementById("restaurantCuisine"),
      area: document.getElementById("restaurantArea"),
      sort: document.getElementById("restaurantSort"),
      detailsModal: document.getElementById("restaurantDetailsModal"),
      detailsContent: document.getElementById("restaurantDetailsContent"),
      reservationModal: document.getElementById("restaurantReservationModal"),
      reservationTitle: document.getElementById("restaurantReservationTitle"),
      reservationForm: document.getElementById("restaurantReservationForm")
    };

    this.init();
  }

  async init() {
    await this.loadRestaurants();
    this.populateFilters();
    this.bindEvents();
    this.applyFilters();
  }

  async loadRestaurants() {
    try {
      const response = await fetch("restaurantes/restaurantes.json");
      if (!response.ok) throw new Error(`No se pudo cargar restaurantes.json (${response.status})`);
      const data = await response.json();
      this.restaurants = Array.isArray(data.restaurants) ? data.restaurants : [];
      this.filteredRestaurants = [...this.restaurants];
    } catch (error) {
      console.error("Error cargando restaurantes:", error);
      this.restaurants = [];
      this.filteredRestaurants = [];
    }
  }

  populateFilters() {
    const cuisines = new Set();
    const areas = new Set();

    this.restaurants.forEach((restaurant) => {
      (restaurant.cuisine || []).forEach((item) => cuisines.add(item));
      if (restaurant.area) areas.add(restaurant.area);
    });

    this.fillSelect(this.elements.cuisine, Array.from(cuisines).sort(), "Todas las cocinas");
    this.fillSelect(this.elements.area, Array.from(areas).sort(), "Todas las zonas");
  }

  fillSelect(select, values, firstLabel) {
    if (!select) return;
    select.innerHTML = `<option value="">${firstLabel}</option>` + values.map((value) => (
      `<option value="${this.escapeHtml(value)}">${this.escapeHtml(value)}</option>`
    )).join("");
  }

  bindEvents() {
    [this.elements.search, this.elements.cuisine, this.elements.area, this.elements.sort].forEach((element) => {
      element?.addEventListener("input", () => this.applyFilters());
      element?.addEventListener("change", () => this.applyFilters());
    });

    document.querySelectorAll("[data-restaurant-modal-close]").forEach((button) => {
      button.addEventListener("click", () => this.closeModals());
    });

    [this.elements.detailsModal, this.elements.reservationModal].forEach((modal) => {
      modal?.addEventListener("click", (event) => {
        if (event.target.classList.contains("restaurant-modal__backdrop")) {
          this.closeModals();
        }
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.closeModals();
    });

    this.elements.reservationForm?.addEventListener("submit", (event) => this.handleReservationSubmit(event));
  }

  applyFilters() {
    const term = (this.elements.search?.value || "").trim().toLowerCase();
    const cuisine = this.elements.cuisine?.value || "";
    const area = this.elements.area?.value || "";
    const sort = this.elements.sort?.value || "name";

    this.filteredRestaurants = this.restaurants.filter((restaurant) => {
      const searchable = [
        restaurant.name,
        restaurant.type,
        restaurant.area,
        restaurant.address,
        restaurant.shortDescription,
        ...(restaurant.cuisine || [])
      ].join(" ").toLowerCase();

      const matchesTerm = !term || searchable.includes(term);
      const matchesCuisine = !cuisine || (restaurant.cuisine || []).includes(cuisine);
      const matchesArea = !area || restaurant.area === area;
      return matchesTerm && matchesCuisine && matchesArea;
    });

    this.filteredRestaurants.sort((a, b) => {
      if (sort === "area") return (a.area || "").localeCompare(b.area || "") || a.name.localeCompare(b.name);
      if (sort === "cuisine") return ((a.cuisine || [])[0] || "").localeCompare(((b.cuisine || [])[0] || "")) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });

    this.render();
  }

  render() {
    if (!this.elements.grid) return;

    if (this.elements.count) {
      this.elements.count.textContent = `${this.filteredRestaurants.length} restaurante${this.filteredRestaurants.length === 1 ? "" : "s"} encontrado${this.filteredRestaurants.length === 1 ? "" : "s"}`;
    }

    this.elements.empty?.classList.toggle("is-visible", !this.filteredRestaurants.length);

    this.elements.grid.innerHTML = this.filteredRestaurants.map((restaurant) => this.renderCard(restaurant)).join("");

    this.elements.grid.querySelectorAll("[data-open-details]").forEach((button) => {
      button.addEventListener("click", () => this.openDetails(button.dataset.openDetails));
    });

    this.elements.grid.querySelectorAll("[data-open-reservation]").forEach((button) => {
      button.addEventListener("click", () => this.openReservation(button.dataset.openReservation));
    });
  }

  renderCard(restaurant) {
    const initials = this.getInitials(restaurant.name);
    const tags = (restaurant.cuisine || []).slice(0, 3).map((tag) => `<span class="restaurant-tag">${this.escapeHtml(tag)}</span>`).join("");
    const cover = restaurant.coverImage ? `<img src="${this.escapeHtml(restaurant.coverImage)}" alt="${this.escapeHtml(restaurant.name)}" loading="lazy">` : "";

    return `
      <article class="restaurant-card">
        <div class="restaurant-card__media">
          ${cover}
          <span class="restaurant-card__initials">${initials}</span>
        </div>
        <div class="restaurant-card__body">
          <div>
            <h2>${this.escapeHtml(restaurant.name)}</h2>
            <div class="restaurant-tags">${tags}</div>
          </div>
          <div class="restaurant-meta">
            <span><i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(restaurant.address || restaurant.area || "Cusco")}</span>
            <span><i class="fas fa-utensils"></i> ${this.escapeHtml(restaurant.type || "Restaurante")}</span>
          </div>
          <p class="restaurant-card__text">${this.escapeHtml(restaurant.shortDescription || "Restaurante recomendado en Cusco.")}</p>
          <div class="restaurant-card__actions">
            <button type="button" class="restaurant-btn restaurant-btn--outline restaurant-btn--compact" data-open-details="${this.escapeHtml(restaurant.id)}">
              Ver detalles
            </button>
            <button type="button" class="restaurant-btn restaurant-btn--gold restaurant-btn--compact" data-open-reservation="${this.escapeHtml(restaurant.id)}">
              Reservar
            </button>
          </div>
        </div>
      </article>
    `;
  }

  openDetails(id) {
    const restaurant = this.findRestaurant(id);
    if (!restaurant || !this.elements.detailsModal || !this.elements.detailsContent) return;
    this.activeRestaurant = restaurant;

    const gallery = Array.isArray(restaurant.gallery) && restaurant.gallery.length
      ? restaurant.gallery.map((src) => `<img src="${this.escapeHtml(src)}" alt="${this.escapeHtml(restaurant.name)}" loading="lazy">`).join("")
      : `<div class="restaurant-detail__gallery-placeholder">Puedes agregar fotos propias o links autorizados en <strong>restaurantes.json</strong>.</div>`;

    const highlights = (restaurant.highlights || []).map((item) => `<span class="restaurant-tag">${this.escapeHtml(item)}</span>`).join("");
    const cover = restaurant.coverImage ? `<img src="${this.escapeHtml(restaurant.coverImage)}" alt="${this.escapeHtml(restaurant.name)}" loading="lazy">` : "";

    this.elements.detailsContent.innerHTML = `
      <section class="restaurant-detail">
        <div class="restaurant-detail__media">
          ${cover}
          <h3>${this.escapeHtml(restaurant.name)}</h3>
          <p>${this.escapeHtml((restaurant.cuisine || []).join(" · "))}</p>
        </div>
        <div class="restaurant-detail__content">
          <div>
            <h4>Sobre el restaurante</h4>
            <p>${this.escapeHtml(restaurant.details || restaurant.shortDescription || "")}</p>
          </div>

          <div class="restaurant-detail__info">
            <span><i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(restaurant.address || "Cusco")}</span>
            <span><i class="fas fa-clock"></i> ${this.escapeHtml(restaurant.schedule || "Horario por confirmar")}</span>
            ${restaurant.phone ? `<span><i class="fas fa-phone"></i> ${this.escapeHtml(restaurant.phone)}</span>` : ""}
          </div>

          <div>
            <h4>Detalles destacados</h4>
            <div class="restaurant-detail__highlights">${highlights}</div>
          </div>

          <div>
            <h4>Galería / carta</h4>
            <div class="restaurant-detail__gallery">${gallery}</div>
          </div>

          <div class="restaurant-detail__actions">
            ${restaurant.menuUrl ? `<a class="restaurant-btn restaurant-btn--outline" href="${this.escapeHtml(restaurant.menuUrl)}" target="_blank" rel="noopener">Ver carta / fuente</a>` : ""}
            ${restaurant.mapUrl ? `<a class="restaurant-btn restaurant-btn--outline" href="${this.escapeHtml(restaurant.mapUrl)}" target="_blank" rel="noopener">Ver ubicación</a>` : ""}
            <button type="button" class="restaurant-btn restaurant-btn--gold" data-open-reservation-from-detail="${this.escapeHtml(restaurant.id)}">Solicitar reserva</button>
          </div>
        </div>
      </section>
    `;

    this.elements.detailsContent.querySelector("[data-open-reservation-from-detail]")?.addEventListener("click", (event) => {
      this.openReservation(event.currentTarget.dataset.openReservationFromDetail);
    });

    this.elements.detailsModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  openReservation(id) {
    const restaurant = this.findRestaurant(id);
    if (!restaurant || !this.elements.reservationModal || !this.elements.reservationTitle) return;
    this.activeRestaurant = restaurant;
    this.elements.reservationTitle.textContent = `Reservar en ${restaurant.name}`;
    this.elements.reservationModal.hidden = false;
    this.elements.detailsModal && (this.elements.detailsModal.hidden = true);
    document.body.style.overflow = "hidden";

    const restaurantInput = this.elements.reservationForm?.querySelector("[name='restaurant']");
    if (restaurantInput) restaurantInput.value = restaurant.name;
  }

  handleReservationSubmit(event) {
    event.preventDefault();
    if (!this.activeRestaurant || !this.elements.reservationForm) return;

    const formData = new FormData(this.elements.reservationForm);
    const diners = formData.get("diners") || "";
    const date = formData.get("date") || "";
    const time = formData.get("time") || "";
    const name = formData.get("name") || "";
    const whatsapp = formData.get("whatsapp") || "";
    const notes = formData.get("notes") || "";

    const message = [
      `Hola My Cusco Trip, quiero solicitar una reserva de restaurante.`,
      `Restaurante: ${this.activeRestaurant.name}`,
      `Comensales: ${diners}`,
      `Fecha: ${date}`,
      `Hora: ${time}`,
      `Nombre: ${name}`,
      `WhatsApp: ${whatsapp}`,
      notes ? `Notas: ${notes}` : ""
    ].filter(Boolean).join("\n");

    const whatsappUrl = `https://wa.me/51900608980?text=${encodeURIComponent(message)}`;

    if (window.MCTTracking?.track) {
      window.MCTTracking.track("restaurant_reservation_request", {
        restaurant_id: this.activeRestaurant.id,
        restaurant_name: this.activeRestaurant.name,
        diners,
        date,
        time
      });
    }

    window.open(whatsappUrl, "_blank", "noopener");
  }

  closeModals() {
    if (this.elements.detailsModal) this.elements.detailsModal.hidden = true;
    if (this.elements.reservationModal) this.elements.reservationModal.hidden = true;
    document.body.style.overflow = "";
  }

  findRestaurant(id) {
    return this.restaurants.find((restaurant) => restaurant.id === id);
  }

  getInitials(name) {
    return String(name || "R")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item[0])
      .join("")
      .toUpperCase();
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

function initializeRestaurantsDirectory() {
  if (document.body.classList.contains("restaurants-page")) {
    new RestaurantsDirectory();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeRestaurantsDirectory);
} else {
  initializeRestaurantsDirectory();
}
