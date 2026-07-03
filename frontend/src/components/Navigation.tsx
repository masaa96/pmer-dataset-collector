/**
 * Navigation Component
 * Provides back navigation button
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { Box, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../config/colorConfig';

interface NavigationProps {
  showBack?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ showBack = true }) => {
  const muiTheme = useMuiTheme();
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const navigate = useNavigate();

  if (!showBack) {
    return null;
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        variant="text"
        sx={{
          background: isDarkMode ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : colors.backgroundSecondary,
          color: isDarkMode ? 'white' : muiTheme.palette.primary.main,
          fontWeight: isDarkMode ? 'bold' : undefined,
          backdropFilter: colors.backdropFilter,
          boxShadow: isDarkMode ? '0 4px 20px rgba(102, 126, 234, 0.4)' : colors.shadowMedium,
          borderRadius: colors.borderRadiusLarge,
          padding: '8px 16px',
          transition: 'transform 0.3s, box-shadow 0.3s',
          '&:hover': {
            background: isDarkMode
              ? 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)'
              : colors.backgroundSecondary,
            boxShadow: isDarkMode ? '0 6px 30px rgba(102, 126, 234, 0.6)' : colors.shadowHeavy,
          },
        }}
      >
        Back
      </Button>
    </Box>
  );
};

export default Navigation;
