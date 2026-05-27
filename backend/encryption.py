from cryptography.fernet import Fernet
import os
import base64
import hashlib


def get_encryption_key() -> bytes:
    """Get or generate encryption key from environment."""
    key_string = os.environ.get('ENCRYPTION_KEY', 'nexus-secret-key-change-in-production-32bytes')
    # Create a 32-byte key from the string
    key_hash = hashlib.sha256(key_string.encode()).digest()
    return base64.urlsafe_b64encode(key_hash)


def encrypt_api_key(plaintext_key: str) -> str:
    """Encrypt an API key."""
    fernet = Fernet(get_encryption_key())
    encrypted = fernet.encrypt(plaintext_key.encode())
    return encrypted.decode()


def decrypt_api_key(encrypted_key: str) -> str:
    """Decrypt an API key."""
    fernet = Fernet(get_encryption_key())
    decrypted = fernet.decrypt(encrypted_key.encode())
    return decrypted.decode()