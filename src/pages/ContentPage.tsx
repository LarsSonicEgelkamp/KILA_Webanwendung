import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

type ContentPageProps = {
  titleKey: string;
};

const ContentPage: React.FC<ContentPageProps> = ({ titleKey }) => {
  const { t } = useTranslation();

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" sx={{ color: '#0088ff', fontWeight: 700 }}>
        {t(titleKey)}
      </Typography>
    </Box>
  );
};

export default ContentPage;
