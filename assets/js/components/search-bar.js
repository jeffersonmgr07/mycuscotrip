  /* ============================================
   SEARCH-BAR.JS
   Funcionalidad completa de la barra de búsqueda
   ============================================ */

// Configuración global
const SearchBarConfig = {
    mobileBreakpoint: 1024,
    defaultAdults: 2,
    defaultChildren: 0,
    maxAdults: 20,
    maxChildren: 10,
    minDate: 'today',
    dateFormat: 'Y-m-d',
    altFormat: 'd M Y',
    locale: 'es'
};

// Clase principal de la Barra de Búsqueda
class MyCuscoTripSearchBar {
    constructor() {
        this.root = document.querySelector('.search-bar.mct-search');
        if (!this.root) return;
        
        // Elementos principales
        this.form = this.root.querySelector('#mctForm');
        this.tabTours = this.root.querySelector('.mct-tab[data-tab="tours"]');
        this.tabPaq = this.root.querySelector('.mct-tab[data-tab="paquetes"]');
        this.dateInput = this.root.querySelector('#mctFecha');
        this.dateField = this.root.querySelector('.mct-fecha-field');
        this.durationEl = this.root.querySelector('#mctDuration');
        this.destinoSelect = this.root.querySelector('#mctDestino');
        
        // Elementos de cantidad
        this.qtyPanel = this.root.querySelector('.mct-qty-panel');
        this.qtyToggle = this.root.querySelector('.mct-qty-toggle');
        this.qtyDone = this.root.querySelector('.mct-qty-done');
        this.qtyLabel = this.root.querySelector('#mctQtyLabel');
        
        // Modal
        this.modalOverlay = document.getElementById('modalOverlay');
        this.modalContent = document.getElementById('modalContent');
        
        // Estado
        this.currentOpenComponent = null;
        this.adults = SearchBarConfig.defaultAdults;
        this.children = SearchBarConfig.defaultChildren;
        this.flatpickrInstance = null;
        
        // Constantes
        this.DAY = 24 * 60 * 60 * 1000;
        
        this.init();
    }
    
    init() {
        this.setupFlatpickr();
        this.setupEventListeners();
        this.setupQuantityControls();
        this.updateQuantityLabel();
        
        console.log('SearchBar initialized successfully');
    }
    
    // ========== FLATPICKR CONFIGURATION ==========
    setupFlatpickr() {
        // Destruir instancia previa si existe
        if (this.dateInput._flatpickr) {
            this.dateInput._flatpickr.destroy();
        }
        
        // Crear nueva instancia
        this.flatpickrInstance = flatpickr(this.dateInput, {
            locale: flatpickr.l10ns[SearchBarConfig.locale],
            altInput: true,
            altFormat: SearchBarConfig.altFormat,
            dateFormat: SearchBarConfig.dateFormat,
            mode: "single",
            minDate: SearchBarConfig.minDate,
            clickOpens: true,
            disableMobile: true,
            showMonths: this.getShowMonths(),
            closeOnSelect: false,
            static: this.isMobile(),
            position: this.isMobile() ? "center" : "below left",
            rangeSeparator: " → ",
            plugins: [
                new confirmDatePlugin({ 
                    confirmText: "", 
                    showAlways: true, 
                    theme: "light" 
                })
            ],
            onReady: (selectedDates, dateStr, instance) => {
                this.setupFlatpickrEvents(instance);
            },
            onOpen: () => {
                this.handleCalendarOpen();
            },
            onClose: () => {
                this.currentOpenComponent = null;
            },
            onChange: (selectedDates, dateStr, instance) => {
                this.handleDateChange(selectedDates, instance);
            }
        });
        
        // Guardar referencia
        this.dateInput._flatpickr = this.flatpickrInstance;
    }
    
