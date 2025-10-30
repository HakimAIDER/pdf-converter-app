import React, { useState } from 'react';
import { Header } from './components/Header';
import { ModeSelector } from './components/ModeSelector';
import { ImageToPdfView } from './components/ImageToPdfView';
import { PdfToImageView } from './components/PdfToImageView';
import { PdfToWordView } from './components/PdfToWordView';
import { WordToPdfView } from './components/WordToPdfView';
import { ImageToTextView } from './components/ImageToTextView';
import { PdfMergeView } from './components/PdfMergeView';

export type Mode = 'image-to-pdf' | 'pdf-to-image' | 'pdf-to-word' | 'word-to-pdf' | 'image-to-text' | 'pdf-merge';

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('image-to-pdf');

  const renderView = () => {
    switch (mode) {
      case 'image-to-pdf':
        return <ImageToPdfView />;
      case 'pdf-to-image':
        return <PdfToImageView />;
      case 'pdf-to-word':
        return <PdfToWordView />;
      case 'word-to-pdf':
        return <WordToPdfView />;
      case 'image-to-text':
        return <ImageToTextView />;
      case 'pdf-merge':
        return <PdfMergeView />;
      default:
        return <ImageToPdfView />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full text-white overflow-x-hidden">
      <Header />
      <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 pt-24">
        <div className="w-full max-w-4xl mx-auto animate-fade-in-down">
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400">
              Convertisseur de Fichiers Ultime
            </h1>
            <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
              Transformez vos images, PDF et documents Word avec une facilité déconcertante.
            </p>
          </div>
          <ModeSelector selectedMode={mode} onSelectMode={setMode} />
        </div>
        <div key={mode} className="mt-8 w-full max-w-4xl animate-fade-in">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;