const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak,
} = require('docx');
const fs = require('fs');
const path = require('path');

const DOMAIN = 'teachwithsol.com';
const DATE = '2026-10-28';
const OUT = path.join(__dirname, `seo-audit-teachwithsol-com-${DATE}.docx`);

const COLORS = {
  navy: '1B2A4A',
  accent: '2563EB',
  green: '16A34A',
  amber: 'D97706',
  red: 'DC2626',
  orange: 'EA580C',
  lightGray: 'F8F9FA',
  border: 'E2E8F0',
  dark: '1E293B',
  lightBlue: 'EFF6FF',
  lightGreen: 'F0FDF4',
  white: 'FFFFFF',
  lightBlueText: '93C5FD',
  gray: '94A3B8',
};

const PAGE_W = 12240;
const PAGE_H = 15840;
const MARGIN = 1440;
const CONTENT_W = 9360;

const noBorder = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};
const thinBorder = {
  top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
  left: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
  right: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
};

function scoreColor(n) {
  if (n >= 8) return COLORS.green;
  if (n >= 5) return COLORS.amber;
  return COLORS.red;
}
function scoreStatus(n) {
  if (n >= 8) return 'Strong';
  if (n >= 6) return 'On Track';
  return 'Needs Work';
}

function p(text, opts = {}) {
  const {
    size = 22, bold = false, color = COLORS.dark, italics = false,
    align = AlignmentType.LEFT, spaceBefore = 0, spaceAfter = 120,
    heading, font = 'Arial',
  } = opts;
  return new Paragraph({
    heading,
    alignment: align,
    spacing: { before: spaceBefore, after: spaceAfter },
    children: [
      new TextRun({
        text: text || '',
        font,
        size,
        bold,
        italics,
        color,
      }),
    ],
  });
}

function runsPara(runs, opts = {}) {
  const { align = AlignmentType.LEFT, spaceBefore = 0, spaceAfter = 120, heading } = opts;
  return new Paragraph({
    heading,
    alignment: align,
    spacing: { before: spaceBefore, after: spaceAfter },
    children: runs.map((r) => new TextRun({
      text: r.text || '',
      font: 'Arial',
      size: r.size ?? 22,
      bold: r.bold,
      italics: r.italics,
      color: r.color || COLORS.dark,
    })),
  });
}

function cell(text, opts = {}) {
  const {
    width = 2340, fill, color = COLORS.dark, bold = false, size = 20,
    align = AlignmentType.LEFT, italics = false, margins = { top: 80, bottom: 80, left: 100, right: 100 },
    borders = thinBorder, vAlign = VerticalAlign.CENTER, paragraphs,
  } = opts;
  const kids = paragraphs || [
    new Paragraph({
      alignment: align,
      children: [
        new TextRun({ text: String(text ?? ''), font: 'Arial', size, bold, italics, color }),
      ],
    }),
  ];
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders,
    shading: fill ? { type: ShadingType.CLEAR, fill } : undefined,
    verticalAlign: vAlign,
    margins,
    children: kids,
  });
}

function statusCell(label, width = 1600) {
  const map = {
    Good: COLORS.green,
    'Needs Attention': COLORS.amber,
    Missing: COLORS.red,
  };
  return cell(label, {
    width,
    fill: map[label] || COLORS.amber,
    color: COLORS.white,
    bold: true,
    size: 18,
    align: AlignmentType.CENTER,
  });
}

function priorityCell(label, width = 1400) {
  const map = {
    Critical: COLORS.red,
    High: COLORS.orange,
    Medium: COLORS.amber,
    'Quick Win': COLORS.green,
  };
  return cell(label, {
    width,
    fill: map[label] || COLORS.amber,
    color: COLORS.white,
    bold: true,
    size: 18,
    align: AlignmentType.CENTER,
  });
}

function h1(text) {
  return p(text, { size: 48, bold: true, heading: HeadingLevel.HEADING_1, spaceBefore: 240, spaceAfter: 200 });
}
function h2(text) {
  return p(text, { size: 36, bold: true, heading: HeadingLevel.HEADING_2, spaceBefore: 280, spaceAfter: 140 });
}
function h3(text) {
  return p(text, { size: 28, bold: true, heading: HeadingLevel.HEADING_3, spaceBefore: 200, spaceAfter: 100 });
}
function body(text, opts = {}) {
  return p(text, { size: 22, spaceAfter: 140, ...opts });
}

