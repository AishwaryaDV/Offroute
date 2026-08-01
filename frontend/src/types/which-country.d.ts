declare module "which-country" {
  function whichCountry(lngLat: [number, number]): string | null;
  export = whichCountry;
}
