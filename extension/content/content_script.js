chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_HTML") {
    sendResponse({ html: document.documentElement.outerHTML });
  }
});
