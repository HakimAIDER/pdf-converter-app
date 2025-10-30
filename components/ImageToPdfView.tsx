
import React, { useState } from 'react';
import { ImageUploader } from './ImageUploader';
import { DownloadIcon } from './IconComponents';

// Déclare que jspdf peut exister sur l'objet window
declare global {
  interface Window {
    jspdf: any;
  }
}

const Spinner: React.FC = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

export const ImageToPdfView: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [orientation, setOrientation] = useState<'p' | 'l'>('p');
  const [pageSize, setPageSize] = useState<string>('a4');
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async () => {
    if (files.length === 0) {
      setError("Veuillez d'abord télécharger des images.");
      return;
    }
    setIsConverting(true);
    setError(null);

    try {
      if (typeof window.jspdf === 'undefined') {
        throw new Error("La bibliothèque PDF (jsPDF) n'a pas pu être chargée. Veuillez rafraîchir la page.");
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: pageSize,
      });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        const imageDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result as string);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });

        const img = new Image();
        const imgDimensions = await new Promise<{width: number, height: number}>((resolve) => {
            img.onload = () => resolve({width: img.width, height: img.height});
            img.src = imageDataUrl;
        });

        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = doc.internal.pageSize.getHeight();

        const ratio = Math.min(pdfWidth / imgDimensions.width, pdfHeight / imgDimensions.height);
        
        const imgWidthOnPdf = imgDimensions.width * ratio;
        const imgHeightOnPdf = imgDimensions.height * ratio;

        const x = (pdfWidth - imgWidthOnPdf) / 2;
        const y = (pdfHeight - imgHeightOnPdf) / 2;

        if (i > 0) {
          doc.addPage(pageSize, orientation);
        }

        doc.addImage(imageDataUrl, x, y, imgWidthOnPdf, imgHeightOnPdf);
      }

      doc.save('converted-images.pdf');
    } catch (e: any) {
      console.error("Erreur lors de la conversion des images en PDF:", e);
      setError(`Une erreur est survenue: ${e.message || 'Veuillez réessayer.'}`);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
      <h2 className="text-2xl font-semibold mb-4 text-center text-slate-100">Images en PDF</h2>
      <ImageUploader files={files} onFilesChange={(f) => { setFiles(f); setError(null); }} />
      
      {files.length > 0 && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
          <div>
            <label htmlFor="pageSize" className="block text-sm font-medium text-slate-300">Taille de la page</label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base rounded-md bg-slate-700 text-white border-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-400"
            >
              <option value="a4">A4</option>
              <option value="letter">Letter</option>
              <option value="a3">A3</option>
              <option value="a5">A5</option>
            </select>
          </div>
          <div>
            <label htmlFor="orientation" className="block text-sm font-medium text-slate-300">Orientation</label>
            <select
              id="orientation"
              value={orientation}
              onChange={(e) => setOrientation(e.target.value as 'p' | 'l')}
              className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base rounded-md bg-slate-700 text-white border-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-400"
            >
              <option value="p">Portrait</option>
              <option value="l">Paysage</option>
            </select>
          </div>
        </div>
      )}
      
      {error && <p className="mt-4 text-center text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p>}

      <div className="mt-6 text-center">
        <button
          onClick={handleConvert}
          disabled={files.length === 0 || isConverting}
          className="px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-slate-500 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-indigo-500/20 disabled:shadow-none flex items-center justify-center gap-3 mx-auto"
        >
          {isConverting ? <><Spinner /> Conversion en cours...</> : <><DownloadIcon className="w-5 h-5" /> Convertir & Télécharger</>}
        </button>
      </div>
    </div>
  );
};
