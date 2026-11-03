# Link-State Routing Protocol & Shortest Path Simulator

> 🚀 **Quick Start:** For step-by-step launch instructions, see [**`startup.md`**](startup.md).  
> 📖 **Comprehensive Overview:** For an in-depth breakdown of all topics, algorithms, implementation, and real-world relevance, see [**`overview.md`**](overview.md).

A modular, extensible Python simulation project for **Network Protocols and Algorithms** demonstrating **Shortest Path Routing** using the **Link-State Routing (LSR / OSPF-style)** paradigm and **Dijkstra's Shortest Path First (SPF)** algorithm.

---

## 📚 Table of Contents
1. [Overview & Theoretical Background](#-overview--theoretical-background)
2. [Key Protocol Mechanisms](#-key-protocol-mechanisms)
3. [Dijkstra's Algorithm Formulation](#-dijkstras-algorithm-formulation)
4. [Project Architecture](#-project-architecture)
5. [Installation & Requirements](#-installation--requirements)
6. [Usage Guide](#-usage-guide)
   - [Automated Demo (`demo.py`)](#1-automated-demo)
   - [Interactive CLI (`interactive_cli.py`)](#2-interactive-cli)
   - [Automated Tests (`test_simulation.py`)](#3-automated-tests)
7. [Preset Scenarios](#-preset-scenarios)
8. [Simulation Results & Verification](#-simulation-results--verification)

---

## 🌐 Overview & Theoretical Background

Link-State Routing is an interior gateway protocol (IGP) paradigm used in production internet protocols like **OSPF (Open Shortest Path First)** and **IS-IS (Intermediate System to Intermediate System)**.

Unlike Distance Vector routing (e.g., RIP / Bellman-Ford), which suffers from the count-to-infinity problem and slow convergence:
- Every router independently discovers its directly connected neighbors and link metrics.
- Routers construct **Link-State Packets (LSPs)** and broadcast them throughout the entire network using **reliable flooding**.
- Every router builds an identical **Link-State Database (LSDB)** representing the complete global network topology graph $G = (V, E)$.
- Each router independently runs **Dijkstra's SPF Algorithm** with itself as the root to construct a **Shortest Path Tree (SPT)** and compute its **Forwarding / Routing Table**.

---

## ⚙️ Key Protocol Mechanisms

### 1. Link-State Packet (LSP)
Each router periodically or upon topological changes generates an LSP containing:
- **Router ID**: Unique identifier of the advertising node.
- **Sequence Number**: Monotonically increasing counter to prevent replay attacks and duplicate processing.
- **Age / TTL**: Decremented at each hop to expire stale state.
- **Neighbors & Metrics**: Mapping of active neighbors and their link costs: `{neighbor_id: cost}`.

### 2. Reliable Flooding Algorithm
- When a router receives an LSP:
  - If `seq_number > current_seq` in LSDB: The LSP is accepted, stored in the LSDB, and forwarded to all neighboring interfaces **except** the incoming interface.
  - If `seq_number <= current_seq`: The packet is treated as duplicate/outdated and immediately dropped.
- This guarantees loop-free, complete flooding across any arbitrary network topology.

### 3. Dynamic Link Failure & Convergence
- When a link fails or its metric changes, connected routers detect the state transition, increment their sequence numbers, and flood an updated LSP.
- All routers update their LSDB and re-run Dijkstra's algorithm to recalculate new optimal paths without transient routing loops.

---

## 🧮 Dijkstra's Algorithm Formulation

Let $G = (V, E)$ be the network graph where $V$ is the set of routers and $c(u, v)$ is the link cost.
For source node $s \in V$:

1. **Initialization:**
   $$N' = \{s\}$$
   $$\forall v \notin N', \quad D(v) = c(s, v) \text{ if } (s, v) \in E \text{ else } \infty$$
   $$p(v) = s \text{ if } (s, v) \in E \text{ else } \text{None}$$

2. **Loop:**
   - Find $w \notin N'$ such that $D(w) = \min_{v \notin N'} D(v)$.
   - Add $w$ to $N'$: $N' = N' \cup \{w\}$.
   - Update $D(v)$ for all neighbors $v \notin N'$ of $w$:
     $$D(v) = \min(D(v), D(w) + c(w, v))$$
     If $D(v)$ was updated, set predecessor $p(v) = w$.

3. **Termination:** When $N' = V$, trace predecessors back to source $s$ to construct next-hop forwarding table entries.

---

## 📂 Project Architecture

```
Project/
├── link_state_sim/
│   ├── __init__.py          # Package exports
│   ├── packet.py            # LSP and DataPacket dataclasses
│   ├── router.py            # Router node, LSDB, Dijkstra SPF, routing table
│   ├── network.py           # Network coordinator, reliable flooding, packet routing
│   └── visualizer.py        # Tabular displays & Matplotlib graph rendering
├── scenarios/
│   ├── textbook_topology.json # Classic 6-node Kurose-Ross network
│   ├── mesh_topology.json     # 7-node redundant mesh network
│   └── ring_topology.json     # 5-node ring network
├── server.py                # REST API backend (Flask) serving simulation & React frontend
├── demo.py                  # End-to-end automated walkthrough
├── interactive_cli.py       # Interactive terminal simulator with menus
├── test_simulation.py       # Comprehensive unit & integration test suite
├── requirements.txt         # Python dependencies
├── frontend/                # Bright & colorful interactive React simulator
│   ├── src/
│   │   ├── config/authors.js # Author config ("Sagar Sewak" & collaborator placeholder)
│   │   ├── components/      # UI components (Graph, Dijkstra, Routing, LSDB, Packets)
│   │   ├── engine/          # High-performance in-browser Link-State & SPF engine
│   │   └── services/api.js  # Unified API client bridging Python & client engine
│   └── package.json
└── README.md                # Project documentation
```

---

## 👨‍💻 Project Authors & Attribution

**Project by Sagar and Sharukesh**
- **Sagar Sewak** (*Protocol Architecture & Algorithm Development*)
- **Sharukesh** (*Simulation, Testing & Verification*)

---

## 🚀 Installation & Requirements

Python 3.9+ and Node.js 18+ are supported.

### 1. Backend Dependencies
```bash
pip install -r requirements.txt
```

### 2. Frontend Dependencies
```bash
cd frontend
npm install
```

---

## 💻 Usage Guide

### 🌟 1. Interactive React Web Frontend (Recommended)

#### Option A: Run Full-Stack with Python Backend
Start the Python REST API server (which also serves the compiled React app):
```bash
python3 server.py
```
Open **[http://localhost:5001](http://localhost:5001)** in your browser.

#### Option B: Run React Development Server with Hot-Reloading
```bash
cd frontend
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser. The frontend connects to the Python API if running, or gracefully runs in standalone in-browser simulation mode.

### 2. Automated Demo
Runs the complete simulation lifecycle: initial flooding, Dijkstra step-by-step trace, routing table generation, packet transmission, dynamic link failure injection, re-convergence, and saves topology diagrams to PNG images.

```bash
python3 demo.py
```

### 3. Interactive CLI
An interactive menu allowing you to inspect routers, view step-by-step Dijkstra iterations, trigger custom link failures, route custom packets, and load different scenarios:

```bash
python3 interactive_cli.py
```

### 4. Automated Tests
Run unit tests to verify algorithmic correctness:

```bash
python3 -m unittest test_simulation.py
```

---

## 📊 Preset Scenarios

| Scenario File | Description | Nodes | Links |
|---|---|---|---|
| [`textbook_topology.json`](scenarios/textbook_topology.json) | Standard 6-node network ($u, v, w, x, y, z$) | 6 | 10 |
| [`mesh_topology.json`](scenarios/mesh_topology.json) | Enterprise mesh network ($R_1 \dots R_7$) | 7 | 11 |
| [`ring_topology.json`](scenarios/ring_topology.json) | Ring network with cross-link ($A \dots E$) | 5 | 6 |

---

## 🔬 Simulation Results & Verification

### Sample Routing Table for Router `u` (Textbook Topology)
```
================ ROUTING TABLE: Router [u] ================
+---------------+------------+---------------+------------------+
| Destination   | Next Hop   | Cost (Metric) | Shortest Path    |
+---------------+------------+---------------+------------------+
| v             | v          |           2.0 | u -> v           |
| w             | x          |           3.0 | u -> x -> y -> w |
| x             | x          |           1.0 | u -> x           |
| y             | x          |           2.0 | u -> x -> y      |
| z             | x          |           4.0 | u -> x -> y -> z |
+---------------+------------+---------------+------------------+
```

### Fault Recovery Verification
When link $x \leftrightarrow y$ fails:
1. Routers $x$ and $y$ detect failure and generate new LSPs with updated sequence numbers.
2. Re-flooding completes in $< 100\text{ ms}$.
3. Router $u$ dynamically reroutes traffic destined for $z$ via next-hop $v$: `u -> v -> y -> z` (Cost: 6.0).
