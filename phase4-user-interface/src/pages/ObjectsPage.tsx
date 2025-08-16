import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { objectsAPI } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

interface Object {
  id: number;
  object_code: string;
  name: string;
  object_type: string;
  status: string;
  rfid_tag_id: string;
  location_name: string;
  assigned_to_name: string;
  created_at: string;
}

const ObjectsPage: React.FC = () => {
  const [objects, setObjects] = useState<Object[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedObject, setSelectedObject] = useState<Object | null>(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchObjects();
  }, [page, rowsPerPage]);

  const fetchObjects = async () => {
    try {
      setLoading(true);
      const response = await objectsAPI.list({
        page: page + 1,
        limit: rowsPerPage,
      });
      
      if (response.data.success) {
        setObjects(response.data.data);
        setTotal(response.data.pagination.total);
      }
    } catch (error) {
      showNotification('Failed to fetch objects', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm) {
      fetchObjects();
      return;
    }

    try {
      setLoading(true);
      const response = await objectsAPI.search(searchTerm);
      if (response.data.success) {
        setObjects(response.data.data);
        setTotal(response.data.data.length);
      }
    } catch (error) {
      showNotification('Search failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, object: Object) => {
    setAnchorEl(event.currentTarget);
    setSelectedObject(object);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedObject(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'warning';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'docket':
        return 'primary';
      case 'evidence':
        return 'error';
      case 'equipment':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Objects Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />}>
          Add Object
        </Button>
      </Box>

      <Paper sx={{ mb: 2, p: 2 }}>
        <TextField
          fullWidth
          placeholder="Search objects by name, code, or RFID tag..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Button onClick={handleSearch}>Search</Button>
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Object Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>RFID Tag</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Assigned To</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {objects.map((object) => (
              <TableRow key={object.id}>
                <TableCell>{object.object_code}</TableCell>
                <TableCell>{object.name}</TableCell>
                <TableCell>
                  <Chip
                    label={object.object_type}
                    size="small"
                    color={getTypeColor(object.object_type) as any}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={object.status}
                    size="small"
                    color={getStatusColor(object.status) as any}
                  />
                </TableCell>
                <TableCell>{object.rfid_tag_id}</TableCell>
                <TableCell>
                  {object.location_name && (
                    <Box display="flex" alignItems="center">
                      <LocationIcon fontSize="small" sx={{ mr: 0.5 }} />
                      {object.location_name}
                    </Box>
                  )}
                </TableCell>
                <TableCell>
                  {object.assigned_to_name && (
                    <Box display="flex" alignItems="center">
                      <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
                      {object.assigned_to_name}
                    </Box>
                  )}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    onClick={(e) => handleMenuClick(e, object)}
                    size="small"
                  >
                    <MoreIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <LocationIcon fontSize="small" sx={{ mr: 1 }} />
          Move Location
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <PersonIcon fontSize="small" sx={{ mr: 1 }} />
          Assign Personnel
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ObjectsPage;