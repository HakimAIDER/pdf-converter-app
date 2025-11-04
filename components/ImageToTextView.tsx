
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
        text: 'Extrais tout le texte de cette image.',
      };
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
      });
      
      // 1. Vérifier si la requête a été bloquée en amont
      const promptBlockReason = response.promptFeedback?.blockReason;
      if (promptBlockReason) {
          const promptSafetyRatings = response.promptFeedback?.safetyRatings;
          const blockedCategories = promptSafetyRatings?.filter(r => r.blocked).map(r => r.category).join(', ');
          throw new Error(`La requête a été bloquée en amont. Raison : ${promptBlockReason}. ${blockedCategories ? `Catégories de sécurité : ${blockedCategories}.` : ''}`);
      }

      // 2. Vérifier s'il y a des réponses candidates
      if (!response.candidates || response.candidates.length === 0) {
          throw new Error("L'API n'a retourné aucune réponse candidate. Cela peut être dû à une erreur interne du service.");
      }

      // 3. Inspecter la première candidate
      const candidate = response.candidates[0];
      const finishReason = candidate.finishReason;

      if (finishReason && finishReason !== 'STOP' && finishReason !== 'FINISH_REASON_UNSPECIFIED') {
          if (finishReason === 'SAFETY') {
              const safetyRatings = candidate.safetyRatings;
              const blockedCategories = safetyRatings?.filter(r => r.blocked).map(r => r.category).join(', ');
              throw new Error(`La réponse générée a été bloquée pour des raisons de sécurité. ${blockedCategories ? `Catégories : ${blockedCategories}.` : ''} (Raison: ${finishReason})`);
          }
          throw new Error(`L'extraction de texte a été interrompue. Raison : ${finishReason}.`);
      }
      
      // 4. Si la génération semble réussie, chercher le contenu
      if (response.text) {
          setExtractedText(response.text);
      } else {
          throw new Error("Aucun texte n'a pu être extrait. Le modèle n'a retourné aucun contenu textuel.");
      }

    } catch (e: any) {
      console.error(e);
      setError(`Erreur lors de l'extraction du texte: ${e.message || 'Veuillez réessayer.'}`);
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
      
      {error && <p className="mt-4 text-center text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p>}
      
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
