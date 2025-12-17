/* ============================================
   PRODUCTS.JS
   Manejo de productos, tours y paquetes
   ============================================ */

// Configuración global
const ProductsConfig = {
    itemsPerPage: 9,
    apiEndpoint: '/api/products',
    defaultSort: 'popular',
    currency: 'PEN',
    currencySymbol: 'S/',
    imageBasePath: 'assets/img/products/'
};

// Clase principal de Productos
class MyCuscoTripProducts {
    constructor() {
        this.productsContainer = document.getElementById('products-container');
        this.productsGrid = document.querySelector('.products-grid');
        this.productsList = document.querySelector('.products-list');
        this.filtersContainer = document.querySelector('.products-filters');
        this.paginationContainer = document.querySelector('.products-pagination');
        this.loadingContainer = document.querySelector('.products-loading');
        this.emptyState = document.querySelector('.products-empty');
        
        // Estado
        this.products = [];
        this.filteredProducts = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.currentCategory = 'all';
        this.currentSort = ProductsConfig.defaultSort;
        this.isLoading = false;
        
        // Filtros activos
        this.activeFilters = {
            category: 'all',
            priceRange: { min: 0, max: 5000 },
            duration: { min: 1, max: 30 },
            difficulty: 'all',
            rating: 0
        };
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.loadProducts();
        this.renderProducts();
        this.setupFilters();
        
        console.log('Products module initialized successfully');
    }
    
    // ========== DATA LOADING ==========
    async loadProducts() {
        this.showLoading();
        
        try {
            // En producción, esto sería una llamada a API
            // const response = await fetch(ProductsConfig.apiEndpoint);
            // this.products = await response.json();
            
            // Datos de ejemplo (simulación)
            this.products = this.getSampleProducts();
            
            this.filteredProducts = [...this.products];
            this.calculatePagination();
            
        } catch (error) {
            console.error('Error loading products:', error);
            this.showError('Error al cargar los productos. Por favor, intente nuevamente.');
        } finally {
            this.hideLoading();
        }
    }
    
    getSampleProducts() {
        return [
            {
                id: 1,
                name: 'Tour Clásico a Machu Picchu',
                category: 'machu-picchu',
                subcategory: 'full-day',
                description: 'Visita completa a la ciudadela inca con guía profesional, transporte y entradas incluidas.',
                price: 299,
                priceCurrency: ProductsConfig.currency,
                duration: 1,
                durationUnit: 'día',
                difficulty: 'media',
                rating: 4.8,
                reviewCount: 124,
                image: 'machu-picchu-1.jpg',
                features: ['Guía bilingüe', 'Transporte incluido', 'Almuerzo', 'Entradas'],
                tags: ['popular', 'recomendado', 'machu-picchu'],
                available: true,
                maxPeople: 12
            },
            {
                id: 2,
                name: 'Tour Valle Sagrado',
                category: 'cusco',
                subcategory: 'full-day',
                description: 'Recorrido por los principales sitios arqueológicos del Valle Sagrado de los Incas.',
                price: 189,
                priceCurrency: ProductsConfig.currency,
                duration: 1,
                durationUnit: 'día',
                difficulty: 'baja',
                rating: 4.6,
                reviewCount: 89,
                image: 'valle-sagrado-1.jpg',
                features: ['Guía profesional', 'Transporte', 'Almuerzo buffet', 'Entradas'],
                tags: ['popular', 'valle-sagrado', 'cultural'],
                available: true,
                maxPeople: 15
            },
            {
                id: 3,
                name: 'Montaña de 7 Colores',
                category: 'cusco',
                subcategory: 'trekking',
                description: 'Trekking a la famosa montaña Vinicunca, conocida como la Montaña de 7 Colores.',
                price: 159,
                priceCurrency: ProductsConfig.currency,
                duration: 1,
                durationUnit: 'día',
                difficulty: 'alta',
                rating: 4.9,
                reviewCount: 203,
                image: 'vinicunca-1.jpg',
                features: ['Guía especializado', 'Desayuno y almuerzo', 'Bastones', 'Botiquín'],
                tags: ['trekking', 'aventura', 'popular'],
                available: true,
                maxPeople: 10
            },
            {
                id: 4,
                name: 'Paquete Cusco Completo 5 Días',
                category: 'paquetes',
                subcategory: 'completo',
                description: 'Experiencia completa en Cusco incluyendo city tour, valle sagrado y machu picchu.',
                price: 899,
                priceCurrency: ProductsConfig.currency,
                duration: 5,
                durationUnit: 'días',
                difficulty: 'media',
                rating: 4.7,
                reviewCount: 56,
                image: 'paquete-5dias.jpg',
                features: ['Hotel 3 estrellas', 'Todas las comidas', 'Transporte privado', 'Guía personal'],
                tags: ['paquete', 'completo', 'recomendado'],
                available: true,
                maxPeople: 8
            }
        ];
    }
    
