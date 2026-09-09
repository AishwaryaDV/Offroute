export async function countUniqueCountries(
  points: { latitude: number; longitude: number }[]
): Promise<number> {
  const { default: whichCountry } = await import("which-country");
  const countries = new Set<string>();
  for (const p of points) {
    const code = whichCountry([p.longitude, p.latitude]);
    if (code) countries.add(code);
  }
  return countries.size;
}
