export async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'content-type': 'application/json' },
    ...options,
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new Error(data?.error || `Request failed with HTTP ${res.status}`);
  return data;
}

export async function uploadResume(file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/resume', { method: 'POST', body: fd });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'Upload failed');
  return data;
}

export function inr(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  return `₹${Number(value).toLocaleString('en-IN')}`;
}

export function lpa(salary) {
  if (!salary?.known) return null;
  if (salary.minLPA && salary.maxLPA) return `₹${salary.minLPA} to ${salary.maxLPA} LPA`;
  if (salary.maxLPA) return `up to ₹${salary.maxLPA} LPA`;
  return 'Pay listed, band unclear';
}

export function timeAgo(iso) {
  if (!iso) return 'date unknown';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

export function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}
