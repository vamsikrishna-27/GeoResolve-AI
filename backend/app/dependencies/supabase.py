from supabase import create_client, Client
from app.core.config import settings

def get_supabase_client() -> Client:
    """
    Initializes a standard Supabase client using Anon keys.
    Suitable for most user-authenticated actions.
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def get_supabase_admin_client() -> Client:
    """
    Initializes a Supabase client using the Service Role key.
    Provides admin-level bypass access to PostgreSQL tables, useful for background 
    pipeline logging and API key verification.
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
