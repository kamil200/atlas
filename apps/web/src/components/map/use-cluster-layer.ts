import type { OfficeMapPoint } from "@chowk/schema";
import type { Feature, FeatureCollection, Point } from "geojson";

/*
  Turns the map response into the GeoJSON MapLibre clusters.

  Properties are flat primitives on purpose: MapLibre serialises feature
  properties across a worker boundary, so a nested object arrives as a string
  and every expression that reads it silently stops matching.

  Pure function, no map instance — which is the only reason it can be tested
  without a WebGL context.
*/

export type OfficeFeatureProperties = {
  officeId: string;
  companyId: string;
  companySlug: string;
  companyName: string;
  logoUrl: string | null;
  isHq: boolean;
  hiring: boolean;
  openJobCount: number;
  lat: number;
  lng: number;
};

export function toOfficeFeature(office: OfficeMapPoint): Feature<Point, OfficeFeatureProperties> {
  return {
    type: "Feature",
    id: office.officeId,
    geometry: { type: "Point", coordinates: [office.lng, office.lat] },
    properties: {
      officeId: office.officeId,
      companyId: office.companyId,
      companySlug: office.companySlug,
      companyName: office.companyName,
      logoUrl: office.logoUrl,
      isHq: office.isHq,
      hiring: office.hiringStatus === "ACTIVELY_HIRING",
      openJobCount: office.openJobCount,
      lat: office.lat,
      lng: office.lng,
    },
  };
}

export function toOfficeCollection(
  offices: readonly OfficeMapPoint[],
): FeatureCollection<Point, OfficeFeatureProperties> {
  return {
    type: "FeatureCollection",
    features: offices.map(toOfficeFeature),
  };
}

/* What the stats pill shows: distinct companies and the sum of open roles. */
export function summariseOffices(offices: readonly OfficeMapPoint[]) {
  return {
    companies: new Set(offices.map((office) => office.companyId)).size,
    openJobs: offices.reduce((total, office) => total + office.openJobCount, 0),
  };
}
