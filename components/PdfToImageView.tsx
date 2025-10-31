
import React, { useState } from 'react';
import { PdfUploader } from './PdfUploader';
import { DownloadIcon } from './IconComponents';

// Déclare que pdfjsLib et JSZip peuvent exister sur l'objet window
declare global {
  interface Window {
    pdfjsLib: any;
    JSZip: any;
  }
}

const Spinner: React.FC = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

export const PdfToImageView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageFormat, setImageFormat] = useState<'jpeg' | 'png'>('jpeg');
  const [quality, setQuality] = useState(0.92); // Pour JPEG
  const [resolutionScale, setResolutionScale] = useState<number>(2);

  const handleConvert = async () => {
    if (!file) {
      setError("Veuillez d'abord télécharger un fichier PDF.");
      return;
    }

    if (typeof window.pdfjsLib === 'undefined' || typeof window.JSZip === 'undefined') {
        setError("Une bibliothèque requise n'a pas pu être chargée. Veuillez rafraîchir la page.");
        return;
    }
    
    setIsConverting(true);
    setError(null);
    setImageUrls([]);

    try {
      const zip = new window.JSZip();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const newImageUrls: string[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: resolutionScale }); 
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        
        const blob = await new Promise<Blob | null>(resolve => 
          canvas.toBlob(resolve, `image/${imageFormat}`, quality)
        );
        
        if (blob) {
            const fileName = `${file.name.replace(/\.pdf$/i, '')}-page-${i}.${imageFormat}`;
            zip.file(fileName, blob);
            newImageUrls.push(URL.createObjectURL(blob));
        }
      }

      if (newImageUrls.length > 0) {
        setImageUrls(newImageUrls);
        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${file.name.replace(/\.pdf$/i, '')}-images.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error("Aucune page n'a pu être convertie.");
      }

    } catch (e: any) {
        console.error("Erreur lors de la conversion PDF vers images:", e);
        setError(`Une erreur est survenue: ${e.message || 'Veuillez vérifier que le PDF n\'est pas corrompu.'}`);
    } finally {
        setIsConverting(false);
    }
  };

  // Nettoyer les URLs d'objet lors du démontage ou du traitement d'un nouveau fichier
  React.useEffect(() => {
    return () => {
      imageUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imageUrls]);

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
      <h2 className="text-2xl font-semibold mb-4 text-center text-slate-100">PDF en Images</h2>
      <PdfUploader file={file} onFileChange={(f) => { setFile(f); setError(null); setImageUrls([]); }} />

      {file && (
        <div className="mt-6 animate-fade-in space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="imageFormat" className="block text-sm font-medium text-slate-300">Format de l'image</label>
              <select
                id="imageFormat"
                value={imageFormat}
                onChange={(e) => setImageFormat(e.target.value as 'jpeg' | 'png')}
                className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base rounded-md bg-slate-700 text-white border-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-400"
              >
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
              </select>
            </div>
            {imageFormat === 'jpeg' && (
               <div>
                  <label htmlFor="quality" className="block text-sm font-medium text-slate-300">Qualité ({Math.round(quality * 100)}%)</label>
                  <input
                      id="quality"
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.01"
                      value={quality}
                      onChange={(e) => setQuality(parseFloat(e.target.value))}
                      className="mt-1 w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Résolution de sortie</label>
            <div className="flex justify-around bg-slate-900/50 p-1 rounded-lg">
                {[
                    { scale: 1, label: 'Standard' },
                    { scale: 2, label: 'Haute' },
                    { scale: 4, label: 'Très Haute' }
                ].map(({ scale, label }) => (
                    <button
                        key={scale}
                        onClick={() => setResolutionScale(scale)}
                        className={`w-full py-2 text-sm font-semibold rounded-md transition-colors ${resolutionScale === scale ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                    >
                        {label} ({scale}x)
                    </button>
                ))}
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">
              Une résolution plus élevée produit des images plus nettes mais des fichiers plus lourds.
            </p>
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-center text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p>}

      <div className="mt-6 text-center">
        <button
          onClick={handleConvert}
          disabled={!file || isConverting}
          className="px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-slate-500 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-indigo-500/20 disabled:shadow-none flex items-center justify-center gap-3 mx-auto"
        >
          {isConverting ? <><Spinner /> Conversion en cours...</> : <><DownloadIcon className="w-5 h-5" /> Convertir & Télécharger (.zip)</>}
        </button>
      </div>

      {imageUrls.length > 0 && (
        <div className="mt-8 animate-fade-in">
            <h3 className="text-lg font-semibold text-slate-200 mb-4 text-center">Aperçu des images générées</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-96 overflow-y-auto p-4 bg-slate-900/50 rounded-lg">
                {imageUrls.map((url, index) => (
                    <div key={index} className="relative group aspect-w-1 aspect-h-1">
                        <img src={url} alt={`Page ${index + 1}`} className="w-full h-full object-contain rounded-md border border-slate-600" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white font-bold text-lg">Page {index + 1}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};
