# Link-State Routing Simulator — Presentation Cheat Sheet

A concise reference guide to present this project clearly and answer any technical questions from your teacher.

---

## 1. 30-Second Elevator Pitch
> *"This project simulates **Link-State Routing (the protocol powering the internet via OSPF and IS-IS)**. Every router discovers its immediate neighbors, generates a **Link-State Packet (LSP)**, and broadcasts it across the network using **reliable flooding**. Once all routers synchronize an identical **Link-State Database (LSDB)**, each router independently runs **Dijkstra’s Shortest Path Algorithm** to build its **Routing Table**. If a link breaks or changes cost, the network detects it, floods new packets, and recalculates optimal paths dynamically without loops."*

---

## 2. The 4-Step Link-State Lifecycle
1. **Neighbor Discovery & LSP Generation:** Each router identifies directly connected neighbors and costs, packing them into an LSP with an incremented sequence number.
2. **Reliable Flooding:** LSPs are forwarded to all neighbors except the sender. Duplicate or older sequence numbers are discarded to avoid loops.
3. **Database Synchronization (LSDB):** Every router stores all valid LSPs, giving every node an identical map of the entire network.
4. **Dijkstra SPF & Forwarding:** Each router computes the shortest path tree rooted at itself to determine the `next_hop` for every destination.

---

## 3. All Core Functions & Architecture

### A. `packet.py` (Packet Data Models)
* **`LSP`**: Dataclass representing a Link-State Packet (`router_id`, `sequence_number`, `neighbors: {id: cost}`, `age`, `timestamp`).
  * `is_newer_than(other)`: Compares sequence numbers. Returns `True` only if this packet is newer than the stored one.
  * `copy()`: Clones the packet while preserving state during flooding.
* **`DataPacket`**: Represents regular traffic routed through the network (`src`, `dst`, `payload`, `ttl=30`, `path_traversed`, `accumulated_cost`).
  * `add_hop(router_id, cost)`: Records visited node, adds link metric, decrements TTL.

---

### B. `router.py` (`Router` Class)
Represents an autonomous router node.
* **`add_neighbor(neighbor_id, cost)` / `remove_neighbor(neighbor_id)`**: Updates local physical interfaces.
* **`generate_lsp()`**: Increments local `seq_number`, builds an LSP with active neighbors, saves it into local LSDB, and returns it for flooding.
* **`process_incoming_lsp(lsp)`**: Flooding filter.
  * Drops expired packets (`age <= 0`) or older/duplicate sequence numbers (`duplicate_ignored` / `outdated_ignored`).
  * Saves newer LSPs to `self.lsdb` and signals `should_forward = True`.
* **`build_topology_graph()`**: Translates the synchronized LSDB into an adjacency graph $G = (V, E)$ for pathfinding.
* **`run_dijkstra()`**: Executes Dijkstra's algorithm from this router:
  * Selects lowest-cost unvisited node, relaxes edges, records predecessor nodes.
  * Stores a step-by-step log in `self.dijkstra_trace` (visited sets, distance updates).
  * Constructs `self.routing_table` mapping: `Destination -> { Next-Hop, Cost, Full-Path }`.
  * Builds `self.spf_tree` (Shortest Path Tree).
* **`forward_data_packet(packet)`**: Consults the routing table to return the immediate `next_hop`. Detects when packet reaches destination or if TTL expires.

---

### C. `network.py` (`Network` Class)
The network coordinator and simulation environment.
* **`add_router(id)` / `remove_router(id)`**: Adds or removes nodes dynamically.
* **`add_link(u, v, cost)`**: Creates or updates a bidirectional weighted link.
* **`fail_link(u, v)` / `restore_link(u, v, cost)`**: Simulates physical cable cuts and reconnections.
* **`flood_lsp(origin_router_id)`**: Implements BFS flooding across interfaces, suppressing duplicates and preventing packets from echoing back on the incoming interface.
* **`synchronize_and_converge()`**: Full convergence cycle:
  1. All routers flood their LSPs.
  2. All routers compute Dijkstra shortest paths.
  3. Verifies LSDB synchronization across all nodes.
* **`verify_lsdb_consistency()`**: Validates that all routers share an identical topology map.
* **`simulate_packet_routing(src, dst)`**: Sends a `DataPacket` hop-by-hop using actual router tables; validates end-to-end delivery and detects routing loops.
* **`load_from_json(filepath)` / `save_to_json(filepath)`**: Imports/exports network scenarios.

---

