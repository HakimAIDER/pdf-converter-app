import React from 'react';

export const Hero: React.FC = () => {
    return (
        <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400">
              Outils-gratuits
            </h1>
            <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
              Transformez vos images, PDF et documents Word avec une facilité déconcertante.
            </p>
        </div>
    );
};