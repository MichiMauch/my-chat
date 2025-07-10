"use client";

import { useState, useRef, DragEvent } from "react";
import { Upload } from "lucide-react";

interface DragDropZoneProps {
  onFileSelect: (file: File) => void;
  children: React.ReactNode;
  className?: string;
  acceptedTypes?: string[];
  maxSizeInMB?: number;
}

export default function DragDropZone({
  onFileSelect,
  children,
  className = "",
  acceptedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "video/mp4",
    "video/webm",
    "audio/mpeg",
    "audio/wav",
  ],
  maxSizeInMB = 5,
}: DragDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const dragRef = useRef<HTMLDivElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > maxSizeInMB * 1024 * 1024) {
      return `Datei ist zu groß. Maximal ${maxSizeInMB}MB erlaubt.`;
    }

    if (!acceptedTypes.includes(file.type)) {
      return "Dateityp wird nicht unterstützt.";
    }

    return null;
  };

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  };

  const handleDragOut = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev - 1);

    if (dragCounter - 1 === 0) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragOver(false);
    setDragCounter(0);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const error = validateFile(file);

      if (error) {
        alert(error);
        return;
      }

      onFileSelect(file);
      e.dataTransfer.clearData();
    }
  };

  return (
    <div
      ref={dragRef}
      className={`relative ${className}`}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {children}

      {isDragOver && (
        <div className="absolute inset-0 bg-blue-50 bg-opacity-95 border-2 border-dashed border-blue-400 rounded-lg flex items-end justify-center z-50 backdrop-blur-sm pb-8">
          <div className="text-center p-8 bg-white bg-opacity-90 rounded-lg shadow-lg">
            <Upload className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <p className="text-blue-700 font-semibold text-lg mb-2">
              Datei hier ablegen
            </p>
            <p className="text-blue-600 text-sm">zum Senden in den Chat</p>
            <p className="text-gray-500 text-xs mt-2">
              Maximal {maxSizeInMB}MB • Bilder, Videos, Audio, PDFs und
              Dokumente
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
