const $speed = () => document.getElementById("speed-results");
function setHtml(html){ if ($speed()) $speed().innerHTML = html; }

function pill(n){
  if(n==null || Number.isNaN(n)) return "N/A";
  const v = Math.round(n);
  const c = v>=90 ? "#16a34a" : v>=50 ? "#f59e0b" : "#dc2626";
  return `<span style="padding:2px 6px;border-radius:6px;background:${c};color:#fff;">${v}</span>`;
}

function renderCard(title, data){
  if (!data) {
    return `<div class="speed-card"><h4>⚡ ${title}</h4><p style="color:red;">❌ No data available</p></div>`;
  }
  return `<div class="speed-card">
    <h4>⚡ ${title}</h4>
    <p><strong>Performance:</strong> ${pill(data.performanceScore)}</p>
    <ul style="list-style:none;padding:0;margin:0;">
      <li>FCP: ${data.fcp || "N/A"}</li>
      <li>LCP: ${data.lcp || "N/A"}</li>
      <li>CLS: ${data.cls || "N/A"}</li>
      <li>TBT: ${data.tbt || "N/A"}</li>
    </ul>
  </div>`;
}

function renderResults(audit){
  if (!audit) {
    setHtml("<p>⚠️ No audit results available yet.</p>");
    return;
  }
  const last = new Date(audit.timestamp).toLocaleString();

  setHtml(`
    <div class="speed-card">
      <h4>⚡ PageSpeed Audit</h4>
      <p><code>${audit.url}</code></p>
      <p style="font-size:12px;opacity:.75;">Last scanned: ${last}</p>
      ${renderCard("Desktop", audit.desktop)}
      ${renderCard("Mobile", audit.mobile)}
      <button id="refreshAudit" style="
        margin-top:10px;
        padding:6px 12px;
        border:none;
        border-radius:6px;
        background:#2E86DE;
        color:#fff;
        cursor:pointer;
      ">🔄 Refresh Audit</button>
    </div>
  `);

  // ✅ re-bind refresh button every render
  const btn = document.getElementById("refreshAudit");
  if (btn) {
    btn.addEventListener("click", () => {
      // disable while running
      btn.textContent = "⏳ Refreshing…";
      btn.disabled = true;

      chrome.runtime.sendMessage({ type: "RUN_PAGESPEED", url: audit.url }, (response) => {
        if (response.success) {
          renderResults(response.result);
        } else {
          setHtml(`<p style="color:red;">❌ Audit failed: ${response.error}</p>`);
        }
      });
    });
  }
}

// 🚀 Load per-domain results on popup open
document.addEventListener("DOMContentLoaded", () => {
  setHtml("<p>⏳ Loading latest audit…</p>");
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]?.url) {
      setHtml("<p style='color:red;'>❌ Could not detect active tab.</p>");
      return;
    }
    const origin = new URL(tabs[0].url).origin;

    chrome.storage.local.get("audits", (data) => {
      const audits = data.audits || {};
      if (audits[origin]) {
        renderResults(audits[origin]);
      } else {
        chrome.runtime.sendMessage({ type: "RUN_PAGESPEED", url: origin }, (response) => {
          if (response.success) {
            renderResults(response.result);
          } else {
            setHtml(`<p style="color:red;">❌ Audit failed: ${response.error}</p>`);
          }
        });
      }
    });
  });
});
