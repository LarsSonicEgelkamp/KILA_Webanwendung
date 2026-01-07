import React from 'react';
import { Box, Typography } from '@mui/material';

const Fotos: React.FC = () => {
  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" sx={{ color: '#0088ff', fontWeight: 700 }}>
        Fotos
      </Typography>
    </Box>
  );
};

export default Fotos;
