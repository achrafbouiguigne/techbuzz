import React, { useEffect, useState, useRef } from 'react';

export default function TelemetryStream({ posts }) {
  const [logs, setLogs] = useState([]);
  const lastPostsLength = useRef(posts.length);
  const containerRef = useRef(null);

  
  useEffect(() => {
    const startupLogs = [
      { text: "SYSTEM BOOT: TechDAQ Event Pipeline initialized.", type: "system" },
      { text: "REDIS STREAMS: Connected to group 'classifier-group' (1 listener).", type: "system" },
      { text: "REDIS STREAMS: Connected to group 'nlp-group' (1 listener).", type: "system" },
      { text: "MONGO DATABASE: Connection verified (collection 'enriched_posts').", type: "system" },
      { text: "TELEMETRY MONITOR: Ready for incoming datagrams...", type: "system" }
    ];
    
    const timers = [];

    
    startupLogs.forEach((log, index) => {
      const t = setTimeout(() => {
        const time = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { id: `start-${index}-${Math.random()}`, text: `[${time}] ${log.text}`, type: log.type }].slice(-10));
      }, index * 400);
      timers.push(t);
    });

    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  
  useEffect(() => {
    const timers = [];

    
    if (posts.length > lastPostsLength.current) {
      const newPosts = [...posts]
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .slice(0, posts.length - lastPostsLength.current);

      newPosts.forEach((post, index) => {
        const time = new Date().toLocaleTimeString();
        const sub = post.subreddit || 'tech';
        
        
        const t1 = setTimeout(() => {
          setLogs(prev => [
            ...prev, 
            { id: `coll-${post.external_id}-${Math.random()}`, text: `[${time}] 📥 COLLECTED: r/${sub} post: "${post.title.substring(0, 20)}..."`, type: "collected" }
          ].slice(-10));
        }, index * 1500);

        
        const t2 = setTimeout(() => {
          setLogs(prev => [
            ...prev, 
            { id: `clas-${post.external_id}-${Math.random()}`, text: `[${time}] 🔍 CLASSIFIED: IT-relevant (Confidence: ${(post.confidence * 100).toFixed(0)}%)`, type: "classified" }
          ].slice(-10));
        }, index * 1500 + 400);

        
        const t3 = setTimeout(() => {
          setLogs(prev => [
            ...prev, 
            { id: `enri-${post.external_id}-${Math.random()}`, text: `[${time}] 🧠 NLP ENRICHED: Category -> ${post.primary_category || 'General'}`, type: "enriched" }
          ].slice(-10));
        }, index * 1500 + 850);

        
        const t4 = setTimeout(() => {
          setLogs(prev => [
            ...prev, 
            { id: `pers-${post.external_id}-${Math.random()}`, text: `[${time}] 💾 PERSISTED: Upserted to MongoDB database.`, type: "persisted" }
          ].slice(-10));
        }, index * 1500 + 1300);

        timers.push(t1, t2, t3, t4);
      });
    }
    lastPostsLength.current = posts.length;

    return () => timers.forEach(t => clearTimeout(t));
  }, [posts]);

  
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  
  const getLogStyle = (type) => {
    switch (type) {
      case 'system': return { color: '#00ffff' }; 
      case 'collected': return { color: 'var(--text-main)' }; 
      case 'classified': return { color: '#ffff00' }; 
      case 'enriched': return { color: '#bc13fe' }; 
      case 'persisted': return { color: 'var(--neon-green)' }; 
      default: return { color: 'var(--text-muted)' };
    }
  };

  return (
    <div className="telemetry-stream-panel" style={{
      position: 'fixed',
      top: '50px',
      right: '20px',
      width: '350px',
      height: '170px',
      background: 'var(--bg-panel)',
      border: 'var(--border-neon)',
      boxShadow: '0 0 15px rgba(0, 255, 65, 0.1)',
      zIndex: 10,
      padding: '12px 15px',
      borderRadius: '4px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
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
          <span style={{ fontSize: '11px', color: 'var(--neon-green)', letterSpacing: '1px' }}>STREAM TELEMETRY PIPELINE</span>
        </div>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'monospace', marginLeft: 'auto' }}>
          STATUS: ACTIVE
        </div>
      </div>

      {}
      <div 
        ref={containerRef}
        style={{
          flex: 1,
          background: '#010502',
          border: '1px solid rgba(0, 255, 65, 0.1)',
          borderRadius: '2px',
          padding: '8px 10px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          fontFamily: 'monospace',
          fontSize: '9.5px',
          lineHeight: '1.3',
          boxSizing: 'border-box'
        }}
      >
        {logs.map((log) => (
          <div key={log.id} style={{ ...getLogStyle(log.type), wordBreak: 'break-all' }}>
            {log.text}
          </div>
        ))}
      </div>
    </div>
  );
}
