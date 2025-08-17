import json
from scryfall_client import ScryfallClient
from tcgplayer_client import TCGPlayerClient

def lambda_handler(event, context):
    """
    AWS Lambda handler for MTG card search functionality
    """
    print(f"Received event: {json.dumps(event)}")
    
    # Set up CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    }
    
    try:
        # Handle preflight OPTIONS request
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'CORS preflight'})
            }
        
        # Get the action from path parameters or query string
        path = event.get('path', '')
        query_params = event.get('queryStringParameters') or {}
        body = event.get('body')
        
        if body:
            try:
                body = json.loads(body)
            except:
                body = {}
        
        # Initialize clients
        scryfall = ScryfallClient()
        tcgplayer = TCGPlayerClient()
        
        # Route to appropriate function based on path
        if 'search' in path:
            return handle_card_search(scryfall, query_params, headers)
        elif 'autocomplete' in path:
            return handle_autocomplete(scryfall, query_params, headers)
        elif 'health' in path:
            return handle_health_check(scryfall, query_params, headers)
        elif 'pricing' in path:
            return handle_pricing(tcgplayer, query_params, headers)
        elif 'sets' in path:
            return handle_get_card_sets(scryfall, query_params, headers)
        elif 'card' in path:
            return handle_get_specific_card(scryfall, query_params, headers)
        else:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Invalid endpoint',
                    'available_endpoints': ['/search', '/autocomplete', '/health', '/pricing', '/sets', '/card']
                })
            }
            
    except Exception as e:
        print(f"Error in lambda_handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }

def handle_autocomplete(scryfall: ScryfallClient, params: dict, headers: dict):
    """
    Handle autocomplete requests for card names
    Lightweight endpoint for typeahead suggestions
    """
    query = params.get('q') or params.get('query')
    
    if not query:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({
                'error': 'Missing required parameter: q or query'
            })
        }
    
    # Minimum 3 characters for autocomplete
    if len(query.strip()) < 3:
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'suggestions': []
            })
        }
    
    try:
        results = scryfall.autocomplete_cards(query)
        
        # Scryfall autocomplete returns a simple array of card names
        suggestions = results.get('data', [])
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'query': query,
                'suggestions': suggestions[:10]  # Limit to 10 suggestions
            })
        }
        
    except Exception as e:
        print(f"Autocomplete error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Failed to get autocomplete suggestions',
                'message': str(e)
            })
        }

def handle_health_check(scryfall: ScryfallClient, params: dict, headers: dict):
    """
    Handle health check requests - check API and external service status
    """
    import time
    
    health_data = {
        'status': 'healthy',
        'timestamp': time.time(),
        'service': 'MTG Pricer API',
        'version': '1.0.0',
        'environment': 'production',
        'checks': {}
    }
    
    # Check if detailed health check is requested
    detailed = params.get('detailed', '').lower() in ['true', '1', 'yes']
    
    try:
        # Basic API health
        health_data['checks']['api'] = {
            'status': 'healthy',
            'message': 'API is responding'
        }
        
        if detailed:
            # Test Scryfall connectivity
            scryfall_start = time.time()
            try:
                # Simple test call to Scryfall
                test_result = scryfall.autocomplete_cards('test')
                scryfall_time = round((time.time() - scryfall_start) * 1000, 2)
                
                health_data['checks']['scryfall'] = {
                    'status': 'healthy',
                    'response_time_ms': scryfall_time,
                    'message': 'Scryfall API is accessible'
                }
                
            except Exception as e:
                health_data['checks']['scryfall'] = {
                    'status': 'unhealthy',
                    'error': str(e),
                    'message': 'Scryfall API is not accessible'
                }
                health_data['status'] = 'degraded'
            
            # Add endpoint availability
            health_data['checks']['endpoints'] = {
                'status': 'healthy',
                'available': ['/search', '/autocomplete', '/health', '/sets', '/card'],
                'message': 'All endpoints are available'
            }
        
        # Determine overall status
        if detailed:
            unhealthy_checks = [check for check in health_data['checks'].values() if check['status'] == 'unhealthy']
            if unhealthy_checks:
                health_data['status'] = 'unhealthy'
            elif any(check['status'] == 'degraded' for check in health_data['checks'].values()):
                health_data['status'] = 'degraded'
        
        # Return appropriate status code
        status_code = 200
        if health_data['status'] == 'degraded':
            status_code = 200  # Still operational
        elif health_data['status'] == 'unhealthy':
            status_code = 503  # Service unavailable
            
        return {
            'statusCode': status_code,
            'headers': headers,
            'body': json.dumps(health_data)
        }
        
    except Exception as e:
        print(f"Health check error: {str(e)}")
        return {
            'statusCode': 503,
            'headers': headers,
            'body': json.dumps({
                'status': 'unhealthy',
                'timestamp': time.time(),
                'service': 'MTG Pricer API',
                'error': 'Health check failed',
                'message': str(e)
            })
        }

