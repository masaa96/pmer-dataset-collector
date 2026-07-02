/**
 * Centralized Color Configuration
 * Defines all colors for dark and light modes used throughout the application
 * This ensures consistency across all components
 */

export const COLORS = {
  DARK_MODE: {
    // Main backgrounds
    backgroundPrimary: 'rgba(10, 10, 10, 1)',        // Pure black background
    backgroundSecondary: 'rgba(26, 26, 26, 0.95)',   // Cards and components
    
    // Text colors
    textPrimary: '#e8e8e8',                           // Primary text (slightly gray-white)
    textSecondary: '#b0b0b0',                         // Secondary text (lighter gray)
    
    // Accents
    accentPrimary: '#90caf9',                         // Soft light blue
    accentAccent: '#ffeb3b',                          // Bright yellow (for letters)
    
    // Shadows
    shadowLight: '0 8px 32px rgba(0, 0, 0, 0.1)',    // Light shadow
    shadowMedium: '0 8px 32px rgba(0, 0, 0, 0.25)',  // Medium shadow
    shadowHeavy: '0 16px 48px rgba(0, 0, 0, 0.25)',  // Heavy shadow on hover
    
    // Special effects
    backdropFilter: 'blur(10px)',
    borderRadius: 3,
    borderRadiusLarge: 4,
  },
  
  LIGHT_MODE: {
    // Main backgrounds
    backgroundPrimary: '#ffffff',                     // White background
    backgroundSecondary: 'rgba(255, 255, 255, 0.95)', // Cards and components
    
    // Text colors
    textPrimary: '#000000',                           // Primary text (black)
    textSecondary: '#666666',                         // Secondary text
    
    // Accents
    accentPrimary: '#1976d2',                         // Primary blue
    accentAccent: '#fbc02d',                          // Yellow
    
    // Shadows
    shadowLight: '0 8px 32px rgba(31, 38, 135, 0.37)', // Light shadow
    shadowMedium: '0 8px 32px rgba(31, 38, 135, 0.37)', // Medium shadow
    shadowHeavy: '0 16px 48px rgba(31, 38, 135, 0.37)', // Heavy shadow on hover
    
    // Special effects
    backdropFilter: 'blur(10px)',
    borderRadius: 3,
    borderRadiusLarge: 4,
  },
};

/**
 * Helper function to get colors based on mode
 */
export const getColors = (isDarkMode: boolean) => {
  return isDarkMode ? COLORS.DARK_MODE : COLORS.LIGHT_MODE;
};
