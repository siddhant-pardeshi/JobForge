const serverInput = document.getElementById('server');
const tokenInput = document.getElementById('token');
const status = document.getElementById('status');

chrome.storage.local.get(['token', 'server'], (r) => {
  tokenInput.value = r.token || '';
  serverInput.value = r.server || 'http://localhost:8787';
});

document.getElementById('save').addEventListener('click', () => {
  const server = (serverInput.value || 'http://localhost:8787').replace(/\/$/, '');
  const token = tokenInput.value.trim();
  if (!token) { status.textContent = 'Paste the token from JobForge Settings first.'; status.className = 'err'; return; }
  chrome.storage.local.set({ server, token }, () => {
    status.textContent = 'Paired. Open any job posting and press Send to JobForge.';
    status.className = 'ok';
  });
});

document.getElementById('test').addEventListener('click', async () => {
  const server = (serverInput.value || 'http://localhost:8787').replace(/\/$/, '');
  const token = tokenInput.value.trim();
  status.textContent = 'Testing...';
  status.className = '';
  try {
    const res = await fetch(`${server}/api/extension/ping`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-jobforge-token': token },
      body: '{}'
    });
    const data = await res.json();
    if (res.ok) { status.textContent = 'Connected to JobForge. You are live.'; status.className = 'ok'; }
    else { status.textContent = data.error || `HTTP ${res.status}`; status.className = 'err'; }
  } catch {
    status.textContent = 'Cannot reach the server. Start JobForge with npm run dev or npm start.';
    status.className = 'err';
  }
});
