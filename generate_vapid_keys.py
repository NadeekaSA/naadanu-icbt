import json
import os
# pyrefly: ignore [missing-import]
from cryptography.hazmat.primitives.asymmetric import ec
# pyrefly: ignore [missing-import]
from cryptography.hazmat.primitives import serialization
import base64

def generate_keys():
    try:
        print("Generating cryptographically secure VAPID keys...")
        
        # Generate private key on P-256 curve (standard for Web Push)
        private_key = ec.generate_private_key(ec.SECP256R1())
        
        # Serialize private key to PEM format
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode('utf-8')
        
        # Serialize public key to PEM format
        public_pem = private_key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode('utf-8')
        
        # Get raw bytes for URL-safe base64 encoding (VAPID format)
        private_value = private_key.private_numbers().private_value
        private_bytes = private_value.to_bytes(32, byteorder='big')
        
        public_key = private_key.public_key()
        public_bytes = public_key.public_bytes(
            encoding=serialization.Encoding.X962,
            format=serialization.PublicFormat.UncompressedPoint
        )
        
        def b64url(b):
            return base64.urlsafe_b64encode(b).decode('utf-8').rstrip('=')
            
        private_b64 = b64url(private_bytes)
        public_b64 = b64url(public_bytes)
        
        print("\n=== VAPID KEYS GENERATED SUCCESSFULLY ===")
        print(f"VITE_VAPID_PUBLIC_KEY={public_b64}")
        print(f"VAPID_PRIVATE_KEY={private_b64}")
        print("=========================================\n")
        
        # Save PEM files (preferred by pywebpush)
        with open("private_key.pem", "w") as f:
            f.write(private_pem)
        with open("public_key.pem", "w") as f:
            f.write(public_pem)
            
        # Write to JSON for convenience
        keys = {
            "public_key": public_b64,
            "private_key": private_b64,
            "private_pem_path": os.path.abspath("private_key.pem"),
            "public_pem_path": os.path.abspath("public_key.pem")
        }
        with open("vapid_keys.json", "w") as f:
            json.dump(keys, f, indent=2)
            
        print("Saved keys to:")
        print(" - private_key.pem")
        print(" - public_key.pem")
        print(" - vapid_keys.json")
        
    except Exception as e:
        print(f"Error generating keys: {e}")
        print("Please install cryptography: pip install cryptography")

if __name__ == "__main__":
    generate_keys()
