/*
  Real sub-localities with real coordinates. Offices pick one of these and get
  a few hundred metres of jitter. Scattering pins randomly inside a city
  bounding box drops them in lakes and airport runways, which looks broken the
  moment anyone zooms in.
*/

export type Locality = {
  city: string;
  country: string;
  area: string;
  lat: number;
  lng: number;
};

export const LOCALITIES: readonly Locality[] = [
  // Bengaluru
  { city: "Bengaluru", country: "India", area: "Koramangala", lat: 12.9352, lng: 77.6245 },
  { city: "Bengaluru", country: "India", area: "HSR Layout", lat: 12.9116, lng: 77.6389 },
  { city: "Bengaluru", country: "India", area: "Indiranagar", lat: 12.9784, lng: 77.6408 },
  { city: "Bengaluru", country: "India", area: "Whitefield", lat: 12.9698, lng: 77.75 },
  { city: "Bengaluru", country: "India", area: "Bellandur", lat: 12.926, lng: 77.6762 },
  { city: "Bengaluru", country: "India", area: "MG Road", lat: 12.975, lng: 77.606 },
  { city: "Bengaluru", country: "India", area: "Electronic City", lat: 12.8452, lng: 77.6602 },
  { city: "Bengaluru", country: "India", area: "Jayanagar", lat: 12.925, lng: 77.5938 },
  { city: "Bengaluru", country: "India", area: "JP Nagar", lat: 12.9063, lng: 77.5857 },

  // Delhi NCR
  { city: "Gurugram", country: "India", area: "Cyber City", lat: 28.495, lng: 77.089 },
  { city: "Gurugram", country: "India", area: "Golf Course Road", lat: 28.442, lng: 77.099 },
  { city: "Gurugram", country: "India", area: "Udyog Vihar", lat: 28.502, lng: 77.087 },
  { city: "Noida", country: "India", area: "Sector 62", lat: 28.627, lng: 77.372 },
  { city: "New Delhi", country: "India", area: "Okhla", lat: 28.5273, lng: 77.279 },
  { city: "New Delhi", country: "India", area: "Connaught Place", lat: 28.6315, lng: 77.2167 },

  // Mumbai
  { city: "Mumbai", country: "India", area: "Bandra Kurla Complex", lat: 19.0655, lng: 72.869 },
  { city: "Mumbai", country: "India", area: "Lower Parel", lat: 18.996, lng: 72.83 },
  { city: "Mumbai", country: "India", area: "Powai", lat: 19.1197, lng: 72.905 },
  { city: "Mumbai", country: "India", area: "Andheri East", lat: 19.1136, lng: 72.8697 },
  { city: "Mumbai", country: "India", area: "Goregaon East", lat: 19.164, lng: 72.859 },

  // Hyderabad
  { city: "Hyderabad", country: "India", area: "HITEC City", lat: 17.4435, lng: 78.3772 },
  { city: "Hyderabad", country: "India", area: "Gachibowli", lat: 17.44, lng: 78.3489 },
  { city: "Hyderabad", country: "India", area: "Madhapur", lat: 17.4483, lng: 78.3915 },
  { city: "Hyderabad", country: "India", area: "Kondapur", lat: 17.4615, lng: 78.364 },

  // Pune
  { city: "Pune", country: "India", area: "Hinjewadi", lat: 18.5913, lng: 73.7389 },
  { city: "Pune", country: "India", area: "Kharadi", lat: 18.5515, lng: 73.943 },
  { city: "Pune", country: "India", area: "Baner", lat: 18.559, lng: 73.777 },
  { city: "Pune", country: "India", area: "Viman Nagar", lat: 18.5679, lng: 73.9143 },

  // Chennai
  { city: "Chennai", country: "India", area: "Perungudi (OMR)", lat: 12.9698, lng: 80.2432 },
  { city: "Chennai", country: "India", area: "Guindy", lat: 13.0067, lng: 80.2206 },
  { city: "Chennai", country: "India", area: "T Nagar", lat: 13.0418, lng: 80.2341 },
];

/*
  A handful of overseas offices so the country facet has more than one value
  and the globe projection has something to show outside India.
*/
export const FOREIGN_LOCALITIES: readonly Locality[] = [
  { city: "San Francisco", country: "United States", area: "SoMa", lat: 37.7785, lng: -122.399 },
  { city: "Singapore", country: "Singapore", area: "Downtown Core", lat: 1.2806, lng: 103.8507 },
  {
    city: "Dubai",
    country: "United Arab Emirates",
    area: "Internet City",
    lat: 25.095,
    lng: 55.16,
  },
  { city: "London", country: "United Kingdom", area: "Shoreditch", lat: 51.5265, lng: -0.08 },
];

/* Offices sit within roughly 450m of their locality centre. */
export const OFFICE_JITTER_DEGREES = 0.004;

export const ALL_LOCALITIES: readonly Locality[] = [...LOCALITIES, ...FOREIGN_LOCALITIES];

export function findLocality(city: string, area: string): Locality {
  const match = ALL_LOCALITIES.find((l) => l.city === city && l.area === area);
  if (!match) throw new Error(`Unknown locality: ${city} / ${area}`);
  return match;
}

export function localitiesInCity(city: string): Locality[] {
  return LOCALITIES.filter((l) => l.city === city);
}

/*
  Bounding boxes used by the acceptance script to prove no office drifted out
  of its own city.
*/
export const CITY_BOUNDS: Record<
  string,
  { minLat: number; maxLat: number; minLng: number; maxLng: number }
> = {
  Bengaluru: { minLat: 12.8, maxLat: 13.15, minLng: 77.45, maxLng: 77.8 },
  Gurugram: { minLat: 28.38, maxLat: 28.55, minLng: 76.98, maxLng: 77.15 },
  Noida: { minLat: 28.53, maxLat: 28.68, minLng: 77.3, maxLng: 77.45 },
  "New Delhi": { minLat: 28.5, maxLat: 28.72, minLng: 77.1, maxLng: 77.35 },
  Mumbai: { minLat: 18.88, maxLat: 19.3, minLng: 72.77, maxLng: 73.0 },
  Hyderabad: { minLat: 17.3, maxLat: 17.55, minLng: 78.28, maxLng: 78.6 },
  Pune: { minLat: 18.45, maxLat: 18.65, minLng: 73.7, maxLng: 74.0 },
  Chennai: { minLat: 12.9, maxLat: 13.2, minLng: 80.15, maxLng: 80.32 },
  "San Francisco": { minLat: 37.7, maxLat: 37.84, minLng: -122.52, maxLng: -122.35 },
  Singapore: { minLat: 1.2, maxLat: 1.48, minLng: 103.6, maxLng: 104.05 },
  Dubai: { minLat: 24.9, maxLat: 25.35, minLng: 55.0, maxLng: 55.5 },
  London: { minLat: 51.35, maxLat: 51.7, minLng: -0.35, maxLng: 0.15 },
};
