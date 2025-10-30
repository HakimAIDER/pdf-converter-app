import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { GoogleGenAI, Modality } from '@google/genai';
import { UploadIcon, DownloadIcon, SparklesIcon, CropIcon, LockClosedIcon, LockOpenIcon, QualityIcon } from './IconComponents';

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

const getImageDimensionsFromUrl = (url: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.src = url;
    });
};

// --- Child Components ---
const Spinner: React.FC = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

type EditorTab = 'crop' | 'filters' | 'ai';
type CropHandle = 'top-left' | 'top-middle' | 'top-right' | 'right-middle' | 'bottom-right' | 'bottom-middle' | 'bottom-left' | 'left-middle';

// --- Main Component ---
export const ImageEditorView: React.FC = () => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [originalImageForCompare, setOriginalImageForCompare] = useState<string | null>(null);
    
    const [activeTab, setActiveTab] = useState<EditorTab>('crop');
    
    // Filters State
    const [filters, setFilters] = useState({
        brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0,
    });

    // Crop State
    const [crop, setCrop] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
    const [activeHandle, setActiveHandle] = useState<CropHandle | null>(null);
    const [dragStart, setDragStart] = useState<{ x: number, y: number, crop: { x: number, y: number, width: number, height: number } } | null>(null);
    
    // AI State
    const [isProcessing, setIsProcessing] = useState(false);
    const [aiResultUrl, setAiResultUrl] = useState<string | null>(null);
    const [aiScale, setAiScale] = useState<2 | 4>(2);
    const [comparisonZoom, setComparisonZoom] = useState(1);
    
    const [error, setError] = useState<string | null>(null);

    const imageRef = useRef<HTMLImageElement>(null);
    const imageContainerRef = useRef<HTMLDivElement>(null);

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

    // Initialize crop box when image is loaded
    useEffect(() => {
        if (imageUrl && imageRef.current) {
            const img = imageRef.current;
            const handleLoad = () => {
                if (activeTab === 'crop') {
                    setCrop({
                        x: 0, y: 0,
                        width: img.clientWidth,
                        height: img.clientHeight,
                    });
                }
            };
            if (img.complete) {
                handleLoad();
            } else {
                img.addEventListener('load', handleLoad, { once: true });
            }
            return () => img.removeEventListener('load', handleLoad);
        }
    }, [imageUrl, activeTab]);

    const resetAll = () => {
        setImageFile(null);
        setImageUrl(null);
        setOriginalImageForCompare(null);
        setFilters({ brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0 });
        setCrop(null);
        setActiveHandle(null);
        setDragStart(null);
        setIsProcessing(false);
        setAiResultUrl(null);
        setError(null);
        setComparisonZoom(1);
    };

    const handleApplyCrop = () => {
        if (!crop || !imageUrl || !imageRef.current) return;
    
        const image = new Image();
        image.src = imageUrl;
        image.onload = () => {
            const displayedImage = imageRef.current!;
            const naturalWidth = image.naturalWidth;
            const naturalHeight = image.naturalHeight;
            const displayedWidth = displayedImage.clientWidth;
            const displayedHeight = displayedImage.clientHeight;
    
            const scaleX = naturalWidth / displayedWidth;
            const scaleY = naturalHeight / displayedHeight;
    
            const sourceX = crop.x * scaleX;
            const sourceY = crop.y * scaleY;
            const sourceWidth = crop.width * scaleX;
            const sourceHeight = crop.height * scaleY;
    
            const canvas = document.createElement('canvas');
            canvas.width = sourceWidth;
            canvas.height = sourceHeight;
            const ctx = canvas.getContext('2d');
            if(!ctx) return;
    
            ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%)`;
            
            ctx.drawImage(
                image,
                sourceX, sourceY, sourceWidth, sourceHeight,
                0, 0, sourceWidth, sourceHeight
            );
    
            const croppedImageUrl = canvas.toDataURL(imageFile?.type || 'image/png');
            setImageUrl(croppedImageUrl);
            setOriginalImageForCompare(croppedImageUrl);
            setFilters({ brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0 });
            setCrop(null); // Will be re-initialized by useEffect
        };
    };

    const handleMouseDownOnHandle = (e: React.MouseEvent, handle: CropHandle) => {
        e.preventDefault();
        e.stopPropagation();
        if (!crop) return;
        setActiveHandle(handle);
        setDragStart({ x: e.clientX, y: e.clientY, crop });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!activeHandle || !dragStart || !crop || !imageContainerRef.current) return;
    
        const { clientX, clientY } = e;
        const dx = clientX - dragStart.x;
        const dy = clientY - dragStart.y;
    
        let newCrop = { ...dragStart.crop };
    
        // Horizontal changes
        if (activeHandle.includes('left')) {
            newCrop.x = dragStart.crop.x + dx;
            newCrop.width = dragStart.crop.width - dx;
        } else if (activeHandle.includes('right')) {
            newCrop.width = dragStart.crop.width + dx;
        }
    
        // Vertical changes
        if (activeHandle.includes('top')) {
            newCrop.y = dragStart.crop.y + dy;
            newCrop.height = dragStart.crop.height - dy;
        } else if (activeHandle.includes('bottom')) {
            newCrop.height = dragStart.crop.height + dy;
        }
    
        const imageEl = imageRef.current;
        if (!imageEl) return;
        const imageWidth = imageEl.clientWidth;
        const imageHeight = imageEl.clientHeight;
        const minSize = 20;

        if (newCrop.width < minSize) {
            if(activeHandle.includes('left')) newCrop.x = newCrop.x + newCrop.width - minSize;
            newCrop.width = minSize;
        }
        if (newCrop.height < minSize) {
            if(activeHandle.includes('top')) newCrop.y = newCrop.y + newCrop.height - minSize;
            newCrop.height = minSize;
        }
        if (newCrop.x < 0) { newCrop.width += newCrop.x; newCrop.x = 0; }
        if (newCrop.y < 0) { newCrop.height += newCrop.y; newCrop.y = 0; }
        if (newCrop.x + newCrop.width > imageWidth) { newCrop.width = imageWidth - newCrop.x; }
        if (newCrop.y + newCrop.height > imageHeight) { newCrop.height = imageHeight - newCrop.y; }

        setCrop(newCrop);
    }, [activeHandle, dragStart, crop]);
    
    const handleMouseUp = useCallback(() => {
        setActiveHandle(null);
        setDragStart(null);
    }, []);

    useEffect(() => {
        if (activeHandle) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [activeHandle, handleMouseMove, handleMouseUp]);
    
     const handleAiEnhance = async () => {
        if (!imageUrl) return;
        setIsProcessing(true);
        setError(null);
        setAiResultUrl(null);
        setComparisonZoom(1);
        
        try {
            const dimensions = await getImageDimensionsFromUrl(imageUrl);
            const targetWidth = dimensions.width * aiScale;
            const targetHeight = dimensions.height * aiScale;

            const base64Data = dataUrlToBase64(imageUrl);
            const prompt = `Tâche : Redimensionner cette image. Les dimensions originales sont ${dimensions.width}x${dimensions.height}. Les nouvelles dimensions DOIVENT ÊTRE EXACTEMENT ${targetWidth}x${targetHeight}. Pendant le redimensionnement, utilisez l'IA pour améliorer les détails et la qualité afin de correspondre à la nouvelle résolution plus grande. Ne pas recadrer, ajouter ou supprimer de contenu.`;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ inlineData: { data: base64Data, mimeType: imageFile?.type || 'image/png' } }, { text: prompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });
            const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

            if (imagePart?.inlineData) {
                setAiResultUrl(`data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`);
            } else {
                throw new Error("L'API n'a pas retourné d'image.");
            }
        } catch (e: any) {
            setError(`Erreur IA: ${e.message || 'Veuillez réessayer.'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAcceptAi = () => {
        if (aiResultUrl) {
            setImageUrl(aiResultUrl);
            setOriginalImageForCompare(aiResultUrl);
            setAiResultUrl(null);
            setComparisonZoom(1);
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

    const FilterSlider = ({ name, label, value, min=0, max=200, unit='%' }: {name: keyof typeof filters, label:string, value: number, min?: number, max?: number, unit?: string}) => (
        <div>
            <label htmlFor={name} className="block text-sm font-medium text-slate-300">{label} ({value}{unit})</label>
            <input
                id={name}
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => setFilters(f => ({ ...f, [name]: Number(e.target.value) }))}
                className="mt-1 w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
        </div>
    );
    
    const CropOverlay = () => {
        if (!crop || activeTab !== 'crop') return null;

        const handles: CropHandle[] = ['top-left', 'top-middle', 'top-right', 'right-middle', 'bottom-right', 'bottom-middle', 'bottom-left', 'left-middle'];
        
        const getHandleStyle = (handle: CropHandle): React.CSSProperties => {
            switch(handle){
                case 'top-left': return { top: '-5px', left: '-5px', cursor: 'nwse-resize' };
                case 'top-middle': return { top: '-5px', left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' };
                case 'top-right': return { top: '-5px', right: '-5px', cursor: 'nesw-resize' };
                case 'right-middle': return { top: '50%', right: '-5px', transform: 'translateY(-50%)', cursor: 'ew-resize' };
                case 'bottom-right': return { bottom: '-5px', right: '-5px', cursor: 'nwse-resize' };
                case 'bottom-middle': return { bottom: '-5px', left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' };
                case 'bottom-left': return { bottom: '-5px', left: '-5px', cursor: 'nesw-resize' };
                case 'left-middle': return { top: '50%', left: '-5px', transform: 'translateY(-50%)', cursor: 'ew-resize' };
            }
        };
        
        return (
            <div className="absolute inset-0 pointer-events-none">
                {/* Dark overlay */}
                <div className="absolute bg-black/60" style={{ top: 0, left: 0, width: '100%', height: crop.y }} />
                <div className="absolute bg-black/60" style={{ top: crop.y + crop.height, left: 0, width: '100%', bottom: 0 }} />
                <div className="absolute bg-black/60" style={{ top: crop.y, left: 0, width: crop.x, height: crop.height }} />
                <div className="absolute bg-black/60" style={{ top: crop.y, left: crop.x + crop.width, right: 0, height: crop.height }} />

                {/* Crop box */}
                <div className="absolute border-2 border-dashed border-cyan-400 pointer-events-auto" style={{ left: crop.x, top: crop.y, width: crop.width, height: crop.height }}>
                    {handles.map(handle => (
                        <div key={handle} onMouseDown={(e) => handleMouseDownOnHandle(e, handle)} className="absolute w-3 h-3 bg-cyan-400 rounded-full border-2 border-slate-900" style={getHandleStyle(handle)} />
                    ))}
                </div>
            </div>
        );
    };

    const renderEditor = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Image Preview */}
            <div className="lg:col-span-2 bg-slate-900/50 p-4 rounded-lg flex items-center justify-center checkerboard-bg min-h-[50vh]">
                 {aiResultUrl ? (
                    <div className="w-full">
                        <h3 className="text-center font-bold text-white mb-4">Comparaison Avant / Après</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                                <h4 className="text-slate-300 mb-2">Avant</h4>
                                <div className="aspect-square bg-black/20 rounded-lg overflow-hidden">
                                    <img src={originalImageForCompare!} alt="Avant IA" className="w-full h-full object-contain transition-transform duration-200" style={{ transform: `scale(${comparisonZoom})` }} />
                                </div>
                            </div>
                            <div className="text-center">
                                <h4 className="text-slate-300 mb-2">Après (IA x{aiScale})</h4>
                                <div className="aspect-square bg-black/20 rounded-lg overflow-hidden">
                                    <img src={aiResultUrl} alt="Après IA" className="w-full h-full object-contain transition-transform duration-200" style={{ transform: `scale(${comparisonZoom})` }} />
                                </div>
                            </div>
                        </div>
                         <div className="mt-4 bg-slate-900/70 p-3 rounded-lg">
                             <label htmlFor="zoom" className="block text-sm font-medium text-slate-300 mb-1">Zoom Comparaison</label>
                             <div className="flex items-center gap-4">
                                <input type="range" id="zoom" min="1" max="4" step="0.1" value={comparisonZoom} onChange={e => setComparisonZoom(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                                <button onClick={() => setComparisonZoom(1)} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-md">Reset</button>
                             </div>
                         </div>
                    </div>
                ) : (
                    <div ref={imageContainerRef} className="relative select-none">
                        <img ref={imageRef} src={imageUrl!} alt="Aperçu" style={{ filter: cssFilters }} className="max-w-full max-h-[60vh] object-contain" />
                        <CropOverlay />
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
                <div className="flex border-b border-slate-700 mb-4">
                    {(Object.keys({crop: CropIcon, filters: QualityIcon, ai: SparklesIcon}) as EditorTab[]).map(tab => {
                        const Icon = {crop: CropIcon, filters: QualityIcon, ai: SparklesIcon}[tab];
                        return (
                             <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === tab ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-white'}`}>
                                <Icon className="w-5 h-5" />
                                { {crop: "Rogner", filters: "Filtres", ai: "IA"}[tab] }
                            </button>
                        )
                    })}
                </div>
                
                {error && <p className="mb-4 text-center text-red-400 bg-red-900/50 p-2 rounded-md text-sm">{error}</p>}

                <div className="space-y-6">
                    {activeTab === 'crop' && (
                        <div className="animate-fade-in">
                            <h3 className="font-semibold text-white mb-2">Rogner l'image</h3>
                            <p className="text-sm text-slate-400 mb-4">Ajustez les poignées sur l'image pour définir votre zone de rognage.</p>
                            <button onClick={handleApplyCrop} disabled={!crop || crop.width <= 0 || crop.height <= 0} className="w-full bg-indigo-600 text-white font-semibold py-2 rounded-md hover:bg-indigo-700 disabled:bg-slate-600">
                                Appliquer le rognage
                            </button>
                        </div>
                    )}
                    {activeTab === 'filters' && (
                         <div className="animate-fade-in space-y-4">
                            <FilterSlider name="brightness" label="Luminosité" value={filters.brightness} />
                            <FilterSlider name="contrast" label="Contraste" value={filters.contrast} />
                            <FilterSlider name="saturate" label="Saturation" value={filters.saturate} />
                            <FilterSlider name="grayscale" label="Niveaux de gris" value={filters.grayscale} max={100}/>
                            <FilterSlider name="sepia" label="Sépia" value={filters.sepia} max={100}/>
                        </div>
                    )}
                    {activeTab === 'ai' && (
                        <div className="animate-fade-in">
                             <h3 className="font-semibold text-white mb-2">Amélioration IA</h3>
                             <p className="text-sm text-slate-400 mb-4">Agrandissez et améliorez la qualité de votre image.</p>
                              <div>
                                <h4 className="font-medium text-slate-300 mb-2">Facteur d'agrandissement</h4>
                                <div className="flex justify-around bg-slate-700 p-1 rounded-lg">
                                    {[2, 4].map(factor => (
                                        <button key={factor} onClick={() => setAiScale(factor as 2|4)} className={`w-full py-1 text-sm font-semibold rounded-md transition-colors ${aiScale === factor ? 'bg-indigo-600 text-white' : 'hover:bg-slate-600'}`}>
                                            x{factor}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button onClick={handleAiEnhance} disabled={isProcessing} className="mt-4 w-full bg-cyan-500 text-white font-bold py-3 rounded-lg hover:bg-cyan-600 disabled:bg-slate-600 flex items-center justify-center gap-2">
                                {isProcessing ? <><Spinner/> Traitement...</> : "Lancer l'IA"}
                            </button>
                            {aiResultUrl && (
                                <div className="mt-4 border-t border-slate-700 pt-4 space-y-2">
                                    <button onClick={handleAcceptAi} className="w-full bg-green-600 text-white font-semibold py-2 rounded-md hover:bg-green-700">Accepter les modifications</button>
                                    <button onClick={() => { setAiResultUrl(null); setComparisonZoom(1); }} className="w-full bg-slate-600 text-white font-semibold py-2 rounded-md hover:bg-slate-500">Annuler</button>
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
    );
    
    return (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
            {!imageUrl ? (
                <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isDragActive ? 'border-indigo-500 bg-slate-800' : 'border-slate-600 hover:border-indigo-400'}`}>
                    <input {...getInputProps()} />
                    <UploadIcon className="mx-auto h-16 w-16 text-slate-400" />
                    <p className="mt-4 text-xl font-semibold text-slate-300">Glissez-déposez une image</p>
                    <p className="mt-1 text-slate-400">ou cliquez pour en sélectionner une</p>
                </div>
            ) : (
                renderEditor()
            )}
        </div>
    );
};