    // ========== RENDERING ==========
    renderProducts() {
        if (!this.productsGrid && !this.productsList) return;
        
        const startIndex = (this.currentPage - 1) * ProductsConfig.itemsPerPage;
        const endIndex = startIndex + ProductsConfig.itemsPerPage;
        const productsToShow = this.filteredProducts.slice(startIndex, endIndex);
        
        // Limpiar contenedor
        if (this.productsGrid) {
            this.productsGrid.innerHTML = '';
        }
        
        if (this.productsList) {
            this.productsList.innerHTML = '';
        }
        
        // Mostrar empty state si no hay productos
        if (productsToShow.length === 0) {
            this.showEmptyState();
            return;
        }
        
        // Renderizar cada producto
        productsToShow.forEach(product => {
            const productElement = this.createProductElement(product);
            
            if (this.productsGrid) {
                this.productsGrid.appendChild(productElement);
            }
            
            if (this.productsList) {
                this.productsList.appendChild(productElement);
            }
        });
        
        // Renderizar paginación
        this.renderPagination();
        
        // Ocultar empty state
        this.hideEmptyState();
    }
    
    createProductElement(product) {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.dataset.id = product.id;
        productCard.dataset.category = product.category;
        
        // Calcular precio por persona si es paquete
        const pricePerPerson = product.duration > 1 ? 
            `Desde ${ProductsConfig.currencySymbol}${product.price} por persona` : 
            `${ProductsConfig.currencySymbol}${product.price} por persona`;
        
        // Crear estrellas de rating
        const stars = this.createRatingStars(product.rating);
        
        productCard.innerHTML = `
            <div class="product-image">
                <img src="${ProductsConfig.imageBasePath}${product.category}/${product.image}" 
                     alt="${product.name}" 
                     loading="lazy">
                <div class="product-overlay">
                    ${product.tags.includes('popular') ? 
                        '<span class="badge badge-primary">Popular</span>' : ''}
                    ${!product.available ? 
                        '<span class="badge badge-secondary">Agotado</span>' : ''}
                </div>
            </div>
            <div class="product-content">
                <span class="product-category">${this.getCategoryLabel(product.category)}</span>
                <h3 class="product-title">
                    <a href="/producto/${product.id}" class="product-link">${product.name}</a>
                </h3>
                <p class="product-description">${product.description}</p>
                
                <div class="product-features">
                    <div class="product-feature">
                        <i class="fas fa-clock"></i>
                        <span>${product.duration} ${product.durationUnit}</span>
                    </div>
                    <div class="product-feature">
                        <i class="fas fa-mountain"></i>
                        <span>${this.getDifficultyLabel(product.difficulty)}</span>
                    </div>
                    <div class="product-feature">
                        <i class="fas fa-users"></i>
                        <span>Hasta ${product.maxPeople} personas</span>
                    </div>
                </div>
                
                <div class="product-footer">
                    <div class="product-price">
                        <span class="price-from">Precio desde</span>
                        <span class="price-amount">${ProductsConfig.currencySymbol}${product.price}</span>
                        <span class="price-period">${pricePerPerson}</span>
                    </div>
                    <div class="product-rating">
                        ${stars}
                        <span>(${product.reviewCount})</span>
                    </div>
                    <div class="product-cta">
                        <button class="btn btn-primary view-details" data-id="${product.id}">
                            Ver detalles
                        </button>
                        <button class="btn btn-secondary add-to-cart ${!product.available ? 'disabled' : ''}" 
                                data-id="${product.id}" 
                                ${!product.available ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart"></i> Reservar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Agregar event listeners a los botones
        setTimeout(() => {
            const viewBtn = productCard.querySelector('.view-details');
            const cartBtn = productCard.querySelector('.add-to-cart');
            
            if (viewBtn) {
                viewBtn.addEventListener('click', () => this.viewProductDetails(product.id));
            }
            
            if (cartBtn) {
                cartBtn.addEventListener('click', () => this.addToCart(product.id));
            }
        }, 0);
        
        return productCard;
    }
    
    createRatingStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let starsHTML = '';
        
        // Estrellas llenas
        for (let i = 0; i < fullStars; i++) {
            starsHTML += '<i class="fas fa-star"></i>';
        }
        
        // Media estrella
        if (hasHalfStar) {
            starsHTML += '<i class="fas fa-star-half-alt"></i>';
        }
        
        // Estrellas vacías
        for (let i = 0; i < emptyStars; i++) {
            starsHTML += '<i class="far fa-star"></i>';
        }
        
        return starsHTML;
    }
    
    // ========== FILTERS AND SORTING ==========
    setupFilters() {
        if (!this.filtersContainer) return;
        
        // Configurar event listeners para filtros
        const filterOptions = this.filtersContainer.querySelectorAll('.filter-option');
        const clearBtn = this.filtersContainer.querySelector('.filter-clear');
        const sortSelect = this.filtersContainer.querySelector('.sort-select');
        
        if (filterOptions) {
            filterOptions.forEach(option => {
                option.addEventListener('click', () => this.handleFilterClick(option));
            });
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearFilters());
        }
        
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => this.handleSortChange(e.target.value));
        }
        
        // Configurar sliders de precio (si existen)
        const priceSlider = this.filtersContainer.querySelector('.price-slider');
        if (priceSlider) {
            noUiSlider.create(priceSlider, {
                start: [0, 5000],
                connect: true,
                range: {
                    'min': 0,
                    'max': 5000
                },
                step: 100
            });
            
            priceSlider.noUiSlider.on('update', (values) => {
                this.activeFilters.priceRange = {
                    min: parseInt(values[0]),
                    max: parseInt(values[1])
                };
                this.applyFilters();
            });
        }
    }
    
    handleFilterClick(option) {
        const filterType = option.dataset.filter;
        const filterValue = option.dataset.value;
        
        // Toggle active class
        option.classList.toggle('active');
        
        // Actualizar filtros activos
        if (filterType === 'category') {
            this.activeFilters.category = option.classList.contains('active') ? filterValue : 'all';
        } else if (filterType === 'difficulty') {
            this.activeFilters.difficulty = option.classList.contains('active') ? filterValue : 'all';
        } else if (filterType === 'rating') {
            this.activeFilters.rating = option.classList.contains('active') ? parseInt(filterValue) : 0;
        }
        
        this.applyFilters();
    }
    
    applyFilters() {
        this.filteredProducts = this.products.filter(product => {
            // Filtrar por categoría
            if (this.activeFilters.category !== 'all' && product.category !== this.activeFilters.category) {
                return false;
            }
            
            // Filtrar por rango de precio
            if (product.price < this.activeFilters.priceRange.min || 
                product.price > this.activeFilters.priceRange.max) {
                return false;
            }
            
            // Filtrar por duración
            if (product.duration < this.activeFilters.duration.min || 
                product.duration > this.activeFilters.duration.max) {
                return false;
            }
            
            // Filtrar por dificultad
            if (this.activeFilters.difficulty !== 'all' && 
                product.difficulty !== this.activeFilters.difficulty) {
                return false;
            }
            
            // Filtrar por rating
            if (this.activeFilters.rating > 0 && product.rating < this.activeFilters.rating) {
                return false;
            }
            
            // Filtrar por disponibilidad
            if (!product.available) {
                return false;
            }
            
            return true;
        });
        
        // Aplicar ordenamiento
        this.applySorting();
        
        // Resetear a página 1
        this.currentPage = 1;
        
        // Recalcular paginación
        this.calculatePagination();
        
        // Renderizar productos
        this.renderProducts();
    }
    
    handleSortChange(sortType) {
        this.currentSort = sortType;
        this.applySorting();
        this.renderProducts();
    }
    
    applySorting() {
        switch (this.currentSort) {
            case 'price-asc':
                this.filteredProducts.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                this.filteredProducts.sort((a, b) => b.price - a.price);
                break;
            case 'rating':
                this.filteredProducts.sort((a, b) => b.rating - a.rating);
                break;
            case 'duration':
                this.filteredProducts.sort((a, b) => a.duration - b.duration);
                break;
            case 'popular':
            default:
                // Mantener orden original o por popularidad
                this.filteredProducts.sort((a, b) => b.reviewCount - a.reviewCount);
                break;
        }
    }
    
    clearFilters() {
        // Resetear filtros activos
        this.activeFilters = {
            category: 'all',
            priceRange: { min: 0, max: 5000 },
            duration: { min: 1, max: 30 },
            difficulty: 'all',
            rating: 0
        };
        
        // Resetear UI de filtros
        const filterOptions = this.filtersContainer?.querySelectorAll('.filter-option');
        if (filterOptions) {
            filterOptions.forEach(option => option.classList.remove('active'));
        }
        
        // Resetear sliders
        const priceSlider = this.filtersContainer?.querySelector('.price-slider');
        if (priceSlider && priceSlider.noUiSlider) {
            priceSlider.noUiSlider.set([0, 5000]);
        }
        
        // Aplicar filtros
        this.applyFilters();
    }
    
    // ========== PAGINATION ==========
    calculatePagination() {
        this.totalPages = Math.ceil(this.filteredProducts.length / ProductsConfig.itemsPerPage);
    }
    
    renderPagination() {
        if (!this.paginationContainer || this.totalPages <= 1) {
            if (this.paginationContainer) {
                this.paginationContainer.innerHTML = '';
            }
            return;
        }
        
        let paginationHTML = '';
        
        // Botón anterior
        paginationHTML += `
            <button class="pagination-btn prev" ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        // Números de página
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
        
        // Ajustar si estamos cerca del final
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        // Primera página y puntos si es necesario
        if (startPage > 1) {
            paginationHTML += `
                <button class="pagination-btn" data-page="1">1</button>
                ${startPage > 2 ? '<span class="pagination-dots">...</span>' : ''}
            `;
        }
        
        // Páginas visibles
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }
        
