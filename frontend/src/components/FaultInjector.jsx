import React from 'react';
import { 
  Flame, 
  Trash2, 
  AlertOctagon,
  ShieldCheck
} from 'lucide-react';

export function FaultInjector({
  network,
  onToggleLinkFail,
  onQuickFailLink
}) {
  const links = network?.links || [];
  const scenarioKey = network?.scenario_name || 'textbook_topology.json';

  // Specific quick demo scenarios depending on topology
  const getQuickDemos = () => {
    if (scenarioKey.includes('textbook')) {
      return [
        { u: 'x', v: 'y', label: 'Cut (x ↔ y) [Demo Cut]', variant: 'rose' },
        { u: 'u', v: 'x', label: 'Cut (u ↔ x)', variant: 'amber' },
        { u: 'v', v: 'y', label: 'Cut (v ↔ y)', variant: 'amber' },
      ];
    } else if (scenarioKey.includes('mesh')) {
      return [
        { u: 'R2', v: 'R3', label: 'Cut (R2 ↔ R3)', variant: 'rose' },
        { u: 'R4', v: 'R5', label: 'Cut (R4 ↔ R5)', variant: 'amber' },
        { u: 'R6', v: 'R7', label: 'Cut (R6 ↔ R7)', variant: 'amber' },
      ];
    } else {
      return [
        { u: 'A', v: 'C', label: 'Cut (A ↔ C) Chord', variant: 'rose' },
        { u: 'A', v: 'B', label: 'Cut (A ↔ B)', variant: 'amber' },
        { u: 'D', v: 'E', label: 'Cut (D ↔ E)', variant: 'amber' },
      ];
    }
  };

  const quickDemos = getQuickDemos();

  return (
    <div className="fault-card">
      <div className="fault-header">
        <div className="title-group">
          <div className="icon-badge-rose">
            <Flame size={18} />
          </div>
          <div>
            <h3 className="section-title">Fault Injection & Dynamic Convergence</h3>
            <p className="section-subtitle">
              Simulate physical fiber cuts and automatic protocol re-routing on preconfigured topologies
            </p>
          </div>
        </div>
      </div>

      {/* Quick Failure Demo Actions */}
      <div className="quick-scenarios-row">
        <span className="scenarios-title">Quick Demo Cuts:</span>
        {quickDemos.map((demo) => {
          const isSevered = links.find(
            (l) => [l.u, l.v].sort().join('-') === [demo.u, demo.v].sort().join('-') && l.status === 'DOWN'
          );
          return (
            <button
              key={`demo-${demo.u}-${demo.v}`}
              className={`btn-demo-scenario ${isSevered ? 'btn-severed-active' : ''}`}
              onClick={() => onQuickFailLink(demo.u, demo.v)}
              title={isSevered ? `Restore link ${demo.u} <-> ${demo.v}` : `Cut link ${demo.u} <-> ${demo.v}`}
            >
              <AlertOctagon size={14} className={demo.variant === 'rose' ? 'text-rose' : 'text-amber'} />
              <span>{isSevered ? `Restore (${demo.u} ↔ ${demo.v})` : demo.label}</span>
            </button>
          );
        })}
      </div>

      {/* Links State & Sever Matrix */}
      <div className="links-matrix-section">
        <div className="section-sub-label">Physical Links Status Matrix (Click to Sever / Restore):</div>
        <div className="links-chip-grid">
          {links.map((link) => {
            const isFailed = link.status === 'DOWN';
            return (
              <div 
                key={`matrix-${link.u}-${link.v}`} 
                className={`link-matrix-chip ${isFailed ? 'chip-severed' : 'chip-active'}`}
                onClick={() => onToggleLinkFail(link.u, link.v)}
                title={isFailed ? `Link ${link.u} <-> ${link.v} is SEVERED. Click to restore.` : `Link ${link.u} <-> ${link.v} is UP (Cost: ${link.cost}). Click to cut.`}
              >
                <div className="chip-link-name">
                  <strong>{link.u}</strong> ↔ <strong>{link.v}</strong>
                </div>
                <div className="chip-cost-badge">
                  {isFailed ? 'SEVERED' : `Metric: ${link.cost}`}
                </div>
                <div className="chip-action-hint">
                  {isFailed ? <ShieldCheck size={12} /> : <Trash2 size={12} />}
                  <span>{isFailed ? 'Restore Link' : 'Sever Link'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
