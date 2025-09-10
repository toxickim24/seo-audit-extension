document.addEventListener("DOMContentLoaded", async () => {
  runSeoAudit();
});

async function runSeoAudit() {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      func: seoAudit,
    },
    (results) => {
      if (!results || !results[0]) return;
      const data = results[0].result;
      const resultsContainer = document.getElementById("seo-results");

      resultsContainer.innerHTML = `
        <div class="score-box">
          <p><strong>SEO On-page Score:</strong> ${data.score}/100</p>
        </div>

        <div class="result-section">
          <h4>Current URL</h4>
          <p>${data.url}</p>
        </div>

        <div class="result-section">
          <h4>Title</h4>
          <p>${data.title ? data.title : "Missing"}</p>
          <p>Length: ${data.titleLength} characters</p>
        </div>

        <div class="result-section">
          <h4>Description</h4>
          <p>${data.metaDesc ? data.metaDesc : "Missing"}</p>
          <p>Length: ${data.metaDescLength} characters</p>
        </div>

        <div class="result-section">
          <h4>Canonical</h4>
          <p>${data.canonical 
              ? `<a href="${data.canonical}" target="_blank">${data.canonical}</a>` 
              : "No canonical tag found"}</p>
        </div>

        <div class="result-section">
          <h4>Meta Robots</h4>
          <p>${data.indexable ? "Indexable" : "Noindex"}</p>
          <p>${data.metaRobots}</p>
        </div>

        <div class="result-section">
          <h4>Schema Markup</h4>
          <p>JSON-LD: ${data.schema.jsonLd}</p>
          <p>Microdata: ${data.schema.microdata}</p>
          <p>RDFa: ${data.schema.rdfa}</p>
        </div>

        <div class="result-section">
          <h4>Social Tags</h4>
          <p>Open Graph: ${data.openGraph ? "Found" : "Missing"}</p>
        </div>

        <div class="result-section">
          <h4>Other On-page Checks</h4>
          <p>Favicon: ${data.favicon ? "Found" : "Missing"}</p>
          <p>Viewport: ${data.viewport ? "Found" : "Missing"}</p>
          <p>Language Attribute: ${data.langAttr ? data.langAttr : "Missing"}</p>
        </div>

        <div class="result-section">
          <h4>Files</h4>
          <p>Robots.txt: <a href="${data.robotsTxt}" target="_blank">${data.robotsTxt}</a></p>
          <p>Sitemap.xml: <a href="${data.sitemap}" target="_blank">${data.sitemap}</a></p>
        </div>

        <div class="score-box">
          ${data.issues.length > 0 
          ? `<ul class="seo-mistake">${data.issues.map(i => `<li class="bad">${i}</li>`).join("")}</ul>` 
          : `<p class="good">No major issues found</p>`}
        </div>

        <div class="result-section-heading">
          <div class="left-content">
            <div class="counter-box">
              <h3>Links</h3>
              <p>${data.linkCount}</p>
            </div>
            <div class="counter-box">
              <h3>Images</h3>
              <p>${data.imageCount}</p>
            </div>
          </div>
          <div class="right-content">
            <div class="counter-box">
              <h3>H1</h3>
              <p>${data.h1Count}</p>
            </div>
            <div class="counter-box">
              <h3>H2</h3>
              <p>${data.h2Count}</p>
            </div>
            <div class="counter-box">
              <h3>H3</h3>
              <p>${data.h3Count}</p>
            </div>
            <div class="counter-box">
              <h3>H4</h3>
              <p>${data.h4Count}</p>
            </div>
            <div class="counter-box">
              <h3>H5</h3>
              <p>${data.h5Count}</p>
            </div>
            <div class="counter-box">
              <h3>H6</h3>
              <p>${data.h6Count}</p>
            </div>
          </div>
        </div>
      `;
    }
  );
}