        // Última página y puntos si es necesario
        if (endPage < this.totalPages) {
            paginationHTML += `
                ${endPage < this.totalPages - 1 ? '<span class="pagination-dots">...</span>' : ''}
                <button class="pagination-btn" data-page="${this.totalPages}">${this.totalPages}</button>
            `;
        }
        
        // Botón siguiente
        paginationHTML += `
            <button class="pagination-btn next" ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        this.paginationContainer.innerHTML = paginationHTML;
        
        // Agregar event listeners
        setTimeout(() => {
            const pageButtons = this.paginationContainer.querySelectorAll('.pagination-btn:not(.prev):not(.next):not(.disabled)');
            const prevBtn = this.paginationContainer.querySelector('.pagination-btn.prev');
            const nextBtn = this.paginationContainer.querySelector('.pagination-btn.next');
            
            pageButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const page = parseInt(btn.dataset.page);
                    this.goToPage(page);
                });
            });
            
            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    if (this.currentPage > 1) {
                        this.goToPage(this.currentPage - 1);
                    }
                });
            }
            
            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    if (this.currentPage < this.totalPages) {
                        this.goToPage(this.currentPage + 1);
                    }
                });
            }
        }, 0);
    }
    
    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        
        this.currentPage = page;
        this.renderProducts();
        
        // Scroll to top suave
        window.scrollTo({
            top: this.productsContainer ? this.productsContainer.offsetTop - 100 : 0,
            behavior: 'smooth'
        });
    }
    
    // ========== PRODUCT ACTIONS ==========
    viewProductDetails(productId) {
        // En producción, redirigir a la página del producto
        window.location.href = `/producto/${productId}`;
        
        // Para desarrollo, mostrar modal
        // this.showProductModal(productId);
    }
    
    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        
        if (!product) {
            console.error('Producto no encontrado:', productId);
            return;
        }
        
        if (!product.available) {
            this.showNotification('Este producto no está disponible actualmente', 'error');
            return;
        }
        
        // Aquí se integraría con el carrito de compras
        console.log('Agregando al carrito:', product);
        
        // Mostrar notificación
        this.showNotification(`"${product.name}" agregado al carrito`, 'success');
        
        // Dispatch event para que otros componentes puedan reaccionar
        const event = new CustomEvent('productAddedToCart', { 
            detail: { product } 
        });
        document.dispatchEvent(event);
    }
    
    // ========== UI HELPERS ==========
    showLoading() {
        this.isLoading = true;
        
        if (this.loadingContainer) {
            this.loadingContainer.style.display = 'grid';
        }
        
        if (this.productsGrid) {
            this.productsGrid.style.opacity = '0.5';
        }
    }
    
    hideLoading() {
        this.isLoading = false;
        
        if (this.loadingContainer) {
            this.loadingContainer.style.display = 'none';
        }
        
        if (this.productsGrid) {
            this.productsGrid.style.opacity = '1';
        }
    }
    
    showEmptyState() {
        if (this.emptyState) {
            this.emptyState.style.display = 'block';
        }
        
        if (this.productsGrid) {
            this.productsGrid.innerHTML = '';
        }
        
        if (this.paginationContainer) {
            this.paginationContainer.innerHTML = '';
        }
    }
    
    hideEmptyState() {
        if (this.emptyState) {
            this.emptyState.style.display = 'none';
        }
    }
    
    showError(message) {
        // Mostrar mensaje de error
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        `;
        
