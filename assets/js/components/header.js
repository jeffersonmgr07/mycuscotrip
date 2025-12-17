/* ============================================
   HEADER.JS
   Funcionalidad del encabezado y navegación
   ============================================ */

// Configuración global
const HeaderConfig = {
    mobileBreakpoint: 992,
    scrollThreshold: 100,
    animationDuration: 200
};

// Clase principal del Header
class MyCuscoTripHeader {
    constructor() {
        this.header = document.querySelector('.header');
        this.mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        this.navMenu = document.querySelector('.nav-menu');
        this.navLinks = document.querySelectorAll('.nav-menu a');
        this.currentActiveLink = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.handleScroll();
        this.updateActiveLink();
        this.setupSubmenus();
    }
    
    setupEventListeners() {
        // Menú móvil
        if (this.mobileMenuBtn) {
            this.mobileMenuBtn.addEventListener('click', () => this.toggleMobileMenu());
        }
        
        // Enlaces de navegación
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => this.handleNavClick(e));
        });
        
        // Scroll
        window.addEventListener('scroll', () => this.handleScroll());
        window.addEventListener('resize', () => this.handleResize());
        
        // Cerrar menú al hacer clic fuera
        document.addEventListener('click', (e) => this.handleOutsideClick(e));
    }
    
    toggleMobileMenu() {
        const isActive = this.navMenu.classList.contains('active');
        const icon = this.mobileMenuBtn.querySelector('i');
        
        if (isActive) {
            this.closeMobileMenu();
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        } else {
            this.openMobileMenu();
            if (icon) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            }
        }
    }
    
    openMobileMenu() {
        this.navMenu.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Animar enlaces
        this.navLinks.forEach((link, index) => {
            link.style.animationDelay = `${index * 0.1}s`;
            link.classList.add('slide-in-left');
        });
    }
    
    closeMobileMenu() {
        this.navMenu.classList.remove('active');
        document.body.style.overflow = '';
        
        // Limpiar animaciones
        this.navLinks.forEach(link => {
            link.classList.remove('slide-in-left');
            link.style.animationDelay = '';
        });
    }
    
    handleNavClick(event) {
        const link = event.currentTarget;
        
        // Actualizar link activo
        this.setActiveLink(link);
        
        // Cerrar menú móvil si está abierto
        if (window.innerWidth < HeaderConfig.mobileBreakpoint) {
            this.closeMobileMenu();
            const icon = this.mobileMenuBtn?.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        }
        
        // Scroll suave para anclas internas
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
            event.preventDefault();
            const targetId = href.substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const headerHeight = this.header?.offsetHeight || 70;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        }
    }
    
    setActiveLink(link) {
        // Remover clase activa de todos los links
        this.navLinks.forEach(l => l.classList.remove('active'));
        
        // Agregar clase activa al link clickeado
        link.classList.add('active');
        this.currentActiveLink = link;
    }
    
    updateActiveLink() {
        const currentPath = window.location.pathname;
        const currentHash = window.location.hash || '#home';
        
        // Buscar link que coincida con la ruta actual
        let activeLink = null;
        
        this.navLinks.forEach(link => {
            const href = link.getAttribute('href');
            
            // Remover activo de todos primero
            link.classList.remove('active');
            
            // Verificar coincidencia
            if (href === currentPath || href === currentHash) {
                activeLink = link;
            } else if (currentPath === '/' && href === '#home') {
                activeLink = link;
            }
        });
        
        // Si no se encontró coincidencia, usar el primero
        if (!activeLink && this.navLinks.length > 0) {
            activeLink = this.navLinks[0];
        }
        
        if (activeLink) {
            activeLink.classList.add('active');
            this.currentActiveLink = activeLink;
        }
    }
    
    handleScroll() {
        const scrollY = window.scrollY;
        
        // Agregar/remover clase scrolled
        if (scrollY > HeaderConfig.scrollThreshold) {
            this.header?.classList.add('scrolled');
        } else {
            this.header?.classList.remove('scrolled');
        }
        
        // Actualizar link activo basado en scroll (para one-page)
        if (window.location.pathname === '/') {
            this.updateActiveLinkOnScroll();
        }
    }
    
    updateActiveLinkOnScroll() {
        const sections = document.querySelectorAll('section[id]');
        const scrollY = window.pageYOffset;
        const headerHeight = this.header?.offsetHeight || 70;
        
        sections.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop - headerHeight - 100;
            const sectionId = section.getAttribute('id');
            
            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                const correspondingLink = document.querySelector(`.nav-menu a[href="#${sectionId}"]`);
                if (correspondingLink && correspondingLink !== this.currentActiveLink) {
                    this.setActiveLink(correspondingLink);
                }
            }
        });
    }
    
    handleResize() {
        // Cerrar menú móvil si se redimensiona a desktop
        if (window.innerWidth >= HeaderConfig.mobileBreakpoint) {
            this.closeMobileMenu();
            const icon = this.mobileMenuBtn?.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        }
    }
    
    handleOutsideClick(event) {
        // Cerrar menú móvil si se hace clic fuera
        if (window.innerWidth < HeaderConfig.mobileBreakpoint && 
            this.navMenu.classList.contains('active') &&
            !this.navMenu.contains(event.target) &&
            !this.mobileMenuBtn.contains(event.target)) {
            this.closeMobileMenu();
            
            const icon = this.mobileMenuBtn?.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        }
    }
    
    setupSubmenus() {
        // Configuración para submenús futuros
        const submenuTriggers = document.querySelectorAll('.has-submenu');
        
        submenuTriggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                if (window.innerWidth < HeaderConfig.mobileBreakpoint) {
                    e.preventDefault();
                    const submenu = trigger.querySelector('.submenu');
                    if (submenu) {
                        submenu.classList.toggle('active');
                    }
                }
            });
        });
    }
    
    // Métodos públicos
    getCurrentActiveLink() {
        return this.currentActiveLink;
    }
    
    isMobileMenuOpen() {
        return this.navMenu.classList.contains('active');
    }
    
    scrollToSection(sectionId) {
        const targetElement = document.getElementById(sectionId);
        if (targetElement) {
            const headerHeight = this.header?.offsetHeight || 70;
            const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
            
            // Actualizar link activo
            const link = document.querySelector(`.nav-menu a[href="#${sectionId}"]`);
            if (link) {
                this.setActiveLink(link);
            }
        }
    }
}

