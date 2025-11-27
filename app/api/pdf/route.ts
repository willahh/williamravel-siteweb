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

export async function GET() {
  try {
    const markdownPath = path.join(process.cwd(), 'public', 'cv.md');
    const markdownContent = await fs.readFile(markdownPath, 'utf-8');

    const sections = extractSections(markdownContent);

    const leftSidebarSections = ['Profil', 'Compétences clés', 'Langues', 'Centres d’intérêt'];

    const introLines = (sections.intro || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const subtitleLine = introLines[0] || '';
    const contactMarkdown = introLines.slice(1).join('\n').trim();
    const subtitleHtml = subtitleLine ? marked(subtitleLine) : '';
    const contactHtml = contactMarkdown ? marked(contactMarkdown) : '';

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

    const mainSections = [
      { title: 'Expériences professionnelles', content: sections['Expériences professionnelles'] || '' },
      { title: 'Formation', content: sections['Formation'] || '' },
    ].filter((section) => section.content);

    const mainHtml = mainSections
      .map(
        ({ title, content }) => `
          <section class="main-block">
            <h2>${title}</h2>
            <div class="markdown">
              ${marked(content)}
            </div>
          </section>
        `,
      )
      .join('');

    // HTML template avec styles pour PDF (A4, sidebar, etc.)
    const html = `
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
              font-size: 9.5pt;
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
              padding: 18mm 12mm;
              display: flex;
              flex-direction: column;
              gap: 10mm;
            }
            .right-column {
              width: 68%;
              padding: 18mm 18mm 18mm 16mm;
              display: flex;
              flex-direction: column;
              gap: 10mm;
            }
            .hero {
              margin-bottom: 4mm;
            }
            .hero-name {
              font-size: 26pt;
              letter-spacing: 0.5pt;
              margin: 0;
              text-transform: uppercase;
            }
            .hero-role {
              margin-top: 3mm;
              font-size: 11pt;
              color: #6b7280;
              letter-spacing: 0.8pt;
              text-transform: uppercase;
            }
            .hero-role p {
              margin: 0;
            }
            .left-block h3 {
              font-size: 9pt;
              letter-spacing: 1.1pt;
              margin: 0 0 3mm;
              text-transform: uppercase;
              color: #e5e7eb;
            }
            .left-block .markdown h3 {
              margin: 4mm 0 2mm;
              font-size: 8.3pt;
              letter-spacing: 0.3pt;
              text-transform: uppercase;
              color: #f4f4f5;
            }
            .left-block .markdown p,
            .left-block .markdown li {
              color: #d8d8dc;
              font-size: 8pt;
              margin-bottom: 2mm;
            }
            .left-block .markdown ul {
              padding-left: 4mm;
              margin: 0 0 2mm;
            }
            .main-block h2 {
              font-size: 12pt;
              letter-spacing: 0.8pt;
              text-transform: uppercase;
              margin: 0 0 4mm;
              color: #111827;
              border-bottom: 1px solid #e4e4e7;
              padding-bottom: 2mm;
            }
            .main-block .markdown h3 {
              font-size: 10pt;
              margin: 3mm 0 2mm;
              color: #111827;
            }
            .markdown p {
              margin: 0 0 3mm;
            }
            .markdown ul {
              padding-left: 4mm;
              margin: 0 0 3mm;
            }
            .markdown li {
              margin-bottom: 1.5mm;
            }
            a {
              color: inherit;
              text-decoration: none;
            }
            strong {
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="pdf-page">
            <div class="layout">
              <aside class="left-column">
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
