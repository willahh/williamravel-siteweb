import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { marked } from 'marked';
import puppeteer from 'puppeteer';

// Fonction pour extraire les sections du Markdown
function extractSections(content: string) {
  const lines = content.split('\n');
  const sections: { [key: string]: string } = {};
  let title = '';
  let currentSection = '';
  let currentContent: string[] = [];
  const introLines: string[] = [];
  let hasEnteredSection = false;

  for (const line of lines) {
    if (line.startsWith('# ')) {
      title = line.substring(2).trim();
    } else if (line.startsWith('## ')) {
      if (currentSection) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = line.substring(3).trim();
      currentContent = [];
      hasEnteredSection = true;
    } else if (currentSection) {
      currentContent.push(line);
    } else if (!hasEnteredSection) {
      introLines.push(line);
    }
  }
  if (currentSection) {
    sections[currentSection] = currentContent.join('\n').trim();
  }
  sections.title = title;
  sections.intro = introLines.join('\n').trim();
  return sections;
}

function transformStackLines(markdown: string) {
  return markdown.replace(/^(\*\*Stack\*\*\s*:\s*)(.*)$/gim, (_match: string, _label: string, items: string) => {
    const chips = items
      .split('•')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => `<span class="stack-chip">${item}</span>`)
      .join('');
    return chips ? `<div class="stack-chips">${chips}</div>` : '';
  });
}

function wrapExperienceEntriesHtml(html: string) {
  return html
    .split(/(?=<h3)/)
    .map((chunk) => {
      if (!chunk.trim().startsWith('<h3')) {
        return chunk;
      }
      return `<div class="experience-entry">${chunk}</div>`;
    })
    .join('');
}

function enforceLinkTargets(html: string) {
  return html.replace(
    /<a\s+href="([^"]+)"([^>]*)>/g,
    (_match, href, rest) =>
      `<a href="${href}"${rest?.includes('target=') ? rest : `${rest} target="_blank" rel="noopener noreferrer"`}>`,
  );
}

