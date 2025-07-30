chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "fetch") {
    fetch(message.url, {
      method: message.method || "GET",
      headers: message.headers || {},
      body: message.body || null
    })
      .then(async (res) => {
        const text = await res.text();
        sendResponse({ success: true, data: text });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.toString() });
      });
    return true;
  }
});
