/**
 * Composition Detail Page
 * Shows YouTube video (left) and emotion labels (right) for a specific composition
 */
import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  Chip,
  Paper,
} from '@mui/material';
import YouTubeEmbed from '../components/YouTubeEmbed';
import Navigation from '../components/Navigation';
import { Composition } from '../api/data';

const CompositionDetailPage: React.FC = () => {
  const { composerName } = useParams<{ composerName: string; compositionName: string }>();
  const location = useLocation();
  
  // Get composition data from navigation state
  const composition = location.state?.composition as Composition | undefined;

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
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              borderRadius: 3,
              p: 1.5,
              height: { xs: '350px', sm: '400px', md: '430px' },
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
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              borderRadius: 3,
              p: 1.5,
              height: { xs: '350px', sm: '400px', md: '430px' },
              maxWidth: { xs: '100%', sm: '700px', md: '100%' },
              mx: { xs: 0, sm: 'auto', md: 0 },
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>
              Emotional Labels
            </Typography>

            {composition.emotions && composition.emotions.length > 0 ? (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  This composition has been labeled with {composition.emotion_count} emotion{composition.emotion_count !== 1 ? 's' : ''}:
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, overflow: 'auto' }}>
                  {composition.emotions.map((emotion, idx) => (
                    <Chip
                      key={idx}
                      label={emotion}
                      color="primary"
                      variant="filled"
                      sx={{
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        py: 2,
                        px: 0.5,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
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
                  No emotions labeled for this composition yet
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ mt: 1, textAlign: 'center', px: 3 }}
                >
                  This composition is ready for emotional labeling
                </Typography>
              </Paper>
            )}
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default CompositionDetailPage;
