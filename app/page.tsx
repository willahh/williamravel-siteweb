import fs from 'fs/promises';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import { PdfButtonWrapper } from './pdf-button';

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


export default async function Home() {
  const markdownPath = path.join(process.cwd(), 'public', 'cv.md');
  const markdownContent = await fs.readFile(markdownPath, 'utf-8');

  const sections = extractSections(markdownContent);

  // Sections pour la sidebar
  const sidebarSections = ['Profil', 'Compétences clés', 'Formation', 'Langues', 'Centres d’intérêt'];

  // Contenu principal : Expériences professionnelles
  const mainContent = sections['Expériences professionnelles'] || '';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="cv-container max-w-7xl mx-auto px-4">
        {/* Titre principal */}
        <header className="cv-section text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{sections.title}</h1>
        </header>

        <div className="cv-grid grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Sidebar */}
          <aside className="cv-sidebar md:col-span-1 bg-white p-6 rounded-lg shadow-md">
            {sidebarSections.map((section) => (
              <div key={section} className="cv-section mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{section}</h3>
                <div className="text-sm text-gray-600">
                  <div className="prose prose-sm"><ReactMarkdown>{sections[section] || ''}</ReactMarkdown></div>
                </div>
              </div>
            ))}
          </aside>

          {/* Contenu principal */}
          <main className="cv-main md:col-span-2 bg-white p-6 rounded-lg shadow-md">
            <div className="cv-section">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Expériences professionnelles</h2>
              <article className="prose prose-lg">
                <ReactMarkdown>{mainContent}</ReactMarkdown>
              </article>
            </div>
          </main>
        </div>

        {/* Bouton de téléchargement */}
        <div className="mt-8 text-center">
          <PdfButtonWrapper sections={sections} />
        </div>
      </div>
    </div>
  );
}
