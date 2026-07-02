/**
 * Home Page
 * Main dashboard with navigation to labeled/unlabeled compositions
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
} from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../config/colorConfig';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import { getComposersSummary } from '../api/data';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const [target, setTarget] = useState(1500);

  useEffect(() => {
    const fetchTarget = async () => {
      try {
        const summary = await getComposersSummary();
        const newTarget = summary.collection_target;
        
        setTarget(newTarget);
      } catch (error) {
        console.error('Failed to load target:', error);
      }
    };
    fetchTarget();
  }, []);

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4, minHeight: 'calc(100vh - 100px)' }}>
        {/* Description Section */}
        <Paper
          elevation={24}
          sx={{
            padding: 3,
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
            mb: 4,
          }}
        >
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            Help Me Reach {target} Compositions!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
            <strong>Priority:</strong> Label unlabeled compositions with emotions you feel while listening.
            <br />
            You can also explore already labeled data and add new labels.
            <br />
            <strong>Important:</strong> Add composers or compositions that aren't in our dataset yet – this helps us reach our goal!
          </Typography>
        </Paper>

        {/* Main Navigation Cards */}
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Card
              elevation={16}
              sx={{
                height: '100%',
                backgroundColor: colors.backgroundSecondary,
                backdropFilter: colors.backdropFilter,
                borderRadius: 4,
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 16px 48px rgba(0, 0, 0, 0.25)',
                },
              }}
            >
              <CardActionArea
                onClick={() => navigate('/labeled-composers')}
                sx={{ height: '100%', p: 4 }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <LibraryMusicIcon sx={{ fontSize: 80, color: 'primary.main', mb: 3 }} />
                  <Typography variant="h4" component="h2" gutterBottom>
                    Labeled Compositions
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                    Browse and explore compositions that have been labeled with emotions
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card
              elevation={16}
              sx={{
                height: '100%',
                backgroundColor: colors.backgroundSecondary,
                backdropFilter: colors.backdropFilter,
                borderRadius: 4,
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 16px 48px rgba(0, 0, 0, 0.25)',
                },
              }}
            >
              <CardActionArea
                onClick={() => navigate('/unlabeled-composers')}
                sx={{ height: '100%', p: 4 }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <QueueMusicIcon sx={{ fontSize: 80, color: 'secondary.main', mb: 3 }} />
                  <Typography variant="h4" component="h2" gutterBottom>
                    Unlabeled Compositions
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                    Discover compositions waiting to be labeled with emotions
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default HomePage;
