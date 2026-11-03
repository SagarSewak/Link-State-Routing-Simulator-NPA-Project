import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Calculator, 
  GitBranch,
  Sparkles,
  Info
} from 'lucide-react';

export function DijkstraVisualizer({
  sourceRouter,
  dijkstraData,
  onSelectStepNode,
  allRouters = []
}) {
  const trace = dijkstraData?.trace || [];
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Reset to step 0 or last step when sourceRouter changes
    setCurrentStepIdx(0);
    setIsPlaying(false);
  }, [sourceRouter, dijkstraData]);

  // Auto-play interval
  useEffect(() => {
    let timer = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStepIdx((prev) => {
          if (prev >= trace.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
    }
    return () => clearInterval(timer);
  }, [isPlaying, trace.length]);

  const currentStep = trace[currentStepIdx] || null;
  const nodes = allRouters.map(r => typeof r === 'string' ? r : r.id).sort();

  return (
    <div className="dijkstra-card">
      <div className="dijkstra-header">
        <div className="title-area">
          <div className="icon-badge-amber">
            <Calculator size={18} />
          </div>
          <div>
            <h3 className="section-title">Dijkstra Shortest Path First (SPF) Visualizer</h3>
            <p className="section-subtitle">
              Computing Shortest Path Tree from Root Router <strong>[{sourceRouter}]</strong>
            </p>
          </div>
        </div>

        {/* Step Controls */}
        <div className="playback-controls">
          <button 
            className="ctrl-btn" 
            disabled={currentStepIdx === 0}
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIdx(0);
            }}
            title="Reset to initial step"
          >
            <RotateCcw size={14} />
          </button>

          <button 
            className="ctrl-btn" 
            disabled={currentStepIdx === 0}
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIdx((p) => Math.max(0, p - 1));
            }}
            title="Previous iteration"
          >
            <ChevronLeft size={16} />
          </button>

          <button 
            className={`ctrl-btn play-btn ${isPlaying ? 'active' : ''}`}
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={trace.length <= 1}
            title={isPlaying ? 'Pause auto-play' : 'Auto-play step by step'}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            <span>{isPlaying ? 'Pause' : 'Play SPF'}</span>
          </button>

          <button 
            className="ctrl-btn" 
            disabled={currentStepIdx >= trace.length - 1}
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIdx((p) => Math.min(trace.length - 1, p + 1));
            }}
            title="Next iteration"
          >
            <ChevronRight size={16} />
          </button>

          <span className="step-counter-badge">
            Step {trace.length > 0 ? currentStepIdx + 1 : 0} of {trace.length}
          </span>
        </div>
      </div>

      {trace.length === 0 ? (
        <div className="empty-state">
          <Info size={24} className="text-muted" />
          <p>No Dijkstra trace available. Run convergence to calculate SPF for {sourceRouter}.</p>
        </div>
      ) : (
        <div className="dijkstra-body">
          {/* Step Summary Cards */}
          <div className="step-metric-cards">
            <div className="metric-box box-selected">
              <span className="box-label">Selected Min-Cost Node (w)</span>
              <div className="box-val-row">
                <span className="node-pill">{currentStep?.selected_node || 'None'}</span>
                <span className="cost-tag">Cost: {currentStep?.selected_cost}</span>
              </div>
            </div>

            <div className="metric-box box-visited">
              <span className="box-label">Visited Set N' (Permanent)</span>
              <div className="nodes-pills-row">
                {(currentStep?.visited_nodes || []).map((n) => (
                  <span key={n} className="pill-visited">{n}</span>
                ))}
              </div>
            </div>

            <div className="metric-box box-unvisited">
              <span className="box-label">Tentative Unvisited Nodes</span>
              <div className="nodes-pills-row">
                {(currentStep?.unvisited_nodes || []).map((n) => (
                  <span key={n} className="pill-unvisited">{n}</span>
                ))}
                {currentStep?.unvisited_nodes?.length === 0 && <span className="text-muted">All visited</span>}
              </div>
            </div>
          </div>

          {/* Mathematical Relaxation Live Formula */}
          <div className="formula-banner">
            <span className="formula-icon">📐</span>
            <div className="formula-content">
              <span className="formula-title">Link Relaxation Formulation:</span>
              <code className="math-code">
                D(v) = min( D(v), D(w) + c(w, v) )
              </code>
            </div>
          </div>

          {/* Step-by-Step Distance & Predecessor Table */}
          <div className="table-responsive">
            <table className="spf-table">
              <thead>
                <tr>
                  <th>Destination Router (v)</th>
                  <th>Current Metric D(v)</th>
                  <th>Predecessor p(v)</th>
                  <th>Status in N'</th>
                  <th>Relaxation Status</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((nodeId) => {
                  const dist = currentStep?.distances?.[nodeId];
                  const pred = currentStep?.predecessors?.[nodeId];
                  const isVisited = currentStep?.visited_nodes?.includes(nodeId);
                  const isSelected = currentStep?.selected_node === nodeId;
                  const relaxation = currentStep?.relaxations?.find(r => r.neighbor === nodeId);

                  return (
                    <tr 
                      key={nodeId}
                      className={`${isSelected ? 'tr-selected' : ''} ${isVisited ? 'tr-visited' : ''}`}
                    >
                      <td>
                        <div className="table-node-cell">
                          <span className="node-circle-mini">{nodeId}</span>
                          {nodeId === sourceRouter && <span className="root-tag">ROOT</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`dist-val ${relaxation ? 'relaxed-val' : ''}`}>
                          {dist === Infinity ? '∞' : dist}
                        </span>
                      </td>
                      <td>
                        <span className="pred-val">
                          {pred ? `via ${pred}` : (nodeId === sourceRouter ? '-' : 'None')}
                        </span>
                      </td>
                      <td>
                        {isVisited ? (
                          <span className="badge-status-visited">In N' (Finalized)</span>
                        ) : (
                          <span className="badge-status-tentative">Tentative</span>
                        )}
                      </td>
                      <td>
                        {relaxation ? (
                          <span className="badge-relaxation">
                            Updated: {relaxation.old_dist === Infinity ? '∞' : relaxation.old_dist} ➔ {relaxation.new_dist} (via {relaxation.via})
                          </span>
                        ) : (
                          <span className="text-dim">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Shortest Path Tree Preview */}
          {dijkstraData?.spf_tree && (
            <div className="spt-footer">
              <span className="spt-label">
                <GitBranch size={14} /> Shortest Path Tree Adjacency:
              </span>
              <div className="spt-links">
                {Object.entries(dijkstraData.spf_tree).map(([parent, children]) => (
                  children.length > 0 && (
                    <span key={parent} className="spt-branch">
                      <strong>{parent}</strong> ➔ [{children.join(', ')}]
                    </span>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

