import { useState, useEffect, useRef } from 'react';

export interface AddressSuggestion {
  placeId: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

interface UseAddressAutocompleteReturn {
  suggestions: AddressSuggestion[];
  isLoading: boolean;
  error: string | null;
}

export function useAddressAutocomplete(query: string): UseAddressAutocompleteReturn {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
    if (!token) {
      setSuggestions([]);
      return;
    }

    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      try {
        const encoded = encodeURIComponent(query);
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&country=us&types=address&limit=5`;
        const res = await fetch(url, { signal: abortRef.current.signal });
        if (!res.ok) throw new Error('Geocoding request failed');
        const data = await res.json();

        const results: AddressSuggestion[] = (data.features ?? []).map((f: Record<string, unknown>) => {
          const context = (f.context as Array<{ id: string; text: string }> | undefined) ?? [];
          const cityCtx = context.find((c) => c.id.startsWith('place'));
          const stateCtx = context.find((c) => c.id.startsWith('region'));
          const coords = f.center as [number, number];
          return {
            placeId: f.id as string,
            address: f.place_name as string,
            city: cityCtx?.text ?? '',
            state: stateCtx?.text ?? '',
            lat: coords[1],
            lng: coords[0],
          };
        });

        setSuggestions(results);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError('Address lookup failed');
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  return { suggestions, isLoading, error };
}
