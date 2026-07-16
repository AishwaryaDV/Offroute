import type { PublicProfile, PublicCircuit } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function getPublicProfile(username: string): Promise<PublicProfile> {
  const res = await fetch(`${API_URL}/u/${username}`);
  if (!res.ok) throw new Error("Profile not found");
  return res.json();
}

export async function getPublicCircuits(username: string): Promise<PublicCircuit[]> {
  const res = await fetch(`${API_URL}/u/${username}/circuits`);
  if (!res.ok) throw new Error("Could not load circuits");
  return res.json();
}