function signalTable(rows) {
  const colW = [2400, 5360, 1600];
  const header = new TableRow({
    children: [
      cell('Signal', { width: colW[0], bold: true, fill: COLORS.navy, color: COLORS.white, size: 18 }),
      cell('Finding', { width: colW[1], bold: true, fill: COLORS.navy, color: COLORS.white, size: 18 }),
      cell('Status', { width: colW[2], bold: true, fill: COLORS.navy, color: COLORS.white, size: 18, align: AlignmentType.CENTER }),
    ],
  });
  const data = rows.map((r, i) => new TableRow({
    children: [
      cell(r[0], { width: colW[0], bold: true, size: 18, fill: i % 2 ? COLORS.lightGray : COLORS.white }),
      cell(r[1], { width: colW[1], size: 18, fill: i % 2 ? COLORS.lightGray : COLORS.white }),
      statusCell(r[2], colW[2]),
    ],
  }));
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: colW,
    rows: [header, ...data],
  });
}

const SEO_SCORE = 6;
const GEO_SCORE = 8;
const AEO_SCORE = 7;

// Cover score cells
function coverScoreCell(label, score, width) {
  const fill = scoreColor(score);
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: noBorder,
    shading: { type: ShadingType.CLEAR, fill },
    margins: { top: 200, bottom: 200, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [new TextRun({ text: label, font: 'Arial', size: 20, bold: true, color: COLORS.white })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [new TextRun({ text: String(score), font: 'Arial', size: 72, bold: true, color: COLORS.white })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: scoreStatus(score), font: 'Arial', size: 18, italics: true, color: COLORS.white })],
      }),
    ],
  });
}

const cover = [
  new Paragraph({
    spacing: { before: 1800, after: 400 },
    children: [new TextRun({ text: ' ', font: 'Arial', size: 24, color: COLORS.navy })],
  }),
  p(DOMAIN, { size: 72, bold: true, color: COLORS.white, align: AlignmentType.CENTER, spaceAfter: 200 }),
  p('SEO / GEO / AEO Audit Report', { size: 36, color: COLORS.lightBlueText, align: AlignmentType.CENTER, spaceAfter: 200 }),
  p('FULL AUDIT', { size: 22, color: COLORS.white, align: AlignmentType.CENTER, spaceAfter: 400 }),
  new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [3120, 3120, 3120],
    rows: [
      new TableRow({
        children: [
          coverScoreCell('SEO', SEO_SCORE, 3120),
          coverScoreCell('GEO', GEO_SCORE, 3120),
          coverScoreCell('AEO', AEO_SCORE, 3120),
        ],
      }),
    ],
  }),
  new Paragraph({
    spacing: { before: 1800, after: 80 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Audit date: October 28, 2026', font: 'Arial', size: 18, color: COLORS.gray })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Claude Skill and Plugin by Alex Labat', font: 'Arial', size: 18, color: COLORS.gray })],
  }),
  new Paragraph({ children: [new PageBreak()] }),
];

const execSummaryBox = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [CONTENT_W],
  rows: [
    new TableRow({
      children: [
        new TableCell({
          width: { size: CONTENT_W, type: WidthType.DXA },
          borders: noBorder,
          shading: { type: ShadingType.CLEAR, fill: COLORS.lightBlue },
          margins: { top: 160, bottom: 160, left: 180, right: 180 },
          children: [
            body(
              'teachwithsol.com is a focused higher-ed product site with unusually strong Generative Engine Optimization foundations: a clear brand entity (SOL / teachwithsol), Organization + WebSite + SoftwareApplication + FAQPage schema on the homepage, TechArticle schema on docs, GPTBot/Google-Extended allow rules, and a well-maintained llms.txt with markdown mirrors of every guide. Traditional SEO is held back by sitewide Open Graph inheritance (docs and trust pages still advertise the homepage title, description, and URL in social/meta surfaces that crawlers surface), a short meta description (~88 characters on the live description field observed), decorative hero images with empty alt text, and thin marketing content relative to the rich docs corpus. The most urgent fix is page-unique title/description/Open Graph tags across docs.teachwithsol.com and trust.teachwithsol.com so each guide can rank and be cited on its own topic. The biggest opportunity is converting the existing FAQ and how-to docs into question-led, Speakable/HowTo-ready answer blocks without diluting the already-excellent factual density.',
              { spaceAfter: 0 },
            ),
          ],
        }),
      ],
    }),
  ],
});