function seoAudit() {
  let score = 100;
  let issues = [];

  // Current URL
  const url = location.href;

  // Title Check
  const title = document.querySelector("title")?.textContent || "";
  const titleLength = title.length;
  if (!title || titleLength < 10 || titleLength > 60) {
    score -= 10;
    issues.push("Title is missing, too short, or too long.");
  }

  // Meta Description Check
  const metaDesc = document.querySelector("meta[name='description']")?.content || "";
  const metaDescLength = metaDesc.length;
  if (!metaDesc || metaDescLength < 50 || metaDescLength > 160) {
    score -= 10;
    issues.push("Meta description missing, too short, or too long.");
  }

  // Canonical Check
  const canonical = document.querySelector("link[rel='canonical']")?.href || "";
  if (!canonical) {
    score -= 5;
    issues.push("No canonical tag found.");
  }

  // Meta Robots
  const metaRobots = document.querySelector("meta[name='robots']")?.content || "index,follow";
  const indexable = !/noindex/i.test(metaRobots);

  // Headings Check
  const h1s = document.querySelectorAll("h1");
  const h2s = document.querySelectorAll("h2");
  const h3s = document.querySelectorAll("h3");
  const h4s = document.querySelectorAll("h4");
  const h5s = document.querySelectorAll("h5");
  const h6s = document.querySelectorAll("h6");

  if (h1s.length === 0) {
    score -= 10;
    issues.push("No H1 tag found.");
  } else if (h1s.length > 1) {
    score -= 5;
    issues.push("Multiple H1 tags found.");
  }

  // Images Check
  const images = document.querySelectorAll("img");
  const missingAlts = [...images].filter(img => !img.alt).length;
  if (missingAlts > 0) {
    score -= 5;
    issues.push(`${missingAlts} image(s) missing alt attributes.`);
  }

  // Links Check
  const links = [...document.querySelectorAll("a[href]")];
  const brokenLinks = links.filter(link => !link.href || link.href === "#");
  if (brokenLinks.length > 0) {
    score -= 5;
    issues.push(`${brokenLinks.length} broken link(s) found.`);
  }

  // Schema Check
  const jsonLd = document.querySelectorAll("script[type='application/ld+json']").length;
  const microdata = document.querySelectorAll("[itemscope]").length;
  const rdfa = document.querySelectorAll("[typeof]").length;
  if (jsonLd === 0 && microdata === 0 && rdfa === 0) {
    score -= 5;
    issues.push("No schema markup found.");
  }

  // Open Graph Check
  const openGraph = document.querySelector("meta[property^='og:']") ? true : false;
  if (!openGraph) {
    score -= 3;
    issues.push("Open Graph tags missing.");
  }

  // Favicon Check
  const favicon = document.querySelector("link[rel*='icon']")?.href || "";
  if (!favicon) {
    score -= 2;
    issues.push("Favicon missing.");
  }

  // Responsive Check
  const viewport = document.querySelector("meta[name='viewport']")?.content || "";
  if (!viewport) {
    score -= 2;
    issues.push("Viewport meta tag missing.");
  }

  // HTML lang attribute
  const langAttr = document.documentElement.getAttribute("lang") || "";
  if (!langAttr) {
    score -= 2;
    issues.push("Missing HTML attribute.");
  }

  // Robots & Sitemap
  const robotsTxt = location.origin + "/robots.txt";
  const sitemap = location.origin + "/sitemap.xml";

  return {
    score,
    issues,
    url,
    title,
    titleLength,
    metaDesc,
    metaDescLength,
    canonical,
    metaRobots,
    indexable,
    h1Count: h1s.length,
    h2Count: h2s.length,
    h3Count: h3s.length,
    h4Count: h4s.length,
    h5Count: h5s.length,
    h6Count: h6s.length,
    linkCount: links.length,
    imageCount: images.length,
    missingAlts,
    robotsTxt,
    sitemap,
    schema: { jsonLd, microdata, rdfa },
    openGraph,
    favicon,
    viewport,
    langAttr
  };
}