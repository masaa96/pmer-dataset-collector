/**
 * Unlabeled Composer Compositions Page
 * Displays unlabeled compositions for a specific composer
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../config/colorConfig';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { getComposerUnlabeledCompositions, getAllComposerCompositions, addComposition, Composition } from '../api/data';
import Navigation from '../components/Navigation';

const UnlabeledComposerCompositionsPage: React.FC = () => {
  const { composerName } = useParams<{ composerName: string }>();
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const navigate = useNavigate();
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [allComposerCompositions, setAllComposerCompositions] = useState<Composition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCompositionName, setNewCompositionName] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Fetch compositions function (outside useEffect so it can be reused)
  const fetchCompositions = useCallback(async () => {
    if (!composerName) return;

    try {
      setLoading(true);
      const data = await getComposerUnlabeledCompositions(composerName);
      setCompositions(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load compositions');
    } finally {
      setLoading(false);
    }
  }, [composerName]);

  // Fetch every composition (labeled + unlabeled) for this composer, used to
  // populate the "Add Composition" dropdown and detect existing matches.
  const fetchAllComposerCompositions = useCallback(async () => {
    if (!composerName) return;

    try {
      const data = await getAllComposerCompositions(composerName);
      setAllComposerCompositions(data);
    } catch (err) {
      console.error('Failed to load all compositions for composer:', err);
    }
  }, [composerName]);

  useEffect(() => {
    fetchCompositions();
    fetchAllComposerCompositions();
  }, [fetchCompositions, fetchAllComposerCompositions]);

  // If the entered/selected composition name matches an existing one for
  // this composer (labeled or unlabeled), surface it instead of letting the
  // user create a duplicate.
  const trimmedNewCompositionName = newCompositionName.trim();
  const matchedComposition = trimmedNewCompositionName
    ? allComposerCompositions.find(
        (c) => c.name.trim().toLowerCase() === trimmedNewCompositionName.toLowerCase()
      ) || null
    : null;

  // Handle add composition dialog
  const handleOpenDialog = () => {
    setDialogOpen(true);
    setNewCompositionName('');
    setYoutubeUrl('');
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setNewCompositionName('');
    setYoutubeUrl('');
  };

  const handleAddComposition = async () => {
    const trimmedName = newCompositionName.trim();
    const trimmedUrl = youtubeUrl.trim();
    
    if (!trimmedName) {
      setSnackbarMessage('Please enter a composition name');
      setSnackbarOpen(true);
      return;
    }

    // Existing compositions are resolved via the inline alert/navigation
    // buttons instead of being (re)created here.
    if (matchedComposition) {
      return;
    }

    // Validate YouTube URL if provided
    if (trimmedUrl && !isValidYouTubeUrl(trimmedUrl)) {
      setSnackbarMessage('Please enter a valid YouTube URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID)');
      setSnackbarOpen(true);
      return;
    }

    try {
      // Call API to add composition
      await addComposition(composerName, trimmedName, trimmedUrl || undefined);
      
      setSnackbarMessage(`Successfully added composition: ${trimmedName}`);
      setSnackbarOpen(true);
      handleCloseDialog();
      
      // Refresh the compositions lists
      fetchCompositions();
      fetchAllComposerCompositions();
    } catch (err: any) {
      console.error('Failed to add composition:', err);
      setSnackbarMessage(err.response?.data?.detail || 'Failed to add composition. Please try again.');
      setSnackbarOpen(true);
    }
  };

  // Navigate to the already-labeled version of a matched composition
  const handleGoToLabeled = () => {
    if (!matchedComposition || !composerName) return;
    handleCloseDialog();
    navigate(`/labeled-composers/${encodeURIComponent(composerName)}/composition/${encodeURIComponent(matchedComposition.name)}`, {
      state: { composition: matchedComposition },
    });
  };

  // Navigate to the already-unlabeled version of a matched composition
  const handleGoToUnlabeled = () => {
    if (!matchedComposition || !composerName) return;
    handleCloseDialog();
    navigate(`/unlabeled-composers/${encodeURIComponent(composerName)}/composition/${encodeURIComponent(matchedComposition.name)}`, {
      state: { composition: matchedComposition },
    });
  };

  // Helper function to validate YouTube URLs
  const isValidYouTubeUrl = (url: string): boolean => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]+/;
    return youtubeRegex.test(url);
  };

  // Helper function to extract YouTube video ID from URL
  const extractYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 100px)' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Navigation />
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4, minHeight: 'calc(100vh - 100px)' }}>
        <Navigation />
        
        <Typography variant="h3" component="h1" gutterBottom sx={{ mb: 1, color: 'white', textAlign: 'center' }}>
          {composerName}
        </Typography>

        <Typography variant="h6" component="h2" gutterBottom sx={{ mb: 4, color: 'rgba(255, 255, 255, 0.9)', textAlign: 'center' }}>
          {compositions.length} Composition{compositions.length !== 1 ? 's' : ''} (Unlabeled)
        </Typography>

        {/* Add Composition Button */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontWeight: 'bold',
              px: 4,
              py: 1.5,
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                boxShadow: '0 6px 30px rgba(102, 126, 234, 0.6)',
              },
            }}
          >
            Add Composition
          </Button>
        </Box>

        <Grid container spacing={3}>
          {compositions.map((composition, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <Card
                elevation={8}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: colors.backgroundSecondary,
                  backdropFilter: colors.backdropFilter,
                  borderRadius: 3,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.2)',
                  },
                }}
              >
                <CardActionArea
                  onClick={() => {
                    navigate(`/unlabeled-composers/${encodeURIComponent(composerName!)}/composition/${encodeURIComponent(composition.name)}`, {
                      state: { composition }
                    });
                  }}
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    justifyContent: 'flex-start',
                  }}
                >
                  <CardContent sx={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    p: 2.5,
                    '&:last-child': { pb: 2.5 },
                  }}>
                    <Typography 
                      variant="h6" 
                      component="h2" 
                      sx={{ 
                        fontSize: '1rem',
                        fontWeight: 600,
                        minHeight: '3em',
                        lineHeight: 1.5,
                        mb: 1,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {composition.name}
                    </Typography>
                    
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, fontWeight: 500 }}>
                        0 emotions:
                      </Typography>
                      <Box sx={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: 0.5,
                        minHeight: '28px',
                      }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.75rem' }}>
                          No emotions labeled yet - click to add labels
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>

        {compositions.length === 0 && (
          <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Typography variant="h6" color="white">
              No compositions found
            </Typography>
          </Box>
        )}
      </Box>

      {/* Add Composition Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Add New Composition</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Pick an existing composition for <strong>{composerName}</strong> to jump to it, or type a new name to add one.
          </Typography>
          <Autocomplete
            freeSolo
            options={allComposerCompositions.map((c) => c.name)}
            inputValue={newCompositionName}
            onInputChange={(_, newInputValue) => setNewCompositionName(newInputValue)}
            onChange={(_, newValue) => setNewCompositionName(newValue || '')}
            renderInput={(params) => (
              <TextField
                {...params}
                autoFocus
                margin="dense"
                label="Composition Name"
                fullWidth
                variant="outlined"
                placeholder="e.g., Piano Sonata No. 16 in C major, K. 545"
                helperText="Select an existing composition or enter a new full name"
              />
            )}
            sx={{ mt: 2 }}
          />

          {matchedComposition ? (
            matchedComposition.labeled ? (
              <Alert
                severity="error"
                sx={{ mt: 2 }}
                action={
                  <Button color="inherit" size="small" onClick={handleGoToLabeled}>
                    Take me to labeled
                  </Button>
                }
              >
                This composition is already labeled.
              </Alert>
            ) : (
              <Alert
                severity="info"
                sx={{ mt: 2 }}
                action={
                  <Button color="inherit" size="small" onClick={handleGoToUnlabeled}>
                    Take me to unlabeled
                  </Button>
                }
              >
                This composition already exists and is unlabeled.
              </Alert>
            )
          ) : (
            <TextField
              margin="dense"
              label="YouTube URL (Optional)"
              fullWidth
              variant="outlined"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddComposition();
                }
              }}
              placeholder="e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              helperText="Enter a YouTube URL to embed the video for this composition"
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancel
          </Button>
          {!matchedComposition && (
            <Button 
              onClick={handleAddComposition} 
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                },
              }}
            >
              Add Composition
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Container>
  );
};

export default UnlabeledComposerCompositionsPage;
