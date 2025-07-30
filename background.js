chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "fetch") {
    fetch(message.url, {
      method: message.method || "GET",
      headers: message.headers || {},
      body: message.body || null,
    })
      .then(res => res.text())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.toString() }));

    return true;
  }
});
