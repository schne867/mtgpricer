import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Divider,
  IconButton,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const Settings = ({ currentSettings, onSave, onClose }) => {
  // Initialize with current settings from parent component
  const [settings, setSettings] = useState(currentSettings || {
    conditionMultipliers: {
      'NM': 1.0,
      'EX': 0.9,
      'VG': 0.75,
      'G': 0.5
    },
    buyCashMultipliers: {
      'NM': 0.85,
      'EX': 0.77,
      'VG': 0.60,
      'G': 0.30
    },
    creditMultiplier: 1.3
  });

  const [errors, setErrors] = useState({});

  // Update settings when currentSettings prop changes
  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

  const validateInput = (value, min = 0, max = 5) => {
    const num = parseFloat(value);
    return !isNaN(num) && num >= min && num <= max;
  };

  const handleConditionMultiplierChange = (condition, value) => {
    if (validateInput(value, 0, 2)) {
      setSettings(prev => ({
        ...prev,
        conditionMultipliers: {
          ...prev.conditionMultipliers,
          [condition]: parseFloat(value)
        }
      }));
      setErrors(prev => ({ ...prev, [`condition_${condition}`]: null }));
    } else {
      setErrors(prev => ({ ...prev, [`condition_${condition}`]: 'Value must be between 0 and 2' }));
    }
  };

  const handleBuyCashMultiplierChange = (condition, value) => {
    if (validateInput(value, 0, 1)) {
      setSettings(prev => ({
        ...prev,
        buyCashMultipliers: {
          ...prev.buyCashMultipliers,
          [condition]: parseFloat(value)
        }
      }));
      setErrors(prev => ({ ...prev, [`buyCash_${condition}`]: null }));
    } else {
      setErrors(prev => ({ ...prev, [`buyCash_${condition}`]: 'Value must be between 0 and 1' }));
    }
  };

  const handleCreditMultiplierChange = (value) => {
    if (validateInput(value, 0.5, 3)) {
      setSettings(prev => ({
        ...prev,
        creditMultiplier: parseFloat(value)
      }));
      setErrors(prev => ({ ...prev, creditMultiplier: null }));
    } else {
      setErrors(prev => ({ ...prev, creditMultiplier: 'Value must be between 0.5 and 3' }));
    }
  };

  const handleSave = () => {
    // Check if there are any errors
    const hasErrors = Object.values(errors).some(error => error !== null);
    if (hasErrors) {
      return;
    }

    try {
      // Save to localStorage with error handling
      const settingsJson = JSON.stringify(settings);
      localStorage.setItem('mtgPricerSettings', settingsJson);
      
      // Verify the save was successful by reading it back
      const verification = localStorage.getItem('mtgPricerSettings');
      if (verification === settingsJson) {
        console.log('Settings saved successfully to localStorage');
      } else {
        console.error('Settings save verification failed');
      }
      
      // Update parent component
      onSave(settings);
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
      // Still update parent component even if localStorage fails
      onSave(settings);
    }
  };

  const handleReset = () => {
    const defaultSettings = {
      conditionMultipliers: {
        'NM': 1.0,
        'EX': 0.9,
        'VG': 0.75,
        'G': 0.5
      },
      buyCashMultipliers: {
        'NM': 0.85,
        'EX': 0.77,
        'VG': 0.60,
        'G': 0.30
      },
      creditMultiplier: 1.3
    };
    setSettings(defaultSettings);
    setErrors({});
  };

  return (
    <Box sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 1300,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: 2
    }}>
      <Paper sx={{
        width: '100%',
        maxWidth: 600,
        maxHeight: '90vh',
        overflow: 'auto',
        p: 3
      }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2">
            ⚙️ Pricing Settings
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          Configure pricing multipliers. Base price comes from TCGPlayer API.
          <br />
          Settings are saved locally and persist between sessions.
        </Alert>

        {/* Condition Multipliers */}
        <Typography variant="h6" gutterBottom>
          📊 Price Multipliers (Base Price)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Multipliers applied to the base TCGPlayer price for each condition
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {Object.entries(settings.conditionMultipliers).map(([condition, value]) => (
            <Grid item xs={6} sm={3} key={condition}>
              <TextField
                label={condition}
                type="number"
                value={value}
                onChange={(e) => handleConditionMultiplierChange(condition, e.target.value)}
                error={!!errors[`condition_${condition}`]}
                helperText={errors[`condition_${condition}`]}
                inputProps={{ 
                  step: 0.01,
                  min: 0,
                  max: 2
                }}
                fullWidth
                size="small"
              />
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Buy Cash Multipliers */}
        <Typography variant="h6" gutterBottom>
          💵 Buy (Cash) Multipliers
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Multipliers applied to condition price to calculate buy cash price
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {Object.entries(settings.buyCashMultipliers).map(([condition, value]) => (
            <Grid item xs={6} sm={3} key={condition}>
              <TextField
                label={`${condition} Cash`}
                type="number"
                value={value}
                onChange={(e) => handleBuyCashMultiplierChange(condition, e.target.value)}
                error={!!errors[`buyCash_${condition}`]}
                helperText={errors[`buyCash_${condition}`]}
                inputProps={{ 
                  step: 0.01,
                  min: 0,
                  max: 1
                }}
                fullWidth
                size="small"
              />
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Credit Multiplier */}
        <Typography variant="h6" gutterBottom>
          💳 Buy (Credit) Multiplier
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Multiplier applied to buy cash price to calculate buy credit price
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={6} sm={4}>
            <TextField
              label="Credit Multiplier"
              type="number"
              value={settings.creditMultiplier}
              onChange={(e) => handleCreditMultiplierChange(e.target.value)}
              error={!!errors.creditMultiplier}
              helperText={errors.creditMultiplier}
              inputProps={{ 
                step: 0.01,
                min: 0.5,
                max: 3
              }}
              fullWidth
              size="small"
            />
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
          <Button 
            variant="outlined" 
            onClick={handleReset}
            color="warning"
          >
            Reset to Defaults
          </Button>
          <Button 
            variant="outlined" 
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSave}
            disabled={Object.values(errors).some(error => error !== null)}
          >
            Save Settings
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Settings;
