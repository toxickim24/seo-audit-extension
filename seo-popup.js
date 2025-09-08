document.getElementById("scanBtn").addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      func: seoAudit,
    },
    (results) => {
      const data = results[0].result;
      document.getElementById("results").innerHTML = `
        <p><strong>SEO Score:</strong> ${data.score}/100</p>
        <ul>${data.issues.map(i => `<li>${i}</li>`).join("") || "<li>No major issues ✅</li>"}</ul>
      `;
    }
  );
});

// Function Injected
function seoAudit() {
  let score = 100;
  let issues = [];

  // Title
  const title = document.querySelector("title");
  if (!title || title.textContent.length < 10 || title.textContent.length > 60) {
    score -= 10;
    issues.push("Title is missing, too short, or too long.");
  }

  // Meta Description
  const metaDesc = document.querySelector("meta[name='description']");
  if (!metaDesc || metaDesc.content.length < 50 || metaDesc.content.length > 160) {
    score -= 10;
    issues.push("Meta description missing, too short, or too long.");
  }

  // H1 Tag
  const h1s = document.querySelectorAll("h1");
  if (h1s.length === 0) {
    score -= 10;
    issues.push("No H1 tag found.");
  } else if (h1s.length > 1) {
    score -= 5;
    issues.push("Multiple H1 tags found (should be only one).");
  }

  // Images With Missing Alt
  const images = document.querySelectorAll("img");
  const missingAlts = [...images].filter(img => !img.alt).length;
  if (missingAlts > 0) {
    score -= 5;
    issues.push(`${missingAlts} image(s) missing alt attributes.`);
  }

  // Internal Links
  const links = [...document.querySelectorAll("a[href]")];
  const internalLinks = links.filter(link => link.hostname === location.hostname);
  const brokenLinks = internalLinks.filter(link => !link.href || link.href === "#");
  if (brokenLinks.length > 0) {
    score -= 5;
    issues.push(`${brokenLinks.length} broken internal link(s) found.`);
  }

  // Robots Check
  fetch(`${location.origin}/robots.txt`).then(res => {
    if (res.status !== 200) {
      score -= 5;
      issues.push("robots.txt file missing or inaccessible.");
    }
  });

  // Sitemap Check
  fetch(`${location.origin}/sitemap.xml`).then(res => {
    if (res.status !== 200) {
      score -= 5;
      issues.push("sitemap.xml file missing or inaccessible.");
    }
  });

  // HTTPS Check
  if (location.protocol !== "https:") {
    score -= 10;
    issues.push("Site is not using HTTPS.");
  }

  // Schema Markup Check
  const schema = document.querySelectorAll('script[type="application/ld+json"]');
  if (schema.length === 0) {
    score -= 5;
    issues.push("No schema markup (JSON-LD) found.");
  }

  // Canonical Tag
  const canonical = document.querySelector("link[rel='canonical']");
  if (!canonical) {
    score -= 5;
    issues.push("No canonical tag found.");
  }

  return { score, issues };
}