/**
 * Layout Component
 * Wraps protected pages with progress bar
 */
import React from 'react';
import { Box } from '@mui/material';
import ProgressBar from './ProgressBar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <Box>
      <ProgressBar />
      {children}
    </Box>
  );
};

export default Layout;
