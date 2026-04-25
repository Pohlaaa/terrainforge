import 'mapbox-gl/dist/mapbox-gl.css';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import { useAddressAutocomplete, type AddressSuggestion } from '@/hooks/useAddressAutocomplete';

interface AddressInputProps {
  value: string;
  onChange: (text: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  required?: boolean;
}

export const AddressInput: React.FC<AddressInputProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = '123 Main St',
  label,
  error,
  required,
}) => {
  const [isVerified, setIsVerified] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [verifiedCoords, setVerifiedCoords] = useState<{ lat: number; lng: number } | null>(null);
  // F-041: track which suggestion is highlighted for keyboard nav.
  // -1 means "no highlight" — ArrowDown will move to index 0.
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const miniMapRef = useRef<HTMLDivElement>(null);
  const miniMapInstanceRef = useRef<MapboxMap | null>(null);
  const { suggestions, isLoading } = useAddressAutocomplete(value);

  const hasToken = Boolean(import.meta.env.VITE_MAPBOX_TOKEN);
  const showSuggestions = showDropdown && isFocused && suggestions.length > 0 && hasToken;
  const showUnverified = !isFocused && !isVerified && value.trim().length > 0 && hasToken;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setIsVerified(false);
    setVerifiedCoords(null);
    onChange(e.target.value);
    setShowDropdown(true);
    setActiveIndex(-1); // reset highlight when the query changes
  }, [onChange]);

  const handleSelect = useCallback((suggestion: AddressSuggestion) => {
    onChange(suggestion.address);
    onSelect(suggestion);
    setIsVerified(true);
    setShowDropdown(false);
    setActiveIndex(-1);
    setVerifiedCoords({ lat: suggestion.lat, lng: suggestion.lng });
  }, [onChange, onSelect]);

  // F-041: keyboard navigation over the suggestions list.
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setActiveIndex(-1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(suggestions.length - 1);
    }
  }, [showDropdown, suggestions, activeIndex, handleSelect]);

  // Mini-map: initialize when verified coords are available
  useEffect(() => {
    if (!verifiedCoords || !miniMapRef.current) return;
    const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
    if (!token) return;

    let cancelled = false;
    const init = async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      if (cancelled) return;
      mapboxgl.accessToken = token;

      if (miniMapInstanceRef.current) {
        miniMapInstanceRef.current.remove();
        miniMapInstanceRef.current = null;
      }

      const map = new mapboxgl.Map({
        container: miniMapRef.current!,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [verifiedCoords.lng, verifiedCoords.lat],
        zoom: 14,
        interactive: false,
        attributionControl: false,
      });
      miniMapInstanceRef.current = map;
      map.on('load', () => {
        if (cancelled) return;
        new mapboxgl.Marker({ color: '#2D6A4F' })
          .setLngLat([verifiedCoords.lng, verifiedCoords.lat])
          .addTo(map);
      });
    };
    init();

    return () => {
      cancelled = true;
      if (miniMapInstanceRef.current) {
        miniMapInstanceRef.current.remove();
        miniMapInstanceRef.current = null;
      }
    };
  }, [verifiedCoords]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: '4px',
          }}
        >
          {label}
          {required && <span style={{ color: 'var(--status-red)', marginLeft: '2px' }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { setIsFocused(true); setShowDropdown(true); }}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={showDropdown && suggestions.length > 0}
          aria-autocomplete="list"
          aria-controls="address-suggestion-listbox"
          aria-activedescendant={activeIndex >= 0 ? `address-suggestion-${activeIndex}` : undefined}
          style={{
            width: '100%',
            height: '44px',
            padding: '0 40px 0 12px',
            borderRadius: '8px',
            border: error
              ? '1px solid var(--status-red)'
              : isFocused
              ? '1px solid var(--brand-primary)'
              : '1px solid var(--border-default)',
            background: 'var(--surface-card)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.15s ease',
            boxSizing: 'border-box',
          }}
        />
        {/* Loading spinner */}
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              right: '12px',
              width: '16px',
              height: '16px',
              border: '2px solid var(--border-default)',
              borderTopColor: 'var(--brand-primary)',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }}
          />
        )}
        {/* Verified checkmark */}
        {isVerified && !isLoading && (
          <svg
            style={{ position: 'absolute', right: '12px', color: 'var(--status-green)' }}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {error && (
        <div style={{ fontSize: '11px', color: 'var(--status-red)', marginTop: '4px' }}>
          {error}
        </div>
      )}

      {showUnverified && (
        // F-CW-05: copy was confusing because contractors could type a real
        // address and still see "not verified". Make it clear the action
        // they need to take is "pick from the dropdown" — not retype.
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
          Pick a result from the dropdown to verify the address. Otherwise the project won't appear on the map.
        </div>
      )}

      {/* Mini-map preview after verification */}
      {isVerified && verifiedCoords && (
        <div
          ref={miniMapRef}
          style={{
            marginTop: '8px',
            height: '120px',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid var(--border-default)',
          }}
        />
      )}

      {/* Autocomplete dropdown */}
      {showSuggestions && (
        <div
          id="address-suggestion-listbox"
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1000,
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '10px',
            boxShadow: 'var(--shadow-panel)',
            overflow: 'hidden',
          }}
        >
          {suggestions.map((s, idx) => {
            const active = idx === activeIndex;
            return (
              <button
                key={s.placeId}
                id={`address-suggestion-${idx}`}
                role="option"
                aria-selected={active}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                onMouseEnter={() => setActiveIndex(idx)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  minHeight: '44px',
                  background: active ? 'var(--surface-hover)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.1s ease',
                }}
              >
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {s.address}
                </div>
                {(s.city || s.state) && (
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    {[s.city, s.state].filter(Boolean).join(', ')}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AddressInput;
