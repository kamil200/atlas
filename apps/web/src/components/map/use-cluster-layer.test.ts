import type { OfficeMapPoint } from "@atlas/schema";
import { describe, expect, it } from "vitest";
import { summariseOffices, toOfficeCollection, toOfficeFeature } from "./use-cluster-layer";

/*
  The transform is a pure function precisely so it can be tested without a
  WebGL context. jsdom cannot run MapLibre, so this is where the map's data
  layer gets its coverage.
*/

function office(overrides: Partial<OfficeMapPoint> = {}): OfficeMapPoint {
  return {
    officeId: "off_0001",
    companyId: "co_0001",
    companySlug: "razorpay",
    companyName: "Razorpay",
    logoUrl: null,
    lat: 12.9352,
    lng: 77.6245,
    isHq: true,
    hiringStatus: "ACTIVELY_HIRING",
    openJobCount: 16,
    ...overrides,
  };
}

describe("toOfficeFeature", () => {
  it("writes GeoJSON coordinates as [lng, lat]", () => {
    const feature = toOfficeFeature(office());
    // Getting this backwards puts every Indian office in the Indian Ocean.
    expect(feature.geometry.coordinates).toEqual([77.6245, 12.9352]);
  });

  it("carries the id MapLibre promotes for hover state", () => {
    expect(toOfficeFeature(office({ officeId: "off_0042" })).id).toBe("off_0042");
  });

  it("flattens hiring status into a boolean the paint expression can read", () => {
    expect(toOfficeFeature(office({ hiringStatus: "ACTIVELY_HIRING" })).properties.hiring).toBe(
      true,
    );
    expect(toOfficeFeature(office({ hiringStatus: "NOT_HIRING" })).properties.hiring).toBe(false);
  });

  it("keeps every property a primitive", () => {
    const { properties } = toOfficeFeature(office());
    for (const value of Object.values(properties)) {
      // Nested objects arrive at the worker as strings and break expressions.
      expect(["string", "number", "boolean", "object"]).toContain(typeof value);
      if (typeof value === "object") expect(value).toBeNull();
    }
  });
});

describe("toOfficeCollection", () => {
  it("builds a valid FeatureCollection", () => {
    const collection = toOfficeCollection([office(), office({ officeId: "off_0002" })]);

    expect(collection.type).toBe("FeatureCollection");
    expect(collection.features).toHaveLength(2);
    expect(collection.features.every((feature) => feature.type === "Feature")).toBe(true);
  });

  it("returns an empty collection rather than null when there is nothing to show", () => {
    expect(toOfficeCollection([])).toEqual({ type: "FeatureCollection", features: [] });
  });
});

describe("summariseOffices", () => {
  it("counts each company once even when it has several offices", () => {
    const summary = summariseOffices([
      office({ officeId: "off_1", companyId: "co_1", openJobCount: 10 }),
      office({ officeId: "off_2", companyId: "co_1", openJobCount: 5 }),
      office({ officeId: "off_3", companyId: "co_2", openJobCount: 2 }),
    ]);

    expect(summary.companies).toBe(2);
    expect(summary.openJobs).toBe(17);
  });

  it("reads zero for an empty map", () => {
    expect(summariseOffices([])).toEqual({ companies: 0, openJobs: 0 });
  });
});
