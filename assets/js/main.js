// main.js - Versión simplificada

console.log('🚀 main.js cargado');

// Función para cargar componentes
async function loadComponent(componentName, targetId) {
    try {
        console.log(`📁 Intentando cargar: components/${componentName}.html`);
        
        // Usar ruta relativa correcta
        const response = await fetch(`components/${componentName}.html`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
        }
        
        const html = await response.text();
        const target = document.getElementById(targetId);
        
        if (target) {
            target.innerHTML = html;
            console.log(`✅ ${componentName} cargado en #${targetId}`);
            return true;
        } else {
            throw new Error(`Elemento #${targetId} no encontrado`);
        }
        
    } catch (error) {
        console.error(`❌ Error cargando ${componentName}:`, error);
        
        // Mostrar mensaje de error en el contenedor
        const target = document.getElementById(targetId);
        if (target) {
            target.innerHTML = `
                <div style="padding: 20px; background: #f8d7da; color: #721c24; border-radius: 5px; margin: 10px;">
                    <strong>Error cargando ${componentName}:</strong><br>
                    ${error.message}
                </div>
            `;
        }
        return false;
    }
}

// Función para inicializar componentes JS
function initializeComponents() {
    console.log('🔄 Inicializando componentes JS...');
    
    // Inicializar Header si existe
    if (typeof MyCuscoTripHeader !== 'undefined') {
        try {
            window.headerInstance = new MyCuscoTripHeader();
            console.log('✅ Header inicializado');
        } catch (error) {
            console.error('❌ Error inicializando Header:', error);
        }
    }
    
    // Inicializar SearchBar si existe
    if (typeof MyCuscoTripSearchBar !== 'undefined') {
        try {
            // Esperar a que Flatpickr esté disponible
            if (typeof flatpickr !== 'undefined') {
                window.searchBarInstance = new MyCuscoTripSearchBar();
                console.log('✅ SearchBar inicializado');
            } else {
                console.warn('⚠️ Flatpickr no cargado, reintentando en 500ms...');
                setTimeout(() => {
                    if (typeof flatpickr !== 'undefined' && typeof MyCuscoTripSearchBar !== 'undefined') {
                        window.searchBarInstance = new MyCuscoTripSearchBar();
                        console.log('✅ SearchBar inicializado (retry)');
                    }
                }, 500);
            }
        } catch (error) {
            console.error('❌ Error inicializando SearchBar:', error);
        }
    }
    
    // Inicializar Products si existe
    if (typeof MyCuscoTripProducts !== 'undefined') {
        try {
            window.productsInstance = new MyCuscoTripProducts();
            console.log('✅ Products inicializado');
        } catch (error) {
            console.error('❌ Error inicializando Products:', error);
        }
    }
}

// Función principal
async function initializeApp() {
    console.log('🎬 Iniciando aplicación...');
    
    // Cargar componentes HTML
    const componentsLoaded = await Promise.all([
        loadComponent('header', 'header-container'),
        loadComponent('search-bar', 'search-bar-container'),
        loadComponent('footer', 'footer-container')
    ]);
    
    console.log('📊 Resultado carga componentes:', componentsLoaded);
    
    // Inicializar componentes JS
    // Esperar un poco para que los scripts se carguen
    setTimeout(initializeComponents, 100);
}

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM ya está listo
    initializeApp();
}

// Hacer funciones disponibles globalmente
window.loadComponent = loadComponent;
window.initializeComponents = initializeComponents;
