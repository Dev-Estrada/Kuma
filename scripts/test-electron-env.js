/**
 * Prueba que el servidor arranca correctamente con la variable de entorno
 * que usa Electron (KUMA_DATA_DIR). No abre ventana; solo verifica el backend.
 */
const path = require('path');
const os = require('os');
const http = require('http');

const testDataDir = path.join(os.tmpdir(), 'kuma-test-' + Date.now());
process.env.KUMA_DATA_DIR = testDataDir;
process.env.PORT = '30999';

let server;
try {
  const serverModule = require(path.join(__dirname, '..', 'dist', 'server.js'));
  server = serverModule.start();
} catch (err) {
  console.error('Error al cargar/iniciar el servidor:', err.message);
  process.exit(1);
}

const url = 'http://localhost:30999/';
const timeout = 8000;

function finish(success, message) {
  if (server && server.close) server.close();
  console.log(success ? '[OK] ' + message : '[FALLO] ' + message);
  process.exit(success ? 0 : 1);
}

const timer = setTimeout(() => {
  finish(false, 'Timeout: el servidor no respondió a tiempo.');
}, timeout);

http.get(url, (res) => {
  clearTimeout(timer);
  const ok = res.statusCode === 200 || res.statusCode === 302;
  finish(ok, 'Servidor respondió con ' + res.statusCode + ' en ' + url);
}).on('error', (err) => {
  clearTimeout(timer);
  finish(false, 'Error de conexión: ' + err.message);
});
