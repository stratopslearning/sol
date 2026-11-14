const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'seo-audit-teachwithsol-com-2026-10-28.pdf');
const doc = new PDFDocument({ size: 'LETTER', margins: { top: 72, bottom: 72, left: 72, right: 72 } });
const stream = fs.createWriteStream(OUT);
doc.pipe(stream);

const NAVY = '#1B2A4A';
const BLUE = '#2563EB';
const GREEN = '#16A34A';
const AMBER = '#D97706';
const RED = '#DC2626';
const ORANGE = '#EA580C';
const GRAY = '#94A3B8';
const DARK = '#1E293B';

function cover() {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(NAVY);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(36)
    .text('teachwithsol.com', 72, 260, { align: 'center' });
  doc.fillColor('#93C5FD').font('Helvetica').fontSize(18)
    .text('SEO / GEO / AEO Audit Report', { align: 'center' });
  doc.moveDown(0.6);
  doc.fillColor('#FFFFFF').fontSize(11).text('FULL AUDIT', { align: 'center' });
  doc.moveDown(1.5);

  const boxes = [
    { label: 'SEO', score: '6', status: 'On Track', color: AMBER },
    { label: 'GEO', score: '8', status: 'Strong', color: GREEN },
    { label: 'AEO', score: '7', status: 'On Track', color: AMBER },
  ];
  const boxW = 140;
  const gap = 16;
  const total = boxes.length * boxW + (boxes.length - 1) * gap;
  let x = (doc.page.width - total) / 2;
  const y = doc.y;
  boxes.forEach((b) => {
    doc.rect(x, y, boxW, 100).fill(b.color);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10)
      .text(b.label, x, y + 14, { width: boxW, align: 'center' });
    doc.fontSize(36).text(b.score, x, y + 32, { width: boxW, align: 'center' });
    doc.font('Helvetica-Oblique').fontSize(9)
      .text(b.status, x, y + 78, { width: boxW, align: 'center' });
    x += boxW + gap;
  });

  doc.fillColor(GRAY).font('Helvetica').fontSize(9)
    .text('Audit date: October 28, 2026', 72, 680, { align: 'center' })
    .text('Claude Skill and Plugin by Alex Labat', { align: 'center' });
}

function headerFooter() {
  doc.on('pageAdded', () => {
    doc.save();
    doc.fillColor(DARK).font('Helvetica').fontSize(9)
      .text('teachwithsol.com', 72, 36, { continued: true })
      .text('SEO / GEO / AEO Audit Report', { align: 'right' });
    doc.moveTo(72, 50).lineTo(doc.page.width - 72, 50).strokeColor(NAVY).lineWidth(1.5).stroke();
    doc.restore();
  });
}

function h1(t) {
  doc.moveDown(0.8);
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(20).text(t);
  doc.moveDown(0.3);
}
function h2(t) {
  doc.moveDown(0.5);
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(14).text(t);
  doc.moveDown(0.2);
}
function body(t) {
  doc.fillColor(DARK).font('Helvetica').fontSize(10).text(t, { align: 'left', lineGap: 2 });
  doc.moveDown(0.35);
}
function muted(t) {
  doc.fillColor(BLUE).font('Helvetica-Oblique').fontSize(10).text(t);
  doc.moveDown(0.3);
}

function ensureSpace(need = 120) {
  if (doc.y > doc.page.height - 72 - need) doc.addPage();
}

function signalRows(rows) {
  rows.forEach(([signal, finding, status]) => {
    ensureSpace(90);
    const statusColor = status === 'Good' ? GREEN : status === 'Missing' ? RED : AMBER;
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9).text(signal);
    doc.font('Helvetica').fontSize(9).fillColor(DARK).text(finding, { width: 420 });
    const y = doc.y - 12;
    doc.rect(doc.page.width - 72 - 90, y, 90, 14).fill(statusColor);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8)
      .text(status, doc.page.width - 72 - 90, y + 3, { width: 90, align: 'center' });
    doc.moveDown(0.55);
  });
}

cover();
headerFooter();
doc.addPage();

