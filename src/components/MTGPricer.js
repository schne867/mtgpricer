import React, { useState } from 'react';
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
  Link
} from '@mui/material';
import MTGCardBack from '../images/MTGCardBack.jpeg';
import LodestoneLogo from '../images/lodestone-logo-small.png';

const MTGPricer = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedSet, setSelectedSet] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [selectedPrinting, setSelectedPrinting] = useState('Nonfoil');

  // Mock data - will be replaced with API calls
  const mockCardData = {
    name: '',
    sets: ['Core Set 2021', 'Dominaria United', 'The Brothers\' War', 'March of the Machine'],
    languages: ['English', 'Spanish', 'French', 'German', 'Italian', 'Japanese'],
    printings: ['Nonfoil', 'Foil']
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
  const allSelectionsComplete = selectedCard && selectedSet && selectedLanguage && selectedPrinting;

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      console.log('Searching for:', searchTerm);
      // TODO: Implement Scryfall API search
      
      // Mock: Set the selected card with mock data
      setSelectedCard({
        ...mockCardData,
        name: searchTerm
      });
      
      // Reset dropdown selections when new search is performed
      setSelectedSet('');
      setSelectedLanguage('English');
      setSelectedPrinting('Nonfoil');
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setSelectedCard(null);
    setSelectedSet('');
    setSelectedLanguage('English');
    setSelectedPrinting('Nonfoil');
    console.log('Form cleared - reset to starting point');
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
          <TextField
            fullWidth
            variant="outlined"
            label="Search for a Magic card..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Enter card name (e.g., Lightning Bolt)"
            sx={{ backgroundColor: 'white' }}
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            sx={{ 
              px: 3,
              minWidth: 120,
              backgroundColor: '#1976d2',
              '&:hover': {
                backgroundColor: '#1565c0'
              }
            }}
          >
            Search
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

      {/* Dropdown Menus - Show after card is selected */}
      {selectedCard && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" color="white" sx={{ mb: 2, textAlign: 'center' }}>
            Configure "{selectedCard.name}"
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
            {/* Left side - Dropdown Menus */}
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
                value={selectedSet}
                label="Set"
                onChange={(e) => setSelectedSet(e.target.value)}
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
                {selectedCard.sets.map((set) => (
                  <MenuItem key={set} value={set}>
                    {set}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Language Selection */}
            <FormControl fullWidth>
              <InputLabel id="language-select-label" sx={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                Language
              </InputLabel>
              <Select
                labelId="language-select-label"
                id="language-select"
                value={selectedLanguage}
                label="Language"
                onChange={(e) => setSelectedLanguage(e.target.value)}
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
                {selectedCard.languages.map((language) => (
                  <MenuItem key={language} value={language}>
                    {language}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Printing Selection */}
            <FormControl fullWidth>
              <InputLabel id="printing-select-label" sx={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                Printing
              </InputLabel>
              <Select
                labelId="printing-select-label"
                id="printing-select"
                value={selectedPrinting}
                label="Printing"
                onChange={(e) => setSelectedPrinting(e.target.value)}
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
                {selectedCard.printings.map((printing) => (
                  <MenuItem key={printing} value={printing}>
                    {printing}
                  </MenuItem>
                ))}
              </Select>
                          </FormControl>
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
                {selectedSet ? (
                  <img 
                    src="https://via.placeholder.com/350x490/1a1a1a/ffffff?text=Card+Image"
                    alt={`${selectedCard.name} - ${selectedSet}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '6px'
                    }}
                  />
                ) : (
                  <img 
                    src={MTGCardBack}
                    alt="Magic: The Gathering Card Back"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '6px'
                    }}
                  />
                )}
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
            <Link
              href="https://www.tcgplayer.com"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#ff6b35',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '16px',
                '&:hover': {
                  backgroundColor: '#e55a2b',
                  textDecoration: 'none'
                }
              }}
            >
              View on TCGPlayer.com
            </Link>
          </Box>
        </Box>
      )}

      {/* Debug Info */}
      {selectedCard && (
        <Box sx={{ textAlign: 'center', color: 'white', mb: 3 }}>
          <Typography variant="body2">
            Selected: {selectedCard.name} 
            {selectedSet && ` | Set: ${selectedSet}`}
            {` | Language: ${selectedLanguage}`}
            {` | Printing: ${selectedPrinting}`}
          </Typography>
        </Box>
      )}

    </Container>
  );
};

export default MTGPricer;
