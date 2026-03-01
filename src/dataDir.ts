/**
 * Directorio base para datos del usuario (BD, backups, branding).
 * Por defecto es process.cwd(). En Electron se establece KUMA_DATA_DIR al userData.
 */
export function getDataDir(): string {
  return process.env.KUMA_DATA_DIR || process.cwd();
}
