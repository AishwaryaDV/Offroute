export interface HealthResponse {
  status: string;
  database: string;
}

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  profile_enabled: boolean;
  profile_bio: string | null;
  created_at: string;
}

export interface UserUpdate {
  display_name?: string;
  avatar_url?: string;
  profile_enabled?: boolean;
  profile_bio?: string;
}