function scoreRow(dim, score, takeaway, shade) {
  return new TableRow({
    children: [
      cell(dim, { width: 1600, bold: true, fill: shade, size: 20 }),
      cell(`${score}/10`, {
        width: 1200, bold: true, fill: scoreColor(score), color: COLORS.white,
        align: AlignmentType.CENTER, size: 20,
      }),
      cell(scoreStatus(score), {
        width: 1600, bold: true, fill: scoreColor(score), color: COLORS.white,
        align: AlignmentType.CENTER, size: 18,
      }),
      cell(takeaway, { width: 4960, fill: shade, size: 18 }),
    ],
  });
}

const scoresTable = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [1600, 1200, 1600, 4960],
  rows: [
    new TableRow({
      children: [
        cell('Dimension', { width: 1600, bold: true, fill: COLORS.navy, color: COLORS.white, size: 18 }),
        cell('Score', { width: 1200, bold: true, fill: COLORS.navy, color: COLORS.white, size: 18, align: AlignmentType.CENTER }),
        cell('Status', { width: 1600, bold: true, fill: COLORS.navy, color: COLORS.white, size: 18, align: AlignmentType.CENTER }),
        cell('Key Takeaway', { width: 4960, bold: true, fill: COLORS.navy, color: COLORS.white, size: 18 }),
      ],
    }),
    scoreRow('SEO', SEO_SCORE, 'Solid crawl setup; duplicate OG/meta inheritance across docs hurts uniqueness.', COLORS.white),
    scoreRow('GEO', GEO_SCORE, 'llms.txt + markdown docs + AI bot allows are model-ready for AI search citation.', COLORS.lightGray),
    scoreRow('AEO', AEO_SCORE, 'FAQPage + definition patterns are strong; add HowTo/Speakable and question H2s.', COLORS.white),
    new TableRow({
      children: [
        cell('Combined', { width: 1600, bold: true, fill: COLORS.navy, color: COLORS.white, size: 20 }),
        cell(`${SEO_SCORE + GEO_SCORE + AEO_SCORE}/30`, {
          width: 1200, bold: true, fill: COLORS.navy, color: COLORS.white,
          align: AlignmentType.CENTER, size: 20,
        }),
        cell('', { width: 1600, fill: COLORS.navy, size: 18 }),
        cell('Strong GEO head start; SEO/AEO refinements will unlock rankings and snippets.', {
          width: 4960, fill: COLORS.navy, color: COLORS.white, size: 18,
        }),
      ],
    }),
  ],
});

const pages = [
  ['https://www.teachwithsol.com', 'Homepage', 'H1 + FAQPage/Org/WebSite/SoftwareApplication schema; OG present'],
  ['https://docs.teachwithsol.com/docs', 'Docs index', 'Canonical correct; live title/OG still brand-default'],
  ['https://docs.teachwithsol.com/docs/about-sol', 'About / entity', 'Rich positioning; TechArticle; strat-ops.net still listed as live app'],
  ['https://docs.teachwithsol.com/docs/professor-onboarding', 'Faculty guide', 'Long-form how-to with tables; duplicate meta observed'],
  ['https://docs.teachwithsol.com/docs/professor-materials', 'Faculty guide', 'Clear definition + comparison table'],
  ['https://docs.teachwithsol.com/docs/professor-authoring', 'Faculty guide', 'Step flow content; good internal links'],
  ['https://docs.teachwithsol.com/docs/professor-assignments', 'Faculty guide', 'Type comparison table (AEO-friendly)'],
  ['https://docs.teachwithsol.com/docs/professor-grading', 'Faculty guide', 'Auditable grading facts for AI citation'],
  ['https://docs.teachwithsol.com/docs/professor-analytics', 'Faculty guide', 'Concept-gap terminology specificity'],
  ['https://docs.teachwithsol.com/docs/professor-agent-access', 'Faculty guide', 'MCP/agent GEO signals'],
  ['https://docs.teachwithsol.com/docs/canvas-lti', 'Integration', 'LTI 1.3 Advantage setup; keyword-rich'],
  ['https://docs.teachwithsol.com/docs/student-getting-started', 'Student guide', 'Onboarding steps; enrolment-code clarity'],
  ['https://docs.teachwithsol.com/docs/student-lessons', 'Student guide', 'Lessons/flashcards procedural content'],
  ['https://trust.teachwithsol.com/security', 'Trust / Security', 'FERPA/HECVAT trust signals; dateUpdated Oct 26, 2026'],
  ['https://www.teachwithsol.com/llms.txt', 'LLM index', 'Redirects to docs llms.txt; excellent GEO artifact'],
  ['https://docs.teachwithsol.com/docs/llms.txt', 'Docs LLM index', 'Per-doc .md links with citeable summaries'],
  ['https://www.teachwithsol.com/robots.txt', 'Robots', 'Allows GPTBot/Google-Extended; Sitemap points at app host'],
  ['https://www.teachwithsol.com/sitemap.xml', 'Sitemap', '17 URLs across www/docs/trust hosts'],
];

