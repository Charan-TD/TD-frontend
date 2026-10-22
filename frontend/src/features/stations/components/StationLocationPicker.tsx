"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

const API_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
const AUTOCOMPLETE_URL = "https://api.geoapify.com/v1/geocode/autocomplete";
const REVERSE_URL = "https://api.geoapify.com/v1/geocode/reverse";
const TILE_URL = "https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png";

// Centre of India, shown until a place is picked.
const DEFAULT_CENTER: [number, number] = [22.9734, 78.6569];

export type PickedLocation = {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
};

type Place = {
  formatted?: string;
  lat?: number;
  lon?: number;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state_district?: string;
  state?: string;
};

const toPicked = (place: Place, latitude: number, longitude: number): PickedLocation => ({
  latitude,
  longitude,
  address: place.formatted ?? "",
  city: place.city ?? place.town ?? place.village ?? place.county ?? place.state_district ?? "",
  state: place.state ?? "",
});

async function fetchPlaces(url: string, signal?: AbortSignal): Promise<Place[]> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Map service failed (${response.status})`);
  return (await response.json()).results ?? [];
}

const reverseGeocode = async (lat: number, lon: number): Promise<Place | null> =>
  (await fetchPlaces(`${REVERSE_URL}?lat=${lat}&lon=${lon}&format=json&apiKey=${API_KEY}`))[0] ?? null;

type Props = {
  /** Saved coordinates when editing a station; empty when adding one. */
  latitude: string;
  longitude: string;
  /** Called whenever the admin picks a place or moves the pin. */
  onChange: (location: PickedLocation) => void;
  disabled?: boolean;
};

/**
 * Search box + draggable pin. The admin only sees the search box, the map and the address;
 * the latitude/longitude are passed up through onChange and never shown.
 */
export function StationLocationPicker({ latitude, longitude, onChange, disabled }: Props) {
  const initialLat = latitude.trim() === "" ? NaN : Number(latitude);
  const initialLon = longitude.trim() === "" ? NaN : Number(longitude);
  const hasInitial = Number.isFinite(initialLat) && Number.isFinite(initialLon);

  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [hasPin, setHasPin] = useState(hasInitial);

  /** Puts the pin at a point and, when asked, looks up the address there. */
  const placePin = async (lat: number, lon: number, place: Place | null, fillPlace: boolean) => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lon]);
    } else {
      const marker = L.marker([lat, lon], {
        draggable: true,
        icon: L.divIcon({
          className: "station-pin",
          html: "<span></span>",
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        }),
      }).addTo(map);
      marker.on("dragend", () => {
        const { lat: newLat, lng: newLon } = marker.getLatLng();
        void placePin(newLat, newLon, null, true);
      });
      markerRef.current = marker;
    }
    setHasPin(true);
    map.setView([lat, lon], Math.max(map.getZoom(), 16));

    let found = place;
    if (!found) {
      setNote("Finding the address…");
      try {
        found = await reverseGeocode(lat, lon);
        setNote(found ? "" : "No address found here. You can type one below.");
      } catch {
        setNote("Could not look up the address. You can type one below.");
      }
    }

    if (found?.formatted) setAddress(found.formatted);
    const picked = toPicked(found ?? {}, lat, lon);
    if (fillPlace) {
      onChangeRef.current(picked);
    } else {
      // Editing a saved station: only the coordinates are kept, city/state stay as saved.
      onChangeRef.current({ ...picked, city: "", state: "" });
    }
  };

  // Build the map once.
  useEffect(() => {
    if (!API_KEY || !container.current) return;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !container.current) return;
      leafletRef.current = L;
      const map = L.map(container.current, { scrollWheelZoom: true }).setView(
        hasInitial ? [initialLat, initialLon] : DEFAULT_CENTER,
        hasInitial ? 16 : 5,
      );
      L.tileLayer(`${TILE_URL}?apiKey=${API_KEY}`, {
        maxZoom: 20,
        attribution:
          '© <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a> | © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      }).addTo(map);
      map.on("click", (event) => {
        if (disabledRef.current) return;
        void placePin(event.latlng.lat, event.latlng.lng, null, true);
      });
      mapRef.current = map;

      // The side panel slides in, so the map needs to re-measure itself.
      setTimeout(() => map.invalidateSize(), 250);

      if (hasInitial) void placePin(initialLat, initialLon, null, false);
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Suggestions while typing.
  useEffect(() => {
    const text = query.trim();
    if (!API_KEY || text.length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(() => {
      fetchPlaces(
        `${AUTOCOMPLETE_URL}?text=${encodeURIComponent(text)}&filter=countrycode:in&limit=5&format=json&apiKey=${API_KEY}`,
        controller.signal,
      )
        .then((places) => {
          setSuggestions(places.filter((p) => typeof p.lat === "number" && typeof p.lon === "number"));
          setSearching(false);
        })
        .catch((error) => {
          if (error?.name !== "AbortError") {
            setSuggestions([]);
            setSearching(false);
          }
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const choose = (place: Place) => {
    setQuery(place.formatted ?? "");
    setSuggestions([]);
    void placePin(place.lat as number, place.lon as number, place, true);
  };

  if (!API_KEY) {
    return <div className="api-state">Map unavailable: Geoapify API key is not configured.</div>;
  }

  return (
    <div className="station-picker">
      <label className="station-picker__field">
        <span>Search location</span>
        <div className="station-picker__search">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the station or area, e.g. Secunderabad Railway Station"
            autoComplete="off"
            disabled={disabled}
          />
          {(searching || suggestions.length > 0) && (
            <ul className="station-picker__results" role="listbox">
              {searching && !suggestions.length && <li className="station-picker__hint">Searching…</li>}
              {suggestions.map((place, index) => (
                <li key={`${place.formatted}-${index}`}>
                  <button type="button" onClick={() => choose(place)}>
                    {place.formatted}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </label>

      <div ref={container} className="location-map station-picker__map" role="region" aria-label="Station location map" />
      <small className="station-picker__tip">
        {hasPin ? "Drag the pin or click the map to fine-tune the exact spot." : "Search above, or click the map to drop a pin."}
      </small>

      <label className="station-picker__field">
        <span>Address</span>
        <textarea
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="The address of the selected spot appears here"
          rows={3}
          disabled={disabled}
        />
        {note && <small>{note}</small>}
      </label>
    </div>
  );
}
