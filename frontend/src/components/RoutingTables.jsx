import React, { useState } from 'react';
import { 
  Table, 
  ArrowRight, 
  Send, 
  Layers, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export function RoutingTables({
  network,
  selectedRouter,
  onSelectRouter,
  onQuickSimulate
}) {
  const [viewMode, setViewMode] = useState('single'); // 'single' | 'all'
  const routers = network?.routers || [];

  const currentRouterObj = routers.find(r => (r.id || r) === selectedRouter) || routers[0];
  const currentTable = currentRouterObj?.routing_table || currentRouterObj?.routingTable || {};

  return (
    <div className="routing-card">
      <div className="routing-header">
        <div className="title-group">
          <div className="icon-badge-emerald">
            <Table size={18} />
          </div>
          <div>
            <h3 className="section-title">Forwarding / Routing Tables</h3>
            <p className="section-subtitle">
              Calculated next-hop FIB entries derived from Link-State Database & SPF Tree
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="table-view-toggle">
          <button
            className={`toggle-pill ${viewMode === 'single' ? 'active' : ''}`}
            onClick={() => setViewMode('single')}
          >
            Router [{selectedRouter}]
          </button>
          <button
            className={`toggle-pill ${viewMode === 'all' ? 'active' : ''}`}
            onClick={() => setViewMode('all')}
          >
            All Routers ({routers.length})
          </button>
        </div>
      </div>

      {viewMode === 'single' ? (
        <div className="single-table-container">
          <div className="table-subheading">
            <span className="table-origin">
              Routing Table for Router: <strong className="highlight-node">{selectedRouter}</strong>
            </span>
            <span className="entries-count">
              {Object.keys(currentTable).length} destination entries
            </span>
          </div>

          {Object.keys(currentTable).length === 0 ? (
            <div className="empty-table-msg">
              No routes established yet. Please trigger network convergence.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="routing-table">
                <thead>
                  <tr>
                    <th>Destination</th>
                    <th>Next Hop</th>
                    <th>Metric Cost</th>
                    <th>Optimal Shortest Path</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(currentTable)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([dest, entry]) => {
                      const path = entry.full_path || entry.fullPath || [selectedRouter, dest];
                      const cost = entry.cost;
                      const nextHop = entry.next_hop || entry.nextHop;

                      return (
                        <tr key={dest}>
                          <td>
                            <div className="dest-cell">
                              <span className="node-circle-dest">{dest}</span>
                              <span className="dest-name">Node {dest}</span>
                            </div>
                          </td>
                          <td>
                            <span className="next-hop-pill">{nextHop}</span>
                          </td>
                          <td>
                            <span className="cost-pill">{Number(cost).toFixed(1)}</span>
                          </td>
                          <td>
                            <div className="path-breadcrumbs">
                              {path.map((node, i) => (
                                <React.Fragment key={`${dest}-hop-${i}`}>
                                  <span className={`hop-node ${i === 0 ? 'hop-src' : i === path.length - 1 ? 'hop-dst' : 'hop-mid'}`}>
                                    {node}
                                  </span>
                                  {i < path.length - 1 && <ArrowRight size={12} className="hop-arrow" />}
                                </React.Fragment>
                              ))}
                            </div>
                          </td>
                          <td>
                            <button
                              className="btn-quick-route"
                              onClick={() => onQuickSimulate && onQuickSimulate(selectedRouter, dest)}
                              title={`Simulate packet forwarding from ${selectedRouter} to ${dest}`}
                            >
                              <Send size={12} />
                              <span>Route Packet</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* All Routers Grid View */
        <div className="all-tables-grid">
          {routers.map((r) => {
            const rId = typeof r === 'string' ? r : r.id;
            const rTable = r.routing_table || r.routingTable || {};
            const isCurrent = rId === selectedRouter;

            return (
              <div 
                key={`all-rt-${rId}`}
                className={`all-table-card ${isCurrent ? 'current-card' : ''}`}
                onClick={() => onSelectRouter(rId)}
              >
                <div className="all-table-card-header">
                  <div className="card-node-badge">Router [{rId}]</div>
                  <span className="dest-badge">{Object.keys(rTable).length} dests</span>
                </div>

                <div className="mini-table-body">
                  <table className="mini-routing-table">
                    <thead>
                      <tr>
                        <th>Dest</th>
                        <th>Next</th>
                        <th>Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(rTable).map(([dest, info]) => (
                        <tr key={`${rId}-to-${dest}`}>
                          <td className="font-semibold">{dest}</td>
                          <td><span className="mini-next-hop">{info.next_hop || info.nextHop}</span></td>
                          <td>{info.cost}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

