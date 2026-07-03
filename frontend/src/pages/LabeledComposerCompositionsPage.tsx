/**
 * Labeled Composer Compositions Page
 * Shows all compositions for a specific labeled composer
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import { getComposerCompositions, Composition } from '../api/data';
import Navigation from '../components/Navigation';

const LabeledComposerCompositionsPage: React.FC = () => {
  const { composerName } = useParams<{ composerName: string }>();
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const navigate = useNavigate();
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCompositions = async () => {
      if (!composerName) return;
      
      try {
        const data = await getComposerCompositions(composerName);
        setCompositions(data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load compositions');
      } finally {
        setLoading(false);
      }
    };

    fetchCompositions();
  }, [composerName]);

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
          {compositions.length} Composition{compositions.length !== 1 ? 's' : ''}
        </Typography>

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
                    navigate(`/labeled-composers/${encodeURIComponent(composerName!)}/composition/${encodeURIComponent(composition.name)}`, {
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
                        {composition.emotion_count} emotion{composition.emotion_count !== 1 ? 's' : ''}:
                      </Typography>
                      <Box sx={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: 0.5,
                        minHeight: '28px',
                      }}>
                        {composition.emotions.slice(0, 4).map((emotion, idx) => (
                          <Chip
                            key={idx}
                            label={emotion}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        ))}
                        {composition.emotions.length > 4 && (
                          <Chip
                            label={`+${composition.emotions.length - 4}`}
                            size="small"
                            color="primary"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        )}
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
    </Container>
  );
};

export default LabeledComposerCompositionsPage;
