import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadIcon } from './IconComponents';

interface MultiPdfUploaderProps {
  onFilesChange: (files: File[]) => void;
  files: File[];
}

export const MultiPdfUploader: React.FC<MultiPdfUploaderProps> = ({ onFilesChange, files }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesChange([...files, ...acceptedFiles]);
  }, [files, onFilesChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true
  });

  return (
    <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
      ${isDragActive ? 'border-indigo-500 bg-slate-800' : 'border-slate-600 hover:border-indigo-400'}`}>
      <input {...getInputProps()} />
      <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
      {isDragActive ?
        <p className="mt-2 text-slate-400">Déposez les fichiers PDF ici...</p> :
        <p className="mt-2 text-slate-400">Glissez-déposez des fichiers PDF ici, ou cliquez pour les sélectionner</p>
      }
    </div>
  );
};
