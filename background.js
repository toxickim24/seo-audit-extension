
// background.js
console.log("Background service worker loaded");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_DOMAIN_METRICS") {
    const domain = message.domain;

    fetch(`https://openpagerank.com/api/v1.0/getPageRank?domains[]=${domain}`, {
      headers: { "API-OPR": "sgoccs888kwcows8ocsscgo8c4o0s44s4sg00c8o" } // Replace with your Open PageRank key
    })
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));

    return true; // Keep channel open for async sendResponse
  }
});


