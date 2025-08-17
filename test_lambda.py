import json
import sys
import os

# Add the Lambda function source to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'amplify', 'backend', 'function', 'mtgCardSearch', 'src'))

from index import lambda_handler

def test_card_search():
    """Test the card search functionality"""
    print("🧪 Testing Lambda Card Search Function...")
    
    # Test card search
    event = {
        'httpMethod': 'GET',
        'path': '/search',
        'queryStringParameters': {
            'q': 'Lightning Bolt'
        }
    }
    
    context = {}  # Mock context
    
    try:
        response = lambda_handler(event, context)
        print(f"✅ Card search status: {response['statusCode']}")
        
        if response['statusCode'] == 200:
            body = json.loads(response['body'])
            print(f"   Found {len(body['cards'])} cards")
            if body['cards']:
                first_card = body['cards'][0]
                print(f"   First card: {first_card['name']} ({first_card['set_name']})")
        else:
            print(f"❌ Error: {response['body']}")
            
    except Exception as e:
        print(f"❌ Test failed: {e}")

def test_card_sets():
    """Test getting card sets"""
    print("\n🧪 Testing Get Card Sets Function...")
    
    event = {
        'httpMethod': 'GET',
        'path': '/sets',
        'queryStringParameters': {
            'name': 'Lightning Bolt'
        }
    }
    
    context = {}
    
    try:
        response = lambda_handler(event, context)
        print(f"✅ Card sets status: {response['statusCode']}")
        
        if response['statusCode'] == 200:
            body = json.loads(response['body'])
            print(f"   Found {len(body['sets'])} sets for {body['card_name']}")
            for set_info in body['sets'][:3]:  # Show first 3
                print(f"   - {set_info['name']} ({set_info['code']})")
        else:
            print(f"❌ Error: {response['body']}")
            
    except Exception as e:
        print(f"❌ Test failed: {e}")

def test_specific_card():
    """Test getting specific card information"""
    print("\n🧪 Testing Get Specific Card Function...")
    
    event = {
        'httpMethod': 'GET',
        'path': '/card',
        'queryStringParameters': {
            'name': 'Lightning Bolt',
            'set': 'lea'  # Limited Edition Alpha
        }
    }
    
    context = {}
    
    try:
        response = lambda_handler(event, context)
        print(f"✅ Specific card status: {response['statusCode']}")
        
        if response['statusCode'] == 200:
            body = json.loads(response['body'])
            card = body['card']
            print(f"   Card: {card['name']}")
            print(f"   Set: {card['set_name']} ({card['set_code']})")
            print(f"   Mana Cost: {card['mana_cost']}")
            print(f"   Image URL: {card['image_url']}")
        else:
            print(f"❌ Error: {response['body']}")
            
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    print("🚀 MTG Pricer Lambda Function Tests\n")
    
    test_card_search()
    test_card_sets()
    test_specific_card()
    
    print("\n✅ Lambda function tests completed!")
