'use client';

import { useState, useRef } from 'react';
import { Paperclip, X, Image, FileText } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (fileInfo: {
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }) => void;
}

interface SelectedFile {
  file: File;
  preview: string;
  type: 'image' | 'document';
}

export default function FileUpload({ onFileSelect }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    // Check file size (max 5MB for Vercel compatibility)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Check file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('File type not supported. Please use images, PDF, or text files.');
      return;
    }

    setIsUploading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const fileType = file.type.startsWith('image/') ? 'image' : 'document';
        
        setSelectedFile({
          file,
          preview: fileType === 'image' ? result : '',
          type: fileType
        });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Error reading file');
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSendFile = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    
    try {
      // Upload file to R2
      const formData = new FormData();
      formData.append('file', selectedFile.file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      const result = await response.json();
      
      // Call the callback with file info
      onFileSelect({
        fileName: result.file.originalName,
        fileUrl: result.file.url,
        fileType: result.file.type,
        fileSize: result.file.size,
      });
      
      // Reset state
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleInputChange}
        className="hidden"
        accept="image/*,.pdf,.txt,.doc,.docx"
      />
      
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        title="Attach file"
      >
        <Paperclip className="w-5 h-5" />
      </button>

      {selectedFile && (
        <div className="absolute bottom-12 right-0 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80 z-50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-gray-900">File Preview</h3>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="mb-3">
            {selectedFile.type === 'image' ? (
              <div className="relative">
                <img
                  src={selectedFile.preview}
                  alt="Preview"
                  className="w-full h-32 object-cover rounded"
                />
                <Image className="absolute top-2 left-2 w-4 h-4 text-white bg-black bg-opacity-50 rounded p-0.5" />
              </div>
            ) : (
              <div className="flex items-center p-3 bg-gray-50 rounded">
                <FileText className="w-8 h-8 text-gray-400 mr-3" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedFile.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(selectedFile.file.size)}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="text-xs text-gray-500 mb-3">
            <p>{selectedFile.file.name}</p>
            <p>{formatFileSize(selectedFile.file.size)}</p>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleCancel}
              className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSendFile}
              disabled={isUploading}
              className="flex-1 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}