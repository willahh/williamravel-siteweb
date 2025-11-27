'use client';

import { useState } from 'react';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

interface PdfButtonWrapperProps {
  sections: { [key: string]: string };
}

// Ajouter plus de styles pour le PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 40,
  },
  sidebar: {
    width: '30%',
    paddingRight: 20,
  },
  main: {
    width: '70%',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 10,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  text: {
    fontSize: 10,
    marginBottom: 5,
    color: '#4A5568',
  },
});

// Fonction pour parser le Markdown (améliorée pour PDF)
function parseMarkdownToPdfElements(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;
  let currentParagraph = '';
  let inList = false;

  lines.forEach((line) => {
    line = line.trim();
    if (!line) {
      if (currentParagraph) {
        elements.push(renderFormattedText(currentParagraph, key++));
        currentParagraph = '';
      }
      return;
    }

    if (line.startsWith('## ')) {
      if (currentParagraph) {
        elements.push(renderFormattedText(currentParagraph, key++));
        currentParagraph = '';
      }
      elements.push(<Text key={key++} style={styles.sectionTitle}>{line.substring(3).trim()}</Text>);
      inList = false;
    } else if (line.startsWith('### ')) {
      if (currentParagraph) {
        elements.push(renderFormattedText(currentParagraph, key++));
        currentParagraph = '';
      }
      elements.push(<Text key={key++} style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5 }}>{line.substring(4).trim()}</Text>);
      inList = false;
    } else if (line.startsWith('- ')) {
      if (currentParagraph) {
        elements.push(renderFormattedText(currentParagraph, key++));
        currentParagraph = '';
      }
      elements.push(<Text key={key++} style={styles.text}>• {renderFormattedText(line.substring(2).trim(), key++, true)}</Text>);
      inList = true;
    } else {
      currentParagraph += (currentParagraph ? ' ' : '') + line;
      inList = false;
    }
  });

  if (currentParagraph) {
    elements.push(renderFormattedText(currentParagraph, key++));
  }

  return elements;
}

// Fonction pour rendre texte avec bold, italic et liens
function renderFormattedText(text: string, key: number, isList = false): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g).filter(Boolean);
  const formatted = parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <Text key={key + index} style={{ fontWeight: 'bold' }}>{part.substring(2, part.length - 2)}</Text>;
    } else if (part.startsWith('*') && part.endsWith('*')) {
      return <Text key={key + index} style={{ fontStyle: 'italic' }}>{part.substring(1, part.length - 1)}</Text>;
    } else if (part.startsWith('[') && part.includes('](')) {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        return <Text key={key + index} style={styles.text}>{match[1]} ({match[2]})</Text>;
      }
    }
    return <Text key={key + index} style={styles.text}>{part}</Text>;
  });

  return isList ? formatted : <View key={key} style={{ marginBottom: 5 }}>{formatted}</View>;
}

// Composant PDF
const CvPdf = ({ sections }: PdfButtonWrapperProps) => {
  const sidebarSections = ['Profil', 'Compétences clés', 'Formation', 'Langues', 'Centres d’intérêt'];
  const mainContent = sections['Expériences professionnelles'] || '';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.sidebar}>
          {sidebarSections.map((section) => (
            <View key={section}>
              <Text style={styles.sectionTitle}>{section}</Text>
              {parseMarkdownToPdfElements(sections[section] || '')}
            </View>
          ))}
        </View>
        <View style={styles.main}>
          <Text style={styles.title}>{sections.title}</Text>
          <Text style={styles.sectionTitle}>Expériences professionnelles</Text>
          {parseMarkdownToPdfElements(mainContent)}
        </View>
      </Page>
    </Document>
  );
};

export const PdfButtonWrapper = ({ sections }: PdfButtonWrapperProps) => {
  const [isClient, setIsClient] = useState(false);

  // Assurer que le composant ne rend rien côté serveur
  useState(() => {
    setIsClient(true);
  });

  if (!isClient) {
    return <p>Chargement du bouton PDF...</p>;
  }

  return (
    <PDFDownloadLink
      document={<CvPdf sections={sections} />}
      fileName="cv.pdf"
      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 inline-block"
    >
      {({ loading, error }) => {
        if (error) {
          console.error('Erreur génération PDF:', error);
          return <span className="text-red-500">Erreur PDF</span>;
        }
        return loading ? 'Génération PDF...' : 'Télécharger PDF';
      }}
    </PDFDownloadLink>
  );
};
