import React from 'react';
import SectorRadar from './SectorRadar';

export default function TechDAQTerminal({ trends, totalPosts, selectedCategory, onCategoryChange, selectedCountry, setSelectedCountry, selectedDomain, setSelectedDomain, posts }) {
  
  const sortedTrends = [...(trends || [])].sort((a, b) => b.momentum - a.momentum);

  return (
    <div className="techdaq-terminal">
      <div className="terminal-header">
        <h2 className="glitch-text" data-text="TechDAQ [LIVE]">TechDAQ [LIVE]</h2>
        <div className="status-indicator">
          <span className="blinking-dot"></span>
          <span>MARKET OPEN</span>
        </div>
      </div>

      <div className="terminal-stats">
        <div className="stat-box">
          <span className="stat-label">TOTAL DATAGRAMS</span>
          <span className="stat-value">{totalPosts}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">ACTIVE NODES</span>
          <span className="stat-value">{sortedTrends.length}</span>
        </div>
      </div>

      <div className="market-movers">
        <h3 className="section-title">TOP MARKET MOVERS</h3>
        <div className="trend-list">
          {sortedTrends.length === 0 ? (
            <div className="scanline-text">Awaiting market data...</div>
          ) : (
            sortedTrends.slice(0, 10).map((trend, idx) => {
              const isPositive = trend.momentum >= 0;
              return (
                <div 
                  key={trend.keyword} 
                  className={`trend-item ${selectedCategory === trend.keyword ? 'selected' : ''}`}
                  onClick={() => onCategoryChange(selectedCategory === trend.keyword ? null : trend.keyword)}
                >
                  <span className="trend-rank">{String(idx + 1).padStart(2, '0')}</span>
                  <span className="trend-keyword">{trend.keyword.toUpperCase()}</span>
                  <span className="trend-count">VOL {trend.count}</span>
                  <span className={`trend-momentum ${isPositive ? 'bull' : 'bear'}`}>
                    {isPositive ? '▲' : '▼'} {Math.abs(trend.momentum)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedCategory && (
        <div className="sector-filter-active">
          <span>FILTER: {selectedCategory.toUpperCase()}</span>
          <button onClick={() => onCategoryChange(null)}>CLEAR</button>
        </div>
      )}

      {posts && posts.length > 0 && (
        <SectorRadar 
          posts={posts} 
          selectedCategory={selectedCategory} 
          onSelectCategory={onCategoryChange} 
        />
      )}
    </div>
  );
}
