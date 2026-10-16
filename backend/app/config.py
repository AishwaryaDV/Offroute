from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "development"
    database_url: str = ""
    database_url_sync: str = ""
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    cors_origins: str = "http://localhost:3000"
    vapid_private_key: str = ""
    vapid_public_key: str = ""
    vapid_contact_email: str = ""
    s3_endpoint_url: str = ""
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    s3_bucket: str = "media"
    s3_region: str = "auto"
    storage_public_url: str = ""

    # --- Chat assistant (per-circuit "Ask AI") ---
    # Ships dark behind this flag until the feature is complete.
    assistant_enabled: bool = False
    # Claude via the Claude Code CLI subscription login (no ANTHROPIC_API_KEY on
    # the host). Haiku is plenty for a tool-calling bot, and Gemini is already
    # the fallback if Claude has a bad day.
    assistant_model: str = "claude-haiku-4-5"
    # Which driver leads; the other is the fallback. Set to "gemini" for local
    # dev before the Claude Code CLI is provisioned on the host.
    assistant_primary: str = "claude"
    # Gemini free-tier fallback for when the Claude login lapses / hits limits.
    gemini_api_key: str = ""
    assistant_gemini_model: str = "gemini-3.6-flash"
    # Lighter models to roll over to on 429 / 5xx (same pattern as the portfolio).
    assistant_gemini_fallbacks: str = "gemini-3.5-flash-lite,gemini-3.1-flash-lite"
    # Geocoding for find_place: Nominatim (free, no key) is the default; Stadia
    # is used first when a key is present.
    stadia_api_key: str = ""
    # Per-user guardrails — Claude rides on the subscription login (shared
    # quota across both users), Gemini is the free tier, so both need caps.
    assistant_daily_message_cap: int = 100
    assistant_rate_limit_per_minute: int = 10

    @property
    def assistant_gemini_models(self) -> list[str]:
        extra = [m.strip() for m in self.assistant_gemini_fallbacks.split(",") if m.strip()]
        return [self.assistant_gemini_model, *extra]

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
