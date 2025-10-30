import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { GoogleGenAI, Modality } from '@google/genai';
import { UploadIcon, DownloadIcon, MagicWandIcon } from './IconComponents';

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

const Spinner: React.FC = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

export const ImageRemoveLogoView: React.FC = () => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
    const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        if (imageFile) {
            const url = URL.createObjectURL(imageFile);
            setOriginalImageUrl(url);
            setProcessedImageUrl(null); // Reset result when new image is uploaded
            return () => URL.revokeObjectURL(url);
        } else {
            setOriginalImageUrl(null);
        }
    }, [imageFile]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setImageFile(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
        multiple: false
    });

    const handleRemoveLogo = async () => {
        if (!imageFile) return;

        setIsProcessing(true);
        setError(null);
        setProcessedImageUrl(null);

        try {
            const base64Data = await fileToBase64(imageFile);
            const prompt = "Remove any logos or watermarks from this image. Fill in the area where the logo or watermark was located so that it blends realistically and seamlessly with the surrounding background.";

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: {
                parts: [
                  { inlineData: { data: base64Data, mimeType: imageFile.type } },
                  { text: prompt },
                ],
              },
              config: {
                  responseModalities: [Modality.IMAGE],
              },
            });

            const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

            if (imagePart?.inlineData) {
                const base64ImageBytes: string = imagePart.inlineData.data;
                const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${base64ImageBytes}`;
                setProcessedImageUrl(imageUrl);
            } else {
                throw new Error("L'API n'a pas retourné d'image. Le contenu a peut-être été bloqué, le logo n'a pas été détecté, ou la réponse est dans un format inattendu.");
            }

        } catch (e: any) {
            console.error(e);
            setError(`Une erreur est survenue: ${e.message || 'Veuillez réessayer.'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!processedImageUrl) return;
        const link = document.createElement('a');
        link.href = processedImageUrl;
        link.download = `logo-removed-${imageFile?.name || 'image.png'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <h2 className="text-2xl font-semibold mb-4 text-center text-slate-100 flex items-center justify-center gap-3">
                <MagicWandIcon className="w-7 h-7" />
                Supprimer le Logo avec l'IA
            </h2>
            <p className="text-center text-slate-400 mb-6">Effacez les logos et filigranes de vos images en un clic.</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Controls */}
                <div className="flex flex-col space-y-6">
                    <div>
                        <label className="block text-lg font-semibold text-slate-200 mb-2">1. Téléversez votre image</label>
                        {!originalImageUrl ? (
                            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-indigo-500 bg-slate-800' : 'border-slate-600 hover:border-indigo-400'}`}>
                                <input {...getInputProps()} />
                                <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
                                <p className="mt-2 text-slate-400">{isDragActive ? 'Déposez l\'image ici...' : 'Glissez-déposez ou cliquez'}</p>
                            </div>
                        ) : (
                            <div className="relative">
                                <img src={originalImageUrl} alt="Original" className="w-full h-auto rounded-lg max-h-[400px] object-contain bg-slate-900/50" />
                                <button onClick={() => setImageFile(null)} className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {imageFile && (
                       <button
                            onClick={handleRemoveLogo}
                            disabled={isProcessing}
                            className="w-full px-8 py-4 bg-cyan-500 text-white font-bold text-lg rounded-lg hover:bg-cyan-600 disabled:bg-cyan-800/50 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-cyan-500/20 disabled:shadow-none flex items-center justify-center gap-3"
                        >
                            {isProcessing ? <><Spinner /> Suppression en cours...</> : "Supprimer le Logo"}
                        </button>
                    )}
                </div>

                {/* Result */}
                <div className="flex flex-col items-center justify-center bg-slate-900/50 border border-slate-700 rounded-lg p-4 min-h-[300px] lg:min-h-full">
                    {isProcessing && (
                        <div className="text-center">
                           <div className="flex justify-center"><Spinner /></div>
                           <p className="mt-2 text-slate-300">L'IA analyse et nettoie votre image...</p>
                           <p className="text-sm text-slate-400 mt-1">Cela peut prendre quelques instants.</p>
                        </div>
                    )}
                    {!isProcessing && processedImageUrl && originalImageUrl && (
                        <div className="w-full flex flex-col items-center space-y-4 animate-fade-in">
                            <h3 className="text-xl font-bold text-slate-100">Aperçu Avant / Après</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                <div className="space-y-2">
                                    <h4 className="text-center font-semibold text-slate-300">Avant</h4>
                                    <div className="aspect-square bg-black/20 rounded-lg flex items-center justify-center p-1">
                                      <img src={originalImageUrl} alt="Original" className="max-w-full max-h-full rounded-md object-contain"/>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-center font-semibold text-slate-300">Après</h4>
                                     <div className="aspect-square bg-black/20 rounded-lg flex items-center justify-center p-1">
                                      <img src={processedImageUrl} alt="Logo removed" className="max-w-full max-h-full rounded-md object-contain"/>
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleDownload} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors mt-2">
                                <DownloadIcon className="w-5 h-5"/>
                                Télécharger l'image propre
                            </button>
                        </div>
                    )}
                    {!isProcessing && !processedImageUrl && (
                        <div className="text-center text-slate-400 p-4">
                           <MagicWandIcon className="w-16 h-16 mx-auto text-slate-500"/>
                           <p className="mt-4 font-semibold text-slate-300">Votre image nettoyée apparaîtra ici.</p>
                           <p className="text-sm mt-1">Téléversez une image avec un logo pour commencer.</p>
                        </div>
                    )}
                </div>
            </div>
            
            {error && <p className="mt-4 text-center text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p>}
        </div>
    );
};