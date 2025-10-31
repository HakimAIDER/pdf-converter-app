import React, { useState } from 'react';
// FIX: Replaced VideoDownloadIcon with DownloadIcon and added missing social media icons to import.
import { DownloadIcon, YouTubeIcon, InstagramIcon, FacebookIcon } from './IconComponents';

const Spinner: React.FC = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

export const VideoDownloaderView: React.FC = () => {
    const [url, setUrl] = useState('');
    const [format, setFormat] = useState<'mp4' | 'mp3'>('mp4');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleDownload = () => {
        if (!url.trim()) {
            setError("Veuillez entrer une URL valide.");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setMessage(null);

        // Simuler un appel réseau
        setTimeout(() => {
            setIsLoading(false);
            setMessage(
                "Fonctionnalité en cours de développement. Le téléchargement direct depuis des plateformes comme YouTube nécessite une infrastructure serveur complexe pour des raisons techniques et légales. Cette interface est une démonstration ; la fonctionnalité de téléchargement sera activée une fois le service backend déployé."
            );
        }, 2500);
    };

    return (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <h2 className="text-2xl font-semibold mb-4 text-center text-slate-100 flex items-center justify-center gap-3">
                <DownloadIcon className="w-8 h-8" />
                Téléchargeur Vidéo
            </h2>
            <p className="text-center text-slate-400 mb-6">Téléchargez des vidéos en MP4 ou extrayez l'audio en MP3 depuis les plateformes populaires.</p>

            <div className="space-y-6">
                <div className="relative">
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Collez l'URL de la vidéo (YouTube, Instagram, Facebook...)"
                        className="w-full bg-slate-900/50 border border-slate-600 rounded-lg p-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-400"
                        aria-label="URL de la vidéo"
                    />
                     <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3 text-slate-500">
                        <YouTubeIcon className="w-6 h-6" />
                        <InstagramIcon className="w-5 h-5" />
                        <FacebookIcon className="w-5 h-5" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2 text-center">Choisissez le format de sortie :</label>
                    <div className="flex justify-center bg-slate-900/50 p-1 rounded-lg max-w-xs mx-auto">
                        <button
                            onClick={() => setFormat('mp4')}
                            className={`w-full py-2.5 text-sm font-bold rounded-md transition-colors ${format === 'mp4' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                        >
                            MP4 (Vidéo)
                        </button>
                        <button
                            onClick={() => setFormat('mp3')}
                            className={`w-full py-2.5 text-sm font-bold rounded-md transition-colors ${format === 'mp3' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                        >
                            MP3 (Audio)
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center">
                <button
                    onClick={handleDownload}
                    disabled={!url.trim() || isLoading}
                    className="px-8 py-4 bg-cyan-500 text-white font-bold text-lg rounded-lg hover:bg-cyan-600 disabled:bg-cyan-800/50 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-cyan-500/20 disabled:shadow-none flex items-center justify-center gap-3 mx-auto"
                >
                    {isLoading ? <><Spinner /> Recherche en cours...</> : "Télécharger"}
                </button>
            </div>

            {error && <p className="mt-6 text-center text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p>}
            
            {message && (
                <div className="mt-6 text-center text-cyan-300 bg-cyan-900/50 p-4 rounded-lg animate-fade-in">
                    <h4 className="font-bold">Information</h4>
                    <p className="text-sm mt-1">{message}</p>
                </div>
            )}
        </div>
    );
};