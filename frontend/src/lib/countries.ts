import whichCountry from "which-country";

export function countUniqueCountries(
  points: { latitude: number; longitude: number }[]
): number {
  const countries = new Set<string>();
  for (const p of points) {
    const code = whichCountry([p.longitude, p.latitude]);
    if (code) countries.add(code);
  }
  return countries.size;
}
