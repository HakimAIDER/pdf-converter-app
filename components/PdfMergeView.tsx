import React, { useState, useRef } from 'react';
import { MultiPdfUploader } from './MultiPdfUploader';
import { DeleteIcon, DragHandleIcon } from './IconComponents';

// Déclarez que PDFLib peut exister sur l'objet window
declare global {
  interface Window {
    PDFLib: any;
  }
}

export const PdfMergeView: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pour le glisser-déposer
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const removeFile = (indexToRemove: number) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    
    const filesCopy = [...files];
    const draggedItemContent = filesCopy.splice(dragItem.current, 1)[0];
    filesCopy.splice(dragOverItem.current, 0, draggedItemContent);
    
    dragItem.current = null;
    dragOverItem.current = null;
    
    setFiles(filesCopy);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      setError("Veuillez téléverser au moins deux fichiers PDF à fusionner.");
      return;
    }

    if (typeof window.PDFLib === 'undefined') {
      setError("La bibliothèque de fusion PDF n'a pas pu être chargée. Veuillez rafraîchir la page et réessayer.");
      console.error("pdf-lib is not loaded on the window object.");
      return;
    }

    setIsMerging(true);
    setError(null);

    try {
      const { PDFDocument } = window.PDFLib;
      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'merged.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (e) {
      console.error(e);
      setError("Une erreur est survenue lors de la fusion des PDF. Assurez-vous que les fichiers ne sont pas corrompus ou protégés par un mot de passe.");
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
      <h2 className="text-2xl font-semibold mb-4 text-center text-slate-100">Fusionner des fichiers PDF</h2>
      <p className="text-center text-slate-400 mb-6">Téléversez plusieurs PDF, réorganisez-les dans l'ordre souhaité, puis fusionnez-les en un seul fichier.</p>
      
      <MultiPdfUploader files={files} onFilesChange={setFiles} />

      {files.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-slate-200 mb-2">Fichiers à fusionner (glissez pour réorganiser) :</h3>
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg border border-slate-600 cursor-grab"
                draggable
                onDragStart={() => dragItem.current = index}
                onDragEnter={() => dragOverItem.current = index}
                onDragEnd={handleSort}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="flex items-center space-x-3">
                    <DragHandleIcon className="w-5 h-5 text-slate-400"/>
                    <span className="text-slate-200">{file.name}</span>
                </div>
                <button 
                  onClick={() => removeFile(index)} 
                  className="text-red-500 hover:text-red-400 transition-colors p-1 rounded-full hover:bg-red-500/10"
                  aria-label={`Supprimer ${file.name}`}
                >
                  <DeleteIcon className="w-5 h-5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="mt-4 text-center text-red-400">{error}</p>}

      <div className="mt-8 text-center">
        <button
          onClick={handleMerge}
          disabled={files.length < 2 || isMerging}
          className="px-8 py-4 bg-cyan-500 text-white font-bold text-lg rounded-lg hover:bg-cyan-600 disabled:bg-cyan-800/50 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-cyan-500/20 disabled:shadow-none"
        >
          {isMerging ? 'Fusion en cours...' : `Fusionner ${files.length} Fichiers`}
        </button>
      </div>
    </div>
  );
};