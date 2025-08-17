import os
import json
import time
import requests
from typing import Dict, Optional
import boto3
from botocore.exceptions import ClientError


class TCGPlayerClient:
    """
    Secure TCGPlayer API client using AWS Secrets Manager for credential protection
    """
    
    def __init__(self):
        self.base_url = "https://api.tcgplayer.com"
        self.version = "v1.39.0"  # Updated to current version (v1.36.0 was deprecated in Aug 2023)
        self.token_endpoint = f"{self.base_url}/token"
        self.api_endpoint = f"{self.base_url}/{self.version}"
        
        # Token management
        self.access_token = None
        self.token_expires_at = 0
        
        # Secrets Manager client
        self.secrets_client = boto3.client('secretsmanager', region_name=os.environ.get('AWS_REGION', 'us-east-2'))
        self.secret_name = "TCGPLAYER_KEYS"
        
        # Rate limiting
        self.last_request_time = 0
        self.min_request_interval = 0.1  # 100ms between requests
    
    def _get_credentials(self) -> Dict[str, str]:
        """
        Get TCGPlayer API credentials from AWS Secrets Manager
        
        Returns:
            Dictionary with public_key and private_key
        """
        try:
            # Get secret from Secrets Manager
            response = self.secrets_client.get_secret_value(SecretId=self.secret_name)
            
            # Parse the secret (it should be JSON)
            secret_data = json.loads(response['SecretString'])
            
            # Extract credentials
            public_key = secret_data.get('public_key') or secret_data.get('client_id')
            private_key = secret_data.get('private_key') or secret_data.get('client_secret')
            
            if not public_key or not private_key:
                raise Exception("Secret does not contain required 'public_key' and 'private_key' fields")
            
            print("Successfully retrieved credentials from Secrets Manager")
            return {
                'public_key': public_key,
                'private_key': private_key
            }
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'ResourceNotFoundException':
                raise Exception(f"Secret '{self.secret_name}' not found in Secrets Manager")
            elif error_code == 'InvalidRequestException':
                raise Exception(f"Invalid request to Secrets Manager: {str(e)}")
            elif error_code == 'InvalidParameterException':
                raise Exception(f"Invalid parameter for Secrets Manager: {str(e)}")
            elif error_code == 'DecryptionFailureException':
                raise Exception("Secrets Manager decryption failed. Check KMS permissions.")
            elif error_code == 'InternalServiceErrorException':
                raise Exception("Secrets Manager internal error. Please try again.")
            else:
                raise Exception(f"Secrets Manager error {error_code}: {str(e)}")
                
        except json.JSONDecodeError:
            raise Exception("Secret value is not valid JSON. Please check the secret format.")
            
        except Exception as e:
            raise Exception(f"Failed to get TCGPlayer credentials from Secrets Manager: {str(e)}")
    
    def _is_token_valid(self) -> bool:
        """
        Check if current access token is valid and not expired
        
        Returns:
            True if token is valid, False otherwise
        """
        if not self.access_token:
            return False
        
        # Add 5 minute buffer before expiration
        buffer_time = 300  # 5 minutes
        return time.time() < (self.token_expires_at - buffer_time)
    
    def _request_bearer_token(self) -> Dict:
        """
        Request a new bearer token from TCGPlayer API
        
        Returns:
            Token response data
        """
        credentials = self._get_credentials()
        
        # Prepare authentication request
        auth_data = {
            'grant_type': 'client_credentials',
            'client_id': credentials['public_key'],
            'client_secret': credentials['private_key']
        }
        
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        
        try:
            response = requests.post(
                self.token_endpoint,
                data=auth_data,
                headers=headers,
                timeout=30
            )
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to get TCGPlayer bearer token: {str(e)}")
    
    def _ensure_valid_token(self):
        """
        Ensure we have a valid access token, requesting a new one if needed
        """
        if not self._is_token_valid():
            print("Requesting new TCGPlayer bearer token...")
            
            token_response = self._request_bearer_token()
            
            # Store token and expiration
            self.access_token = token_response['access_token']
            
            # Calculate expiration time (expires_in is in seconds)
            expires_in = token_response.get('expires_in', 1209600)  # Default 14 days
            self.token_expires_at = time.time() + expires_in
            
            print(f"New token acquired, expires in {expires_in} seconds")
    
    def _rate_limit(self):
        """
        Simple rate limiting to respect TCGPlayer API limits
        """
        current_time = time.time()
        time_since_last_request = current_time - self.last_request_time
        
        if time_since_last_request < self.min_request_interval:
            sleep_time = self.min_request_interval - time_since_last_request
            time.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    def _make_api_request(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """
        Make an authenticated API request to TCGPlayer
        
        Args:
            endpoint: API endpoint (without base URL)
            params: Query parameters
            
        Returns:
            API response data
        """
        self._ensure_valid_token()
        self._rate_limit()
        
        url = f"{self.api_endpoint}/{endpoint.lstrip('/')}"
        
        headers = {
            'Authorization': f'bearer {self.access_token}',
            'Accept': 'application/json'
        }
        
        try:
            response = requests.get(
                url,
                headers=headers,
                params=params or {},
                timeout=30
            )
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            if hasattr(e, 'response') and e.response is not None:
                if e.response.status_code == 401:
                    # Token might be invalid, clear it
                    self.access_token = None
                    self.token_expires_at = 0
                    raise Exception("TCGPlayer API authentication failed. Token may be invalid.")
                elif e.response.status_code == 429:
                    raise Exception("TCGPlayer API rate limit exceeded. Please try again later.")
                else:
                    raise Exception(f"TCGPlayer API error {e.response.status_code}: {e.response.text}")
            else:
                raise Exception(f"TCGPlayer API request failed: {str(e)}")
    
    def get_product_pricing(self, product_id: str) -> Dict:
        """
        Get pricing information for a specific TCGPlayer product
        
        Args:
            product_id: TCGPlayer product ID
            
        Returns:
            Pricing data for the product
        """
        endpoint = f"pricing/product/{product_id}"
        return self._make_api_request(endpoint)
    
    def search_products(self, query: str, category_id: int = 1, limit: int = 10) -> Dict:
        """
        Search for products on TCGPlayer
        
        Args:
            query: Search query string
            category_id: Category ID (1 = Magic: The Gathering)
            limit: Maximum number of results
            
        Returns:
            Search results
        """
        endpoint = "catalog/products"
        params = {
            'q': query,
            'categoryId': category_id,
            'limit': limit
        }
        return self._make_api_request(endpoint, params)
    
    def get_product_details(self, product_id: str) -> Dict:
        """
        Get detailed information about a specific product
        
        Args:
            product_id: TCGPlayer product ID
            
        Returns:
            Product details
        """
        endpoint = f"catalog/products/{product_id}"
        return self._make_api_request(endpoint)
