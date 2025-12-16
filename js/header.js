// assets/js/header.js
// Requiere que el header se cargue en el DOM (por includes.js) antes de llamar initHeader().

(function () {
  function setActiveLink() {
    const nav = document.querySelector(".nav-menu");
    if (!nav) return;

    const links = Array.from(nav.querySelectorAll("a"));
    if (!links.length) return;

    const path = window.location.pathname.replace(/\/+$/, "");
    const hash = window.location.hash;

    // Limpia activos actuales
    links.forEach(a => a.classList.remove("active"));

    // 1) Si hay hash (secciones del home), intenta matchear hash exacto
    if (hash) {
      const matchHash = links.find(a => a.getAttribute("href") === hash);
      if (matchHash) {
        matchHash.classList.add("active");
        return;
      }
    }

    // 2) Match por path (páginas)
    // Prioriza el link cuyo href coincide con el final del path
    const matchPath = links.find(a => {
      const href = (a.getAttribute("href") || "").trim();
      if (!href || href.startsWith("#")) return false;
      const cleanHref = href.replace(window.location.origin, "").replace(/\/+$/, "");
      return cleanHref === path;
    });

    if (matchPath) {
      matchPath.classList.add("active");
      return;
    }

    // 3) Fallback: si estamos en home (/) activa el primero
    if (path === "" || path === "/" || path.endsWith("/index.html")) {
      links[0].classList.add("active");
    }
  }

  function toggleMenu(open) {
    const navMenu = document.querySelector(".nav-menu");
    const btn = document.querySelector(".mobile-menu-btn");
    if (!navMenu || !btn) return;

    const icon = btn.querySelector("i");
    const isOpen = open ?? !navMenu.classList.contains("active");

    navMenu.classList.toggle("active", isOpen);

    // Cambia icono (fa-bars <-> fa-times)
    if (icon) {
      icon.classList.toggle("fa-bars", !isOpen);
      icon.classList.toggle("fa-times", isOpen);
    }

    btn.setAttribute("aria-expanded", String(isOpen));
  }

  function closeMenu() {
    toggleMenu(false);
  }

  function handleOutsideClick(e) {
    const navMenu = document.querySelector(".nav-menu");
    const btn = document.querySelector(".mobile-menu-btn");
    if (!navMenu || !btn) return;

    const isOpen = navMenu.classList.contains("active");
    if (!isOpen) return;

    const clickedInsideMenu = navMenu.contains(e.target);
    const clickedButton = btn.contains(e.target);

    if (!clickedInsideMenu && !clickedButton) {
      closeMenu();
    }
  }

  function handleKeydown(e) {
    if (e.key === "Escape") closeMenu();
  }

  function handleScroll() {
    const header = document.querySelector("header");
    if (!header) return;

    // Clase opcional: header--scrolled
    if (window.scrollY > 6) header.classList.add("header--scrolled");
    else header.classList.remove("header--scrolled");
  }

  // ✅ Función pública para inicializar (llamada desde includes.js)
  window.initHeader = function initHeader() {
    const btn = document.querySelector(".mobile-menu-btn");
    const navMenu = document.querySelector(".nav-menu");
    if (!btn || !navMenu) return;

    // Accesibilidad
    btn.setAttribute("aria-label", "Abrir menú");
    btn.setAttribute("aria-expanded", "false");

    // Toggle menú
    btn.addEventListener("click", () => toggleMenu());

    // Cierra al click en links
    navMenu.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        closeMenu();
        // Para secciones (hash) espera un tick para que cambie el hash
        setTimeout(setActiveLink, 0);
      });
    });

    // Activo al cargar + al cambiar hash
    setActiveLink();
    window.addEventListener("hashchange", setActiveLink);

    // Cerrar al click fuera y ESC
    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleKeydown);

    // Scroll effect opcional
    handleScroll();
    window.addEventListener("scroll", handleScroll);
  };
})();
