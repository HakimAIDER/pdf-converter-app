import React from 'react';
import { Mode } from '../App';

interface ModeSelectorProps {
  selectedMode: Mode;
  onSelectMode: (mode: Mode) => void;
}

const modes: { id: Mode; name: string }[] = [
  { id: 'image-to-pdf', name: 'Image → PDF' },
  { id: 'pdf-to-image', name: 'PDF → Image' },
  { id: 'word-to-pdf', name: 'Word → PDF' },
  { id: 'pdf-to-word', name: 'PDF → Word' },
  { id: 'image-to-text', name: 'Image → Texte' },
  { id: 'pdf-merge', name: 'Fusionner PDF' },
  { id: 'pdf-sign', name: 'Signer PDF' },
  { id: 'image-bulk-edit', name: 'Logo/Bordure en Bloc' },
  { id: 'image-upscale', name: 'Agrandir Image (IA)' },
  { id: 'image-remove-logo', name: 'Supprimer Logo (IA)' },
];

export const ModeSelector: React.FC<ModeSelectorProps> = ({ selectedMode, onSelectMode }) => {
  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
      {modes.map((mode) => {
        const isSelected = selectedMode === mode.id;
        return (
          <button
            key={mode.id}
            onClick={() => onSelectMode(mode.id)}
            className={`px-4 py-2.5 sm:px-5 text-sm sm:text-base font-semibold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-400
              ${isSelected
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
          >
            {mode.name}
          </button>
        )
      })}
    </div>
  );
};