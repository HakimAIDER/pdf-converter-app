import React, { useState, useEffect, useRef } from 'react';
import { PdfUploader } from './PdfUploader';
import { SignaturePad, SignaturePadRef } from './SignaturePad';
import { PencilIcon } from './IconComponents';

// Declarations for pdf.js and pdf-lib on window object
declare global {
  interface Window {
    pdfjsLib: any;
    PDFLib: any;
  }
}

// A simple spinner component
const Spinner: React.FC = () => (
    <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-100"></div>
    </div>
);

export const PdfSignView: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [pdfPages, setPdfPages] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
    const [penColor, setPenColor] = useState('#000000'); // Black
    const signaturePadRef = useRef<SignaturePadRef>(null);

    const [signaturePosition, setSignaturePosition] = useState<{ pageIndex: number; x: number; y: number } | null>(null);
    const pdfPreviewRef = useRef<HTMLDivElement>(null);

    const [isSigning, setIsSigning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset state when file changes
    useEffect(() => {
        if(!file) return;
        setIsPdfLoading(false);
        setPdfPages([]);
        setCurrentPage(1);
        setSignatureDataUrl(null);
        setSignaturePosition(null);
        setError(null);
    }, [file]);

    // Load PDF and render pages as images
    useEffect(() => {
        if (!file) return;

        const loadPdf = async () => {
            setIsPdfLoading(true);
            setError(null);
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const numPages = pdf.numPages;
                const pagesData: string[] = [];

                for (let i = 1; i <= numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    pagesData.push(canvas.toDataURL('image/jpeg'));
                }
                setPdfPages(pagesData);
            } catch (e) {
                console.error(e);
                setError("Impossible de charger le PDF. Le fichier est peut-être corrompu.");
            } finally {
                setIsPdfLoading(false);
            }
        };

        loadPdf();
    }, [file]);
    
    const handleConfirmSignature = () => {
        const signature = signaturePadRef.current?.getSignature();
        if (signature) {
            setSignatureDataUrl(signature);
        } else {
            alert("Veuillez d'abord dessiner votre signature.");
        }
    };

    const handlePlaceSignature = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!signatureDataUrl) return;

        const target = e.currentTarget;
        const rect = target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setSignaturePosition({
            pageIndex: currentPage - 1,
            x: x,
            y: y,
        });
    };
    
    const handleSignAndDownload = async () => {
        if (!file || !signatureDataUrl || !signaturePosition) return;

        if (typeof window.PDFLib === 'undefined') {
            setError("La bibliothèque PDF n'a pas pu être chargée. Veuillez rafraîchir la page.");
            return;
        }

        setIsSigning(true);
        setError(null);

        try {
            const { PDFDocument } = window.PDFLib;
            const existingPdfBytes = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            
            const signatureBytes = await fetch(signatureDataUrl).then(res => res.arrayBuffer());
            const signatureImage = await pdfDoc.embedPng(signatureBytes);
            
            const targetPage = pdfDoc.getPages()[signaturePosition.pageIndex];
            const { width: pageWidth, height: pageHeight } = targetPage.getSize();
            
            const previewWidth = pdfPreviewRef.current?.clientWidth ?? 1;
            
            const pdfJsPage = await window.pdfjsLib.getDocument({ data: new Uint8Array(existingPdfBytes) }).promise.then((doc: any) => doc.getPage(currentPage));
            const pdfJsViewport = pdfJsPage.getViewport({ scale: 1 });
            const scale = pdfJsViewport.width / previewWidth;
            
            const sigWidth = 120;
            const sigHeight = (sigWidth * signatureImage.height) / signatureImage.width;

            const pdfX = (signaturePosition.x * scale) - (sigWidth / 2);
            const pdfY = pageHeight - (signaturePosition.y * scale) - (sigHeight / 2);

            targetPage.drawImage(signatureImage, {
                x: pdfX,
                y: pdfY,
                width: sigWidth,
                height: sigHeight,
            });

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${file.name.replace(/\.pdf$/i, '')}-signed.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (e) {
            console.error(e);
            setError("Une erreur est survenue lors de l'ajout de la signature.");
        } finally {
            setIsSigning(false);
        }
    };

    const renderContent = () => {
        if (!file) {
            return <PdfUploader file={file} onFileChange={setFile} />;
        }
        if (isPdfLoading) {
            return <div className="text-center p-8"><Spinner /></div>;
        }
        if (pdfPages.length > 0) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <div className="w-full">
                        <h3 className="font-semibold text-slate-200 mb-2 text-center">Aperçu du document</h3>
                        <div ref={pdfPreviewRef} className="relative border border-slate-600 rounded-lg overflow-hidden" onClick={signatureDataUrl ? handlePlaceSignature : undefined} style={{ cursor: signatureDataUrl && !signaturePosition ? 'copy' : 'default' }}>
                            <img src={pdfPages[currentPage - 1]} alt={`Page ${currentPage}`} className="w-full h-auto select-none" />
                            {signaturePosition && signaturePosition.pageIndex === currentPage - 1 && signatureDataUrl && (
                                <img
                                    src={signatureDataUrl}
                                    alt="signature preview"
                                    className="absolute pointer-events-none"
                                    style={{
                                        left: `${signaturePosition.x}px`,
                                        top: `${signaturePosition.y}px`,
                                        width: '120px',
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                />
                            )}
                        </div>
                        {pdfPages.length > 1 && (
                            <div className="flex justify-between items-center mt-4">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-slate-600 rounded-md disabled:opacity-50">Précédent</button>
                                <span className="text-slate-300">Page {currentPage} / {pdfPages.length}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(pdfPages.length, p + 1))} disabled={currentPage === pdfPages.length} className="px-4 py-2 bg-slate-600 rounded-md disabled:opacity-50">Suivant</button>
                            </div>
                        )}
                    </div>

                    <div className="w-full flex flex-col items-center">
                         <h3 className="font-semibold text-slate-200 mb-2 text-center">Votre Signature</h3>
                         {!signatureDataUrl ? (
                             <div className="flex flex-col items-center">
                                <SignaturePad ref={signaturePadRef} width={350} height={180} penColor={penColor} />
                                <div className="flex items-center gap-2 my-4">
                                    <span className="text-sm text-slate-300">Couleur:</span>
                                    <button onClick={() => setPenColor('#000000')} className={`w-6 h-6 rounded-full bg-black border-2 ${penColor === '#000000' ? 'border-cyan-400' : 'border-slate-500'}`}></button>
                                    <button onClick={() => setPenColor('#0000FF')} className={`w-6 h-6 rounded-full bg-blue-600 border-2 ${penColor === '#0000FF' ? 'border-cyan-400' : 'border-slate-500'}`}></button>
                                    <button onClick={() => setPenColor('#FF0000')} className={`w-6 h-6 rounded-full bg-red-600 border-2 ${penColor === '#FF0000' ? 'border-cyan-400' : 'border-slate-500'}`}></button>
                                </div>
                                <div className="flex gap-4">
                                     <button onClick={() => signaturePadRef.current?.clear()} className="px-4 py-2 bg-slate-600 rounded-md">Effacer</button>
                                     <button onClick={handleConfirmSignature} className="px-4 py-2 bg-indigo-600 rounded-md">Confirmer la signature</button>
                                </div>
                             </div>
                         ) : (
                             <div className="flex flex-col items-center text-center">
                                 <img src={signatureDataUrl} alt="Votre signature" className="border border-slate-500 rounded-md bg-white p-2 max-w-[250px]" />
                                 <button onClick={() => { setSignatureDataUrl(null); setSignaturePosition(null); }} className="mt-4 px-4 py-2 bg-slate-600 rounded-md">Changer la signature</button>
                                 <p className="mt-4 text-slate-300">
                                     {!signaturePosition ? "Cliquez sur le document pour placer votre signature." : "Signature placée ! Cliquez à nouveau pour la déplacer."}
                                 </p>
                             </div>
                         )}
                         
                         <div className="mt-8 text-center">
                            <button
                                onClick={handleSignAndDownload}
                                disabled={!signaturePosition || isSigning}
                                className="px-8 py-4 bg-cyan-500 text-white font-bold text-lg rounded-lg hover:bg-cyan-600 disabled:bg-cyan-800/50 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-cyan-500/20 disabled:shadow-none"
                            >
                                {isSigning ? <Spinner/> : 'Signer et Télécharger'}
                            </button>
                         </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <h2 className="text-2xl font-semibold mb-4 text-center text-slate-100 flex items-center justify-center gap-3">
                <PencilIcon className="w-7 h-7" />
                Signer un document PDF
            </h2>
            <p className="text-center text-slate-400 mb-6">Téléversez un PDF, dessinez votre signature, placez-la et téléchargez.</p>
            {error && <p className="mb-4 text-center text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p>}
            {renderContent()}
        </div>
    );
};