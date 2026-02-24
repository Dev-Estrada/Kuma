const API = '';

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(`${API}${url}`);
  if (!res.ok) throw new Error(res.statusText);
  return res.json() as Promise<T>;
}

function formatDate(s: string): string {
  if (!s) return '—';
  const iso = s.includes('T') ? s : s.replace(' ', 'T');
  const d = new Date(iso.includes('Z') || /[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + '-04:00');
  return d.toLocaleDateString('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function todayStr(): string {
  const d = new Date();
  const y = d.toLocaleString('en-CA', { timeZone: 'America/Caracas', year: 'numeric' });
  const m = d.toLocaleString('en-CA', { timeZone: 'America/Caracas', month: '2-digit' });
  const day = d.toLocaleString('en-CA', { timeZone: 'America/Caracas', day: '2-digit' });
  return `${y}-${m}-${day}`;
}

interface LowStockItem {
  id: number;
  sku: string;
  name: string;
  quantity: number;
  minimumStock: number;
  categoryName?: string;
  missingUnits: number;
}

async function loadDashboard() {
  try {
    const [products, lowStock, rateRes, sales] = await Promise.all([
      getJson<{ id: number }[]>('/api/products'),
      getJson<LowStockItem[]>('/api/products/low-stock'),
      getJson<{ exchangeRate: number }>('/api/settings/exchange-rate'),
      getJson<{ id: number; createdAt?: string }[]>('/api/sales?limit=50'),
    ]);
    const activeCount = products.length;
    (document.getElementById('stat-products') as HTMLElement).textContent = String(activeCount);
    (document.getElementById('stat-low') as HTMLElement).textContent = String(lowStock.length);
    (document.getElementById('stat-rate') as HTMLElement).textContent = String(rateRes.exchangeRate);
    const today = todayStr();
    const salesToday = sales.filter((s) => (s.createdAt || '').slice(0, 10) === today);
    (document.getElementById('stat-sales') as HTMLElement).textContent = String(salesToday.length);

    const alertEl = document.getElementById('low-stock-alert')!;
    const alertText = document.getElementById('low-stock-alert-text')!;
    const lowStockCard = document.getElementById('low-stock-card')!;
    const lowStockTbody = document.getElementById('low-stock-tbody')!;
    if (lowStock.length > 0) {
      alertEl.style.display = 'block';
      alertText.textContent = `${lowStock.length} producto(s) con stock por debajo del mínimo.`;
      lowStockCard.style.display = 'block';
      lowStockTbody.innerHTML = lowStock
        .map(
          (p) =>
            `<tr>
              <td>${p.name || p.sku}</td>
              <td>${p.sku}</td>
              <td class="stock-low">${p.quantity}</td>
              <td>${p.minimumStock}</td>
              <td class="stock-low">${p.missingUnits ?? (p.minimumStock - p.quantity)}</td>
            </tr>`
        )
        .join('');
    } else {
      alertEl.style.display = 'none';
      lowStockCard.style.display = 'none';
    }

    const tbody = document.getElementById('recent-sales')!;
    const msg = document.getElementById('recent-sales-msg')!;
    const recent = sales.slice(0, 10);
    if (recent.length === 0) {
      msg.textContent = 'No hay ventas recientes.';
      tbody.innerHTML = '';
    } else {
      msg.textContent = '';
      tbody.innerHTML = recent
        .map(
          (s: any) =>
            `<tr>
              <td>${s.id}</td>
              <td>${formatDate(s.createdAt || '')}</td>
              <td>$${Number(s.totalUsd).toFixed(2)}</td>
              <td>Bs ${Number(s.totalBs).toFixed(2)}</td>
              <td>${s.itemCount ?? '-'}</td>
            </tr>`
        )
        .join('');
    }
  } catch (e) {
    console.error(e);
    (document.getElementById('stat-products') as HTMLElement).textContent = '—';
    (document.getElementById('recent-sales-msg') as HTMLElement).textContent = 'Error al cargar datos.';
  }
}

loadDashboard();
export {};