const pagesTable = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [4200, 1600, 3560],
  rows: [
    new TableRow({
      children: [
        cell('URL', { width: 4200, bold: true, fill: COLORS.navy, color: COLORS.white, size: 18 }),
        cell('Page Type', { width: 1600, bold: true, fill: COLORS.navy, color: COLORS.white, size: 18 }),
        cell('Notes', { width: 3560, bold: true, fill: COLORS.navy, color: COLORS.white, size: 18 }),
      ],
    }),
    ...pages.map((row, i) => new TableRow({
      children: [
        cell(row[0], { width: 4200, size: 16, fill: i % 2 ? COLORS.lightGray : COLORS.white }),
        cell(row[1], { width: 1600, size: 18, fill: i % 2 ? COLORS.lightGray : COLORS.white }),
        cell(row[2], { width: 3560, size: 18, fill: i % 2 ? COLORS.lightGray : COLORS.white }),
      ],
    })),
  ],
});

const seoTech = [
  ['Title tag', 'Homepage title “SOL · The operating system for teaching” (~42 chars) is brand-forward. Live crawls of docs/security still surface the same brand title via OG/title fields rather than page-unique titles like “About · SOL” / “Security · SOL” that exist in source metadata.', 'Needs Attention'],
  ['Meta description', 'Observed live description: “The AI teaching layer for the LMS you already use. The operating system for teaching.” (~88 chars). Below the 150–160 ideal; lacks a CTA. Longer SEO.description exists in code but is not what crawlers surfaced.', 'Needs Attention'],
  ['Heading hierarchy', 'Homepage has a single H1 (“The operating system for teaching.”) with logical H2s (How it works, FAQ, trust). Docs pages have clear singular H1s matching guide titles (e.g. “Course materials”).', 'Good'],
  ['URL structure', 'Clean multi-host structure: www (marketing), docs.*, trust.*, app.*. Readable paths like /docs/professor-grading and /docs/canvas-lti.', 'Good'],
  ['Canonical', 'Homepage canonical https://www.teachwithsol.com; docs and security self-canonicalize correctly (e.g. https://docs.teachwithsol.com/docs/about-sol).', 'Good'],
  ['Robots meta', 'index, follow + googlebot max-image-preview:large across sampled pages. No accidental noindex on public content.', 'Good'],
  ['Viewport / mobile', 'width=device-width, initial-scale=1 present.', 'Good'],
  ['Image alt text', 'LoopSteps use descriptive alts; Hero, FAQ background, and Footer painting use alt="". Decorative treatment is intentional but wastes keyword-relevant image SEO on primary marketing visuals.', 'Needs Attention'],
  ['Internal links', 'Strong docs cross-linking and nav anchors (#product, #faq, #trust). Footer/nav point to About SOL, Docs, Security. Markdown alternate links on docs.', 'Good'],
  ['Open Graph / Twitter', 'Homepage OG/Twitter complete (1200×630 images). Root layout hardcodes og:title, og:description, and og:url to the homepage — every docs/trust page inherits homepage social cards. Critical uniqueness issue.', 'Missing'],
];

