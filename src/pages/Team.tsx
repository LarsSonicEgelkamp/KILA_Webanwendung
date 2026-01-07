import React from 'react';
import { Box, Typography } from '@mui/material';

const Team: React.FC = () => {
  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" sx={{ color: '#0088ff', fontWeight: 700 }}>
        Das Team
      </Typography>
    </Box>
  );
};

export default Team;
