#!/usr/bin/env python3
"""
Test script to verify KMS setup and TCGPlayer integration
This script tests KMS encryption/decryption without requiring actual TCGPlayer credentials
"""

import boto3
import base64
from botocore.exceptions import ClientError


def test_kms_operations():
    """
    Test KMS key creation and encryption/decryption operations
    """
    print("🧪 Testing KMS Operations")
    print("-" * 30)
    
    kms_client = boto3.client('kms', region_name='us-east-2')
    
    try:
        # Check if our alias exists
        alias_name = 'alias/mtgpricer-tcgplayer-credentials'
        aliases = kms_client.list_aliases()
        
        target_key_id = None
        for alias in aliases['Aliases']:
            if alias['AliasName'] == alias_name:
                target_key_id = alias['TargetKeyId']
                print(f"✅ Found KMS alias: {alias_name}")
                print(f"   Key ID: {target_key_id}")
                break
        
        if not target_key_id:
            print(f"❌ KMS alias {alias_name} not found")
            print("   Run setup_tcgplayer_kms.py first to create the key")
            return False
        
        # Test encryption/decryption with dummy data
        test_data = "test_credential_12345"
        print(f"🔒 Testing encryption of: {test_data}")
        
        # Encrypt
        encrypt_response = kms_client.encrypt(
            KeyId=target_key_id,
            Plaintext=test_data.encode('utf-8')
        )
        
        encrypted_blob = encrypt_response['CiphertextBlob']
        encrypted_b64 = base64.b64encode(encrypted_blob).decode('utf-8')
        print(f"✅ Encryption successful")
        print(f"   Encrypted (base64): {encrypted_b64[:50]}...")
        
        # Decrypt
        decrypt_response = kms_client.decrypt(CiphertextBlob=encrypted_blob)
        decrypted_data = decrypt_response['Plaintext'].decode('utf-8')
        
        print(f"🔓 Testing decryption...")
        if decrypted_data == test_data:
            print(f"✅ Decryption successful: {decrypted_data}")
            return True
        else:
            print(f"❌ Decryption failed: got '{decrypted_data}', expected '{test_data}'")
            return False
            
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'AccessDenied':
            print(f"❌ Access denied to KMS key")
            print("   Check IAM permissions for your AWS credentials")
        else:
            print(f"❌ KMS error: {error_code} - {e.response['Error']['Message']}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def test_lambda_permissions():
    """
    Test that Lambda function has necessary permissions
    """
    print("\n🔍 Checking Lambda IAM Role")
    print("-" * 30)
    
    iam_client = boto3.client('iam', region_name='us-east-2')
    
    try:
        # Check if Lambda role exists
        role_name = 'mtgpricerLambdaRole-dev'
        
        try:
            role = iam_client.get_role(RoleName=role_name)
            print(f"✅ Found Lambda role: {role_name}")
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchEntity':
                print(f"❌ Lambda role {role_name} not found")
                print("   Deploy your Lambda function first")
                return False
            else:
                raise
        
        # Check attached policies
        policies = iam_client.list_attached_role_policies(RoleName=role_name)
        print(f"   Attached policies: {len(policies['AttachedPolicies'])}")
        
        # Check inline policies for KMS permissions
        inline_policies = iam_client.list_role_policies(RoleName=role_name)
        if inline_policies['PolicyNames']:
            print(f"   Inline policies: {inline_policies['PolicyNames']}")
            
            # Check if KMS permissions exist in inline policies
            for policy_name in inline_policies['PolicyNames']:
                policy = iam_client.get_role_policy(
                    RoleName=role_name,
                    PolicyName=policy_name
                )
                
                policy_doc = policy['PolicyDocument']
                has_kms = False
                
                for statement in policy_doc.get('Statement', []):
                    actions = statement.get('Action', [])
                    if isinstance(actions, str):
                        actions = [actions]
                    
                    if any('kms:' in action for action in actions):
                        has_kms = True
                        break
                
                if has_kms:
                    print(f"   ✅ KMS permissions found in policy: {policy_name}")
                    return True
            
            print(f"   ❌ No KMS permissions found in inline policies")
            return False
        else:
            print(f"   ❌ No inline policies found")
            return False
            
    except ClientError as e:
        print(f"❌ IAM error: {e.response['Error']['Code']} - {e.response['Error']['Message']}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def main():
    """
    Run all tests
    """
    print("🔐 MTG Pricer KMS Setup Verification")
    print("=" * 40)
    
    try:
        # Get current AWS account info
        sts_client = boto3.client('sts')
        account_info = sts_client.get_caller_identity()
        print(f"AWS Account: {account_info['Account']}")
        print(f"AWS Region: us-east-2")
        print()
        
        # Run tests
        kms_test_passed = test_kms_operations()
        lambda_test_passed = test_lambda_permissions()
        
        print("\n📊 Test Results")
        print("-" * 20)
        print(f"KMS Operations: {'✅ PASS' if kms_test_passed else '❌ FAIL'}")
        print(f"Lambda Permissions: {'✅ PASS' if lambda_test_passed else '❌ FAIL'}")
        
        if kms_test_passed and lambda_test_passed:
            print("\n🎉 All tests passed! Your KMS setup is ready.")
            print("\n📋 Next steps:")
            print("1. Run setup_tcgplayer_kms.py to encrypt your actual credentials")
            print("2. Add the encrypted credentials to your Lambda environment")
            print("3. Deploy and test the /pricing endpoint")
        else:
            print("\n⚠️  Some tests failed. Please fix the issues above before proceeding.")
            
    except Exception as e:
        print(f"❌ Test suite failed: {e}")


if __name__ == "__main__":
    main()
