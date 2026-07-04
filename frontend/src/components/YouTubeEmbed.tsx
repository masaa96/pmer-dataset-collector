import React, { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Typography, Link } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface YouTubeEmbedProps {
  videoUrl: string;
  width?: string | number;
  height?: string | number;
}

// --- Minimal typings for the parts of the YouTube IFrame Player API we use ---
interface YTPlayerEvent {
  target: YTPlayer;
  data?: number;
}

interface YTPlayer {
  destroy: () => void;
}

interface YTPlayerOptions {
  videoId: string;
  width?: string | number;
  height?: string | number;
  playerVars?: Record<string, number | string>;
  events?: {
    onReady?: (event: YTPlayerEvent) => void;
    onError?: (event: YTPlayerEvent) => void;
  };
}

declare global {
  interface Window {
    YT?: {
      Player: new (elementId: HTMLElement | string, options: YTPlayerOptions) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiLoadingPromise: Promise<void> | null = null;

/** Loads the YouTube IFrame Player API script once and reuses it across component instances. */
function loadYouTubeIframeApi(): Promise<void> {
  if (window.YT?.Player) {
    return Promise.resolve();
  }
  if (apiLoadingPromise) {
    return apiLoadingPromise;
  }
  apiLoadingPromise = new Promise((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return apiLoadingPromise;
}

// YouTube IFrame Player API onError codes:
// https://developers.google.com/youtube/iframe_api_reference#onError
// 2   - invalid video ID / malformed request
// 5   - HTML5 player error
// 100 - video not found (removed or private)
// 101 - embedding disabled by the video owner
// 150 - same as 101 (embedding disabled), different error surface
const EMBEDDING_DISABLED_CODES = new Set([101, 150]);
const NOT_FOUND_CODES = new Set([100]);

/**
 * YouTubeEmbed Component
 *
 * Embeds a YouTube video using the official IFrame Player API (not a raw
 * <iframe>) so playback errors can be detected via onError and a helpful
 * fallback UI can be shown instead of YouTube's bare "Video unavailable" card.
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
  height = '400px',
}) => {
  // Plain native element (never re-rendered by React) that the YT IFrame API
  // is allowed to replace with its own <iframe>. Mounting the player directly
  // onto a React-managed element is unsafe: YT.Player swaps the element out
  // of the DOM, and if React later tries to update that same element (e.g. to
  // toggle a style prop) it ends up operating on a detached/stale node,
  // which silently breaks rendering.
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorCode, setErrorCode] = useState<number | null>(null);

  // Extract video ID from various YouTube URL formats
  const extractVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = extractVideoId(videoUrl);

  useEffect(() => {
    if (!videoId || !mountRef.current) {
      return;
    }

    let cancelled = false;
    setStatus('loading');
    setErrorCode(null);

    loadYouTubeIframeApi().then(() => {
      if (cancelled || !mountRef.current || !window.YT) {
        return;
      }
      playerRef.current = new window.YT.Player(mountRef.current, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          rel: 0,
          modestbranding: 1,
          controls: 1,
        },
        events: {
          onReady: () => {
            if (!cancelled) setStatus('ready');
          },
          onError: (event) => {
            if (!cancelled) {
              setErrorCode(event.data ?? null);
              setStatus('error');
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

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
          color: 'text.secondary',
        }}
      >
        Invalid YouTube URL
      </Box>
    );
  }

  const getErrorMessage = () => {
    if (errorCode && EMBEDDING_DISABLED_CODES.has(errorCode)) {
      return 'The owner of this video has disabled embedding.';
    }
    if (errorCode && NOT_FOUND_CODES.has(errorCode)) {
      return 'This video was removed, made private, or no longer exists.';
    }
    return 'This video is unavailable for playback here.';
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width,
        height,
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Outer wrapper is React-managed and safe to re-render (only its own style changes). 
          The inner native div is handed off to YT.Player and never touched by React again. */}
      <Box
        sx={{
          width: '100%',
          height: '100%',
          visibility: status === 'ready' ? 'visible' : 'hidden',
        }}
      >
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      </Box>

      {status === 'loading' && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress size={32} />
        </Box>
      )}

      {status === 'error' && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            p: 2,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <ErrorOutlineIcon color="warning" fontSize="large" />
          <Typography variant="body2">{getErrorMessage()}</Typography>
          <Link
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            Watch on YouTube <OpenInNewIcon fontSize="inherit" />
          </Link>
        </Box>
      )}
    </Box>
  );
};

export default YouTubeEmbed;
