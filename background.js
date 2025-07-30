chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'fetch') {
    fetch(message.url, {
      method: message.method || 'GET',
      headers: message.headers || {},
      body: message.body || null,
    })
    .then(response => response.text())
    .then(data => {
      sendResponse({ success: true, data });
    })
    .catch(error => {
      console.error('[BG] Fetch failed:', error);
      sendResponse({ success: false, error: error.toString() });
    });

    return true;
  }
});
