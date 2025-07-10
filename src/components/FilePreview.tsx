"use client";

import {
  X,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Loader2,
} from "lucide-react";

interface FilePreviewProps {
  file: File;
  onSend: () => void;
  onCancel: () => void;
  isUploading: boolean;
}

export default function FilePreview({
  file,
  onSend,
  onCancel,
  isUploading,
}: FilePreviewProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = () => {
    if (file.type.startsWith("image/")) {
      return <ImageIcon className="w-8 h-8 text-blue-500" />;
    } else if (file.type.startsWith("video/")) {
      return <Video className="w-8 h-8 text-purple-500" />;
    } else if (file.type.startsWith("audio/")) {
      return <Music className="w-8 h-8 text-green-500" />;
    } else {
      return <FileText className="w-8 h-8 text-gray-500" />;
    }
  };

  const getPreview = () => {
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      return (
        <img
          src={url}
          alt={file.name}
          className="w-full h-20 object-cover rounded"
          onLoad={() => URL.revokeObjectURL(url)}
        />
      );
    } else if (file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      return (
        <video
          className="w-full h-20 rounded object-cover"
          preload="metadata"
          onLoadedMetadata={() => URL.revokeObjectURL(url)}
        >
          <source src={url} type={file.type} />
        </video>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-xl p-4 mb-2 animate-in slide-in-from-bottom-2 duration-200">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          📎 Datei senden
        </h3>
        <button
          onClick={onCancel}
          disabled={isUploading}
          className="text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mb-3">
        {file.type.startsWith("image/") || file.type.startsWith("video/") ? (
          <div className="relative">
            {getPreview()}
            <div className="absolute top-2 left-2">{getFileIcon()}</div>
          </div>
        ) : (
          <div className="flex items-center p-3 bg-gray-50 rounded">
            {getFileIcon()}
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {file.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(file.size)}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 mb-3">
        <p>{file.name}</p>
        <p>{formatFileSize(file.size)}</p>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={onCancel}
          disabled={isUploading}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Abbrechen
        </button>
        <button
          onClick={onSend}
          disabled={isUploading}
          className="flex-1 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Wird hochgeladen...
            </>
          ) : (
            "📤 Senden"
          )}
        </button>
      </div>
    </div>
  );
}
