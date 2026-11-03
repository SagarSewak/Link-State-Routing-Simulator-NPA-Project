import React from 'react';
import { 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  Send, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { PRESET_SCENARIOS } from '../engine/linkStateEngine';

export function NetworkGraph({
  network,
  selectedRouter,
  onSelectRouter,
  highlightPath = [],
  animatingPacket = null,
  isFlooding = false,
  onToggleLinkFail,
}) {
  const routersList = network?.routers || [];
  const linksList = network?.links || [];
  const currentScenarioKey = network?.scenario_name || 'textbook_topology.json';

  // Static preset positions - fixed and crisp per topology
  const presetData = PRESET_SCENARIOS[currentScenarioKey] || PRESET_SCENARIOS['textbook_topology.json'];
  const positions = presetData.positions || network?.positions || {};

  // Check if a link (u, v) is in the highlighted shortest path
  const isLinkInPath = (u, v) => {
    if (!highlightPath || highlightPath.length < 2) return false;
    for (let i = 0; i < highlightPath.length - 1; i++) {
      const a = highlightPath[i];
      const b = highlightPath[i + 1];
      if ((a === u && b === v) || (a === v && b === u)) {
        return true;
      }
    }
    return false;
  };

  // Node color palette based on router ID hash
  const getNodeColor = (id) => {
    const colors = [
      { fill: '#06b6d4', glow: '#22d3ee', border: '#0891b2' }, // Cyan
      { fill: '#8b5cf6', glow: '#a78bfa', border: '#7c3aed' }, // Purple
      { fill: '#10b981', glow: '#34d399', border: '#059669' }, // Emerald
      { fill: '#f59e0b', glow: '#fbbf24', border: '#d97706' }, // Amber
      { fill: '#ec4899', glow: '#f472b6', border: '#db2777' }, // Pink
      { fill: '#3b82f6', glow: '#60a5fa', border: '#2563eb' }, // Blue
      { fill: '#14b8a6', glow: '#2dd4bf', border: '#0d9488' }, // Teal
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash += id.charCodeAt(i);
    return colors[hash % colors.length];
  };

  return (
    <div className="network-graph-card">
      <div className="graph-header">
        <div className="graph-title-group">
          <div className="pulsing-badge">
            <span className="live-dot"></span>
            <span>TOPOLOGY GRAPH</span>
          </div>
          <span className="graph-scenario-tag">{network?.name || presetData?.name || 'Network'}</span>
        </div>

        <div className="graph-legend">
          <span className="legend-item">
            <span className="legend-dot active-link"></span>
            Active Link
          </span>
          <span className="legend-item">
            <span className="legend-dot path-link"></span>
            Shortest Path
          </span>
          <span className="legend-item">
            <span className="legend-dot failed-link"></span>
            Failed / Cut
          </span>
        </div>
      </div>

      <div className="svg-canvas-wrapper">
        <svg className="network-svg" viewBox="0 0 840 480" preserveAspectRatio="xMidYMid meet">
          <defs>
            {/* Gradients */}
            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

            <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <filter id="pathGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <filter id="failedGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Dotted Grid Pattern Background */}
          <g className="grid-background" opacity="0.15">
            {Array.from({ length: 28 }).map((_, i) => (
              <line key={`v-${i}`} x1={i * 30} y1="0" x2={i * 30} y2="480" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="2,4" />
            ))}
            {Array.from({ length: 16 }).map((_, j) => (
              <line key={`h-${j}`} x1="0" y1={j * 30} x2="840" y2={j * 30} stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="2,4" />
            ))}
          </g>

          {/* Flooding Ripple Waves Animation */}
          {isFlooding && routersList.map((r) => {
            const rId = typeof r === 'string' ? r : r.id;
            const pos = positions[rId];
            if (!pos) return null;
            return (
              <g key={`flood-${rId}`} className="flooding-ripples">
                <circle cx={pos.x} cy={pos.y} r="25" className="ripple-wave ripple-1" />
                <circle cx={pos.x} cy={pos.y} r="45" className="ripple-wave ripple-2" />
                <circle cx={pos.x} cy={pos.y} r="70" className="ripple-wave ripple-3" />
              </g>
            );
          })}

          {/* Physical Links */}
          <g className="links-layer">
            {linksList.map((link) => {
              const uPos = positions[link.u];
              const vPos = positions[link.v];
              if (!uPos || !vPos) return null;

              const isFailed = link.status === 'DOWN';
              const isInPath = isLinkInPath(link.u, link.v);
              const midX = Math.round((uPos.x + vPos.x) / 2);
              const midY = Math.round((uPos.y + vPos.y) / 2);

              return (
                <g key={`link-${link.u}-${link.v}`} className={`link-group ${isFailed ? 'failed' : ''} ${isInPath ? 'in-path' : ''}`}>
                  {/* Under-glow line */}
                  <line
                    x1={uPos.x}
                    y1={uPos.y}
                    x2={vPos.x}
                    y2={vPos.y}
                    className="link-underglow"
                    filter={isInPath ? 'url(#pathGlow)' : isFailed ? 'url(#failedGlow)' : undefined}
                    stroke={isInPath ? '#10b981' : isFailed ? '#ef4444' : '#334155'}
                    strokeWidth={isInPath ? 12 : isFailed ? 8 : 4}
                    opacity={isInPath ? 0.6 : isFailed ? 0.4 : 0.2}
                  />

                  {/* Main Line */}
                  <line
                    x1={uPos.x}
                    y1={uPos.y}
                    x2={vPos.x}
                    y2={vPos.y}
                    className={`link-line ${isInPath ? 'path-active' : ''} ${isFailed ? 'severed-line' : ''}`}
                    stroke={isInPath ? 'url(#pathGradient)' : isFailed ? '#ef4444' : '#475569'}
                    strokeWidth={isInPath ? 4.5 : isFailed ? 2.5 : 2.5}
                    strokeDasharray={isFailed ? '6,6' : isInPath ? '8,4' : 'none'}
                  />

                  {/* Midpoint Metric Badge - Static, Clean, No Hover Glitch */}
                  <g 
                    className="link-badge-group"
                    transform={`translate(${midX}, ${midY})`}
                    onClick={() => onToggleLinkFail && onToggleLinkFail(link.u, link.v)}
                    title={isFailed ? `Link ${link.u} <-> ${link.v} is SEVERED. Click to restore.` : `Link ${link.u} <-> ${link.v} Cost: ${link.cost}. Click to simulate cable cut.`}
                  >
                    <rect
                      x="-22"
                      y="-12"
                      width="44"
                      height="24"
                      rx="12"
                      className={`link-badge-bg ${isFailed ? 'failed-badge' : isInPath ? 'path-badge' : ''}`}
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      pointerEvents="none"
                      className={`link-badge-text ${isFailed ? 'failed-text' : isInPath ? 'path-text' : ''}`}
                    >
                      {isFailed ? '✕ CUT' : link.cost}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>

          {/* Animated Data Packet Traveling */}
          {animatingPacket && (
            <g className="packet-anim-group" transform={`translate(${animatingPacket.x}, ${animatingPacket.y})`}>
              <circle r="14" fill="#10b981" opacity="0.3" filter="url(#glow)">
                <animate attributeName="r" values="10;22;10" dur="1.2s" repeatCount="indefinite" />
              </circle>
              <circle r="8" fill="#34d399" stroke="#ffffff" strokeWidth="2" filter="url(#glow)" />
              <text x="0" y="3" textAnchor="middle" fill="#0f172a" fontSize="8" fontWeight="bold">
                DATA
              </text>
            </g>
          )}

          {/* Router Nodes (Static, Clickable to Focus) */}
          <g className="routers-layer">
            {routersList.map((r) => {
              const rId = typeof r === 'string' ? r : r.id;
              const pos = positions[rId];
              if (!pos) return null;

              const isSelected = selectedRouter === rId;
              const isInPath = highlightPath.includes(rId);
              const nodeColor = getNodeColor(rId);
              const seq = r.seq_number || r.seqNumber || 1;

              return (
                <g
                  key={`router-${rId}`}
                  className={`router-node ${isSelected ? 'selected' : ''} ${isInPath ? 'in-path-node' : ''}`}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onClick={() => onSelectRouter(rId)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Outer selection ring */}
                  {isSelected && (
                    <circle
                      r="36"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      strokeDasharray="4,4"
                      className="selected-ring"
                    >
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0"
                        to="360"
                        dur="10s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Path Glow */}
                  {isInPath && (
                    <circle
                      r="30"
                      fill={nodeColor.glow}
                      opacity="0.25"
                      filter="url(#glow)"
                    />
                  )}

                  {/* Main Node Body */}
                  <circle
                    r="24"
                    fill="#1e293b"
                    stroke={isSelected ? '#38bdf8' : isInPath ? '#10b981' : nodeColor.border}
                    strokeWidth={isSelected ? 3.5 : isInPath ? 3 : 2.5}
                    className="router-body-circle"
                  />

                  {/* Inner Gradient Accent */}
                  <circle
                    r="19"
                    fill={nodeColor.fill}
                    fillOpacity="0.2"
                  />

                  {/* Router Label */}
                  <text
                    x="0"
                    y="5"
                    textAnchor="middle"
                    className="router-label"
                    fill="#f8fafc"
                    fontWeight="700"
                    fontSize="15"
                    pointerEvents="none"
                  >
                    {rId}
                  </text>

                  {/* Sequence Number Mini-Badge */}
                  <g transform="translate(14, -14)" className="seq-badge">
                    <rect
                      x="-10"
                      y="-7"
                      width="20"
                      height="14"
                      rx="7"
                      fill="#0f172a"
                      stroke="#64748b"
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="8.5"
                      fontWeight="600"
                      pointerEvents="none"
                    >
                      #{seq}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="graph-footer-controls">
        <div className="selected-info">
          <span className="info-label">Active Router Focus:</span>
          <span className="info-value">
            Router <strong>[{selectedRouter || 'None'}]</strong>
          </span>
          {network?.routers?.find(r => (r.id || r) === selectedRouter)?.neighbors && (
            <span className="neighbors-preview">
              Neighbors: {Object.entries(network.routers.find(r => (r.id || r) === selectedRouter).neighbors).map(([nbr, c]) => `${nbr}(c:${c})`).join(', ') || 'Isolated'}
            </span>
          )}
        </div>
        <div className="quick-help">
          <span className="help-chip">💡 Click any router to focus LSDB & Dijkstra tree</span>
          <span className="help-chip">💡 Click any link badge to cut/restore physical link</span>
        </div>
      </div>
    </div>
  );
}
