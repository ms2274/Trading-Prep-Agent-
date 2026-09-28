"use client";

import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";
import { Itinerary } from "@/lib/types";

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#161210" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a0806" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a7c6d" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a1f18" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a2b20" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d1418" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#5c4d3e" }] },
];

function MapPlaceholder() {
  return (
    <div className="warm-card rounded-2xl p-5 text-center text-sm text-[color:var(--color-ink-muted)]">
      <div className="text-xs uppercase tracking-wider text-[color:var(--color-ink-dim)] mb-1">
        Map preview
      </div>
      Add{" "}
      <code className="mx-1 px-1.5 py-0.5 rounded bg-black/30 text-[color:var(--color-accent)] text-[11px]">
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      </code>{" "}
      to your <code className="mx-1 text-[color:var(--color-ink)]">.env.local</code> to see the route on a live map.
    </div>
  );
}

function LiveMap({ itinerary, apiKey }: { itinerary: Itinerary; apiKey: string }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    id: "date-planner-google-map-script",
  });

  if (!isLoaded) {
    return (
      <div className="rounded-2xl warm-card h-56 flex items-center justify-center text-sm text-[color:var(--color-ink-dim)]">
        Loading map…
      </div>
    );
  }

  const path = itinerary.stops.map((s) => ({ lat: s.venue.lat, lng: s.venue.lng }));
  const bounds = path.reduce(
    (b, p) => ({
      minLat: Math.min(b.minLat, p.lat),
      maxLat: Math.max(b.maxLat, p.lat),
      minLng: Math.min(b.minLng, p.lng),
      maxLng: Math.max(b.maxLng, p.lng),
    }),
    { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 }
  );
  const center = { lat: (bounds.minLat + bounds.maxLat) / 2, lng: (bounds.minLng + bounds.maxLng) / 2 };

  return (
    <div className="rounded-2xl overflow-hidden warm-card">
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "16rem" }}
        center={center}
        zoom={14}
        options={{ disableDefaultUI: true, zoomControl: true, styles: DARK_MAP_STYLE }}
      >
        <Polyline path={path} options={{ strokeColor: "#f7a13c", strokeWeight: 3 }} />
        {itinerary.stops.map((stop, i) => (
          <Marker
            key={stop.venue.id + i}
            position={{ lat: stop.venue.lat, lng: stop.venue.lng }}
            label={{ text: String(i + 1), color: "#160a02", fontWeight: "700" }}
          />
        ))}
      </GoogleMap>
    </div>
  );
}

export default function RouteMap({ itinerary }: { itinerary: Itinerary }) {
  if (!MAPS_API_KEY) return <MapPlaceholder />;
  return <LiveMap itinerary={itinerary} apiKey={MAPS_API_KEY} />;
}
