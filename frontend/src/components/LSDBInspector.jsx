import React, { useState } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Radio, 
  Clock, 
  Hash,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export function LSDBInspector({
  network,
  selectedRouter,
  onSelectRouter,
  onTriggerConverge
}) {
  const routers = network?.routers || [];
  const currentRouter = routers.find(r => (r.id || r) === selectedRouter) || routers[0];
  const lsdb = currentRouter?.lsdb || {};

  // Check consistency across all routers
  const checkConsistency = () => {
    if (routers.length <= 1) return true;
    const firstLsdb = routers[0]?.lsdb || {};
    const firstKeys = Object.keys(firstLsdb).sort().join(',');
    for (let i = 1; i < routers.length; i++) {
      const keys = Object.keys(routers[i]?.lsdb || {}).sort().join(',');
      if (keys !== firstKeys) return false;
    }
    return true;
  };

  const isConsistent = checkConsistency();

  return (
    <div className="lsdb-card">
      <div className="lsdb-header">
        <div className="title-group">
          <div className="icon-badge-cyan">
            <Database size={18} />
          </div>
          <div>
            <h3 className="section-title">Link-State Database (LSDB) Inspector</h3>
            <p className="section-subtitle">
              Synchronized global topology database from Router <strong>[{selectedRouter}]</strong> perspective
            </p>
          </div>
        </div>

        {/* Global Consistency Pill */}
        <div className="header-actions">
          <div className={`consistency-badge ${isConsistent ? 'consistent' : 'desync'}`}>
            {isConsistent ? (
              <>
                <ShieldCheck size={14} />
                <span>LSDB Synchronized (100% Consistent)</span>
              </>
            ) : (
              <>
                <AlertCircle size={14} />
                <span>Desynchronized View (Flooding Needed)</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Router Selector Tabs */}
      <div className="router-pill-tabs">
        <span className="tabs-label">Inspect Router View:</span>
        {routers.map((r) => {
          const rId = typeof r === 'string' ? r : r.id;
          const isSelected = rId === selectedRouter;
          return (
            <button
              key={`lsdb-tab-${rId}`}
              className={`router-tab-pill ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectRouter(rId)}
            >
              Router {rId}
            </button>
          );
        })}
      </div>

      {/* LSDB Content Grid */}
      <div className="lsdb-grid">
        {Object.keys(lsdb).length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={20} />
            <p>No LSPs stored in this router's LSDB. Trigger convergence to flood LSPs.</p>
          </div>
        ) : (
          Object.entries(lsdb)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([advRouter, lsp]) => {
              const neighbors = lsp.neighbors || {};
              const seq = lsp.sequence_number || lsp.sequenceNumber || 1;
              const age = lsp.age !== undefined ? lsp.age : 64;

              return (
                <div key={advRouter} className="lsp-card">
                  <div className="lsp-card-header">
                    <div className="lsp-adv-router">
                      <span className="lsp-node-circle">{advRouter}</span>
                      <div>
                        <div className="lsp-title">Router [{advRouter}] LSP</div>
                        <div className="lsp-sub">Originating Node</div>
                      </div>
                    </div>
                    <div className="lsp-seq-badge">
                      <Hash size={11} />
                      <span>Seq #{seq}</span>
                    </div>
                  </div>

                  <div className="lsp-meta-row">
                    <span className="meta-item">
                      <Clock size={12} /> Age/TTL: <strong>{age}</strong>
                    </span>
                    <span className="meta-item">
                      <Radio size={12} /> Active Links: <strong>{Object.keys(neighbors).length}</strong>
                    </span>
                  </div>

                  <div className="lsp-links-list">
                    <div className="links-header">Advertised Adjacencies & Metrics:</div>
                    <div className="link-chips">
                      {Object.entries(neighbors).map(([nbr, cost]) => (
                        <div key={nbr} className="link-chip">
                          <span className="nbr-name">{nbr}</span>
                          <span className="metric-tag">Cost: {cost}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
        )}
      </div>

      <div className="lsdb-footer-note">
        <span className="note-icon">💡</span>
        <span>
          <strong>LSR Principle:</strong> Each router floods its LSP throughout the entire network using reliable flooding with sequence number filtering. This guarantees every router possesses an identical LSDB representing the global graph <em>G = (V, E)</em>.
        </span>
      </div>
    </div>
  );
}

