import fs from 'fs/promises';
import path from 'path';
import ReactMarkdown from 'react-markdown';

export default async function Home() {
  const markdownPath = path.join(process.cwd(), 'public', 'cv.md');
  const markdownContent = await fs.readFile(markdownPath, 'utf-8');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <main className="max-w-4xl mx-auto px-4">
        <article className="prose prose-lg mx-auto">
          <ReactMarkdown>{markdownContent}</ReactMarkdown>
        </article>
      </main>
    </div>
  );
}
