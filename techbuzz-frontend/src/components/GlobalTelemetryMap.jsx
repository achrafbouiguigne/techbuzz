import React, { useMemo, useState, useEffect } from 'react';
import { useQuery, gql } from '@apollo/client';

const GET_LSTM_PREDICTIONS = gql`
  query GetLstmPredictions {
    predictTrends {
      keyword
      historical {
        date
        count
      }
      forecast {
        date
        count
      }
      confidenceScore
    }
  }
`;

export default function GlobalTelemetryMap({ posts = [], trends = [] }) {
  
  
  
  const uniquePosts = useMemo(() => {
    const seen = new Set();
    return posts.filter(p => {
      if (!p.external_id) return true;
      if (seen.has(p.external_id)) return false;
      seen.add(p.external_id);
      return true;
    });
  }, [posts]);

  
  
  
  const [selectedForecastKeyword, setSelectedForecastKeyword] = useState('');
  const [hoveredForecastPoint, setHoveredForecastPoint] = useState(null);

  
  const { data: lstmData, loading: lstmLoading, error: lstmError } = useQuery(GET_LSTM_PREDICTIONS, {
    pollInterval: 300000 
  });

  const predictions = lstmData?.predictTrends || [];

  
  useEffect(() => {
    if (predictions && predictions.length > 0 && !selectedForecastKeyword) {
      setSelectedForecastKeyword(predictions[0].keyword);
    }
  }, [predictions, selectedForecastKeyword]);

  
  const getPostSource = (post) => {
    if (post.external_id?.startsWith('devto_')) return 'Dev.to';
    if (post.external_id?.startsWith('hn_')) return 'Hacker News';
    return 'Reddit';
  };

  
  
  
  const globalKPIs = useMemo(() => {
    const total = uniquePosts.length;
    let devto = 0;
    let hn = 0;
    let reddit = 0;

    uniquePosts.forEach(p => {
      const src = getPostSource(p);
      if (src === 'Dev.to') devto++;
      else if (src === 'Hacker News') hn++;
      else reddit++;
    });

    return {
      total,
      devto,
      hn,
      reddit,
      activeSources: [
        { name: 'Dev.to Scraper', count: devto, color: '#10b981' },
        { name: 'Hacker News API', count: hn, color: '#3b82f6' },
        { name: 'Reddit Streams', count: reddit, color: '#f43f5e' }
      ]
    };
  }, [uniquePosts]);

  
  
  
  const activeForecast = useMemo(() => {
    if (!predictions || predictions.length === 0) return null;
    return predictions.find(p => p.keyword === selectedForecastKeyword) || predictions[0];
  }, [predictions, selectedForecastKeyword]);

  const forecastPoints = useMemo(() => {
    if (!activeForecast) return { historical: [], forecast: [], all: [], maxVal: 5 };
    
    const hist = activeForecast.historical;
    const fore = activeForecast.forecast;
    const allPoints = [...hist, ...fore];
    const maxVal = Math.max(...allPoints.map(p => p.count), 5);

    
    const w = 640;
    const h = 180;
    const padX = 20;
    const padY = 20;

    const mapPoints = (arr, offsetIdx) => {
      return arr.map((p, idx) => {
        const globalIdx = offsetIdx + idx;
        const x = padX + (globalIdx / (allPoints.length - 1)) * (w - padX * 2);
        const y = (h - padY) - (p.count / maxVal) * (h - padY * 2);
        return { x, y, count: p.count, date: p.date, idx: globalIdx };
      });
    };

    const mappedHist = mapPoints(hist, 0);
    const mappedFore = mapPoints(fore, hist.length);

    return {
      historical: mappedHist,
      forecast: mappedFore,
      all: [...mappedHist, ...mappedFore],
      maxVal
    };
  }, [activeForecast]);

  
  const linePaths = useMemo(() => {
    if (forecastPoints.all.length === 0) return { historical: '', forecast: '' };

    const makePath = (points) => {
      if (points.length === 0) return '';
      return points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    };

    const histPath = makePath(forecastPoints.historical);
    const forePoints = forecastPoints.historical.length > 0
      ? [forecastPoints.historical[forecastPoints.historical.length - 1], ...forecastPoints.forecast]
      : forecastPoints.forecast;
    const forePath = makePath(forePoints);

    return {
      historical: histPath,
      forecast: forePath
    };
  }, [forecastPoints]);

  
  const getForecastInsight = () => {
    if (!activeForecast) return '';
    const histValues = activeForecast.historical.map(p => p.count);
    const foreValues = activeForecast.forecast.map(p => p.count);
    
    const histAvg = histValues.reduce((sum, v) => sum + v, 0) / (histValues.length || 1);
    const foreAvg = foreValues.reduce((sum, v) => sum + v, 0) / (foreValues.length || 1);
    const foreMax = Math.max(...foreValues, 0);

    const keywordUpper = activeForecast.keyword.toUpperCase();

    let trendDirection = 'stable';
    if (foreAvg > histAvg * 1.15) {
      trendDirection = 'upward';
    } else if (foreAvg < histAvg * 0.85) {
      trendDirection = 'downward';
    }

    if (trendDirection === 'upward') {
      return `Discussion density is showing positive velocity. Volume is projected to expand, peaking at a target demand level of ${foreMax.toFixed(0)} active threads over the next 7 days.`;
    } else if (trendDirection === 'downward') {
      return `Mentions are showing cooling signals. Discussion volume is projected to drop below historical means, establishing a baseline consolidation floor around ${foreAvg.toFixed(0)} daily threads.`;
    } else {
      return `Discussion frequency signals remain stable. Search volume is projected to fluctuate within historical channels, maintaining a mean rate of ${foreAvg.toFixed(0)} mentions per day.`;
    }
  };

  return (
    <div className="infographic-page" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '24px',
      background: 'var(--bg-color)',
      backgroundImage: 'radial-gradient(circle at top, #0c0d10 0%, #050608 100%)',
      minHeight: 'calc(100vh - 55px)',
      fontFamily: '"Inter", sans-serif',
      boxSizing: 'border-box',
      color: '#f1f5f9',
      overflowY: 'auto'
    }}>
      
      {}
      {}
      {}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
            TECH DEMAND INDEX
          </h1>
          <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
            Real-time developer discussion aggregation and 7-day future demand projections.
          </span>
        </div>

        {}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {globalKPIs.activeSources.map(src => (
            <div key={src.name} style={{
              background: 'rgba(30, 41, 59, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '11px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: src.color }}></span>
              <span style={{ color: '#94a3b8', fontWeight: 500 }}>{src.name}:</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>{src.count} items</span>
            </div>
          ))}
        </div>
      </div>

      {}
      {}
      {}
      <div style={{
        background: 'var(--bg-panel)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', paddingBottom: '16px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.05em' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-blue)' }}></span>
            7-DAY DEMAND FORECAST & TREND PROJECTION
          </h2>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Statistical forecast model output showing discussion signals and 7-day projected trajectories.
          </p>
        </div>

        {lstmLoading && predictions.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              Calculating projection vectors on historical feeds...
            </span>
          </div>
        ) : activeForecast ? (
          <div style={{
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap'
          }}>
            {}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              flex: '0 0 200px',
              borderRight: '1px solid rgba(255, 255, 255, 0.05)',
              paddingRight: '16px'
            }}>
              <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '6px', textTransform: 'uppercase' }}>
                Select Tech Feed
              </span>
              {predictions.map(p => (
                <button
                  key={p.keyword}
                  onClick={() => setSelectedForecastKeyword(p.keyword)}
                  style={{
                    background: selectedForecastKeyword === p.keyword ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                    border: `1px solid ${selectedForecastKeyword === p.keyword ? 'var(--border-active)' : 'transparent'}`,
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: selectedForecastKeyword === p.keyword ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    textTransform: 'uppercase',
                    fontFamily: 'inherit',
                    transition: 'all var(--transition-fast) ease',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedForecastKeyword !== p.keyword) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedForecastKeyword !== p.keyword) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  <span style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: selectedForecastKeyword === p.keyword ? 'var(--accent-blue)' : 'var(--text-muted)'
                  }}></span>
                  {p.keyword}
                </button>
              ))}
            </div>

            {}
            <div style={{
              flex: '2.2',
              minWidth: '400px',
              background: 'var(--bg-card)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              borderRadius: '8px',
              padding: '16px',
              position: 'relative'
            }}>
              <svg width="100%" height="200" viewBox="0 0 640 200" style={{ overflow: 'visible' }}>
                {}
                <line x1="20" y1="20" x2="620" y2="20" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                <line x1="20" y1="90" x2="620" y2="90" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                <line x1="20" y1="160" x2="620" y2="160" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />

                {}
                {forecastPoints.historical.length > 0 && (
                  <g>
                    <line 
                      x1={forecastPoints.historical[forecastPoints.historical.length - 1].x} 
                      y1="10" 
                      x2={forecastPoints.historical[forecastPoints.historical.length - 1].x} 
                      y2="170" 
                      stroke="#3b82f6" 
                      strokeWidth="1.2" 
                      strokeDasharray="2,2" 
                    />
                    <text 
                      x={forecastPoints.historical[forecastPoints.historical.length - 1].x - 8} 
                      y="185" 
                      fill="#3b82f6" 
                      fontSize="9px" 
                      fontWeight="bold" 
                      textAnchor="end"
                    >
                      TODAY
                    </text>
                    <text 
                      x={forecastPoints.historical[forecastPoints.historical.length - 1].x + 8} 
                      y="185" 
                      fill="#10b981" 
                      fontSize="9px" 
                      fontWeight="bold" 
                      textAnchor="start"
                    >
                      7-DAY PROJECTION →
                    </text>
                  </g>
                )}

                {}
                <path d={linePaths.historical} fill="none" stroke="#64748b" strokeWidth="1.8" />
                <path d={linePaths.forecast} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="3,3" />

                {}
                {forecastPoints.all.map(pt => {
                  const isForecast = pt.idx >= activeForecast.historical.length;
                  const isHovered = hoveredForecastPoint && hoveredForecastPoint.idx === pt.idx;

                  return (
                    <g key={pt.idx}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 5.5 : 3}
                        fill={isForecast ? '#10b981' : '#64748b'}
                        stroke="var(--bg-card)"
                        strokeWidth="1"
                        style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                        onMouseEnter={() => setHoveredForecastPoint(pt)}
                        onMouseLeave={() => setHoveredForecastPoint(null)}
                      />
                    </g>
                  );
                })}

                {}
                {hoveredForecastPoint && (
                  <g transform={`translate(${hoveredForecastPoint.x}, ${hoveredForecastPoint.y})`} style={{ pointerEvents: 'none' }}>
                    <rect
                      x="10"
                      y="-45"
                      width="100"
                      height="36"
                      rx="4"
                      fill="#0d131f"
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="1"
                    />
                    <text
                      x="18"
                      y="-33"
                      fill="#64748b"
                      fontSize="8px"
                      fontWeight="600"
                    >
                      {hoveredForecastPoint.date}
                    </text>
                    <text
                      x="18"
                      y="-21"
                      fill="#fff"
                      fontSize="9px"
                      fontWeight="bold"
                    >
                      Mentions: {hoveredForecastPoint.count}
                    </text>
                  </g>
                )}
              </svg>
            </div>

            {}
            <div style={{
              flex: '1',
              minWidth: '240px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Signal Strength</span>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{activeForecast.confidenceScore}%</span>
                <span style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>Model validation convergence index</span>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Projection Insights</span>
                <div style={{ fontSize: '11px', lineHeight: '1.4', color: '#94a3b8' }}>
                  {getForecastInsight()}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
