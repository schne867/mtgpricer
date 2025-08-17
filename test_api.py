import requests

# Test our deployed API
url = "https://ftukxywiue.execute-api.us-east-2.amazonaws.com/dev/api/search?q=Lightning+Bolt"
response = requests.get(url)

if response.status_code == 200:
    data = response.json()
    cards = data.get('cards', [])
    print(f"Found {len(cards)} Lightning Bolt versions")
    print("\nFirst 10 versions:")
    for i, card in enumerate(cards[:10], 1):
        set_code = card.get('set_code', '?')
        collector = card.get('collector_number', '?')
        rarity = card.get('rarity', 'unknown')
        promo = ' [PROMO]' if card.get('promo') else ''
        print(f"{i:2d}. {card.get('set_name', 'Unknown')} ({set_code}) #{collector} - {rarity}{promo}")
else:
    print(f"Error {response.status_code}: {response.text}")
