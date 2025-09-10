console.log("Background service worker loaded");

// --- KEEPING YOUR OPR HANDLER ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_DOMAIN_METRICS") {
    const domain = message.domain;
    fetch(`https://openpagerank.com/api/v1.0/getPageRank?domains[]=${domain}`, {
      headers: { "API-OPR": "sgoccs888kwcows8ocsscgo8c4o0s44s4sg00c8o" }
    })
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// --- PAGESPEED SECTION ---
const PSI_API_KEY = (() => {
  try { return chrome.runtime.getManifest().google_speed_api; }
  catch { return ""; }
})();

function psiEndpoint(url, strategy = "desktop") {
  const base = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
  const qs = new URLSearchParams({ url, strategy });
  if (PSI_API_KEY) qs.set("key", PSI_API_KEY);
  return `${base}?${qs.toString()}`;
}

function parseLighthouse(json) {
  const lh = json?.lighthouseResult;
  if (!lh) return null;
  const score = lh.categories?.performance?.score ?? null;
  const get = k => lh.audits?.[k]?.displayValue ?? "N/A";
  return {
    performanceScore: score != null ? Math.round(score * 100) : null,
    fcp: get("first-contentful-paint"),
    lcp: get("largest-contentful-paint"),
    cls: get("cumulative-layout-shift"),
    tbt: get("total-blocking-time")
  };
}

async function runAudit(url) {
  try {
    const [desktopJson, mobileJson] = await Promise.all([
      fetch(psiEndpoint(url, "desktop")).then(r => r.json()),
      fetch(psiEndpoint(url, "mobile")).then(r => r.json())
    ]);
    const desktop = parseLighthouse(desktopJson);
    const mobile = parseLighthouse(mobileJson);

    const result = { url, desktop, mobile, timestamp: Date.now() };

    // save results under audits[url]
    chrome.storage.local.get("audits", (data) => {
      const audits = data.audits || {};
      audits[url] = result;
      chrome.storage.local.set({ audits });
    });

    console.log("✅ Auto PageSpeed audit saved for", url, result);
    return { success: true, result };
  } catch (e) {
    console.error("❌ Auto PageSpeed audit failed:", e.message);
    return { success: false, error: e.message };
  }
}

// --- AUTO RUN ON PAGE LOAD ---
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && /^https?:/.test(tab.url)) {
    const origin = new URL(tab.url).origin;
    runAudit(origin); // run automatically for every site load
  }
});

// Still keep manual trigger if popup asks
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "RUN_PAGESPEED" && message.url) {
    runAudit(message.url).then(sendResponse);
    return true;
  }
});
