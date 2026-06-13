import React, { useMemo, useState } from 'react';


const CATEGORY_COLORS = {
  "AI": "#00ff41", 
  "Frontend": "#00ffff", 
  "Backend": "#ff003c", 
  "DevOps": "#bc13fe", 
  "Database": "#ffaa00", 
  "Languages": "#ffff00", 
  "Security": "#ff0000", 
  "Mobile": "#0066ff", 
  "DataEng": "#00f0ff", 
  "Other": "#ffffff" 
};

export default function SectorRadar({ posts, onSelectCategory, selectedCategory }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  
  const radarData = useMemo(() => {
    const stats = {};
    let maxCount = 1;

    posts.forEach(post => {
      const cat = post.primary_category || 'Other';
      if (!stats[cat]) {
        stats[cat] = { count: 0, sentimentSum: 0, confidenceSum: 0 };
      }
      stats[cat].count++;
      stats[cat].sentimentSum += post.confidence || 0.5; 
      stats[cat].confidenceSum += post.confidence || 0.5;
    });

    const categories = Object.keys(stats).filter(c => c !== 'Other').slice(0, 7); 
    if (categories.length < 3) {
      
      ['AI', 'Frontend', 'Backend', 'DevOps', 'Database', 'Mobile', 'Languages'].forEach(c => {
        if (!stats[c]) stats[c] = { count: 0, sentimentSum: 0, confidenceSum: 0 };
      });
      categories.push(...['AI', 'Frontend', 'Backend', 'DevOps', 'Database', 'Mobile', 'Languages'].filter(c => !categories.includes(c)));
    }

    categories.forEach(cat => {
      if (stats[cat].count > maxCount) {
        maxCount = stats[cat].count;
      }
    });

    return categories.map(cat => {
      const count = stats[cat].count || 0;
      const score = maxCount > 0 ? (count / maxCount) : 0;
      const avgSentiment = count > 0 ? (stats[cat].sentimentSum / count) : 0.5;
      return {
        name: cat,
        value: Math.max(0.15, score), 
        count,
        avgSentiment
      };
    });
  }, [posts]);

  
  const size = 260;
  const center = size / 2;
  const maxRadius = size * 0.38;

  
  const polygonPoints = useMemo(() => {
    const numPoints = radarData.length;
    return radarData.map((d, i) => {
      const angle = (i * 2 * Math.PI) / numPoints - Math.PI / 2;
      const radius = d.value * maxRadius;
      return {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
        name: d.name,
        count: d.count,
        sentiment: d.avgSentiment
      };
    });
  }, [radarData, center, maxRadius]);

  
  const grids = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <div className="sector-radar-chart" style={{
      padding: '10px 0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      borderTop: '1px solid rgba(0, 255, 65, 0.15)',
      marginTop: '15px'
    }}>
      <h4 style={{
        alignSelf: 'flex-start',
        fontSize: '11px',
        color: 'var(--text-muted)',
        letterSpacing: '1px',
        marginBottom: '10px',
        textTransform: 'uppercase'
      }}>
        Sector Metrics Radar
      </h4>

      <div style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
        <svg width={size} height={size} style={{ overflow: 'visible' }}>
          <defs>
            {}
            <filter id="radar-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {}
          {grids.map((gridVal, gIdx) => {
            const pointsStr = radarData.map((_, i) => {
              const angle = (i * 2 * Math.PI) / radarData.length - Math.PI / 2;
              const r = gridVal * maxRadius;
              const x = center + r * Math.cos(angle);
              const y = center + r * Math.sin(angle);
              return `${x},${y}`;
            }).join(' ');

            return (
              <polygon
                key={gIdx}
                points={pointsStr}
                fill="none"
                stroke="rgba(0, 255, 65, 0.08)"
                strokeWidth="1"
              />
            );
          })}

          {}
          {radarData.map((_, i) => {
            const angle = (i * 2 * Math.PI) / radarData.length - Math.PI / 2;
            const xOuter = center + maxRadius * Math.cos(angle);
            const yOuter = center + maxRadius * Math.sin(angle);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={xOuter}
                y2={yOuter}
                stroke="rgba(0, 255, 65, 0.08)"
                strokeWidth="1"
              />
            );
          })}

          {}
          <polygon
            points={polygonPoints.map(p => `${p.x},${p.y}`).join(' ')}
            fill="rgba(0, 255, 65, 0.12)"
            stroke="var(--neon-green)"
            strokeWidth="1.5"
            style={{ filter: 'url(#radar-glow)' }}
          />

          {}
          {polygonPoints.map((p, i) => {
            const color = CATEGORY_COLORS[p.name] || '#ffffff';
            const isSelected = selectedCategory === p.name;
            const isHovered = hoveredPoint?.name === p.name;

            return (
              <g
                key={p.name}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectCategory(isSelected ? null : p.name)}
                onMouseEnter={() => setHoveredPoint(p)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : isSelected ? 5 : 4}
                  fill="#000000"
                  stroke={color}
                  strokeWidth="2"
                  style={{
                    transition: 'all 0.1s ease',
                    filter: isHovered || isSelected ? 'url(#radar-glow)' : 'none'
                  }}
                />

                {}
                {(() => {
                  const angle = (i * 2 * Math.PI) / radarData.length - Math.PI / 2;
                  const labelRadius = maxRadius + 16;
                  const xText = center + labelRadius * Math.cos(angle);
                  const yText = center + labelRadius * Math.sin(angle) + 4; 

                  
                  let textAnchor = "middle";
                  if (Math.cos(angle) > 0.2) textAnchor = "start";
                  if (Math.cos(angle) < -0.2) textAnchor = "end";

                  return (
                    <text
                      x={xText}
                      y={yText}
                      fill={isSelected ? 'var(--neon-blue)' : isHovered ? '#ffffff' : 'var(--text-main)'}
                      fontSize="9px"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      textAnchor={textAnchor}
                      style={{
                        fontFamily: 'Share Tech Mono, monospace',
                        opacity: isHovered || isSelected ? 1.0 : 0.65,
                        transition: 'opacity 0.2s'
                      }}
                    >
                      {p.name.toUpperCase()}
                    </text>
                  );
                })()}
              </g>
            );
          })}
        </svg>

        {}
        {hoveredPoint && (
          <div style={{
            position: 'absolute',
            top: '4px',
            left: '4px',
            background: 'rgba(0, 0, 0, 0.9)',
            border: `1px solid ${CATEGORY_COLORS[hoveredPoint.name] || 'var(--neon-green)'}`,
            padding: '4px 8px',
            fontSize: '9px',
            color: '#ffffff',
            fontFamily: 'monospace',
            pointerEvents: 'none',
            borderRadius: '2px',
            boxShadow: '0 0 10px rgba(0,0,0,0.8)'
          }}>
            <div style={{ color: CATEGORY_COLORS[hoveredPoint.name] }}><strong>{hoveredPoint.name.toUpperCase()}</strong></div>
            <div>DATAGRAMS: {hoveredPoint.count}</div>
            <div>SENTIMENT: {Math.round(hoveredPoint.sentiment * 100)}%</div>
          </div>
        )}
      </div>

      <div style={{
        fontSize: '9px',
        color: 'var(--text-muted)',
        marginTop: '5px',
        textAlign: 'center'
      }}>
        * Click vertices to filter 3D Universe sectors
      </div>
    </div>
  );
}
