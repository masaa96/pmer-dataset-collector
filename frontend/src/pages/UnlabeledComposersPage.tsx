/**
 * Unlabeled Composers Page
 * Displays list of composers with unlabeled compositions
 */
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Chip,
  CircularProgress,
  Alert,
  Button,
  Paper,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { getComposersSummary, Composer, addComposer, getAllComposerNames, addComposerToUnlabeled } from '../api/data';
import Navigation from '../components/Navigation';

const UnlabeledComposersPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const [composers, setComposers] = useState<Composer[]>([]);
  const [allComposerNames, setAllComposerNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newComposerName, setNewComposerName] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const navigate = useNavigate();
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const fetchComposers = async () => {
      try {
        const summary = await getComposersSummary();
        setComposers(summary.unlabeled);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load composers');
      } finally {
        setLoading(false);
      }
    };

    const fetchAllComposerNames = async () => {
      try {
        const names = await getAllComposerNames();
        setAllComposerNames(names);
      } catch (err) {
        console.error('Failed to load composer names:', err);
      }
    };

    fetchComposers();
    fetchAllComposerNames();
  }, []);

  // Group composers by first letter of surname
  const groupedComposers = composers.reduce((acc, composer) => {
    const nameParts = composer.name.trim().split(' ');
    const surname = nameParts[nameParts.length - 1];
    const firstLetter = surname.charAt(0).toUpperCase();
    
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(composer);
    return acc;
  }, {} as { [key: string]: Composer[] });

  // Get sorted letters
  const letters = Object.keys(groupedComposers).sort();

  // Scroll to letter section
  const scrollToLetter = (letter: string) => {
    const element = sectionRefs.current[letter];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle add composer dialog
  const handleOpenDialog = () => {
    setDialogOpen(true);
    setNewComposerName('');
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setNewComposerName('');
  };

  const handleAddComposer = async () => {
    const trimmedName = newComposerName.trim();

    if (!trimmedName) {
      setSnackbarMessage('Please enter or select a composer name');
      setSnackbarOpen(true);
      return;
    }

    // If the composer is already visible in the unlabeled list, just jump
    // straight to their page instead of trying to add them again.
    const alreadyInUnlabeled = composers.find(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (alreadyInUnlabeled) {
      handleCloseDialog();
      navigate(`/unlabeled-composers/${encodeURIComponent(alreadyInUnlabeled.name)}`);
      return;
    }

    try {
      // If the composer is already registered (e.g. all their compositions
      // are labeled) just surface them on this page with a 0 count instead
      // of trying to create a duplicate composer.
      const isKnownComposer = allComposerNames.some(
        (name) => name.toLowerCase() === trimmedName.toLowerCase()
      );

      const result = isKnownComposer
        ? await addComposerToUnlabeled(trimmedName)
        : await addComposer(trimmedName);

      if (result.success) {
        setSnackbarMessage(result.message || `Successfully added "${trimmedName}" to unlabeled composers!`);
        setSnackbarOpen(true);
        handleCloseDialog();

        // Refresh the composers list and known composer names
        const updatedSummary = await getComposersSummary();
        setComposers(updatedSummary.unlabeled);

        if (!isKnownComposer) {
          const updatedNames = await getAllComposerNames();
          setAllComposerNames(updatedNames);
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to add composer. Please try again.';
      setSnackbarMessage(errorMessage);
      setSnackbarOpen(true);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  if (composers.length === 0) {
    return (
      <Container maxWidth="md">
        <Box sx={{ py: 4, minHeight: 'calc(100vh - 100px)' }}>
          <Navigation />
          <Paper
            elevation={24}
            sx={{
              padding: 6,
              borderRadius: 4,
              textAlign: 'center',
              backgroundColor: colors.backgroundSecondary,
              backdropFilter: colors.backdropFilter,
              boxShadow: isDarkMode
                ? '0 8px 32px 0 rgba(0, 0, 0, 0.5)'
                : '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
              border: isDarkMode
                ? '1px solid rgba(255, 255, 255, 0.1)'
                : '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
              No Unlabeled Compositions Yet
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              All compositions in the dataset have been labeled with emotions.
              <br />
              Click the button below to add a new composer and their compositions.
            </Typography>

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
              Add New Composer
            </Button>
          </Paper>

          {/* Add Composer Dialog */}
          <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 'bold' }}>Add New Composer</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Pick an existing composer to jump to their page, or type a new name to add them.
              </Typography>
              <Autocomplete
                freeSolo
                options={allComposerNames}
                inputValue={newComposerName}
                onInputChange={(_, newInputValue) => setNewComposerName(newInputValue)}
                onChange={(_, newValue) => setNewComposerName(newValue || '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    autoFocus
                    margin="dense"
                    label="Composer Full Name"
                    fullWidth
                    variant="outlined"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddComposer();
                      }
                    }}
                    placeholder="e.g., Wolfgang Amadeus Mozart"
                    helperText="Select an existing composer or enter a new full name"
                  />
                )}
                sx={{ mt: 2 }}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
              <Button onClick={handleCloseDialog} color="inherit">
                Cancel
              </Button>
              <Button 
                onClick={handleAddComposer} 
                variant="contained"
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                  },
                }}
              >
                Add Composer
              </Button>
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
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4, minHeight: 'calc(100vh - 100px)' }}>
        <Navigation />
        
        <Typography variant="h3" component="h1" gutterBottom sx={{ mb: 3, color: 'white', textAlign: 'center' }}>
          Unlabeled Composers
        </Typography>

        {/* Alphabet Navigation */}
        <Paper
          elevation={8}
          sx={{
            mb: 4,
            p: 2,
            backgroundColor: colors.backgroundSecondary,
            backdropFilter: colors.backdropFilter,
            borderRadius: 3,
          }}
        >
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mr: 1 }}>
              Jump to composer's surname:
            </Typography>
            {letters.map((letter) => (
              <Button
                key={letter}
                variant="contained"
                size="small"
                onClick={() => scrollToLetter(letter)}
                sx={{
                  minWidth: '40px',
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                  },
                }}
              >
                {letter}
              </Button>
            ))}
          </Box>
        </Paper>

        {/* Add New Composer Button */}
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
            Add New Composer
          </Button>
        </Box>

        {/* Composers grouped by letter */}
        {letters.map((letter) => (
          <Box
            key={letter}
            ref={(el: HTMLDivElement | null) => (sectionRefs.current[letter] = el)}
            sx={{ mb: 4, scrollMarginTop: '160px' }}
          >
            <Typography
              variant="h3"
              component="h2"
              gutterBottom
              sx={{
                color: '#ffffff',
                fontWeight: 'bold',
                mb: 2,
                textShadow: isDarkMode
                  ? '2px 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.6)'
                  : '2px 2px 4px rgba(0,0,0,0.5)',
              }}
            >
              {letter}
            </Typography>

            <Grid container spacing={3}>
              {groupedComposers[letter].map((composer) => (
                <Grid item xs={12} sm={6} md={4} key={composer.name}>
                  <Card
                    elevation={8}
                    sx={{
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
                      onClick={() => navigate(`/unlabeled-composers/${encodeURIComponent(composer.name)}`)}
                      sx={{ p: 2 }}
                    >
                      <CardContent>
                        <Typography variant="h6" component="h2" gutterBottom>
                          {composer.name}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                          <Chip
                            label={`${composer.composition_count} composition${composer.composition_count !== 1 ? 's' : ''}`}
                            color="primary"
                            size="small"
                          />
                        </Box>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))}
      </Box>

      {/* Scroll to top button */}
      <Fab
        onClick={scrollToTop}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          '&:hover': {
            background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
          },
        }}
        aria-label="scroll to top"
      >
        <KeyboardArrowUpIcon />
      </Fab>

      {/* Add Composer Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Add New Composer</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Pick an existing composer to jump to their page, or type a new name to add them.
          </Typography>
          <Autocomplete
            freeSolo
            options={allComposerNames}
            inputValue={newComposerName}
            onInputChange={(_, newInputValue) => setNewComposerName(newInputValue)}
            onChange={(_, newValue) => setNewComposerName(newValue || '')}
            renderInput={(params) => (
              <TextField
                {...params}
                autoFocus
                margin="dense"
                label="Composer Full Name"
                fullWidth
                variant="outlined"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddComposer();
                  }
                }}
                placeholder="e.g., Wolfgang Amadeus Mozart"
                helperText="Select an existing composer or enter a new full name"
              />
            )}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleAddComposer} 
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
              },
            }}
          >
            Add Composer
          </Button>
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

export default UnlabeledComposersPage;
