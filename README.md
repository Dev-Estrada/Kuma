# POS + Inventario

Sistema ligero de **Punto de Venta (POS)** con **inventario**, pensado para uso en Venezuela: precios en **dólares (USD)** y totales en **bolívares (Bs)** con tasa de cambio actualizable.

## Características

- **Punto de Venta**: selección de Productos, factura, descuento por venta, totales en USD y Bs, descargo automático del inventario.
- **Inventario**: alta, edición, baja y consulta de Productos; precios en USD; stock mínimo; categorías.
- **Configuración**: tasa de cambio USD → Bs actualizable en cualquier momento.
- **Dashboard**: resumen de Productos, Bajo Stock, tasa actual y últimas ventas.

## Estructura

- `src/`: backend Node.js + Express + TypeScript  
  - `database/`: SQLite, tablas `categories`, `products`, `movements`, `settings`, `sales`, `sale_items`
  - `models/`, `repositories/`, `services/`, `controllers/`, `routes/`
- `public/`: frontend estático (HTML, SCSS, TypeScript)
  - `index.html`: inicio/dashboard
  - `sales.html`: Punto de Venta
  - `inventory.html`: inventario
  - `settings.html`: tasa de cambio

## Requisitos

- Node.js (v16+)
- npm

## Instalación

```bash
npm install
```

## Comandos

- `npm run dev`: servidor en modo desarrollo con recarga
- `npm run build`: compila TypeScript del servidor
- `npm run start`: inicia el servidor compilado
- `npm run build:frontend`: compila TS y SCSS del cliente a `public/js` y `public/css`

## Uso

1. Arrancar el servidor: `npm run dev` (o `npm run build` y luego `npm run start`).
2. Abrir en el navegador: `http://localhost:3000`.
3. En **Configuración** establecer la tasa USD → Bs.
4. En **Inventario** cargar Productos (precios en USD).
5. En **Punto de Venta** realizar ventas; el inventario se descuenta automáticamente.

La base de datos `inventory.db` se crea al arrancar. Si ya existía con un esquema antiguo, puedes borrarla para que se genere la estructura nueva (settings, sales, sale_items).
