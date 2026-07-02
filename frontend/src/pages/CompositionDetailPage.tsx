/**
 * Composition Detail Page
 * Shows YouTube video (left) and emotion labels (right) for a specific composition
 */
import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../config/colorConfig';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  Chip,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Divider,
  Snackbar,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import YouTubeEmbed from '../components/YouTubeEmbed';
import Navigation from '../components/Navigation';
import { Composition, getAllEmotions, submitLabels } from '../api/data';
import { useProgress } from '../context/ProgressContext';

const CompositionDetailPage: React.FC = () => {
  const { composerName } = useParams<{ composerName: string; compositionName: string }>();
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const navigate = useNavigate();
  const location = useLocation();
  const { triggerRefresh } = useProgress();
  
  // Get composition data from navigation state
  const composition = location.state?.composition as Composition | undefined;

  // Determine if this is a labeled or unlabeled composition based on URL
  const isLabeled = location.pathname.includes('/labeled-composers/');

  // State management
  const [availableEmotions, setAvailableEmotions] = useState<string[]>([]);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [openNewEmotionDialog, setOpenNewEmotionDialog] = useState(false);
  const [newEmotionName, setNewEmotionName] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Original emotions from the composition (cannot be removed)
  const originalEmotions = composition?.emotions || [];

  // Load all available emotions on mount
  useEffect(() => {
    const loadEmotions = async () => {
      try {
        const emotions = await getAllEmotions();
        setAvailableEmotions(emotions);
      } catch (error) {
        console.error('Failed to load emotions:', error);
      }
    };
    loadEmotions();
  }, []);

  // Handle adding an emotion from available list
  const handleAddEmotion = (emotion: string) => {
    if (!selectedEmotions.includes(emotion) && !originalEmotions.includes(emotion) && !isSubmitted) {
      setSelectedEmotions([...selectedEmotions, emotion]);
    }
  };

  // Handle removing an emotion (only user-added ones)
  const handleRemoveEmotion = (emotion: string) => {
    if (!isSubmitted) {
      setSelectedEmotions(selectedEmotions.filter(e => e !== emotion));
    }
  };

  // Handle adding a new emotion to the dataset
  const handleAddNewEmotion = () => {
    const trimmedName = newEmotionName.trim();
    const emotionExists = availableEmotions.some(
      emotion => emotion.toLowerCase() === trimmedName.toLowerCase()
    );
    if (trimmedName && !emotionExists) {
      setAvailableEmotions([...availableEmotions, trimmedName]);
      setSelectedEmotions([...selectedEmotions, trimmedName]);
      setNewEmotionName('');
      setOpenNewEmotionDialog(false);
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    if (selectedEmotions.length === 0 || !composerName || !composition) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await submitLabels(
        composerName,
        composition.name,
        selectedEmotions,
        isLabeled
      );
      
      setIsSubmitted(true);
      setSnackbarMessage(result.message || 'Labels submitted successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

      // Trigger progress bar refresh
      triggerRefresh();

      // For unlabeled compositions, navigate back after a short delay
      if (!isLabeled) {
        setTimeout(() => {
          navigate('/unlabeled-composers');
        }, 2000);
      }
    } catch (error: any) {
      setSnackbarMessage(error.response?.data?.detail || 'Failed to submit labels');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get all current emotions (original + selected)
  const allCurrentEmotions = [...originalEmotions, ...selectedEmotions];

  // Get available emotions that haven't been selected yet
  const unselectedEmotions = availableEmotions.filter(
    emotion => !allCurrentEmotions.includes(emotion)
  );

  if (!composition) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Navigation />
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" color="white">
            Composition data not found. Please navigate from the compositions list.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3, px: { xs: 2, sm: 3 } }}>
      <Navigation />
      
      {/* Header */}
      <Box sx={{ mb: 3, mt: 2 }}>
        <Typography 
          variant="h5" 
          sx={{ 
            color: 'white', 
            fontWeight: 'bold',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            mb: 0.5,
          }}
        >
          {composition.name}
        </Typography>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            color: 'rgba(255, 255, 255, 0.9)', 
            textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
          }}
        >
          by {composerName}
        </Typography>
      </Box>

      {/* Main Content Grid */}
      <Grid container spacing={2} sx={{ mb: 6 }}>
        {/* Left Side: YouTube Video */}
        <Grid item xs={12} sm={12} md={6}>
          <Card
            sx={{
              backgroundColor: colors.backgroundSecondary,
              backdropFilter: colors.backdropFilter,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              borderRadius: 3,
              p: 1.5,
              height: { xs: '450px', sm: '550px', md: '600px' },
              maxWidth: { xs: '100%', sm: '700px', md: '100%' },
              mx: { xs: 0, sm: 'auto', md: 0 },
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>
              Performance
            </Typography>
            
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {composition.youtube_url ? (
                <YouTubeEmbed 
                  videoUrl={composition.youtube_url} 
                  height="100%"
                />
              ) : (
                <Paper
                  elevation={0}
                  sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.05)',
                    borderRadius: 2,
                    border: '2px dashed rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <Typography 
                    variant="h6" 
                    color="text.secondary"
                    sx={{ fontStyle: 'italic', textAlign: 'center', px: 3 }}
                  >
                    No YouTube link available for this composition
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ mt: 1, textAlign: 'center', px: 3 }}
                  >
                    You can add a YouTube URL when editing this composition
                  </Typography>
                </Paper>
              )}
            </Box>
          </Card>
        </Grid>

        {/* Right Side: Emotion Labels */}
        <Grid item xs={12} sm={12} md={6}>
          <Card
            sx={{
              backgroundColor: colors.backgroundSecondary,
              backdropFilter: colors.backdropFilter,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              borderRadius: 3,
              p: 2,
              height: { xs: 'auto', md: '600px' },
              maxWidth: { xs: '100%', sm: '700px', md: '100%' },
              mx: { xs: 0, sm: 'auto', md: 0 },
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Emotional Labels
            </Typography>

            {/* Current Labels Section */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500, color: 'text.secondary' }}>
                Current Labels:
              </Typography>
              {allCurrentEmotions.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, minHeight: '60px' }}>
                  {originalEmotions.map((emotion, idx) => (
                    <Chip
                      key={`original-${idx}`}
                      label={emotion}
                      color="primary"
                      variant="filled"
                      sx={{
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      }}
                    />
                  ))}
                  {selectedEmotions.map((emotion, idx) => (
                    <Chip
                      key={`selected-${idx}`}
                      label={emotion}
                      color="secondary"
                      variant="filled"
                      onDelete={!isSubmitted ? () => handleRemoveEmotion(emotion) : undefined}
                      deleteIcon={<CloseIcon />}
                      sx={{
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      }}
                    />
                  ))}
                </Box>
              ) : (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    backgroundColor: 'rgba(0, 0, 0, 0.03)',
                    borderRadius: 2,
                    border: '1px dashed rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    This composition has not been labeled yet. Select emotions below.
                  </Typography>
                </Paper>
              )}
            </Box>

            <Divider sx={{ my: 1.5 }} />

            {/* Available Emotions Section */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500, color: 'text.secondary' }}>
                Available Emotions:
              </Typography>
              
              <Box sx={{ flex: 1, overflow: 'auto', mb: 2 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {unselectedEmotions.map((emotion, idx) => (
                    <Button
                      key={idx}
                      variant="outlined"
                      size="small"
                      onClick={() => handleAddEmotion(emotion)}
                      disabled={isSubmitted}
                      sx={{
                        textTransform: 'none',
                        borderRadius: 2,
                        borderColor: 'rgba(0, 0, 0, 0.2)',
                        color: 'text.primary',
                        '&:hover': {
                          borderColor: 'primary.main',
                          backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        },
                      }}
                    >
                      {emotion}
                    </Button>
                  ))}
                  
                  {/* Add New Emotion Button */}
                  <IconButton
                    onClick={() => setOpenNewEmotionDialog(true)}
                    disabled={isSubmitted}
                    size="small"
                    sx={{
                      border: '2px dashed rgba(0, 0, 0, 0.2)',
                      borderRadius: 2,
                      width: 40,
                      height: 32,
                      '&:hover': {
                        borderColor: 'primary.main',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                      },
                    }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              {/* Submit Button */}
              <Button
                variant="contained"
                fullWidth
                onClick={handleSubmit}
                disabled={selectedEmotions.length === 0 || isSubmitted || isSubmitting}
                sx={{
                  py: 1.5,
                  fontWeight: 600,
                  textTransform: 'none',
                  background: isSubmitted 
                    ? 'linear-gradient(135deg, #a8a8a8 0%, #7a7a7a 100%)'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: isSubmitted
                      ? 'linear-gradient(135deg, #a8a8a8 0%, #7a7a7a 100%)'
                      : 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                  },
                  '&:disabled': {
                    background: 'linear-gradient(135deg, #a8a8a8 0%, #7a7a7a 100%)',
                  },
                }}
              >
                {isSubmitting ? 'Submitting...' : isSubmitted ? 'Submitted' : 'Submit Labels'}
              </Button>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Add New Emotion Dialog */}
      <Dialog 
        open={openNewEmotionDialog} 
        onClose={() => setOpenNewEmotionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Emotion</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter a new emotion that's not in the current list. This will be added to the dataset.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Emotion Name"
            value={newEmotionName}
            onChange={(e) => setNewEmotionName(e.target.value)}
            onKeyPress={(e) => {
              const emotionExists = availableEmotions.some(
                emotion => emotion.toLowerCase() === newEmotionName.trim().toLowerCase()
              );
              if (e.key === 'Enter' && newEmotionName.trim() && !emotionExists) {
                handleAddNewEmotion();
              }
            }}
            placeholder="e.g., Melancholic, Triumphant"
            error={
              newEmotionName.trim() !== '' && 
              availableEmotions.some(emotion => emotion.toLowerCase() === newEmotionName.trim().toLowerCase())
            }
            helperText={
              newEmotionName.trim() !== '' && 
              availableEmotions.some(emotion => emotion.toLowerCase() === newEmotionName.trim().toLowerCase())
                ? 'This emotion already exists in the dataset'
                : ''
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewEmotionDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAddNewEmotion} 
            variant="contained"
            disabled={
              !newEmotionName.trim() || 
              availableEmotions.some(emotion => emotion.toLowerCase() === newEmotionName.trim().toLowerCase())
            }
          >
            Add Emotion
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CompositionDetailPage;
