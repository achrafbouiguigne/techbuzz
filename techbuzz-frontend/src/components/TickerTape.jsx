import React from 'react';

export default function TickerTape({ trends }) {
  if (!trends || trends.length === 0) return null;

  const sortedTrends = [...trends].sort((a, b) => b.momentum - a.momentum);

  return (
    <div className="ticker-wrap">
      <div className="ticker">
        {sortedTrends.map(trend => {
          const isPositive = trend.momentum >= 0;
          return (
            <div key={trend.keyword} className="ticker__item">
              <span className="ticker-keyword">{trend.keyword.toUpperCase()}</span>
              <span className={`ticker-momentum ${isPositive ? 'bull' : 'bear'}`}>
                {isPositive ? '▲' : '▼'} {Math.abs(trend.momentum)}
              </span>
              <span className="ticker-separator">///</span>
            </div>
          );
        })}
        {/* Duplicate for infinite seamless scrolling */}
        {sortedTrends.map(trend => {
          const isPositive = trend.momentum >= 0;
          return (
            <div key={`${trend.keyword}-dup`} className="ticker__item">
              <span className="ticker-keyword">{trend.keyword.toUpperCase()}</span>
              <span className={`ticker-momentum ${isPositive ? 'bull' : 'bear'}`}>
                {isPositive ? '▲' : '▼'} {Math.abs(trend.momentum)}
              </span>
              <span className="ticker-separator">///</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