// Back to Top Functionality
class BackToTop {
    constructor() {
        this.button = document.querySelector('.back-to-top');
        this.scrollThreshold = 300;
        
        if (this.button) {
            this.init();
        }
    }
    
    init() {
        window.addEventListener('scroll', () => this.toggleVisibility());
        this.button.addEventListener('click', () => this.scrollToTop());
    }
    
    toggleVisibility() {
        if (window.pageYOffset > this.scrollThreshold) {
            this.button.classList.add('visible');
        } else {
            this.button.classList.remove('visible');
        }
    }
    
    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
}

// WhatsApp Button Enhancement
class WhatsAppButton {
    constructor() {
        this.buttons = document.querySelectorAll('.wa-header a, .wa-float');
        this.init();
    }
    
    init() {
        this.buttons.forEach(button => {
            // Agregar atributos ARIA
            button.setAttribute('aria-label', 'Contactar por WhatsApp');
            button.setAttribute('target', '_blank');
            button.setAttribute('rel', 'noopener noreferrer');
            
            // Agregar analytics tracking (si se implementa después)
            button.addEventListener('click', (e) => this.trackClick(e));
        });
    }
    
    trackClick(event) {
        // Aquí se puede agregar tracking de Google Analytics
        console.log('WhatsApp button clicked');
        
        // Opcional: Abrir en nueva ventana con dimensiones específicas
        if (window.innerWidth > 768) {
            event.preventDefault();
            const url = event.currentTarget.href;
            window.open(url, 'whatsapp', 'width=600,height=700');
        }
    }
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar header
    window.MyCuscoTripHeader = new MyCuscoTripHeader();
    
    // Inicializar back to top
    window.BackToTop = new BackToTop();
    
    // Inicializar WhatsApp buttons
    window.WhatsAppButton = new WhatsAppButton();
    
    // Log para debugging
    console.log('Header initialized successfully');
});

// Exportar para uso en módulos (si se usa ES6 modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MyCuscoTripHeader, BackToTop, WhatsAppButton };
}
