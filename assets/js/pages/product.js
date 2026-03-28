class MyCuscoTripProductPage {
  constructor() {
    this.params = new URLSearchParams(window.location.search);
    this.slug = this.params.get("slug");

    this.init();
  }

  async init() {
    if (!this.slug) {
      this.renderNotFound("No se recibió un tour válido.");
      return;
    }

    try {
      const tours = await this.loadTours();
      const product = tours.find((item) => item.slug === this.slug);

      if (!product) {
        this.renderNotFound("No encontramos esta experiencia.");
        return;
      }

      this.renderProduct(product);
    } catch (error) {
      console.error("Error loading product:", error);
      this.renderNotFound("No se pudo cargar la experiencia.");
    }
  }

  async loadTours() {
    const localProducts = JSON.parse(localStorage.getItem("experiences") || "[]");

    if (localProducts.length > 0) {
      return localProducts;
    }

    const response = await fetch("./assets/data/tours.json");
    if (!response.ok) {
      throw new Error("No se pudo cargar tours.json");
    }

    return await response.json();
  }

  renderProduct(product) {
    const title = product.title || "Experiencia";
    const shortDescription =
      product.shortDescription ||
      "Experiencia disponible para reserva inmediata.";
    const description =
      product.description ||
      product.shortDescription ||
      "Pronto agregaremos más detalles de esta experiencia.";

    const badge = product.badge || "Destacado";
    const typeLabel = product.typeLabel || "Experiencia";
    const location = product.location || "Cusco, Perú";
    const duration = product.duration?.label || "Duración por confirmar";
    const languages = product.duration?.guideLanguages?.length
      ? product.duration.guideLanguages.join(", ")
      : "Por confirmar";
    const price = product.basePricing?.adult || 0;
    const currency = product.currency || "USD";
    const capacity = product.capacity || product.duration?.maxGroupSize || "Por confirmar";
    const category = product.category || "general";

    document.title = `${title} | My Cusco Trip`;

    this.setText("productBadge", badge);
    this.setText("productType", typeLabel);
    this.setText("productTitle", title);
    this.setText("productShortDescription", shortDescription);
    this.setText("productLocation", location);
    this.setText("productDuration", duration);
    this.setText("productLanguages", languages);
    this.setText("productPrice", `${currency} ${price}`);
    this.setText("productDescription", description);

    this.setText("sideCategory", category);
    this.setText("sideLocation", location);
    this.setText("sideDuration", duration);
    this.setText("sideCapacity", String(capacity));

    this.renderGallery(product.images);
    this.renderList("productIncludes", product.includes || []);
    this.renderList("productExcludes", product.excludes || []);
    this.renderItinerary(product.itinerary || []);
    this.renderFaq(product.faq || []);
    this.setWhatsappLink(product, currency, price);
  }

  renderGallery(images = {}) {
    const gallery = document.getElementById("productGallery");
    if (!gallery) return;

    const cover = images.cover ? [images.cover] : [];
    const galleryImages = Array.isArray(images.gallery) ? images.gallery : [];
    const finalImages = [...new Set([...cover, ...galleryImages])];

    gallery.innerHTML = finalImages.length
      ? finalImages
          .map(
            (src, index) =>
              `<img src="${src}" alt="Imagen ${index + 1} de la experiencia" loading="lazy" />`
          )
          .join("")
      : `<p>No hay imágenes disponibles.</p>`;
  }

  renderList(targetId, items) {
    const target = document.getElementById(targetId);
    if (!target) return;

    if (!items.length) {
      target.innerHTML = "<li>Información por confirmar.</li>";
      return;
    }

    target.innerHTML = items.map((item) => `<li>${this.escapeHtml(item)}</li>`).join("");
  }

  renderItinerary(items) {
    const target = document.getElementById("productItinerary");
    if (!target) return;

    if (!items.length) {
      target.innerHTML = "<p>Itinerario por confirmar.</p>";
      return;
    }

    target.innerHTML = items
      .map(
        (item) => `
          <div class="product-itinerary-item">
            <h3>${this.escapeHtml(item.title || "Paso del itinerario")}</h3>
            <p>${this.escapeHtml(item.description || "")}</p>
          </div>
        `
      )
      .join("");
  }

  renderFaq(items) {
    const target = document.getElementById("productFaq");
    if (!target) return;

    if (!items.length) {
      target.innerHTML = "<p>Pronto agregaremos preguntas frecuentes.</p>";
      return;
    }

    target.innerHTML = items
      .map(
        (item) => `
          <div class="product-faq-item">
            <h3>${this.escapeHtml(item.q || "Pregunta")}</h3>
            <p>${this.escapeHtml(item.a || "")}</p>
          </div>
        `
      )
      .join("");
  }

  setWhatsappLink(product, currency, price) {
    const btn = document.getElementById("productWhatsappBtn");
    if (!btn) return;

    const text = [
      "Hola, quiero información sobre esta experiencia:",
      `${product.title || "Experiencia"}`,
      `Slug: ${product.slug || ""}`,
      `Precio desde: ${currency} ${price}`
    ].join("\n");

    btn.href = `https://wa.me/51900608980?text=${encodeURIComponent(text)}`;
  }

  renderNotFound(message) {
    const main = document.querySelector(".product-page");
    if (!main) return;

    main.innerHTML = `
      <section class="product-content-section">
        <div class="container">
          <div class="product-block">
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