    setupFlatpickrEvents(instance) {
        const confirmBtn = instance.calendarContainer.querySelector('.flatpickr-confirm');
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (this.isMobile()) {
                    this.closeModal();
                } else {
                    instance.close();
                }
                this.currentOpenComponent = null;
            });
        }
        
        if (!this.isMobile()) {
            instance.set('appendTo', this.dateField);
        }
        
        const visibleInput = instance.altInput || this.dateInput;
        visibleInput.style.cursor = 'pointer';
        
        if (this.isMobile()) {
            // Móvil: abrir en modal
            visibleInput.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.openDatepickerModal(instance);
            });
        } else {
            // Desktop: abrir normalmente
            instance.set('positionElement', visibleInput);
            
            const openDesktop = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeQuantityPanel();
                instance.open();
                this.currentOpenComponent = 'datepicker';
            };
            
            visibleInput.addEventListener('click', openDesktop);
            this.dateField.addEventListener('click', openDesktop);
        }
    }
    
    // ========== QUANTITY CONTROLS ==========
    setupQuantityControls() {
        // Botones de incremento/decremento
        const minusButtons = this.qtyPanel.querySelectorAll('.mct-btn.minus');
        const plusButtons = this.qtyPanel.querySelectorAll('.mct-btn.plus');
        const adultInput = this.qtyPanel.querySelector('[data-type="adultos"] input');
        const childInput = this.qtyPanel.querySelector('[data-type="ninos"] input');
        
        // Configurar valores iniciales
        if (adultInput) {
            adultInput.value = this.adults;
            adultInput.addEventListener('change', (e) => {
                this.adults = parseInt(e.target.value) || 0;
                this.updateQuantityLabel();
            });
        }
        
        if (childInput) {
            childInput.value = this.children;
            childInput.addEventListener('change', (e) => {
                this.children = parseInt(e.target.value) || 0;
                this.updateQuantityLabel();
            });
        }
        
        // Configurar botones adultos
        const adultMinus = this.qtyPanel.querySelector('[data-type="adultos"] .minus');
        const adultPlus = this.qtyPanel.querySelector('[data-type="adultos"] .plus');
        
        if (adultMinus && adultPlus && adultInput) {
            adultMinus.addEventListener('click', () => {
                this.adults = Math.max(1, this.adults - 1);
                adultInput.value = this.adults;
                this.updateQuantityLabel();
            });
            
            adultPlus.addEventListener('click', () => {
                this.adults = Math.min(SearchBarConfig.maxAdults, this.adults + 1);
                adultInput.value = this.adults;
                this.updateQuantityLabel();
            });
        }
        
        // Configurar botones niños
        const childMinus = this.qtyPanel.querySelector('[data-type="ninos"] .minus');
        const childPlus = this.qtyPanel.querySelector('[data-type="ninos"] .plus');
        
        if (childMinus && childPlus && childInput) {
            childMinus.addEventListener('click', () => {
                this.children = Math.max(0, this.children - 1);
                childInput.value = this.children;
                this.updateQuantityLabel();
            });
            
            childPlus.addEventListener('click', () => {
                this.children = Math.min(SearchBarConfig.maxChildren, this.children + 1);
                childInput.value = this.children;
                this.updateQuantityLabel();
            });
        }
    }
    
    updateQuantityLabel() {
        const total = this.adults + this.children;
        const label = total === 1 ? 'Pasajero' : 'Pasajeros';
        this.qtyLabel.textContent = `${total} ${label}`;
    }
    
    // ========== TABS FUNCTIONALITY ==========
    setupEventListeners() {
        // Tabs
        if (this.tabTours) {
            this.tabTours.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.setActiveTab('tours');
            });
        }
        
        if (this.tabPaq) {
            this.tabPaq.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.setActiveTab('paquetes');
            });
        }
        
        // Toggle cantidad
        if (this.qtyToggle) {
            this.qtyToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleQuantityPanel(e);
            });
        }
        
        // Botón "Listo" cantidad
        if (this.qtyDone) {
            this.qtyDone.addEventListener('click', () => {
                if (!this.isMobile()) {
                    this.closeQuantityPanel();
                }
            });
        }
        
        // Submit del formulario
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
        
        // Cerrar componentes al hacer clic fuera
        document.addEventListener('click', (e) => this.handleOutsideClick(e));
        
        // Modal overlay
        if (this.modalOverlay) {
            this.modalOverlay.addEventListener('click', (e) => {
                if (e.target === this.modalOverlay) {
                    this.closeModal();
                }
            });
        }
        
        // Resize handling
        window.addEventListener('resize', () => this.handleResize());
    }
    
    setActiveTab(tab) {
        const isTours = tab === 'tours';
        
        this.tabTours.classList.toggle('is-active', isTours);
        this.tabPaq.classList.toggle('is-active', !isTours);
        
        // Cerrar componentes abiertos
        this.closeAllComponents();
        
        // Limpiar fechas
        if (this.flatpickrInstance) {
            this.flatpickrInstance.clear();
        }
        
        this.setDurationText('');
        
        // Configurar modo del calendario
        if (this.flatpickrInstance) {
            if (isTours) {
                this.flatpickrInstance.set('mode', 'single');
                this.dateInput.placeholder = "Selecciona fecha";
                if (this.flatpickrInstance.altInput) {
                    this.flatpickrInstance.altInput.placeholder = "Selecciona fecha";
                }
            } else {
                this.flatpickrInstance.set('mode', 'range');
                this.dateInput.placeholder = "Inicio → Fin";
                if (this.flatpickrInstance.altInput) {
                    this.flatpickrInstance.altInput.placeholder = "Inicio → Fin";
                }
            }
        }
        
        // Dispatch event para que otros componentes puedan reaccionar
        const event = new CustomEvent('searchTabChanged', { 
            detail: { activeTab: tab } 
        });
        document.dispatchEvent(event);
    }
    
    // ========== QUANTITY PANEL MANAGEMENT ==========
    toggleQuantityPanel(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        if (this.isMobile()) {
            if (this.currentOpenComponent === 'qtyPanel') {
                this.closeModal();
            } else {
                this.openQuantityPanelModal();
            }
        } else {
            if (this.qtyPanel.hidden) {
                this.openQuantityPanelDesktop();
            } else {
                this.closeQuantityPanel();
            }
        }
    }
    
    openQuantityPanelDesktop() {
        if (this.flatpickrInstance) {
            this.flatpickrInstance.close();
        }
        
        this.qtyPanel.hidden = false;
        this.qtyToggle.setAttribute('aria-expanded', 'true');
        this.currentOpenComponent = 'qtyPanel';
    }
    
    closeQuantityPanel() {
        this.qtyPanel.hidden = true;
        this.qtyToggle.setAttribute('aria-expanded', 'false');
        if (this.currentOpenComponent === 'qtyPanel') {
            this.currentOpenComponent = null;
        }
    }
    
    // ========== MODAL MANAGEMENT ==========
    openDatepickerModal(instance) {
        this.closeAllComponents();
        
        const calendarContainer = document.createElement('div');
        calendarContainer.style.width = '100%';
        calendarContainer.style.padding = '0';
        
        const calendarClone = instance.calendarContainer.cloneNode(true);
        calendarClone.style.display = 'block';
        calendarClone.style.position = 'relative';
        calendarClone.style.width = '100%';
        
        calendarContainer.appendChild(calendarClone);
        this.modalContent.innerHTML = '';
        this.modalContent.appendChild(calendarContainer);
        
        // Reconfigurar eventos en el clon
        const confirmBtn = calendarClone.querySelector('.flatpickr-confirm');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal();
                this.currentOpenComponent = null;
            });
        }
        
        this.modalOverlay.classList.add('active');
        this.currentOpenComponent = 'datepicker';
    }
    
    openQuantityPanelModal() {
        this.closeAllComponents();
        
        const adultosInput = this.qtyPanel.querySelector('[data-type="adultos"] input');
        const ninosInput = this.qtyPanel.querySelector('[data-type="ninos"] input');
        const adultosValue = adultosInput ? adultosInput.value : this.adults.toString();
        const ninosValue = ninosInput ? ninosInput.value : this.children.toString();
        
        const qtyPanelHTML = `
            <div class="modal-qty-panel">
                <div class="modal-qty-row">
                    <span>Adultos</span>
                    <div class="modal-qty-ctrl" data-type="adultos">
                        <button type="button" class="modal-qty-btn minus" aria-label="Disminuir adultos">−</button>
                        <input type="text" value="${adultosValue}" readonly />
                        <button type="button" class="modal-qty-btn plus" aria-label="Aumentar adultos">＋</button>
                    </div>
                </div>
                <div class="modal-qty-row">
                    <span>Niños</span>
                    <div class="modal-qty-ctrl" data-type="ninos">
                        <button type="button" class="modal-qty-btn minus" aria-label="Disminuir niños">−</button>
                        <input type="text" value="${ninosValue}" readonly />
                        <button type="button" class="modal-qty-btn plus" aria-label="Aumentar niños">＋</button>
                    </div>
                </div>
                <button type="button" class="modal-qty-done">Listo</button>
            </div>
        `;
        
        this.modalContent.innerHTML = qtyPanelHTML;
        
        const modalPanel = this.modalContent.querySelector('.modal-qty-panel');
        const doneBtn = modalPanel.querySelector('.modal-qty-done');
        
        if (doneBtn) {
            doneBtn.addEventListener('click', () => {
                const modalAdultosInput = modalPanel.querySelector('[data-type="adultos"] input');
                const modalNinosInput = modalPanel.querySelector('[data-type="ninos"] input');
                
                if (modalAdultosInput && modalNinosInput && adultosInput && ninosInput) {
                    this.adults = parseInt(modalAdultosInput.value) || 0;
                    this.children = parseInt(modalNinosInput.value) || 0;
                    
                    adultosInput.value = this.adults;
                    ninosInput.value = this.children;
                    
                    this.updateQuantityLabel();
                }
                
                this.closeModal();
            });
        }
        
        // Configurar botones del modal
        modalPanel.querySelectorAll('.modal-qty-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                const ctrl = this.closest('.modal-qty-ctrl');
                const input = ctrl.querySelector('input');
                let value = parseInt(input.value) || 0;
                
                if (this.classList.contains('plus')) {
                    const max = ctrl.dataset.type === 'adultos' ? SearchBarConfig.maxAdults : SearchBarConfig.maxChildren;
                    value = Math.min(max, value + 1);
                }
                if (this.classList.contains('minus')) {
                    const min = ctrl.dataset.type === 'adultos' ? 1 : 0;
                    value = Math.max(min, value - 1);
                }
                
                input.value = value;
                e.stopPropagation();
            });
        });
        
        this.modalOverlay.classList.add('active');
        this.currentOpenComponent = 'qtyPanel';
    }
    
    closeModal() {
        if (this.modalOverlay) {
            this.modalOverlay.classList.remove('active');
        }
        if (this.modalContent) {
            this.modalContent.innerHTML = '';
        }
        this.currentOpenComponent = null;
    }
    
    closeAllComponents() {
        if (!this.isMobile()) {
            if (this.flatpickrInstance) {
                this.flatpickrInstance.close();
            }
            this.closeQuantityPanel();
        } else {
            this.closeModal();
        }
        this.currentOpenComponent = null;
    }
    
    // ========== DATE HANDLING ==========
    handleDateChange(selectedDates, instance) {
        const isPaq = this.tabPaq.classList.contains('is-active');
        
        if (isPaq && instance.config.mode === 'range' && selectedDates.length === 2) {
            const duration = this.computeDaysNights(selectedDates[0], selectedDates[1]);
            if (duration) {
                this.setDurationText(`${duration.days} días / ${duration.nights} noches`);
            }
        } else {
            this.setDurationText('');
        }
    }
    
    computeDaysNights(start, end) {
        if (!start || !end) return null;
        
        const s = new Date(start);
        s.setHours(12, 0, 0, 0);
        
        const e = new Date(end);
        e.setHours(12, 0, 0, 0);
        
        const nights = Math.round((e - s) / this.DAY);
        if (nights < 0) return null;
        
        return { days: nights + 1, nights };
    }
    
    setDurationText(text) {
        if (!this.durationEl) return;
        
        if (!text) {
            this.durationEl.innerHTML = '';
            this.durationEl.style.display = 'none';
            return;
        }
        
        this.durationEl.innerHTML = `<i class="fa-regular fa-paper-plane"></i>${text}`;
        this.durationEl.style.display = 'block';
    }
    
    handleCalendarOpen() {
        if (!this.isMobile() && this.currentOpenComponent === 'qtyPanel') {
            this.closeQuantityPanel();
        }
        this.currentOpenComponent = 'datepicker';
    }
    
    // ========== FORM SUBMISSION ==========
    handleSubmit(e) {
        e.preventDefault();
        
        const tipo = this.tabTours.classList.contains('is-active') ? 'tours' : 'paquetes';
        const destino = this.destinoSelect ? this.destinoSelect.value : 'machu-picchu';
        const fechaISO = this.dateInput.value;
        
        // Validar fechas
        if (tipo === 'paquetes') {
            const partes = fechaISO.split(" → ");
            if (partes.length !== 2) {
                this.showDatepicker();
                return;
            }
        }
        
        if (tipo === 'tours' && !fechaISO) {
            this.showDatepicker();
            return;
        }
        
        // Construir URL de búsqueda
        const url = this.buildSearchUrl(tipo, destino, fechaISO);
        
        // Redireccionar
        window.location.href = url;
    }
    
    buildSearchUrl(tipo, destino, fechaISO) {
        const urlMap = {
            tours: {
                "machu-picchu": "https://www.mycuscotrip.com/machu-picchu",
                "cusco": "https://www.mycuscotrip.com/tours-en-cusco",
                "otros": "https://www.mycuscotrip.com/explora-peru"
            },
            paquetes: {
                "machu-picchu": "https://www.mycuscotrip.com/machu-picchu",
                "cusco": "https://www.mycuscotrip.com/paquetes-completos",
                "otros": "https://www.mycuscotrip.com/explora-peru"
            }
        };
        
        let baseUrl = (urlMap[tipo] && urlMap[tipo][destino]) ? urlMap[tipo][destino] : "https://www.mycuscotrip.com/";
        const params = new URLSearchParams();
        
        // Agregar parámetros de fecha
        if (fechaISO) {
            if (tipo === 'tours') {
                params.append('fecha', fechaISO);
            } else {
                const partes = fechaISO.split(" → ");
                if (partes.length === 2) {
                    params.append('fecha_inicio', partes[0]);
                    params.append('fecha_fin', partes[1]);
                }
            }
        }
        
        // Agregar parámetros de pasajeros
        const totalPasajeros = this.adults + this.children;
        params.append('pasajeros', totalPasajeros);
        if (this.children > 0) {
            params.append('ninos', this.children);
        }
        
        // Agregar tipo de búsqueda
        params.append('tipo', tipo);
        
        return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
    }
    
    showDatepicker() {
        if (this.isMobile()) {
            this.openDatepickerModal(this.flatpickrInstance);
        } else {
            this.flatpickrInstance.open();
        }
        this.currentOpenComponent = 'datepicker';
    }
    
    // ========== UTILITY METHODS ==========
    isMobile() {
        return window.innerWidth < SearchBarConfig.mobileBreakpoint;
    }
    
    getShowMonths() {
        if (this.isMobile()) return 1;
        return window.innerWidth >= 1280 ? 2 : 1;
    }
    
    handleResize() {
        const nowShow = this.getShowMonths();
        const nowMobile = this.isMobile();
        
        // Actualizar showMonths si cambió
        if (this.flatpickrInstance && nowShow !== this.flatpickrInstance.config.showMonths) {
            this.flatpickrInstance.set('showMonths', nowShow);
        }
        
        // Manejar cambios entre móvil/desktop
        if (nowMobile !== this.isMobile()) {
            this.closeAllComponents();
            
            if (this.flatpickrInstance) {
                this.flatpickrInstance.set('static', nowMobile);
                this.flatpickrInstance.set('position', nowMobile ? "center" : "below left");
                
                if (!nowMobile) {
                    this.flatpickrInstance.set('appendTo', this.dateField);
                }
            }
        }
    }
    
    handleOutsideClick(e) {
        if (this.isMobile()) return;
        
        const insideQty = e.target.closest('.mct-cantidad') || e.target.closest('.mct-qty-panel');
        const insideDatepicker = e.target.closest('.flatpickr-calendar') || 
                               e.target.closest('#mctFecha') || 
                               (this.flatpickrInstance && this.flatpickrInstance.altInput && e.target === this.flatpickrInstance.altInput);
        
        if (!insideQty && !insideDatepicker) {
            this.closeAllComponents();
        }
    }
    
    // ========== PUBLIC METHODS ==========
    setPassengers(adults, children) {
        this.adults = Math.max(1, Math.min(SearchBarConfig.maxAdults, adults));
        this.children = Math.max(0, Math.min(SearchBarConfig.maxChildren, children));
        
        const adultInput = this.qtyPanel.querySelector('[data-type="adultos"] input');
        const childInput = this.qtyPanel.querySelector('[data-type="ninos"] input');
        
        if (adultInput) adultInput.value = this.adults;
        if (childInput) childInput.value = this.children;
        
        this.updateQuantityLabel();
    }
    
    getSearchParams() {
        const tipo = this.tabTours.classList.contains('is-active') ? 'tours' : 'paquetes';
        const destino = this.destinoSelect ? this.destinoSelect.value : 'machu-picchu';
        const fechaISO = this.dateInput.value;
        
        return {
            tipo,
            destino,
            fecha: fechaISO,
            adultos: this.adults,
            ninos: this.children,
            total: this.adults + this.children
        };
    }
    
    resetForm() {
        this.setActiveTab('tours');
        this.setPassengers(SearchBarConfig.defaultAdults, SearchBarConfig.defaultChildren);
        
        if (this.flatpickrInstance) {
            this.flatpickrInstance.clear();
        }
        
        if (this.destinoSelect) {
            this.destinoSelect.value = 'machu-picchu';
        }
        
        this.setDurationText('');
    }
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Verificar que Flatpickr esté cargado
    if (typeof flatpickr === 'undefined') {
        console.error('Flatpickr no está cargado. La barra de búsqueda no funcionará correctamente.');
        return;
    }
    
    // Inicializar barra de búsqueda
    window.MyCuscoTripSearchBar = new MyCuscoTripSearchBar();
    
    // Log para debugging
    console.log('SearchBar initialized successfully');
});

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MyCuscoTripSearchBar;
}
