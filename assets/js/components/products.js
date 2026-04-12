class MyCuscoTripProducts {
  constructor() {
    this.productsContainer = document.getElementById("products-container");
    this.init();
  }

  async init() {
    if (!this.productsContainer) return;
    const products = await this.loadProducts();
    this.renderProducts(products);
  }

  async loadProducts() {
    const localProducts = JSON.parse(localStorage.getItem("experiences") || "[]");
    if (localProducts.length) {
      return localProducts.map(this.normalizeProduct).slice(0, 6);
    }

    try {
      const response = await fetch("./assets/data/tours.json");
      const tours = await response.json();
      return tours.map(this.normalizeProduct).slice(0, 6);
    } catch (error) {
      console.error("Error loading products:", error);
      return [];
    }
  }

  normalizeProduct(item) {
    return {
      id: item.id || item.slug,
      slug: item.slug,
      name: item.title || item.name || "Experiencia",
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
      badge: item.badge || "Top ventas",
      location: item.location || "Cusco, Perú",
      duration: item.duration?.label || "Duración por confirmar"
    };
  }

  renderProducts(products) {
    if (!products.length) {
      this.productsContainer.innerHTML = `
        <div class="empty-products">
          <p>No hay experiencias destacadas todavía.</p>
        </div>
      `;
      return;
    }

    const featured = products.filter(p => p.featured).slice(0, 6);
    const finalProducts = featured.length >= 6 ? featured : products.slice(0, 6);

    this.productsContainer.innerHTML = finalProducts
      .map(
        product => `
          <article class="featured-card">
            <div class="featured-card__image">
              <img src="${product.image}" alt="${product.name}" loading="lazy" />
              <span class="featured-card__badge">${product.badge}</span>
            </div>

            <div class="featured-card__content">
              <p class="featured-card__meta">${product.location}</p>
              <h3>${product.name}</h3>
              <p class="featured-card__description">${product.description}</p>

              <div class="featured-card__details">
                <span><i class="fas fa-clock"></i> ${product.duration}</span>
                <span><i class="fas fa-tag"></i> ${product.currency} ${product.price}</span>
              </div>

              <div class="featured-card__actions">
                <a class="btn" href="./product.html?slug=${product.slug}">Ver experiencia</a>
              </div>
            </div>
          </article>
        `
      )
      .join("");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.MyCuscoTripProducts = new MyCuscoTripProducts();
});
