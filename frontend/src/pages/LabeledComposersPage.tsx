/**
 * Labeled Composers Page
 * Displays list of composers with labeled compositions
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
} from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { getComposersSummary, Composer } from '../api/data';
import Navigation from '../components/Navigation';

const LabeledComposersPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const [composers, setComposers] = useState<Composer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const fetchComposers = async () => {
      try {
        const summary = await getComposersSummary();
        setComposers(summary.labeled);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load composers');
      } finally {
        setLoading(false);
      }
    };

    fetchComposers();
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

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4, minHeight: 'calc(100vh - 100px)' }}>
        <Navigation />
        
        <Typography variant="h3" component="h1" gutterBottom sx={{ mb: 3, color: 'white', textAlign: 'center' }}>
          Labeled Composers
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

        {/* Composers grouped by letter */}
        {letters.map((letter) => (
          <Box
            key={letter}
            ref={(el: HTMLDivElement | null) => (sectionRefs.current[letter] = el)}
            sx={{ mb: 4, scrollMarginTop: '100px' }}
          >
            <Typography
              variant="h4"
              component="h2"
              gutterBottom
              sx={{
                color: isDarkMode ? '#ffeb3b' : '#1a1a1a',
                fontWeight: 'bold',
                mb: 2,
                textShadow: isDarkMode
                  ? '2px 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.6)'
                  : '2px 2px 4px rgba(255,255,255,0.5)',
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
                      onClick={() => navigate(`/labeled-composers/${encodeURIComponent(composer.name)}`)}
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

        {composers.length === 0 && (
          <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Typography variant="h6" color="white">
              No labeled composers found
            </Typography>
          </Box>
        )}
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
    </Container>
  );
};

export default LabeledComposersPage;
