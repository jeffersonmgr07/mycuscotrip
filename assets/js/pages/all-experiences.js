class MyCuscoTripAllExperiences {
  constructor() {
    this.container = document.getElementById("allExperiencesContainer");
    this.emptyState = document.getElementById("listingEmptyState");
    this.resultsCount = document.getElementById("resultsCount");
    this.summary = document.getElementById("listing-summary");

    this.searchInput = document.getElementById("filterSearch");
    this.categorySelect = document.getElementById("filterCategory");
    this.sortSelect = document.getElementById("filterSort");
    this.clearBtn = document.getElementById("clearFiltersBtn");

    this.allProducts = [];
    this.filteredProducts = [];

    this.params = new URLSearchParams(window.location.search);

    this.init();
  }

  async init() {
    if (!this.container) return;

    try {
      this.syncFiltersFromUrl();
      this.bindEvents();

      this.allProducts = await this.loadProducts();
      this.applyInitialUrlFilters();
      this.applyFilters();
    } catch (error) {
      console.error("Error inicializando all-experiences:", error);
      this.renderError(
        "No se pudieron cargar las experiencias. Revisa si existe ./assets/data/tours.json y si el JSON es válido."
      );
    }
  }

  async loadProducts() {
    const localProducts = JSON.parse(localStorage.getItem("experiences") || "[]");

    if (localProducts.length > 0) {
      return localProducts
        .map((item) => this.normalizeProduct(item))
        .filter((item) => item.status !== "draft");
    }

    const response = await fetch("./assets/data/tours.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`No se pudo cargar tours.json (${response.status})`);
    }

    const tours = await response.json();

    if (!Array.isArray(tours)) {
      throw new Error("tours.json no contiene un array válido");
    }

    return tours
      .map((item) => this.normalizeProduct(item))
      .filter((item) => item.status !== "draft");
  }

  normalizeProduct(item) {
    return {
      id: item.id || item.slug,
      slug: item.slug,
      title: item.title || item.name || "Experiencia",
      category: item.category || "cusco",
      description:
        item.shortDescription ||
        item.description ||
        "Experiencia disponible para reserva inmediata.",
      price: item.basePricing?.adult || item.price || 0,
      currency: item.currency || "USD",
      image:
        item.images?.cover ||
        "./assets/img/tours/machu-picchu-full-day/cover.jpg",
      featured: item.featured !== false,
      badge: item.badge || this.getBadgeByCategory(item.category),
      location: item.location || "Cusco, Perú",
      duration: item.duration?.label || "Duración por confirmar",
      typeLabel: item.typeLabel || "Experiencia",
      status: item.status || "published"
    };
  }

  getBadgeByCategory(category) {
    const map = {
      "machu-picchu": "Top ventas",
      "cusco": "Recomendado",
      "paquetes": "Paquete",
      "peru": "Nuevo"
    };

    return map[category] || "Destacado";
  }

  syncFiltersFromUrl() {
    const destino = this.params.get("destino") || "";
    const search = this.params.get("q") || "";

    if (destino && this.categorySelect) {
      this.categorySelect.value = destino;
    }

    if (search && this.searchInput) {
      this.searchInput.value = search;
    }
  }

  applyInitialUrlFilters() {
    const tipo = this.params.get("tipo");
    const destino = this.params.get("destino");
    const adultos = this.params.get("adultos");
    const ninos = this.params.get("ninos");
    const fecha = this.params.get("fecha");

    const fragments = [];

    if (tipo === "paquetes") {
      fragments.push("Mostrando paquetes completos");
    } else if (tipo === "tours") {
      fragments.push("Mostrando tours");
    }

    if (destino) {
      fragments.push(`en ${this.getDestinationLabel(destino)}`);
    }

    if (fecha) {
      fragments.push(`para la fecha ${fecha}`);
    }

    const totalPax =
      (parseInt(adultos || "0", 10) || 0) + (parseInt(ninos || "0", 10) || 0);

    if (totalPax > 0) {
      fragments.push(`para ${totalPax} pasajero${totalPax === 1 ? "" : "s"}`);
    }

    if (this.summary) {
      this.summary.textContent = fragments.length
        ? `${fragments.join(" ")}.`
        : "Explora tours y paquetes disponibles según tu búsqueda.";
    }
  }

  getDestinationLabel(destino) {
    const map = {
      "machu-picchu": "Machu Picchu",
      "cusco": "Cusco",
      "paquetes": "Paquetes completos",
      "peru": "Perú"
    };

    return map[destino] || destino;
  }

  bindEvents() {
    this.searchInput?.addEventListener("input", () => this.applyFilters());
    this.categorySelect?.addEventListener("change", () => this.applyFilters());
    this.sortSelect?.addEventListener("change", () => this.applyFilters());

    this.clearBtn?.addEventListener("click", () => {
      if (this.searchInput) this.searchInput.value = "";
      if (this.categorySelect) this.categorySelect.value = "";
      if (this.sortSelect) this.sortSelect.value = "featured";
      this.applyFilters();
    });
  }

  applyFilters() {
    const search = (this.searchInput?.value || "").trim().toLowerCase();
    const category = this.categorySelect?.value || "";
    const sort = this.sortSelect?.value || "featured";

    let results = [...this.allProducts];

    if (category) {
      results = results.filter((item) => item.category === category);
    }

    if (search) {
      results = results.filter((item) =>
        [item.title, item.description, item.location, item.category, item.typeLabel]
          .join(" ")
          .toLowerCase()
          .includes(search)
      );
    }

    switch (sort) {
      case "price-asc":
        results.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        results.sort((a, b) => b.price - a.price);
        break;
      case "name-asc":
        results.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "featured":
      default:
        results.sort((a, b) => Number(b.featured) - Number(a.featured));
        break;
    }

    this.filteredProducts = results;
    this.renderResults();
  }

  renderResults() {
    if (!this.filteredProducts.length) {
      this.container.innerHTML = "";
      if (this.emptyState) this.emptyState.hidden = false;
      if (this.resultsCount) this.resultsCount.textContent = "0 experiencias encontradas";
      return;
    }

    if (this.emptyState) this.emptyState.hidden = true;
    if (this.resultsCount) {
      this.resultsCount.textContent = `${this.filteredProducts.length} experiencia${this.filteredProducts.length === 1 ? "" : "s"} encontrada${this.filteredProducts.length === 1 ? "" : "s"}`;
    }

    this.container.innerHTML = this.filteredProducts
      .map((product) => this.createCard(product))
      .join("");
  }

  createCard(product) {
    return `
      <article class="listing-card">
        <div class="listing-card__image">
          <img src="${product.image}" alt="${this.escapeHtml(product.title)}" loading="lazy" />
          <span class="listing-card__badge">${this.escapeHtml(product.badge)}</span>
        </div>

        <div class="listing-card__content">
          <p class="listing-card__meta">${this.escapeHtml(product.location)}</p>
          <h3>${this.escapeHtml(product.title)}</h3>
          <p class="listing-card__description">${this.escapeHtml(product.description)}</p>

          <div class="listing-card__details">
            <span><i class="fas fa-clock"></i> ${this.escapeHtml(product.duration)}</span>
            <span><i class="fas fa-tag"></i> ${this.escapeHtml(product.currency)} ${this.escapeHtml(String(product.price))}</span>
          </div>

          <div class="listing-card__actions">
            <a class="btn" href="./product.html?slug=${encodeURIComponent(product.slug)}">
              Ver experiencia
            </a>
          </div>
        </div>
      </article>
    `;
  }

  renderError(message) {
    if (this.container) this.container.innerHTML = "";
    if (this.emptyState) {
      this.emptyState.hidden = false;
      const p = this.emptyState.querySelector("p");
      if (p) p.textContent = message;
    }
    if (this.resultsCount) this.resultsCount.textContent = "Error al cargar experiencias";
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
  window.MyCuscoTripAllExperiences = new MyCuscoTripAllExperiences();
});
