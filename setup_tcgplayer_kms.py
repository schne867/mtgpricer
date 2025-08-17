#!/usr/bin/env python3
"""
Setup script for encrypting TCGPlayer API credentials using AWS KMS
This script helps you securely encrypt your TCGPlayer credentials for use in the Lambda function.
"""

import boto3
import base64
import json
from botocore.exceptions import ClientError


def create_kms_key():
    """
    Create a KMS key for encrypting TCGPlayer credentials
    
    Returns:
        Key ID of the created KMS key
    """
    kms_client = boto3.client('kms', region_name='us-east-2')
    
    try:
        # Create KMS key
        key_policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "Enable IAM User Permissions",
                    "Effect": "Allow",
                    "Principal": {
                        "AWS": f"arn:aws:iam::{boto3.client('sts').get_caller_identity()['Account']}:root"
                    },
                    "Action": "kms:*",
                    "Resource": "*"
                },
                {
                    "Sid": "Allow Lambda Function Access",
                    "Effect": "Allow",
                    "Principal": {
                        "AWS": f"arn:aws:iam::{boto3.client('sts').get_caller_identity()['Account']}:role/mtgpricerLambdaRole-dev"
                    },
                    "Action": [
                        "kms:Decrypt",
                        "kms:DescribeKey"
                    ],
                    "Resource": "*"
                }
            ]
        }
        
        response = kms_client.create_key(
            Description='MTG Pricer TCGPlayer API Credentials Encryption Key',
            KeyUsage='ENCRYPT_DECRYPT',
            KeySpec='SYMMETRIC_DEFAULT',
            Policy=json.dumps(key_policy)
        )
        
        key_id = response['KeyMetadata']['KeyId']
        
        # Create alias for easier reference
        alias_name = 'alias/mtgpricer-tcgplayer-credentials'
        try:
            kms_client.create_alias(
                AliasName=alias_name,
                TargetKeyId=key_id
            )
            print(f"✅ Created KMS key with alias: {alias_name}")
        except ClientError as e:
            if e.response['Error']['Code'] == 'AlreadyExistsException':
                print(f"⚠️  Alias {alias_name} already exists, using existing key")
                # Get the existing key ID
                aliases = kms_client.list_aliases()
                for alias in aliases['Aliases']:
                    if alias['AliasName'] == alias_name:
                        key_id = alias['TargetKeyId']
                        break
            else:
                raise
        
        return key_id
        
    except ClientError as e:
        print(f"❌ Failed to create KMS key: {e}")
        raise


def encrypt_credential(plaintext_credential: str, key_id: str) -> str:
    """
    Encrypt a credential using KMS
    
    Args:
        plaintext_credential: The credential to encrypt
        key_id: KMS key ID to use for encryption
        
    Returns:
        Base64-encoded encrypted credential
    """
    kms_client = boto3.client('kms', region_name='us-east-2')
    
    try:
        response = kms_client.encrypt(
            KeyId=key_id,
            Plaintext=plaintext_credential.encode('utf-8')
        )
        
        # Return base64-encoded ciphertext
        return base64.b64encode(response['CiphertextBlob']).decode('utf-8')
        
    except ClientError as e:
        print(f"❌ Failed to encrypt credential: {e}")
        raise


def test_decryption(encrypted_credential: str) -> bool:
    """
    Test that we can decrypt the credential
    
    Args:
        encrypted_credential: Base64-encoded encrypted credential
        
    Returns:
        True if decryption successful, False otherwise
    """
    kms_client = boto3.client('kms', region_name='us-east-2')
    
    try:
        # Decode base64
        ciphertext_blob = base64.b64decode(encrypted_credential)
        
        # Decrypt
        response = kms_client.decrypt(CiphertextBlob=ciphertext_blob)
        
        # Check if we got back a valid string
        decrypted = response['Plaintext'].decode('utf-8')
        return len(decrypted) > 0
        
    except Exception as e:
        print(f"❌ Decryption test failed: {e}")
        return False


def main():
    """
    Main setup process
    """
    print("🔐 MTG Pricer TCGPlayer KMS Setup")
    print("=" * 40)
    
    try:
        # Get current AWS account info
        sts_client = boto3.client('sts')
        account_info = sts_client.get_caller_identity()
        print(f"AWS Account: {account_info['Account']}")
        print(f"AWS Region: us-east-2")
        print()
        
        # Get TCGPlayer credentials from user
        print("📝 Enter your TCGPlayer API credentials:")
        public_key = input("Public Key (Client ID): ").strip()
        private_key = input("Private Key (Client Secret): ").strip()
        
        if not public_key or not private_key:
            print("❌ Both public and private keys are required!")
            return
        
        print()
        print("🔑 Creating/retrieving KMS key...")
        key_id = create_kms_key()
        print(f"Using KMS Key ID: {key_id}")
        
        print()
        print("🔒 Encrypting credentials...")
        
        # Encrypt both credentials
        encrypted_public = encrypt_credential(public_key, key_id)
        encrypted_private = encrypt_credential(private_key, key_id)
        
        print("✅ Credentials encrypted successfully!")
        
        # Test decryption
        print()
        print("🧪 Testing decryption...")
        if test_decryption(encrypted_public) and test_decryption(encrypted_private):
            print("✅ Decryption test passed!")
        else:
            print("❌ Decryption test failed!")
            return
        
        # Output the encrypted credentials
        print()
        print("📋 Encrypted Credentials (copy these to your Lambda environment variables):")
        print("-" * 80)
        print(f"TCGPLAYER_PUBLIC_KEY_ENCRYPTED={encrypted_public}")
        print(f"TCGPLAYER_PRIVATE_KEY_ENCRYPTED={encrypted_private}")
        print("-" * 80)
        
        print()
        print("📌 Next Steps:")
        print("1. Copy the encrypted credentials above")
        print("2. Add them as environment variables to your Lambda function")
        print("3. Deploy your Lambda function with the updated configuration")
        print("4. Test the /pricing endpoint")
        
        print()
        print("🔐 Security Notes:")
        print("- Your plaintext credentials are NOT stored anywhere")
        print("- Only the Lambda function can decrypt these values")
        print("- The KMS key is restricted to your AWS account")
        print("- Encrypted credentials are safe to store in environment variables")
        
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        return


if __name__ == "__main__":
    main()
