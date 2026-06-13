import { useState, useEffect, useMemo } from 'react';
import { useQuery, gql } from '@apollo/client';
import Universe3D from './components/Universe3D';
import TechDAQTerminal from './components/TechDAQTerminal';
import UseCaseExplorer from './components/UseCaseExplorer';
import SentimentOscilloscope from './components/SentimentOscilloscope';
import LocationPulseMap from './components/LocationPulseMap';
import GlobalTelemetryMap from './components/GlobalTelemetryMap';
import './App.css';

const GET_DASHBOARD_DATA = gql`
  query GetDashboardData($limit: Int) {
    currentTrends {
      keyword
      count
      momentum
      avgSentiment
    }
    totalPostCount
    enrichedPosts(limit: $limit) {
      external_id
      title
      content
      primary_category
      confidence
      companies
      locations
      timestamp
      keywords {
        text
        score
      }
    }
  }
`;

function App() {
  const [currentPage, setCurrentPage] = useState('market'); 
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [selectedDomain, setSelectedDomain] = useState('All');

  
  const { data, loading, error } = useQuery(GET_DASHBOARD_DATA, {
    variables: {
      limit: 500
    },
    pollInterval: 10000 
  });

  const rawPosts = data?.enrichedPosts || [];
  const trends = data?.currentTrends || [];
  const totalPostCount = data?.totalPostCount || 0;

  
  const posts = useMemo(() => {
    let filtered = rawPosts;

    if (selectedCountry !== 'All') {
      filtered = filtered.filter(p => {
        const hasLocation = p.locations && p.locations.some(l => {
          const locLower = l.toLowerCase();
          const countryLower = selectedCountry.toLowerCase();
          if (countryLower === 'usa' && (locLower === 'usa' || locLower === 'san francisco' || locLower === 'new york' || locLower === 'silicon valley')) return true;
          if (countryLower === 'france' && (locLower === 'france' || locLower === 'paris' || locLower === 'franc' || locLower === 'pari')) return true;
          if (countryLower === 'morocco' && (locLower === 'morocco' || locLower === 'maroc' || locLower === 'casablanca' || locLower === 'rabat')) return true;
          if (countryLower === 'uk' && (locLower === 'uk' || locLower === 'london')) return true;
          if (countryLower === 'germany' && (locLower === 'germany' || locLower === 'berlin')) return true;
          return locLower.includes(countryLower);
        });
        const titleAndContent = `${p.title} ${p.content || ''}`.toLowerCase();
        const textMatches = titleAndContent.includes(selectedCountry.toLowerCase()) ||
          (selectedCountry.toLowerCase() === 'morocco' && titleAndContent.includes('maroc')) ||
          (selectedCountry.toLowerCase() === 'france' && titleAndContent.includes('french'));
        return hasLocation || textMatches;
      });
    }

    if (selectedDomain !== 'All') {
      filtered = filtered.filter(p => {
        const text = `${p.title} ${p.content || ''}`.toLowerCase();
        const domainLower = selectedDomain.toLowerCase();
        if (domainLower === 'mobile') {
          return p.primary_category === 'Mobile' || text.includes('mobile') || text.includes('flutter') || text.includes('react native') || text.includes('kotlin') || text.includes('swift');
        }
        if (domainLower === 'frontend') {
          return p.primary_category === 'Frontend' || text.includes('react') || text.includes('frontend') || text.includes('vue') || text.includes('angular') || text.includes('css') || text.includes('svelte');
        }
        if (domainLower === 'backend') {
          return p.primary_category === 'Backend' || text.includes('backend') || text.includes('express') || text.includes('django') || text.includes('flask') || text.includes('node') || text.includes('spring');
        }
        if (domainLower === 'databases') {
          return p.primary_category === 'Database' || text.includes('mongodb') || text.includes('redis') || text.includes('cassandra') || text.includes('sql') || text.includes('nosql') || text.includes('database');
        }
        if (domainLower === 'ai') {
          return p.primary_category === 'AI' || text.includes('ai') || text.includes('machine learning') || text.includes('neural') || text.includes('llm') || text.includes('deberta');
        }
        if (domainLower === 'devops') {
          return p.primary_category === 'DevOps' || text.includes('kubernetes') || text.includes('docker') || text.includes('terraform') || text.includes('devops') || text.includes('ci/cd') || text.includes('pipelines');
        }
        if (domainLower === 'security') {
          return p.primary_category === 'Security' || text.includes('security') || text.includes('cybersecurity') || text.includes('vulnerabilit') || text.includes('exploit');
        }
        if (domainLower === 'dataeng') {
          return p.primary_category === 'DataEng' || text.includes('pandas') || text.includes('seaborn') || text.includes('data science') || text.includes('data engineering');
        }
        if (domainLower === 'iot') {
          return text.includes('arduino') || text.includes('embedded') || text.includes('iot');
        }
        return false;
      });
    }

    if (selectedCategory && selectedCountry === 'All' && selectedDomain === 'All') {
      filtered = filtered.filter(p => {
        const titleAndContent = `${p.title} ${p.content || ''}`.toLowerCase();
        const matchesKeyword = titleAndContent.includes(selectedCategory.toLowerCase());
        const matchesCategory = p.primary_category && p.primary_category.toLowerCase() === selectedCategory.toLowerCase();
        return matchesKeyword || matchesCategory;
      });
    }

    return filtered;
  }, [rawPosts, selectedCountry, selectedDomain, selectedCategory]);

  if (error) {
    return (
      <div className="loading-screen">
        <h2 className="glitch-text" data-text="TELEMETRY CORE ERROR">TELEMETRY CORE ERROR</h2>
        <p style={{ color: 'var(--accent-red)', marginTop: '10px' }}>{error.message}</p>
      </div>
    );
  }

  return (
    <>
      {loading && rawPosts.length === 0 && (
        <div className="loading-screen">
          <div className="loader"></div>
          <h2 className="glitch-text" data-text="BOOTING TELEMETRY CORE...">BOOTING TELEMETRY CORE...</h2>
        </div>
      )}

      {}
      <div className="nav-header">
        <button
          onClick={() => setCurrentPage('market')}
          className={`nav-button ${currentPage === 'market' ? 'active' : ''}`}
        >
          MARKET TERMINAL
        </button>
        <button
          onClick={() => setCurrentPage('career')}
          className={`nav-button ${currentPage === 'career' ? 'active' : ''}`}
        >
          CAREER NAVIGATOR
        </button>
        <button
          onClick={() => setCurrentPage('telemetry')}
          className={`nav-button ${currentPage === 'telemetry' ? 'active' : ''}`}
        >
          TELEMETRY GRID
        </button>
      </div>

      {currentPage === 'market' && (
        <>
          <TechDAQTerminal
            trends={trends}
            totalPosts={totalPostCount}
            selectedCategory={selectedCategory}
            onCategoryChange={(cat) => {
              setSelectedCategory(cat);
              if (cat) {
                setSelectedCountry('All');
                setSelectedDomain('All');
              }
            }}
            selectedCountry={selectedCountry}
            setSelectedCountry={(c) => {
              setSelectedCountry(c);
              if (c !== 'All') {
                setSelectedCategory(null);
              }
            }}
            selectedDomain={selectedDomain}
            setSelectedDomain={(d) => {
              setSelectedDomain(d);
              if (d !== 'All') {
                setSelectedCategory(null);
              }
            }}
            posts={posts}
          />

          {selectedPost && (
            <div className="glass-panel post-detail techdaq-panel">
              <button className="close-btn" onClick={() => setSelectedPost(null)}>×</button>
              <h3 className="post-title">{selectedPost.title}</h3>

              <div className="badge-container">
                <span className="badge category">{selectedPost.primary_category}</span>
              </div>

              <p className="post-description">
                {selectedPost.content?.substring(0, 200)}...
              </p>

              <div className="sentiment-bar-container">
                <div
                  className="sentiment-fill"
                  style={{
                    width: `${Math.max(10, selectedPost.confidence * 100)}%`,
                    background: selectedPost.confidence > 0.5 ? 'var(--accent-green)' : 'var(--accent-red)'
                  }}
                ></div>
              </div>
              <div className="sentiment-label">
                <span className="sentiment-index-title">CONFIDENCE INDEX</span>
                <span className={`sentiment-index-value ${selectedPost.confidence > 0.5 ? 'positive' : 'negative'}`}>
                  {(selectedPost.confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          )}

          <div className="graph-container">
            <Universe3D posts={posts} onNodeClick={setSelectedPost} />
          </div>

          <SentimentOscilloscope posts={posts} />
          <LocationPulseMap posts={posts} selectedCountry={selectedCountry} setSelectedCountry={setSelectedCountry} />
        </>
      )}

      {currentPage === 'career' && (
        <div style={{
          padding: '20px',
          maxWidth: '1200px',
          margin: '30px auto 0 auto',
          position: 'relative',
          zIndex: 10
        }}>
          <UseCaseExplorer
            selectedCountry={selectedCountry}
            setSelectedCountry={setSelectedCountry}
            selectedDomain={selectedDomain}
            setSelectedDomain={setSelectedDomain}
          />
        </div>
      )}

      {currentPage === 'telemetry' && (
        <GlobalTelemetryMap posts={rawPosts} trends={trends} />
      )}
    </>
  );
}

export default App;