const seoContent = [
  ['Word count / depth', 'Homepage is concise marketing (loop + FAQ + trust). Depth lives in docs: About SOL, onboarding, grading, LTI are substantial (well above 500 words). No blog/insights section discovered in sitemap or nav.', 'Needs Attention'],
  ['Keyword signals', 'Clear primary entity: “AI teaching layer”, “operating system for teaching”, Canvas, FERPA, LTI, course-scoped tutor. Keywords meta present. Positioning table on About SOL reinforces “not just an AI quiz grader.”', 'Good'],
  ['Freshness', 'Security page states “Last updated October 26, 2026.” Docs TechArticle includes dateModified. No visible publish dates on marketing sections.', 'Needs Attention'],
  ['Readability', 'Short paragraphs, numbered steps, comparison tables throughout docs. Homepage FAQ accordion pattern; scannable H2/H3 structure.', 'Good'],
];

const seoSchema = [
  ['Schema presence', 'Homepage JSON-LD: Organization, WebSite, SoftwareApplication (EducationalApplication), FAQPage (8 Q&As). Docs: TechArticle with author/publisher Organization. Strong for a product marketing site.', 'Good'],
  ['Schema completeness', 'Organization lacks sameAs (no social profiles linked). SoftwareApplication Offer is price 0 with pilot CTA — acceptable. No BreadcrumbList, HowTo, or SpeakableSpecification observed.', 'Needs Attention'],
  ['Validity', 'JSON-LD structures appear syntactically sound (FAQ Question/Answer pairs match MARKETING_FAQS). TechArticle URLs match page canonicals in source.', 'Good'],
];

const geoEeat = [
  ['Author information', 'Docs author is Organization “SOL” only — no named faculty advisors, founders, or bylined experts.', 'Missing'],
  ['About page', 'https://docs.teachwithsol.com/docs/about-sol is excellent product/entity documentation (roles, URLs, what SOL is/isn’t) but is not a company/team credentials page.', 'Needs Attention'],
  ['Contact information', 'Primary CTA is Google Calendar demo booking. No public phone, postal NAP, or support email on marketing/docs surfaces crawled.', 'Needs Attention'],
  ['Trust signals', 'Security page covers FERPA, ZDR/no-train, HECVAT Lite, Vercel/Neon/Clerk stack. Strong institutional trust language. No testimonials, press, or awards found.', 'Needs Attention'],
  ['Organization schema', 'Organization + WebSite declared with alternateName aliases (teachwithsol, Teach with SOL). Logo via /icon. Missing sameAs social graph links.', 'Needs Attention'],
];

const geoContent = [
  ['Factual density', 'High: enrolment-code model, role matrix, LTI_ENABLED caveat, MCP endpoint, subprocessors named on Security. About SOL is explicitly written as “Facts agents and humans can cite.”', 'Good'],
  ['Clear claims', 'Homepage and About lead with plain definition: “SOL is the AI teaching layer for the LMS you already use.”', 'Good'],
  ['Source citation', 'Internal cross-links strong; few external authoritative citations (research, standards beyond FERPA/HECVAT mentions).', 'Needs Attention'],
  ['Comprehensiveness', 'Docs cover faculty loop end-to-end plus student guides and Canvas LTI. Marketing homepage summarizes; depth is in docs.', 'Good'],
  ['Entity clarity', 'Brand consistently “SOL” / teachwithsol.com. Material entity confusion: About SOL and onboarding still list https://www.strat-ops.net/learning as “Current production classroom app,” which can split AI entity resolution.', 'Needs Attention'],
  ['Originality', 'Clear POV: instructor-in-control, not LMS replacement, not generic chatbot. Positioning table is distinctive.', 'Good'],
];

