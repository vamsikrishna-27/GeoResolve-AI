import os
import sys
import traceback
import uuid
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

def run_diagnostics():
    print("=== Supabase Diagnostic Test Tool ===")
    
    # 1. Load .env
    base_dir = Path(__file__).resolve().parent
    env_path = base_dir / ".env"
    print(f"Loading .env from: {env_path}")
    
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
        print("Successfully loaded .env file.")
    else:
        print("WARNING: .env file not found in the same directory!")

    # 2. Check and Print Configuration
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase_jwt_secret = os.getenv("SUPABASE_JWT_SECRET")

    print("\n--- Environment Variables Check ---")
    print(f"SUPABASE_URL: {supabase_url}")
    print(f"SUPABASE_KEY (Anon): {supabase_key[:15] + '...' if supabase_key else 'MISSING'}")
    print(f"SUPABASE_SERVICE_ROLE_KEY: {supabase_service_role_key[:15] + '...' if supabase_service_role_key else 'MISSING'}")
    print(f"SUPABASE_JWT_SECRET: {supabase_jwt_secret[:4] + '...' if supabase_jwt_secret else 'MISSING'}")

    if not supabase_url or not supabase_key:
        print("\nERROR: SUPABASE_URL and SUPABASE_KEY are required to run diagnostics.")
        sys.exit(1)

    # 3. Create Clients
    print("\n--- Client Initialization Check ---")
    try:
        client = create_client(supabase_url, supabase_key)
        print("Standard Client (Anon) created successfully.")
    except Exception as e:
        print("ERROR: Failed to create Standard Client.")
        traceback.print_exc()
        sys.exit(1)

    try:
        admin_client = create_client(supabase_url, supabase_service_role_key) if supabase_service_role_key else None
        if admin_client:
            print("Admin Client (Service Role) created successfully.")
        else:
            print("Admin Client (Service Role) SKIPPED (missing key).")
    except Exception as e:
        print("ERROR: Failed to create Admin Client.")
        traceback.print_exc()

    # 4. Perform User Sign-Up
    test_email = f"diagnostic_user_{uuid.uuid4().hex[:8]}@example.com"
    test_password = "DiagPassword@123"
    print(f"\n--- Testing Sign-Up Method ---")
    print(f"Attempting to register test account: {test_email}")

    try:
        # Perform sign-up following latest supabase-py 2.x syntax (passing dict credentials)
        response = client.auth.sign_up({
            "email": test_email,
            "password": test_password
        })
        
        print("\nSUCCESS: Registration completed successfully!")
        print("--- Complete AuthResponse ---")
        print(response)
        
        # Try database write diagnostics if admin client is available
        if admin_client:
            print("\n--- Testing Database Insertion Check ---")
            profile_data = {
                "id": response.user.id,
                "name": "Diagnostic Test User",
                "company": "Diagnostics Inc.",
                "role": "User"
            }
            print(f"Writing profile data to 'users' table: {profile_data}")
            try:
                db_res = admin_client.table("users").insert(profile_data).execute()
                print("Database write succeeded!")
                print(db_res)
            except Exception as db_err:
                print(f"WARNING: Database insertion failed: {db_err}")
                print("This is expected if tables are not created or database migrations have not been applied.")

    except Exception as e:
        print("\nFAILURE: Sign-Up failed!")
        print("\n--- Traceback ---")
        traceback.print_exc()
        
        # Print extra attributes if it's a Supabase API Error
        print("\n--- Error Analysis ---")
        if hasattr(e, "status"):
            print(f"HTTP Status: {getattr(e, 'status')}")
        if hasattr(e, "code"):
            print(f"Error Code: {getattr(e, 'code')}")
        if hasattr(e, "message"):
            print(f"Error Message: {getattr(e, 'message')}")
        if hasattr(e, "to_dict"):
            print(f"Response Body: {e.to_dict()}")
        else:
            print(f"Raw Exception: {str(e)}")

if __name__ == "__main__":
    run_diagnostics()
