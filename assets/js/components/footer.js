(function () {
  const MOBILE_BREAKPOINT = 768;

  function getAccordions(root = document) {
    return Array.from(root.querySelectorAll(".footer-accordion"));
  }

  function applyFooterAccordionMode() {
    const accordions = getAccordions();
    if (!accordions.length) return;

    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;

    accordions.forEach((accordion) => {
      const previousMode = accordion.dataset.footerMode || "";
      const nextMode = isMobile ? "mobile" : "desktop";

      if (nextMode === "desktop") {
        accordion.setAttribute("open", "");
      } else if (previousMode !== "mobile") {
        accordion.removeAttribute("open");
      }

      accordion.dataset.footerMode = nextMode;
    });
  }

  function initFooterAccordions() {
    applyFooterAccordionMode();
  }

  let resizeTimer = null;
  function handleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyFooterAccordionMode, 120);
  }

  window.MyCuscoTripFooter = {
    initFooterAccordions,
    applyFooterAccordionMode
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFooterAccordions);
  } else {
    initFooterAccordions();
  }

  window.addEventListener("resize", handleResize);

  const observer = new MutationObserver((mutations) => {
    const hasFooterUpdate = mutations.some((mutation) =>
      Array.from(mutation.addedNodes).some((node) =>
        node.nodeType === 1 &&
        (node.matches?.(".footer") || node.querySelector?.(".footer"))
      )
    );

    if (hasFooterUpdate) {
      initFooterAccordions();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();

/* MCT V93 — Localización segura de enlaces del footer sin rutas /lang/pages/ */
(function () {
  const SUPPORTED = ["es", "en", "pt", "fr", "de", "it", "zh", "ja"];

  function activeLocale() {
    return window.MyCuscoTripI18n?.getLocaleFromUrl?.() || "es";
  }

  function basePath() {
    return window.MyCuscoTripI18n?.getBasePath?.() || (window.location.hostname.includes("github.io") ? "/mycuscotrip/" : "/");
  }

  function localizeFooterLinks() {
    const footer = document.querySelector(".footer");
    if (!footer) return;
    const locale = SUPPORTED.includes(activeLocale()) ? activeLocale() : "es";

    footer.querySelectorAll("a[href]").forEach((link) => {
      const raw = link.getAttribute("href") || "";
      if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("http")) return;

      const url = new URL(raw, window.location.origin);
      const parts = url.pathname.split("/").filter(Boolean);
      if (window.location.hostname.includes("github.io") && parts[0] === "mycuscotrip") parts.shift();
      if (SUPPORTED.includes(parts[0])) parts.shift();
      const clean = parts.join("/");
      const params = new URLSearchParams(url.search);

      if (clean.startsWith("pages/")) {
        if (locale === "es") params.delete("lang");
        else params.set("lang", locale);
        link.setAttribute("href", `${basePath()}${clean}${params.toString() ? `?${params}` : ""}${url.hash}`);
        return;
      }

      const prefix = locale === "es" ? basePath() : `${basePath()}${locale}/`;
      link.setAttribute("href", `${prefix}${clean}${params.toString() ? `?${params}` : ""}${url.hash}`);
    });
  }

  window.MyCuscoTripFooter = window.MyCuscoTripFooter || {};
  window.MyCuscoTripFooter.localizeFooterLinks = localizeFooterLinks;
  document.addEventListener("DOMContentLoaded", localizeFooterLinks);
  document.addEventListener("mct:i18n-ready", localizeFooterLinks);

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => Array.from(mutation.addedNodes).some((node) => node.nodeType === 1 && (node.matches?.(".footer") || node.querySelector?.(".footer"))))) {
      localizeFooterLinks();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