const geoTech = [
  ['Structured data depth', 'Beyond basics: SoftwareApplication featureList, FAQPage, TechArticle dateModified. No Author Person, Dataset, ClaimReview, or Speakable.', 'Needs Attention'],
  ['HTTPS / security', 'HTTPS on www, docs, trust, app hosts.', 'Good'],
  ['Crawlability', 'robots.txt Allow for /, /docs, /llms.txt, /security; Disallow dashboard/api/quiz. Explicit GPTBot and Google-Extended allows — excellent for AI search. Sitemap Host prefers www.', 'Good'],
  ['llms.txt / markdown', 'Site and docs llms.txt present with per-guide .md URLs. Docs pages expose text/markdown alternates. Best-in-class GEO technical setup for an early product site.', 'Good'],
  ['sameAs / social', 'No LinkedIn/X/GitHub/sameAs links found in footer or Organization schema.', 'Missing'],
  ['Sitemap host note', 'robots.txt declares Sitemap: https://app.teachwithsol.com/sitemap.xml while Host is www. Content is identical (17 URLs) but preferred-host consistency would be cleaner as https://www.teachwithsol.com/sitemap.xml.', 'Needs Attention'],
];

const aeoSnippet = [
  ['Direct answer paragraphs', 'FAQ answers are concise and definitional (e.g. “What is SOL?”). About SOL opens with a citeable one-liner. Good featured-snippet candidates if indexed as unique pages.', 'Good'],
  ['Definition patterns', 'Strong “X is…” patterns across marketing and About SOL (“SOL is the AI teaching layer…”).', 'Good'],
  ['List content', 'Numbered teaching loop (Build → Tutor → Assess → Grade → See), onboarding checklists, step flows in authoring/onboarding.', 'Good'],
  ['Table content', 'Multiple comparison tables (Say/Avoid, Roles, assignment types, Without/With materials) — strong table-snippet potential.', 'Good'],
];

const aeoStructured = [
  ['FAQ schema', 'FAQPage with 8 questions including “What is SOL?”, “Does SOL replace Canvas?”, “Is student work private?” — correctly structured Question/acceptedAnswer pairs.', 'Good'],
  ['HowTo schema', 'Procedural docs (onboarding, authoring, LTI) are HowTo-shaped but lack HowTo JSON-LD.', 'Missing'],
  ['Question-phrased headings', 'Homepage FAQ uses natural questions. Docs H2s are mostly topic labels (“Prerequisites”, “Flow”, “Safety and privacy”) rather than “How do I…?” phrasing.', 'Needs Attention'],
  ['Speakable schema', 'No SpeakableSpecification observed on homepage FAQ or docs.', 'Missing'],
];

const aeoVoice = [
  ['Conversational language', 'Marketing and FAQ copy is plain and conversational (“Will I stay in control?”, “What do students actually do in SOL?”).', 'Good'],
  ['Long-tail coverage', 'Covers what/who/how for product, Canvas, privacy, student workflow. Gaps: pricing page, comparison pages, “best AI for Canvas” style intent pages.', 'Needs Attention'],
  ['Local / NAP', 'Not a local-business product; NAP not required. Demo booking URL substitutes for contact — fine for SaaS, weaker for voice “call them” queries.', 'Needs Attention'],
];

const recommendations = [
  ['Critical', 'Override Open Graph + Twitter per page (unique title, description, url) on every docs and trust URL so shares and OG-preferring crawlers stop seeing the homepage card everywhere.', 'SEO', 'Medium', 'High'],
  ['Critical', 'Ensure live <title> and meta description match page-specific generateMetadata (e.g. “Faculty onboarding · SOL”) — verify production deploy/host config if source already defines them.', 'SEO', 'Low', 'High'],
  ['High', 'Expand meta descriptions to 150–160 chars with primary keyword + CTA (e.g. “Book a demo”). Use SEO.description (or longer) on the homepage live surface.', 'SEO', 'Low', 'Medium'],
  ['High', 'Resolve dual-entity confusion: update About SOL / onboarding “live app” URLs from strat-ops.net to teachwithsol/app hosts so AI engines cite one brand graph.', 'GEO', 'Low', 'High'],
  ['High', 'Add Organization sameAs (LinkedIn company page, etc.) and a short Team/Company section with named people or institutional affiliation for E-E-A-T.', 'GEO', 'Medium', 'High'],
  ['Medium', 'Add HowTo JSON-LD on professor-onboarding, professor-authoring, and canvas-lti; add SpeakableSpecification on homepage FAQ answers.', 'AEO', 'Medium', 'High'],
  ['Medium', 'Rewrite key docs H2s into question form (“How do I release a lesson?”, “What is Attention?”) with a 40–60 word answer paragraph immediately below.', 'AEO', 'Medium', 'Medium'],
  ['Medium', 'Point robots.txt Sitemap to https://www.teachwithsol.com/sitemap.xml to match Host preference.', 'SEO', 'Low', 'Low'],
  ['Quick Win', 'Add meaningful alt text to primary marketing images (hero grove / classroom) instead of empty alts where the image conveys product atmosphere.', 'SEO', 'Low', 'Medium'],
  ['Quick Win', 'Add a public contact email or “Campus IT / privacy requests” address on Security and Footer to strengthen trust/contact GEO signals.', 'GEO', 'Low', 'Medium'],
];

