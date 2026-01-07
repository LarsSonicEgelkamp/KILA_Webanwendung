import React from 'react';
import { Box, Typography } from '@mui/material';

const Zeitreise: React.FC = () => {
  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" sx={{ color: '#0088ff', fontWeight: 700 }}>
        Zeitreise
      </Typography>
    </Box>
  );
};

export default Zeitreise;
