export const BANKS = [
    // Banca Pública
    { code: '0001', name: 'Banco Central de Venezuela', group: 'public' },
    { code: '0102', name: 'Banco de Venezuela S.A.C.A.', group: 'public' },
    { code: '0163', name: 'Banco del Tesoro', group: 'public' },
    { code: '0166', name: 'Banco Agrícola de Venezuela', group: 'public' },
    { code: '0175', name: 'BANFANB (Banco de la Fuerza Armada Nacional Bolivariana)', group: 'public' },
    { code: '0177', name: 'Banco Digital de los Trabajadores (Bicentenario)', group: 'public' },
    // Banca Privada
    { code: '0104', name: 'Venezolano de Crédito, S.A.', group: 'private' },
    { code: '0105', name: 'Mercantil Banco, C.A.', group: 'private' },
    { code: '0108', name: 'BBVA Provincial', group: 'private' },
    { code: '0114', name: 'Banco del Caribe (Bancaribe)', group: 'private' },
    { code: '0115', name: 'Banco Exterior', group: 'private' },
    { code: '0128', name: 'Banco Caroní', group: 'private' },
    { code: '0134', name: 'Banesco Banco Universal', group: 'private' },
    { code: '0137', name: 'Sofitasa', group: 'private' },
    { code: '0138', name: 'Banco Plaza', group: 'private' },
    { code: '0151', name: 'BFC Banco Fondo Común', group: 'private' },
    { code: '0156', name: '100% Banco', group: 'private' },
    { code: '0157', name: 'DelSur Banco Universal', group: 'private' },
    { code: '0171', name: 'Banco Activo', group: 'private' },
    { code: '0172', name: 'Bancamiga Banco Universal', group: 'private' },
    { code: '0174', name: 'Banplus Banco Universal', group: 'private' },
    { code: '0191', name: 'BNC - Banco Nacional de Crédito', group: 'private' },
    // Microfinancieros y digitales
    { code: '0168', name: 'Bancrecer', group: 'micro' },
    { code: '0169', name: 'Mi Banco', group: 'micro' },
    { code: '0178', name: 'N58 Banco Digital', group: 'micro' },
    { code: '0190', name: 'Citibank (Sucursal Venezuela)', group: 'micro' },
    // Otro (para bancos no listados)
    { code: 'OTRO', name: 'Otro', group: 'private' },
];
export const PAYMENT_METHOD_LABELS = {
    pago_movil: 'Pago Móvil',
    tarjeta_debito: 'Tarjeta de Débito',
    efectivo_usd: 'Efectivo USD',
    efectivo_bs: 'Efectivo Bs',
};
