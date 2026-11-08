// JobForge Helper background worker.
// Installs the options page on first run and, more importantly, owns every
// network request. Content scripts on https pages cannot be trusted to reach
// http://localhost under Chrome's local network rules, but this worker holds
// the localhost host permission, so fetches from here always succeed.

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== 'jf-fetch') return false;

  (async () => {
    try {
      const res = await fetch(msg.url, msg.options || {});
      let data = null;
      try { data = await res.json(); } catch { /* non json body */ }
      sendResponse({ ok: res.ok, status: res.status, data });
    } catch (err) {
      sendResponse({ ok: false, status: 0, error: String(err && err.message || err) });
    }
  })();

  return true; // keep the channel open for the async sendResponse
});
