/**
 * Abre una ventana con contenido HTML listo para imprimir (Ctrl+P o Guardar como PDF).
 * Uso: window.openPrintWindow('Título del documento', '<div>...contenido...</div>');
 */
(function () {
  var style = [
    'body { font-family: "Segoe UI", system-ui, sans-serif; font-size: 14px; line-height: 1.4; color: #1a1d21; margin: 1rem; }',
    'h1 { font-size: 1.5rem; margin: 0 0 1rem; border-bottom: 1px solid #e1e4e8; padding-bottom: 0.5rem; }',
    'h2 { font-size: 1.2rem; margin: 1.25rem 0 0.5rem; }',
    'table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }',
    'th, td { border: 1px solid #e1e4e8; padding: 0.4rem 0.6rem; text-align: left; }',
    'th { background: #f0f2f5; font-weight: 600; }',
    '.print-meta { color: #586069; font-size: 0.875rem; margin-bottom: 1rem; }',
    '.print-actions { margin-bottom: 1rem; }',
    '.print-actions button { padding: 0.5rem 1rem; font-size: 1rem; cursor: pointer; background: #0d6efd; color: #fff; border: none; border-radius: 6px; }',
    '.print-actions button:hover { background: #0b5ed7; }',
    '@media print { .print-actions { display: none !important; } body { margin: 0; } }',
  ].join('\n');

  window.openPrintWindow = function (title, bodyHtml) {
    var win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
    if (!win) {
      alert('Permite ventanas emergentes para abrir la vista de impresión.');
      return;
    }
    win.document.write(
      '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>' +
        (title || 'Imprimir').replace(/</g, '&lt;') +
        '</title><style>' +
        style +
        '</style></head><body><div class="print-actions"><button type="button" onclick="window.print()">Imprimir / Guardar como PDF</button></div><div class="print-meta">Generado: ' +
        new Date().toLocaleString('es-VE') +
        '</div>' +
        (bodyHtml || '') +
        '</body></html>'
    );
    win.document.close();
  };
})();