def handle_pricing(tcgplayer: TCGPlayerClient, params: dict, headers: dict):
    """
    Handle pricing requests for TCGPlayer products
    Supports both product ID lookup and card name search
    """
    product_id = params.get('product_id')
    card_name = params.get('card_name') or params.get('q')
    
    if not product_id and not card_name:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({
                'error': 'Missing required parameter: product_id or card_name/q'
            })
        }
    
    try:
        if product_id:
            # Direct product ID lookup
            pricing_data = tcgplayer.get_product_pricing(product_id)
            product_details = tcgplayer.get_product_details(product_id)
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'product_id': product_id,
                    'pricing': pricing_data,
                    'product': product_details,
                    'source': 'tcgplayer'
                })
            }
        
        else:
            # Search by card name
            search_results = tcgplayer.search_products(card_name, limit=5)
            
            # Get pricing for first few results
            results_with_pricing = []
            products = search_results.get('results', [])
            
            for product in products[:3]:  # Limit to first 3 to avoid rate limits
                try:
                    product_id = str(product.get('productId', ''))
                    if product_id:
                        pricing = tcgplayer.get_product_pricing(product_id)
                        results_with_pricing.append({
                            'product': product,
                            'pricing': pricing
                        })
                except Exception as e:
                    print(f"Failed to get pricing for product {product_id}: {str(e)}")
                    # Continue with other products
                    continue
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'query': card_name,
                    'total_found': len(products),
                    'results_with_pricing': results_with_pricing,
                    'source': 'tcgplayer'
                })
            }
            
    except Exception as e:
        print(f"Pricing error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Failed to get pricing data',
                'message': str(e),
                'source': 'tcgplayer'
            })
        }

def handle_card_search(scryfall: ScryfallClient, params: dict, headers: dict):
    """Handle card search requests"""
    query = params.get('q') or params.get('query')
    
    if not query:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({
                'error': 'Missing required parameter: q or query'
            })
        }
    
    try:
        results = scryfall.search_cards(query)
        
        # Extract relevant card information for frontend
        cards = []
        if 'data' in results:
            for card in results['data'][:100]:  # Increased limit to capture all language variants
                # Get card images - handle double-faced cards
                image_url = None
                if card.get('image_uris'):
                    image_url = card.get('image_uris', {}).get('normal')
                elif card.get('card_faces') and len(card.get('card_faces', [])) > 0:
                    image_url = card.get('card_faces')[0].get('image_uris', {}).get('normal')
                
                # Build comprehensive card version info
                card_info = {
                    'id': card.get('id'),
                    'name': card.get('name'),
                    'set_name': card.get('set_name'),
                    'set_code': card.get('set'),
                    'type_line': card.get('type_line'),
                    'mana_cost': card.get('mana_cost'),
                    'cmc': card.get('cmc'),
                    'image_url': image_url,
                    'released_at': card.get('released_at'),
                    'collector_number': card.get('collector_number'),
                    'rarity': card.get('rarity'),
                    'finishes': card.get('finishes', []),
                    'lang': card.get('lang', 'en'),  # Language code
                    'promo': card.get('promo', False),
                    'digital': card.get('digital', False),
                    'foil': card.get('foil', False),
                    'nonfoil': card.get('nonfoil', False),
                    'prices': card.get('prices', {}),
                    'purchase_uris': card.get('purchase_uris', {}),
                    'artist': card.get('artist'),
                    'frame': card.get('frame'),
                    'border_color': card.get('border_color'),
                    'full_art': card.get('full_art', False),
                    'textless': card.get('textless', False),
                    'reprint': card.get('reprint', False),
                    'variation': card.get('variation', False),
                }
                
                cards.append(card_info)
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'cards': cards,
                'total_cards': results.get('total_cards', 0),
                'has_more': results.get('has_more', False)
            })
        }
        
    except Exception as e:
        print(f"Error in card search: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Failed to search cards',
                'message': str(e)
            })
        }

def handle_get_card_sets(scryfall: ScryfallClient, params: dict, headers: dict):
    """Handle requests to get all sets for a specific card"""
    card_name = params.get('name') or params.get('card_name')
    
    if not card_name:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({
                'error': 'Missing required parameter: name or card_name'
            })
        }
    
    try:
        sets = scryfall.get_card_sets(card_name)
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'card_name': card_name,
                'sets': sets
            })
        }
        
    except Exception as e:
        print(f"Error getting card sets: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Failed to get card sets',
                'message': str(e)
            })
        }

def handle_get_specific_card(scryfall: ScryfallClient, params: dict, headers: dict):
    """Handle requests to get specific card information"""
    card_name = params.get('name') or params.get('card_name')
    set_code = params.get('set') or params.get('set_code')
    
    if not card_name:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({
                'error': 'Missing required parameter: name or card_name'
            })
        }
    
    try:
        card = scryfall.get_card_by_name(card_name, set_code)
        
        # Extract relevant information
        card_info = {
            'id': card.get('id'),
            'name': card.get('name'),
            'set_name': card.get('set_name'),
            'set_code': card.get('set'),
            'type_line': card.get('type_line'),
            'mana_cost': card.get('mana_cost'),
            'cmc': card.get('cmc'),
            'image_url': card.get('image_uris', {}).get('normal'),
            'prices': card.get('prices', {}),
            'released_at': card.get('released_at'),
            'legalities': card.get('legalities', {}),
            'languages': card.get('printed_languages', []),
            'finishes': card.get('finishes', [])
        }
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'card': card_info
            })
        }
        
    except Exception as e:
        print(f"Error getting specific card: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Failed to get card information',
                'message': str(e)
            })
        }
