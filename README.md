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

---

## Aplicación de escritorio (Electron)

El proyecto se puede ejecutar como aplicación de escritorio en Windows (.exe).

### Prueba automática del entorno Electron

Para comprobar que el servidor arranca correctamente con la misma configuración que usa Electron (directorio de datos del usuario), sin abrir ventana:

```bash
npm run build
node scripts/test-electron-env.js
```

Si todo va bien verás: `[OK] Servidor respondió con 200 en http://localhost:30999/`

### Paso a paso para probar la app Electron (ventana)

1. **Compilar el backend**
   ```bash
   npm run build
   ```

2. **Abrir la aplicación en modo escritorio**
   ```bash
   npm run electron
   ```
   - Debería abrirse una ventana maximizada, sin barra de menú (Archivo, Editar, etc.).
   - La app carga en `http://localhost:3000` dentro de la ventana.
   - Los datos (BD, backups, logo de fondo) se guardan en la carpeta de datos del usuario de la app, no en la carpeta del proyecto.

3. **Cerrar**: cierra la ventana; la aplicación y el servidor se cierran solos.

### Generar el instalador .exe para Windows

1. **Requisito en Windows:** el proyecto usa `sqlite3` (módulo nativo). Para que `npm run dist` pueda compilarlo para Electron hace falta:
   - **Visual Studio Build Tools**: https://visualstudio.microsoft.com/visual-cpp-build-tools/ (o https://aka.ms/vs/17/release/vs_BuildTools.exe)
   - Carga de trabajo **"Desktop development with C++"** (Desarrollo para el escritorio con C++).
   - **Windows SDK**: si el build falla con *"missing any Windows SDK"*, abre el instalador de Build Tools → **Modificar** → pestaña **Componentes individuales** → busca y marca **Windows 10 SDK** o **Windows 11 SDK** (por ejemplo "Windows 11 SDK (10.0.22621.0)") → Modificar.
   - Reinicia el equipo si lo pide el instalador.

2. **Compilar y empaquetar**
   ```bash
   npm run dist
   ```

3. **Resultado**
   - En la carpeta `release/` aparecerá el instalador (por ejemplo `KUMA Setup 1.0.0.exe` o similar).
   - Al instalar, se crea la carpeta de la aplicación y el .exe **arranca todo el sistema**: servidor, base de datos y ventana, sin tener que ejecutar Node ni nada más. Los datos (BD, copias de seguridad, logo) se guardan en la carpeta de datos del usuario de Windows.

4. **Icono del .exe** (opcional): coloca **`icon.ico`** en `public/assets/`. El instalador y el acceso directo usan ese icono. Por defecto `signAndEditExecutable` está en `false` para evitar el error de enlaces simbólicos en Windows ("El cliente no dispone de un privilegio requerido"). Si quieres que el .exe instalado también lleve el icono incrustado, activa **Modo de desarrollador** en Windows (Configuración → Privacidad y seguridad → Para desarrolladores), pon `"signAndEditExecutable": true` en `package.json` (sección `build.win`) y vuelve a ejecutar el build.

5. **Ofuscación del código**: al ejecutar `npm run dist:vs` se ofusca automáticamente el código del servidor (`dist/`) y el proceso principal (`electron-main.js`) para que no sea legible en la app empaquetada. No es cifrado: dificulta la lectura pero no lo hace imposible. Tras un build de producción, si quieres volver a desarrollar con código legible, ejecuta `npm run build` y restaura `electron-main.js` desde git (`git checkout electron-main.js`).

6. **Qué entregar al distribuir**: entrega **solo el instalador** (por ejemplo `release/KUMA Setup 1.0.0.exe`). No des la carpeta `release` completa ni `win-unpacked`. El cliente solo ejecuta el .exe e instala la app. Aun así, quien instale podría en teoría extraer el archivo `app.asar` de la carpeta instalada y ver el código; con la ofuscación ese código es muy difícil de leer o reutilizar, pero no se puede impedir al 100% la extracción.

**Si no quieres instalar Visual Studio Build Tools:** puedes usar la app en modo web (`npm run dev` o `npm run start`) y abrirla en el navegador; el .exe solo es necesario si quieres distribuir la aplicación como programa de escritorio.
