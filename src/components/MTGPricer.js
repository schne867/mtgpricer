import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Link,
  CircularProgress,
  Alert,
  Autocomplete
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import LodestoneLogo from '../images/lodestone-logo-small.png';
import Settings from './Settings';
import { useTheme } from '../contexts/ThemeContext';

const MTGPricer = () => {
  const { darkMode, setDarkModeValue } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [uniqueSets, setUniqueSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [availableCollectorNumbers, setAvailableCollectorNumbers] = useState([]);
  const [selectedCollectorNumber, setSelectedCollectorNumber] = useState('');
  const [selectedCardVersion, setSelectedCardVersion] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedFinish, setSelectedFinish] = useState('nonfoil');
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [availableFinishes, setAvailableFinishes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Autocomplete state
  const [suggestions, setSuggestions] = useState([]);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  
  // TCGPlayer pricing state
  const [pricing, setPricing] = useState({
    lpMarketPrice: null,
    loading: false,
    error: null,
    productId: null
  });
  
  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
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
    darkMode: false
  });
  
  // Conservative cache with size limit
  const cacheRef = useRef(new Map());
  const maxCacheSize = 50; // Limit cache to 50 entries to prevent memory bloat
  const debounceTimeoutRef = useRef(null);

  // API configuration
  const API_BASE_URL = 'https://ftukxywiue.execute-api.us-east-2.amazonaws.com/dev/api';

  // Language mapping for display
  const languageNames = {
    'en': 'English',
    'es': 'Spanish', 
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'pt': 'Portuguese',
    'ru': 'Russian'
  };

  // Load settings from localStorage on component mount with robust error handling
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedSettings = localStorage.getItem('mtgPricerSettings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          
          // Validate that the loaded settings have the expected structure
          if (parsedSettings.conditionMultipliers && 
              parsedSettings.buyCashMultipliers && 
              typeof parsedSettings.creditMultiplier === 'number') {
            
            console.log('Settings loaded successfully from localStorage');
            // Ensure darkMode has a default value if not present
            const settingsWithDefaults = {
              ...parsedSettings,
              darkMode: typeof parsedSettings.darkMode === 'boolean' ? parsedSettings.darkMode : false
            };
            setSettings(settingsWithDefaults);
          } else {
            console.warn('Invalid settings structure in localStorage, using defaults');
          }
        } else {
          console.log('No saved settings found, using defaults');
        }
      } catch (error) {
        console.error('Failed to load settings from localStorage:', error);
        console.log('Using default settings due to error');
      }
    };

    loadSettings();
  }, []);

  // Sync settings dark mode with theme context dark mode
  useEffect(() => {
    setSettings(prevSettings => ({
      ...prevSettings,
      darkMode: darkMode
    }));
  }, [darkMode]);

  // Calculate pricing grid from TCGPlayer base price using current settings
  const calculatePricingGrid = (tcgplayerBasePrice) => {
    if (!tcgplayerBasePrice) return null;
    
    const conditions = ['NM', 'EX', 'VG', 'G'];
    const pricingGrid = [];
    
    conditions.forEach(condition => {
      // Step 1: Apply condition multiplier to TCGPlayer base price
      const conditionPrice = tcgplayerBasePrice * settings.conditionMultipliers[condition];
      
      // Step 2: Calculate Buy Cash (condition price * buy cash multiplier)
      const buyCash = conditionPrice * settings.buyCashMultipliers[condition];
      
      // Step 3: Calculate Buy Credit (buy cash * credit multiplier)
      const buyCredit = buyCash * settings.creditMultiplier;
      
      pricingGrid.push({
        condition,
        price: conditionPrice,
        buyCash,
        buyCredit
      });
    });
    
    return pricingGrid;
  };

  // TCGPlayer Pricing Functions
  const extractTCGPlayerProductId = (tcgplayerUri) => {
    if (!tcgplayerUri) return null;
    
    // Handle URL-encoded URIs from Scryfall partner links
    const decodedUri = decodeURIComponent(tcgplayerUri);
    const match = decodedUri.match(/product\/(\d+)/);
    return match ? match[1] : null;
  };

  const getTCGPlayerCondition = (selectedFinish) => {
    return selectedFinish === 'foil' ? 'Foil' : 'Normal';
  };



  const fetchTCGPlayerPricing = useCallback(async (cardVersion, finish) => {
    if (!cardVersion?.purchase_uris?.tcgplayer) {
      setPricing({
        lpMarketPrice: null,
        loading: false,
        error: 'No TCGPlayer link available',
        productId: null
      });
      return;
    }

    const productId = extractTCGPlayerProductId(cardVersion.purchase_uris.tcgplayer);
    if (!productId) {
      setPricing({
        lpMarketPrice: null,
        loading: false,
        error: 'Could not extract product ID',
        productId: null
      });
      return;
    }

    setPricing(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`${API_BASE_URL}/pricing?product_id=${productId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      // Extract market price inline to avoid dependency issues
      const targetCondition = getTCGPlayerCondition(finish);
      const condition = data.pricing?.results?.find(r => r.subTypeName === targetCondition);
      const lpPrice = condition?.marketPrice || null;

      setPricing({
        lpMarketPrice: lpPrice,
        loading: false,
        error: lpPrice === null ? 'Market pricing not available' : null,
        productId: productId
      });

    } catch (error) {
      console.error('TCGPlayer pricing error:', error);
      setPricing({
        lpMarketPrice: null,
        loading: false,
        error: error.message,
        productId: productId
      });
    }
  }, [API_BASE_URL]);

  // Fetch pricing only when Set + Collector Number + Finish are all determined
  useEffect(() => {
    if (selectedSet && selectedCollectorNumber && selectedFinish && selectedCardVersion) {
      fetchTCGPlayerPricing(selectedCardVersion, selectedFinish);
    } else {
      // Clear pricing when selections are incomplete
      setPricing({
        lpMarketPrice: null,
        loading: false,
        error: null,
        productId: null
      });
    }
  }, [selectedSet, selectedCollectorNumber, selectedFinish, selectedCardVersion, fetchTCGPlayerPricing]);

  // Check if all selections are made (unused but kept for potential future use)
  // const allSelectionsComplete = selectedCardVersion && selectedLanguage && selectedFinish;

  // Conservative autocomplete with LRU cache management
  const fetchAutocomplete = useCallback(async (query) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    // Check cache first
    const cache = cacheRef.current;
    if (cache.has(query)) {
      // Move to end (most recently used)
      const cached = cache.get(query);
      cache.delete(query);
      cache.set(query, cached);
      setSuggestions(cached);
      return;
    }

    setAutocompleteLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/autocomplete?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const results = data.suggestions || [];

      // Implement LRU cache with size limit
      if (cache.size >= maxCacheSize) {
        // Remove oldest entry (first in map)
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      
      cache.set(query, results);
      setSuggestions(results);
      
    } catch (err) {
      console.error('Autocomplete error:', err);
      setSuggestions([]); // Fail silently for autocomplete
    } finally {
      setAutocompleteLoading(false);
    }
  }, [API_BASE_URL, maxCacheSize]);

  // Debounced autocomplete with 750ms delay
  const debouncedAutocomplete = useCallback((query) => {
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      fetchAutocomplete(query);
    }, 750); // 750ms delay as requested
  }, [fetchAutocomplete]);

  // Handle autocomplete input change
  const handleAutocompleteChange = (newValue) => {
    setSearchTerm(newValue);
    
    // Clear existing search results when user starts typing a different term
    // This prevents confusion with stale data
    if (newValue !== (searchResults[0]?.name || '')) {
      if (searchResults.length > 0) {
        setSearchResults([]);
        setUniqueSets([]);
        setSelectedSet(null);
        setSelectedCollectorNumber('');
        setSelectedCardVersion(null);
        setSelectedLanguage('en');
        setSelectedFinish('nonfoil');
        setAvailableCollectorNumbers([]);
        setAvailableLanguages([]);
        setAvailableFinishes([]);
      }
    }
    
    if (newValue) {
      debouncedAutocomplete(newValue);
    } else {
      setSuggestions([]);
    }
  };

  // Helper function to group cards by sets and extract unique sets
  const processSearchResults = (cards) => {
    const setMap = new Map();
    const allCards = cards;
    
    // Group by set code and extract unique sets
    cards.forEach(card => {
      const setCode = card.set_code || '';
      const setName = card.set_name || '';
      
      if (!setMap.has(setCode)) {
        setMap.set(setCode, {
          code: setCode,
          name: setName,
          cards: [],
          collectorNumbers: new Set()
        });
      }
      
      const setInfo = setMap.get(setCode);
      setInfo.cards.push(card);
      
      // Clean collector number (remove foil symbols)
      const collectorNum = (card.collector_number || '').replace(/[★☆✦]/g, '');
      if (collectorNum) {
        setInfo.collectorNumbers.add(collectorNum);
      }
    });
    
    // Convert to arrays and sort
    const uniqueSets = Array.from(setMap.values()).sort((a, b) => 
      a.code.toLowerCase().localeCompare(b.code.toLowerCase())
    );
    
    return { allCards, uniqueSets, setMap };
  };

  // Core search logic that can be called from multiple places
  const performSearch = async (term) => {
    if (!term.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      // Search for cards using our API
      const searchResponse = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(term)}`);
      const searchData = await searchResponse.json();
      
      if (!searchResponse.ok) {
        throw new Error(searchData.error || 'Failed to search for cards');
      }

      if (!searchData.cards || searchData.cards.length === 0) {
        throw new Error('No cards found with that name');
      }

      // Process search results and group by sets
      const { allCards, uniqueSets } = processSearchResults(searchData.cards);
      
      setSearchResults(allCards);
      setUniqueSets(uniqueSets);
      
      // Reset selections when new search is performed
      setSelectedSet(null);
      setSelectedCollectorNumber('');
      setSelectedCardVersion(null);
      setSelectedLanguage('en');
      setSelectedFinish('nonfoil');
      setAvailableCollectorNumbers([]);
      setAvailableLanguages([]);
      setAvailableFinishes([]);
      
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to search for cards');
      setSearchResults([]);
      setSelectedCardVersion(null);
    } finally {
      setLoading(false);
    }
  };

  // Form submit handler
  const handleSearch = async (e) => {
    e.preventDefault();
    await performSearch(searchTerm);
  };

  // Handle autocomplete selection (when user clicks on a suggestion)
  const handleAutocompleteSelect = async (event, newValue) => {
    if (newValue && typeof newValue === 'string' && newValue.trim()) {
      // Update the search term
      setSearchTerm(newValue);
      // Clear suggestions since we're performing a search
      setSuggestions([]);
      // Automatically trigger search
      await performSearch(newValue);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setSearchResults([]);
    setUniqueSets([]);
    setSelectedSet(null);
    setSelectedCollectorNumber('');
    setSelectedCardVersion(null);
    setSelectedLanguage('en');
    setSelectedFinish('nonfoil');
    setAvailableCollectorNumbers([]);
    setAvailableLanguages([]);
    setAvailableFinishes([]);
    setError('');
    setSuggestions([]);
    
    // Clear any pending autocomplete
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    console.log('Form cleared - reset to starting point');
  };

  const handleSetSelect = (setCode) => {
    const selectedSetInfo = uniqueSets.find(set => set.code === setCode);
    setSelectedSet(selectedSetInfo);
    
    if (selectedSetInfo) {
      // Set available collector numbers for this set
      const collectorNumbers = Array.from(selectedSetInfo.collectorNumbers).sort((a, b) => {
        // Sort collector numbers numerically when possible
        const numA = parseInt(a, 10);
        const numB = parseInt(b, 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return a.localeCompare(b);
      });
      
      setAvailableCollectorNumbers(collectorNumbers);
      
      // Automatically select the lowest collector number and process it
      const lowestCollectorNumber = collectorNumbers[0];
      if (lowestCollectorNumber) {
        setSelectedCollectorNumber(lowestCollectorNumber);
        
        // Find all cards matching this set and collector number
        const matchingCards = searchResults.filter(card => {
          const cardSetCode = card.set_code || '';
          const cardCollectorNum = (card.collector_number || '').replace(/[★☆✦]/g, '');
          return cardSetCode === selectedSetInfo.code && cardCollectorNum === lowestCollectorNumber;
        });
        
        if (matchingCards.length > 0) {
          // Extract available languages and finishes
          const languages = new Set();
          const finishes = new Set();
          
          matchingCards.forEach(card => {
            languages.add(card.lang || 'en');
            if (card.finishes) {
              card.finishes.forEach(finish => finishes.add(finish));
            }
          });
          
          const langArray = Array.from(languages);
          const finishArray = Array.from(finishes);
          
          setAvailableLanguages(langArray);
          setAvailableFinishes(finishArray);
          
          // Set smart defaults
          const defaultLang = langArray.includes('en') ? 'en' : langArray[0];
          const defaultFinish = finishArray.includes('nonfoil') ? 'nonfoil' : finishArray[0];
          
          setSelectedLanguage(defaultLang);
          setSelectedFinish(defaultFinish);
          
          // Find the specific card version that matches defaults
          const defaultCard = matchingCards.find(card => {
            const langMatch = card.lang === defaultLang;
            const finishMatch = card.finishes && card.finishes.includes(defaultFinish);
            return langMatch && finishMatch;
          });
          
          setSelectedCardVersion(defaultCard || matchingCards[0]);
        }
      } else {
        // Reset subsequent selections if no collector numbers
        setSelectedCollectorNumber('');
        setSelectedCardVersion(null);
        setSelectedLanguage('en');
        setSelectedFinish('nonfoil');
        setAvailableLanguages([]);
        setAvailableFinishes([]);
      }
    }
  };

  const handleCollectorNumberSelect = (collectorNumber) => {
    setSelectedCollectorNumber(collectorNumber);
    
    if (selectedSet && collectorNumber) {
      // Find all cards matching this set and collector number
      const matchingCards = searchResults.filter(card => {
        const cardSetCode = card.set_code || '';
        const cardCollectorNum = (card.collector_number || '').replace(/[★☆✦]/g, '');
        return cardSetCode === selectedSet.code && cardCollectorNum === collectorNumber;
      });
      
      if (matchingCards.length > 0) {
        // Extract available languages and finishes
        const languages = new Set();
        const finishes = new Set();
        
        matchingCards.forEach(card => {
          languages.add(card.lang || 'en');
          if (card.finishes) {
            card.finishes.forEach(finish => finishes.add(finish));
          }
        });
        
        const langArray = Array.from(languages);
        const finishArray = Array.from(finishes);
        
        setAvailableLanguages(langArray);
        setAvailableFinishes(finishArray);
        
        // Set smart defaults
        const defaultLang = langArray.includes('en') ? 'en' : langArray[0];
        const defaultFinish = finishArray.includes('nonfoil') ? 'nonfoil' : finishArray[0];
        
        setSelectedLanguage(defaultLang);
        setSelectedFinish(defaultFinish);
        
        // Find the specific card version that matches defaults
        const defaultCard = matchingCards.find(card => {
          const langMatch = card.lang === defaultLang;
          const finishMatch = card.finishes && card.finishes.includes(defaultFinish);
          return langMatch && finishMatch;
        });
        
        setSelectedCardVersion(defaultCard || matchingCards[0]);
      }
    }
  };

  // Get the specific card variant based on selected language and finish
  const getCurrentCardVariant = () => {
    if (!selectedSet || !selectedCollectorNumber || !selectedLanguage || !selectedFinish) {
      return selectedCardVersion;
    }
    
    // Find the exact variant that matches all selections
    const matchingVariant = searchResults.find(card => {
      const cardSetCode = card.set_code || '';
      const cardCollectorNum = (card.collector_number || '').replace(/[★☆✦]/g, '');
      const langMatch = card.lang === selectedLanguage;
      const finishMatch = card.finishes && card.finishes.includes(selectedFinish);
      
      return cardSetCode === selectedSet.code && 
             cardCollectorNum === selectedCollectorNumber && 
             langMatch && 
             finishMatch;
    });
    
    return matchingVariant || selectedCardVersion;
  };

  // Handler for language/finish changes
  const handleLanguageOrFinishChange = () => {
    if (selectedSet && selectedCollectorNumber) {
      const currentVariant = getCurrentCardVariant();
      if (currentVariant) {
        setSelectedCardVersion(currentVariant);
      }
    }
  };

  return (
    <Container maxWidth="lg" sx={{ 
      py: { xs: 2, md: 4 }, 
      px: { xs: 1, sm: 2, md: 3 },
      position: 'relative', 
      minHeight: '100vh' 
    }}>
      {/* Settings Button - Top right corner of screen */}
      <Button
        onClick={() => setShowSettings(true)}
        variant="outlined"
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          m: 2,
          color: 'primary.main',
          borderColor: 'primary.main',
          backgroundColor: 'background.paper',
          zIndex: 1000,
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover',
            boxShadow: 1
          }
        }}
        startIcon={<SettingsIcon />}
      >
        Settings
      </Button>

      {/* Lodestone Logo - Centered header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        mb: 4
      }}>
        <img 
          src={LodestoneLogo}
          alt="Lodestone Logo"
          style={{
            height: '80px',
            width: 'auto',
            display: 'block'
          }}
        />
      </Box>
      
      <Box component="form" onSubmit={handleSearch} sx={{ mb: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          gap: { xs: 1, md: 2 }, 
          alignItems: 'center',
          flexDirection: { xs: 'column', sm: 'row' }
        }}>
          <Autocomplete
            fullWidth
            freeSolo
            options={suggestions}
            value={searchTerm}
            onInputChange={(event, newValue) => handleAutocompleteChange(newValue)}
            onChange={handleAutocompleteSelect}
            loading={autocompleteLoading}
            disabled={loading}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                label="Search for a Magic card..."
                placeholder="Enter card name (e.g., Lightning Bolt)"
                sx={{ 
                  bgcolor: 'background.paper',
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    '& fieldset': {
                      borderColor: 'divider',
                    },
                    '&:hover fieldset': {
                      borderColor: 'text.secondary',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'primary.main',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'text.secondary',
                    '&.Mui-focused': {
                      color: 'primary.main',
                    },
                  },
                  '& input': {
                    color: 'text.primary',
                  },
                  '& input::placeholder': {
                    color: 'text.secondary',
                    opacity: 0.7,
                  },
                }}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {autocompleteLoading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            sx={{ 
              '& .MuiAutocomplete-listbox': {
                maxHeight: '200px', // Limit dropdown height
                bgcolor: 'background.paper',
              },
              '& .MuiAutocomplete-paper': {
                bgcolor: 'background.paper',
                color: 'text.primary',
              },
              '& .MuiAutocomplete-option': {
                color: 'text.primary',
                '&[aria-selected="true"]': {
                  bgcolor: 'action.selected',
                },
                '&.Mui-focused': {
                  bgcolor: 'action.hover',
                },
              },
              '& .MuiAutocomplete-popupIndicator': {
                color: 'text.secondary',
              },
              '& .MuiAutocomplete-clearIndicator': {
                color: 'text.secondary',
              },
            }}
          />
          <Box sx={{ 
            display: 'flex', 
            gap: { xs: 1, md: 2 }, 
            width: { xs: '100%', sm: 'auto' },
            justifyContent: { xs: 'stretch', sm: 'flex-start' }
          }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading || !searchTerm.trim()}
              sx={{ 
                px: { xs: 2, md: 3 },
                minWidth: { xs: 'auto', md: 120 },
                flex: { xs: 1, sm: '0 0 auto' },
                backgroundColor: '#1976d2',
                '&:hover': {
                  backgroundColor: '#1565c0'
                }
              }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Search'}
            </Button>
            <Button
              variant="outlined"
              onClick={handleClear}
              size="large"
              sx={{
                px: { xs: 2, md: 3 },
                minWidth: { xs: 'auto', md: 120 },
                flex: { xs: 1, sm: '0 0 auto' },
                color: '#ffffff',
                borderColor: '#808080',
                backgroundColor: 'rgba(64, 64, 64, 0.4)',
                '&:hover': {
                  color: '#ffffff',
                  borderColor: '#a0a0a0',
                  backgroundColor: 'rgba(96, 96, 96, 0.6)'
                }
              }}
            >
              Clear
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Error Display */}
      {error && (
        <Box sx={{ mb: 3 }}>
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        </Box>
      )}

      {/* Search Results - Show after search */}
      {searchResults.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, textAlign: 'center', color: 'text.primary' }}>
            Found {searchResults.length} versions of "{searchResults[0].name}"
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start', 
            gap: { xs: 2, md: 3 },
            flexDirection: { xs: 'column', lg: 'row' }
          }}>
            {/* Left side - Controls and Pricing */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 2, 
              width: { xs: '100%', lg: 500 }, 
              flex: '0 0 auto' 
            }}>
              {/* Dropdowns Section */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Set Selection */}
              <FormControl fullWidth>
                <InputLabel 
                  id="set-select-label" 
                  shrink 
                  sx={{ 
                    color: 'text.secondary',
                    '&.Mui-focused': {
                      color: 'primary.main',
                    }
                  }}
                >
                  Set
                </InputLabel>
                <Select
                  labelId="set-select-label"
                  id="set-select"
                  value={selectedSet?.code || ''}
                  label="Set"
                  onChange={(e) => handleSetSelect(e.target.value)}
                  displayEmpty
                  sx={{ 
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'divider',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'text.secondary',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main',
                    },
                    '& .MuiSelect-icon': {
                      color: 'text.secondary'
                    }
                  }}
                >
                  <MenuItem value="" disabled sx={{ color: 'text.disabled' }}>
                    Select a Set
                  </MenuItem>
                  {uniqueSets.map((set) => (
                    <MenuItem key={set.code} value={set.code}>
                      {set.name} ({set.code.toUpperCase()})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Collector Number Selection */}
              {selectedSet && (
                <FormControl fullWidth>
                  <InputLabel 
                    id="collector-select-label" 
                    shrink 
                    sx={{ 
                      color: 'text.secondary',
                      '&.Mui-focused': {
                        color: 'primary.main',
                      }
                    }}
                  >
                    Collector Number
                  </InputLabel>
                  <Select
                    labelId="collector-select-label"
                    id="collector-select"
                    value={selectedCollectorNumber}
                    label="Collector Number"
                    onChange={(e) => handleCollectorNumberSelect(e.target.value)}
                    displayEmpty
                    sx={{ 
                      bgcolor: 'background.paper',
                      color: 'text.primary',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'divider',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'text.secondary',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main',
                      },
                      '& .MuiSelect-icon': {
                        color: 'text.secondary'
                      }
                    }}
                  >
                    <MenuItem value="" disabled sx={{ color: 'grey' }}>
                      Select a Collector Number
                    </MenuItem>
                    {availableCollectorNumbers.map((number) => (
                      <MenuItem key={number} value={number}>
                        #{number}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {/* Language Selection */}
              {selectedCollectorNumber && availableLanguages.length > 0 && (
                <FormControl fullWidth>
                  <InputLabel id="language-select-label" shrink sx={{ 
                    color: 'text.secondary',
                    '&.Mui-focused': {
                      color: 'primary.main',
                    }
                  }}>
                    Language
                  </InputLabel>
                  <Select
                    labelId="language-select-label"
                    id="language-select"
                    value={selectedLanguage}
                    label="Language"
                    onChange={(e) => {
                      setSelectedLanguage(e.target.value);
                      handleLanguageOrFinishChange();
                    }}
                    sx={{ 
                      bgcolor: 'background.paper',
                      color: 'text.primary',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'divider',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'text.secondary',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main',
                      },
                      '& .MuiSelect-icon': {
                        color: 'text.secondary'
                      }
                    }}
                  >
                    {availableLanguages.map((langCode) => (
                      <MenuItem key={langCode} value={langCode}>
                        {languageNames[langCode] || langCode}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {/* Finish Selection */}
              {selectedCollectorNumber && availableFinishes.length > 0 && (
                <FormControl fullWidth>
                  <InputLabel id="finish-select-label" shrink sx={{ 
                    color: 'text.secondary',
                    '&.Mui-focused': {
                      color: 'primary.main',
                    }
                  }}>
                    Finish
                  </InputLabel>
                  <Select
                    labelId="finish-select-label"
                    id="finish-select"
                    value={selectedFinish}
                    label="Finish"
                    onChange={(e) => {
                      setSelectedFinish(e.target.value);
                      handleLanguageOrFinishChange();
                    }}
                    sx={{ 
                      bgcolor: 'background.paper',
                      color: 'text.primary',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'divider',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'text.secondary',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main',
                      },
                      '& .MuiSelect-icon': {
                        color: 'text.secondary'
                      }
                    }}
                  >
                    {availableFinishes.map((finish) => (
                      <MenuItem key={finish} value={finish}>
                        {finish.charAt(0).toUpperCase() + finish.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              </Box>
              
              {/* Pricing Grid - Positioned under dropdowns */}
              {selectedSet && selectedCollectorNumber && (
                <Box sx={{ 
                  bgcolor: 'background.paper', 
                  p: { xs: 2, md: 3 }, 
                  borderRadius: 2, 
                  mt: 2,
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
                  {/* Status message */}
                  {!selectedFinish ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, textAlign: 'center' }}>
                      Select finish to load pricing
                    </Typography>
                  ) : pricing.loading ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, textAlign: 'center' }}>
                      Loading pricing data...
                    </Typography>
                  ) : pricing.error ? (
                    <Typography variant="body2" sx={{ color: 'error.main', mb: 2, textAlign: 'center' }}>
                      {pricing.error}
                    </Typography>
                  ) : pricing.lpMarketPrice !== null ? (
                    <Typography variant="body2" sx={{ color: 'text.primary', mb: 2, textAlign: 'center' }}>
                      Base Price: ${pricing.lpMarketPrice.toFixed(2)} (Market - {selectedFinish === 'foil' ? 'Foil' : 'Non-foil'})
                    </Typography>
                  ) : (
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, textAlign: 'center' }}>
                      Ready to load pricing
                    </Typography>
                  )}
                      
                  <TableContainer component={Paper} sx={{ bgcolor: 'background.paper' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                          <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Condition</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Price</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Buy (Cash)</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Buy (Credit)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(() => {
                          const conditions = ['NM', 'EX', 'VG', 'G'];
                          const hasData = pricing.lpMarketPrice !== null && !pricing.loading && !pricing.error;
                          const pricingGrid = hasData ? calculatePricingGrid(pricing.lpMarketPrice) : null;
                          
                          return conditions.map((condition) => {
                            const rowData = pricingGrid?.find(row => row.condition === condition);
                            const isLoading = pricing.loading;
                            const hasError = pricing.error;
                            
                            return (
                              <TableRow key={condition}>
                                <TableCell sx={{ fontWeight: condition === 'NM' ? 'bold' : 'normal' }}>
                                  {condition}
                                </TableCell>
                                <TableCell align="right" sx={{ 
                                  fontWeight: condition === 'NM' ? 'bold' : 'normal',
                                  color: condition === 'NM' ? 'primary.main' : 'text.primary'
                                }}>
                                  {isLoading ? (
                                    <CircularProgress size={16} />
                                  ) : hasError ? (
                                    <Typography variant="caption" color="error">N/A</Typography>
                                  ) : rowData ? (
                                    `$${rowData.price.toFixed(2)}`
                                  ) : (
                                    <Typography variant="caption" color="text.secondary">-</Typography>
                                  )}
                                </TableCell>
                                <TableCell align="right">
                                  {isLoading ? (
                                    <CircularProgress size={16} />
                                  ) : hasError ? (
                                    <Typography variant="caption" color="error">N/A</Typography>
                                  ) : rowData ? (
                                    `$${rowData.buyCash.toFixed(2)}`
                                  ) : (
                                    <Typography variant="caption" color="text.secondary">-</Typography>
                                  )}
                                </TableCell>
                                <TableCell align="right" sx={{ color: hasData ? 'success.main' : 'text.primary', fontWeight: 'medium' }}>
                                  {isLoading ? (
                                    <CircularProgress size={16} />
                                  ) : hasError ? (
                                    <Typography variant="caption" color="error">N/A</Typography>
                                  ) : rowData ? (
                                    `$${rowData.buyCredit.toFixed(2)}`
                                  ) : (
                                    <Typography variant="caption" color="text.secondary">-</Typography>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          });
                        })()}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 2, textAlign: 'center' }}>
                    Powered by TCGPlayer API
                  </Typography>
              
                  {/* TCGPlayer Link - Show only when card is selected and has link */}
                  {selectedCardVersion?.purchase_uris?.tcgplayer && (
                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                      <Link
                        href={selectedCardVersion.purchase_uris.tcgplayer}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          display: 'inline-block',
                          padding: '8px 16px',
                          backgroundColor: 'secondary.main',
                          color: 'secondary.contrastText',
                          textDecoration: 'none',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          fontSize: { xs: '12px', md: '14px' },
                          '&:hover': {
                            backgroundColor: 'secondary.dark',
                            textDecoration: 'none'
                          }
                        }}
                      >
                        View on TCGPlayer.com
                      </Link>
                    </Box>
                  )}
                </Box>
              )}
            </Box>

            {/* Right side - Card Image */}
            <Box sx={{ 
              flex: '0 0 auto', 
              display: 'flex', 
              justifyContent: 'center',
              width: { xs: '100%', lg: 'auto' }
            }}>
              <Box sx={{ 
                width: { xs: 280, sm: 320, md: 350 }, 
                height: { xs: 390, sm: 447, md: 490 }, 
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid grey',
                maxWidth: '100%',
                mx: 'auto'
              }}>
                {(() => {
                  const currentVariant = getCurrentCardVariant();
                  return currentVariant?.image_url ? (
                    <img 
                      src={currentVariant.image_url}
                      alt={`${currentVariant.name} - ${currentVariant.set_name}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '6px'
                      }}
                      onError={(e) => {
                        // Fallback to MTG card back if image fails to load
                        e.target.src = '/MTGCardBack.png';
                      }}
                    />
                  ) : (
                    <img 
                      src="/MTGCardBack.png"
                      alt="Magic: The Gathering Card Back"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '6px'
                      }}
                    />
                  );
                })()}
              </Box>
            </Box>
          </Box>
        </Box>
      )}



      {/* Card Info */}
      {selectedCardVersion && (
        <Box sx={{ 
          textAlign: 'center', 
          mb: { xs: 2, md: 3 },
          px: { xs: 1, md: 0 }
        }}>
          <Typography variant="body2" sx={{ color: 'text.primary' }}>
            {selectedCardVersion.name}
            {selectedCardVersion.mana_cost && ` | Mana Cost: ${selectedCardVersion.mana_cost}`}
            {selectedCardVersion.type_line && ` | Type: ${selectedCardVersion.type_line}`}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
            {`Set: ${selectedCardVersion.set_name} (${selectedCardVersion.set_code.toUpperCase()})`}
            {selectedCardVersion.collector_number && ` #${selectedCardVersion.collector_number}`}
            {selectedCardVersion.rarity && ` | ${selectedCardVersion.rarity.charAt(0).toUpperCase() + selectedCardVersion.rarity.slice(1)}`}
            {selectedCardVersion.artist && ` | Artist: ${selectedCardVersion.artist}`}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
            {`Language: ${languageNames[selectedLanguage] || selectedLanguage}`}
            {selectedFinish && ` | Finish: ${selectedFinish.charAt(0).toUpperCase() + selectedFinish.slice(1)}`}
            {(() => {
              const currentVariant = getCurrentCardVariant();
              return currentVariant ? (
                <>
                  {currentVariant.promo && ' | PROMO'}
                  {currentVariant.full_art && ' | Full Art'}
                </>
              ) : null;
            })()}
          </Typography>
        </Box>
      )}



      {/* Settings Modal */}
      {showSettings && (
        <Settings
          currentSettings={settings}
          onSave={(newSettings) => {
            setSettings(newSettings);
            // Sync dark mode with theme context
            if (typeof newSettings.darkMode === 'boolean' && newSettings.darkMode !== darkMode) {
              setDarkModeValue(newSettings.darkMode);
            }
            setShowSettings(false);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

    </Container>
  );
};

export default MTGPricer;
