/**
 * Activity Heat Map Component
 * Visualizes document activity patterns across time and location
 */

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { MapContainer, TileLayer, useMap, Circle, Popup, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface ActivityData {
  hour: number;
  day: string;
  count: number;
  type: string;
}

interface LocationActivity {
  id: string;
  lat: number;
  lng: number;
  intensity: number;
  zone: string;
  lastActivity: Date;
  documentCount: number;
}

interface HeatMapProps {
  activityData: ActivityData[];
  locationData: LocationActivity[];
  mode: 'temporal' | 'spatial' | 'combined';
  onCellClick?: (data: any) => void;
}

// Temporal Heat Map (Time-based activity)
const TemporalHeatMap: React.FC<{
  data: ActivityData[];
  onCellClick?: (data: any) => void;
}> = ({ data, onCellClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const margin = { top: 50, right: 60, bottom: 100, left: 100 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Days of week
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // Scales
    const xScale = d3.scaleBand()
      .domain(hours.map(String))
      .range([0, width])
      .padding(0.05);

    const yScale = d3.scaleBand()
      .domain(days)
      .range([0, height])
      .padding(0.05);

    // Color scale
    const maxCount = d3.max(data, d => d.count) || 1;
    const colorScale = d3.scaleSequential()
      .domain([0, maxCount])
      .interpolator(d3.interpolateYlOrRd);

    // Create heat map cells
    g.selectAll('.heat-cell')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'heat-cell')
      .attr('x', d => xScale(String(d.hour)) || 0)
      .attr('y', d => yScale(d.day) || 0)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => colorScale(d.count))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('click', (event, d) => onCellClick?.(d))
      .on('mouseover', function(event, d) {
        // Tooltip
        const tooltip = d3.select('body').append('div')
          .attr('class', 'heatmap-tooltip')
          .style('opacity', 0)
          .style('position', 'absolute')
          .style('background', 'rgba(0, 0, 0, 0.8)')
          .style('color', 'white')
          .style('padding', '8px')
          .style('border-radius', '4px')
          .style('font-size', '12px');

        tooltip.transition()
          .duration(200)
          .style('opacity', .9);
        
        tooltip.html(`
          <strong>${d.day} ${d.hour}:00</strong><br/>
          Activity: ${d.count}<br/>
          Type: ${d.type}
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        d3.selectAll('.heatmap-tooltip').remove();
      });

    // Add value labels
    g.selectAll('.heat-label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'heat-label')
      .attr('x', d => (xScale(String(d.hour)) || 0) + xScale.bandwidth() / 2)
      .attr('y', d => (yScale(d.day) || 0) + yScale.bandwidth() / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', d => d.count > maxCount / 2 ? 'white' : 'black')
      .attr('font-size', '10px')
      .text(d => d.count > 0 ? d.count : '');

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .append('text')
      .attr('x', width / 2)
      .attr('y', 40)
      .attr('fill', 'black')
      .style('text-anchor', 'middle')
      .text('Hour of Day');

    // Y axis
    g.append('g')
      .call(d3.axisLeft(yScale))
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -60)
      .attr('x', -height / 2)
      .attr('fill', 'black')
      .style('text-anchor', 'middle')
      .text('Day of Week');

    // Title
    svg.append('text')
      .attr('x', (width + margin.left + margin.right) / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text('Document Activity Heat Map');

    // Legend
    const legendWidth = 200;
    const legendHeight = 20;
    
    const legendScale = d3.scaleLinear()
      .domain([0, maxCount])
      .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickFormat(d3.format('.0f'));

    const legend = svg.append('g')
      .attr('transform', `translate(${width + margin.left - legendWidth}, ${margin.top - 40})`);

    // Create gradient
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'heat-gradient');

    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      gradient.append('stop')
        .attr('offset', `${(i / steps) * 100}%`)
        .attr('stop-color', colorScale(i * maxCount / steps));
    }

    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#heat-gradient)');

    legend.append('g')
      .attr('transform', `translate(0,${legendHeight})`)
      .call(legendAxis);

  }, [data, onCellClick]);

  return (
    <div ref={containerRef} style={{ width: '100%', overflowX: 'auto' }}>
      <svg ref={svgRef}></svg>
    </div>
  );
};

// Spatial Heat Map (Location-based activity)
const SpatialHeatMap: React.FC<{
  data: LocationActivity[];
  onLocationClick?: (location: LocationActivity) => void;
}> = ({ data, onLocationClick }) => {
  const [center] = useState<[number, number]>([40.7128, -74.0060]); // Default to NYC
  
  const getIntensityColor = (intensity: number): string => {
    if (intensity > 0.8) return '#ff0000';
    if (intensity > 0.6) return '#ff6600';
    if (intensity > 0.4) return '#ffaa00';
    if (intensity > 0.2) return '#ffdd00';
    return '#ffff00';
  };

  const HeatLayer = () => {
    const map = useMap();
    
    useEffect(() => {
      // Create heat layer using Leaflet
      const heat = L.heatLayer(
        data.map(d => [d.lat, d.lng, d.intensity]),
        { radius: 25, blur: 15, maxZoom: 17 }
      ).addTo(map);

      return () => {
        map.removeLayer(heat);
      };
    }, [map]);

    return null;
  };

  return (
    <div style={{ height: '500px', width: '100%' }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        
        {/* Activity circles */}
        {data.map(location => (
          <Circle
            key={location.id}
            center={[location.lat, location.lng]}
            radius={location.intensity * 100}
            fillColor={getIntensityColor(location.intensity)}
            fillOpacity={0.6}
            color={getIntensityColor(location.intensity)}
            weight={2}
            eventHandlers={{
              click: () => onLocationClick?.(location)
            }}
          >
            <Popup>
              <div>
                <strong>{location.zone}</strong><br />
                Documents: {location.documentCount}<br />
                Activity: {Math.round(location.intensity * 100)}%<br />
                Last Activity: {new Date(location.lastActivity).toLocaleString()}
              </div>
            </Popup>
          </Circle>
        ))}
        
        {/* Markers for high activity zones */}
        {data.filter(d => d.intensity > 0.7).map(location => (
          <Marker
            key={`marker-${location.id}`}
            position={[location.lat, location.lng]}
          >
            <Popup>
              <strong>⚠️ High Activity Zone</strong><br />
              {location.zone}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

// Combined Activity Dashboard
const ActivityHeatMap: React.FC<HeatMapProps> = ({
  activityData,
  locationData,
  mode,
  onCellClick
}) => {
  const [selectedMode, setSelectedMode] = useState(mode);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [activityType, setActivityType] = useState<'all' | 'retrieval' | 'storage' | 'movement'>('all');

  // Filter data based on selections
  const filteredActivityData = activityData.filter(d => 
    activityType === 'all' || d.type === activityType
  );

  return (
    <div className="heatmap-container" style={{ padding: '20px' }}>
      {/* Controls */}
      <div className="heatmap-controls" style={{ 
        marginBottom: '20px',
        display: 'flex',
        gap: '20px',
        alignItems: 'center'
      }}>
        <div>
          <label>View Mode: </label>
          <select 
            value={selectedMode} 
            onChange={(e) => setSelectedMode(e.target.value as any)}
            style={{ marginLeft: '5px' }}
          >
            <option value="temporal">Time-based</option>
            <option value="spatial">Location-based</option>
            <option value="combined">Combined</option>
          </select>
        </div>
        
        <div>
          <label>Activity Type: </label>
          <select 
            value={activityType} 
            onChange={(e) => setActivityType(e.target.value as any)}
            style={{ marginLeft: '5px' }}
          >
            <option value="all">All Activities</option>
            <option value="retrieval">Retrievals</option>
            <option value="storage">Storage</option>
            <option value="movement">Movements</option>
          </select>
        </div>
        
        <div>
          <label>Time Range: </label>
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value as any)}
            style={{ marginLeft: '5px' }}
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Heat Maps */}
      {selectedMode === 'temporal' && (
        <TemporalHeatMap 
          data={filteredActivityData} 
          onCellClick={onCellClick}
        />
      )}
      
      {selectedMode === 'spatial' && (
        <SpatialHeatMap 
          data={locationData}
          onLocationClick={(location) => onCellClick?.(location)}
        />
      )}
      
      {selectedMode === 'combined' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          <div>
            <h3>Temporal Activity Pattern</h3>
            <TemporalHeatMap 
              data={filteredActivityData} 
              onCellClick={onCellClick}
            />
          </div>
          <div>
            <h3>Spatial Activity Distribution</h3>
            <SpatialHeatMap 
              data={locationData}
              onLocationClick={(location) => onCellClick?.(location)}
            />
          </div>
        </div>
      )}

      {/* Statistics */}
      <div style={{ 
        marginTop: '20px',
        padding: '15px',
        background: '#f5f5f5',
        borderRadius: '5px'
      }}>
        <h4>Activity Statistics</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
          <div>
            <strong>Peak Hour:</strong> {
              activityData.reduce((max, d) => d.count > max.count ? d : max, activityData[0])?.hour || 0
            }:00
          </div>
          <div>
            <strong>Peak Day:</strong> {
              activityData.reduce((max, d) => d.count > max.count ? d : max, activityData[0])?.day || 'N/A'
            }
          </div>
          <div>
            <strong>Total Activities:</strong> {
              activityData.reduce((sum, d) => sum + d.count, 0)
            }
          </div>
          <div>
            <strong>Hot Zones:</strong> {
              locationData.filter(d => d.intensity > 0.7).length
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityHeatMap;