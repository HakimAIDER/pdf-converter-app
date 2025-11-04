
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { GoogleGenAI, Modality } from '@google/genai';
import { 
    UploadIcon, DownloadIcon, SparklesIcon, CropIcon, QualityIcon, MagicWandIcon,
    RotateCwIcon, RotateCcwIcon, FlipHorizontalIcon, FlipVerticalIcon, TransformIcon, DeleteIcon
} from './IconComponents';

// --- Helper Functions ---
const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

const dataUrlToBase64 = (dataUrl: string): string => {
    return dataUrl.split(',')[1];
};

// --- Child Components ---
const Spinner: React.FC = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

const ComparisonSlider: React.FC<{ before: string; after: string }> = ({ before, after }) => {
    const [sliderPosition, setSliderPosition] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMove = (clientX: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        let newPosition = (x / rect.width) * 100;
        if (newPosition < 0) newPosition = 0;
        if (newPosition > 100) newPosition = 100;
        setSliderPosition(newPosition);
    };

    const handleMouseMove = (e: React.MouseEvent) => handleMove(e.clientX);
    const handleTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);

    return (
        <div 
            ref={containerRef} 
            className="relative w-full aspect-video select-none cursor-ew-resize overflow-hidden rounded-lg checkerboard-bg"
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
        >
            <img src={before} alt="Avant" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
            <div
                className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
                <img src={after} alt="Après" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
            </div>
            <div
                className="absolute top-0 bottom-0 w-1 bg-cyan-400 cursor-ew-resize pointer-events-none shadow-lg"
                style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
            >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-1/2 h-8 w-8 rounded-full bg-cyan-400 border-2 border-slate-900 flex items-center justify-center">
                    <svg className="w-4 h-4 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
                </div>
            </div>
        </div>
    );
};


type EditorTab = 'crop' | 'transform' | 'filters' | 'ai';
type CropHandle = 'top-left' | 'top-middle' | 'top-right' | 'right-middle' | 'bottom-right' | 'bottom-middle' | 'bottom-left' | 'left-middle' | 'move';
type AiTool = 'enhance' | 'upscale' | 'remove-bg' | 'remove-object';


// --- Main Component ---
export const ImageEditorView: React.FC = () => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [originalImageForCompare, setOriginalImageForCompare] = useState<string | null>(null);
    
    const [activeTab, setActiveTab] = useState<EditorTab>('crop');
    
    // Filters State
    const [filters, setFilters] = useState({ brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0 });

    // Crop State
    const [crop, setCrop] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
    const [activeHandle, setActiveHandle] = useState<CropHandle | null>(null);
    const [dragStart, setDragStart] = useState<{ x: number, y: number, crop: { x: number, y: number, width: number, height: number } } | null>(null);
    
    // AI State
    const [isProcessing, setIsProcessing] = useState(false);
    const [aiResultUrl, setAiResultUrl] = useState<string | null>(null);
    const [activeAiTool, setActiveAiTool] = useState<AiTool>('enhance');
    const [aiScale, setAiScale] = useState<2 | 4>(2);
    const [objectToRemove, setObjectToRemove] = useState('');
    
    const [error, setError] = useState<string | null>(null);

    const imageRef = useRef<HTMLImageElement>(null);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            resetAll();
            setImageFile(file);
            const url = await fileToDataUrl(file);
            setImageUrl(url);
            setOriginalImageForCompare(url);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] }, multiple: false });

    useEffect(() => {
        const initCrop = () => {
            if (imageUrl && imageRef.current && activeTab === 'crop') {
                const img = imageRef.current;
                setCrop({ x: 0, y: 0, width: img.clientWidth, height: img.clientHeight });
            }
        };
        
        const img = imageRef.current;
        if (img?.complete) {
            initCrop();
        } else if (img) {
            img.onload = initCrop;
        }
        window.addEventListener('resize', initCrop);
        return () => window.removeEventListener('resize', initCrop);
    }, [imageUrl, activeTab]);

    const resetAll = () => {
        setImageFile(null); setImageUrl(null); setOriginalImageForCompare(null);
        setFilters({ brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0 });
        setCrop(null); setActiveHandle(null); setDragStart(null);
        setIsProcessing(false); setAiResultUrl(null); setError(null);
        setObjectToRemove('');
    };
    
    const applyChangeToImageUrl = (newUrl: string) => {
        setImageUrl(newUrl);
        setOriginalImageForCompare(newUrl);
        setFilters({ brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0 }); // Reset filters after destructive change
        setCrop(null); // Will be re-initialized
    }
    
    const handleApplyFiltersAndCrop = () => {
        if (!imageUrl || !imageRef.current) return;

        const image = new Image();
        image.src = imageUrl;
        image.onload = () => {
            const naturalWidth = image.naturalWidth;
            const displayedWidth = imageRef.current!.clientWidth;
            const finalCrop = crop || { x: 0, y: 0, width: displayedWidth, height: displayedWidth * (image.naturalHeight / image.naturalWidth) };
    
            const scaleX = naturalWidth / displayedWidth;
    
            const sourceX = finalCrop.x * scaleX;
            const sourceY = finalCrop.y * scaleX;
            const sourceWidth = finalCrop.width * scaleX;
            const sourceHeight = finalCrop.height * scaleX;
    
            const canvas = document.createElement('canvas');
            canvas.width = sourceWidth;
            canvas.height = sourceHeight;
            const ctx = canvas.getContext('2d');
            if(!ctx) return;
    
            ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%)`;
            ctx.drawImage( image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight );
    
            applyChangeToImageUrl(canvas.toDataURL(imageFile?.type || 'image/png'));
        };
    };

    const handleTransform = (type: 'rotate-cw' | 'rotate-ccw' | 'flip-h' | 'flip-v') => {
        if (!imageUrl) return;
        const image = new Image();
        image.src = imageUrl;
        image.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            if (type === 'rotate-cw' || type === 'rotate-ccw') {
                canvas.width = image.height;
                canvas.height = image.width;
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(type === 'rotate-cw' ? 90 * Math.PI / 180 : -90 * Math.PI / 180);
                ctx.drawImage(image, -image.width / 2, -image.height / 2);
            } else { // Flip
                canvas.width = image.width;
                canvas.height = image.height;
                ctx.translate(type === 'flip-h' ? canvas.width : 0, type === 'flip-v' ? canvas.height : 0);
                ctx.scale(type === 'flip-h' ? -1 : 1, type === 'flip-v' ? -1 : 1);
                ctx.drawImage(image, 0, 0);
            }
            applyChangeToImageUrl(canvas.toDataURL(imageFile?.type || 'image/png'));
        };
    };

    const handleCropMouseDown = useCallback((e: React.MouseEvent, handle: CropHandle) => {
        e.stopPropagation();
        e.preventDefault();
        if (!crop) return;
        setActiveHandle(handle);
        setDragStart({ x: e.clientX, y: e.clientY, crop });
    }, [crop]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!activeHandle || !dragStart || !crop || !imageRef.current) return;
        
        let newCrop = { ...crop };
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        const { clientWidth: imgW, clientHeight: imgH } = imageRef.current;

        if (activeHandle === 'move') {
            newCrop.x = dragStart.crop.x + dx;
            newCrop.y = dragStart.crop.y + dy;
        } else {
            if (activeHandle.includes('left')) { newCrop.x = dragStart.crop.x + dx; newCrop.width = dragStart.crop.width - dx; }
            if (activeHandle.includes('right')) { newCrop.width = dragStart.crop.width + dx; }
            if (activeHandle.includes('top')) { newCrop.y = dragStart.crop.y + dy; newCrop.height = dragStart.crop.height - dy; }
            if (activeHandle.includes('bottom')) { newCrop.height = dragStart.crop.height + dy; }
        }
        
        // Clamp position and size
        if (newCrop.x < 0) { if(activeHandle !== 'move') newCrop.width += newCrop.x; newCrop.x = 0; }
        if (newCrop.y < 0) { if(activeHandle !== 'move') newCrop.height += newCrop.y; newCrop.y = 0; }
        if (newCrop.width < 20) { if(activeHandle !== 'move') newCrop.x -= (20 - newCrop.width); newCrop.width = 20; }
        if (newCrop.height < 20) { if(activeHandle !== 'move') newCrop.y -= (20 - newCrop.height); newCrop.height = 20; }
        if (newCrop.x + newCrop.width > imgW) { if(activeHandle === 'move') newCrop.x = imgW - newCrop.width; else newCrop.width = imgW - newCrop.x; }
        if (newCrop.y + newCrop.height > imgH) { if(activeHandle === 'move') newCrop.y = imgH - newCrop.height; else newCrop.height = imgH - newCrop.y; }

        setCrop(newCrop);
    }, [activeHandle, dragStart, crop]);
    
    const handleMouseUp = useCallback(() => setActiveHandle(null), []);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);
    
    const handleAiAction = async () => {
        if (!imageUrl) return;
        setIsProcessing(true); setError(null); setAiResultUrl(null);
        
        try {
            const base64Data = dataUrlToBase64(imageUrl);
            let prompt = '';
            
            switch(activeAiTool) {
                case 'enhance':
                    prompt = "Améliore la qualité de cette image. Augmente la clarté, réduit le bruit, et corrige les couleurs et l'éclairage sans changer le contenu ou la résolution.";
                    break;
                case 'upscale':
                    const img = new Image(); img.src = imageUrl; await new Promise(r => img.onload = r);
                    const tW = img.width * aiScale, tH = img.height * aiScale;
                    prompt = `Agrandis cette image de sa taille originale de ${img.width}x${img.height} à exactement ${tW}x${tH} pixels. Améliore les détails pour correspondre à la nouvelle résolution.`;
                    break;
                case 'remove-bg':
                    prompt = "Supprime l'arrière-plan de cette image, en le rendant transparent. Le sujet doit être proprement isolé. Le résultat doit être un PNG.";
                    break;
                case 'remove-object':
                    if (!objectToRemove.trim()) throw new Error("Veuillez décrire l'objet à supprimer.");
                    prompt = `Supprime l'objet '${objectToRemove}' de l'image. Remplis la zone de manière réaliste.`;
                    break;
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ inlineData: { data: base64Data, mimeType: imageFile?.type || 'image/png' } }, { text: prompt }] },
                config: { responseModalities: [Modality.IMAGE] },
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
                setAiResultUrl(`data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`);
            } else {
                // Fallback: if no image part, check for text explanation
                if (response.text) {
                    throw new Error(`L'IA n'a pas retourné d'image mais un message : "${response.text}"`);
                }
                throw new Error("L'API n'a pas retourné d'image et n'a fourni aucune explication. Le contenu a peut-être été bloqué, ou la tâche jugée irréalisable.");
            }
        } catch (e: any) {
            setError(`Erreur IA : ${e.message || 'Veuillez réessayer.'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        const urlToDownload = aiResultUrl || imageUrl;
        if (!urlToDownload) return;
        const link = document.createElement('a');
        link.href = urlToDownload;
        link.download = `edited-${imageFile?.name || 'image.png'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const cssFilters = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%)`;

    const tabs: { id: EditorTab; label: string; icon: React.FC<any> }[] = [
        { id: 'crop', label: 'Rogner', icon: CropIcon },
        { id: 'transform', label: 'Transformer', icon: TransformIcon },
        { id: 'filters', label: 'Filtres', icon: QualityIcon },
        { id: 'ai', label: 'IA', icon: SparklesIcon },
    ];

    const AiToolButton = ({ tool, label, icon: Icon }: {tool: AiTool, label: string, icon: React.FC<any>}) => (
        <button onClick={() => setActiveAiTool(tool)} className={`p-3 rounded-lg flex flex-col items-center justify-center gap-2 text-sm transition-colors w-full ${activeAiTool === tool ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
            <Icon className="w-6 h-6" />
            <span>{label}</span>
        </button>
    );

    const CropHandles = () => {
      if(!crop) return null;
      const handles: CropHandle[] = ['top-left', 'top-middle', 'top-right', 'right-middle', 'bottom-right', 'bottom-middle', 'bottom-left', 'left-middle'];
      return (
        <>
            {handles.map(handle => (
                 <div
                    key={handle}
                    onMouseDown={(e) => handleCropMouseDown(e, handle)}
                    className={`absolute w-4 h-4 bg-cyan-400 border-2 border-slate-900 rounded-full -m-2 z-10 
                        ${handle.includes('left') ? 'left-0' : handle.includes('right') ? 'left-full' : 'left-1/2'}
                        ${handle.includes('top') ? 'top-0' : handle.includes('bottom') ? 'top-full' : 'top-1/2'}
                        ${handle.endsWith('middle') ? (handle.startsWith('top') || handle.startsWith('bottom') ? 'cursor-ns-resize' : 'cursor-ew-resize') : ''}
                        ${handle === 'top-left' || handle === 'bottom-right' ? 'cursor-nwse-resize' : ''}
                        ${handle === 'top-right' || handle === 'bottom-left' ? 'cursor-nesw-resize' : ''}
                    `}
                    style={{ transform: handle.includes('middle') ? (handle.startsWith('top') || handle.startsWith('bottom') ? 'translateX(-50%)' : 'translateY(-50%)') : 'none' }}
                 ></div>
            ))}
        </>
      );
    };

    // --- Render Logic ---
    if (!imageUrl) return (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isDragActive ? 'border-indigo-500 bg-slate-800' : 'border-slate-600 hover:border-indigo-400'}`}>
                <input {...getInputProps()} />
                <UploadIcon className="mx-auto h-16 w-16 text-slate-400" />
                <p className="mt-4 text-xl font-semibold text-slate-300">Glissez-déposez une image</p>
                <p className="mt-1 text-slate-400">ou cliquez pour en sélectionner une</p>
            </div>
        </div>
    );
    
    return (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-900/50 p-4 rounded-lg flex items-center justify-center min-h-[50vh]">
                    {aiResultUrl && originalImageForCompare ? (
                        <ComparisonSlider before={originalImageForCompare} after={aiResultUrl} />
                    ) : (
                        <div className="relative select-none max-w-full max-h-full">
                            <img ref={imageRef} src={imageUrl} alt="Aperçu" style={{ filter: cssFilters }} className="max-w-full max-h-[60vh] object-contain" />
                            {activeTab === 'crop' && crop && 
                                <div 
                                    className="absolute"
                                    style={{ left: crop.x, top: crop.y, width: crop.width, height: crop.height }}
                                    onMouseDown={(e) => handleCropMouseDown(e, 'move')}
                                >
                                    <div className="absolute inset-0 border-2 border-dashed border-cyan-400 pointer-events-none cursor-move"></div>
                                    <CropHandles/>
                                </div>
                            }
                        </div>
                    )}
                </div>

                <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
                    <div className="flex border-b border-slate-700 mb-4">
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-2 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === tab.id ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-white'}`}>
                                <tab.icon className="w-5 h-5" /> {tab.label}
                            </button>
                        ))}
                    </div>
                    
                    {error && <p className="mb-4 text-center text-red-400 bg-red-900/50 p-2 rounded-md text-sm">{error}</p>}

                    <div className="space-y-6 min-h-[250px]">
                        {activeTab === 'crop' && (
                            <div className="animate-fade-in space-y-4">
                                <p className="text-sm text-slate-400">Ajustez le cadre, puis appliquez.</p>
                                <button onClick={() => handleApplyFiltersAndCrop()} className="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-md hover:bg-indigo-700">Appliquer le Rognage</button>
                            </div>
                        )}
                        {activeTab === 'transform' && (
                             <div className="animate-fade-in space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => handleTransform('rotate-ccw')} className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 p-2.5 rounded-md"><RotateCcwIcon className="w-5 h-5"/> Pivoter G</button>
                                    <button onClick={() => handleTransform('rotate-cw')} className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 p-2.5 rounded-md"><RotateCwIcon className="w-5 h-5"/> Pivoter D</button>
                                    <button onClick={() => handleTransform('flip-h')} className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 p-2.5 rounded-md"><FlipHorizontalIcon className="w-5 h-5"/> Miroir H</button>
                                    <button onClick={() => handleTransform('flip-v')} className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 p-2.5 rounded-md"><FlipVerticalIcon className="w-5 h-5"/> Miroir V</button>
                                </div>
                            </div>
                        )}
                        {activeTab === 'filters' && (
                             <div className="animate-fade-in space-y-4">
                                {[['brightness', 'Luminosité'], ['contrast', 'Contraste'], ['saturate', 'Saturation']].map(([key, label]) => (
                                    <div key={key}>
                                        <label className="text-sm text-slate-300">{label} ({filters[key as keyof typeof filters]}%)</label>
                                        <input type="range" min="0" max="200" value={filters[key as keyof typeof filters]} onChange={e => setFilters(f => ({ ...f, [key]: Number(e.target.value) }))} className="w-full h-2 mt-1 bg-slate-700 rounded-lg" />
                                    </div>
                                ))}
                                <button onClick={() => handleApplyFiltersAndCrop()} className="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-md hover:bg-indigo-700">Appliquer les Filtres</button>
                            </div>
                        )}
                        {activeTab === 'ai' && (
                            <div className="animate-fade-in space-y-4">
                                <div className="grid grid-cols-2 gap-2">
                                    <AiToolButton tool="enhance" label="Améliorer" icon={QualityIcon} />
                                    <AiToolButton tool="upscale" label="Agrandir" icon={SparklesIcon} />
                                    <AiToolButton tool="remove-bg" label="Fond" icon={MagicWandIcon} />
                                    <AiToolButton tool="remove-object" label="Objet" icon={DeleteIcon} />
                                </div>
                                {activeAiTool === 'upscale' && (
                                    <div className="flex justify-around bg-slate-700 p-1 rounded-lg">
                                        {[2, 4].map(f => <button key={f} onClick={() => setAiScale(f as 2|4)} className={`w-full py-1 text-sm font-semibold rounded-md ${aiScale === f ? 'bg-indigo-600' : ''}`}>x{f}</button>)}
                                    </div>
                                )}
                                {activeAiTool === 'remove-object' && (
                                    <input type="text" value={objectToRemove} onChange={e => setObjectToRemove(e.target.value)} placeholder="Ex: le logo bleu en haut à gauche" className="w-full bg-slate-700 p-2 rounded-md" />
                                )}
                                <button onClick={handleAiAction} disabled={isProcessing} className="w-full bg-cyan-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
                                    {isProcessing ? <><Spinner/> Traitement...</> : "Lancer l'IA"}
                                </button>
                                {aiResultUrl && (
                                    <div className="border-t border-slate-700 pt-4 space-y-2">
                                        <button onClick={() => applyChangeToImageUrl(aiResultUrl)} className="w-full bg-green-600 text-white font-semibold py-2 rounded-md hover:bg-green-700">Accepter & Continuer</button>
                                        <button onClick={() => { setAiResultUrl(null); }} className="w-full bg-slate-600 text-white font-semibold py-2 rounded-md hover:bg-slate-500">Annuler</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-8 border-t border-slate-700 pt-6 space-y-3">
                        <button onClick={handleDownload} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2">
                           <DownloadIcon className="w-5 h-5"/> Télécharger
                       </button>
                       <button onClick={resetAll} className="w-full bg-red-600/80 text-white font-semibold py-2 rounded-md hover:bg-red-600">
                           Changer d'image
                       </button>
                   </div>
                </div>
            </div>
        </div>
    );
};
