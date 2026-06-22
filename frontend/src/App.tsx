/**
 * Main App Component
 * Handles routing and authentication
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import { ProgressProvider } from './context/ProgressContext';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import LabeledComposersPage from './pages/LabeledComposersPage';
import LabeledComposerCompositionsPage from './pages/LabeledComposerCompositionsPage';
import UnlabeledComposersPage from './pages/UnlabeledComposersPage';
import UnlabeledComposerCompositionsPage from './pages/UnlabeledComposerCompositionsPage';
import CompositionDetailPage from './pages/CompositionDetailPage';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Create Material-UI theme with custom background
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f7fa',
    },
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradientShift 15s ease infinite',
          '@keyframes gradientShift': {
            '0%': { backgroundPosition: '0% 50%' },
            '50%': { backgroundPosition: '100% 50%' },
            '100%': { backgroundPosition: '0% 50%' },
          },
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
    </ThemeProvider>
  );
};

export default App;
