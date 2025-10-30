import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full text-center p-4 sm:p-6 mt-auto">
      <div className="text-sm text-slate-500">
        © {new Date().getFullYear()} Outils-gratuits. Tous droits réservés.
      </div>
    </footer>
  );
};