export async function GET() {
  try {
    const markdownPath = path.join(process.cwd(), 'public', 'cv.md');
    const markdownContent = await fs.readFile(markdownPath, 'utf-8');

    const sections = extractSections(markdownContent);

    const leftSidebarSections = ['Compétences', 'Education', 'Langues', 'Centres d’intérêt'];

    const introLines = (sections.intro || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const subtitleLine = introLines[0] || '';
    const contactMarkdown = introLines.slice(1).join('\n').trim();
    const subtitleHtml = subtitleLine ? marked(subtitleLine) : '';
    const contactHtml = contactMarkdown ? marked(contactMarkdown) : '';

    const imagePath = path.join(process.cwd(), 'public', 'photo-will-2.png');
    const imageBuffer = await fs.readFile(imagePath);
    const imageBase64 = imageBuffer.toString('base64');

    const photoHtml = `
      <section class="photo-block">
        <img src="data:image/png;base64,${imageBase64}" alt="Photo de profil" class="profile-photo">
      </section>
    `;

    const sidebarHtml = leftSidebarSections
      .map((section) => {
        const content = sections[section] || '';
        if (!content) return '';
        return `
          <section class="left-block">
            <h3>${section}</h3>
            <div class="markdown">
              ${marked(content)}
            </div>
          </section>
        `;
      })
      .join('');

    const profileContent = sections['Profil'] || '';

    const profileHtml = profileContent
      ? `
        <section class="main-block profile-block">
          <div class="markdown">
            ${marked(profileContent)}
          </div>
        </section>
      `
      : '';

    const mainSections = [
      { title: 'Expériences professionnelles', content: sections['Expériences professionnelles'] || '' },
    ]
      .filter((section) => section.content)
      .map((section) => ({
        ...section,
        className: section.title === 'Expériences professionnelles' ? 'main-block experience-block' : 'main-block',
      }));

    const mainHtml =
      profileHtml +
      mainSections
        .map(({ title, content, className }) => {
          const htmlContent = marked(transformStackLines(content)) as string;
          const sectionHtml = title === 'Expériences professionnelles' ? wrapExperienceEntriesHtml(htmlContent) : htmlContent;
          return `
          <section class="${className}">
            <h2>${title}</h2>
            <div class="markdown">
              ${sectionHtml}
            </div>
          </section>
        `;
        })
        .join('');

    // HTML template avec styles pour PDF (A4, sidebar, etc.)
    const rawHtml = `
      <html>
        <head>
          <style>
            @page {
              size: A4;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background: #050505;
              font-family: 'Helvetica Neue', Arial, sans-serif;
              font-size: 8.7pt;
              line-height: 1.35;
              color: #1f2933;
            }
            .pdf-page {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              background: #ffffff;
              display: flex;
              flex-direction: column;
            }
            .layout {
              display: flex;
              min-height: 297mm;
            }
            .left-column {
              width: 32%;
              background: #0f1115;
              color: #f5f5f5;
              padding: 9mm 8mm;
              display: flex;
              flex-direction: column;
              gap: 6mm;
            }
            .right-column {
              width: 68%;
              padding: 10mm 12mm 10mm 11mm;
              display: flex;
              flex-direction: column;
              gap: 3mm;
            }
            .hero {
              margin-bottom: 0.2mm;
            }
            .hero-name {
              font-size: 22pt;
              letter-spacing: 0.3pt;
              margin: 0;
              text-transform: uppercase;
            }
            .hero-role {
              margin-top: 0.6mm;
              font-size: 9pt;
              color: #6b7280;
              letter-spacing: 0.7pt;
              text-transform: uppercase;
            }
            .hero-role p {
              margin: 0;
            }
            .left-block h3 {
              font-size: 7.8pt;
              letter-spacing: 0.8pt;
              margin: 0 0 1.8mm;
              text-transform: uppercase;
              color: #e5e7eb;
            }
            .left-block .markdown h3 {
              margin: 2.5mm 0 1.2mm;
              font-size: 7.5pt;
              letter-spacing: 0.2pt;
              text-transform: uppercase;
              color: #f4f4f5;
            }
            .left-block .markdown p,
            .left-block .markdown li {
              color: #d8d8dc;
              font-size: 7.4pt;
              margin-bottom: 1.6mm;
            }
            .left-block .markdown ul {
              padding-left: 3.5mm;
              margin: 0 0 1mm;
            }
            .main-block {
              margin-bottom: 6mm;
            }
            .main-block:last-of-type {
              margin-bottom: 0;
            }
            .main-block h2 {
              font-size: 10pt;
              letter-spacing: 0.5pt;
              text-transform: uppercase;
              margin: 0 0 3mm;
              color: #111827;
              border-bottom: 1px solid #e4e4e7;
              padding-bottom: 0.2mm;
            }
           
            .main-block .markdown h3 {
              font-size: 9pt;
              margin: 1mm 0 0.8mm;
              color: #111827;
            }
            .markdown p {
              margin: 0 0 2.2mm;
            }
            .markdown ul {
              padding-left: 4mm;
              margin: 0 0 2mm;
            }
            .markdown li {
              margin-bottom: 1.2mm;
            }
            .stack-chips {
              display: flex;
              flex-wrap: wrap;
              gap: 1mm;
              margin-top: 0.6mm;
            }
            .stack-chip {
              border: 1px solid rgba(17, 24, 39, 0.16);
              border-radius: 999px;
              padding: 0.4mm 1.8mm;
              font-size: 7pt;
              letter-spacing: 0.1pt;
              text-transform: uppercase;
              color: #374151;
              background: rgba(17, 24, 39, 0.03);
            }
            .profile-block {
              padding: 0;
              margin-bottom: 2mm;
            }
            .photo-block {
              display: flex;
              justify-content: center;
              align-items: center;
            }
            .photo-placeholder {
              width: 146px;
              height: 220px;
              border: 1px dashed #6b7280;
              border-radius: 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(255, 255, 255, 0.02);
              font-size: 8pt;
              letter-spacing: 0.4pt;
              text-transform: uppercase;
              color: #9ca3af;
            }
            .experience-block .markdown > * + * {
              margin-top: 3.5mm;
            }
            .experience-entry {
              border-left: 1.2mm solid rgba(16, 185, 129, 0.85);
              padding-left: 2.5mm;
              margin-bottom: 3.5mm;
            }
            a {
              color: inherit;
              text-decoration: underline;
            }
            strong {
              font-weight: 600;
            }
            .profile-photo {
              width: 39mm;
              height: 45mm;
              object-fit: cover;
              border-radius: 2mm;
            }
          </style>
        </head>
        <body>
          <div class="pdf-page">
            <div class="layout">
              <aside class="left-column">
                ${photoHtml}
                ${
                  contactHtml
                    ? `<section class="left-block"><h3>Contact</h3><div class="markdown">${contactHtml}</div></section>`
                    : ''
                }
                ${sidebarHtml}
              </aside>
              <section class="right-column">
                <header class="hero">
                  <h1 class="hero-name">${sections.title}</h1>
                  <div class="hero-role">${subtitleHtml}</div>
                </header>
                ${mainHtml}
              </section>
            </div>
          </div>
        </body>
      </html>
    `;
    const html = enforceLinkTargets(rawHtml);

    // Lancer Puppeteer pour générer PDF
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

    await browser.close();

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=cv.pdf' },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur génération PDF' }, { status: 500 });
  }
}
