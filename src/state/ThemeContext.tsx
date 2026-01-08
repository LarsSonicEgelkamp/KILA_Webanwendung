import React from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  toggleMode: () => void;
};

const ThemeModeContext = React.createContext<ThemeContextValue | undefined>(undefined);

const pricedownFace = {
  fontFamily: 'Pricedown Black',
  fontStyle: 'normal',
  fontWeight: 400,
  src: "local('Pricedown Black')"
};

const buildTheme = (mode: ThemeMode) =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: '#0088ff'
      },
      background: {
        default: mode === 'dark' ? '#0f111a' : '#ffffff',
        paper: mode === 'dark' ? '#141725' : '#ffffff'
      }
    },
    shape: {
      borderRadius: 12
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '@font-face': [pricedownFace],
          'html, body, #root': {
            height: '100%',
            overflow: 'hidden'
          },
          body: {
            backgroundColor: mode === 'dark' ? '#0f111a' : '#ffffff',
            color: mode === 'dark' ? '#f5f7fb' : '#111111'
          }
        }
      }
    }
  });

export const ThemeModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = React.useState<ThemeMode>(() => {
    const stored = window.localStorage.getItem('kila_theme_mode');
    return stored === 'dark' ? 'dark' : 'light';
  });

  React.useEffect(() => {
    window.localStorage.setItem('kila_theme_mode', mode);
  }, [mode]);

  const toggleMode = React.useCallback(() => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const theme = React.useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
};

export const useThemeMode = (): ThemeContextValue => {
  const context = React.useContext(ThemeModeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeModeProvider');
  }
  return context;
};
