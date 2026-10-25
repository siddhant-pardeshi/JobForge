// JobForge Helper background worker. Thin relay: opens the options page on
// first install so the token pairing happens immediately.

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});
