import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { GoogleGenAI, Modality } from '@google/genai';
import { UploadIcon, DownloadIcon, UserCircleIcon } from './IconComponents';

type Attire = "Costume et cravate" | "Chemisier élégant" | "Chemise décontractée" | "Col roulé sobre";
type Background = "Bureau moderne (flou)" | "Extérieur nature (flou)" | "Studio (gris neutre)" | "Mur de briques";
type Style = "Corporate / Classique" | "Créatif / Artistique" | "Tech / Amical";

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

export const ProfessionalPhotoView: React.FC = () => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
    const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [attire, setAttire] = useState<Attire>("Costume et cravate");
    const [background, setBackground] = useState<Background>("Bureau moderne (flou)");
    const [style, setStyle] = useState<Style>("Corporate / Classique");
    
    useEffect(() => {
        if (imageFile) {
            const url = URL.createObjectURL(imageFile);
            setOriginalImageUrl(url);
            setProcessedImageUrl(null);
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

    const handleGenerate = async () => {
        if (!imageFile) return;

        setIsProcessing(true);
        setError(null);
        setProcessedImageUrl(null);

        try {
            const base64Data = await fileToBase64(imageFile);
            const prompt = `Transforme ce selfie en une photo de portrait professionnelle pour un profil LinkedIn. Le visage, les traits et l'expression du sujet doivent être parfaitement préservés. Changez la tenue pour une tenue de type "${attire}". Remplacez l'arrière-plan par un arrière-plan professionnel de type "${background}". L'éclairage doit être doux et flatteur, typique d'un portrait de studio professionnel. Le style général doit être "${style}". Ne modifiez pas l'identité de la personne. L'image finale doit être un portrait d'entreprise réaliste et de haute qualité.`;

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
        link.download = `professional-photo-${imageFile?.name || 'image.png'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const OptionsGroup = ({ title, options, selected, onSelect }: { title: string, options: string[], selected: string, onSelect: (val: any) => void }) => (
        <div>
            <h4 className="font-medium text-slate-300 mb-2">{title}</h4>
            <div className="flex flex-wrap gap-2">
                {options.map(opt => (
                    <button key={opt} onClick={() => onSelect(opt)} className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors ${selected === opt ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <h2 className="text-2xl font-semibold mb-4 text-center text-slate-100 flex items-center justify-center gap-3">
                <UserCircleIcon className="w-8 h-8" />
                Créateur de Portrait Pro IA
            </h2>
            <p className="text-center text-slate-400 mb-6">Transformez un selfie en photo de profil professionnelle pour LinkedIn.</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="flex flex-col space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-200 mb-2">1. Téléversez un selfie</h3>
                        {!originalImageUrl ? (
                            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-indigo-500 bg-slate-800' : 'border-slate-600 hover:border-indigo-400'}`}>
                                <input {...getInputProps()} />
                                <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
                                <p className="mt-2 text-slate-400">{isDragActive ? 'Déposez le selfie ici...' : 'Glissez-déposez ou cliquez'}</p>
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
                       <>
                         <div>
                            <h3 className="text-lg font-semibold text-slate-200 mb-3">2. Personnalisez votre portrait</h3>
                            <div className="space-y-4 bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                                <OptionsGroup title="Tenue" options={["Costume et cravate", "Chemisier élégant", "Chemise décontractée", "Col roulé sobre"]} selected={attire} onSelect={setAttire} />
                                <OptionsGroup title="Arrière-plan" options={["Bureau moderne (flou)", "Extérieur nature (flou)", "Studio (gris neutre)", "Mur de briques"]} selected={background} onSelect={setBackground} />
                                <OptionsGroup title="Style" options={["Corporate / Classique", "Créatif / Artistique", "Tech / Amical"]} selected={style} onSelect={setStyle} />
                            </div>
                         </div>

                       <button
                            onClick={handleGenerate}
                            disabled={isProcessing}
                            className="w-full px-8 py-4 bg-cyan-500 text-white font-bold text-lg rounded-lg hover:bg-cyan-600 disabled:bg-cyan-800/50 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-cyan-500/20 disabled:shadow-none flex items-center justify-center gap-3"
                        >
                            {isProcessing ? <><Spinner /> Transformation en cours...</> : "Générer le Portrait Pro"}
                        </button>
                       </>
                    )}
                </div>

                <div className="flex flex-col items-center justify-center bg-slate-900/50 border border-slate-700 rounded-lg p-4 min-h-[300px] lg:min-h-full">
                    {isProcessing && (
                        <div className="text-center">
                           <div className="flex justify-center"><Spinner /></div>
                           <p className="mt-2 text-slate-300">L'IA prépare votre portrait...</p>
                           <p className="text-sm text-slate-400 mt-1">Cela peut prendre quelques instants.</p>
                        </div>
                    )}
                    {!isProcessing && processedImageUrl && originalImageUrl && (
                        <div className="w-full flex flex-col items-center space-y-4 animate-fade-in">
                            <h3 className="text-xl font-bold text-slate-100">Avant / Après</h3>
                            <div className="grid grid-cols-2 gap-4 w-full">
                                <div className="space-y-2">
                                    <h4 className="text-center font-semibold text-slate-300 text-sm">Original</h4>
                                    <div className="aspect-square bg-black/20 rounded-lg flex items-center justify-center p-1">
                                      <img src={originalImageUrl} alt="Original" className="max-w-full max-h-full rounded-md object-contain"/>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-center font-semibold text-slate-300 text-sm">Professionnel</h4>
                                     <div className="aspect-square bg-black/20 rounded-lg flex items-center justify-center p-1">
                                      <img src={processedImageUrl} alt="Portrait professionnel" className="max-w-full max-h-full rounded-md object-contain"/>
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleDownload} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors mt-2">
                                <DownloadIcon className="w-5 h-5"/>
                                Télécharger
                            </button>
                        </div>
                    )}
                    {!isProcessing && !processedImageUrl && (
                        <div className="text-center text-slate-400 p-4">
                           <UserCircleIcon className="w-16 h-16 mx-auto text-slate-500"/>
                           <p className="mt-4 font-semibold text-slate-300">Votre portrait professionnel apparaîtra ici.</p>
                           <p className="text-sm mt-1">Téléversez un selfie et choisissez vos options pour commencer.</p>
                        </div>
                    )}
                </div>
            </div>
            
            {error && <p className="mt-4 text-center text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p>}
        </div>
    );
};