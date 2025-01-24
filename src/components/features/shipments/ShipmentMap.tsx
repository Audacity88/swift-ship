'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapPin } from 'lucide-react'
import { radarService } from '@/lib/services/radar-service'

// Initialize with your Radar publishable key
const RADAR_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY || ''

interface ShipmentMapProps {
  origin: string
  destination: string
  currentLocation?: string
}

export function ShipmentMap({ origin, destination, currentLocation }: ShipmentMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const [error, setError] = useState<string | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [coordinates, setCoordinates] = useState<{
    origin: [number, number] | null
    destination: [number, number] | null
    current?: [number, number]
  }>({
    origin: null,
    destination: null
  })

  // Geocode addresses to get coordinates
  useEffect(() => {
    const geocodeAddresses = async () => {
      try {
        // Geocode origin
        const originResult = await radarService.geocodeAddress(origin)
        const destResult = await radarService.geocodeAddress(destination)
        
        let currentResult = null
        if (currentLocation && currentLocation !== 'Location not available') {
          currentResult = await radarService.geocodeAddress(currentLocation)
        }

        setCoordinates({
          origin: originResult ? [originResult.longitude, originResult.latitude] : [-74.006, 40.7128],
          destination: destResult ? [destResult.longitude, destResult.latitude] : [-84.388, 33.749],
          current: currentResult ? [currentResult.longitude, currentResult.latitude] : undefined
        })
      } catch (err) {
        console.error('Error geocoding addresses:', err)
        setError('Failed to geocode addresses')
      }
    }

    void geocodeAddresses()
  }, [origin, destination, currentLocation])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current || !coordinates.origin) return

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: `https://api.radar.io/maps/styles/radar-default-v1?publishableKey=${RADAR_PUBLISHABLE_KEY}`,
        center: coordinates.origin,
        zoom: 3,
        attributionControl: false
      })

      map.current.on('load', () => {
        setMapLoaded(true)
      })

      map.current.on('error', (e) => {
        console.error('Map error:', e)
        setError('Failed to load map')
      })

      // Add navigation control
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right')

    } catch (err) {
      console.error('Error initializing map:', err)
      setError('Failed to initialize map')
    }

    return () => {
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [coordinates.origin])

  // Update map with route and markers
  useEffect(() => {
    if (!map.current || !mapLoaded || !coordinates.origin || !coordinates.destination) return

    const updateMap = async () => {
      try {
        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove())
        markersRef.current = []

        // Clear existing route
        if (map.current?.getSource('route')) {
          map.current.removeLayer('route')
          map.current.removeSource('route')
        }

        // Add markers for origin and destination
        const originMarker = addMarker(coordinates.origin, 'origin')
        const destMarker = addMarker(coordinates.destination, 'destination')
        markersRef.current.push(originMarker, destMarker)

        // If we have a current location, add that marker too
        if (coordinates.current) {
          const currentMarker = addMarker(coordinates.current, 'current')
          markersRef.current.push(currentMarker)
        }

        // Fit bounds to show all points
        const bounds = new maplibregl.LngLatBounds()
        bounds.extend(coordinates.origin)
        bounds.extend(coordinates.destination)
        if (coordinates.current) {
          bounds.extend(coordinates.current)
        }

        map.current.fitBounds(bounds, {
          padding: 50,
          duration: 1000
        })

        // Add a simple line between points
        if (map.current) {
          map.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: [coordinates.origin, coordinates.destination]
              }
            }
          })

          map.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#4F46E5',
              'line-width': 4
            }
          })
        }
      } catch (err) {
        console.error('Error updating map:', err)
        setError('Failed to update map')
      }
    }

    void updateMap()
  }, [coordinates, mapLoaded])

  // Helper function to add a marker to the map
  const addMarker = (coordinates: [number, number], type: 'origin' | 'destination' | 'current'): maplibregl.Marker => {
    if (!map.current) throw new Error('Map not initialized')

    const colors = {
      origin: '#4F46E5', // Blue
      destination: '#DC2626', // Red
      current: '#047857' // Green
    }

    // Create a custom marker element
    const el = document.createElement('div')
    el.className = 'marker'
    el.style.width = '30px'
    el.style.height = '30px'
    el.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${colors[type]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${type === 'origin' 
          ? `<circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/>`
          : `<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>`
        }
      </svg>
    `

    return new maplibregl.Marker({ element: el })
      .setLngLat(coordinates)
      .addTo(map.current)
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center text-gray-500">
          <MapPin className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={mapContainer} className="w-full h-full" />
  )
} 