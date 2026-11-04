import React, { useState, useEffect, useRef } from 'react';
import { 
  Network as NetIcon, 
  Calculator, 
  Table, 
  Database, 
  Flame, 
  Terminal, 
  Sparkles, 
  Layers, 
  Radio, 
  Send,
  Zap,
  Info,
  Users
} from 'lucide-react';

import { PROJECT_AUTHORS } from './config/authors';
import { api } from './services/api';
import { resolveNodePositions } from './engine/linkStateEngine';
import { Navbar } from './components/Navbar';
import { NetworkGraph } from './components/NetworkGraph';
import { DijkstraVisualizer } from './components/DijkstraVisualizer';
import { RoutingTables } from './components/RoutingTables';
import { LSDBInspector } from './components/LSDBInspector';
import { PacketSimulator } from './components/PacketSimulator';
import { FaultInjector } from './components/FaultInjector';
import { EventLogTerminal } from './components/EventLogTerminal';
import { AuthorsModal } from './components/AuthorsModal';
import { TheoryModal } from './components/TheoryModal';

export function App() {
  const [activeTab, setActiveTab] = useState('topology'); // 'topology' | 'dijkstra' | 'lsdb' | 'faults' | 'logs'
  const [network, setNetwork] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [currentScenario, setCurrentScenario] = useState('textbook_topology.json');
  const [selectedRouter, setSelectedRouter] = useState('u');
  const [backendOnline, setBackendOnline] = useState(false);
  const [isConverging, setIsConverging] = useState(false);
  const [isFlooding, setIsFlooding] = useState(false);
  const [highlightPath, setHighlightPath] = useState([]);
  const [dijkstraData, setDijkstraData] = useState(null);
  const [lastPacketResult, setLastPacketResult] = useState(null);
  const [animatingPacket, setAnimatingPacket] = useState(null);
  const [isSimulatingPacket, setIsSimulatingPacket] = useState(false);
  const [selectedSimSrc, setSelectedSimSrc] = useState(null);
  const [selectedSimDst, setSelectedSimDst] = useState(null);
  const [showAuthorsModal, setShowAuthorsModal] = useState(false);
  const [showTheoryModal, setShowTheoryModal] = useState(false);
  const [convergenceStats, setConvergenceStats] = useState(null);
  const animIdRef = useRef(0);

  // Initialize
  useEffect(() => {
    async function init() {
      // Check backend
      const health = await api.checkBackendHealth();
      setBackendOnline(health.online);

      // Load scenarios
      const scData = await api.getScenarios();
      setScenarios(scData.scenarios || []);
      if (scData.current) setCurrentScenario(scData.current);

      // Fetch initial network
      const res = await api.getNetworkState();
      setNetwork(res.data);

      const firstRouter = res.data?.routers?.[0];
      const rId = typeof firstRouter === 'string' ? firstRouter : firstRouter?.id || 'u';
      setSelectedRouter(rId);

      // Load initial Dijkstra trace
      const dData = await api.getDijkstraTrace(rId);
      setDijkstraData(dData);
    }
    init();

    // Periodic backend health ping
    const interval = setInterval(async () => {
      const health = await api.checkBackendHealth();
      setBackendOnline(health.online);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Sync Dijkstra data when selectedRouter changes
  useEffect(() => {
    if (!selectedRouter) return;
    api.getDijkstraTrace(selectedRouter).then((dData) => {
      setDijkstraData(dData);
    });
  }, [selectedRouter]);

  // Handle scenario switch
  const handleSelectScenario = async (scId) => {
    setCurrentScenario(scId);
    setHighlightPath([]);
    setLastPacketResult(null);
    const res = await api.loadScenario(scId);
    setNetwork(res.data);

    const firstRouter = res.data?.routers?.[0];
    const rId = typeof firstRouter === 'string' ? firstRouter : firstRouter?.id || 'u';
    setSelectedRouter(rId);

    const dData = await api.getDijkstraTrace(rId);
    setDijkstraData(dData);
  };

  // Trigger LSP Flooding & Convergence
  const handleTriggerConverge = async () => {
    setIsConverging(true);
    setIsFlooding(true);
    setTimeout(() => setIsFlooding(false), 1800);

    const { stats, state } = await api.triggerConvergence();
    setConvergenceStats(stats);
    setNetwork(state.data);

    const dData = await api.getDijkstraTrace(selectedRouter);
    setDijkstraData(dData);
    setIsConverging(false);
  };

  // Reset
  const handleReset = async () => {
    setHighlightPath([]);
    setLastPacketResult(null);
    const res = await api.resetNetwork();
    setNetwork(res.data);
    const dData = await api.getDijkstraTrace(selectedRouter);
    setDijkstraData(dData);
  };

  // Fail/Restore link toggle
  const handleToggleLinkFail = async (u, v) => {
    const linkKey = [u, v].sort().join('-');
    const isFailed = network?.links?.find(
      (l) => [l.u, l.v].sort().join('-') === linkKey && l.status === 'DOWN'
    );

    if (isFailed) {
      const { state } = await api.restoreLink(u, v);
      setNetwork(state.data);
    } else {
      const { state } = await api.failLink(u, v);
      setNetwork(state.data);
    }

    // Refresh Dijkstra trace
    const dData = await api.getDijkstraTrace(selectedRouter);
    setDijkstraData(dData);

    // If there was an active path, clear or update it
    setHighlightPath([]);
  };

  // Quick failure scenario (e.g. Cut x <-> y)
  const handleQuickFailLink = async (u, v) => {
    await handleToggleLinkFail(u, v);
  };


  // Simulate Packet Transmission
  const handleSimulatePacket = async (src, dst, payload) => {
    setSelectedSimSrc(src);
    setSelectedSimDst(dst);
    setIsSimulatingPacket(true);

    const animId = ++animIdRef.current;

    const result = await api.simulatePacket(src, dst, payload);
    if (animIdRef.current !== animId) return;

    setLastPacketResult(result);
    setHighlightPath(result.path_traversed || []);

    // Hand the animation to the graph (rAF-driven, no per-frame React renders)
    await new Promise((resolve) => {
      setAnimatingPacket({
        id: animId,
        path: result.path_traversed || [],
        delivered: !!result.delivered,
        onDone: resolve,
      });
    });

    if (animIdRef.current === animId) {
      setAnimatingPacket(null);
      setIsSimulatingPacket(false);
    }
  };

  // Quick simulate from routing table button
  const handleQuickSimulate = (src, dst) => {
    setActiveTab('topology');
    setSelectedSimSrc(src);
    setSelectedSimDst(dst);
    // Slight tick to ensure topology graph is rendered before packet animation starts
    setTimeout(() => {
      handleSimulatePacket(src, dst, 'Quick Forward Test');
    }, 60);
  };

  const routersList = network?.routers || [];
  const linksList = network?.links || [];

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        scenarios={scenarios}
        currentScenario={currentScenario}
        onSelectScenario={handleSelectScenario}
        onReset={handleReset}
        onTriggerConverge={handleTriggerConverge}
        onOpenTheory={() => setShowTheoryModal(true)}
        onOpenAuthors={() => setShowAuthorsModal(true)}
        backendOnline={backendOnline}
        isConverging={isConverging}
      />

      {/* Main Container */}
      <main className="main-content">
        {/* Interactive KPI Metrics Bar */}
        <div className="metrics-strip">
          <div className="metric-chip-card">
            <div className="chip-icon bg-cyan">
              <NetIcon size={16} />
            </div>
            <div className="chip-info">
              <span className="chip-title">Total Routers</span>
              <span className="chip-number">{routersList.length} Nodes</span>
            </div>
          </div>

          <div className="metric-chip-card">
            <div className="chip-icon bg-purple">
              <Layers size={16} />
            </div>
            <div className="chip-info">
              <span className="chip-title">Physical Links</span>
              <span className="chip-number">{linksList.length} Links</span>
            </div>
          </div>

          <div className="metric-chip-card">
            <div className="chip-icon bg-emerald">
              <Zap size={16} />
            </div>
            <div className="chip-info">
              <span className="chip-title">LSDB Sync Status</span>
              <span className="chip-number text-emerald">100% Synchronized</span>
            </div>
          </div>

          <div className="metric-chip-card">
            <div className="chip-icon bg-amber">
              <Radio size={16} />
            </div>
            <div className="chip-info">
              <span className="chip-title">Convergence Time</span>
              <span className="chip-number">
                {convergenceStats ? `${convergenceStats.computation_time_ms.toFixed(2)} ms` : '< 1.5 ms'}
              </span>
            </div>
          </div>

          <div className="metric-chip-card author-kpi-card" onClick={() => setShowAuthorsModal(true)}>
            <div className="chip-icon bg-rose">
              <Users size={16} />
            </div>
            <div className="chip-info">
              <span className="chip-title">Project By</span>
              <span className="chip-number author-name-kpi">Sagar and Sharukesh</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Navigation */}
        <div className="navigation-tabs">
          <button
            className={`tab-btn ${activeTab === 'topology' ? 'active' : ''}`}
            onClick={() => setActiveTab('topology')}
          >
            <NetIcon size={16} />
            <span>Topology & Forwarding</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'dijkstra' ? 'active' : ''}`}
            onClick={() => setActiveTab('dijkstra')}
          >
            <Calculator size={16} />
            <span>Dijkstra SPF Visualizer</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'lsdb' ? 'active' : ''}`}
            onClick={() => setActiveTab('lsdb')}
          >
            <Database size={16} />
            <span>LSDB Inspector</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'faults' ? 'active' : ''}`}
            onClick={() => setActiveTab('faults')}
          >
            <Flame size={16} />
            <span>Fault Injection</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <Terminal size={16} />
            <span>Protocol Event Logs</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="tab-viewport">
          {/* TAB 1: Topology & Forwarding */}
          {activeTab === 'topology' && (
            <div className="topology-view-layout">
              <div className="graph-column">
                <NetworkGraph
                  network={network}
                  selectedRouter={selectedRouter}
                  onSelectRouter={setSelectedRouter}
                  highlightPath={highlightPath}
                  packetAnim={animatingPacket}
                  isFlooding={isFlooding}
                  onToggleLinkFail={handleToggleLinkFail}
                />
              </div>

              <div className="controls-column">
                <PacketSimulator
                  routers={routersList}
                  onSimulatePacket={handleSimulatePacket}
                  lastPacketResult={lastPacketResult}
                  isSimulating={isSimulatingPacket}
                  selectedSrc={selectedSimSrc}
                  selectedDst={selectedSimDst}
                />

                <RoutingTables
                  network={network}
                  selectedRouter={selectedRouter}
                  onSelectRouter={setSelectedRouter}
                  onQuickSimulate={handleQuickSimulate}
                />
              </div>
            </div>
          )}

          {/* TAB 2: Dijkstra SPF Visualizer */}
          {activeTab === 'dijkstra' && (
            <div className="dijkstra-view-layout">
              {/* Top Router Switcher */}
              <div className="dijkstra-router-picker">
                <span className="picker-label">Root Router (Source s):</span>
                <div className="picker-pills">
                  {routersList.map((r) => {
                    const rId = typeof r === 'string' ? r : r.id;
                    return (
                      <button
                        key={`dijkstra-root-${rId}`}
                        className={`root-pill ${rId === selectedRouter ? 'active' : ''}`}
                        onClick={() => setSelectedRouter(rId)}
                      >
                        Router [{rId}]
                      </button>
                    );
                  })}
                </div>
              </div>

              <DijkstraVisualizer
                sourceRouter={selectedRouter}
                dijkstraData={dijkstraData}
                allRouters={routersList}
              />
            </div>
          )}

          {/* TAB 3: LSDB Inspector */}
          {activeTab === 'lsdb' && (
            <div className="lsdb-view-layout">
              <LSDBInspector
                network={network}
                selectedRouter={selectedRouter}
                onSelectRouter={setSelectedRouter}
                onTriggerConverge={handleTriggerConverge}
              />
            </div>
          )}

          {/* TAB 4: Fault Injection & Dynamic Convergence */}
          {activeTab === 'faults' && (
            <div className="faults-view-layout">
              <FaultInjector
                network={network}
                onToggleLinkFail={handleToggleLinkFail}
                onQuickFailLink={handleQuickFailLink}
              />

              <div className="fault-graph-preview">
                <NetworkGraph
                  network={network}
                  selectedRouter={selectedRouter}
                  onSelectRouter={setSelectedRouter}
                  highlightPath={highlightPath}
                  onToggleLinkFail={handleToggleLinkFail}
                />
              </div>
            </div>
          )}

          {/* TAB 5: Protocol Event Logs */}
          {activeTab === 'logs' && (
            <div className="logs-view-layout">
              <EventLogTerminal
                logs={network?.logs || []}
                onClearLogs={() => {
                  if (network) setNetwork({ ...network, logs: [] });
                }}
              />
            </div>
          )}
        </div>
      </main>

      {/* Footer Attribution */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-left">
            <span className="footer-badge">
              <Sparkles size={13} className="sparkle-icon" />
              <strong>Project by Sagar and Sharukesh</strong>
            </span>
          </div>

          <div className="footer-center">
            <span>{PROJECT_AUTHORS.meta.course}</span>
            <span className="footer-dot">•</span>
            <span>{PROJECT_AUTHORS.meta.department}</span>
          </div>

          <div className="footer-right">
            <button className="footer-link-btn" onClick={() => setShowTheoryModal(true)}>
              Protocol Documentation
            </button>
            <button className="footer-link-btn" onClick={() => setShowAuthorsModal(true)}>
              Author Info
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthorsModal
        isOpen={showAuthorsModal}
        onClose={() => setShowAuthorsModal(false)}
      />

      <TheoryModal
        isOpen={showTheoryModal}
        onClose={() => setShowTheoryModal(false)}
      />
    </div>
  );
}

