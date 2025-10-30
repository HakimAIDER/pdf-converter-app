// FIX: Replaced placeholder content with a functional ImageUploader component.
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadIcon, DeleteIcon } from './IconComponents';

interface ImageUploaderProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ files, onFilesChange }) => {
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesChange([...files, ...acceptedFiles]);
  }, [files, onFilesChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    multiple: true
  });

  const removeImage = (indexToRemove: number) => {
    const newFiles = files.filter((_, index) => index !== indexToRemove);
    onFilesChange(newFiles);
  };

  const previews = files.map(file => ({ url: URL.createObjectURL(file), name: file.name }));

  React.useEffect(() => {
    return () => previews.forEach(p => URL.revokeObjectURL(p.url));
  }, [files]);

  return (
    <div>
      <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-slate-800' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`}>
        <input {...getInputProps()} />
        <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
        {isDragActive ?
          <p className="mt-2 text-slate-600 dark:text-slate-400">Déposez les images ici...</p> :
          <p className="mt-2 text-slate-600 dark:text-slate-400">Glissez-déposez des images ici, ou cliquez pour sélectionner des fichiers</p>
        }
      </div>
      {previews.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {previews.map((preview, index) => (
            <div key={`${preview.name}-${index}`} className="relative group">
              <img src={preview.url} alt={`preview ${index}`} className="w-full h-24 object-cover rounded-md" />
              <button onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <DeleteIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
