/**
 * Navigation Component
 * Provides back and home navigation buttons
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, ButtonGroup } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface NavigationProps {
  showBack?: boolean;
  showHome?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ showBack = true, showHome = true }) => {
  const navigate = useNavigate();

  return (
    <Box sx={{ mb: 3 }}>
      <ButtonGroup variant="contained" sx={{ boxShadow: 3 }}>
        {showBack && (
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 1)',
              },
            }}
          >
            Back
          </Button>
        )}
        {showHome && (
          <Button
            startIcon={<HomeIcon />}
            onClick={() => navigate('/home')}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 1)',
              },
            }}
          >
            Home
          </Button>
        )}
      </ButtonGroup>
    </Box>
  );
};

export default Navigation;
