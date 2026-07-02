/**
 * Main App Component
 * Handles routing and authentication
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, useTheme } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import { ProgressProvider } from './context/ProgressContext';
import { CustomThemeProvider } from './context/ThemeContext';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import LabeledComposersPage from './pages/LabeledComposersPage';
import LabeledComposerCompositionsPage from './pages/LabeledComposerCompositionsPage';
import UnlabeledComposersPage from './pages/UnlabeledComposersPage';
import UnlabeledComposerCompositionsPage from './pages/UnlabeledComposerCompositionsPage';
import CompositionDetailPage from './pages/CompositionDetailPage';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

const AppContent: React.FC = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 25%, #262626 50%, #1a1a1a 75%, #0f0f0f 100%)'
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 15s ease infinite',
        '@keyframes gradientShift': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        transition: 'background 0.3s ease-in-out',
      }}
    >
      <AuthProvider>
        <ProgressProvider>
          <Router>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route
                path="/home"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <HomePage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/labeled-composers"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <LabeledComposersPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/labeled-composers/:composerName"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <LabeledComposerCompositionsPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/labeled-composers/:composerName/composition/:compositionName"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <CompositionDetailPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/unlabeled-composers"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <UnlabeledComposersPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/unlabeled-composers/:composerName"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <UnlabeledComposerCompositionsPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/unlabeled-composers/:composerName/composition/:compositionName"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <CompositionDetailPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </ProgressProvider>
      </AuthProvider>
    </Box>
  );
};

const App: React.FC = () => {
  return (
    <CustomThemeProvider>
      <AppContent />
    </CustomThemeProvider>
  );
};

export default App;
