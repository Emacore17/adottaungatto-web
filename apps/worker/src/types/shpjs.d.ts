declare module "shpjs" {
  export type ShpFeature = {
    type: "Feature"
    properties: Record<string, string | number | null>
    geometry: {
      type: string
      coordinates: unknown
    }
  }

  export type ShpFeatureCollection = {
    type: "FeatureCollection"
    fileName?: string
    features: ShpFeature[]
  }

  export default function shp(
    source: ArrayBuffer
  ): Promise<ShpFeatureCollection | ShpFeatureCollection[]>
}
