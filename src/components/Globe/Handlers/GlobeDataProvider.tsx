// src/components/Globe/Handlers/GlobeDataProvider.tsx
import { create } from 'zustand';

const fetchJson = async (url: string, signal?: AbortSignal) => {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return res.json();
};

// Define Zustand store for managing globe-related data
export const useGlobeData = create((set) => ({
  geoMarkers: [],
  geoOverlays: [],
  spaceEntities: [],

  fetchGeoMarkers: async (signal?: AbortSignal) => {
    const data = await fetchJson('/api/geo-markers', signal);
    set({ geoMarkers: data });
  },

  fetchGeoOverlays: async (signal?: AbortSignal) => {
    const data = await fetchJson('/api/geo-overlays', signal);
    set({ geoOverlays: data });
  },

  fetchSpaceEntities: async (signal?: AbortSignal) => {
    const data = await fetchJson('/api/space-entities', signal);
    set({ spaceEntities: data });
  },

  fetchAllGlobeData: async (signal?: AbortSignal) => {
    const [markers, overlays, entities] = await Promise.all([
      fetchJson('/api/geo-markers', signal),
      fetchJson('/api/geo-overlays', signal),
      fetchJson('/api/space-entities', signal)
    ]);

    set({
      geoMarkers: markers,
      geoOverlays: overlays,
      spaceEntities: entities
    });
  },

  // selectGeoMarker: (marker) => set({ selectedGeoMarker: marker }),
  // selectSpaceEntity: (entity) => set({ selectedSpaceEntity: entity }),
}));