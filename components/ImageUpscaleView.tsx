
import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { GoogleGenAI, Modality } from '@google/genai';
import { UploadIcon, DownloadIcon, SparklesIcon } from './IconComponents';

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

const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.width, height: img.height });
            URL.revokeObjectURL(img.src); // Clean up the object URL
        };
        img.onerror = (err) => reject(err);
        img.src = URL.createObjectURL(file);
    });
};


const Spinner: React.FC = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

export const ImageUpscaleView: React.FC = () => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [scaleFactor, setScaleFactor] = useState<2 | 4 | 8>(2);

    const [isUpscaling, setIsUpscaling] = useState(false);
    const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
    const [upscaledImageUrl, setUpscaledImageUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        if (imageFile) {
            const url = URL.createObjectURL(imageFile);
            setOriginalImageUrl(url);
            setUpscaledImageUrl(null); // Reset result when new image is uploaded
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

    const handleUpscale = async () => {
        if (!imageFile) return;

        setIsUpscaling(true);
        setError(null);
        setUpscaledImageUrl(null);

        try {
            const { width, height } = await getImageDimensions(imageFile);
            const targetWidth = width * scaleFactor;
            const targetHeight = height * scaleFactor;

            const base64Data = await fileToBase64(imageFile);
            const prompt = `Crucial : Agrandis cette image. Les dimensions de l'image originale sont de ${width}x${height} pixels. Les dimensions de sortie requises sont exactement de ${targetWidth}x${targetHeight} pixels. Ne modifie pas le rapport d'aspect. Préserve tous les détails et le style artistique d'origine. N'ajoute, ne supprime et ne modifie aucun élément de l'image. L'image de sortie doit avoir les dimensions exactes de ${targetWidth}x${targetHeight}.`;

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

            // 1. Check for upstream blocking
            const promptBlockReason = response.promptFeedback?.blockReason;
            if (promptBlockReason) {
                const promptSafetyRatings = response.promptFeedback?.safetyRatings;
                const blockedCategories = promptSafetyRatings?.filter(r => r.blocked).map(r => r.category).join(', ');
                throw new Error(`La requête a été bloquée en amont. Raison : ${promptBlockReason}. ${blockedCategories ? `Catégories de sécurité : ${blockedCategories}.` : ''}`);
            }

            // 2. Check for candidates
            if (!response.candidates || response.candidates.length === 0) {
                throw new Error("L'API n'a retourné aucune réponse. Le contenu a peut-être été entièrement bloqué.");
            }

            // 3. Inspect the first candidate
            const candidate = response.candidates[0];
            const finishReason = candidate.finishReason;
            
            // 4. Handle non-STOP finish reasons
            if (finishReason && finishReason !== 'STOP' && finishReason !== 'FINISH_REASON_UNSPECIFIED') {
                if (finishReason === 'SAFETY') {
                    const safetyRatings = candidate.safetyRatings;
                    const blockedCategories = safetyRatings?.filter(r => r.blocked).map(r => r.category).join(', ');
                    throw new Error(`La réponse a été bloquée pour des raisons de sécurité. ${blockedCategories ? `Catégories : ${blockedCategories}.` : 'Veuillez essayer une autre image.'}`);
                }
                if (finishReason === 'NO_IMAGE') {
                    if (response.text) {
                        throw new Error(`L'IA a refusé de générer une image et a répondu : "${response.text}"`);
                    } else {
                        throw new Error("L'IA n'a pas pu générer d'image pour cette requête, possiblement car la tâche était jugée irréalisable.");
                    }
                }
                throw new Error(`La génération d'image a été interrompue. Raison : ${finishReason}.`);
            }
            
            // 5. Look for image content if generation seems successful
            const imagePart = candidate.content?.parts?.find(p => p.inlineData);

            if (imagePart?.inlineData) {
                const base64ImageBytes: string = imagePart.inlineData.data;
                const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${base64ImageBytes}`;
                setUpscaledImageUrl(imageUrl);
            } else {
                // Fallback: if no image part, check for text explanation
                if (response.text) {
                    throw new Error(`L'IA n'a pas retourné d'image mais un message : "${response.text}"`);
                }
                throw new Error("L'API n'a pas retourné d'image et n'a fourni aucune explication. Le contenu a peut-être été bloqué, ou la tâche jugée irréalisable.");
            }

        } catch (e: any) {
            console.error(e);
            setError(`Une erreur est survenue: ${e.message || 'Veuillez réessayer.'}`);
        } finally {
            setIsUpscaling(false);
        }
    };

    const handleDownload = () => {
        if (!upscaledImageUrl) return;
        const link = document.createElement('a');
        link.href = upscaledImageUrl;
        link.download = `upscaled-${imageFile?.name || 'image.png'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <h2 className="text-2xl font-semibold mb-4 text-center text-slate-100 flex items-center justify-center gap-3">
                <SparklesIcon className="w-7 h-7" />
                Agrandir l'Image avec l'IA
            </h2>
            <p className="text-center text-slate-400 mb-6">Améliorez la résolution de vos images grâce à l'intelligence artificielle.</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Controls */}
                <div className="flex flex-col space-y-6">
                    <div>
                        <label className="block text-lg font-semibold text-slate-200 mb-2">1. Téléversez une image</label>
                        {!originalImageUrl ? (
                            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-indigo-500 bg-slate-800' : 'border-slate-600 hover:border-indigo-400'}`}>
                                <input {...getInputProps()} />
                                <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
                                <p className="mt-2 text-slate-400">{isDragActive ? 'Déposez l\'image ici...' : 'Glissez-déposez ou cliquez'}</p>
                            </div>
                        ) : (
                            <div className="relative">
                                <img src={originalImageUrl} alt="Original" className="w-full h-auto rounded-lg max-h-64 object-contain bg-slate-900/50" />
                                <button onClick={() => setImageFile(null)} className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {imageFile && (
                        <>
                           <div>
                                <label className="block text-lg font-semibold text-slate-200 mb-3">2. Choisissez les options</label>
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-medium text-slate-300 mb-2">Facteur d'agrandissement</h4>
                                        <div className="flex justify-around bg-slate-900/50 p-1 rounded-lg">
                                            {[2, 4, 8].map(factor => (
                                                <button key={factor} onClick={() => setScaleFactor(factor as 2|4|8)} className={`w-full py-2 text-sm font-semibold rounded-md transition-colors ${scaleFactor === factor ? 'bg-indigo-600 text-white' : 'hover:bg-slate-700'}`}>
                                                    x{factor}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-2 text-center">
                                            Doublez (x2), quadruplez (x4) ou octuplez (x8) la résolution par rapport à l'original.
                                        </p>
                                    </div>
                                </div>
                           </div>

                           <button
                                onClick={handleUpscale}
                                disabled={isUpscaling}
                                className="w-full px-8 py-4 bg-cyan-500 text-white font-bold text-lg rounded-lg hover:bg-cyan-600 disabled:bg-cyan-800/50 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-cyan-500/20 disabled:shadow-none flex items-center justify-center gap-3"
                            >
                                {isUpscaling ? <><Spinner /> Agrandissement en cours...</> : "Agrandir l'Image"}
                            </button>
                        </>
                    )}
                </div>

                {/* Result */}
                <div className="flex flex-col items-center justify-center bg-slate-900/50 border border-slate-700 rounded-lg p-4 min-h-[300px] lg:min-h-full">
                    {isUpscaling && (
                        <div className="text-center">
                           <div className="flex justify-center"><Spinner /></div>
                           <p className="mt-2 text-slate-300">L'IA travaille sur votre image...</p>
                           <p className="text-sm text-slate-400 mt-1">Cela peut prendre un moment.</p>
                        </div>
                    )}
                    {!isUpscaling && upscaledImageUrl && originalImageUrl && (
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
                                    <h4 className="text-center font-semibold text-slate-300">Après (x{scaleFactor})</h4>
                                     <div className="aspect-square bg-black/20 rounded-lg flex items-center justify-center p-1">
                                      <img src={upscaledImageUrl} alt="Upscaled" className="max-w-full max-h-full rounded-md object-contain"/>
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleDownload} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors mt-2">
                                <DownloadIcon className="w-5 h-5"/>
                                Télécharger l'image améliorée
                            </button>
                        </div>
                    )}
                    {!isUpscaling && !upscaledImageUrl && (
                        <div className="text-center text-slate-400 p-4">
                           <SparklesIcon className="w-16 h-16 mx-auto text-slate-500"/>
                           <p className="mt-4 font-semibold text-slate-300">Votre image améliorée apparaîtra ici.</p>
                           <p className="text-sm mt-1">Téléversez une image, choisissez vos options et lancez le processus pour voir la magie opérer.</p>
                        </div>
                    )}
                </div>
            </div>
            
            {error && <p className="mt-4 text-center text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p>}
        </div>
    );
};
