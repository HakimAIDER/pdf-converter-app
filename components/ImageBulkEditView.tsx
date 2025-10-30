import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImageUploader } from './ImageUploader';
import { UploadIcon, PhotoBatchIcon, DeleteIcon } from './IconComponents';

// Déclarez que JSZip peut exister sur l'objet window
declare global {
  interface Window {
    JSZip: any;
  }
}

const Spinner: React.FC = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export const ImageBulkEditView: React.FC = () => {
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [logoFile, setLogoFile] = useState<File | null>(null);

    const [logoPosition, setLogoPosition] = useState<LogoPosition>('bottom-right');
    const [logoScale, setLogoScale] = useState(15);
    const [logoOpacity, setLogoOpacity] = useState(80);
    const [borderWidth, setBorderWidth] = useState(20);
    const [borderColor, setBorderColor] = useState('#FFFFFF');
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState('');

    const onLogoDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setLogoFile(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps: getLogoRootProps, getInputProps: getLogoInputProps } = useDropzone({
        onDrop: onLogoDrop,
        accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
        multiple: false
    });

    useEffect(() => {
        if (imageFiles.length === 0) {
            setPreviewUrl(null);
            return;
        }

        const generatePreview = async () => {
            const image = new Image();
            const logo = logoFile ? new Image() : null;

            const imageLoadPromise = new Promise(resolve => {
                image.onload = resolve;
                image.src = URL.createObjectURL(imageFiles[0]);
            });

            const logoLoadPromise = logo && logoFile ? new Promise(resolve => {
                logo.onload = resolve;
                logo.src = URL.createObjectURL(logoFile);
            }) : Promise.resolve();
            
            await Promise.all([imageLoadPromise, logoLoadPromise]);

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            canvas.width = image.width + borderWidth * 2;
            canvas.height = image.height + borderWidth * 2;
            
            // Draw border
            ctx.fillStyle = borderColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw image
            ctx.drawImage(image, borderWidth, borderWidth);
            
            // Draw logo
            if (logo) {
                const logoWidth = image.width * (logoScale / 100);
                const logoHeight = (logo.height / logo.width) * logoWidth;
                const margin = borderWidth + 10;
                
                let x = 0, y = 0;
                switch(logoPosition) {
                    case 'top-left': x = margin; y = margin; break;
                    case 'top-right': x = canvas.width - logoWidth - margin; y = margin; break;
                    case 'bottom-left': x = margin; y = canvas.height - logoHeight - margin; break;
                    case 'center': x = (canvas.width - logoWidth) / 2; y = (canvas.height - logoHeight) / 2; break;
                    case 'bottom-right':
                    default: x = canvas.width - logoWidth - margin; y = canvas.height - logoHeight - margin; break;
                }

                ctx.globalAlpha = logoOpacity / 100;
                ctx.drawImage(logo, x, y, logoWidth, logoHeight);
                ctx.globalAlpha = 1.0;
            }

            setPreviewUrl(canvas.toDataURL('image/png'));
            URL.revokeObjectURL(image.src);
            if (logo) URL.revokeObjectURL(logo.src);
        };

        generatePreview();

    }, [imageFiles, logoFile, logoPosition, logoScale, logoOpacity, borderWidth, borderColor]);
    
    const processAndDownload = async () => {
        if (imageFiles.length === 0) return;
        if (typeof window.JSZip === 'undefined') {
            setError("La bibliothèque de compression (JSZip) n'a pas pu être chargée. Veuillez rafraîchir la page.");
            return;
        }

        setIsProcessing(true);
        setError('');

        try {
            const zip = new window.JSZip();
            const logo = logoFile ? new Image() : null;
            if (logo && logoFile) {
                await new Promise(resolve => {
                    logo.onload = resolve;
                    logo.src = URL.createObjectURL(logoFile);
                });
            }

            for (const file of imageFiles) {
                const image = new Image();
                await new Promise(resolve => {
                    image.onload = resolve;
                    image.src = URL.createObjectURL(file);
                });
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) continue;

                canvas.width = image.width + borderWidth * 2;
                canvas.height = image.height + borderWidth * 2;
                
                ctx.fillStyle = borderColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(image, borderWidth, borderWidth);

                if (logo) {
                   const logoWidth = image.width * (logoScale / 100);
                    const logoHeight = (logo.height / logo.width) * logoWidth;
                    const margin = borderWidth + 10;
                    let x = 0, y = 0;
                     switch(logoPosition) {
                        case 'top-left': x = margin; y = margin; break;
                        case 'top-right': x = canvas.width - logoWidth - margin; y = margin; break;
                        case 'bottom-left': x = margin; y = canvas.height - logoHeight - margin; break;
                        case 'center': x = (canvas.width - logoWidth) / 2; y = (canvas.height - logoHeight) / 2; break;
                        case 'bottom-right':
                        default: x = canvas.width - logoWidth - margin; y = canvas.height - logoHeight - margin; break;
                    }
                    ctx.globalAlpha = logoOpacity / 100;
                    ctx.drawImage(logo, x, y, logoWidth, logoHeight);
                    ctx.globalAlpha = 1.0;
                }

                const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
                if (blob) {
                    zip.file(`edited-${file.name}`, blob);
                }
                URL.revokeObjectURL(image.src);
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = 'edited-images.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error(e);
            setError("Une erreur est survenue lors du traitement des images.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <h2 className="text-2xl font-semibold mb-4 text-center text-slate-100 flex items-center justify-center gap-3">
                <PhotoBatchIcon className="w-7 h-7" />
                Ajouter Logo & Bordure en Bloc
            </h2>
            <p className="text-center text-slate-400 mb-6">Appliquez un logo et une bordure à plusieurs images en une seule fois.</p>

            <ImageUploader files={imageFiles} onFilesChange={setImageFiles} />

            {imageFiles.length > 0 && (
                <div className="mt-8 space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        {/* --- SETTINGS --- */}
                        <div className="space-y-6 bg-slate-900/50 p-6 rounded-lg border border-slate-700">
                           {/* Logo Section */}
                           <div>
                             <h3 className="text-lg font-semibold text-slate-200 mb-3">Paramètres du Logo</h3>
                             <div className="flex gap-4">
                                <div {...getLogoRootProps()} className="w-28 h-28 flex-shrink-0 border-2 border-dashed border-slate-600 rounded-md flex items-center justify-center text-center cursor-pointer hover:border-indigo-400 transition-colors">
                                    <input {...getLogoInputProps()} />
                                    {logoFile ? (
                                        <img src={URL.createObjectURL(logoFile)} alt="Logo preview" className="w-full h-full object-contain rounded-md" />
                                    ) : (
                                        <div className="text-xs text-slate-400 p-2">
                                            <UploadIcon className="w-6 h-6 mx-auto mb-1"/>
                                            Téléverser Logo
                                        </div>
                                    )}
                                </div>
                                {logoFile && (
                                    <div className="flex flex-col justify-start">
                                         <p className="text-sm text-slate-300 break-all">{logoFile.name}</p>
                                         <button onClick={() => setLogoFile(null)} className="mt-2 text-sm text-red-400 hover:text-red-300 flex items-center gap-1">
                                             <DeleteIcon className="w-4 h-4" /> Supprimer
                                         </button>
                                    </div>
                                )}
                             </div>
                             {logoFile && (
                                <div className="space-y-4 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Position</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {(['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'] as LogoPosition[]).map(pos => (
                                                <button key={pos} onClick={() => setLogoPosition(pos)} className={`px-2 py-1 text-xs rounded-md transition-colors ${logoPosition === pos ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>{pos.replace('-', ' ')}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="scale" className="block text-sm font-medium text-slate-300 mb-1">Taille: {logoScale}%</label>
                                        <input type="range" id="scale" min="1" max="50" value={logoScale} onChange={e => setLogoScale(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                    <div>
                                        <label htmlFor="opacity" className="block text-sm font-medium text-slate-300 mb-1">Opacité: {logoOpacity}%</label>
                                        <input type="range" id="opacity" min="0" max="100" value={logoOpacity} onChange={e => setLogoOpacity(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                </div>
                             )}
                           </div>

                           {/* Border Section */}
                           <div>
                             <h3 className="text-lg font-semibold text-slate-200 mb-3">Paramètres de la Bordure</h3>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="border-width" className="block text-sm font-medium text-slate-300 mb-1">Épaisseur (px)</label>
                                    <input type="number" id="border-width" value={borderWidth} onChange={e => setBorderWidth(Math.max(0, Number(e.target.value)))} className="w-full bg-slate-700 border-slate-600 rounded-md p-2" />
                                </div>
                                <div>
                                    <label htmlFor="border-color" className="block text-sm font-medium text-slate-300 mb-1">Couleur</label>
                                    <input type="color" id="border-color" value={borderColor} onChange={e => setBorderColor(e.target.value)} className="w-full h-10 p-1 bg-slate-700 border-slate-600 rounded-md cursor-pointer" />
                                </div>
                             </div>
                           </div>
                        </div>

                        {/* --- PREVIEW --- */}
                        <div className="space-y-2">
                             <h3 className="text-lg font-semibold text-slate-200 text-center">Aperçu</h3>
                             <div className="aspect-video bg-slate-900/50 rounded-lg flex items-center justify-center p-2 border border-slate-700">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                                ) : (
                                    <p className="text-slate-400">Génération de l'aperçu...</p>
                                )}
                             </div>
                        </div>
                    </div>
                    {error && <p className="mt-4 text-center text-red-400">{error}</p>}
                    <div className="text-center">
                        <button
                            onClick={processAndDownload}
                            disabled={isProcessing}
                            className="px-8 py-4 bg-cyan-500 text-white font-bold text-lg rounded-lg hover:bg-cyan-600 disabled:bg-cyan-800/50 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-cyan-500/20 disabled:shadow-none flex items-center justify-center gap-3 mx-auto"
                        >
                            {isProcessing ? <><Spinner /> Traitement en cours...</> : `Appliquer & Télécharger (${imageFiles.length} images)`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};