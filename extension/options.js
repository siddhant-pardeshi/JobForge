const serverInput = document.getElementById('server');
const tokenInput = document.getElementById('token');
const status = document.getElementById('status');

const FIELD_IDS = ['name', 'email', 'phone', 'city', 'linkedin', 'github', 'notice', 'salary', 'relocation', 'experience', 'why'];

function loadFields() {
  chrome.storage.local.get(['fields'], (r) => {
    const fields = r.fields || {};
    for (const id of FIELD_IDS) document.getElementById(`f_${id}`).value = fields[id] || '';
  });
}

function saveFields(done) {
  const fields = {};
  for (const id of FIELD_IDS) fields[id] = document.getElementById(`f_${id}`).value.trim();
  chrome.storage.local.set({ fields }, () => done && done());
}

function fillStatus(text, ok) {
  status.textContent = text;
  status.className = ok ? 'ok' : 'err';
}

chrome.storage.local.get(['token', 'server'], (r) => {
  tokenInput.value = r.token || '';
  serverInput.value = r.server || 'http://localhost:8787';
});
loadFields();

document.getElementById('save').addEventListener('click', () => {
  const server = (serverInput.value || 'http://localhost:8787').replace(/\/$/, '');
  const token = tokenInput.value.trim();
  if (!token) { fillStatus('Paste the token from JobForge Settings first.', false); return; }
  chrome.storage.local.set({ server, token }, () => {
    fillStatus('Paired. Open any job posting and press Send to JobForge.', true);
  });
});

document.getElementById('test').addEventListener('click', async () => {
  const server = (serverInput.value || 'http://localhost:8787').replace(/\/$/, '');
  const token = tokenInput.value.trim();
  fillStatus('Testing...');
  try {
    const res = await fetch(`${server}/api/extension/ping`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-jobforge-token': token },
      body: '{}'
    });
    const data = await res.json();
    if (res.ok) fillStatus('Connected to JobForge. You are live.', true);
    else fillStatus(data.error || `HTTP ${res.status}`, false);
  } catch {
    fillStatus('Cannot reach the server. Start JobForge with npm run dev or npm start.', false);
  }
});

// Pull the merged server values into the editor for review. The user still
// presses Save, so the sync never silently overwrites local corrections.
document.getElementById('sync').addEventListener('click', async () => {
  const server = (serverInput.value || 'http://localhost:8787').replace(/\/$/, '');
  const token = tokenInput.value.trim();
  fillStatus('Syncing from JobForge...');
  try {
    const res = await fetch(`${server}/api/extension/packet`, { headers: { 'x-jobforge-token': token } });
    const data = await res.json();
    if (!res.ok) { fillStatus(data.error || `HTTP ${res.status}`, false); return; }
    const contact = data.contact || {};
    for (const id of FIELD_IDS) {
      const el = document.getElementById(`f_${id}`);
      if (!el.value.trim() || !document.getElementById('f_name').dataset.userEdited) {
        // Fill empty fields and answer fields; keep anything the user typed in
        // this session for contact fields they may have corrected.
        if (!el.value.trim() && contact[id] !== undefined) el.value = contact[id];
        else if (contact[id] !== undefined && ['notice', 'salary', 'relocation', 'experience', 'why'].includes(id)) el.value = contact[id];
      }
    }
    fillStatus('Synced. Review, edit anything wrong, then press Save autofill data.', true);
  } catch {
    fillStatus('Cannot reach the server. Is JobForge running?', false);
  }
});

document.getElementById('saveFields').addEventListener('click', () => {
  saveFields(() => fillStatus('Saved. Autofill now uses exactly these values.', true));
});

// Track manual edits so sync can respect corrections made this session.
for (const id of FIELD_IDS) {
  document.getElementById(`f_${id}`).addEventListener('input', (e) => {
    e.target.dataset.userEdited = '1';
  });
}
