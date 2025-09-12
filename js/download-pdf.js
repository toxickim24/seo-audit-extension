function generatePdfFromData() {
  if (!latestSeoData) {
    alert("No SEO data available yet. Please run the audit first.");
    return;
  }

  const d = latestSeoData;

  function pillText(n) {
    if (n == null || Number.isNaN(n)) return "N/A";
    const v = Math.round(n);
    return `${v}/100`;
  }

  // Get PageSpeed + Leads
  chrome.storage.local.get(["audits", "leads"], (data) => {
    const audits = data.audits || {};
    const leads = data.leads || {};
    const origin = d.url ? new URL(d.url).origin : null;

    const audit = origin && audits[origin] ? audits[origin] : null;
    const lead = origin && leads[origin] ? leads[origin] : null;

    let desktopHtml = "<p>No desktop data available.</p>";
    let mobileHtml = "<p>No mobile data available.</p>";
    let leadHtml = "<p>No lead data available.</p>";

    if (audit?.desktop) {
      desktopHtml = `
        <p><strong>Performance:</strong> ${pillText(audit.desktop.performanceScore)}</p>
        <ul>
          <li>FCP: ${audit.desktop.fcp || "N/A"}</li>
          <li>LCP: ${audit.desktop.lcp || "N/A"}</li>
          <li>CLS: ${audit.desktop.cls || "N/A"}</li>
          <li>TBT: ${audit.desktop.tbt || "N/A"}</li>
        </ul>
      `;
    }

    if (audit?.mobile) {
      mobileHtml = `
        <p><strong>Performance:</strong> ${pillText(audit.mobile.performanceScore)}</p>
        <ul>
          <li>FCP: ${audit.mobile.fcp || "N/A"}</li>
          <li>LCP: ${audit.mobile.lcp || "N/A"}</li>
          <li>CLS: ${audit.mobile.cls || "N/A"}</li>
          <li>TBT: ${audit.mobile.tbt || "N/A"}</li>
        </ul>
      `;
    }

    if (lead) {
      leadHtml = `
        <p><strong>Website:</strong> ${lead.website || "-"}</p>
        <p><strong>Name:</strong> ${lead.name || "-"}</p>
        <p><strong>Email:</strong> ${lead.email || "-"}</p>
        <p><strong>Phone:</strong> ${lead.phone || "-"}</p>
        <p><strong>Address:</strong> ${lead.address || "-"}</p>
        <p><strong>Country:</strong> ${lead.country || "-"}</p>
        <p><strong>City:</strong> ${lead.city || "-"}</p>
        <p><strong>Zip:</strong> ${lead.zip || "-"}</p>
        <p><strong>Facebook:</strong> ${lead.facebook || "-"}</p>
        <p><strong>Instagram:</strong> ${lead.instagram || "-"}</p>
        <p><strong>Twitter/X:</strong> ${lead.twitter || "-"}</p>
        <p><strong>LinkedIn:</strong> ${lead.linkedin || "-"}</p>
        <p><strong>Youtube:</strong> ${lead.youtube || "-"}</p>
      `;
    }

    const html = `
      <h2>SEO Report</h2>
      <p><strong>Score:</strong> ${d.score}/100</p>
      <p><strong>URL:</strong> ${d.url}</p>
      <p><strong>Title:</strong> ${d.title} (${d.titleLength} chars)</p>
      <p><strong>Description:</strong> ${d.metaDesc} (${d.metaDescLength} chars)</p>
      <p><strong>Canonical:</strong> ${d.canonical || "Missing"}</p>
      <p><strong>Meta Robots:</strong> ${d.metaRobots}</p>
      <p><strong>Indexable:</strong> ${d.indexable ? "Yes" : "No"}</p>

      <h3>Other Checks</h3>
      <p>Open Graph: ${d.openGraph ? "Found" : "Missing"}</p>
      <p>Favicon: ${d.favicon ? "Found" : "Missing"}</p>
      <p>Viewport: ${d.viewport ? "Found" : "Missing"}</p>
      <p>Language Attribute: ${d.langAttr || "Missing"}</p>
      
      <h3>Issues</h3>
      <ul>
        ${d.issues.map(i => `<li>${i}</li>`).join("")}
      </ul>

      <h3>Files</h3>
      <p>Robots.txt: ${d.robotsTxt}</p>
      <p>Sitemap.xml: ${d.sitemap}</p>

      <h3>Headings Count</h3>
      <p>H1: ${d.h1Count}, H2: ${d.h2Count}, H3: ${d.h3Count}, H4: ${d.h4Count}, H5: ${d.h5Count}, H6: ${d.h6Count}</p>

      <div class="page-break"></div>

      <h2>PageSpeed Insights</h2>
      <h3>Desktop</h3>
      ${desktopHtml}

      <h3>Mobile</h3>
      ${mobileHtml}

      <div class="page-break"></div>

      <h2>Lead Data</h2>
      ${leadHtml}
    `;

    html2pdf().set({
      margin: 10,
      filename: "seo-report.pdf",
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    }).from(html).save();
  });
}

if (!window.__pdfListenerAdded) {
  const btn = document.getElementById("downloadPdfBtn");
  if (btn) {
    btn.addEventListener("click", generatePdfFromData);
    window.__pdfListenerAdded = true;
  }
}