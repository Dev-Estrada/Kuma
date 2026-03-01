/**
 * Ofusca el código JS del backend (dist/) y electron-main.js para que no sea legible en la app empaquetada.
 * No es cifrado: un atacante determinado podría revertirlo, pero dificulta la lectura casual.
 */
const path = require('path');
const fs = require('fs');
const JavaScriptObfuscator = require('javascript-obfuscator');

const projectRoot = path.join(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const mainFile = path.join(projectRoot, 'electron-main.js');

const obfuscatorOptions = {
  target: 'node',
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  selfDefending: false,
  stringArray: true,
  stringArrayEncoding: ['none'],
  stringArrayThreshold: 0.5,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
};

function obfuscateFile(filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const obfuscated = JavaScriptObfuscator.obfuscate(code, obfuscatorOptions).getObfuscatedCode();
    fs.writeFileSync(filePath, obfuscated, 'utf8');
    console.log('  Ofuscado: ' + path.relative(projectRoot, filePath));
  } catch (err) {
    console.error('  Error en ' + filePath + ': ' + err.message);
    throw err;
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(full);
    else if (e.name.endsWith('.js')) obfuscateFile(full);
  }
}

console.log('Ofuscando código (dist/ y electron-main.js)...');
walkDir(distDir);
if (fs.existsSync(mainFile)) obfuscateFile(mainFile);
console.log('Listo.');
