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
  Alert,
  FormControlLabel,
  Switch,
  Tabs,
  Tab
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const Settings = ({ currentSettings, onSave, onClose }) => {
  // Initialize with current settings from parent component
  const [settings, setSettings] = useState(currentSettings || {
    basePriceModifier: 1.15,
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
    creditMultiplier: 1.3,
    bulkThreshold: 3.0,
    highEndThreshold: 200.0,
    pricingTiers: [
      { name: 'Very Low', lowerBound: 3.0, multiplier: 0.08 },
      { name: 'Low', lowerBound: 4.0, multiplier: 0.25 },
      { name: 'Mid', lowerBound: 12.0, multiplier: 0.40 },
      { name: 'Mid-High', lowerBound: 25.0, multiplier: 0.45 },
      { name: 'High', lowerBound: 50.0, multiplier: 0.50 }
    ],
    darkMode: false
  });

  const [errors, setErrors] = useState({});
  const [currentTab, setCurrentTab] = useState(0);

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

  const handleDarkModeToggle = (event) => {
    setSettings(prev => ({ ...prev, darkMode: event.target.checked }));
  };

  const handleBasePriceModifierChange = (value) => {
    if (validateInput(value, 0.5, 3)) {
      setSettings(prev => ({
        ...prev,
        basePriceModifier: parseFloat(value)
      }));
      setErrors(prev => ({ ...prev, basePriceModifier: null }));
    } else {
      setErrors(prev => ({ ...prev, basePriceModifier: 'Value must be between 0.5 and 3' }));
    }
  };

  const handleBulkThresholdChange = (value) => {
    if (validateInput(value, 0.01, 50)) {
      setSettings(prev => ({
        ...prev,
        bulkThreshold: parseFloat(value)
      }));
      setErrors(prev => ({ ...prev, bulkThreshold: null }));
    } else {
      setErrors(prev => ({ ...prev, bulkThreshold: 'Value must be between 0.01 and 50' }));
    }
  };

  const handleHighEndThresholdChange = (value) => {
    if (validateInput(value, 50, 10000)) {
      setSettings(prev => ({
        ...prev,
        highEndThreshold: parseFloat(value)
      }));
      setErrors(prev => ({ ...prev, highEndThreshold: null }));
    } else {
      setErrors(prev => ({ ...prev, highEndThreshold: 'Value must be between 50 and 10000' }));
    }
  };

  const handlePricingTierChange = (index, field, value) => {
    const newTiers = [...settings.pricingTiers];
    
    if (field === 'lowerBound') {
      if (validateInput(value, 0.01, 1000)) {
        newTiers[index][field] = parseFloat(value);
        setErrors(prev => ({ ...prev, [`tier_${index}_${field}`]: null }));
      } else {
        setErrors(prev => ({ ...prev, [`tier_${index}_${field}`]: 'Value must be between 0.01 and 1000' }));
        return;
      }
    } else if (field === 'multiplier') {
      if (validateInput(value, 0.01, 1)) {
        newTiers[index][field] = parseFloat(value);
        setErrors(prev => ({ ...prev, [`tier_${index}_${field}`]: null }));
      } else {
        setErrors(prev => ({ ...prev, [`tier_${index}_${field}`]: 'Value must be between 0.01 and 1' }));
        return;
      }
    }
    
    setSettings(prev => ({
      ...prev,
      pricingTiers: newTiers
    }));
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
      basePriceModifier: 1.15,
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
      creditMultiplier: 1.3,
      bulkThreshold: 3.0,
      highEndThreshold: 200.0,
      pricingTiers: [
        { name: 'Very Low', lowerBound: 3.0, multiplier: 0.08 },
        { name: 'Low', lowerBound: 4.0, multiplier: 0.25 },
        { name: 'Mid', lowerBound: 12.0, multiplier: 0.40 },
        { name: 'Mid-High', lowerBound: 25.0, multiplier: 0.45 },
        { name: 'High', lowerBound: 50.0, multiplier: 0.50 }
      ],
      darkMode: false
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
        maxWidth: 800,
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h5" component="h2">
            ⚙️ Pricing Settings
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Tabs */}
        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => setCurrentTab(newValue)}
          sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Tab label="🎨 UI" />
          <Tab label="💰 Pricing" />
          <Tab label="📋 Buylist" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Tab 0: UI Settings */}
          {currentTab === 0 && (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                Configure user interface and appearance settings. Changes are saved locally and persist between sessions.
              </Alert>

              {/* Dark Mode Toggle */}
              <Paper sx={{ p: 3, bgcolor: 'action.hover' }}>
                <Typography variant="h6" gutterBottom>
                  🌙 Theme Settings
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.darkMode}
                      onChange={handleDarkModeToggle}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body1">
                      Dark Mode
                    </Typography>
                  }
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                  Switch between light and dark themes for better viewing experience
                </Typography>
              </Paper>
            </Box>
          )}

          {/* Tab 1: Pricing Settings */}
          {currentTab === 1 && (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                Configure base price modifier and pricing multipliers for card conditions and buy prices.
              </Alert>

              {/* Base Price Modifier */}
              <Paper sx={{ p: 3, mb: 3, bgcolor: 'action.hover' }}>
                <Typography variant="h6" gutterBottom>
                  🎯 Base Price Modifier
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Initial adjustment to TCGPlayer market price (e.g., 115% = 1.15). All condition prices are calculated from this adjusted base.
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      label="Base Price Modifier"
                      type="number"
                      value={settings.basePriceModifier}
                      onChange={(e) => handleBasePriceModifierChange(e.target.value)}
                      error={!!errors.basePriceModifier}
                      helperText={errors.basePriceModifier}
                      inputProps={{ 
                        step: 0.01,
                        min: 0.5,
                        max: 3
                      }}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </Paper>

              <Paper sx={{ p: 3, mb: 3, bgcolor: 'action.hover' }}>
                <Typography variant="h6" gutterBottom>
                  📊 Price Multipliers (Applied to Adjusted Base)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Multipliers applied to the adjusted base price for each condition
                </Typography>
                
                <Grid container spacing={2} sx={{ mb: 3 }}>
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
                      />
                    </Grid>
                  ))}
                </Grid>
              </Paper>

              <Paper sx={{ p: 3, mb: 3, bgcolor: 'action.hover' }}>
                <Typography variant="h6" gutterBottom>
                  💵 Buy (Cash) Multipliers
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Multipliers applied to condition prices for cash purchases
                </Typography>
                
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {Object.entries(settings.buyCashMultipliers).map(([condition, value]) => (
                    <Grid item xs={6} sm={3} key={condition}>
                      <TextField
                        label={`${condition} Buy Cash`}
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
                      />
                    </Grid>
                  ))}
                </Grid>
              </Paper>

              <Paper sx={{ p: 3, bgcolor: 'action.hover' }}>
                <Typography variant="h6" gutterBottom>
                  💳 Buy (Credit) Multiplier
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Multiplier applied to buy cash prices for credit purchases
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
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
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          )}

          {/* Tab 2: Buylist Settings */}
          {currentTab === 2 && (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                Configure tiered buying thresholds for BULK and HIGH END categories. Base price modifier is set in the Pricing tab.
              </Alert>

              <Paper sx={{ p: 3, mb: 3, bgcolor: 'action.hover' }}>
                <Typography variant="h6" gutterBottom>
                  📦 Tiered Buying System
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Configure thresholds for BULK and HIGH END buying categories
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="BULK Threshold ($)"
                      type="number"
                      value={settings.bulkThreshold}
                      onChange={(e) => handleBulkThresholdChange(e.target.value)}
                      error={!!errors.bulkThreshold}
                      helperText={errors.bulkThreshold || "Cards below this price show 'BULK'"}
                      inputProps={{ 
                        step: 0.01,
                        min: 0.01,
                        max: 50
                      }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="HIGH END Threshold ($)"
                      type="number"
                      value={settings.highEndThreshold}
                      onChange={(e) => handleHighEndThresholdChange(e.target.value)}
                      error={!!errors.highEndThreshold}
                      helperText={errors.highEndThreshold || "Cards above this price show 'HIGH END'"}
                      inputProps={{ 
                        step: 1,
                        min: 50,
                        max: 10000
                      }}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Pricing Tiers */}
              <Paper sx={{ p: 3, bgcolor: 'action.hover' }}>
                <Typography variant="h6" gutterBottom>
                  📊 Pricing Tiers
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Configure pricing multipliers that apply between BULK and HIGH END thresholds. Applied to condition prices before buy multipliers.
                </Typography>
                
                {settings.pricingTiers.map((tier, index) => (
                  <Paper key={tier.name} sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
                      {tier.name}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Lower Bound ($)"
                          type="number"
                          value={tier.lowerBound}
                          onChange={(e) => handlePricingTierChange(index, 'lowerBound', e.target.value)}
                          error={!!errors[`tier_${index}_lowerBound`]}
                          helperText={errors[`tier_${index}_lowerBound`] || `Cards $${tier.lowerBound}+ use this tier`}
                          inputProps={{ 
                            step: 0.01,
                            min: 0.01,
                            max: 1000
                          }}
                          fullWidth
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Multiplier (%)"
                          type="number"
                          value={tier.multiplier * 100}
                          onChange={(e) => handlePricingTierChange(index, 'multiplier', e.target.value / 100)}
                          error={!!errors[`tier_${index}_multiplier`]}
                          helperText={errors[`tier_${index}_multiplier`] || `${(tier.multiplier * 100).toFixed(0)}% of condition price`}
                          inputProps={{ 
                            step: 1,
                            min: 1,
                            max: 100
                          }}
                          fullWidth
                          size="small"
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Paper>
            </Box>
          )}
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4, p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
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
