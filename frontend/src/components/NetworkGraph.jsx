import React, { useEffect, useRef, useState } from 'react';
import { 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  Send, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { PRESET_SCENARIOS, resolveNodePositions } from '../engine/linkStateEngine';

export function NetworkGraph({
  network,
  selectedRouter,
  onSelectRouter,
  highlightPath = [],
  packetAnim = null,
  isFlooding = false,
  onToggleLinkFail,
}) {
  const routersList = network?.routers || [];
  const linksList = network?.links || [];
  const currentScenarioKey = network?.scenario_name || 'textbook_topology.json';

  // Robust position resolver - guaranteed non-null coordinates for all nodes in any topology
  const positions = resolveNodePositions(network, currentScenarioKey);
  const presetData = PRESET_SCENARIOS[currentScenarioKey] || PRESET_SCENARIOS['textbook_topology.json'];

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

  // Packet animation: driven by requestAnimationFrame, writing directly to the DOM
  // (no React re-render per frame). React state only changes per hop / on arrival.
  const packetRef = useRef(null);
  const positionsRef = useRef(positions);
  positionsRef.current = positions;
  const [activeHop, setActiveHop] = useState(null); // { from, to }
  const [packetVisual, setPacketVisual] = useState(null); // { x, y, status, label }

  useEffect(() => {
    if (!packetAnim) return undefined;
    const { path, delivered, onDone } = packetAnim;
    const pos = positionsRef.current;
    const HOP_MS = 650;
    const HOLD_MS = 700;
    let raf = 0;
    let cancelled = false;
    let finished = false;

    const setXY = (x, y) => {
      if (packetRef.current) packetRef.current.setAttribute('transform', `translate(${x}, ${y})`);
    };
    // Cleanup (superseded / StrictMode remount) never calls onDone; only a real finish does.
    const finish = (completed) => {
      if (finished) return;
      finished = true;
      setActiveHop(null);
      setPacketVisual(null);
      if (completed && onDone) onDone(true);
    };

    const pts = (path || []).filter((id) => pos[id]);
    if (pts.length === 0) {
      finish(true);
      return undefined;
    }

    // Single node: blocked at source
    if (pts.length === 1) {
      const p = pos[pts[0]];
      setPacketVisual({ x: p.x, y: p.y, status: 'failed', label: 'BLOCKED' });
      const t = setTimeout(() => finish(true), HOLD_MS);
      return () => { cancelled = true; clearTimeout(t); finish(false); };
    }

    const startPos = pos[pts[0]];
    setPacketVisual({ x: startPos.x, y: startPos.y, status: 'in-flight', label: 'DATA' });
    setActiveHop({ from: pts[0], to: pts[1] });

    let hop = 0;
    let hopStart = null;
    let holdTimer = null;

    const tick = (now) => {
      if (cancelled) return;
      if (hopStart === null) hopStart = now;
      const t = Math.min((now - hopStart) / HOP_MS, 1);
      const ease = -(Math.cos(Math.PI * t) - 1) / 2;
      const a = pos[pts[hop]];
      const b = pos[pts[hop + 1]];
      setXY(a.x + (b.x - a.x) * ease, a.y + (b.y - a.y) * ease);

      if (t < 1) {
        raf = requestAnimationFrame(tick);
        return;
      }
      hop += 1;
      hopStart = null;
      if (hop < pts.length - 1) {
        setActiveHop({ from: pts[hop], to: pts[hop + 1] });
        raf = requestAnimationFrame(tick);
      } else {
        const end = pos[pts[pts.length - 1]];
        setActiveHop(null);
        setPacketVisual({
          x: end.x,
          y: end.y,
          status: delivered ? 'delivered' : 'failed',
          label: delivered ? 'ACK' : 'FAIL',
        });
        holdTimer = setTimeout(() => finish(true), HOLD_MS);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(holdTimer);
      finish(false);
    };
  }, [packetAnim]);

  // Check if a link (u, v) is the hop the packet is currently traversing
  const isLinkActiveHop = (u, v) => {
    if (!activeHop) return false;
    return (activeHop.from === u && activeHop.to === v) || (activeHop.from === v && activeHop.to === u);
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

            <filter id="glow" filterUnits="userSpaceOnUse" x="-100" y="-100" width="1040" height="680">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <filter id="pathGlow" filterUnits="userSpaceOnUse" x="-100" y="-100" width="1040" height="680">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <filter id="failedGlow" filterUnits="userSpaceOnUse" x="-100" y="-100" width="1040" height="680">
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
              const isActiveHop = isLinkActiveHop(link.u, link.v);
              const midX = Math.round((uPos.x + vPos.x) / 2);
              const midY = Math.round((uPos.y + vPos.y) / 2);

              return (
                <g key={`link-${link.u}-${link.v}`} className={`link-group ${isFailed ? 'failed' : ''} ${isInPath ? 'in-path' : ''} ${isActiveHop ? 'active-hop' : ''}`}>
                  {/* Under-glow line */}
                  <line
                    x1={uPos.x}
                    y1={uPos.y}
                    x2={vPos.x}
                    y2={vPos.y}
                    className="link-underglow"
                    filter={isActiveHop ? 'url(#pathGlow)' : isInPath ? 'url(#pathGlow)' : isFailed ? 'url(#failedGlow)' : undefined}
                    stroke={isActiveHop ? '#38bdf8' : isInPath ? '#10b981' : isFailed ? '#ef4444' : '#334155'}
                    strokeWidth={isActiveHop ? 14 : isInPath ? 12 : isFailed ? 8 : 4}
                    opacity={isActiveHop ? 0.8 : isInPath ? 0.6 : isFailed ? 0.4 : 0.2}
                  />

                  {/* Main Line */}
                  <line
                    x1={uPos.x}
                    y1={uPos.y}
                    x2={vPos.x}
                    y2={vPos.y}
                    className={`link-line ${isInPath ? 'path-active' : ''} ${isFailed ? 'severed-line' : ''}`}
                    stroke={isActiveHop ? '#38bdf8' : isInPath ? '#10b981' : isFailed ? '#ef4444' : '#475569'}
                    strokeWidth={isActiveHop ? 5 : isInPath ? 4.5 : isFailed ? 2.5 : 2.5}
                    strokeDasharray={isFailed ? '6,6' : isInPath ? '8,4' : undefined}
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

          {/* Animated Data Packet Traveling (position updated via ref in rAF loop) */}
          {packetVisual && (
            <g
              ref={packetRef}
              className="packet-anim-group"
              transform={`translate(${packetVisual.x}, ${packetVisual.y})`}
              pointerEvents="none"
            >
              <circle
                r="18"
                fill={packetVisual.status === 'failed' ? '#ef4444' : packetVisual.status === 'delivered' ? '#10b981' : '#38bdf8'}
                opacity="0.3"
              />
              <circle
                r="11"
                fill={packetVisual.status === 'failed' ? '#f43f5e' : packetVisual.status === 'delivered' ? '#059669' : '#0284c7'}
                stroke="#ffffff"
                strokeWidth="2.5"
              />
              <text x="0" y="3" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="800">
                {packetVisual.label}
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