h1('Executive Summary');
doc.rect(72, doc.y, doc.page.width - 144, 145).fill('#EFF6FF');
const boxY = doc.y + 8;
doc.fillColor(DARK).font('Helvetica').fontSize(9.5)
  .text('teachwithsol.com has unusually strong GEO foundations (llms.txt, markdown docs, FAQ/Org/SoftwareApplication schema, GPTBot allows). SEO is held back by sitewide Open Graph inheritance — docs/trust pages still advertise homepage title/description/url — plus a short ~88-char meta description and empty hero image alts. Urgent fix: page-unique title/description/OG on docs and trust hosts. Opportunity: question-led HowTo/Speakable blocks on existing FAQ and procedural docs.', 80, boxY, { width: doc.page.width - 160, lineGap: 2 });
doc.y = boxY + 150;

ensureSpace(100);
body('Scores: SEO 6/10 (On Track) · GEO 8/10 (Strong) · AEO 7/10 (On Track) · Combined 21/30');

h1('Pages Audited');
body('18 resources across www, docs, and trust (Privacy/Terms/DMCA skipped). Includes homepage, 11 docs guides, docs index, security, llms.txt (site+docs), robots.txt, sitemap.xml.');

h1('SEO Analysis');
muted('Score: 6/10 — On Track');
h2('Technical On-Page');
signalRows([
  ['Title tag', 'Homepage brand title strong; live docs/security still surface same brand title via OG/title fields.', 'Needs Attention'],
  ['Meta description', 'Observed ~88 chars; below 150–160 ideal; lacks CTA.', 'Needs Attention'],
  ['Heading hierarchy', 'Singular H1 on homepage and docs; logical H2s.', 'Good'],
  ['URL / Canonical / Robots / Viewport', 'Clean multi-host URLs; self-canonicals; index,follow; mobile viewport present.', 'Good'],
  ['Image alt text', 'LoopSteps descriptive; Hero/FAQ/Footer paintings use alt="".', 'Needs Attention'],
  ['Open Graph / Twitter', 'Homepage complete. Root layout hardcodes homepage OG onto all pages.', 'Missing'],
]);
h2('Content Quality');
signalRows([
  ['Depth', 'Marketing concise; docs substantial. No blog in sitemap/nav.', 'Needs Attention'],
  ['Keywords / readability', 'Clear entity language; tables and steps; scannable.', 'Good'],
  ['Freshness', 'Security dated Oct 26, 2026; marketing lacks visible dates.', 'Needs Attention'],
]);
h2('Structured Data');
signalRows([
  ['Presence', 'Org + WebSite + SoftwareApplication + FAQPage (8); Docs TechArticle.', 'Good'],
  ['Completeness', 'No sameAs, BreadcrumbList, HowTo, or Speakable.', 'Needs Attention'],
]);

doc.addPage();
h1('GEO Analysis');
muted('Score: 8/10 — Strong');
body('GEO optimizes for AI search engines that synthesize answers and cite sources.');
h2('E-E-A-T');
signalRows([
  ['Authors / Team', 'Organization-only authorship; no named people page.', 'Missing'],
  ['About', 'about-sol is product/entity docs, not company credentials.', 'Needs Attention'],
  ['Contact / Trust', 'Demo calendar only; strong FERPA/HECVAT/ZDR language; no testimonials.', 'Needs Attention'],
]);
h2('AI Synthesis Content');
signalRows([
  ['Factual density / claims', 'High: roles, codes, LTI caveat, MCP; clear “SOL is…” definition.', 'Good'],
  ['Entity clarity', 'Brand consistent, but About/onboarding still list strat-ops.net as live app.', 'Needs Attention'],
  ['Originality', 'Instructor-in-control POV; not LMS replacement / not generic chatbot.', 'Good'],
]);
h2('Technical GEO');
signalRows([
  ['llms.txt + markdown', 'Site + docs indexes with per-guide .md — best-in-class early GEO.', 'Good'],
  ['AI crawlers', 'GPTBot and Google-Extended explicitly allowed.', 'Good'],
  ['sameAs / social', 'No social profile links in footer or Organization schema.', 'Missing'],
  ['Sitemap host', 'robots Sitemap points at app host while Host is www.', 'Needs Attention'],
]);

