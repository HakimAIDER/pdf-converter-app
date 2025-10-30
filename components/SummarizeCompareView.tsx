import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { SummarizeIcon } from './IconComponents';

const Spinner: React.FC = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

export const SummarizeCompareView: React.FC = () => {
    const [url1, setUrl1] = useState('');
    const [url2, setUrl2] = useState('');
    const [summary1, setSummary1] = useState('');
    const [summary2, setSummary2] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSummarize = async () => {
        if (!url1 && !url2) {
            setError("Veuillez entrer au moins une URL.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setSummary1('');
        setSummary2('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            
            const summarizeUrl = async (url: string) => {
                if (!url) return "";
                const prompt = `Tâche : lis le contenu de l'URL suivante et rédige un résumé concis et informatif de l'article principal. Ignore les publicités, les menus de navigation et les pieds de page. Concentre-toi sur les points clés et les arguments principaux. L'URL est : ${url}`;
                const response = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: prompt,
                });
                return response.text;
            };

            const [res1, res2] = await Promise.all([
                summarizeUrl(url1),
                summarizeUrl(url2)
            ]);

            setSummary1(res1);
            setSummary2(res2);

        } catch (e: any) {
            console.error(e);
            setError(`Une erreur est survenue: ${e.message || 'Impossible de récupérer ou de résumer le contenu.'}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <h2 className="text-2xl font-semibold mb-4 text-center text-slate-100 flex items-center justify-center gap-3">
                <SummarizeIcon className="w-7 h-7" />
                Résumer et Comparer des Articles
            </h2>
            <p className="text-center text-slate-400 mb-6">Collez un ou deux liens d'articles pour obtenir un résumé généré par IA.</p>

            <div className="space-y-4">
                <div>
                    <label htmlFor="url1" className="block text-sm font-medium text-slate-300 mb-1">URL de la Source 1</label>
                    <input
                        type="url"
                        id="url1"
                        value={url1}
                        onChange={(e) => setUrl1(e.target.value)}
                        placeholder="https://exemple.com/article-1"
                        className="w-full bg-slate-700 border-slate-600 rounded-md p-2.5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-400"
                    />
                </div>
                <div>
                    <label htmlFor="url2" className="block text-sm font-medium text-slate-300 mb-1">URL de la Source 2 (Optionnel)</label>
                    <input
                        type="url"
                        id="url2"
                        value={url2}
                        onChange={(e) => setUrl2(e.target.value)}
                        placeholder="https://exemple.com/article-2"
                        className="w-full bg-slate-700 border-slate-600 rounded-md p-2.5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-400"
                    />
                </div>
            </div>

            <div className="mt-6 text-center">
                <button
                    onClick={handleSummarize}
                    disabled={(!url1 && !url2) || isLoading}
                    className="px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-slate-500 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-indigo-500/20 disabled:shadow-none flex items-center justify-center gap-3 mx-auto"
                >
                    {isLoading ? <><Spinner /> Analyse en cours...</> : "Résumer & Comparer"}
                </button>
            </div>
            
            {error && <p className="mt-4 text-center text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p>}

            {(isLoading || summary1 || summary2) && (
                 <div className="mt-8 animate-fade-in">
                    {isLoading && (
                        <div className="text-center text-slate-300">
                            <Spinner />
                            <p>L'IA est en train de lire et de résumer les articles...</p>
                        </div>
                    )}
                    {!isLoading && (summary1 || summary2) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {summary1 && (
                                <div className="space-y-3">
                                    <h3 className="text-xl font-bold text-slate-100 border-b-2 border-slate-600 pb-2">Résumé de la Source 1</h3>
                                    <div className="p-4 bg-slate-900/50 rounded-lg max-h-96 overflow-y-auto">
                                        <p className="whitespace-pre-wrap text-slate-300">{summary1}</p>
                                    </div>
                                </div>
                            )}
                            {summary2 && (
                                <div className="space-y-3">
                                     <h3 className="text-xl font-bold text-slate-100 border-b-2 border-slate-600 pb-2">Résumé de la Source 2</h3>
                                    <div className="p-4 bg-slate-900/50 rounded-lg max-h-96 overflow-y-auto">
                                        <p className="whitespace-pre-wrap text-slate-300">{summary2}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
