import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import App from './App';
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
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
