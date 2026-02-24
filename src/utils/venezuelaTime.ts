/**
 * Retorna la fecha y hora actual de Venezuela (America/Caracas, UTC-4)
 * en formato YYYY-MM-DD HH:mm:ss para guardar en SQLite.
 */
export function getVenezuelaNow(): string {
  const s = new Date().toLocaleString('en-CA', {
    timeZone: 'America/Caracas',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return s.replace(',', ' ');
}
