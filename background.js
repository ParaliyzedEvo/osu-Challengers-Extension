chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'fetch') {
    fetch(message.url, {
      method: message.method,
      headers: message.headers,
      body: message.body
    })
    .then(res => res.text())
    .then(text => {
      sendResponse({
        success: true,
        data: text
      });
    })
    .catch(err => {
      sendResponse({
        success: false,
        error: err.toString()
      });
    });

    return true;
  }
});
