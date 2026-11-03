import React, { useState, useEffect } from 'react';
import { 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Cpu, 
  ArrowRight,
  ArrowLeftRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

export function PacketSimulator({
  routers = [],
  onSimulatePacket,
  lastPacketResult = null,
  isSimulating = false,
  selectedSrc = null,
  selectedDst = null,
}) {
  const routerIds = routers.map(r => typeof r === 'string' ? r : r.id).sort();

  const [src, setSrc] = useState(routerIds[0] || 'u');
  const [dst, setDst] = useState(routerIds[routerIds.length - 1] || 'z');
  const [payload, setPayload] = useState('Network Protocols Assignment Data');

  // Synchronize src/dst whenever router list changes (e.g. scenario switch)
  useEffect(() => {
    if (!routerIds || routerIds.length === 0) return;

    setSrc((prevSrc) => {
      if (routerIds.includes(prevSrc)) return prevSrc;
      return routerIds[0];
    });

    setDst((prevDst) => {
      if (routerIds.includes(prevDst) && prevDst !== routerIds[0]) return prevDst;
      return routerIds.length > 1 ? routerIds[routerIds.length - 1] : routerIds[0];
    });
  }, [routers.length, routerIds.join(',')]);

  // Synchronize when external selection is triggered (e.g. from routing table)
  useEffect(() => {
    if (selectedSrc && routerIds.includes(selectedSrc)) setSrc(selectedSrc);
    if (selectedDst && routerIds.includes(selectedDst)) setDst(selectedDst);
  }, [selectedSrc, selectedDst]);

  const handleSrcChange = (newSrc) => {
    setSrc(newSrc);
    if (newSrc === dst && routerIds.length > 1) {
      const alternate = routerIds.find(id => id !== newSrc) || newSrc;
      setDst(alternate);
    }
  };

  const handleDstChange = (newDst) => {
    setDst(newDst);
    if (newDst === src && routerIds.length > 1) {
      const alternate = routerIds.find(id => id !== newDst) || newDst;
      setSrc(alternate);
    }
  };

  const handleSwap = () => {
    if (routerIds.length < 2) return;
    setSrc(dst);
    setDst(src);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (src === dst) {
      alert('Source and Destination must be distinct routers.');
      return;
    }
    onSimulatePacket(src, dst, payload);
  };

  return (
    <div className="packet-sim-card">
      <div className="packet-header">
        <div className="title-group">
          <div className="icon-badge-pink">
            <Send size={18} />
          </div>
          <div>
            <h3 className="section-title">Hop-by-Hop Data Packet Forwarding</h3>
            <p className="section-subtitle">
              Simulate dynamic packet delivery along shortest path forwarding tables
            </p>
          </div>
        </div>
      </div>

      {/* Packet Form Controls */}
      <form onSubmit={handleSend} className="packet-form">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Source Router (Origin)</label>
            <select 
              className="form-select"
              value={src} 
              onChange={(e) => handleSrcChange(e.target.value)}
            >
              {routerIds.map(id => (
                <option key={`src-${id}`} value={id}>Router [{id}]</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="hop-arrow-indicator btn-swap-indicator"
            title="Click to swap Source and Destination"
            onClick={handleSwap}
          >
            <ArrowLeftRight size={18} className="arrow-pulse" />
          </button>

          <div className="form-group">
            <label className="form-label">Destination Router</label>
            <select 
              className="form-select"
              value={dst} 
              onChange={(e) => handleDstChange(e.target.value)}
            >
              {routerIds.map(id => (
                <option key={`dst-${id}`} value={id}>Router [{id}]</option>
              ))}
            </select>
          </div>

          <div className="form-group payload-group">
            <label className="form-label">Data Payload Message</label>
            <input
              type="text"
              className="form-input"
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              placeholder="Enter message..."
            />
          </div>

          <button 
            type="submit" 
            className={`btn-send-packet ${isSimulating ? 'loading' : ''}`}
            disabled={isSimulating || src === dst}
          >
            <Send size={16} className={isSimulating ? 'spin' : ''} />
            <span>{isSimulating ? 'Transmitting...' : 'Send Packet'}</span>
          </button>
        </div>
      </form>

      {/* Packet Delivery Results */}
      {lastPacketResult && (
        <div className={`packet-result-box ${lastPacketResult.delivered ? 'result-success' : 'result-error'}`}>
          <div className="result-header">
            <div className="result-status-title">
              {lastPacketResult.delivered ? (
                <>
                  <CheckCircle2 size={18} className="text-emerald" />
                  <span>PACKET SUCCESSFULLY DELIVERED</span>
                </>
              ) : (
                <>
                  <ShieldAlert size={18} className="text-rose" />
                  <span>DELIVERY FAILURE: {lastPacketResult.error || 'Route Unreachable'}</span>
                </>
              )}
            </div>

            <div className="result-metrics">
              <span className="metric-chip">
                Total Path Cost: <strong>{lastPacketResult.accumulated_cost}</strong>
              </span>
              <span className="metric-chip">
                Hops: <strong>{lastPacketResult.path_traversed?.length || 0}</strong>
              </span>
              <span className="metric-chip">
                TTL Remaining: <strong>{lastPacketResult.ttl_remaining ?? 27}</strong>
              </span>
            </div>
          </div>

          {/* Visual Hop Pathway */}
          <div className="hop-pathway">
            <span className="path-label">Forwarding Path:</span>
            <div className="path-chain">
              {(lastPacketResult.path_traversed || []).map((hopNode, idx) => (
                <React.Fragment key={`path-hop-${idx}`}>
                  <span className={`chain-node ${idx === 0 ? 'chain-src' : idx === (lastPacketResult.path_traversed.length - 1) ? 'chain-dst' : 'chain-mid'}`}>
                    {hopNode}
                  </span>
                  {idx < lastPacketResult.path_traversed.length - 1 && (
                    <ArrowRight size={14} className="chain-arrow" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Hop By Hop Step Breakdown Table */}
          {lastPacketResult.hops && lastPacketResult.hops.length > 0 && (
            <div className="hops-breakdown">
              <div className="hops-title">Hop-by-Hop Forwarding Inspection:</div>
              <div className="hops-timeline">
                {lastPacketResult.hops.map((hop, hIdx) => (
                  <div key={`hop-item-${hIdx}`} className="hop-item">
                    <div className="hop-index-badge">#{hIdx + 1}</div>
                    <div className="hop-details">
                      <div className="hop-node-name">Router [{hop.node}]</div>
                      <div className="hop-action-text">{hop.action}</div>
                    </div>
                    <div className="hop-cost-tag">
                      {hop.cost > 0 ? `+${hop.cost} (Total: ${hop.totalCost})` : 'Origin'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