h1('AEO Analysis');
muted('Score: 7/10 — On Track');
h2('Snippet eligibility');
signalRows([
  ['Definitions / lists / tables', 'Strong “X is…” answers; teaching-loop lists; comparison tables.', 'Good'],
  ['FAQ schema', 'FAQPage with 8 real product Q&As.', 'Good'],
  ['HowTo / Speakable', 'Procedural docs lack HowTo JSON-LD; no SpeakableSpecification.', 'Missing'],
  ['Question H2s', 'Homepage FAQ questions strong; docs H2s mostly topic labels.', 'Needs Attention'],
]);

doc.addPage();
h1('Priority Recommendations');
const recs = [
  [RED, 'Critical', 'Override Open Graph + Twitter per page on docs/trust URLs.', 'SEO'],
  [RED, 'Critical', 'Verify live title/meta match page-specific metadata in production.', 'SEO'],
  [ORANGE, 'High', 'Expand meta descriptions to 150–160 chars with keyword + CTA.', 'SEO'],
  [ORANGE, 'High', 'Replace strat-ops.net live-app URLs with teachwithsol/app hosts.', 'GEO'],
  [ORANGE, 'High', 'Add Organization sameAs + Team/Company E-E-A-T signals.', 'GEO'],
  [AMBER, 'Medium', 'Add HowTo JSON-LD + Speakable on FAQ/onboarding/LTI.', 'AEO'],
  [AMBER, 'Medium', 'Rewrite key docs H2s as questions with 40–60 word answers.', 'AEO'],
  [AMBER, 'Medium', 'Point robots Sitemap to www.teachwithsol.com/sitemap.xml.', 'SEO'],
  [GREEN, 'Quick Win', 'Add meaningful alt text to primary marketing images.', 'SEO'],
  [GREEN, 'Quick Win', 'Add public contact email on Security/Footer.', 'GEO'],
];
recs.forEach(([color, pri, issue, dim]) => {
  ensureSpace(40);
  doc.rect(72, doc.y, 70, 14).fill(color);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8)
    .text(pri, 72, doc.y + 3, { width: 70, align: 'center' });
  doc.fillColor(DARK).font('Helvetica').fontSize(9)
    .text(`[${dim}] ${issue}`, 150, doc.y - 11, { width: 370 });
  doc.moveDown(0.7);
});

h1("What's Working Well");
[
  'llms.txt + per-doc .md mirrors with citeable summaries.',
  'Homepage Org + WebSite + SoftwareApplication + FAQPage schema.',
  'GPTBot / Google-Extended allows with dashboard/API disallow.',
  'Multi-host www/docs/trust with correct self-canonicals and 17-URL sitemap.',
  'About SOL + Security pages dense and institutionally credible.',
  'Docs TechArticle schema and coherent internal linking.',
].forEach((s) => {
  ensureSpace(36);
  doc.rect(72, doc.y, doc.page.width - 144, 28).fill('#F0FDF4');
  doc.fillColor(DARK).font('Helvetica').fontSize(9).text(s, 80, doc.y + 8, { width: doc.page.width - 160 });
  doc.moveDown(1.4);
});

h1('Glossary');
h2('SEO');
body('Traditional optimization for Google/Bing rankings: titles, metas, headings, crawlability, structured data.');
h2('GEO');
body('Optimization for AI answer engines that synthesize and cite sources — entities, facts, llms.txt, AI crawler access.');
h2('AEO');
body('Optimization for featured snippets and voice answers — FAQ/HowTo schema, question headings, concise extractable answers.');

doc.fillColor(GRAY).font('Helvetica').fontSize(8)
  .text('Claude Skill and Plugin by Alex Labat  ·  Full Audit · October 28, 2026', 72, doc.page.height - 48, { align: 'center' });

doc.end();
stream.on('finish', () => {
  console.log('PDF written:', OUT, fs.statSync(OUT).size, 'bytes');
});
