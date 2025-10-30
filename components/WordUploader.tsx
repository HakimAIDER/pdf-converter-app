// FIX: Replaced placeholder content with a functional WordUploader component.
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadIcon, DeleteIcon } from './IconComponents';

interface WordUploaderProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

export const WordUploader: React.FC<WordUploaderProps> = ({ file, onFileChange }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileChange(acceptedFiles[0]);
    }
  }, [onFileChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] 
    },
    multiple: false
  });

  const removeFile = () => {
    onFileChange(null);
  };

  return (
    <div>
      {!file ? (
        <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-slate-800' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`}>
          <input {...getInputProps()} />
          <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
          {isDragActive ?
            <p className="mt-2 text-slate-600 dark:text-slate-400">Déposez le fichier Word ici...</p> :
            <p className="mt-2 text-slate-600 dark:text-slate-400">Glissez-déposez un fichier Word ici, ou cliquez pour sélectionner un fichier</p>
          }
        </div>
      ) : (
        <div className="p-4 border rounded-md bg-slate-100 dark:bg-slate-700 flex justify-between items-center">
          <p className="text-slate-800 dark:text-slate-200">{file.name}</p>
          <button onClick={removeFile} className="text-red-500 hover:text-red-700">
            <DeleteIcon className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};
