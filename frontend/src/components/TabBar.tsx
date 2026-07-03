/**
 * TabBar Component
 * Provides main navigation tabs for Home, Labeled, and Unlabeled pages
 */
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Tabs, Tab, IconButton } from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import HomeIcon from '@mui/icons-material/Home';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useTheme } from '../context/ThemeContext';

const TabBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const muiTheme = useMuiTheme();
  const { isDarkMode, toggleDarkMode } = useTheme();

  // Determine current tab based on route (handles sub-routes)
  const getCurrentTab = () => {
    const pathname = location.pathname;
    if (pathname === '/home') return 0;
    if (pathname.startsWith('/labeled-composers')) return 1;
    if (pathname.startsWith('/unlabeled-composers')) return 2;
    return 0; // Default to Home
  };

  // MUI's Tabs `onChange` only fires when the clicked tab isn't already the
  // selected one. Sub-routes like the composition detail page still match
  // the currently "selected" tab, so we navigate exclusively from each
  // Tab's `onClick` (which always fires) instead of `onChange`, to avoid
  // both missing navigation on already-active tabs and double-navigating
  // when actually switching tabs.
  const handleTabClick = (path: string) => () => navigate(path);

  return (
    <Box
      sx={{
        backgroundColor: muiTheme.palette.mode === 'dark' 
          ? 'rgba(15, 15, 15, 0.98)' 
          : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: muiTheme.palette.mode === 'dark'
          ? '1px solid rgba(255, 255, 255, 0.15)'
          : '1px solid rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: muiTheme.palette.mode === 'dark'
          ? '0 2px 8px rgba(0, 0, 0, 0.7)'
          : '0 2px 8px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: 2,
      }}
    >
      {/* Home Tab - Left */}
      <Tabs
        value={getCurrentTab() === 0 ? 0 : -1}
        sx={{
          minWidth: 'fit-content',
          '& .MuiTabs-indicator': {
            backgroundColor: 'primary.main',
            height: 3,
          },
        }}
      >
        <Tab
          label="Home"
          icon={<HomeIcon />}
          iconPosition="start"
          value={0}
          onClick={handleTabClick('/home')}
          sx={{
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 500,
            minHeight: 56,
            '&.Mui-selected': {
              color: 'primary.main',
            },
          }}
        />
      </Tabs>

      {/* Labeled & Unlabeled - Center */}
      <Tabs
        value={getCurrentTab() === 0 ? -1 : getCurrentTab()}
        aria-label="main navigation"
        centered
        sx={{
          flex: 1,
          '& .MuiTabs-indicator': {
            backgroundColor: 'primary.main',
            height: 3,
          },
        }}
      >
        <Tab
          label="Labeled Compositions"
          icon={<LibraryMusicIcon />}
          iconPosition="start"
          value={1}
          onClick={handleTabClick('/labeled-composers')}
          sx={{
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 500,
            minHeight: 56,
            '&.Mui-selected': {
              color: 'primary.main',
            },
          }}
        />
        <Tab
          label="Unlabeled Compositions"
          icon={<QueueMusicIcon />}
          iconPosition="start"
          value={2}
          onClick={handleTabClick('/unlabeled-composers')}
          sx={{
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 500,
            minHeight: 56,
            '&.Mui-selected': {
              color: 'primary.main',
            },
          }}
        />
      </Tabs>

      {/* Dark Mode Toggle - Right */}
      <IconButton
        onClick={toggleDarkMode}
        color="inherit"
        sx={{
          transition: 'transform 0.3s ease-in-out',
          '&:hover': {
            transform: 'scale(1.1)',
          },
        }}
        title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Box>
  );
};

export default TabBar;
