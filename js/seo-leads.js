const $leads = () => document.getElementById("leads-results");
function setLeadsHtml(html){ if ($leads()) $leads().innerHTML = html; }
const esc = s => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

function linkOrDash(url) {
  if (!url) return "-";
  return `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a>`;
}

// Normalize object keys for UI
function normalizeLeadShape(lead) {
  if (!lead) return null;
  if (lead.website) return lead; // already camelCase
  // convert from Sheet-style (if ever stored that way)
  return {
    website:  lead["Website"]   || "",
    name:     lead["Name"] || "",
    email:    lead["Email"]     || "",
    phone:    lead["Phone"]     || "",
    address:  lead["Address"]   || "",
    country:  lead["Country"]   || "",
    city:     lead["City"]      || "",
    zip:      lead["Zip"]       || "",
    facebook: lead["Facebook"]  || "",
    instagram:lead["Instagram"] || "",
    twitter:  lead["Twitter X"] || "",
    linkedin: lead["LinkedIn"]  || "",
    youtube:  lead["Youtube"]   || ""
  };
}

function renderLead(lead, statusMsg = "") {
  const l = normalizeLeadShape(lead);

  // 🔹 Save normalized lead for PDF use
  const origin = (() => { 
    try { const u=new URL(l.website); return `${u.protocol}//${u.hostname}`; } 
    catch { return l.website; } 
  })();
  chrome.storage.local.get("leads", (data) => {
    const leads = data.leads || {};
    leads[origin] = l; // overwrite with normalized data
    chrome.storage.local.set({ leads });
  });

  setLeadsHtml(`
    <div class="lead-card">
      <h4>Details</h4>
      ${statusMsg ? `<p style="color:#2563eb;">${esc(statusMsg)}</p>` : ""}
      <p><strong>Website:</strong> ${linkOrDash(l.website)}</p>
      <p><strong>Name:</strong> ${l.name || "-"}</p>
      <p><strong>Email:</strong> ${l.email ? `<a href="mailto:${esc(l.email)}">${esc(l.email)}</a>` : "-"}</p>
      <p><strong>Phone:</strong> ${l.phone ? `<a href="tel:${esc(l.phone)}">${esc(l.phone)}</a>` : "-"}</p>
      <p><strong>Address:</strong> ${l.address || "-"}</p>
      <p><strong>Country:</strong> ${l.country || "-"}</p>
      <p><strong>City:</strong> ${l.city || "-"}</p>
      <p><strong>Zip:</strong> ${l.zip || "-"}</p>
      <p><strong>Facebook:</strong> ${linkOrDash(l.facebook)}</p>
      <p><strong>Instagram:</strong> ${linkOrDash(l.instagram)}</p>
      <p><strong>Twitter/X:</strong> ${linkOrDash(l.twitter)}</p>
      <p><strong>LinkedIn:</strong> ${linkOrDash(l.linkedin)}</p>
      <p><strong>Youtube:</strong> ${linkOrDash(l.youtube)}</p>
      <button id="refreshLeads" style="
        margin-top:8px;
        padding:6px 12px;
        border:none;
        border-radius:6px;
        background:#059669;
        color:#fff;
        cursor:pointer;
      ">🔄 Refresh Data</button>
    </div>
  `);
  attachRefresh();
}

function renderError(msg) {
  setLeadsHtml(`
    <div class="lead-card">
      <h4>Captured Data</h4>
      <p style="color:red;">❌ ${esc(msg)}</p>
      <button id="refreshLeads" style="
        margin-top:8px;
        padding:6px 12px;
        border:none;
        border-radius:6px;
        background:#059669;
        color:#fff;
        cursor:pointer;
      ">🔄 Refresh Data</button>
    </div>
  `);
  attachRefresh();
}

function renderLoading(customMsg="⏳ Scanning current page…") {
  setLeadsHtml(`
    <div class="lead-card">
      <h4>Captured Data</h4>
      <p>${esc(customMsg)}</p>
      <button id="refreshLeads" style="
        margin-top:8px;
        padding:6px 12px;
        border:none;
        border-radius:6px;
        background:#059669;
        color:#fff;
        cursor:pointer;
      ">🔄 Refresh Data</button>
    </div>
  `);
  attachRefresh();
}

function attachRefresh() {
  const btn = document.getElementById("refreshLeads");
  if (btn) {
    btn.addEventListener("click", () => {
      renderLoading("⏳ Refreshing…");
      chrome.runtime.sendMessage({ type: "RUN_LEAD_CAPTURE" }, () => {
        setTimeout(() => loadLeadForCurrentSite(), 1500);
      });
    });
  }
}

function loadLeadForCurrentSite() {
  return new Promise((resolve) => {
    renderLoading();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs?.[0]?.url) {
        renderError("Could not detect active tab.");
        return resolve();
      }
      const origin = (() => { 
        try { const u=new URL(tabs[0].url); return `${u.protocol}//${u.hostname}`; } 
        catch { return tabs[0].url; } 
      })();

      chrome.storage.local.get("leads", (data) => {
        const leads = data.leads || {};
        const lead = leads[origin];
        if (lead) {
          renderLead(lead);
        } else {
          // trigger background capture if nothing yet
          chrome.runtime.sendMessage({ type: "RUN_LEAD_CAPTURE" }, () => {
            setTimeout(() => {
              chrome.storage.local.get("leads", (retry) => {
                const retryLeads = retry.leads || {};
                if (retryLeads[origin]) {
                  renderLead(retryLeads[origin], "✅ Captured on demand");
                } else {
                  renderError("No data captured yet for this site.");
                }
                resolve();
              });
            }, 1500);
          });
        }
      });
    });
  });
}

// 🚀 On popup open
document.addEventListener("DOMContentLoaded", () => {
  loadLeadForCurrentSite();
});
