'use client'

import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'
import { COLORS } from '@/lib/constants'

const geoUrl = "https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json"

type Marker = {
  name: string;
  coordinates: [number, number];
  value: number;
}

const markers: Marker[] = [
  { name: "New York", coordinates: [-74.006, 40.7128], value: 245 },
  { name: "London", coordinates: [-0.1276, 51.5074], value: 312 },
  { name: "Singapore", coordinates: [103.8198, 1.3521], value: 178 },
  { name: "Tokyo", coordinates: [139.6917, 35.6895], value: 289 },
  { name: "Sydney", coordinates: [151.2093, -33.8688], value: 156 },
]

export function GeographicDistribution() {
  return (
    <ComposableMap
      projectionConfig={{
        scale: 140,
      }}
    >
      <Geographies geography={geoUrl}>
        {({ geographies }) =>
          geographies.map((geo) => (
            <Geography
              key={geo.rsmKey}
              geography={geo}
              fill="#F5F5F5"
              stroke="#D4D4D4"
              strokeWidth={0.5}
              style={{
                default: { outline: 'none' },
                hover: { fill: '#E5E7EB', outline: 'none' },
                pressed: { outline: 'none' },
              }}
            />
          ))
        }
      </Geographies>
      
      {markers.map(({ name, coordinates, value }) => (
        <Marker key={name} coordinates={coordinates}>
          <circle
            r={Math.sqrt(value) / 4}
            fill={COLORS.primary}
            fillOpacity={0.6}
            stroke={COLORS.primary}
            strokeWidth={1}
          />
          <text
            textAnchor="middle"
            y={-10}
            style={{
              fontFamily: 'system-ui',
              fontSize: '8px',
              fill: '#666',
            }}
          >
            {name}
          </text>
        </Marker>
      ))}
    </ComposableMap>
  )
} 