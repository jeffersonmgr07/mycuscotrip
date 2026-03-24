class MyCuscoTripProducts {
  constructor() {
    this.productsContainer = document.getElementById("products-container");
    this.currentLang = this.getLang();
    this.init();
  }

  async init() {
    if (!this.productsContainer) return;

    try {
      const products = await this.loadProducts();
      this.renderProducts(products);
      console.log("Products module initialized successfully");
    } catch (error) {
      console.error("Error loading products:", error);
      this.renderError();
    }
  }

  getLang() {
    const params = new URLSearchParams(window.location.search);
    return params.get("lang") || localStorage.getItem("site_lang") || "es";
  }

  async loadProducts() {
    const localProducts = JSON.parse(localStorage.getItem("experiences") || "[]");

    if (localProducts.length > 0) {
      return localProducts.map((item) => this.normalizeProduct(item));
    }

    const response = await fetch("./assets/data/tours.json");
    if (!response.ok) {
      throw new Error("No se pudo cargar tours.json");
    }

    const tours = await response.json();
    return tours.map((item) => this.normalizeProduct(item));
  }

  normalizeProduct(item) {
    const title =
      item.title ||
      item.name ||
      "Experiencia";

    const description =
      item.shortDescription ||
      item.description ||
      "Experiencia disponible para reserva inmediata.";

    const category = item.category || "machu-picchu";

    const image =
      item.images?.cover ||
      "./assets/img/tours/machu-picchu-full-day/cover.jpg";

    const price =
      item.basePricing?.adult ||
      item.price ||
      0;

    const currency =
      item.currency ||
      "USD";

    const duration =
      item.duration?.label ||
      item.durationLabel ||
      "Duración por confirmar";

    const featured =
      item.featured !== false;

    const badge =
      item.badge ||
      this.getBadgeByCategory(category);

    return {
      id: item.id || item.slug,
      slug: item.slug,
      title,
      description,
      category,
      image,
      price,
      currency,
      duration,
      featured,
      badge,
      location: item.location || "Cusco, Perú",
      typeLabel: item.typeLabel || "Experiencia"
    };
  }

  getBadgeByCategory(category) {
    const map = {
      "machu-picchu": "Top ventas",
      "cusco": "Recomendado",
      "paquetes": "Paquete destacado",
      "peru": "Nuevo destino"
    };

    return map[category] || "Destacado";
  }

  getCategoryTitle(category) {
    const map = {
      "machu-picchu": "Tours a Machu Picchu",
      "cusco": "Tours en Cusco",
      "paquetes": "Paquetes completos",
      "peru": "Explora Perú"
    };

    return map[category] || "Experiencias";
  }

  getProductUrl(product) {
    return `./product.html?slug=${encodeURIComponent(product.slug)}&lang=${encodeURIComponent(this.currentLang)}`;
  }

  groupFeaturedProducts(products) {
    const featuredProducts = products.filter((product) => product.featured);

    if (!featuredProducts.length) {
      return products.slice(0, 6);
    }

    return featuredProducts.slice(0, 6);
  }

  renderProducts(products) {
    if (!products || !products.length) {
      this.renderEmpty();
      return;
    }

    const featuredProducts = this.groupFeaturedProducts(products);

    this.productsContainer.innerHTML = featuredProducts
      .map((product) => this.createProductCard(product))
      .join("");

    this.attachEvents(featuredProducts);
  }

  createProductCard(product) {
    return `
      <article class="featured-card" data-product-id="${product.id}">
        <div class="featured-card__image">
          <img src="${product.image}" alt="${this.escapeHtml(product.title)}" loading="lazy" />
          <span class="featured-card__badge">${this.escapeHtml(product.badge)}</span>
        </div>

        <div class="featured-card__content">
          <p class="featured-card__meta">${this.escapeHtml(product.location)}</p>
          <h3>${this.escapeHtml(product.title)}</h3>
          <p class="featured-card__description">${this.escapeHtml(product.description)}</p>

          <div class="featured-card__details">
            <span><i class="fas fa-clock"></i> ${this.escapeHtml(product.duration)}</span>
            <span><i class="fas fa-tag"></i> ${this.escapeHtml(product.currency)} ${this.escapeHtml(String(product.price))}</span>
          </div>

          <div class="featured-card__actions">
            <a class="btn product-link-btn" href="${this.getProductUrl(product)}" data-slug="${this.escapeHtml(product.slug)}">
              Ver experiencia
            </a>
          </div>
        </div>
      </article>
    `;
  }

  attachEvents(products) {
    const buttons = this.productsContainer.querySelectorAll(".product-link-btn");

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const slug = button.dataset.slug;
        const product = products.find((item) => item.slug === slug);

        if (product) {
          console.log("Opening product:", product.slug);
        }
      });
    });
  }

  renderEmpty() {
    this.productsContainer.innerHTML = `
      <div class="empty-products">
        <p>No hay experiencias destacadas disponibles todavía.</p>
      </div>
    `;
  }

  renderError() {
    this.productsContainer.innerHTML = `
      <div class="empty-products">
        <p>No se pudieron cargar las experiencias en este momento.</p>
      </div>
    `;
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
  window.MyCuscoTripProducts = new MyCuscoTripProducts();
});
