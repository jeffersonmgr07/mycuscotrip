"use strict";

(function () {
  function init() {
    const dataNode = document.getElementById("package-landing-data");
    const form = document.getElementById("package-quote-form");
    if (!dataNode || !form) return;
    let product;
    try { product = JSON.parse(dataNode.textContent); } catch (_) { return; }

    // A catalog fare must be approved, positive and identical to the static HTML.
    // Unpriced requests must never create a USD 0 product or a false purchase.
    const hasPrice = typeof product.adultPrice === "number" &&
      Number.isFinite(product.adultPrice) && product.adultPrice > 0;
    if (hasPrice) window.MyCuscoTripTracking?.trackCatalogProduct?.(product, product.currency);
    window.MyCuscoTripTracking?.track?.("landing_view", {
      item_id: product.id, item_name: product.title,
      product_slug: product.slug, days: product.days, nights: product.nights,
      event_category: "package_landing"
    });

    const start = form.elements.namedItem("start");
    if (start) {
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit"
      }).format(new Date());
      start.min = today;
    }

    // Let the browser perform native validation and GET navigation. The existing
    // quote page derives the departure date from the duration and chosen arrival.
    form.addEventListener("submit", () => {
      const params = new URLSearchParams(window.location.search);
      ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"].forEach((key) => {
        const value = params.get(key);
        if (!value) return;
        let input = form.querySelector(`input[name="${key}"]`);
        if (!input) {
          input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          form.appendChild(input);
        }
        input.value = value;
      });
      window.MyCuscoTripTracking?.track?.("package_customize", {
        item_id: product.id, product_slug: product.slug,
        event_category: "package_landing"
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
