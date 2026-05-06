class MyCuscoTripHeader {
  constructor() {
    this.header = document.querySelector(".header");
    this.mobileMenuBtn = document.querySelector(".mobile-menu-btn");
    this.navMenu = document.querySelector(".nav-menu");
    this.navLinks = document.querySelectorAll(".nav-menu a");
    this.dropdownItems = document.querySelectorAll(".nav-item--dropdown");

    this.langToggle = document.querySelector(".lang-switcher__toggle");
    this.langMenu = document.querySelector(".lang-switcher__menu");
    this.langLinks = document.querySelectorAll(".lang-switcher__menu a");
    this.langLabel = this.langToggle?.querySelector("span");

    this.currentActiveLink = null;
    this.dropdownCloseDelay = 200;
    this.dropdownTimers = new WeakMap();

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.handleScroll();
    this.updateActiveLink();
    this.initializeLanguage();
  }

  setupEventListeners() {
    if (this.mobileMenuBtn) {
      this.mobileMenuBtn.addEventListener("click", () => this.toggleMobileMenu());
    }

    this.navLinks.forEach((link) => {
      link.addEventListener("click", (event) => this.handleNavClick(event));
    });

    this.dropdownItems.forEach((item) => {
      const toggle = item.querySelector(".nav-dropdown-toggle");

      item.addEventListener("mouseenter", () => this.openDropdown(item));
      item.addEventListener("mouseleave", () => this.scheduleDropdownClose(item));
      item.addEventListener("focusin", () => this.openDropdown(item));
      item.addEventListener("focusout", (event) => {
        if (!item.contains(event.relatedTarget)) {
          this.scheduleDropdownClose(item);
        }
      });

      toggle?.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          this.closeDropdown(item);
          toggle.focus();
        }
      });
    });

    if (this.langToggle) {
      this.langToggle.addEventListener("click", (event) => {
        event.stopPropagation();
        this.toggleLanguageMenu();
      });
    }

    this.langLinks.forEach((link) => {
      link.addEventListener("click", (event) => this.handleLanguageSelect(event));
    });

    window.addEventListener("scroll", () => this.handleScroll());
    window.addEventListener("resize", () => this.handleResize());

    document.addEventListener("click", (event) => this.handleOutsideClick(event));
  }

  openDropdown(item) {
    if (!item) return;

    const timer = this.dropdownTimers.get(item);
    if (timer) window.clearTimeout(timer);

    const toggle = item.querySelector(".nav-dropdown-toggle");
    toggle?.setAttribute("aria-expanded", "true");
    item.classList.add("is-dropdown-open");
  }

  scheduleDropdownClose(item) {
    if (!item) return;

    const timer = this.dropdownTimers.get(item);
    if (timer) window.clearTimeout(timer);

    const nextTimer = window.setTimeout(() => {
      this.closeDropdown(item);
    }, this.dropdownCloseDelay);

    this.dropdownTimers.set(item, nextTimer);
  }

  closeDropdown(item) {
    if (!item) return;

    const timer = this.dropdownTimers.get(item);
    if (timer) window.clearTimeout(timer);

    const toggle = item.querySelector(".nav-dropdown-toggle");
    toggle?.setAttribute("aria-expanded", "false");
    item.classList.remove("is-dropdown-open");
  }

  toggleMobileMenu() {
    if (!this.navMenu || !this.mobileMenuBtn) return;

    const isActive = this.navMenu.classList.contains("active");
    const icon = this.mobileMenuBtn.querySelector("i");

    if (isActive) {
      this.closeMobileMenu();
      if (icon) {
        icon.classList.remove("fa-times");
        icon.classList.add("fa-bars");
      }
      this.mobileMenuBtn.setAttribute("aria-expanded", "false");
    } else {
      this.openMobileMenu();
      if (icon) {
        icon.classList.remove("fa-bars");
        icon.classList.add("fa-times");
      }
      this.mobileMenuBtn.setAttribute("aria-expanded", "true");
    }
  }

  openMobileMenu() {
    this.navMenu?.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  closeMobileMenu() {
    this.navMenu?.classList.remove("active");
    document.body.style.overflow = "";
  }

  handleNavClick(event) {
    const link = event.currentTarget;
    const href = link.getAttribute("href") || "";

    this.setActiveLink(link);

    if (window.innerWidth < 992) {
      this.closeMobileMenu();
      const icon = this.mobileMenuBtn?.querySelector("i");
      if (icon) {
        icon.classList.remove("fa-times");
        icon.classList.add("fa-bars");
      }
      this.mobileMenuBtn?.setAttribute("aria-expanded", "false");
    }

    if (href.includes("#")) {
      const hash = href.substring(href.indexOf("#"));
      const targetId = hash.replace("#", "");
      const currentPage = window.location.pathname.split("/").pop() || "index.html";
      const targetElement = document.getElementById(targetId);

      if ((currentPage === "index.html" || currentPage === "" || currentPage === "/") && targetElement) {
        event.preventDefault();
        const headerHeight = this.header?.offsetHeight || 90;
        const targetPosition =
          targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: "smooth"
        });
      }
    }
  }

  setActiveLink(link) {
    this.navLinks.forEach((navLink) => navLink.classList.remove("active"));
    link.classList.add("active");
    this.currentActiveLink = link;
  }

  updateActiveLink() {
    const currentPath = window.location.pathname;
    const currentFile = currentPath.split("/").pop() || "index.html";
    const currentHash = window.location.hash;
    const currentSearch = window.location.search;

    const aliases = {
      "machu-picchu-tours.html": ["machu-picchu-tours.html"],
      "cusco-tours.html": ["cusco-tours.html"],
      "paquetes-cusco.html": ["paquetes-cusco.html"],
      "explora-peru.html": ["explora-peru.html"],
      "trekkings.html": ["trekkings.html"],
      "mi-reserva.html": ["mi-reserva.html", "booking-status.html"]
    };

    let activeLink = null;

    if (currentFile === "trekkings.html" && currentSearch) {
      const currentUrlPart = `trekkings.html${currentSearch}`;
      this.navLinks.forEach((link) => {
        const href = link.getAttribute("href") || "";
        link.classList.remove("active");
        if (!activeLink && href.includes(currentUrlPart)) activeLink = link;
      });
    }

    this.navLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      link.classList.remove("active");

      Object.entries(aliases).forEach(([file, hrefMatches]) => {
        if (activeLink) return;
        if (currentFile === file && hrefMatches.some((item) => href.includes(item))) {
          activeLink = link;
        }
      });

      if (!activeLink && currentFile === "booking-status.html" && href.includes("mi-reserva.html")) {
        activeLink = link;
      }

      if (!activeLink && (currentFile === "index.html" || currentFile === "") && currentHash) {
        if (href.endsWith(currentHash)) activeLink = link;
      }
    });

    if (!activeLink && (currentFile === "index.html" || currentFile === "") && this.navLinks.length > 0) {
      activeLink = this.navLinks[0];
    }

    if (activeLink) {
      activeLink.classList.add("active");
      this.currentActiveLink = activeLink;
    }
  }

  handleScroll() {
    if (!this.header) return;

    if (window.scrollY > 40) {
      this.header.classList.add("scrolled");
    } else {
      this.header.classList.remove("scrolled");
    }
  }

  handleResize() {
    if (window.innerWidth >= 992) {
      this.closeMobileMenu();

      const icon = this.mobileMenuBtn?.querySelector("i");
      if (icon) {
        icon.classList.remove("fa-times");
        icon.classList.add("fa-bars");
      }

      this.mobileMenuBtn?.setAttribute("aria-expanded", "false");
    }
  }

  handleOutsideClick(event) {
    if (
      this.langMenu &&
      this.langToggle &&
      !this.langMenu.contains(event.target) &&
      !this.langToggle.contains(event.target)
    ) {
      this.closeLanguageMenu();
    }

    if (
      window.innerWidth < 992 &&
      this.navMenu &&
      this.mobileMenuBtn &&
      this.navMenu.classList.contains("active") &&
      !this.navMenu.contains(event.target) &&
      !this.mobileMenuBtn.contains(event.target)
    ) {
      this.closeMobileMenu();

      const icon = this.mobileMenuBtn.querySelector("i");
      if (icon) {
        icon.classList.remove("fa-times");
        icon.classList.add("fa-bars");
      }

      this.mobileMenuBtn.setAttribute("aria-expanded", "false");
    }
  }

  toggleLanguageMenu() {
    if (!this.langMenu || !this.langToggle) return;

    const isHidden = this.langMenu.hasAttribute("hidden");

    if (isHidden) {
      this.langMenu.removeAttribute("hidden");
      this.langToggle.setAttribute("aria-expanded", "true");
    } else {
      this.closeLanguageMenu();
    }
  }

  closeLanguageMenu() {
    if (!this.langMenu || !this.langToggle) return;
    this.langMenu.setAttribute("hidden", "");
    this.langToggle.setAttribute("aria-expanded", "false");
  }

  initializeLanguage() {
    const params = new URLSearchParams(window.location.search);
    const langFromUrl = params.get("lang");
    const langFromStorage = localStorage.getItem("site_lang");
    const lang = langFromUrl || langFromStorage || "es";

    this.updateLanguageLabel(lang);
    localStorage.setItem("site_lang", lang);
  }

  handleLanguageSelect(event) {
    event.preventDefault();

    const lang = event.currentTarget.dataset.lang || "es";
    localStorage.setItem("site_lang", lang);
    this.updateLanguageLabel(lang);
    this.closeLanguageMenu();

    const url = new URL(window.location.href);
    url.searchParams.set("lang", lang);
    window.location.href = url.toString();
  }

  updateLanguageLabel(lang) {
    if (!this.langLabel) return;

    const labels = {
      es: "ES",
      en: "EN",
      pt: "PT"
    };

    this.langLabel.textContent = labels[lang] || "ES";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.MyCuscoTripHeader = new MyCuscoTripHeader();
});
