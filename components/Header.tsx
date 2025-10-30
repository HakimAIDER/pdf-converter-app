import React from 'react';
import { LogoIcon } from './IconComponents';

export const Header: React.FC = () => {
    return (
        <header className="absolute top-0 left-0 right-0 z-10 p-4">
            <div className="container mx-auto max-w-4xl">
                <div className="flex items-center">
                    <LogoIcon className="h-8 w-8 text-slate-200" />
                    <span className="ml-3 text-xl font-semibold text-slate-200">
                        Convertisseur Ultime
                    </span>
                </div>
            </div>
        </header>
    );
};