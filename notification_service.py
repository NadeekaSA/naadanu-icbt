import time
import json
import os
import sys
import requests
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
from pywebpush import webpush, WebPushException

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
# The service role key is required to bypass RLS and read all subscriptions/notifications
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY")
VAPID_CLAIM_EMAIL = os.getenv("VAPID_CLAIM_EMAIL", "admin@nadanu.lk")

# Locate VAPID private key PEM file
VAPID_PRIVATE_KEY_PATH = os.getenv("VAPID_PRIVATE_KEY_PATH", "private_key.pem")

# Fallback check if keys were generated but not loaded
if not os.path.exists(VAPID_PRIVATE_KEY_PATH):
    # Try looking for it in the current directory if paths are relative
    base_dir = os.path.dirname(os.path.abspath(__file__))
    VAPID_PRIVATE_KEY_PATH = os.path.join(base_dir, "private_key.pem")

def validate_config():
    if not SUPABASE_URL:
        print("ERROR: VITE_SUPABASE_URL is not defined in .env")
        return False
    if not SERVICE_ROLE_KEY:
        print("ERROR: SUPABASE_SERVICE_ROLE_KEY is not defined in .env")
        print("Please add the Service Role key from your Supabase Dashboard -> Settings -> API.")
        return False
    if not os.path.exists(VAPID_PRIVATE_KEY_PATH):
        print(f"ERROR: VAPID private key file not found at: {VAPID_PRIVATE_KEY_PATH}")
        print("Please run 'python generate_vapid_keys.py' first to generate your keys.")
        return False
    return True

def run_service():
    print("--------------------------------------------------")
    print("Naadanu Web Push Notification Service started.")
    print(f"Supabase URL: {SUPABASE_URL}")
    print(f"VAPID Private Key: {VAPID_PRIVATE_KEY_PATH}")
    print(f"Claim Email: {VAPID_CLAIM_EMAIL}")
    print("Polling for new notifications...")
    print("--------------------------------------------------")

    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }

    while True:
        try:
            # Query notifications where sent_push is false
            url = f"{SUPABASE_URL}/rest/v1/notifications?sent_push=eq.false&limit=10"
            response = requests.get(url, headers=headers)
            
            if response.status_code != 200:
                print(f"Error fetching notifications ({response.status_code}): {response.text}")
                time.sleep(5)
                continue

            notifications = response.json()
            
            if notifications:
                print(f"Found {len(notifications)} unsent notifications.")
                
                for notification in notifications:
                    notif_id = notification["id"]
                    participant_id = notification["participant_id"]
                    title = notification["title"]
                    message = notification["message"]
                    
                    print(f"Processing notification '{title}' (ID: {notif_id}) for participant: {participant_id}")
                    
                    # Fetch all push subscriptions for this participant
                    sub_url = f"{SUPABASE_URL}/rest/v1/push_subscriptions?participant_id=eq.{participant_id}"
                    sub_response = requests.get(sub_url, headers=headers)
                    
                    if sub_response.status_code != 200:
                        print(f"  Error fetching subscriptions ({sub_response.status_code}): {sub_response.text}")
                        continue
                        
                    subscriptions = sub_response.json()
                    
                    if not subscriptions:
                        print(f"  No push subscriptions found for participant {participant_id}. Skipping push.")
                    else:
                        print(f"  Sending to {len(subscriptions)} subscription(s)...")
                        
                        for sub in subscriptions:
                            sub_id = sub["id"]
                            endpoint = sub["endpoint"]
                            keys = sub["keys"]
                            
                            subscription_info = {
                                "endpoint": endpoint,
                                "keys": {
                                    "auth": keys.get("auth"),
                                    "p256dh": keys.get("p256dh")
                                }
                            }
                            
                            payload = json.dumps({
                                "title": title,
                                "body": message,
                                "url": "/"
                            })
                            
                            try:
                                webpush(
                                    subscription_info=subscription_info,
                                    data=payload,
                                    vapid_private_key=VAPID_PRIVATE_KEY_PATH,
                                    vapid_claims={"sub": f"mailto:{VAPID_CLAIM_EMAIL}"}
                                )
                                print(f"    [Success] Sent to subscription ID: {sub_id}")
                            except WebPushException as ex:
                                status_code = ex.response.status_code if ex.response is not None else 0
                                print(f"    [Error] Failed to send to subscription ID {sub_id} (HTTP {status_code}): {ex}")
                                
                                # If the endpoint is expired or gone (404/410), delete it
                                if status_code in [404, 410]:
                                    print(f"    [DB Cleanup] Subscription {sub_id} is invalid/expired. Deleting from DB...")
                                    del_url = f"{SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.{sub_id}"
                                    requests.delete(del_url, headers=headers)
                                    
                    # Mark the notification as sent_push = true regardless of whether push sent successfully 
                    # (to prevent infinite loops if subscription fails/does not exist)
                    patch_url = f"{SUPABASE_URL}/rest/v1/notifications?id=eq.{notif_id}"
                    patch_response = requests.patch(patch_url, headers=headers, json={"sent_push": True})
                    if patch_response.status_code not in [200, 204]:
                        print(f"  Warning: Failed to mark notification {notif_id} as sent ({patch_response.status_code})")
                    else:
                        print(f"  Notification {notif_id} marked as sent_push=true.")
                        
        except Exception as e:
            print(f"Unexpected error in service loop: {e}")
            
        time.sleep(3)

if __name__ == "__main__":
    if not validate_config():
        sys.exit(1)
    run_service()
