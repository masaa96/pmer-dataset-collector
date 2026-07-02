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
          backgroundColor: colors.backgroundSecondary,
          color: isDarkMode ? colors.textPrimary : muiTheme.palette.primary.main,
          backdropFilter: colors.backdropFilter,
          boxShadow: colors.shadowMedium,
          borderRadius: colors.borderRadiusLarge,
          padding: '8px 16px',
          transition: 'transform 0.3s, box-shadow 0.3s',
          '&:hover': {
            backgroundColor: colors.backgroundSecondary,
            boxShadow: colors.shadowHeavy,
          },
        }}
      >
        Back
      </Button>
    </Box>
  );
};

export default Navigation;
