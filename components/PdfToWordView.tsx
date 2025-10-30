import React, { useState } from 'react';
import { PdfUploader } from './PdfUploader';

export const PdfToWordView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const handleConvert = () => {
    if (!file) {
      alert("Veuillez d'abord télécharger un fichier PDF.");
      return;
    }
    setIsConverting(true);
    console.log("Converting PDF to Word...", file);
    // Placeholder for conversion logic
    setTimeout(() => {
      setIsConverting(false);
      alert("Conversion terminée ! (simulation)");
    }, 2000);
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
      <h2 className="text-2xl font-semibold mb-4 text-center text-slate-100">PDF en Word</h2>
      <PdfUploader file={file} onFileChange={setFile} />
      <div className="mt-6 text-center">
        <button
          onClick={handleConvert}
          disabled={!file || isConverting}
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
        >
          {isConverting ? 'Conversion en cours...' : 'Convertir en Word'}
        </button>
      </div>
    </div>
  );
};