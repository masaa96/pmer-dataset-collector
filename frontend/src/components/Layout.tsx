/**
 * Layout Component
 * Wraps protected pages with tab bar and progress bar
 */
import React from 'react';
import { Box } from '@mui/material';
import TabBar from './TabBar';
import ProgressBar from './ProgressBar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <Box>
      <TabBar />
      <ProgressBar />
      {/* Add top padding to account for fixed TabBar (56px) + fixed ProgressBar (~50px) */}
      <Box sx={{ pt: '70px' }}>
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
