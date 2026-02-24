# Cómo entregar KUMA al cliente final

La aplicación es un **servidor Node.js** que sirve la interfaz web y usa **SQLite** embebido (el paquete `sqlite3` de npm). No hace falta instalar SQLite por separado en el PC.

---

## Opción 1: Sin instalador (carpeta + ejecutar)

**Idea:** El cliente recibe una carpeta, instala dependencias una vez y arranca el servidor. Luego abre el navegador.

### Qué necesita el cliente

- **Node.js** instalado (LTS, p. ej. 18 o 20): https://nodejs.org  
- Nada más. SQLite va dentro del proyecto al hacer `npm install`.

### Proceso de entrega

1. **Preparar la carpeta para el cliente**
   - Compilar: `npm run build`
   - Entregar todo el proyecto **excepto** `node_modules` y (opcional) archivos de desarrollo (.ts en src si ya está compilado).
   - Incluir al menos: `dist/`, `public/`, `package.json`, `package-lock.json`, y los scripts de abajo.

2. **En el PC del cliente (una sola vez)**
   - Copiar la carpeta donde quiera (ej. `C:\Kuma`).
   - Abrir terminal en esa carpeta y ejecutar:
     ```bash
     npm install
     ```
   - Con eso se instalan Express, SQLite (y el binario nativo de SQLite para su sistema), etc.

3. **Cada vez que quiera usar la app**
   - En la misma carpeta ejecutar:
     ```bash
     npm start
     ```
   - O hacer doble clic en el script (ver abajo).
   - Abrir el navegador en: **http://localhost:3000**

La base de datos `inventory.db` se crea sola la primera vez que arranca el servidor, en la misma carpeta desde donde se ejecuta `npm start`.

### Scripts para el cliente (incluidos en el repo)

- **Windows:** `INICIAR-KUMA.bat` — doble clic inicia el servidor y puede abrir el navegador.
- **Todos:** `npm start` — arranca el servidor (puerto 3000 por defecto).

---

## Opción 2: Con “instalador” o empaquetado

Si quieres un instalador (ej. “Instalar KUMA”) o un ejecutable:

1. **Requisito previo:** El cliente sigue necesitando Node.js (a menos que empaquetes Node dentro del instalador).
2. **Instalador típico (p. ej. Inno Setup en Windows):**
   - Comprueba si existe Node.js (o lo instala).
   - Copia la carpeta de la app (con `dist/`, `public/`, `package.json`, `package-lock.json`).
   - Crea un acceso directo que ejecute algo como:
     ```bash
     cmd /c "cd /d C:\Program Files\Kuma && npm start"
     ```
   - Opcional: después de `npm start`, abrir el navegador en http://localhost:3000.

3. **SQLite:** No hace falta un script aparte para “incluir SQLite”. Al hacer `npm install` en la carpeta de la app (durante la instalación o la primera ejecución), npm se descarga el módulo nativo `sqlite3` para ese sistema. Si el instalador ejecuta `npm install` en la carpeta instalada, SQLite quedará listo.

4. **Alternativas más avanzadas:**
   - **Electron:** empaquetar app + Node + ventana de navegador en un .exe; el usuario no instala Node ni abre el navegador a mano.
   - **pkg/nexe:** empaquetar Node + tu código en un solo ejecutable; con `sqlite3` nativo suele haber más fricción (binarios por plataforma).

---

## Resumen recomendado para tu caso

- **Entrega sencilla (recomendada):**  
  - Carpeta con: `dist/`, `public/`, `package.json`, `package-lock.json`, `INICIAR-KUMA.bat` (y este documento).  
  - Instrucciones: “Instalar Node.js desde nodejs.org → en la carpeta ejecutar `npm install` una vez → luego `npm start` o doble clic en INICIAR-KUMA.bat → abrir http://localhost:3000”.

- **Con instalador:**  
  - Instalador que copie los archivos y, en la primera ejecución o en el paso “Configuración”, ejecute `npm install` en la carpeta instalada.  
  - Atajo que ejecute `npm start` (y opcionalmente abra el navegador).  
  - No hace falta un script especial para “incluir SQLite”; se resuelve con `npm install`.

A continuación se añaden los scripts `INICIAR-KUMA.bat` y, opcionalmente, un script de PowerShell para abrir el navegador.