const recTable = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [1400, 3960, 1200, 1400, 1400],
  rows: [
    new TableRow({
      children: [
        cell('Priority', { width: 1400, bold: true, fill: COLORS.navy, color: COLORS.white, size: 18, align: AlignmentType.CENTER }),
        cell('Issue', { width: 3960, bold: true, fill: COLORS.navy, color: COLORS.white, size: 18 }),
        cell('Dimension', { width: 1200, bold: true, fill: COLORS.navy, color: COLORS.white, size: 18, align: AlignmentType.CENTER }),
        cell('Effort', { width: 1400, bold: true, fill: COLORS.navy, color: COLORS.white, size: 18, align: AlignmentType.CENTER }),
        cell('Impact', { width: 1400, bold: true, fill: COLORS.navy, color: COLORS.white, size: 18, align: AlignmentType.CENTER }),
      ],
    }),
    ...recommendations.map((r, i) => new TableRow({
      children: [
        priorityCell(r[0], 1400),
        cell(r[1], { width: 3960, size: 17, fill: i % 2 ? COLORS.lightGray : COLORS.white }),
        cell(r[2], { width: 1200, size: 18, align: AlignmentType.CENTER, fill: i % 2 ? COLORS.lightGray : COLORS.white }),
        cell(r[3], { width: 1400, size: 18, align: AlignmentType.CENTER, fill: i % 2 ? COLORS.lightGray : COLORS.white }),
        cell(r[4], { width: 1400, size: 18, align: AlignmentType.CENTER, fill: i % 2 ? COLORS.lightGray : COLORS.white }),
      ],
    })),
  ],
});

const strengths = [
  'llms.txt + per-doc .md mirrors with citeable one-line summaries — rare and valuable for ChatGPT/Perplexity-style engines.',
  'Homepage ships Organization, WebSite, SoftwareApplication, and FAQPage schema together with 8 real product FAQs.',
  'robots.txt explicitly allows GPTBot and Google-Extended on public docs/security while locking down dashboards/APIs.',
  'Multi-host architecture (www / docs / trust) with correct self-canonicals and a 17-URL sitemap covering the public corpus.',
  'About SOL and Security pages are dense, precise, and institutionally credible (FERPA, HECVAT, no-train/ZDR language).',
  'Docs TechArticle schema with dateModified and clear H1s; internal linking between faculty/student guides is coherent.',
];

const strengthsTable = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [CONTENT_W],
  rows: strengths.map((s) => new TableRow({
    children: [
      new TableCell({
        width: { size: CONTENT_W, type: WidthType.DXA },
        borders: thinBorder,
        shading: { type: ShadingType.CLEAR, fill: COLORS.lightGreen },
        margins: { top: 100, bottom: 100, left: 140, right: 140 },
        children: [body(s, { spaceAfter: 0 })],
      }),
    ],
  })),
});

