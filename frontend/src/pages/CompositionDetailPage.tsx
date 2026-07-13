/**
 * Composition Detail Page
 * Shows YouTube video (left) and emotion labels (right) for a specific composition
 */
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
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
  Autocomplete,
  IconButton,
  Divider,
  Snackbar,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import YouTubeEmbed from '../components/YouTubeEmbed';
import Navigation from '../components/Navigation';
import { Composition, getAllEmotions, submitLabels, addYoutubeLink, uploadSheetPdf, deleteSheetPdf, getAllComposerCompositions } from '../api/data';
import { API_BASE_URL } from '../api/config';
import { useProgress } from '../context/ProgressContext';
import { useAuth } from '../context/AuthContext';

const MAX_SHEET_PDF_SIZE_BYTES = 16 * 1024 * 1024; // 16 MB

const CompositionDetailPage: React.FC = () => {
  const { composerName, compositionName } = useParams<{ composerName: string; compositionName: string }>();
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const navigate = useNavigate();
  const location = useLocation();
  const { triggerRefresh } = useProgress();
  const { user } = useAuth();
  const isAdmin = user?.is_admin ?? false;
  
  // Get composition data from navigation state as an initial value for a fast
  // first render. This is then refreshed from the API below, since
  // navigation state can go stale (e.g. it's preserved across a manual page
  // reload, or after a composition is edited directly in the database) -
  // relying on it alone would keep showing outdated data indefinitely.
  const [composition, setComposition] = useState<Composition | undefined>(
    location.state?.composition as Composition | undefined
  );

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
  const [currentYoutubeUrl, setCurrentYoutubeUrl] = useState(composition?.youtube_url || '');
  const [openYoutubeDialog, setOpenYoutubeDialog] = useState(false);
  const [youtubeUrlInput, setYoutubeUrlInput] = useState('');
  const [isAddingYoutubeLink, setIsAddingYoutubeLink] = useState(false);
  const [currentSheetPdfId, setCurrentSheetPdfId] = useState(composition?.sheet_pdf_id || null);
  const [currentSheetPdfFilename, setCurrentSheetPdfFilename] = useState(composition?.sheet_pdf_filename || null);
  const [isUploadingSheetPdf, setIsUploadingSheetPdf] = useState(false);
  const [isDeletingSheetPdf, setIsDeletingSheetPdf] = useState(false);
  const sheetPdfInputRef = useRef<HTMLInputElement>(null);

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

  // Refresh the composition's data directly from the API on mount, so this
  // page always reflects the current database state (YouTube link, sheet
  // music, emotions) instead of a potentially stale snapshot carried over in
  // navigation state.
  useEffect(() => {
    const refreshComposition = async () => {
      if (!composerName || !compositionName) return;
      try {
        const all = await getAllComposerCompositions(composerName);
        const fresh = all.find((c) => c.name === compositionName);
        if (fresh) {
          setComposition(fresh);
          setCurrentYoutubeUrl(fresh.youtube_url || '');
          setCurrentSheetPdfId(fresh.sheet_pdf_id || null);
          setCurrentSheetPdfFilename(fresh.sheet_pdf_filename || null);
        }
      } catch (error) {
        console.error('Failed to refresh composition data:', error);
      }
    };
    refreshComposition();
  }, [composerName, compositionName]);

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

  // Handle adding a new emotion to the dataset - or, if the entered name
  // already matches an existing emotion, just add that one instead of
  // creating a near-duplicate.
  const handleAddNewEmotion = () => {
    const trimmedName = newEmotionName.trim();
    if (!trimmedName) {
      return;
    }

    const existing = availableEmotions.find(
      emotion => emotion.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existing) {
      handleAddEmotion(existing);
      setNewEmotionName('');
      setOpenNewEmotionDialog(false);
      return;
    }

    setAvailableEmotions([...availableEmotions, trimmedName]);
    setSelectedEmotions([...selectedEmotions, trimmedName]);
    setNewEmotionName('');
    setOpenNewEmotionDialog(false);
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

  // Helper function to validate YouTube URLs
  const isValidYouTubeUrl = (url: string): boolean => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]+/;
    return youtubeRegex.test(url);
  };

  // Handle opening the "Add YouTube Link" dialog (admin only)
  const handleOpenYoutubeDialog = () => {
    setYoutubeUrlInput('');
    setOpenYoutubeDialog(true);
  };

  const handleCloseYoutubeDialog = () => {
    setOpenYoutubeDialog(false);
    setYoutubeUrlInput('');
  };

  // Handle submitting the new YouTube link (admin only, saved to MongoDB)
  const handleAddYoutubeLink = async () => {
    const trimmedUrl = youtubeUrlInput.trim();

    if (!trimmedUrl || !isValidYouTubeUrl(trimmedUrl)) {
      setSnackbarMessage('Please enter a valid YouTube URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID)');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    if (!composerName || !composition) {
      return;
    }

    setIsAddingYoutubeLink(true);

    try {
      const result = await addYoutubeLink(composerName, composition.name, trimmedUrl);
      setCurrentYoutubeUrl(result.youtube_url);
      setSnackbarMessage(result.message || 'YouTube link added successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      handleCloseYoutubeDialog();
    } catch (error: any) {
      setSnackbarMessage(error.response?.data?.detail || 'Failed to add YouTube link');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsAddingYoutubeLink(false);
    }
  };

  // Open the hidden file picker for the "Upload PDF" button
  const handleUploadSheetPdfClick = () => {
    sheetPdfInputRef.current?.click();
  };

  // Handle the selected sheet music PDF file, validate it client-side, and
  // upload it (stored via GridFS on the backend, linked to this composition)
  const handleSheetPdfFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file again later

    if (!file || !composerName || !composition) {
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setSnackbarMessage('Please select a PDF file');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    if (file.size > MAX_SHEET_PDF_SIZE_BYTES) {
      setSnackbarMessage('PDF file is too large. Maximum allowed size is 16 MB');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setIsUploadingSheetPdf(true);

    try {
      const result = await uploadSheetPdf(composerName, composition.name, file);
      setCurrentSheetPdfId(result.sheet_pdf_id);
      setCurrentSheetPdfFilename(result.sheet_pdf_filename);
      setSnackbarMessage(result.message || 'Sheet music PDF uploaded successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error: any) {
      setSnackbarMessage(error.response?.data?.detail || 'Failed to upload sheet music PDF');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsUploadingSheetPdf(false);
    }
  };

  // Handle removing the current sheet music PDF (admin only)
  const handleDeleteSheetPdf = async () => {
    if (!composerName || !composition) {
      return;
    }

    if (!window.confirm('Remove the sheet music PDF for this composition?')) {
      return;
    }

    setIsDeletingSheetPdf(true);

    try {
      const result = await deleteSheetPdf(composerName, composition.name);
      setCurrentSheetPdfId(null);
      setCurrentSheetPdfFilename(null);
      setSnackbarMessage(result.message || 'Sheet music PDF removed successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error: any) {
      setSnackbarMessage(error.response?.data?.detail || 'Failed to remove sheet music PDF');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsDeletingSheetPdf(false);
    }
  };

  // Get all current emotions (original + selected)
  const allCurrentEmotions = [...originalEmotions, ...selectedEmotions];

  // Get available emotions that haven't been selected yet
  const unselectedEmotions = availableEmotions.filter(
    emotion => !allCurrentEmotions.includes(emotion)
  );

  // If the "Add New Emotion" dialog input matches an existing emotion in the
  // dataset, surface it so the user can reuse it instead of creating a
  // duplicate (e.g. "happy" vs "Happy").
  const trimmedNewEmotionName = newEmotionName.trim();
  const matchedExistingEmotion = trimmedNewEmotionName
    ? availableEmotions.find(
        emotion => emotion.toLowerCase() === trimmedNewEmotionName.toLowerCase()
      ) || null
    : null;
  const isMatchedEmotionAlreadyCurrent = matchedExistingEmotion
    ? allCurrentEmotions.includes(matchedExistingEmotion)
    : false;

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
              {currentYoutubeUrl ? (
                <YouTubeEmbed 
                  videoUrl={currentYoutubeUrl} 
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
                  {isAdmin && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleOpenYoutubeDialog}
                      sx={{
                        mt: 2,
                        fontWeight: 600,
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                        },
                      }}
                    >
                      Add YouTube Link
                    </Button>
                  )}
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

      {/* Sheet Music PDF Section */}
      <Card
        sx={{
          backgroundColor: colors.backgroundSecondary,
          backdropFilter: colors.backdropFilter,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          borderRadius: 3,
          p: 2.5,
          mb: 6,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PictureAsPdfIcon sx={{ fontSize: 36, color: currentSheetPdfId ? '#e53935' : 'text.secondary' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Sheet Music
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {currentSheetPdfId
                ? currentSheetPdfFilename || 'PDF available'
                : 'No sheet music PDF uploaded yet (max 16 MB)'}
            </Typography>
          </Box>
        </Box>

        {currentSheetPdfId ? (
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              component="a"
              href={`${API_BASE_URL}/api/data/compositions/sheet-pdf/${currentSheetPdfId}`}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<PictureAsPdfIcon />}
              sx={{
                fontWeight: 600,
                textTransform: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                },
              }}
            >
              View / Download PDF
            </Button>
            {isAdmin && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<CloseIcon />}
                onClick={handleDeleteSheetPdf}
                disabled={isDeletingSheetPdf}
                sx={{ fontWeight: 600, textTransform: 'none' }}
              >
                {isDeletingSheetPdf ? 'Removing...' : 'Remove PDF'}
              </Button>
            )}
          </Box>
        ) : (
          <>
            <input
              ref={sheetPdfInputRef}
              type="file"
              accept="application/pdf"
              hidden
              onChange={handleSheetPdfFileSelected}
            />
            <Button
              variant="contained"
              startIcon={<UploadFileIcon />}
              onClick={handleUploadSheetPdfClick}
              disabled={isUploadingSheetPdf}
              sx={{
                fontWeight: 600,
                textTransform: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                },
              }}
            >
              {isUploadingSheetPdf ? 'Uploading...' : 'Upload PDF'}
            </Button>
          </>
        )}
      </Card>

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
            Pick an existing emotion from the dataset to reuse it, or type a new one to add it.
          </Typography>
          <Autocomplete
            freeSolo
            options={availableEmotions}
            inputValue={newEmotionName}
            onInputChange={(_, newInputValue) => setNewEmotionName(newInputValue)}
            onChange={(_, newValue) => setNewEmotionName(newValue || '')}
            renderInput={(params) => (
              <TextField
                {...params}
                autoFocus
                fullWidth
                label="Emotion Name"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && trimmedNewEmotionName && !isMatchedEmotionAlreadyCurrent) {
                    handleAddNewEmotion();
                  }
                }}
                placeholder="e.g., Melancholic, Triumphant"
                error={isMatchedEmotionAlreadyCurrent}
                helperText={
                  isMatchedEmotionAlreadyCurrent
                    ? 'This emotion is already assigned to this composition'
                    : matchedExistingEmotion
                      ? 'This emotion already exists in the dataset - it will be reused instead of creating a duplicate'
                      : ''
                }
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewEmotionDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAddNewEmotion} 
            variant="contained"
            disabled={!trimmedNewEmotionName || isMatchedEmotionAlreadyCurrent}
          >
            {matchedExistingEmotion ? 'Add Existing Emotion' : 'Add Emotion'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add YouTube Link Dialog (admin only) */}
      <Dialog
        open={openYoutubeDialog}
        onClose={handleCloseYoutubeDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add YouTube Link</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter the YouTube URL for this composition's performance.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="YouTube URL"
            value={youtubeUrlInput}
            onChange={(e) => setYoutubeUrlInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && youtubeUrlInput.trim()) {
                handleAddYoutubeLink();
              }
            }}
            placeholder="e.g., https://www.youtube.com/watch?v=VIDEO_ID"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseYoutubeDialog} disabled={isAddingYoutubeLink}>
            Cancel
          </Button>
          <Button
            onClick={handleAddYoutubeLink}
            variant="contained"
            disabled={!youtubeUrlInput.trim() || isAddingYoutubeLink}
          >
            {isAddingYoutubeLink ? 'Adding...' : 'Add YouTube Link'}
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
