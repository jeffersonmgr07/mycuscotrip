// Cargar componentes dinámicamente
async function loadComponent(componentName, targetId) {
  try {
    const response = await fetch(`/components/${componentName}.html`);
    const html = await response.text();
    document.getElementById(targetId).innerHTML = html;
    
    // Inicializar scripts específicos del componente
    if (componentName === 'header') {
      await import('./components/header.js');
    } else if (componentName === 'search-bar') {
      await import('./components/search-bar.js');
    } else if (componentName === 'footer') {
      // Footer no necesita JS especial
    }
  } catch (error) {
    console.error(`Error loading ${componentName}:`, error);
  }
}

// Cargar todos los componentes al iniciar
document.addEventListener('DOMContentLoaded', async () => {
  // Cargar componentes
  await Promise.all([
    loadComponent('header', 'header-container'),
    loadComponent('search-bar', 'search-bar-container'),
    loadComponent('footer', 'footer-container')
  ]);

  // Cargar productos
  await import('./components/products.js');
});
