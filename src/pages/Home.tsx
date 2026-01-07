import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

const Home: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 56px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Box sx={{ textAlign: 'center' }}>
        <Typography
          component="div"
          sx={{
            fontFamily: '"Pricedown Black", sans-serif',
            color: '#ffffff',
            fontSize: { xs: '3.2rem', md: '5.2rem' },
            lineHeight: 0.85
          }}
        >
          <div>{t('home.title.line1')}</div>
          <div>{t('home.title.line2')}</div>
          <div>{t('home.title.line3')}</div>
        </Typography>
      </Box>
    </Box>
  );
};

export default Home;
