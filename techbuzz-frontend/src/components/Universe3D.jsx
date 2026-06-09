import React, { useMemo, useRef, useCallback } from 'react';
import ForceGraph3D from 'react-force-graph-3d';

// Cyberpunk color palette
const CATEGORY_COLORS = {
  "AI": "#00ff41", // Neon Green
  "Frontend": "#00ffff", // Cyan
  "Backend": "#ff003c", // Crimson Red
  "DevOps": "#bc13fe", // Purple
  "Database": "#ffaa00", // Orange
  "Languages": "#ffff00", // Yellow
  "Security": "#ff0000", // Red
  "Mobile": "#0066ff", // Blue
  "DataEng": "#00f0ff", // Bright Cyan
  "Other": "#ffffff" // White
};

export default function Universe3D({ posts, onNodeClick }) {
  const fgRef = useRef();

  const graphData = useMemo(() => {
    const nodes = [];
    const links = [];

    // 1. Create a "Sector Hub" node for each active category
    const activeCategories = new Set(posts.map(p => p.primary_category));
    
    activeCategories.forEach(cat => {
      nodes.push({
        id: `cat_${cat}`,
        name: `${cat.toUpperCase()} HUB`,
        group: 'category',
        color: CATEGORY_COLORS[cat] || '#ffffff',
        val: 25 // Make Sector Hubs massive
      });
    });

    // 2. Create Data Packets (posts) orbiting the Hubs
    posts.forEach(post => {
      // Determine color based on sentiment (confidence > 0.5 is green, else red)
      const isPositive = post.confidence > 0.5;
      
      nodes.push({
        id: post.external_id,
        name: post.title,
        group: 'post',
        postData: post,
        val: 3, // Data packets are small
        color: isPositive ? '#00ff41' : '#ff003c'
      });

      links.push({
        source: post.external_id,
        target: `cat_${post.primary_category}`,
        value: 1
      });
    });

    return { nodes, links };
  }, [posts]);

  const handleNodeClick = useCallback(node => {
    console.log('[Universe3D] Node clicked:', node);
    if (node.group === 'category') {
      console.log('[Universe3D] Category node clicked, positioning camera...');
      const distance = 120;
      const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
      if (fgRef.current) {
        fgRef.current.cameraPosition(
          { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
          node, 
          1500
        );
      }
    } else if (node.group === 'post') {
      console.log('[Universe3D] Post node clicked, forwarding data:', node.postData);
      onNodeClick(node.postData);
    }
  }, [onNodeClick]);

  return (
    <ForceGraph3D
      ref={fgRef}
      graphData={graphData}
      nodeId="id"
      nodeLabel="name"
      nodeColor="color"
      nodeVal="val"
      nodeRelSize={4}
      nodeResolution={16} // Lower res for wireframe/hacker feel
      linkColor={() => 'rgba(0, 255, 65, 0.15)'} // Faint neon green streams
      linkWidth={0.5}
      backgroundColor="#000000" // Pitch black
      onNodeClick={handleNodeClick}
      d3Force="charge"
      d3AlphaDecay={0.02}
      d3VelocityDecay={0.2}
      // Added bloom effect simulated via node rendering if needed, 
      // but native colors will look great on #000000.
    />
  );
}
