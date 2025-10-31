import React from 'react';
import { OutilsGratuitsLogo } from './IconComponents';

export const Header: React.FC = () => {
    return (
        <header className="fixed top-0 left-0 right-0 z-20 bg-slate-900/50 backdrop-blur-xl border-b border-slate-700/50">
            <div className="container mx-auto max-w-4xl p-4 flex justify-between items-center">
                <div className="flex items-center">
                    <OutilsGratuitsLogo className="h-7 w-auto" />
                </div>
                <nav>
                    <ul className="flex items-center space-x-6">
                        <li>
                            <a href="#fonctionnalites" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                                Fonctionnalités
                            </a>
                        </li>
                        <li>
                            <a href="mailto:hakim-aider@contact.com" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                                Contact
                            </a>
                        </li>
                    </ul>
                </nav>
            </div>
        </header>
    );
};