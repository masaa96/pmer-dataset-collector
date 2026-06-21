import React from 'react';
import { Box } from '@mui/material';

interface YouTubeEmbedProps {
  videoUrl: string;
  width?: string | number;
  height?: string | number;
}

/**
 * YouTubeEmbed Component
 * 
 * Embeds a YouTube video using an iframe.
 * 
 * @param videoUrl - Full YouTube URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID)
 * @param width - Width of the embed (default: '100%')
 * @param height - Height of the embed (default: '400px')
 * 
 * Example usage:
 * <YouTubeEmbed videoUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />
 * <YouTubeEmbed videoUrl="https://youtu.be/dQw4w9WgXcQ" width="800px" height="450px" />
 */
const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({ 
  videoUrl, 
  width = '100%', 
  height = '400px' 
}) => {
  // Extract video ID from various YouTube URL formats
  const extractVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = extractVideoId(videoUrl);

  if (!videoId) {
    return (
      <Box 
        sx={{ 
          width, 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          borderRadius: 2,
          color: 'text.secondary'
        }}
      >
        Invalid YouTube URL
      </Box>
    );
  }

  // Construct embed URL with parameters for better UX
  // Parameters:
  // - rel=0: Don't show related videos from other channels
  // - modestbranding=1: Minimize YouTube branding
  // - controls=1: Show player controls
  const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&controls=1`;

  return (
    <Box
      sx={{
        position: 'relative',
        width,
        height,
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      }}
    >
      <iframe
        width="100%"
        height="100%"
        src={embedUrl}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ 
          border: 'none',
          display: 'block'
        }}
      />
    </Box>
  );
};

export default YouTubeEmbed;
