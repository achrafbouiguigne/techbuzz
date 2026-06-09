import React, { useMemo, useState } from 'react';

export default function SentimentOscilloscope({ posts }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // 1. Get the latest 15 enriched posts, ordered by timestamp ascending (left to right)
  const timelineData = useMemo(() => {
    return [...posts]
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-15); // get the 15 most recent datagrams
  }, [posts]);

  // SVG parameters
  const width = 310;
  const height = 110;
  const paddingX = 15;
  const paddingY = 15;

  // 2. Map posts to points on the grid
  const points = useMemo(() => {
    if (timelineData.length < 2) return [];

    const stepX = (width - paddingX * 2) / (timelineData.length - 1);
    
    return timelineData.map((post, idx) => {
      const x = paddingX + idx * stepX;
      // Map confidence (0 to 1) to y coordinate (higher confidence -> higher peak / lower Y coordinate in SVG)
      const confidence = post.confidence || 0.5;
      const y = height - paddingY - confidence * (height - paddingY * 2);
      
      return {
        x,
        y,
        postData: post,
        confidence
      };
    });
  }, [timelineData, width, height]);

  // Construct SVG Path string for the line
  const pathD = useMemo(() => {
    if (points.length < 2) return '';
    // Draw a sharp tech line (segmented)
    return points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [points]);

  // Construct SVG Path string for the glowing area under the line
  const areaD = useMemo(() => {
    if (points.length < 2) return '';
    const start = points[0];
    const end = points[points.length - 1];
    const linePath = points.map(p => `L ${p.x} ${p.y}`).join(' ');
    return `M ${start.x} ${height - paddingY} L ${start.x} ${start.y} ${linePath} L ${end.x} ${height - paddingY} Z`;
  }, [points, height]);

  // Generate background grid lines
  const gridLines = useMemo(() => {
    const lines = [];
    // Horizontal grid lines
    for (let i = 1; i <= 3; i++) {
      const y = paddingY + (i * (height - paddingY * 2)) / 4;
      lines.push(<line key={`h-${i}`} x1={0} y1={y} x2={width} y2={y} stroke="rgba(0, 255, 65, 0.05)" strokeDasharray="3 3" />);
    }
    // Vertical grid lines
    for (let i = 1; i <= 4; i++) {
      const x = paddingX + (i * (width - paddingX * 2)) / 5;
      lines.push(<line key={`v-${i}`} x1={x} y1={0} x2={x} y2={height} stroke="rgba(0, 255, 65, 0.05)" strokeDasharray="3 3" />);
    }
    return lines;
  }, [width, height]);

  return (
    <div className="sentiment-oscilloscope-panel" style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '340px',
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
      backdropFilter: 'blur(5px)'
    }}>
      {/* HUD Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'between',
        alignItems: 'center',
        borderBottom: '1px dashed rgba(0, 255, 65, 0.2)',
        paddingBottom: '6px',
        width: '100%'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="blinking-dot" style={{ background: 'var(--neon-blue)', width: '6px', height: '6px' }}></span>
          <span style={{ fontSize: '11px', color: 'var(--neon-blue)', letterSpacing: '1px' }}>SENTIMENT OSCILLOSCOPE</span>
        </div>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'monospace', marginLeft: 'auto' }}>
          RATE: 1 datagram/8s
        </div>
      </div>

      {/* Screen Visualization */}
      <div style={{ 
        position: 'relative', 
        width: '100%', 
        height: `${height}px`,
        background: '#000501',
        border: '1px solid rgba(0, 255, 65, 0.1)',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        {/* Actual Sweep Line animation like radar */}
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: '2px',
          background: 'linear-gradient(to right, transparent, rgba(0, 255, 65, 0.4), transparent)',
          animation: 'radar-sweep 4s linear infinite',
          pointerEvents: 'none',
          boxShadow: '0 0 8px rgba(0, 255, 65, 0.5)'
        }}></div>

        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="oscilloscope-glow-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--neon-green)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--neon-green)" stopOpacity="0.0" />
            </linearGradient>
            <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background grid */}
          {gridLines}

          {points.length > 1 ? (
            <>
              {/* Glowing Area under path */}
              <path d={areaD} fill="url(#oscilloscope-glow-grad)" />

              {/* Connected Line path */}
              <path
                d={pathD}
                fill="none"
                stroke="var(--neon-green)"
                strokeWidth="1.8"
                style={{ filter: 'url(#line-glow)' }}
              />

              {/* Data points vertices */}
              {points.map((p, idx) => {
                const isHovered = hoveredPoint?.postData?.external_id === p.postData.external_id;
                const pointColor = p.confidence > 0.5 ? 'var(--neon-green)' : 'var(--neon-red)';
                
                return (
                  <circle
                    key={p.postData.external_id}
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 5 : 3}
                    fill="#000000"
                    stroke={pointColor}
                    strokeWidth="1.5"
                    style={{ transition: 'all 0.1s ease', cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredPoint(p)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              })}
            </>
          ) : (
            <text x="50%" y="50%" textAnchor="middle" fill="var(--text-muted)" fontSize="9px" fontFamily="monospace">
              AWAITING INCOMING DATA PACKETS...
            </text>
          )}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div style={{
            position: 'absolute',
            bottom: '4px',
            left: '4px',
            right: '4px',
            background: 'rgba(0, 0, 0, 0.95)',
            border: `1px solid ${hoveredPoint.confidence > 0.5 ? 'var(--neon-green)' : 'var(--neon-red)'}`,
            padding: '5px 8px',
            fontSize: '9px',
            color: '#ffffff',
            fontFamily: 'monospace',
            pointerEvents: 'none',
            borderRadius: '2px',
            boxShadow: '0 0 10px rgba(0,0,0,0.85)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              color: hoveredPoint.confidence > 0.5 ? 'var(--neon-green)' : 'var(--neon-red)'
            }}>
              <span><strong>[{hoveredPoint.postData.primary_category?.toUpperCase()}]</strong></span>
              <span>CONFIDENCE: {Math.round(hoveredPoint.confidence * 100)}%</span>
            </div>
            <div style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              opacity: 0.9
            }}>
              {hoveredPoint.postData.title}
            </div>
          </div>
        )}
      </div>

      {/* Footer helper */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '8px',
        color: 'var(--text-muted)',
        fontFamily: 'monospace'
      }}>
        <span>PAST SIGNALS (15)</span>
        <span>SENTIMENT DYNAMICS</span>
      </div>

      {/* Inject custom CSS keyframes dynamically */}
      <style>{`
        @keyframes radar-sweep {
          0% { transform: translateX(0); }
          100% { transform: translateX(310px); }
        }
      `}</style>
    </div>
  );
}
