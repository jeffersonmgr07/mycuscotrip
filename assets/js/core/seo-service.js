/* My Cusco Trip SEO Service
   Static-site friendly metadata and JSON-LD helper.
   Load this before product.js on product.html or on static pages after core HTML.
*/
(function () {
  const SITE_URL = "https://mycuscotrip.com";
  const DEFAULT_IMAGE = `${SITE_URL}/assets/img/logos/Logo2.png`;

  const DATA_SOURCES = [
    "./assets/data/tours-cusco.json",
    "./assets/data/tours-machu-picchu.json",
    "./assets/data/tours-peru.json",
    "./assets/data/packages-cusco.json",
    "./assets/data/packages-peru.json"
  ];

  function absoluteUrl(pathOrUrl) {
    if (!pathOrUrl) return "";
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    const clean = String(pathOrUrl).replace(/^\.\//, "/").replace(/^\//, "");
    return `${SITE_URL}/${clean}`;
  }

  function ensureMeta(selector, createAttrs) {
    let element = document.head.querySelector(selector);
    if (!element) {
      element = document.createElement("meta");
      Object.entries(createAttrs || {}).forEach(([key, value]) => element.setAttribute(key, value));
      document.head.appendChild(element);
    }
    return element;
  }

  function setMetaName(name, content) {
    if (!content) return;
    const element = ensureMeta(`meta[name="${name}"]`, { name });
    element.setAttribute("content", content);
  }

  function setMetaProperty(property, content) {
    if (!content) return;
    const element = ensureMeta(`meta[property="${property}"]`, { property });
    element.setAttribute("content", content);
  }

  function setCanonical(url) {
    if (!url) return;
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", url);
  }

  function setJsonLd(id, data) {
    if (!data) return;
    let script = document.getElementById(id);
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = id;
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data, null, 2);
  }

  function getItems(json) {
    if (!json || typeof json !== "object") return [];
    return [json.products, json.tours, json.packages, json.packageCards, json.items]
      .flatMap((entry) => (Array.isArray(entry) ? entry : []));
  }

  async function loadCatalogItems() {
    if (window.MyCuscoTripDataLoader && window.MyCuscoTripCatalogNormalizer) {
      const allData = await window.MyCuscoTripDataLoader.loadAllData();
      return window.MyCuscoTripCatalogNormalizer.normalizeCatalog(allData);
    }

    const results = await Promise.all(DATA_SOURCES.map(async (url) => {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) return [];
        const json = await response.json();
        return getItems(json);
      } catch (error) {
        return [];
      }
    }));
    return results.flat();
  }

  function getImage(product) {
    const images = product?.images;
    if (typeof images === "string") return absoluteUrl(images);
    if (images?.cover) return absoluteUrl(images.cover);
    if (Array.isArray(images?.gallery) && images.gallery[0]) return absoluteUrl(images.gallery[0]);
    if (product?.image) return absoluteUrl(product.image);
    return DEFAULT_IMAGE;
  }

  function getDescription(product) {
    return product?.shortDescription || product?.raw?.shortDescription || product?.metaDescription || product?.description || product?.raw?.description || "Reserva tours, paquetes y experiencias en Cusco, Machu Picchu y Peru con My Cusco Trip.";
  }

  function getPrice(product) {
    if (product?.priceMode === "on_request" || product?.priceMode === "quote") return null;
    const commercialRule = window.MCT_getCommercialProductRule?.(product);
    if (commercialRule?.priceMode === "on_request" || commercialRule?.priceMode === "quote") return null;
    const adult = commercialRule?.adult
      ?? product?.price?.amount
      ?? product?.basePricing?.adult
      ?? product?.pricing?.publishedAdultUSD
      ?? product?.basePricingByNationality?.foreign?.adult
      ?? product?.basePricingByNationality?.national?.adult;
    return Number.isFinite(Number(adult)) && Number(adult) > 0 ? Number(adult).toFixed(2) : null;
  }

  function buildTravelAgencySchema() {
    return {
      "@context": "https://schema.org",
      "@type": "TravelAgency",
      "@id": `${SITE_URL}/#travelagency`,
      "name": "My Cusco Trip",
      "url": SITE_URL,
      "logo": DEFAULT_IMAGE,
      "telephone": "+51 900 608 980",
      "email": "reservas@mycuscotrip.com",
      "areaServed": ["Cusco", "Machu Picchu", "Peru"],
      "sameAs": []
    };
  }

  function buildProductSchema(product, canonical) {
    const price = getPrice(product);
    const schema = {
      "@context": "https://schema.org",
      "@type": product?.productKind === "package" ? "TouristTrip" : "TouristTrip",
      "name": product?.title || "Experiencia My Cusco Trip",
      "description": getDescription(product),
      "image": getImage(product),
      "url": canonical,
      "provider": {
        "@type": "TravelAgency",
        "name": "My Cusco Trip",
        "url": SITE_URL
      }
    };

    if (price) {
      schema.offers = {
        "@type": "Offer",
        "price": price,
        "priceCurrency": product?.currency || "USD",
        "availability": "https://schema.org/InStock",
        "url": canonical
      };
    }

    if (product?.location) {
      schema.touristType = ["Viajeros nacionales", "Viajeros internacionales"];
      schema.itinerary = {
        "@type": "ItemList",
        "name": product.location
      };
    }

    return schema;
  }

  async function applyProductSeo() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");
    if (!slug || !/product\.html$/i.test(window.location.pathname)) return;

    const products = await loadCatalogItems();
    const product = window.MyCuscoTripCatalogNormalizer?.getProductBySlug
      ? window.MyCuscoTripCatalogNormalizer.getProductBySlug(slug, products)
      : products.find((item) => item && item.slug === slug);
    if (!product) return;

    const locale = String(window.MCT_LOCALE || document.documentElement.lang || "es").slice(0, 2).toLowerCase();
    const localePrefix = locale === "es" ? "" : `/${locale}`;
    const canonicalSlug = product.slug || slug;
    const title = `${product.title} | My Cusco Trip`;
    const description = getDescription(product).slice(0, 158);
    const canonical = `${SITE_URL}${localePrefix}/product.html?slug=${encodeURIComponent(canonicalSlug)}`;
    const image = getImage(product);

    document.title = title;
    setMetaName("description", description);
    setCanonical(canonical);
    setMetaProperty("og:title", title);
    setMetaProperty("og:description", description);
    setMetaProperty("og:image", image);
    setMetaProperty("og:url", canonical);
    setMetaProperty("og:type", "product");
    setMetaName("twitter:card", "summary_large_image");
    setMetaName("twitter:title", title);
    setMetaName("twitter:description", description);
    setMetaName("twitter:image", image);

    setJsonLd("mct-product-schema", buildProductSchema(product, canonical));
    setProductHreflang(product);
  }

  function setProductHreflang(product) {
    const identity = window.MCT_getCommercialProductIdentity?.(product);
    const localized = window.MCT_COMMERCIAL_CONFIG?.localizedSlugsByIdentity?.[identity];
    if (!localized) return;
    document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((node) => node.remove());
    ["es", "en"].forEach((lang) => {
      const localizedSlug = localized[lang];
      if (!localizedSlug) return;
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = lang;
      link.href = `${SITE_URL}${lang === "es" ? "" : `/${lang}`}/product.html?slug=${encodeURIComponent(localizedSlug)}`;
      document.head.appendChild(link);
    });
    const xDefault = document.createElement("link");
    xDefault.rel = "alternate";
    xDefault.hreflang = "x-default";
    xDefault.href = `${SITE_URL}/product.html?slug=${encodeURIComponent(localized.es || product.slug || "")}`;
    document.head.appendChild(xDefault);
  }

  function applySiteSchema() {
    setJsonLd("mct-travelagency-schema", buildTravelAgencySchema());
  }

  document.addEventListener("DOMContentLoaded", () => {
    applySiteSchema();
    applyProductSeo();
  });

  window.MyCuscoTripSEO = {
    SITE_URL,
    setJsonLd,
    setMetaName,
    setMetaProperty,
    setCanonical
  };
})();
