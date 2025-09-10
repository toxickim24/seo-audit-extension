// js/seo-speed.js — auto scan on load

const PSI_API_KEY = (() => {
  try { return String(chrome.runtime.getManifest().google_speed_api || "").trim(); }
  catch { return ""; }
})();

const $speed = () => document.getElementById("speed-results");
const esc = s => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

function setHtml(html){ const el=$speed(); if(!el) return console.error("#speed-results not found"); el.innerHTML=html; }
function appendHtml(html){ const el=$speed(); if(!el) return console.error("#speed-results not found"); el.insertAdjacentHTML("beforeend", html); }

function endpoint(url, strategy="desktop"){
  const base = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
  const qs = new URLSearchParams({ url, strategy });
  if (PSI_API_KEY) qs.set("key", PSI_API_KEY);
  return `${base}?${qs.toString()}`;
}

function loading(url, ep){
  setHtml(`
    <div class="speed-card">
      <h4>⚡ Google PageSpeed</h4>
      <p>Scanning: <code>${esc(url)}</code></p>
      <p>⏳ Running audit…</p>
      <details style="margin-top:8px;">
        <summary>Request details</summary>
        <p><strong>Endpoint (desktop):</strong><br><code style="word-break:break-all">${esc(ep)}</code></p>
        <p><a href="${ep}" target="_blank" rel="noopener">Open in new tab</a></p>
        <p style="opacity:.8">API key present: ${PSI_API_KEY ? "yes" : "no"}</p>
      </details>
    </div>
  `);
}

function pill(n){
  if(n==null||Number.isNaN(n)) return "N/A";
  const v=Math.round(n), c=v>=90?"#16a34a":v>=50?"#f59e0b":"#dc2626";
  return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:${c};color:#fff;">${v}/100</span>`;
}

function errorCard(title, msg, details=""){
  appendHtml(`
    <div class="speed-card">
      <h4>⚡ ${esc(title)}</h4>
      <p style="color:#c0392b;"><strong>❌ Error:</strong> ${esc(msg)}</p>
      ${details ? `<details style="margin-top:8px;"><summary>Details</summary><pre style="white-space:pre-wrap">${esc(details)}</pre></details>` : ""}
    </div>
  `);
}

function renderCard(strategy, lh){
  appendHtml(`
    <div class="speed-card">
      <h4>⚡ ${strategy.toUpperCase()} Results</h4>
      <p><strong>Performance:</strong> ${pill(lh.performanceScore)}</p>
      <ul style="list-style:none;padding:0;margin:0;">
        <li><strong>FCP:</strong> ${esc(lh.fcp)}</li>
        <li><strong>LCP:</strong> ${esc(lh.lcp)}</li>
        <li><strong>CLS:</strong> ${esc(lh.cls)}</li>
        <li><strong>TBT:</strong> ${esc(lh.tbt)}</li>
      </ul>
      <p style="margin-top:10px;font-size:12px;opacity:.75">Source: ${PSI_API_KEY ? "PageSpeed API (key)" : "PageSpeed API (no key)"}</p>
    </div>
  `);
}

async function getActiveTabUrl(){
  const [tab] = await chrome.tabs.query({ active:true, currentWindow:true });
  return tab?.url || "";
}

function parseLH(json){
  const lh = json?.lighthouseResult;
  if (!lh) throw new Error("No lighthouseResult in response.");
  const score = lh.categories?.performance?.score ?? null;
  const get = k => lh.audits?.[k]?.displayValue ?? "N/A";
  return {
    performanceScore: score!=null ? Math.round(score*100) : null,
    fcp: get("first-contentful-paint"),
    lcp: get("largest-contentful-paint"),
    cls: get("cumulative-layout-shift"),
    tbt: get("total-blocking-time"),
  };
}

async function fetchWithTimeoutJSON(url, timeoutMs=30000){
  const ctrl = new AbortController();
  const timer = setTimeout(()=>ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const body = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}\n${body}`);
    try { return JSON.parse(body); }
    catch (e) { throw new Error(`Invalid JSON\n${body.slice(0,800)}`); }
  } catch (e) {
    if (e.name === "AbortError") throw new Error("TIMEOUT: request exceeded 30s.");
    throw e;
  } finally { clearTimeout(timer); }
}

async function runStrategy(url, strategy){
  const ep = endpoint(url, strategy);
  appendHtml(`
    <div class="speed-card" style="background:#f8fafc;">
      <div style="font-size:13px;opacity:.8"><strong>Request (${esc(strategy)}):</strong>
        <a href="${ep}" target="_blank" rel="noopener">Open in new tab</a>
      </div>
    </div>
  `);
  const data = await fetchWithTimeoutJSON(ep, 30000);
  return parseLH(data);
}

async function run(){
  const url = await getActiveTabUrl();
  if (!/^https?:\/\//i.test(url)) {
    setHtml("");
    errorCard("Google PageSpeed", "Active tab is not an http(s) page.", `Got URL: ${url || "(empty)"}`);
    return;
  }

  const epDesk = endpoint(url, "desktop");
  loading(url, epDesk);

  try {
    const desktop = await runStrategy(url, "desktop");
    renderCard("desktop", desktop);
  } catch (e) {
    errorCard("Desktop audit failed", e.message);
    return;
  }

  try {
    const mobile = await runStrategy(url, "mobile");
    renderCard("mobile", mobile);
  } catch (e) {
    errorCard("Mobile audit failed", e.message);
  }
}

// Run automatically when popup loads
document.addEventListener("DOMContentLoaded", async () => {
  setHtml("<p>⏳ Starting automatic scan…</p>");
  await run();
});
