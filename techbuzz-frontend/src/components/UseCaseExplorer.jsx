import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, gql } from '@apollo/client';
import ForceGraph3D from 'react-force-graph-3d';

const COUNTRIES = [
  { value: 'All', label: 'All Countries' },
  { value: 'Morocco', label: 'Morocco' },
  { value: 'France', label: 'France' },
  { value: 'USA', label: 'United States' },
  { value: 'Germany', label: 'Germany' },
  { value: 'Canada', label: 'Canada' },
  { value: 'India', label: 'India' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'Remote', label: 'Remote' }
];

const DOMAINS = [
  { value: 'All', label: 'All Domains' },
  { value: 'Mobile', label: 'Mobile Dev' },
  { value: 'Frontend', label: 'Frontend Web' },
  { value: 'Backend', label: 'Backend Web' },
  { value: 'Databases', label: 'Databases / DBA' },
  { value: 'AI', label: 'AI & Machine Learning' },
  { value: 'DevOps', label: 'DevOps & Cloud' },
  { value: 'Security', label: 'Cybersecurity' },
  { value: 'DataEng', label: 'Data Engineering' },
  { value: 'IoT', label: 'IoT & Embedded (Arduino)' }
];

const GET_AI_RECOMMENDATION = gql`
  query GetAiRecommendation($country: String!, $domain: String!) {
    aiRecommendation(country: $country, domain: $domain) {
      framework
      details
      roadmap {
        name
        type
        description
      }
    }
  }
`;

export default function UseCaseExplorer({ selectedCountry, setSelectedCountry, selectedDomain, setSelectedDomain }) {
  const { data, loading, error } = useQuery(GET_AI_RECOMMENDATION, {
    variables: { country: selectedCountry, domain: selectedDomain }
  });

  const insights = data?.aiRecommendation;
  const hasFilter = selectedCountry !== 'All' || selectedDomain !== 'All';

  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 400, height: 350 });
  const [hoveredNode, setHoveredNode] = useState(null);

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          const { width } = entry.contentRect;
          setDimensions({ width: width || 400, height: 350 });
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [insights]);

  const graphData = useMemo(() => {
    if (!insights || !insights.roadmap || insights.roadmap.length === 0) {
      return { nodes: [], links: [] };
    }
    
    const nodes = insights.roadmap.map((step, idx) => ({
      id: `step_${idx}`,
      name: step.name,
      type: step.type,
      description: step.description,
      color: step.type === 'fundamental' ? '#00ffff' :
             step.type === 'core' ? '#00ff41' :
             step.type === 'advanced' ? '#bc13fe' : '#ff003c',
      val: 8
    }));

    const links = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      links.push({
        source: nodes[i].id,
        target: nodes[i + 1].id
      });
    }

    return { nodes, links };
  }, [insights]);

  return (
    <div className="usecase-explorer-page">
      {/* Left Column: Controls & Text Recommendations */}
      <div className="explorer-left-col glass-panel">
        <h3 className="section-title">
          CAREER VECTOR CRITERIA
        </h3>
        
        <div className="selectors">
          <div className="select-group">
            <label>TARGET COUNTRY</label>
            <select 
              value={selectedCountry} 
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="explorer-select"
            >
              {COUNTRIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="select-group">
            <label>TECH DOMAIN</label>
            <select 
              value={selectedDomain} 
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="explorer-select"
            >
              {DOMAINS.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>

        {hasFilter && (
          <button 
            onClick={() => {
              setSelectedCountry('All');
              setSelectedDomain('All');
            }}
            className="reset-filters-btn"
          >
            RESET SEARCH FILTERS
          </button>
        )}

        {loading ? (
          <div className="loading-recommendation">
            <span className="blinking-dot" style={{ marginRight: '6px' }}></span>
            RUNNING LIVE TELEMETRY MATCH...
          </div>
        ) : error ? (
          <div className="error-recommendation">
            ERROR IN ANALYSIS: {error.message}
          </div>
        ) : insights ? (
          <div className="usecase-recommendation">
            <h4 className="recommendation-header">
              CAREER PATH SCHEMATIC ANALYSIS
            </h4>
            <div className="recommendation-content">
              <strong className="recommendation-primary-target">Primary Target:</strong> <span className="recommendation-primary-value">{insights.framework}</span>
              <p className="recommendation-details">
                {insights.details}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Right Column: 3D Visualization Map & Skill Description */}
      <div className="explorer-right-col glass-panel">
        <h3 className="section-title">
          DYNAMIC 3D ROADMAP CONSTELLATION
        </h3>

        {insights && insights.roadmap && insights.roadmap.length > 0 ? (
          <>
            <div ref={containerRef} className="graph-constellation-container">
              <ForceGraph3D
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData}
                nodeId="id"
                nodeLabel="name"
                nodeColor="color"
                nodeVal="val"
                nodeRelSize={5}
                nodeResolution={16}
                linkColor={() => 'rgba(255, 255, 255, 0.15)'}
                linkWidth={1.5}
                backgroundColor="#06090e"
                onNodeHover={node => setHoveredNode(node)}
                enableNavigationControls={true}
                showNavInfo={false}
              />
              <div className="graph-info-overlay">
                PAN/DRAG TO EXPLORE MAP
              </div>
            </div>
            
            <div className="hovered-node-detail">
              {hoveredNode ? (
                <div>
                  <div className="hovered-node-header" style={{ color: hoveredNode.color }}>
                    [{hoveredNode.type}] {hoveredNode.name}
                  </div>
                  <div className="hovered-node-description">
                    {hoveredNode.description}
                  </div>
                </div>
              ) : (
                <div className="hovered-node-placeholder">
                  HOVER MOUSE OVER ANY CONSTELLATION NODE TO STUDY REQUIRED SKILLS
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="awaiting-constellation">
            Awaiting system vector calculations...
          </div>
        )}
      </div>
    </div>
  );
}
