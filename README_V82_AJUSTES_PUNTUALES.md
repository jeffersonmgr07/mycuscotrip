# My Cusco Trip — parche V8.2 (ajustes puntuales)

Este parche modifica únicamente:

1. El color del párrafo desplegado dentro de **Información importante** en el modal de pasajeros: blanco.
2. La posición del logo: se elimina el ajuste exclusivo de la landing y se usa el mismo header global que en el index.
3. La navegación de escritorio: si los elementos no caben, los últimos pasan a un botón compacto de más opciones, evitando superposición con el logo o el selector de idioma.
4. La carga del popup de cupón en las landings ES, EN y PT.

No cambia cupones, PayPal, precios, cards, formulario de pasajeros ni lógica de reservas.

## Instalación

Copia el contenido del ZIP sobre la raíz del repositorio y acepta el reemplazo de los archivos.

Para comprobar el popup como visitante nuevo, usa una ventana privada. El componente respeta su estado en `localStorage`, por lo que no vuelve a mostrarse inmediatamente si ya fue cerrado o si el usuario ya se registró.
