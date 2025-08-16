import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const ImportPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Bulk Data Import
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography>Bulk import interface - Phase 4</Typography>
      </Paper>
    </Box>
  );
};

export default ImportPage;