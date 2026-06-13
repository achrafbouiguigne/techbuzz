import React, { useMemo, useState } from 'react';

const HUB_COORDINATES = {
  "USA": { x: 50, y: 70, name: "United States" },
  "France": { x: 145, y: 40, name: "France" },
  "Morocco": { x: 140, y: 95, name: "Morocco" },
  "Canada": { x: 45, y: 30, name: "Canada" },
  "Germany": { x: 165, y: 35, name: "Germany" },
  "India": { x: 250, y: 80, name: "India" },
  "UK": { x: 130, y: 22, name: "United Kingdom" },
  "Remote": { x: 95, y: 115, name: "Virtual Node (Remote)" }
};

export default function LocationPulseMap({ posts, selectedCountry, setSelectedCountry }) {
  const [hoveredHub, setHoveredHub] = useState(null);

  
  const locationStats = useMemo(() => {
    const stats = {};
    let maxCount = 1;

    posts.forEach(post => {
      if (!post.locations || !Array.isArray(post.locations)) return;
      
      post.locations.forEach(loc => {
        const locLower = loc.toLowerCase();
        let matchedKey = null;

        if (locLower === 'usa' || locLower === 'san francisco' || locLower === 'new york' || locLower === 'silicon valley') matchedKey = 'USA';
        else if (locLower === 'france' || locLower === 'paris') matchedKey = 'France';
        else if (locLower === 'morocco' || locLower === 'maroc' || locLower === 'casablanca' || locLower === 'rabat') matchedKey = 'Morocco';
        else if (locLower === 'canada' || locLower === 'toronto') matchedKey = 'Canada';
        else if (locLower === 'germany' || locLower === 'berlin') matchedKey = 'Germany';
        else if (locLower === 'india') matchedKey = 'India';
        else if (locLower === 'uk' || locLower === 'london') matchedKey = 'UK';
        else if (locLower === 'remote') matchedKey = 'Remote';

        if (matchedKey) {
          if (!stats[matchedKey]) {
            stats[matchedKey] = { count: 0, categories: {} };
          }
          stats[matchedKey].count++;
          
          
          const cat = post.primary_category || 'Other';
          stats[matchedKey].categories[cat] = (stats[matchedKey].categories[cat] || 0) + 1;
        }
      });
    });

    
    Object.keys(stats).forEach(k => {
      if (stats[k].count > maxCount) maxCount = stats[k].count;
    });

    
    const formatted = {};
    Object.keys(HUB_COORDINATES).forEach(key => {
      const data = stats[key] || { count: 0, categories: {} };
      
      
      let topCat = 'None';
      let maxCatCount = 0;
      Object.keys(data.categories).forEach(cat => {
        if (data.categories[cat] > maxCatCount) {
          maxCatCount = data.categories[cat];
          topCat = cat;
        }
      });

      formatted[key] = {
        count: data.count,
        weight: maxCount > 0 ? data.count / maxCount : 0,
        topCategory: topCat
      };
    });

    return formatted;
  }, [posts]);

  
  const width = 310;
  const height = 150;

  return (
    <div className="location-pulse-map-panel" style={{
      position: 'fixed',
      top: '55px',
      right: '20px',
      width: '460px',
      height: '310px',
      background: 'var(--bg-panel)',
      border: 'var(--border-neon)',
      boxShadow: '0 0 15px rgba(0, 255, 65, 0.1)',
      zIndex: 10,
      padding: '12px 15px',
      borderRadius: '4px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      animation: 'fadeIn 0.5s ease',
      backdropFilter: 'blur(5px)',
      boxSizing: 'border-box'
    }}>
      {}
      <div style={{
        display: 'flex',
        justifyContent: 'between',
        alignItems: 'center',
        borderBottom: '1px dashed rgba(0, 255, 65, 0.2)',
        paddingBottom: '6px',
        width: '100%'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="blinking-dot" style={{ background: 'var(--neon-green)', width: '6px', height: '6px' }}></span>
          <span style={{ fontSize: '11px', color: 'var(--neon-green)', letterSpacing: '1px' }}>GLOBAL TELEMETRY MAP</span>
        </div>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'monospace', marginLeft: 'auto' }}>
          {selectedCountry === 'All' ? 'GLOBAL GRAPH' : `FILTER: ${selectedCountry.toUpperCase()}`}
        </div>
      </div>

      {}
      <div style={{ 
        position: 'relative', 
        width: '100%', 
        height: '240px',
        background: '#000501',
        border: '1px solid rgba(0, 255, 65, 0.1)',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
          <defs>
            <filter id="map-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {}
          <path
            d="M 50 70 L 45 30 M 50 70 L 130 22 M 50 70 L 140 95 M 130 22 L 145 40 M 145 40 L 165 35 M 145 40 L 140 95 M 145 40 L 250 80 M 140 95 L 250 80 M 50 70 L 95 115 M 140 95 L 95 115"
            fill="none"
            stroke="rgba(0, 255, 65, 0.08)"
            strokeWidth="1"
            strokeDasharray="2 2"
          />

          {}
          {Object.keys(HUB_COORDINATES).map(key => {
            const coord = HUB_COORDINATES[key];
            const stats = locationStats[key] || { count: 0, weight: 0, topCategory: 'None' };
            const isSelected = selectedCountry === key;
            const isHovered = hoveredHub?.key === key;
            
            
            const pulseRadius = 3 + stats.weight * 10;
            
            return (
              <g
                key={key}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedCountry(isSelected ? 'All' : key)}
                onMouseEnter={() => setHoveredHub({ key, ...coord, ...stats })}
                onMouseLeave={() => setHoveredHub(null)}
              >
                {}
                {stats.count > 0 && (
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={pulseRadius + 4}
                    fill="none"
                    stroke={isSelected ? 'var(--neon-blue)' : 'var(--neon-green)'}
                    strokeWidth="1"
                    opacity={isSelected ? 0.8 : 0.4}
                    style={{
                      animation: 'map-pulse 2s infinite ease-out',
                      transformOrigin: `${coord.x}px ${coord.y}px`
                    }}
                  />
                )}

                {}
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={isHovered ? 5.5 : isSelected ? 4.5 : 3.5}
                  fill={stats.count > 0 ? '#000000' : 'rgba(0, 255, 65, 0.1)'}
                  stroke={isSelected ? 'var(--neon-blue)' : stats.count > 0 ? 'var(--neon-green)' : 'rgba(0, 255, 65, 0.25)'}
                  strokeWidth="2"
                  style={{ 
                    transition: 'all 0.1s ease',
                    filter: isHovered || isSelected ? 'url(#map-glow)' : 'none'
                  }}
                />

                {}
                <text
                  x={coord.x}
                  y={coord.y - 8}
                  fill={isSelected ? 'var(--neon-blue)' : isHovered ? '#ffffff' : 'var(--text-muted)'}
                  fontSize="7px"
                  fontFamily="monospace"
                  textAnchor="middle"
                  style={{ opacity: isSelected || isHovered || stats.count > 0 ? 0.9 : 0.4 }}
                >
                  {key}
                </text>
              </g>
            );
          })}
        </svg>

        {}
        {hoveredHub && (
          <div style={{
            position: 'absolute',
            bottom: '4px',
            left: '4px',
            right: '4px',
            background: 'rgba(0, 0, 0, 0.95)',
            border: `1px solid ${selectedCountry === hoveredHub.key ? 'var(--neon-blue)' : 'var(--neon-green)'}`,
            padding: '5px 8px',
            fontSize: '9px',
            color: '#ffffff',
            fontFamily: 'monospace',
            pointerEvents: 'none',
            borderRadius: '2px',
            boxShadow: '0 0 10px rgba(0,0,0,0.85)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ color: 'var(--neon-green)' }}><strong>{hoveredHub.name.toUpperCase()}</strong></span>
              <span style={{ marginLeft: '10px', color: 'var(--text-muted)' }}>Top Sector: {hoveredHub.topCategory}</span>
            </div>
            <div>
              <span style={{ color: 'var(--neon-blue)' }}>SIGNALS: {hoveredHub.count}</span>
            </div>
          </div>
        )}
      </div>

      {}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '8px',
        color: 'var(--text-muted)',
        fontFamily: 'monospace'
      }}>
        <span>CLICK NODES TO FILTER LOCATION</span>
        <span>HUD TELEMETRY GRID</span>
      </div>

      {}
      <style>{`
        @keyframes map-pulse {
          0% {
            transform: scale(0.6);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