const doc = new Document({
  styles: {
    default: {
      document: {
        styles: [{
          id: 'Normal',
          run: { font: 'Arial', size: 22, color: COLORS.dark },
        }],
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      children: [
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [CONTENT_W],
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: CONTENT_W, type: WidthType.DXA },
                  borders: noBorder,
                  shading: { type: ShadingType.CLEAR, fill: COLORS.navy },
                  margins: { top: 200, bottom: 200, left: 200, right: 200 },
                  children: cover.slice(0, -1),
                }),
              ],
            }),
          ],
        }),
        new Paragraph({ children: [new PageBreak()] }),
      ],
    },
    {
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: COLORS.navy, space: 8 } },
              spacing: { after: 200 },
              children: [
                new TextRun({ text: DOMAIN, font: 'Arial', size: 18, color: COLORS.dark }),
                new TextRun({ text: '\t', font: 'Arial', size: 18 }),
                new TextRun({ text: 'SEO / GEO / AEO Audit Report', font: 'Arial', size: 18, color: COLORS.dark }),
              ],
              tabStops: [{ type: 'right', position: CONTENT_W }],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border, space: 8 } },
              spacing: { before: 120 },
              children: [
                new TextRun({ text: 'Claude Skill and Plugin by Alex Labat', font: 'Arial', size: 16, color: COLORS.gray }),
                new TextRun({ text: '\t', font: 'Arial', size: 16 }),
                new TextRun({ text: 'Page ', font: 'Arial', size: 16, color: COLORS.gray }),
                new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: COLORS.gray }),
              ],
              tabStops: [{ type: 'right', position: CONTENT_W }],
            }),
          ],
        }),
      },
      children: [
        h1('Executive Summary'),
        execSummaryBox,
        p('', { spaceAfter: 200 }),
        scoresTable,
        p('', { spaceAfter: 200 }),

        h1('Pages Audited'),
        body('18 resources reviewed across www, docs, and trust hosts on October 28, 2026. Privacy, Terms, and DMCA were skipped as low-signal legal pages per full-audit scope.'),
        pagesTable,

        h1('SEO Analysis'),
        p(`Score: ${SEO_SCORE}/10 — ${scoreStatus(SEO_SCORE)}`, { size: 22, italics: true, color: COLORS.accent, spaceAfter: 200 }),
        h2('Technical On-Page'),
        signalTable(seoTech),
        h2('Content Quality'),
        signalTable(seoContent),
        h2('Structured Data'),
        signalTable(seoSchema),
        body('Note: Core Web Vitals, JS rendering completeness, and backlink/domain authority were not measured via HTML fetch. Use Google PageSpeed Insights (pagespeed.web.dev) and Search Console for those.'),

        h1('GEO Analysis'),
        p(`Score: ${GEO_SCORE}/10 — ${scoreStatus(GEO_SCORE)}`, { size: 22, italics: true, color: COLORS.accent, spaceAfter: 200 }),
        body('GEO (Generative Engine Optimization) targets AI-powered search (Perplexity, ChatGPT Search, Google AI Overviews, Gemini) that synthesize answers and cite sources.'),
        h2('E-E-A-T Assessment'),
        signalTable(geoEeat),
        h2('Content for AI Synthesis'),
        signalTable(geoContent),
        h2('Technical GEO'),
        signalTable(geoTech),

        h1('AEO Analysis'),
        p(`Score: ${AEO_SCORE}/10 — ${scoreStatus(AEO_SCORE)}`, { size: 22, italics: true, color: COLORS.accent, spaceAfter: 200 }),
        body('AEO (Answer Engine Optimization) targets featured snippets, People Also Ask, and voice assistants that need a concise extractable answer.'),
        h2('Featured Snippet Eligibility'),
        signalTable(aeoSnippet),
        h2('Structured Answer Formats'),
        signalTable(aeoStructured),
        h2('Voice Search Readiness'),
        signalTable(aeoVoice),

        h1('Priority Recommendations'),
        recTable,

        h1("What's Working Well"),
        strengthsTable,

        h1('Glossary'),
        h3('SEO — Search Engine Optimization'),
        body('Traditional optimization for Google/Bing rankings: titles, meta descriptions, headings, crawlability, internal links, and structured data that help pages appear in classic blue-link results.'),
        h3('GEO — Generative Engine Optimization'),
        body('Optimization for AI answer engines that synthesize multi-source answers and cite pages. Rewards clear entities, factual density, authoritative docs, llms.txt/markdown mirrors, and crawler access for GPTBot and similar agents.'),
        h3('AEO — Answer Engine Optimization'),
        body('Optimization for featured snippets, People Also Ask, and voice responses. Rewards FAQ/HowTo schema, question-phrased headings, 40–60 word direct answers, lists, and tables that can be extracted verbatim.'),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(OUT, buffer);
  console.log('DOCX written:', OUT);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
