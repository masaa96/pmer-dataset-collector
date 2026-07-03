/**
 * Progress Bar Component
 * Shows collection progress (current/target) on all pages except login
 */
import React, { useEffect, useState, useRef } from 'react';
import { Box, LinearProgress, Typography, Paper, Dialog, DialogContent, DialogTitle, Button } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../config/colorConfig';
import { getComposersSummary } from '../api/data';
import { useProgress } from '../context/ProgressContext';

const ProgressBar: React.FC = () => {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const location = useLocation();
  const [labeledCount, setLabeledCount] = useState(0);
  const [target, setTarget] = useState(1000);
  const [loading, setLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const { refreshTrigger } = useProgress();
  // Tracks whether the celebration has already been shown during this visit
  // to the Home page, so dismissing it doesn't immediately reopen it if the
  // progress data refreshes again while still on the page. Resets whenever
  // ProgressBar remounts (i.e. every time the user navigates to Home).
  const hasShownThisVisitRef = useRef(false);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const summary = await getComposersSummary();
        const newLabeledCount = summary.labeled_count;
        const newTarget = summary.collection_target;
        
        setLabeledCount(newLabeledCount);
        setTarget(newTarget);
        
        // Show the celebration every time the goal is reached on the Home
        // page (but only once per visit, not once ever).
        if (newLabeledCount >= newTarget && location.pathname === '/home' && !hasShownThisVisitRef.current) {
          setShowCelebration(true);
          hasShownThisVisitRef.current = true;
        }
      } catch (error) {
        console.error('Failed to load progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [refreshTrigger, location.pathname]);

  const progress = (labeledCount / target) * 100;

  const handleCloseCelebration = () => {
    setShowCelebration(false);
  };

  if (loading) {
    return null;
  }

  return (
    <>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          top: 56,
          left: 0,
          right: 0,
          zIndex: 99,
          backgroundColor: colors.backgroundSecondary,
          backdropFilter: colors.backdropFilter,
          borderRadius: 0,
          borderBottom: isDarkMode
            ? '2px solid rgba(255, 255, 255, 0.1)'
            : '2px solid rgba(255, 255, 255, 0.3)',
        }}
      >
        <Box sx={{ px: 4, py: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" fontWeight="bold" color="text.primary">
              Collection Progress
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="primary">
              {labeledCount} / {target} compositions
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
                background: isDarkMode
                  ? 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                  : 'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
              },
            }}
          />
        </Box>
      </Paper>

      {/* Celebration Dialog */}
      <Dialog
        open={showCelebration}
        onClose={handleCloseCelebration}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            color: 'white',
            textAlign: 'center',
          }
        }}
      >
        <DialogTitle>
          <Typography variant="h2" sx={{ fontSize: '5rem', mb: 2 }}>
            🎉
          </Typography>
          <Typography variant="h4" fontWeight="bold">
            Finished!
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Congratulations! You've reached {target} labeled compositions!
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Amazing work on completing the dataset collection! 🎊
          </Typography>
          <Button
            variant="contained"
            onClick={handleCloseCelebration}
            sx={{
              backgroundColor: 'white',
              color: '#764ba2',
              fontWeight: 'bold',
              px: 4,
              py: 1.5,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
              },
            }}
          >
            Continue
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProgressBar;