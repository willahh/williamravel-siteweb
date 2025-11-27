import Image from "next/image";
import styles from "./page.module.css";
import fs from 'fs/promises';
import path from 'path';
import ReactMarkdown from 'react-markdown';

export default async function Home() {
  const markdownPath = path.join(process.cwd(), 'public', 'cv.md');
  const markdownContent = await fs.readFile(markdownPath, 'utf-8');

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <ReactMarkdown>{markdownContent}</ReactMarkdown>
      </main>
    </div>
  );
}
