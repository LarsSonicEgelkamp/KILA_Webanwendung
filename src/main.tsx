import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { SectionProvider } from './state/SectionContext';
import './i18n';

const pricedownFace = {
  fontFamily: 'Pricedown Black',
  fontStyle: 'normal',
  fontWeight: 400,
  src: "local('Pricedown Black')"
};

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0088ff'
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff'
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
          backgroundColor: '#ffffff'
        }
      }
    }
  }
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <SectionProvider>
            <App />
            <Analytics />
            <SpeedInsights />
          </SectionProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
