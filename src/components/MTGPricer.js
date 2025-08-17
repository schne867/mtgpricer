import React, { useState, useCallback, useRef } from 'react';
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
import LodestoneLogo from '../images/lodestone-logo-small.png';

const MTGPricer = () => {
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

  // Pricing configuration
  const conditionMultipliers = {
    'NM': 1.0,
    'EX': 0.9,
    'VG': 0.75,
    'G': 0.5
  };
  const creditMultiplier = 1.3;
  const mockNearMintPrice = 15.99; // Will be replaced with TCGPlayer API data

  // Check if all selections are made
  const allSelectionsComplete = selectedCardVersion && selectedLanguage && selectedFinish;

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

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      // Search for cards using our API
      const searchResponse = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(searchTerm)}`);
      const searchData = await searchResponse.json();
      
      if (!searchResponse.ok) {
        throw new Error(searchData.error || 'Failed to search for cards');
      }

      if (!searchData.cards || searchData.cards.length === 0) {
        throw new Error('No cards found with that name');
      }

      // Process search results and group by sets
      const { allCards, uniqueSets, setMap } = processSearchResults(searchData.cards);
      
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
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
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Autocomplete
            fullWidth
            freeSolo
            options={suggestions}
            value={searchTerm}
            onInputChange={(event, newValue) => handleAutocompleteChange(newValue)}
            loading={autocompleteLoading}
            disabled={loading}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                label="Search for a Magic card..."
                placeholder="Enter card name (e.g., Lightning Bolt)"
                sx={{ backgroundColor: 'white' }}
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
                maxHeight: '200px' // Limit dropdown height
              }
            }}
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading || !searchTerm.trim()}
            sx={{ 
              px: 3,
              minWidth: 120,
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
              px: 3,
              minWidth: 120,
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
          <Typography variant="h6" color="white" sx={{ mb: 2, textAlign: 'center' }}>
            Found {searchResults.length} versions of "{searchResults[0].name}"
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
            {/* Left side - Set and Collector Number Selection */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: 500, flex: '0 0 auto' }}>
              {/* Set Selection */}
              <FormControl fullWidth>
                <InputLabel 
                  id="set-select-label" 
                  shrink 
                  sx={{ 
                    color: 'rgba(0, 0, 0, 0.6)',
                    '&.Mui-focused': {
                      color: 'rgba(0, 0, 0, 0.6)',
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
                    backgroundColor: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'grey',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'grey',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'grey',
                    },
                  }}
                >
                  <MenuItem value="" disabled sx={{ color: 'grey' }}>
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
                      color: 'rgba(0, 0, 0, 0.6)',
                      '&.Mui-focused': {
                        color: 'rgba(0, 0, 0, 0.6)',
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
                      backgroundColor: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'grey',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'grey',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'grey',
                      },
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
                  <InputLabel id="language-select-label" shrink sx={{ color: 'rgba(0, 0, 0, 0.6)' }}>
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
                      backgroundColor: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'grey',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'grey',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'grey',
                      },
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
                  <InputLabel id="finish-select-label" shrink sx={{ color: 'rgba(0, 0, 0, 0.6)' }}>
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
                      backgroundColor: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'grey',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'grey',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'grey',
                      },
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

            {/* Right side - Card Image */}
            <Box sx={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ 
                width: 350, 
                height: 490, 
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid grey'
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

      {/* Pricing Grid - Show only when all selections are complete */}
      {allSelectionsComplete && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" color="white" sx={{ mb: 3, textAlign: 'center' }}>
            Pricing Information
          </Typography>
          
          <TableContainer component={Paper} sx={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#1976d2' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
                    Price
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
                    Stock
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
                    Condition
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
                    Buy (Cash)
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
                    Buy (Credit)
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(conditionMultipliers).map(([condition, multiplier]) => {
                  const cashPrice = mockNearMintPrice * multiplier;
                  const creditPrice = cashPrice * creditMultiplier;
                  
                  return (
                    <TableRow key={condition} sx={{ '&:nth-of-type(even)': { backgroundColor: '#f5f5f5' } }}>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                        ${mockNearMintPrice.toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', color: '#666' }}>
                        N/A
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                        {condition} ({condition === 'NM' ? 'Near-Mint' : 
                                   condition === 'EX' ? 'Excellent' : 
                                   condition === 'VG' ? 'Very Good' : 'Good'})
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 'bold', color: '#2e7d32' }}>
                        ${cashPrice.toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 'bold', color: '#1565c0' }}>
                        ${creditPrice.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* TCGPlayer Link */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            {(() => {
              const currentVariant = getCurrentCardVariant();
              const tcgplayerLink = currentVariant?.purchase_uris?.tcgplayer;
              
              return (
                <Link
                  href={tcgplayerLink || "https://www.tcgplayer.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    backgroundColor: tcgplayerLink ? '#ff6b35' : '#ccc',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    cursor: tcgplayerLink ? 'pointer' : 'not-allowed',
                    '&:hover': {
                      backgroundColor: tcgplayerLink ? '#e55a2b' : '#ccc',
                      textDecoration: 'none'
                    }
                  }}
                >
                  {tcgplayerLink ? 'View on TCGPlayer.com' : 'TCGPlayer Link Unavailable'}
                </Link>
              );
            })()}
          </Box>
        </Box>
      )}

      {/* Card Info */}
      {selectedCardVersion && (
        <Box sx={{ textAlign: 'center', color: 'white', mb: 3 }}>
          <Typography variant="body2">
            {selectedCardVersion.name}
            {selectedCardVersion.mana_cost && ` | Mana Cost: ${selectedCardVersion.mana_cost}`}
            {selectedCardVersion.type_line && ` | Type: ${selectedCardVersion.type_line}`}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
            {`Set: ${selectedCardVersion.set_name} (${selectedCardVersion.set_code.toUpperCase()})`}
            {selectedCardVersion.collector_number && ` #${selectedCardVersion.collector_number}`}
            {selectedCardVersion.rarity && ` | ${selectedCardVersion.rarity.charAt(0).toUpperCase() + selectedCardVersion.rarity.slice(1)}`}
            {selectedCardVersion.artist && ` | Artist: ${selectedCardVersion.artist}`}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
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

    </Container>
  );
};

export default MTGPricer;
