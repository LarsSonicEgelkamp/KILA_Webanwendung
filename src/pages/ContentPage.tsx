import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';

type ContentPageProps = {
  titleKey: string;
};

const ContentPage: React.FC<ContentPageProps> = ({ titleKey }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const pageBg = theme.palette.mode === 'dark' ? 'dark' : 'light';

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }} data-bg={pageBg}>
      <Typography variant="h4" sx={{ color: '#0088ff', fontWeight: 700 }}>
        {t(titleKey)}
      </Typography>
    </Box>
  );
};

export default ContentPage;
