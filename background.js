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



// --- LEAD CAPTURE HELPERS ---
function getMainDomain(url) {
  try { const u = new URL(url); return `${u.protocol}//${u.hostname}`; }
  catch { return url; }
}

function uniq(arr) { return [...new Set((arr || []).filter(Boolean))]; }

function filterSocial(hrefs) {
  return uniq((hrefs || []).map(h => {
    try { return new URL(h).href; } catch { return null; }
  }));
}

function pickBestEmail(emails, siteOrigin) {
  if (!emails || emails.length === 0) return "";
  let siteHost = "";
  try { siteHost = new URL(siteOrigin).hostname.replace(/^www\./, ""); } catch {}
  const ranked = emails
    .map(e => ({ e, host: e.split("@")[1]?.toLowerCase() || "" }))
    .sort((a, b) => {
      const aCorp = !/gmail\.com|yahoo\.com|hotmail\.com|outlook\.com/i.test(a.host);
      const bCorp = !/gmail\.com|yahoo\.com|hotmail\.com|outlook\.com/i.test(b.host);
      const aMatch = siteHost && a.host.endsWith(siteHost);
      const bMatch = siteHost && b.host.endsWith(siteHost);
      if (aMatch !== bMatch) return bMatch - aMatch;
      if (aCorp !== bCorp) return bCorp - aCorp;
      return a.host.localeCompare(b.host);
    });
  return ranked[0]?.e || emails[0];
}

function mergeLead(oldLead, fresh) {
  return {
    ...oldLead,
    name: fresh.name || oldLead.name || "",
    email: fresh.email || oldLead.email || "",
    phone: fresh.phone || oldLead.phone || "",
    address: fresh.address || oldLead.address || "",
    country: fresh.country || oldLead.country || "",
    city: fresh.city || oldLead.city || "",
    zip: fresh.zip || oldLead.zip || "",
    facebook: fresh.facebook || oldLead.facebook || "",
    instagram: fresh.instagram || oldLead.instagram || "",
    twitter: fresh.twitter || oldLead.twitter || "",
    linkedin: fresh.linkedin || oldLead.linkedin || "",
    youtube: fresh.youtube || oldLead.youtube || "",
    dateCaptured: oldLead.dateCaptured || new Date().toISOString().split("T")[0],
    dateUpdated: new Date().toISOString().split("T")[0]
  };
}

// --- SCRAPING FUNCTION (injected into page) ---
function scrapePageLeadsInjected() {
  const out = {
    emails: [],
    phones: [],
    facebook: [],
    instagram: [],
    twitter: [],
    linkedin: [],
    youtube: [],
    addressText: "",
    country: "",
    city: "",
    zip: "",
    name: ""
  };

  // Emails & phones
  const mailto = Array.from(document.querySelectorAll('a[href^="mailto:"]'))
    .map(a => (a.getAttribute("href") || "").replace(/^mailto:/i, "").split("?")[0].trim());
  const mailInText = (document.body.innerText || "").match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/gi) || [];
  out.emails = Array.from(new Set([...mailto, ...mailInText]));

  const tel = Array.from(document.querySelectorAll('a[href^="tel:"]'))
    .map(a => (a.getAttribute("href") || "").replace(/^tel:/i, "").trim());
  const phoneText = (document.body.innerText || "").match(/(\+\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,6}/g) || [];
  out.phones = Array.from(new Set([...tel, ...phoneText]));

  // Socials
  out.facebook = Array.from(document.querySelectorAll('a[href*="facebook.com/"]')).map(a => a.href);
  out.instagram = Array.from(document.querySelectorAll('a[href*="instagram.com/"]')).map(a => a.href);
  out.twitter  = Array.from(document.querySelectorAll('a[href*="twitter.com/"], a[href*="x.com/"]')).map(a => a.href);
  out.linkedin = Array.from(document.querySelectorAll('a[href*="linkedin.com/"]')).map(a => a.href);
  out.youtube  = Array.from(document.querySelectorAll('a[href*="youtube.com/"], a[href*="youtu.be/"]')).map(a => a.href);

  // Address: maps link text
  const mapsA = document.querySelector('a[href*="maps.google."], a[href*="google.com/maps"], a[href*="maps.app.goo.gl"], a[href*="g.page"]');
  if (mapsA) {
    const text = (mapsA.textContent || "").replace(/\s+/g, " ").trim();
    if (text && text.length > 8) out.addressText = text;
    const zipMatch = text.match(/\b\d{4,6}\b/);
    if (zipMatch) out.zip = zipMatch[0];
  }

  // Name: use only <title>, clean suffixes
  let rawTitle = document.querySelector('title')?.innerText || "";
  if (rawTitle.includes("–")) rawTitle = rawTitle.split("–")[0].trim();
  if (rawTitle.includes("|")) rawTitle = rawTitle.split("|")[0].trim();
  out.name = rawTitle;

  return out;
}

// --- Save merged lead ---
function saveMergedLead(origin, fresh) {
  chrome.storage.local.get("leads", (data) => {
    const leads = data.leads || {};
    const old = leads[origin] || { website: origin, dateCaptured: new Date().toISOString().split("T")[0] };
    const merged = mergeLead(old, fresh);
    leads[origin] = merged;
    chrome.storage.local.set({ leads }, () => {
      console.log("✅ Lead captured for", origin, merged);
    });
  });
}

// --- Run capture on a tab ---
function runLeadCaptureOnTab(tabId, tabUrl) {
  const origin = getMainDomain(tabUrl);
  chrome.scripting.executeScript(
    { target: { tabId }, func: scrapePageLeadsInjected },
    (results) => {
      if (!results || !results[0]?.result) return;
      const r = results[0].result;

      const freshLead = {
        website: origin,
        name: (r.name || "").trim(),
        email: pickBestEmail(uniq(r.emails), origin),
        phone: uniq(r.phones)[0] || "",
        address: (r.addressText || "").trim(),
        country: r.country || "",
        city: r.city || "",
        zip: r.zip || "",
        facebook: filterSocial(r.facebook)[0] || "",
        instagram: filterSocial(r.instagram)[0] || "",
        twitter: filterSocial(r.twitter)[0] || "",
        linkedin: filterSocial(r.linkedin)[0] || "",
        youtube: filterSocial(r.youtube)[0] || ""
      };

      saveMergedLead(origin, freshLead);
    }
  );
}

// Auto-capture on page load
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && /^https?:/.test(tab.url)) {
    runLeadCaptureOnTab(tabId, tab.url);
  }
});

// Allow popup to force refresh
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "RUN_LEAD_CAPTURE") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]?.id || !tabs[0]?.url) {
        sendResponse({ success: false, error: "No active tab" });
        return;
      }
      runLeadCaptureOnTab(tabs[0].id, tabs[0].url);
      sendResponse({ success: true });
    });
    return true;
  }
});