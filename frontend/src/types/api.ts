export interface HealthResponse {
  status: string;
  database: string;
}

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  nationality: string | null;
  avatar_url: string | null;
  profile_enabled: boolean;
  profile_bio: string | null;
  created_at: string;
}

export interface UserUpdate {
  display_name?: string;
  nationality?: string;
  avatar_url?: string;
  profile_enabled?: boolean;
  profile_bio?: string;
}

// --- Circuits ---

export interface Circuit {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  cover_media_id: string | null;
  visibility: "private" | "shared" | "public";
  tags: string[] | null;
  share_token: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  point_count: number;
  clone_count: number;
  cloned_from_token: string | null;
  star_count: number;
  is_starred: boolean;
}

export interface SharedPoint {
  id: string;
  order_index: number;
  title: string;
  notes: string | null;
  latitude: number;
  longitude: number;
  visited_at: string | null;
  category: PointCategory | null;
  rating: number | null;
}

export interface SharedCircuit {
  id: string;
  title: string;
  description: string | null;
  owner_name: string | null;
  point_count: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  points: SharedPoint[];
}

export interface CircuitCreate {
  title: string;
  description?: string;
  visibility?: "private" | "shared" | "public";
  tags?: string[];
  start_date?: string;
  end_date?: string;
}

export interface CircuitUpdate {
  title?: string;
  description?: string;
  visibility?: "private" | "shared" | "public";
  tags?: string[];
  start_date?: string;
  end_date?: string;
}

// --- Points ---

export type PointCategory =
  | "food"
  | "drink"
  | "stay"
  | "viewpoint"
  | "activity"
  | "nature"
  | "culture"
  | "hidden_gem"
  | "other";

export interface Point {
  id: string;
  circuit_id: string;
  order_index: number;
  title: string;
  notes: string | null;
  latitude: number;
  longitude: number;
  visited_at: string | null;
  category: PointCategory | null;
  rating: number | null;
  created_at: string;
}

export interface PointCreate {
  title: string;
  notes?: string;
  latitude: number;
  longitude: number;
  visited_at?: string;
  category?: PointCategory;
  rating?: number;
}

export interface WorldPoint extends Point {
  circuit_title: string;
}

export interface PointUpdate {
  title?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  visited_at?: string;
  category?: PointCategory;
  rating?: number;
}

export interface ReorderItem {
  id: string;
  order_index: number;
}

// --- Collaborators ---

export interface Collaborator {
  id: string;
  circuit_id: string;
  user_id: string;
  role: "viewer" | "editor";
  status: "pending" | "accepted" | "declined";
  created_at: string;
  user_email: string | null;
  user_display_name: string | null;
}

export interface Invite {
  id: string;
  circuit_id: string;
  circuit_title: string;
  role: "viewer" | "editor";
  status: string;
  invited_by_name: string | null;
  created_at: string;
}

// --- Media ---

export interface Media {
  id: string;
  point_id: string | null;
  circuit_id: string | null;
  type: "photo" | "video" | "file";
  storage_path: string;
  caption: string | null;
  created_at: string;
  upload_url: string | null;
}