        if (this.productsContainer) {
            this.productsContainer.prepend(errorDiv);
            
            // Auto-remover después de 5 segundos
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.parentNode.removeChild(errorDiv);
                }
            }, 5000);
        }
    }
    
    showNotification(message, type = 'success') {
        // Crear notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close"><i class="fas fa-times"></i></button>
        `;
        
        // Estilos para la notificación
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : '#dc3545'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 9999;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Botón cerrar
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                notification.remove();
            });
        }
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-out forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }
    
    // ========== UTILITY METHODS ==========
    getCategoryLabel(category) {
        const labels = {
            'machu-picchu': 'Machu Picchu',
            'cusco': 'Cusco',
            'paquetes': 'Paquetes',
            'trekking': 'Trekking',
            'cultural': 'Cultural',
            'aventura': 'Aventura'
        };
        
        return labels[category] || category;
    }
    
    getDifficultyLabel(difficulty) {
        const labels = {
            'baja': 'Fácil',
            'media': 'Moderado',
            'alta': 'Difícil'
        };
        
        return labels[difficulty] || difficulty;
    }
    
    // ========== PUBLIC METHODS ==========
    getProductsByCategory(category) {
        return this.products.filter(product => product.category === category);
    }
    
    getFeaturedProducts(count = 3) {
        return this.products
            .filter(product => product.tags.includes('popular'))
            .sort((a, b) => b.rating - a.rating)
            .slice(0, count);
    }
    
    searchProducts(query) {
        if (!query.trim()) {
            this.filteredProducts = [...this.products];
            this.renderProducts();
            return;
        }
        
        const searchTerm = query.toLowerCase();
        this.filteredProducts = this.products.filter(product => {
            return product.name.toLowerCase().includes(searchTerm) ||
                   product.description.toLowerCase().includes(searchTerm) ||
                   product.tags.some(tag => tag.toLowerCase().includes(searchTerm));
        });
        
        this.currentPage = 1;
        this.calculatePagination();
        this.renderProducts();
    }
    
    // ========== EVENT LISTENERS ==========
    setupEventListeners() {
        // Escuchar eventos de búsqueda (si se implementa búsqueda global)
        document.addEventListener('searchProducts', (e) => {
            if (e.detail && e.detail.query) {
                this.searchProducts(e.detail.query);
            }
        });
        
        // Escuchar cambios de categoría desde otras partes del sitio
        document.addEventListener('categoryChanged', (e) => {
            if (e.detail && e.detail.category) {
                this.activeFilters.category = e.detail.category;
                this.applyFilters();
            }
        });
    }
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar módulo de productos
    window.MyCuscoTripProducts = new MyCuscoTripProducts();
    
    // Log para debugging
    console.log('Products module initialized successfully');
});

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MyCuscoTripProducts;
}
