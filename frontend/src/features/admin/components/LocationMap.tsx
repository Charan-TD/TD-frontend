"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

const API_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
const GEOCODE_URL = "https://api.geoapify.com/v1/geocode/search";
const TILE_URL = "https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png";

type Point = { lat: number; lon: number };

const toNumber = (value: unknown): number | null => {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

/** Looks the address up with Geoapify when the restaurant has no saved coordinates. */
async function geocode(address: string, signal: AbortSignal): Promise<Point | null> {
  const url = `${GEOCODE_URL}?text=${encodeURIComponent(address)}&filter=countrycode:in&limit=1&format=json&apiKey=${API_KEY}`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Geocoding failed (${response.status})`);
  const result = (await response.json()).results?.[0];
  const lat = toNumber(result?.lat);
  const lon = toNumber(result?.lon);
  return lat != null && lon != null ? { lat, lon } : null;
}

/**
 * Shows a restaurant on a Geoapify map. Uses the saved latitude/longitude, and falls back
 * to geocoding the address when those are missing.
 */
export function LocationMap({
  latitude,
  longitude,
  address,
  label,
}: {
  latitude: unknown;
  longitude: unknown;
  address: string;
  label: string;
}) {
  const lat = toNumber(latitude);
  const lon = toNumber(longitude);
  const hasSaved = lat != null && lon != null;

  const [geocoded, setGeocoded] = useState<Point | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "notfound">("idle");
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasSaved || !API_KEY || !address) return;
    const controller = new AbortController();
    setStatus("loading");
    geocode(address, controller.signal)
      .then((point) => {
        setGeocoded(point);
        setStatus(point ? "idle" : "notfound");
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setStatus("error");
      });
    return () => controller.abort();
  }, [hasSaved, address]);

  const point: Point | null = hasSaved ? { lat, lon } : geocoded;
  const pointLat = point?.lat;
  const pointLon = point?.lon;

  useEffect(() => {
    if (!API_KEY || pointLat == null || pointLon == null || !container.current) return;
    let map: import("leaflet").Map | undefined;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !container.current) return;
      map = L.map(container.current, { scrollWheelZoom: false }).setView([pointLat, pointLon], 16);
      L.tileLayer(`${TILE_URL}?apiKey=${API_KEY}`, {
        maxZoom: 20,
        attribution:
          '© <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a> | © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      }).addTo(map);
      L.marker([pointLat, pointLon], {
        title: label,
        icon: L.divIcon({ className: "location-pin", iconSize: [28, 28], iconAnchor: [14, 28] }),
      }).addTo(map);
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [pointLat, pointLon, label]);

  if (!API_KEY) return <div className="api-state">Map unavailable: Geoapify API key is not configured.</div>;
  if (!point) {
    const message =
      status === "loading"
        ? "Locating restaurant on the map…"
        : status === "error"
          ? "Could not load the map location. Try again later."
          : "No coordinates saved and the address could not be located on the map.";
    return <div className="api-state">{message}</div>;
  }

  return (
    <div className="location-map-wrap">
      <div ref={container} className="location-map" role="region" aria-label={`Map showing ${label}`} />
      <div className="location-map__foot">
        <span>
          {point.lat.toFixed(6)}, {point.lon.toFixed(6)}
          {!hasSaved && " (approximate, from address)"}
        </span>
        <a
          className="secondary-button"
          href={`https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lon}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Google Maps
        </a>
      </div>
    </div>
  );
}
