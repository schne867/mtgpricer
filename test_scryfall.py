import requests

def test_our_api(query):
    """Test our deployed API"""
    url = f"https://ftukxywiue.execute-api.us-east-2.amazonaws.com/dev/api/search?q={query}"
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json()
        cards = data.get('cards', [])
        print(f"Query: {query}")
        print(f"Cards returned: {len(cards)}")
        
        # Group by set + collector number to see different language/finish variants
        grouped = {}
        for card in cards:
            set_code = card.get('set_code', '?')
            collector = card.get('collector_number', '?')
            key = f"{set_code}#{collector}"
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(card)
        
        print(f"Unique card versions (set+collector): {len(grouped)}")
        
        # Look for non-English cards in our API
        non_english_found = []
        all_langs = set()
        set_codes = []
        for i, card in enumerate(cards[:3]):  # Check first 3 cards for purchase URIs
            lang = card.get('lang', 'en')
            all_langs.add(lang)
            set_codes.append(f"{card.get('set_name')} ({card.get('set_code')})")
            if lang != 'en':
                non_english_found.append(f"{card.get('set_name')} ({card.get('set_code')}) #{card.get('collector_number')} - {lang}")
            
            # Check purchase URIs for TCGPlayer links
            purchase_uris = card.get('purchase_uris', {})
            tcgplayer_uri = purchase_uris.get('tcgplayer')
            scryfall_id = card.get('id')
            
            print(f"Card {i+1}: {card.get('set_name')} ({card.get('set_code')}) #{card.get('collector_number')}")
            print(f"  Scryfall ID: {scryfall_id}")
            print(f"  TCGPlayer URI: {tcgplayer_uri}")
            print(f"  All purchase URIs: {list(purchase_uris.keys())}")
            print()
        
        print(f"First 3 set codes to verify sorting:")
        for i, set_info in enumerate(set_codes[:3], 1):
            print(f"  {i:2d}. {set_info}")
        
        print(f"Non-English cards found in our API: {len(non_english_found)}")
        for card_info in non_english_found:
            print(f"  {card_info}")
        print(f"All languages in our API: {sorted(all_langs)}")
        
        # Show first few groups
        for i, (key, versions) in enumerate(list(grouped.items())[:3]):
            print(f"\n{i+1}. {key} ({len(versions)} variants):")
            for version in versions:
                lang = version.get('lang', 'en')
                finishes = version.get('finishes', [])
                foil_status = f"foil={version.get('foil')}, nonfoil={version.get('nonfoil')}"
                print(f"    - {lang} | {finishes} | {foil_status}")
                if version.get('image_url'):
                    print(f"      Image: {version.get('image_url')[-20:]}")
    else:
        print(f"Error {response.status_code}: {response.text}")

# Test our deployed API
print("=== Testing Lightning Bolt with our updated API (increased limit) ===")
test_our_api("Lightning Bolt")

print("\n=== Testing Scryfall API directly for language data ===")
def test_scryfall_direct():
    """Test Scryfall API directly to see if we're missing language data"""
    import requests
    
    # Test with a popular card that should have multiple language printings
    url = "https://api.scryfall.com/cards/search"
    params = {
        'q': 'Lightning Bolt',
        'unique': 'prints',
        'order': 'released'
    }
    
    response = requests.get(url, params=params)
    if response.status_code == 200:
        data = response.json()
        cards = data.get('data', [])
        print(f"Direct Scryfall API - Cards returned: {len(cards)}")
        
        # Look for non-English cards
        languages = set()
        for card in cards:
            lang = card.get('lang', 'en')
            languages.add(lang)
            if lang != 'en':
                print(f"Non-English found: {card.get('set_name')} ({card.get('set')}) #{card.get('collector_number')} - {lang}")
        
        print(f"All languages found: {sorted(languages)}")
    else:
        print(f"Error: {response.status_code}")

test_scryfall_direct()

print("=== Testing opt for comparison ===")
test_our_api("opt")
