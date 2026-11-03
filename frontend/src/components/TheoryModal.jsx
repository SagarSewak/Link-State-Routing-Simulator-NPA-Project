import React from 'react';
import { BookOpen, X, Cpu, Layers, GitMerge, CheckCircle, ShieldAlert } from 'lucide-react';

export function TheoryModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container theory-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="author-icon-circle bg-emerald">
              <BookOpen size={22} className="text-emerald" />
            </div>
            <div>
              <h2 className="modal-title">Theoretical Background & Protocol Architecture</h2>
              <p className="modal-subtitle">
                Link-State Routing (OSPF / IS-IS) & Dijkstra's Algorithm Formulation
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body theory-content">
          {/* Section 1: Overview */}
          <section className="theory-section">
            <h3 className="theory-heading">
              <span className="heading-number">1</span> What is Link-State Routing (LSR)?
            </h3>
            <p>
              Link-State Routing is an Interior Gateway Protocol (IGP) paradigm deployed across the internet backbone in production protocols such as <strong>OSPF (Open Shortest Path First)</strong> and <strong>IS-IS (Intermediate System to Intermediate System)</strong>.
            </p>
            <div className="comparison-box">
              <div className="comp-col comp-lsr">
                <div className="comp-title text-emerald">Link-State (OSPF)</div>
                <ul>
                  <li>Global topology knowledge: Every router holds identical LSDB.</li>
                  <li>Fast convergence: No "Count-to-Infinity" problem.</li>
                  <li>Event-driven flooding upon state change.</li>
                  <li>Runs Dijkstra's SPF algorithm independently at each node.</li>
                </ul>
              </div>
              <div className="comp-col comp-dvr">
                <div className="comp-title text-amber">Distance-Vector (RIP / Bellman-Ford)</div>
                <ul>
                  <li>"Routing by rumor": Only knows neighbors' distance estimates.</li>
                  <li>Slow convergence with count-to-infinity vulnerabilities.</li>
                  <li>Periodic neighbor broadcasts.</li>
                  <li>Susceptible to transient routing loops.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2: Four Key Mechanisms */}
          <section className="theory-section">
            <h3 className="theory-heading">
              <span className="heading-number">2</span> Key Protocol Mechanisms
            </h3>
            <div className="mechanisms-grid">
              <div className="mech-card">
                <div className="mech-title">1. LSP Construction</div>
                <p>
                  Routers discover active links and generate a <strong>Link-State Packet (LSP)</strong> with Router ID, Sequence Number, Age (TTL), and active link metrics.
                </p>
              </div>
              <div className="mech-card">
                <div className="mech-title">2. Reliable Flooding</div>
                <p>
                  LSPs are broadcast across all active interfaces except the ingress interface. Monotonically increasing sequence numbers discard duplicate or stale packets.
                </p>
              </div>
              <div className="mech-card">
                <div className="mech-title">3. LSDB Synchronization</div>
                <p>
                  Through flooding, all routers construct an identical Link-State Database (LSDB) representing the global topology graph <em>G = (V, E)</em>.
                </p>
              </div>
              <div className="mech-card">
                <div className="mech-title">4. Forwarding Table Build</div>
                <p>
                  Each router roots Dijkstra's SPF tree at itself and derives next-hop entries to construct its Forwarding Information Base (FIB).
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Dijkstra Algorithm Formulation */}
          <section className="theory-section">
            <h3 className="theory-heading">
              <span className="heading-number">3</span> Dijkstra SPF Mathematical Formulation
            </h3>
            <div className="math-card">
              <p>
                Let <em>G = (V, E)</em> be the graph where <em>V</em> is the set of routers and <em>c(u, v)</em> is the link cost.
                For source router <em>s</em>:
              </p>
              <div className="math-steps">
                <div className="math-step">
                  <strong>1. Initialization:</strong>
                  <code>N' = {"{s}"}</code>
                  <code>∀ v ∉ N': D(v) = c(s, v) if (s, v) ∈ E else ∞</code>
                  <code>p(v) = s if (s, v) ∈ E else None</code>
                </div>
                <div className="math-step">
                  <strong>2. Iteration Loop:</strong>
                  <p>Find node <em>w ∉ N'</em> such that <code>D(w) = min_{"v ∉ N'"} D(v)</code></p>
                  <p>Add <em>w</em> to <em>N'</em>: <code>N' = N' ∪ {"{w}"}</code></p>
                  <p>Relax all unvisited neighbors <em>v</em> of <em>w</em>:</p>
                  <code className="highlight-code">D(v) = min( D(v), D(w) + c(w, v) )</code>
                  <p>If <em>D(v)</em> was reduced, set predecessor <code>p(v) = w</code>.</p>
                </div>
                <div className="math-step">
                  <strong>3. Termination:</strong>
                  <p>When <em>N' = V</em>, backtrack along predecessor pointers <em>p(v)</em> to source <em>s</em> to determine the immediate next hop.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Dynamic Failure */}
          <section className="theory-section">
            <h3 className="theory-heading">
              <span className="heading-number">4</span> Fault Recovery & Dynamic Rerouting
            </h3>
            <p>
              When a physical link fails (e.g., link cut between <em>x</em> and <em>y</em>):
            </p>
            <ol className="failure-steps-list">
              <li>Adjacent routers detect loss of keepalive / link failure.</li>
              <li>Connected routers increment their sequence number and flood a new LSP reflecting the removed adjacency.</li>
              <li>Every router updates its LSDB and runs Dijkstra's algorithm to recalculate optimal alternate routes without downtime.</li>
            </ol>
          </section>
        </div>

        <div className="modal-footer">
          <button className="btn-modal-done" onClick={onClose}>
            Back to Simulator
          </button>
        </div>
      </div>
    </div>
  );
}

