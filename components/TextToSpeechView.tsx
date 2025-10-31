import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { SpeakerWaveIcon, DownloadIcon } from './IconComponents';

// Helper to decode base64 string to Uint8Array
function decode(base64: string): Uint8Array {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

// Helper to write a string to a DataView
function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

// Helper to convert raw PCM data to a WAV file Blob
function pcmToWav(pcmData: Uint8Array, sampleRate: number, numChannels: number, bitsPerSample: number): Blob {
    const dataSize = pcmData.length;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    
    // "fmt " sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    view.setUint32(28, byteRate, true);
    const blockAlign = numChannels * (bitsPerSample / 8);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    
    // "data" sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write PCM data
    for (let i = 0; i < dataSize; i++) {
        view.setUint8(44 + i, pcmData[i]);
    }
    
    return new Blob([view], { type: 'audio/wav' });
}


const Spinner: React.FC = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

const voices = [
    { displayName: 'Antoine', apiName: 'Puck' },
    { displayName: 'Chloé', apiName: 'Kore' },
    { displayName: 'Julien', apiName: 'Fenrir' },
    { displayName: 'Léa', apiName: 'Zephyr' },
    { displayName: 'Marc', apiName: 'Charon' },
];

const styles = ['Naturel / Conversation', 'Narration', 'Annonce / Publicité', 'Présentation / Formel', 'Poétique / Artistique'];
const tones = ['Neutre', 'Joyeux / Enthousiaste', 'Sérieux / Grave', 'Calme / Apaisant', 'Triste / Mélancolique', 'Énergique / Dynamique', 'Chuchoté / Doux'];
const ages = ['Enfant', 'Adolescent(e)', 'Jeune Adulte', 'Adulte', 'Personne Âgée'];
const accents = ['Aucun', 'Français (France)', 'Français (Canadien)', 'Français (Belge)', 'Anglais (Américain)', 'Anglais (Britannique)', 'Espagnol (Espagne)', 'Italien', 'Allemand'];

export const TextToSpeechView: React.FC = () => {
    const [text, setText] = useState('');
    const [voice, setVoice] = useState('Puck');
    const [style, setStyle] = useState('Naturel / Conversation');
    const [tone, setTone] = useState('Neutre');
    const [age, setAge] = useState('Adulte');
    const [accent, setAccent] = useState('Aucun');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!text.trim()) {
            setError("Veuillez entrer un texte à lire.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setAudioUrl(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            
            const accentInstruction = accent !== 'Aucun' ? ` avec un accent ${accent}` : '';
            const prompt = `Lis le texte suivant dans un style "${style}", sur un ton "${tone}", avec une voix d'un(e) "${age}"${accentInstruction} : ${text}`;
            
            const response = await ai.models.generateContent({
              model: "gemini-2.5-flash-preview-tts",
              contents: [{ parts: [{ text: prompt }] }],
              config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: voice },
                    },
                },
              },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) {
                throw new Error("L'API n'a pas retourné de données audio. Le contenu a peut-être été bloqué.");
            }

            const pcmData = decode(base64Audio);
            const wavBlob = pcmToWav(pcmData, 24000, 1, 16);
            const url = URL.createObjectURL(wavBlob);
            setAudioUrl(url);

        } catch (e: any) {
            console.error(e);
            setError(`Une erreur est survenue : ${e.message || 'Veuillez réessayer.'}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

    return (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <h2 className="text-2xl font-semibold mb-4 text-center text-slate-100 flex items-center justify-center gap-3">
                <SpeakerWaveIcon className="w-7 h-7" />
                Texte en Voix (IA)
            </h2>
            <p className="text-center text-slate-400 mb-6">Convertissez n'importe quel texte en discours audio réaliste.</p>

            <div className="space-y-4">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Entrez votre texte ici. Pour une autre langue ou un accent, précisez-le. Ex: 'Raconte une blague en français avec un accent du sud.'"
                    className="w-full h-40 bg-slate-900/50 border border-slate-600 rounded-md p-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-400 resize-y"
                    aria-label="Texte à convertir en audio"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="voice" className="block text-sm font-medium text-slate-300 mb-1">Voix</label>
                        <select
                            id="voice"
                            value={voice}
                            onChange={(e) => setVoice(e.target.value)}
                            className="w-full bg-slate-700 border-slate-600 rounded-md p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-400"
                        >
                            {voices.map(v => <option key={v.apiName} value={v.apiName}>{v.displayName}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="age" className="block text-sm font-medium text-slate-300 mb-1">Âge de l'orateur</label>
                        <select
                            id="age"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            className="w-full bg-slate-700 border-slate-600 rounded-md p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-400"
                        >
                            {ages.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="style" className="block text-sm font-medium text-slate-300 mb-1">Style</label>
                        <select
                            id="style"
                            value={style}
                            onChange={(e) => setStyle(e.target.value)}
                            className="w-full bg-slate-700 border-slate-600 rounded-md p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-400"
                        >
                            {styles.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="tone" className="block text-sm font-medium text-slate-300 mb-1">Ton</label>
                         <select
                            id="tone"
                            value={tone}
                            onChange={(e) => setTone(e.target.value)}
                            className="w-full bg-slate-700 border-slate-600 rounded-md p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-400"
                        >
                           {tones.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                     <div className="sm:col-span-2 lg:col-span-1">
                        <label htmlFor="accent" className="block text-sm font-medium text-slate-300 mb-1">Accent</label>
                        <select
                            id="accent"
                            value={accent}
                            onChange={(e) => setAccent(e.target.value)}
                            className="w-full bg-slate-700 border-slate-600 rounded-md p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-400"
                        >
                            {accents.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="mt-6 text-center">
                <button
                    onClick={handleGenerate}
                    disabled={!text.trim() || isLoading}
                    className="px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-slate-500 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-indigo-500/20 disabled:shadow-none flex items-center justify-center gap-3 mx-auto"
                >
                    {isLoading ? <><Spinner /> Génération en cours...</> : "Générer l'audio"}
                </button>
            </div>

            {error && <p className="mt-4 text-center text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p>}
            
            {audioUrl && !isLoading && (
                <div className="mt-8 animate-fade-in text-center space-y-4">
                    <h3 className="text-lg font-semibold text-slate-200">Votre audio est prêt !</h3>
                    <audio controls src={audioUrl} className="mx-auto w-full max-w-md" aria-label="Lecteur audio du texte généré">
                        Votre navigateur ne supporte pas l'élément audio.
                    </audio>
                    <a
                        href={audioUrl}
                        download="generated-audio.wav"
                        className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-cyan-500 text-white font-semibold rounded-md hover:bg-cyan-600 transition-colors"
                        aria-label="Télécharger le fichier audio généré"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        Télécharger (WAV)
                    </a>
                </div>
            )}
        </div>
    );
};