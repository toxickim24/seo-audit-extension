# 🚀 SEO Audit Tool

A lightweight SEO auditing application designed to analyze websites, generate instant SEO scores, and produce branded PDF reports. Built with **Vanilla JS + PHP**, with future adaptability into a **Chrome Extension** and **Embeddable Widget**.

## ✨ Features

- 🔎 **SEO Audit**: Analyze on-page elements (titles, meta descriptions, headings, alt tags, links, schema markup, etc.).
- ⚙️ **Technical Checks**: Robots.txt, sitemap, HTTPS, indexability, Core Web Vitals (via PageSpeed & CrUX APIs).
- 📊 **SEO Scoring**: Returns an overall score + detailed breakdown.
- 📄 **PDF Report**: Generate easy-to-read branded reports.
- 📥 **Lead Capture**: Collect name + email before sending reports.
- 🎨 **White-label Ready**: Configurable branding (logo, color scheme, PDF header/footer).
- 🔌 **API-first design**: Core logic exposed via API for scalability.

## 🏗️ Project Scope

### Phase 1 (MVP - Web App)
- Build core audit functionality as a **standalone web app** (PHP + Vanilla JS).
- Generate and email PDF reports.
- Store leads (MySQL / Supabase).

### Phase 2 (Future)
- Adapt into a **Chrome Extension**.
- Create **Embeddable Widget** for partner sites.
- Enhance white-label capabilities for multiple brands.

## 📂 Folder Structure

```
seo-audit-tool/
│── api/                # Backend API (PHP)
│── frontend/           # Vanilla JS frontend
│── pdf/                # PDF templates & generator
│── config/             # Branding & environment configs
│── docs/               # Documentation & guides
│── README.md           # Project overview
```

## ⚡ Tech Stack

- **Frontend**: Vanilla JavaScript, HTML, CSS (Tailwind optional)
- **Backend**: PHP (API endpoints)
- **Database**: MySQL / Supabase
- **Reports**: jsPDF / PDFKit / Puppeteer (for HTML → PDF)
- **Email**: PHPMailer / SendGrid
- **APIs**: Google PageSpeed Insights, CrUX, Lighthouse

## 📅 Timeline

**Day 1** – Research + setup repo + basic audit API skeleton  
**Day 2** – Implement on-page checks + scoring logic  
**Day 3** – Technical audit (PageSpeed, CrUX integration)  
**Day 4** – PDF generation + email delivery + lead capture  
**Day 5** – Branding configs + polish + working demo  

## 📝 Reporting

- **SOD (Start of Day)**: Share daily plan
- **EOD (End of Day)**: Share progress + blockers
- Reports submitted to **Jay (CC Thomas)**

## 🔑 Setup Instructions

1. Clone this repo:
   ```bash
   git clone https://github.com/your-org/seo-audit-tool.git
   ```
2. Install dependencies (PHP & JS libraries).
3. Configure `config/app.env` with:
   - API keys (PageSpeed, CrUX)
   - Database credentials
   - Branding settings
4. Run local server and test:
   ```bash
   php -S localhost:8000
   ```
