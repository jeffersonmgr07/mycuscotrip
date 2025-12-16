// assets/js/includes.js
// Carga partials (header/search/footer) dentro del DOM usando fetch.
// IMPORTANTE: funciona correctamente si estás sirviendo el sitio con un servidor (Live Server / hosting).
// Si lo abres con file://, el navegador puede bloquear fetch.

(function () {
  const PARTIALS = [
    { selector: "#site-header", url: "partials/header.html" },
    { selector: "#site-search", url: "partials/search-bar.html" },
    { selector: "#site-footer", url: "partials/footer.html" },
  ];

  async function fetchText(url) {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) {
      throw new Error(`[includes] ${res.status} ${res.statusText} -> ${url}`);
    }
    return res.text();
  }

  async function loadPartial(selector, url) {
    const mount = document.querySelector(selector);
    if (!mount) return { selector, url, skipped: true };

    const html = await fetchText(url);
    mount.innerHTML = html;

    return { selector, url, skipped: false };
  }

  function safeInit(fnName) {
    try {
      const fn = window[fnName];
      if (typeof fn === "function") fn();
    } catch (err) {
      console.error(`[includes] Error ejecutando ${fnName}():`, err);
    }
  }

  // Evitar doble init si el script se carga 2 veces por error
  let alreadyRan = false;

  document.addEventListener("DOMContentLoaded", async () => {
    if (alreadyRan) return;
    alreadyRan = true;

    try {
      const results = await Promise.all(
        PARTIALS.map(p => loadPartial(p.selector, p.url))
      );

      // Si quieres ver qué se cargó:
      // console.log("[includes] partials:", results);

      // Inicializadores (después de cargar partials)
      // Nota: es mejor que header.js y search-bar.js estén cargados antes que includes.js
      safeInit("initHeader");
      safeInit("initSearchBar");

    } catch (err) {
      console.error(err);

      // Ayuda rápida para depurar
      console.warn(
        "[includes] Si ves 'Failed to fetch', asegúrate de abrir el proyecto con Live Server (no file://) " +
        "y verifica rutas: /partials y /assets."
      );
    }
  });
})();
