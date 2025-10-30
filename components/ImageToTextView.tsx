import React, { useState } from 'react';
import { ImageUploader } from './ImageUploader';
import { GoogleGenAI } from '@google/genai';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = (reader.result as string).split(',')[1];
            resolve(result);
        };
        reader.onerror = (error) => reject(error);
    });
};

export const ImageToTextView: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [error, setError] = useState('');

  const handleExtractText = async () => {
    if (files.length === 0) {
      alert("Veuillez d'abord télécharger une image.");
      return;
    }
    setIsExtracting(true);
    setError('');
    setExtractedText('');

    try {
      const imageFile = files[0];
      const base64Data = await fileToBase64(imageFile);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: imageFile.type,
        },
      };
      const textPart = {
        text: 'Extract all text from this image.',
      };
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
      });
      const text = response.text;
      setExtractedText(text);
    } catch (e) {
      console.error(e);
      setError("Erreur lors de l'extraction du texte. Veuillez réessayer.");
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
      <h2 className="text-2xl font-semibold mb-4 text-center text-slate-100">Image en Texte (OCR)</h2>
      <ImageUploader files={files} onFilesChange={setFiles} />
      <div className="mt-6 text-center">
        <button
          onClick={handleExtractText}
          disabled={files.length === 0 || isExtracting}
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
        >
          {isExtracting ? 'Extraction en cours...' : 'Extraire le texte'}
        </button>
      </div>
      
      {error && <p className="mt-4 text-center text-red-400">{error}</p>}
      
      {extractedText && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-2 text-slate-200">Texte extrait :</h3>
          <div className="p-4 border border-slate-600 rounded-md bg-slate-900/50 max-h-60 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-slate-300">{extractedText}</pre>
          </div>
           <div className="mt-4 text-center">
            <button
                onClick={() => navigator.clipboard.writeText(extractedText)}
                className="px-4 py-2 bg-slate-600 text-slate-200 font-semibold rounded-md hover:bg-slate-500 transition-colors"
            >
                Copier le texte
            </button>
          </div>
        </div>
      )}
    </div>
  );
};