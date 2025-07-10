'use client';

import { useState } from 'react';
import { Download, FileText, Image, Video, Music, Eye } from 'lucide-react';

interface FileMessageProps {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

export default function FileMessage({ fileName, fileUrl, fileType, fileSize }: FileMessageProps) {
  const [showPreview, setShowPreview] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    if (fileType.startsWith('image/')) {
      return <Image className="w-6 h-6 text-blue-500" />;
    } else if (fileType.startsWith('video/')) {
      return <Video className="w-6 h-6 text-purple-500" />;
    } else if (fileType.startsWith('audio/')) {
      return <Music className="w-6 h-6 text-green-500" />;
    } else {
      return <FileText className="w-6 h-6 text-gray-500" />;
    }
  };

  const canPreview = () => {
    return fileType.startsWith('image/') || 
           fileType.startsWith('video/') || 
           fileType.startsWith('audio/') ||
           fileType === 'application/pdf';
  };

  const renderPreview = () => {
    if (fileType.startsWith('image/')) {
      return (
        <img 
          src={fileUrl} 
          alt={fileName}
          className="max-w-xs max-h-64 rounded-lg object-contain"
        />
      );
    } else if (fileType.startsWith('video/')) {
      return (
        <video 
          controls 
          className="max-w-xs max-h-64 rounded-lg"
          preload="metadata"
        >
          <source src={fileUrl} type={fileType} />
          Your browser does not support the video tag.
        </video>
      );
    } else if (fileType.startsWith('audio/')) {
      return (
        <audio controls className="w-full max-w-xs">
          <source src={fileUrl} type={fileType} />
          Your browser does not support the audio tag.
        </audio>
      );
    } else if (fileType === 'application/pdf') {
      return (
        <iframe
          src={fileUrl}
          className="w-full h-64 rounded-lg border"
          title={fileName}
        />
      );
    }
    return null;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-sm border border-gray-200 rounded-lg p-3 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {getFileIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate" title={fileName}>
              {fileName}
            </p>
            <p className="text-xs text-gray-500">
              {formatFileSize(fileSize)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          {canPreview() && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Toggle preview"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleDownload}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Download file"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showPreview && canPreview() && (
        <div className="mt-3">
          {renderPreview()}
        </div>
      )}
    </div>
  );
}