### D. `visualizer.py` (CLI & Graphical Output)
* **`print_routing_table(router)`**: Prints formatted ASCII routing table.
* **`print_lsdb(router)`**: Displays the current database state of any router.
* **`print_dijkstra_trace(router)`**: Step-by-step trace showing unvisited nodes, visited nodes ($N'$), and tentative distance relaxations.
* **`print_packet_trace(packet)`**: Hop-by-hop traversal log with total cost.
* **`plot_network_graph(network, ...)`**: Generates a Matplotlib visual topology map with highlighted shortest paths.

---

## 4. Key Features to Highlight to Your Teacher
1. **Full Protocol Realism:** Sequence numbers prevent flooding storms; TTL expires stale state; identical to OSPF/IS-IS.
2. **Dynamic Fault Recovery:** Cut any link at runtime; the network auto-detects, floods new state, and recalculates alternate routes instantly.
3. **Step-by-Step Educational Stepper:** Explains Dijkstra step-by-step (which node is chosen, which edges get relaxed, and how the routing table is populated).
4. **End-to-End Packet Forwarding:** Actual hop-by-hop packet routing with loop detection and TTL checks.
5. **Multiple Interfaces:**
   * **Automated Demo (`python3 demo.py`)**: Scripted walkthrough for fast demonstrations.
   * **Interactive Terminal CLI (`python3 interactive_cli.py`)**: 11-option menu for manual testing.
   * **Modern Web GUI (`python3 server.py` at `http://localhost:5001`)**: Interactive visual graph, live Dijkstra animator, and packet flow simulator.

---

## 5. Quick 2-Minute Demo for Presentation

### Option 1: Automated Script (Fastest & Safest)
```bash
python3 demo.py
```
**What to point out:**
1. Point to **Step 2**: Show how all routers flooded LSPs and achieved 100% LSDB consistency.
2. Point to **Step 3**: Walk through Dijkstra's step-by-step relaxation for router `u`.
3. Point to **Step 5**: Show packet routing from `u` to `z` (Cost: 4.0 via `u -> x -> y -> z`).
4. Point to **Step 6**: Show link failure `(x, y)`. The simulator reroutes dynamically via `u -> v -> y -> z` with zero manual intervention.

### Option 2: Web Dashboard (Most Impressive)
```bash
python3 server.py
# Open browser at http://localhost:5001
```
* Click **"Run Dijkstra"** to see paths highlighted.
* Click **"Fail Link"** on any link and watch the topology and routing table update in real time.
* Click **"Send Packet"** to watch the animated transmission.

---

## 6. Common Questions Your Teacher Might Ask

* **Q: Why Link-State instead of Distance Vector (Bellman-Ford / RIP)?**  
  * *Answer:* Distance Vector routers only know neighbor recommendations ("routing by rumor") which causes slow convergence and count-to-infinity loops. Link-State routers possess the complete topology map, calculating loop-free shortest paths locally and converging much faster.

* **Q: How do you prevent infinite packet loops during flooding?**  
  * *Answer:* Two mechanisms: (1) Monotonically increasing **sequence numbers** (routers reject packets $\le$ existing sequence number), and (2) **Split horizon during flooding** (never forward an LSP back onto the interface it was received from).

* **Q: What is the time complexity of Dijkstra in this project?**  
  * *Answer:* With $|V|$ vertices and $|E|$ edges, standard implementation is $O(|V|^2)$, or $O((|V| + |E|) \log |V|)$ using a min-heap priority queue. In real networks, OSPF runs this independently on each router.

---

## 7. Acronyms & Short Forms Reference

| Acronym / Abbreviation | Full Spelled-Out Form | Context in this Project |
| :--- | :--- | :--- |
| **LSR** | **L**ink-**S**tate **R**outing | The overall network routing protocol family simulated |
| **LSP** | **L**ink-**S**tate **P**acket | The packet generated by each router advertising its active neighbors and link costs |
| **LSDB** | **L**ink-**S**tate **D**ata**b**ase | The complete, identical topology map synchronized across all routers |
| **SPF** | **S**hortest **P**ath **F**irst | The shortest-path search algorithm paradigm (Dijkstra) |
| **SPT** | **S**hortest **P**ath **T**ree | The directed tree of shortest paths rooted at the source router |
| **OSPF** | **O**pen **S**hortest **P**ath **F**irst | Real-world industry standard interior routing protocol using link-state routing |
| **IS-IS** | **I**ntermediate **S**ystem to **I**ntermediate **S**ystem | Alternative real-world link-state routing protocol used in telecom/service providers |
| **RIP** | **R**outing **I**nformation **P**rotocol | Legacy distance-vector routing protocol (contrasted with link-state) |
| **TTL** | **T**ime-**T**o-**L**ive | Hop-counter decremented at each node to discard lost/looping packets |
| **BFS** | **B**readth-**F**irst **S**earch | Queue-based search traversal used to simulate packet propagation during flooding |
| **CLI** | **C**ommand-**L**ine **I**nterface | The interactive terminal menu (`interactive_cli.py`) |
| **GUI** | **G**raphical **U**ser **I**nterface | The interactive web frontend visualizer |
| **API** | **A**pplication **P**rogramming **I**nterface | The interface connecting frontend and backend |
| **REST** | **RE**presentational **S**tate **T**ransfer | Architecture style of the Flask web server endpoints (`server.py`) |
| **ASCII** | **A**merican **S**tandard **C**ode for **I**nformation **I**nterchange | Plaintext terminal tables used for formatting routing tables and LSDB |
| **JSON** | **J**ava**S**cript **O**bject **N**otation | File format used to store and import network topologies (`scenarios/`) |


