import requests
import time
import json
from typing import Dict, List, Optional

class ScryfallClient:
    """
    Client for interacting with the Scryfall API
    Documentation: https://scryfall.com/docs/api
    """
    
    def __init__(self, base_url: str = "https://api.scryfall.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'MTGPricer/1.0'
        })
    
    def _make_request(self, endpoint: str, params: Dict = None) -> Dict:
        """
        Make a request to the Scryfall API with rate limiting
        Scryfall requests a 50-100ms delay between requests
        """
        url = f"{self.base_url}{endpoint}"
        
        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()
            
            # Respect Scryfall's rate limiting
            time.sleep(0.1)  # 100ms delay
            
            return response.json()
        
        except requests.exceptions.RequestException as e:
            print(f"Error making request to Scryfall: {e}")
            raise
    
    def search_cards(self, query: str, page: int = 1) -> Dict:
        """
        Search for cards using Scryfall's search API
        
        Args:
            query: The search query (card name, etc.)
            page: Page number for pagination
            
        Returns:
            Dict containing search results
        """
        endpoint = "/cards/search"
        params = {
            'q': f'!"{query}"',  # Exact name match using quotes and ! operator
            'page': page,
            'order': 'name',
            'dir': 'asc',
            'unique': 'prints'  # Return all unique printings, not just unique names
        }
        
        return self._make_request(endpoint, params)
    
    def autocomplete_cards(self, query: str) -> Dict:
        """
        Get autocomplete suggestions for card names
        
        Args:
            query: Partial card name (minimum 3 characters)
            
        Returns:
            Dict containing autocomplete suggestions
        """
        endpoint = "/cards/autocomplete"
        params = {
            'q': query
        }
        
        return self._make_request(endpoint, params)
    
    def get_card_by_name(self, name: str, set_code: str = None) -> Dict:
        """
        Get a specific card by exact name
        
        Args:
            name: Exact card name
            set_code: Optional set code to specify which printing
            
        Returns:
            Dict containing card data
        """
        endpoint = "/cards/named"
        params = {'exact': name}
        
        if set_code:
            params['set'] = set_code
            
        return self._make_request(endpoint, params)
    
    def get_card_sets(self, card_name: str) -> List[Dict]:
        """
        Get all sets that a card has been printed in
        
        Args:
            card_name: Name of the card
            
        Returns:
            List of set information
        """
        try:
            search_results = self.search_cards(f'!"${card_name}"')
            
            if 'data' not in search_results:
                return []
            
            # Extract unique sets
            sets = {}
            for card in search_results['data']:
                set_code = card.get('set')
                set_name = card.get('set_name')
                if set_code and set_name:
                    sets[set_code] = {
                        'code': set_code,
                        'name': set_name,
                        'released_at': card.get('released_at')
                    }
            
            return list(sets.values())
        
        except Exception as e:
            print(f"Error getting card sets: {e}")
            return []
