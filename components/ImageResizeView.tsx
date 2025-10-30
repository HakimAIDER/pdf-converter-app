import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { GoogleGenAI, Modality } from '@google/genai';
import { UploadIcon, DownloadIcon, SparklesIcon, LockClosedIcon, LockOpenIcon } from './IconComponents';

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
            URL.revokeObjectURL(img.src);
        };
        img.onerror = (err) => reject(err);
        img.src = URL.createObjectURL(file);
    });
};

const Spinner: React.FC = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

export const ImageResizeView: React.FC = () => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
    const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);
    
    const [targetWidth, setTargetWidth] = useState<string>('');
    const [targetHeight, setTargetHeight] = useState<string>('');
    const [lockAspectRatio, setLockAspectRatio] = useState(true);

    const [isProcessing, setIsProcessing] = useState(false);
    const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const resetState = () => {
        setImageFile(null);
        setOriginalImageUrl(null);
        setOriginalDimensions(null);
        setTargetWidth('');
        setTargetHeight('');
        setProcessedImageUrl(null);
        setError(null);
        setIsProcessing(false);
    };
    
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            setImageFile(file);
            setProcessedImageUrl(null);
            setError(null);
            try {
                const dims = await getImageDimensions(file);
                setOriginalDimensions(dims);
                setTargetWidth(String(dims.width * 2));
                setTargetHeight(String(dims.height * 2));
            } catch (e) {
                setError("Impossible de lire les dimensions de l'image.");
            }
        }
    }, []);
    
    useEffect(() => {
        if (imageFile) {
            const url = URL.createObjectURL(imageFile);
            setOriginalImageUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setOriginalImageUrl(null);
        }
    }, [imageFile]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
        multiple: false
    });

    const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newWidth = e.target.value.replace(/[^0-9]/g, '');
        setTargetWidth(newWidth);
        if (lockAspectRatio && originalDimensions && newWidth) {
            const ratio = originalDimensions.height / originalDimensions.width;
            const newHeight = Math.round(Number(newWidth) * ratio);
            setTargetHeight(String(newHeight || ''));
        }
    };

    const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newHeight = e.target.value.replace(/[^0-9]/g, '');
        setTargetHeight(newHeight);
        if (lockAspectRatio && originalDimensions && newHeight) {
            const ratio = originalDimensions.width / originalDimensions.height;
            const newWidth = Math.round(Number(newHeight) * ratio);
            setTargetWidth(String(newWidth || ''));
        }
    };

    const handleResize = async () => {
        if (!imageFile || !originalDimensions || !targetWidth || !targetHeight) return;

        setIsProcessing(true);
        setError(null);
        setProcessedImageUrl(null);

        try {
            const finalTargetWidth = parseInt(targetWidth, 10);
            const finalTargetHeight = parseInt(targetHeight, 10);

            if (isNaN(finalTargetWidth) || isNaN(finalTargetHeight) || finalTargetWidth <= 0 || finalTargetHeight <= 0) {
                throw new Error("Les dimensions cibles ne sont pas valides.");
            }

            const base64Data = await fileToBase64(imageFile);
            const prompt = `Extrêmement important : redimensionnez cette image. Les dimensions originales sont ${originalDimensions.width}x${originalDimensions.height} pixels. Les dimensions de sortie requises sont exactement ${finalTargetWidth}x${finalTargetHeight} pixels. Préservez tous les détails et le style artistique d'origine. N'ajoutez, ne supprimez ou ne modifiez aucun élément de l'image. L'image de sortie doit avoir les dimensions exactes de ${finalTargetWidth}x${finalTargetHeight}. Ne rognez pas l'image.`;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: [{ inlineData: { data: base64Data, mimeType: imageFile.type } }, { text: prompt }] },
              config: { responseModalities: [Modality.IMAGE] },
            });

            const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

            if (imagePart?.inlineData) {
              const base64ImageBytes: string = imagePart.inlineData.data;
              const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${base64ImageBytes}`;
              setProcessedImageUrl(imageUrl);
            } else {
                throw new Error("L'API n'a pas retourné d'image. Le contenu a peut-être été bloqué ou la réponse est dans un format inattendu.");
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
        link.download = `resized-${imageFile?.name || 'image.png'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    return (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <h2 className="text-2xl font-semibold mb-4 text-center text-slate-100 flex items-center justify-center gap-3">
                <SparklesIcon className="w-7 h-7" />
                Redimensionner l'Image avec l'IA
            </h2>
            <p className="text-center text-slate-400 mb-6">Changez la taille de vos images sans perte de qualité visible.</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="flex flex-col space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-200 mb-2">1. Téléversez une image</h3>
                        {!originalImageUrl ? (
                            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-indigo-500 bg-slate-800' : 'border-slate-600 hover:border-indigo-400'}`}>
                                <input {...getInputProps()} />
                                <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
                                <p className="mt-2 text-slate-400">{isDragActive ? 'Déposez l\'image ici...' : 'Glissez-déposez ou cliquez'}</p>
                            </div>
                        ) : (
                            <div className="relative">
                                <img src={originalImageUrl} alt="Original" className="w-full h-auto rounded-lg max-h-64 object-contain bg-slate-900/50" />
                                <button onClick={resetState} className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {imageFile && originalDimensions && (
                        <>
                           <div>
                                <h3 className="text-lg font-semibold text-slate-200 mb-3">2. Définissez la nouvelle taille</h3>
                                <p className="text-sm text-slate-400 mb-3">Original : {originalDimensions.width} x {originalDimensions.height} px</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1">
                                        <label htmlFor="width" className="block text-sm font-medium text-slate-300">Largeur (px)</label>
                                        <input type="text" id="width" value={targetWidth} onChange={handleWidthChange} className="mt-1 w-full bg-slate-700 border-slate-600 rounded-md p-2" />
                                    </div>
                                    <button onClick={() => setLockAspectRatio(!lockAspectRatio)} className="mt-6 p-2 text-slate-300 hover:text-white transition-colors">
                                        {lockAspectRatio ? <LockClosedIcon className="w-6 h-6"/> : <LockOpenIcon className="w-6 h-6"/>}
                                    </button>
                                    <div className="flex-1">
                                        <label htmlFor="height" className="block text-sm font-medium text-slate-300">Hauteur (px)</label>
                                        <input type="text" id="height" value={targetHeight} onChange={handleHeightChange} className="mt-1 w-full bg-slate-700 border-slate-600 rounded-md p-2" />
                                    </div>
                                </div>
                           </div>

                           <button onClick={handleResize} disabled={isProcessing} className="w-full px-8 py-4 bg-cyan-500 text-white font-bold text-lg rounded-lg hover:bg-cyan-600 disabled:bg-cyan-800/50 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-cyan-500/20 disabled:shadow-none flex items-center justify-center gap-3">
                                {isProcessing ? <><Spinner /> Redimensionnement...</> : "Redimensionner l'Image"}
                            </button>
                        </>
                    )}
                </div>
                
                <div className="flex flex-col items-center justify-center bg-slate-900/50 border border-slate-700 rounded-lg p-4 min-h-[300px] lg:min-h-full">
                    {isProcessing && <div className="text-center"><div className="flex justify-center"><Spinner /></div><p className="mt-2 text-slate-300">L'IA travaille sur votre image...</p></div>}
                    {!isProcessing && processedImageUrl && (
                        <div className="w-full flex flex-col items-center space-y-4 animate-fade-in">
                            <img src={processedImageUrl} alt="Processed" className="max-w-full max-h-80 rounded-md object-contain"/>
                            <button onClick={handleDownload} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors mt-2">
                                <DownloadIcon className="w-5 h-5"/>
                                Télécharger l'image
                            </button>
                        </div>
                    )}
                    {!isProcessing && !processedImageUrl && (
                        <div className="text-center text-slate-400 p-4">
                           <SparklesIcon className="w-16 h-16 mx-auto text-slate-500"/>
                           <p className="mt-4 font-semibold text-slate-300">Votre image redimensionnée apparaîtra ici.</p>
                        </div>
                    )}
                </div>
            </div>
            {error && <p className="mt-4 text-center text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p>}
        </div>
    );
};