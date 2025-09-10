// js/seo-leads.js — popup UI for captured leads

const $leads = () => document.getElementById("leads-results");
function setLeadsHtml(html){ if ($leads()) $leads().innerHTML = html; }
const esc = s => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

function linkOrDash(url) {
  if (!url) return "-";
  return `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a>`;
}

function renderLead(lead, statusMsg = "") {
  setLeadsHtml(`
    <div class="lead-card">
      <h4>Captured Lead</h4>
      ${statusMsg ? `<p style="color:#2563eb;">${esc(statusMsg)}</p>` : ""}
      <p><strong>Website:</strong> ${linkOrDash(lead.website)}</p>
      <p><strong>Name:</strong> ${lead.name || "-"}</p>
      <p><strong>Email:</strong> ${lead.email ? `<a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a>` : "-"}</p>
      <p><strong>Phone:</strong> ${lead.phone ? `<a href="tel:${esc(lead.phone)}">${esc(lead.phone)}</a>` : "-"}</p>
      <p><strong>Address:</strong> ${lead.address || "-"}</p>
      <p><strong>Country:</strong> ${lead.country || "-"}</p>
      <p><strong>City:</strong> ${lead.city || "-"}</p>
      <p><strong>Zip:</strong> ${lead.zip || "-"}</p>
      <p><strong>Facebook:</strong> ${linkOrDash(lead.facebook)}</p>
      <p><strong>Instagram:</strong> ${linkOrDash(lead.instagram)}</p>
      <p><strong>Twitter/X:</strong> ${linkOrDash(lead.twitter)}</p>
      <p><strong>LinkedIn:</strong> ${linkOrDash(lead.linkedin)}</p>
      <p><strong>Youtube:</strong> ${linkOrDash(lead.youtube)}</p>
      <button id="refreshLeads" style="
        margin-top:8px;
        padding:6px 12px;
        border:none;
        border-radius:6px;
        background:#059669;
        color:#fff;
        cursor:pointer;
      ">🔄 Refresh Leads</button>
    </div>
  `);
  attachRefresh();
}

function renderError(msg) {
  setLeadsHtml(`
    <div class="lead-card">
      <h4>Captured Lead</h4>
      <p style="color:red;">❌ ${esc(msg)}</p>
      <button id="refreshLeads" style="
        margin-top:8px;
        padding:6px 12px;
        border:none;
        border-radius:6px;
        background:#059669;
        color:#fff;
        cursor:pointer;
      ">🔄 Refresh Leads</button>
    </div>
  `);
  attachRefresh();
}

function renderLoading() {
  setLeadsHtml(`
    <div class="lead-card">
      <h4>Captured Lead</h4>
      <p>⏳ Scanning current page for leads…</p>
      <button id="refreshLeads" style="
        margin-top:8px;
        padding:6px 12px;
        border:none;
        border-radius:6px;
        background:#059669;
        color:#fff;
        cursor:pointer;
      ">🔄 Refresh Leads</button>
    </div>
  `);
  attachRefresh();
}

function attachRefresh() {
  const btn = document.getElementById("refreshLeads");
  if (btn) {
    btn.addEventListener("click", () => {
      btn.disabled = true;
      btn.textContent = "⏳ Refreshing…";
      chrome.runtime.sendMessage({ type: "RUN_LEAD_CAPTURE" }, () => {
        loadLeadForCurrentSite().finally(() => {
          btn.disabled = false;
          btn.textContent = "🔄 Refresh Leads";
        });
      });
    });
  }
}

function loadLeadForCurrentSite() {
  return new Promise((resolve) => {
    renderLoading();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]?.url) {
        renderError("Could not detect active tab.");
        return resolve();
      }
      const origin = (() => { 
        try { const u=new URL(tabs[0].url); return `${u.protocol}//${u.hostname}`; } 
        catch { return tabs[0].url; } 
      })();
      chrome.storage.local.get("leads", (data) => {
        const leads = data.leads || {};
        if (leads[origin]) {
          renderLead(leads[origin]);
        } else {
          renderError("No leads captured yet for this site.");
        }
        resolve();
      });
    });
  });
}

// 🚀 Show current site's lead on popup open
document.addEventListener("DOMContentLoaded", () => {
  loadLeadForCurrentSite();
});
