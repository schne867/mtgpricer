import React, { createContext, useContext, useState, useEffect } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

// Create Theme Context
const ThemeContext = createContext();

// Custom hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme configurations
const getTheme = (darkMode) => createTheme({
  palette: {
    mode: darkMode ? 'dark' : 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: darkMode ? '#121212' : '#ffffff',
      paper: darkMode ? '#1e1e1e' : '#ffffff',
    },
    text: {
      primary: darkMode ? '#ffffff' : '#000000',
      secondary: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage: darkMode 
            ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
            : 'linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 50%, #e8ebff 100%)',
          minHeight: '100vh',
          backgroundAttachment: 'fixed',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: darkMode ? {
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.23)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.4)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#1976d2',
            },
            '& input': {
              color: 'white',
            },
          },
          '& .MuiInputLabel-root': {
            color: 'rgba(255, 255, 255, 0.7)',
            '&.Mui-focused': {
              color: '#1976d2',
            },
          },
        } : {},
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: darkMode ? {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          color: 'white',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255, 255, 255, 0.23)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255, 255, 255, 0.4)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#1976d2',
          },
          '& .MuiSelect-icon': {
            color: 'rgba(255, 255, 255, 0.7)',
          },
        } : {},
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: darkMode ? {
          color: 'rgba(255, 255, 255, 0.7)',
          '&.Mui-focused': {
            color: '#1976d2',
          },
        } : {},
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        root: darkMode ? {
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: 'white',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.23)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.4)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#1976d2',
            },
          },
          '& .MuiInputBase-input': {
            color: 'white !important',
          },
          '& .MuiAutocomplete-input': {
            color: 'white !important',
          },
          '& .MuiInputLabel-root': {
            color: 'rgba(255, 255, 255, 0.7)',
            '&.Mui-focused': {
              color: '#1976d2',
            },
          },
          '& .MuiAutocomplete-clearIndicator': {
            color: 'rgba(255, 255, 255, 0.7)',
          },
          '& .MuiAutocomplete-popupIndicator': {
            color: 'rgba(255, 255, 255, 0.7)',
          },
        } : {},
        paper: darkMode ? {
          backgroundColor: '#2a2a2a',
          color: 'white',
        } : {},
        option: darkMode ? {
          color: 'white',
          '&[aria-selected="true"]': {
            backgroundColor: 'rgba(25, 118, 210, 0.12)',
          },
          '&.Mui-focused': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          },
        } : {},
      },
    },
  },
});

// Theme Provider Component
export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  // Load theme preference from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('mtgPricerSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        if (typeof parsedSettings.darkMode === 'boolean') {
          setDarkMode(parsedSettings.darkMode);
        }
      } catch (error) {
        console.error('Failed to load dark mode setting:', error);
      }
    }
  }, []);

  // Create theme based on dark mode state
  const theme = getTheme(darkMode);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const setDarkModeValue = (value) => {
    setDarkMode(value);
    // Also update localStorage immediately when dark mode changes
    try {
      const savedSettings = localStorage.getItem('mtgPricerSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        const updatedSettings = { ...parsedSettings, darkMode: value };
        localStorage.setItem('mtgPricerSettings', JSON.stringify(updatedSettings));
      }
    } catch (error) {
      console.error('Failed to update dark mode in localStorage:', error);
    }
  };

  const contextValue = {
    darkMode,
    toggleDarkMode,
    setDarkModeValue,
    theme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
