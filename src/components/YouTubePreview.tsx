"use client";

import React, { useState } from "react";
import { Play, ExternalLink, X, Maximize } from "lucide-react";

interface YouTubePreviewProps {
  url: string;
  className?: string;
}

// Extract YouTube video ID from various YouTube URL formats
const extractVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|m\.youtube\.com\/watch\?v=|youtube\.com\/watch\?.*&v=)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
};

// Get YouTube video thumbnail URL
const getThumbnailUrl = (videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'high'): string => {
  return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`;
};

// Get YouTube video title and description (using oEmbed API)
const getVideoInfo = async (videoId: string) => {
  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (response.ok) {
      const data = await response.json();
      return {
        title: data.title,
        author: data.author_name,
        thumbnail: data.thumbnail_url
      };
    }
  } catch (error) {
    console.error('Failed to fetch video info:', error);
  }
  return null;
};

export default function YouTubePreview({ url, className = "" }: YouTubePreviewProps) {
  const [videoInfo, setVideoInfo] = useState<{
    title: string;
    author: string;
    thumbnail: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const videoId = extractVideoId(url);

  React.useEffect(() => {
    if (!videoId) {
      setError(true);
      setLoading(false);
      return;
    }

    getVideoInfo(videoId).then((info) => {
      if (info) {
        setVideoInfo(info);
      } else {
        // Fallback: use basic info
        setVideoInfo({
          title: 'YouTube Video',
          author: 'YouTube',
          thumbnail: getThumbnailUrl(videoId)
        });
      }
      setLoading(false);
    }).catch(() => {
      setError(true);
      setLoading(false);
    });
  }, [videoId]);

  const handlePlayClick = () => {
    setIsPlaying(true);
  };

  const handleStopPlaying = () => {
    setIsPlaying(false);
  };

  const handleExpandToggle = () => {
    setIsExpanded(!isExpanded);
  };

  React.useEffect(() => {
    if (!videoId) {
      setError(true);
      setLoading(false);
      return;
    }

    getVideoInfo(videoId).then((info) => {
      if (info) {
        setVideoInfo(info);
      } else {
        // Fallback: use basic info
        setVideoInfo({
          title: 'YouTube Video',
          author: 'YouTube',
          thumbnail: getThumbnailUrl(videoId)
        });
      }
      setLoading(false);
    }).catch(() => {
      setError(true);
      setLoading(false);
    });
  }, [videoId]);

  if (loading) {
    return (
      <div className={`bg-gray-100 rounded-lg p-4 animate-pulse ${className}`}>
        <div className="flex space-x-3">
          <div className="w-32 h-24 bg-gray-300 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !videoId || !videoInfo) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-3 ${className}`}>
        <div className="flex items-center space-x-2 text-red-600">
          <ExternalLink className="w-4 h-4" />
          <span className="text-sm">Invalid YouTube URL</span>
        </div>
      </div>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow max-w-md ${className}`}>
      {isPlaying ? (
        // Embedded YouTube Player
        <div className={`relative ${isExpanded ? 'max-w-4xl' : 'max-w-md'} mx-auto transition-all duration-300`}>
          <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-lg bg-black">
            <iframe
              src={embedUrl}
              title={videoInfo?.title || 'YouTube Video'}
              className="absolute top-0 left-0 w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          
          {/* Video Controls */}
          <div className="p-3 bg-gray-50 border-t flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {videoInfo?.title || 'YouTube Video'}
              </h4>
              <p className="text-xs text-gray-500">
                by {videoInfo?.author || 'YouTube'}
              </p>
            </div>
            
            <div className="flex items-center space-x-2 ml-3">
              <button
                onClick={handleExpandToggle}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title={isExpanded ? "Standard size" : "Large size"}
              >
                <Maximize className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleStopPlaying}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="Close video"
              >
                <X className="w-4 h-4" />
              </button>
              
              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="Open on YouTube"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      ) : (
        // Video Thumbnail Preview
        <>
          {/* Video Thumbnail */}
          <div className="relative cursor-pointer" onClick={handlePlayClick}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={videoInfo?.thumbnail || getThumbnailUrl(videoId)}
              alt={videoInfo?.title || 'YouTube Video'}
              className="w-full h-40 object-cover"
              onError={(e) => {
                // Fallback to default thumbnail if custom one fails
                e.currentTarget.src = getThumbnailUrl(videoId);
              }}
            />
            
            {/* Play Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-40 transition-all">
              <div className="bg-red-600 hover:bg-red-700 rounded-full p-3 shadow-lg transition-colors">
                <Play className="w-6 h-6 text-white fill-current ml-1" />
              </div>
            </div>
            
            {/* YouTube Logo */}
            <div className="absolute top-3 right-3 bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">
              YouTube
            </div>
          </div>

          {/* Video Info */}
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
              {videoInfo?.title || 'YouTube Video'}
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              by {videoInfo?.author || 'YouTube'}
            </p>
            
            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={handlePlayClick}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium text-center transition-colors flex items-center justify-center space-x-1"
              >
                <Play className="w-4 h-4" />
                <span>Play Video</span>
              </button>
              
              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
              >
                <ExternalLink className="w-4 h-4" />
                <span>YouTube</span>
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Helper function to detect YouTube URLs in text
export const detectYouTubeUrls = (text: string): string[] => {
  const urlPattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|m\.youtube\.com\/watch\?v=|youtube\.com\/watch\?.*&v=)([^&\n?#\s]+)/gi;
  const matches = text.match(urlPattern);
  return matches || [];
};

// Helper function to check if a URL is a YouTube URL
export const isYouTubeUrl = (url: string): boolean => {
  return detectYouTubeUrls(url).length > 0;
};
