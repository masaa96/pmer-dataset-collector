/**
 * Progress Bar Component
 * Shows collection progress (current/1000) on all pages except login
 */
import React, { useEffect, useState } from 'react';
import { Box, LinearProgress, Typography, Paper } from '@mui/material';
import { getComposersSummary } from '../api/data';

const ProgressBar: React.FC = () => {
  const [labeledCount, setLabeledCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const TARGET = 1000;

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const summary = await getComposersSummary();
        setLabeledCount(summary.labeled_count);
      } catch (error) {
        console.error('Failed to load progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, []);

  const progress = (labeledCount / TARGET) * 100;

  if (loading) {
    return null;
  }

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: 0,
        borderBottom: '2px solid rgba(255, 255, 255, 0.3)',
      }}
    >
      <Box sx={{ px: 4, py: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" fontWeight="bold" color="text.primary">
            Collection Progress
          </Typography>
          <Typography variant="body2" fontWeight="bold" color="primary">
            {labeledCount} / {TARGET} compositions
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
              background: 'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            },
          }}
        />
      </Box>
    </Paper>
  );
};

export default ProgressBar;
