import React, { useState } from 'react';
import { ImageUploader } from './ImageUploader';

export const ImageToPdfView: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isConverting, setIsConverting] = useState(false);

  const handleConvert = () => {
    if (files.length === 0) {
      alert("Veuillez d'abord télécharger des images.");
      return;
    }
    setIsConverting(true);
    console.log("Converting images to PDF...", files);
    // Placeholder for conversion logic
    setTimeout(() => {
      setIsConverting(false);
      alert("Conversion terminée ! (simulation)");
    }, 2000);
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
      <h2 className="text-2xl font-semibold mb-4 text-center text-slate-100">Images en PDF</h2>
      <ImageUploader files={files} onFilesChange={setFiles} />
      <div className="mt-6 text-center">
        <button
          onClick={handleConvert}
          disabled={files.length === 0 || isConverting}
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
        >
          {isConverting ? 'Conversion en cours...' : 'Convertir en PDF'}
        </button>
      </div>
    </div>
  );
};