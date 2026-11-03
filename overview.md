# 🌐 Comprehensive Project Overview: Link-State Routing & Dijkstra SPF Simulator

**Project:** Link-State Routing Protocol & Dijkstra Shortest Path Simulator  
**Authors:** Project by Sagar and Sharukesh (Sagar Sewak & Sharukesh)  
**Course:** Network Protocols and Algorithms (7th Semester)  
**Department:** Department of Computer Science & Engineering  

---

## 📑 Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Theoretical Topics Covered](#2-theoretical-topics-covered)
3. [Algorithmic Foundations & Mathematical Formulations](#3-algorithmic-foundations--mathematical-formulations)
4. [End-to-End Implementation Architecture](#4-end-to-end-implementation-architecture)
   - [4.1 Backend Implementation (Python & Flask)](#41-backend-implementation-python--flask)
   - [4.2 Frontend Implementation (React, Vite & SVG Engine)](#42-frontend-implementation-react-vite--svg-engine)
   - [4.3 Dual-Engine Client Fallback Architecture](#43-dual-engine-client-fallback-architecture)
5. [Educational & Pedagogical Benefits](#5-educational--pedagogical-benefits)
6. [Real-World Relevance & Industry Connections](#6-real-world-relevance--industry-connections)
7. [Verification & Preset Scenarios](#7-verification--preset-scenarios)

---

## 1. Executive Summary

In computer networks, routing protocols are the brain of the Internet. They determine the optimal path that data packets traverse across millions of interconnected switches and routers worldwide.

This project delivers a **full-stack, interactive simulation and visual analysis platform** for the **Link-State Routing (LSR)** paradigm and **Dijkstra's Shortest Path First (SPF)** algorithm. By combining an extensible Python protocol simulation backend with a high-performance, vibrant React frontend, the project bridges the gap between abstract algorithmic theory and tangible network behavior.

The simulator allows students, network engineers, and educators to:
- Visually observe **reliable Link-State Packet (LSP) flooding** across network interfaces.
- Verify **Link-State Database (LSDB) global synchronization** across distributed nodes.
- Step through **Dijkstra's SPF algorithm iteration-by-iteration**, monitoring distance relaxations and predecessor updates.
- Test **hop-by-hop packet forwarding** with TTL decrements and routing loop prevention.
- Inject **physical cable cuts (link failures)** in real time and watch dynamic re-flooding and sub-millisecond route recalculation.

---

## 2. Theoretical Topics Covered

### 2.1 Interior Gateway Protocols (IGP)
Routing protocols operate in two major scopes:
- **Exterior Gateway Protocols (EGP / BGP):** Route between distinct Autonomous Systems (ASes).
- **Interior Gateway Protocols (IGP):** Route inside a single autonomous domain or enterprise campus.

This project models IGP behavior, specifically following the architecture of **OSPF (Open Shortest Path First)** and **IS-IS (Intermediate System to Intermediate System)**.

---

### 2.2 Link-State Routing (LSR) vs. Distance-Vector Routing (DVR)

| Architectural Dimension | Distance-Vector (RIP / Bellman-Ford) | Link-State Routing (OSPF / IS-IS) |
|---|---|---|
| **Topology Knowledge** | Routers only know neighbor cost estimates ("Routing by rumor"). | Every router has a complete, identical map of the global graph $G = (V, E)$. |
| **Routing Algorithm** | Distributed Bellman-Ford equation ($D_x(y) = \min_v \{ c(x,v) + D_v(y) \}$). | Dijkstra's Shortest Path First (SPF) algorithm executed locally at each node. |
| **Convergence Speed** | Slow; susceptible to the **Count-to-Infinity** problem. | Extremely fast; event-driven re-flooding and local recomputation. |
| **Packet Overhead** | Periodic full routing table broadcasts (e.g., every 30s in RIP). | Small LSPs transmitted only upon startup or topological state changes. |
| **Loop Vulnerability** | High risk of transient loops during convergence. | Loop-free; consistent global LSDB prevents forwarding cycles. |

---

### 2.3 Key Protocol Mechanisms

```
+-----------------------------------------------------------------------------------+
|                           LINK-STATE PROTOCOL LIFECYCLE                           |
+-----------------------------------------------------------------------------------+
| 1. Neighbor Discovery  ==>  2. LSP Generation  ==>  3. Reliable Flooding          |
|    Discover adjacent        Construct Link-State       Broadcast LSPs to all      |
|    nodes and link costs.    Packets (seq#, age).       interfaces (split-horizon).|
+-----------------------------------------------------------------------------------+
                                        ||
                                        \/
+-----------------------------------------------------------------------------------+
| 4. LSDB Synchronization ==> 5. Dijkstra SPF Tree ==> 6. Forwarding Table (FIB)    |
|    Build identical global   Compute shortest path      Derive immediate next-hop  |
|    network graph G=(V,E).   tree rooted at self.       entries for packet routing.|
+-----------------------------------------------------------------------------------+
```

1. **Link-State Packet (LSP) Structure:**
   Each router constructs an LSP containing:
   - `router_id`: Originating router identifier.
   - `sequence_number`: Monotonically increasing counter to prevent replay attacks and discard duplicates.
   - `neighbors`: Mapping of active neighbor interfaces and their respective metric weights (`{neighbor_id: cost}`).
   - `age` (TTL): Counter decremented at each hop to expire stale state.

2. **Reliable Flooding Algorithm:**
   LSPs are broadcast across all active interfaces **except the arrival interface** (split-horizon rule). Routers cross-check incoming sequence numbers against their local LSDB:
   - If `seq_number > stored_seq`: Accept LSP, update LSDB, decrement age, and flood to neighbors.
   - If `seq_number <= stored_seq`: Duplicate or outdated; discard immediately.

3. **Link-State Database (LSDB):**
   A synchronized in-memory database holding the latest valid LSP from every router in the network. When all routers have identical LSDBs, the network has achieved **topological consensus**.

4. **Dynamic Fault Recovery & Convergence:**
   When a physical link is severed, adjacent routers detect interface failure, increment their sequence numbers, and flood an updated LSP advertising the removed adjacency. All network nodes update their LSDB and independently recalculate new optimal paths without transient routing loops.

---

## 3. Algorithmic Foundations & Mathematical Formulations

### 3.1 Dijkstra's Shortest Path First (SPF) Algorithm

Let $G = (V, E)$ be a directed/undirected weighted graph where:
- $V$ is the set of all router nodes.
- $E$ is the set of active physical links.
- $c(u, v)$ is the non-negative metric cost of link $(u, v) \in E$.
- $s \in V$ is the root/source router executing the calculation.

#### State Variables:
- $N'$: The set of nodes whose shortest path from $s$ is definitively known (**Permanent Set**).
- $D(v)$: Current estimate of the shortest path distance from $s$ to destination $v$ (**Distance Vector**).
- $p(v)$: Predecessor node immediately preceding $v$ on the current shortest path (**Predecessor Vector**).

#### Mathematical Formulation:

$$\text{Step 1 (Initialization):}$$

$$N' = \{s\}$$

$$\forall v \notin N', \quad D(v) = \begin{cases} c(s, v) & \text{if } (s, v) \in E \\ \infty & \text{otherwise} \end{cases}$$

$$p(v) = \begin{cases} s & \text{if } (s, v) \in E \\ \text{None} & \text{otherwise} \end{cases}$$

$$\text{Step 2 (Iterative Minimum Selection):}$$

$$\text{Find } w \notin N' \text{ such that } D(w) = \min_{v \notin N'} D(v)$$

$$N' = N' \cup \{w\}$$

$$\text{Step 3 (Link Relaxation):}$$

$$\forall \text{ unvisited neighbors } v \notin N' \text{ of } w:$$

$$D(v) = \min \Big( D(v), \; D(w) + c(w, v) \Big)$$

$$\text{If } D(v) \text{ was updated (relaxed), assign: } p(v) = w$$

$$\text{Step 4 (Termination & Routing Table Extraction):}$$

Repeat Steps 2–3 until $N' = V$. To determine the next-hop interface for destination $d \neq s$, trace predecessor pointers backwards from $d$ to $s$:

$$\text{Path: } [s \rightarrow n_1 \rightarrow n_2 \rightarrow \dots \rightarrow p(d) \rightarrow d] \implies \text{Next Hop} = n_1$$

#### Algorithmic Complexity:
- **Array-based implementation:** $\mathcal{O}(|V|^2)$ time complexity.
- **Min-Heap / Priority Queue implementation:** $\mathcal{O}((|V| + |E|) \log |V|)$ time complexity.

---

### 3.2 Hop-by-Hop Data Packet Forwarding Algorithm
When a data packet arrives at router $u$ destined for $d$:
1. If $u = d$: Packet has reached its destination $\rightarrow$ deliver to upper protocol layer.
2. If $\text{TTL} \le 0$: Drop packet and generate ICMP Time Exceeded message.
3. Look up $d$ in router $u$'s Forwarding Information Base (FIB):
   - If route exists: Retrieve `next_hop` $v$.
   - If link $(u, v)$ is down: Report routing failure.
   - If $v$ has already been visited in the packet's path history: Drop packet and report **Routing Loop Detected**.
4. Decrement $\text{TTL} \leftarrow \text{TTL} - 1$, accumulate edge cost, and transmit to $v$.

---

## 4. End-to-End Implementation Architecture

The repository is architected into two decoupled yet seamlessly synchronized layers: a **Python protocol simulation library & REST API**, and a **React 19 + SVG modern frontend**.

```
Project/
├── link_state_sim/          # Core Python simulation engine
│   ├── packet.py            # LSP and DataPacket dataclasses
│   ├── router.py            # Router node, LSDB, Dijkstra SPF, FIB
│   ├── network.py           # Network coordinator, BFS flooding, convergence
│   └── visualizer.py        # Tabular displays & Matplotlib chart generator
├── scenarios/               # JSON topology presets (Textbook, Mesh, Ring)
├── server.py                # Flask REST API + static frontend delivery
├── demo.py                  # Automated demonstration script
├── interactive_cli.py       # Terminal interactive CLI menu
├── test_simulation.py       # Automated unit & integration tests
├── startup.md               # Quick startup guide
├── overview.md              # Detailed technical documentation (this file)
└── frontend/                # Bright, colorful React 19 web application
    ├── src/
    │   ├── components/      # UI components (Graph, Dijkstra, Routing, LSDB, etc.)
    │   ├── engine/          # In-browser Link-State & Dijkstra engine
    │   ├── services/api.js  # Unified API client bridging Python & client engine
    │   └── config/authors.js # Author metadata
    └── package.json
```

---

### 4.1 Backend Implementation (Python & Flask)

#### 1. Data Structures (`link_state_sim/packet.py`):
- `LSP`: Python `@dataclass` holding `router_id`, `sequence_number`, `neighbors` dict (`neighbor_id -> cost`), `age` (default 64), and `timestamp`. Implements `is_newer_than()` to filter duplicate LSPs.
- `DataPacket`: Holds `src`, `dst`, `payload`, `ttl` (default 30), `path_traversed`, `accumulated_cost`, `delivered` flag, and error messages.

#### 2. Distributed Router Logic (`link_state_sim/router.py`):
- `Router`: Models an autonomous routing node.
  - Maintains `neighbors` (directly connected active links) and `lsdb` (database of all known LSPs).
  - `generate_lsp()`: Increments `seq_number` and stores a local snapshot in its own LSDB.
  - `process_incoming_lsp()`: Evaluates age and sequence numbers, returning `(should_forward, reason)`.
  - `build_topology_graph()`: Extracts the verified global graph from synchronized LSPs.
  - `run_dijkstra()`: Computes shortest paths, records complete step-by-step trace tables for visual inspection, and constructs the **Forwarding Information Base (FIB)** and Shortest Path Tree (SPT).
  - `forward_data_packet()`: Consults FIB to dispatch packets to the optimal next hop.

#### 3. Network Coordinator (`link_state_sim/network.py`):
- `Network`: Orchestrates multi-node communication.
  - `flood_lsp()`: Implements a discrete Breadth-First Search (BFS) queue simulating packet propagation over physical interfaces, measuring packets transmitted and duplicates suppressed.
  - `synchronize_and_converge()`: Coordinates network-wide LSP generation, flooding, and Dijkstra recalculation across all nodes, reporting convergence latency in milliseconds.
  - `verify_lsdb_consistency()`: Programmatically verifies that all distributed LSDB tables are 100% identical.
  - `fail_link()` and `restore_link()`: Handles dynamic physical link transitions and triggers event-driven convergence.

#### 4. REST API Backend (`server.py`):
A lightweight Flask API exposing JSON endpoints:
- `GET /api/network`: Global topology nodes, links, and router states.
- `POST /api/converge`: Trigger flooding and re-convergence.
- `GET /api/dijkstra/<router_id>`: Return the full step-by-step iteration trace.
- `POST /api/simulate-packet`: Transmit packet and return traversed hops.
- `POST /api/links/fail` and `POST /api/links/restore`: Real-time fault injection.
- Static file serving: Serves the compiled production React bundle directly on `http://localhost:5001`.

---

### 4.2 Frontend Implementation (React, Vite & SVG Engine)

The frontend is built with **React 19**, **Vite 6**, and **Lucide Icons**, using a custom **neon/cyber-operations visual system**:

1. **Topology Canvas (`NetworkGraph.jsx`):**
   - High-DPI SVG canvas rendering routers as glowing nodes with router IDs and sequence number badges.
   - Physical links displayed with static midpoint metric cost badges.
   - Severed links rendered with dashed crimson glowing strokes and `CUT` badges.
   - Animated data packets physically travelling along the shortest path hop-by-hop with glowing particle effects.
   - Ripple wave animations radiating from nodes during LSP flooding.

2. **Dijkstra SPF Visualizer (`DijkstraVisualizer.jsx`):**
   - Step-by-step playback bar with Play, Pause, Step Next, Step Prev, and Step Slider.
   - Real-time mathematical display of the relaxation formula: $D(v) = \min(D(v), D(w) + c(w, v))$.
   - Interactive table tracking selected node $w$, visited set $N'$, distance vector $D(v)$, predecessor vector $p(v)$, and link relaxations.
   - Shortest Path Tree (SPT) adjacency list.

3. **Routing Tables Inspector (`RoutingTables.jsx`):**
   - Detailed Forwarding Information Base (FIB) view for the selected router or all routers in a grid.
   - Displays destination, next hop, accumulated metric, and path breadcrumbs (`u ➔ x ➔ y ➔ z`).

4. **LSDB Inspector (`LSDBInspector.jsx`):**
   - Inspects the Link-State Database of any router.
   - Displays sequence numbers, age counters, and active link metrics.
   - Global synchronization badge verifying 100% network consistency.

5. **Fault Injection Panel (`FaultInjector.jsx`):**
   - One-click cable cut scenarios tailored to the active topology (e.g. Cut $x \leftrightarrow y$ on Textbook topology).
   - Interactive matrix of physical links to sever or restore links instantly and watch protocol rerouting.

6. **Protocol Event Terminal (`EventLogTerminal.jsx`):**
   - Color-coded live stream of protocol events (INFO in Cyan, SUCCESS in Emerald, ERROR in Rose).

---

### 4.3 Dual-Engine Client Fallback Architecture

To ensure the web GUI runs reliably across all evaluation environments, the frontend incorporates **dual-engine architecture**:
- **Backend Mode:** When `python3 server.py` is running, the frontend communicates with the Python backend over HTTP REST APIs.
- **Standalone Client Mode:** If the backend is not running, the application automatically switches to `frontend/src/engine/linkStateEngine.js`—a pure JavaScript implementation replicating the exact same LSP flooding, LSDB synchronization, and Dijkstra trace algorithms.

This guarantees that instructors or evaluators opening the application via `npm run dev` or `python3 server.py` experience a responsive, zero-error simulation in either setup.

---

## 5. Educational & Pedagogical Benefits

### 1. Concrete Visualization of Abstract Routing Logic
In textbook networking courses, students memorize that "routers flood LSPs and run Dijkstra." This simulator turns that abstract statement into a visual experience: users can watch the sequence numbers increment, observe duplicate packets being dropped, and step through each relaxation of Dijkstra's algorithm.

### 2. Demystifying Distributed Consensus
Students often struggle to understand how dozens of independent routers converge on the same view of a network without a central master server. By inspecting the LSDB of router `u` and comparing it side-by-side with router `z`, learners visually confirm how reliable flooding achieves identical global databases.

### 3. Understanding Protocol Failure Recovery
Instead of reading about convergence time, students can click **"Cut Link (x ↔ y)"**, immediately see the link turn red, observe the sequence numbers increment, and watch router `u` reroute packets to `z` via alternate path `u -> v -> y -> z` with zero packet loss.

### 4. Direct Exam & Viva Preparation
The theoretical modals, step-by-step trace tables, and mathematical relaxation formulas ($D(v) = \min(D(v), D(w) + c(w, v))$) directly correspond to standard university exam and viva questions in Advanced Computer Networks.

---

## 6. Real-World Relevance & Industry Connections

The concepts implemented in this simulator form the operational backbone of modern telecommunications and cloud computing:

### 1. OSPF (Open Shortest Path First - RFC 2328)
OSPF is the most widely deployed Interior Gateway Protocol in enterprise campus networks and data centers. The simulator's LSPs, sequence numbers, flooding queues, and SPF calculations directly mirror OSPF's **Type 1 Router Link-State Advertisements (LSAs)** and SPF recalculation cycles.

### 2. IS-IS (Intermediate System to Intermediate System - RFC 1195)
IS-IS powers the core routing infrastructure of major Internet Service Providers (ISPs) like AT&T, Lumen, and NTT. It uses Link-State Protocol Data Units (LSP-PDUs) that function identically to the LSPs simulated in this project.

### 3. Cloud Data Center Leaf-Spine Architectures
Modern hyper-scale data centers (Google Cloud, AWS, Microsoft Azure) use Clos / Leaf-Spine topologies. While BGP is common at the top of rack, Link-State protocols (OSPF/IS-IS) are frequently utilized for underlay IGP reachability to dynamically route traffic around failed switches and fiber transceivers.

### 4. Traffic Engineering & Metric Optimization
In Tier-1 networks, link costs are not arbitrary numbers—they represent latency in milliseconds, inverse bandwidth (e.g., $100\,\text{Gbps}$ vs. $10\,\text{Gbps}$), or monetary transit costs. By adjusting link weights, network operators shift petabytes of traffic to underutilized optical paths, directly mirroring the link metric modification tested in this simulator.

### 5. High Availability & Carrier-Grade Convergence
When a physical trans-oceanic fiber optic cable is cut by an anchor or earthquake, the network must reconverge in under 50 milliseconds using technologies like **IP Fast Reroute (IP-FRR)**. This project simulates that exact fault-detection and re-routing phenomenon.

---

## 7. Verification & Preset Scenarios

The simulator includes three preconfigured network topologies representing canonical networking scenarios:

### Scenario 1: Kurose-Ross 6-Node Classic Topology (`textbook_topology.json`)
* **Source:** *Computer Networking: A Top-Down Approach* (Kurose & Ross).
* **Nodes (6):** $u, v, w, x, y, z$.
* **Links (10):** Meshed network with multiple redundant paths.
* **Key Demonstration:** Optimal path $u \rightarrow z$ initially routes through $u \rightarrow x \rightarrow y \rightarrow z$ (Cost: 4.0). When link $x \leftrightarrow y$ fails, the protocol automatically converges to alternate path $u \rightarrow v \rightarrow y \rightarrow z$ (Cost: 6.0).

### Scenario 2: Enterprise 7-Node Mesh Network (`mesh_topology.json`)
* **Nodes (7):** $R_1, R_2, R_3, R_4, R_5, R_6, R_7$.
* **Links (11):** Multi-tier core/distribution enterprise network.
* **Key Demonstration:** Demonstrates SPF tree branching across deep mesh topologies with unequal cost paths.

### Scenario 3: 5-Node Ring Network with Cross-Link (`ring_topology.json`)
* **Nodes (5):** $A, B, C, D, E$.
* **Links (6):** Metro ring topology with a central cross-chord ($A \leftrightarrow C$).
* **Key Demonstration:** Evaluates how circular topologies handle chord failures and reroute traffic around the perimeter ring without loops.

---

## 👨‍💻 Project Authors & Attribution

**Project by Sagar and Sharukesh**
* **Sagar Sewak** – Protocol Architecture & Algorithm Development
* **Sharukesh** – Simulation, Testing & Verification
* **Course:** Network Protocols and Algorithms (CS-471 / 7th Semester)

