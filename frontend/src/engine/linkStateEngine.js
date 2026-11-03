/**
 * In-Browser Link-State Routing Protocol & Dijkstra SPF Simulation Engine.
 * Replicates the exact behavior of link_state_sim (LSP flooding, LSDB, Dijkstra SPF, packet routing).
 */

export const PRESET_SCENARIOS = {
  "textbook_topology.json": {
    name: "Kurose-Ross 6-Node Classic Topology",
    description: "Standard 6-node network (u, v, w, x, y, z) from Computer Networking: A Top-Down Approach.",
    routers: ["u", "v", "w", "x", "y", "z"],
    positions: {
      u: { x: 120, y: 220 },
      v: { x: 300, y: 90 },
      w: { x: 520, y: 90 },
      x: { x: 300, y: 350 },
      y: { x: 520, y: 350 },
      z: { x: 700, y: 220 },
    },
    links: [
      { u: "u", v: "v", cost: 2 },
      { u: "u", v: "w", cost: 5 },
      { u: "u", v: "x", cost: 1 },
      { u: "v", v: "w", cost: 3 },
      { u: "v", v: "y", cost: 2 },
      { u: "w", v: "x", cost: 3 },
      { u: "w", v: "y", cost: 1 },
      { u: "w", v: "z", cost: 5 },
      { u: "x", v: "y", cost: 1 },
      { u: "y", v: "z", cost: 2 },
    ],
  },
  "mesh_topology.json": {
    name: "Enterprise 7-Node Mesh Network",
    description: "Multi-tier redundant enterprise topology with redundant gateway connections.",
    routers: ["R1", "R2", "R3", "R4", "R5", "R6", "R7"],
    positions: {
      R1: { x: 100, y: 220 },
      R2: { x: 260, y: 110 },
      R3: { x: 260, y: 330 },
      R4: { x: 440, y: 110 },
      R5: { x: 440, y: 330 },
      R6: { x: 620, y: 220 },
      R7: { x: 740, y: 220 },
    },
    links: [
      { u: "R1", v: "R2", cost: 4 },
      { u: "R1", v: "R3", cost: 2 },
      { u: "R2", v: "R3", cost: 1 },
      { u: "R2", v: "R4", cost: 5 },
      { u: "R3", v: "R5", cost: 8 },
      { u: "R3", v: "R6", cost: 10 },
      { u: "R4", v: "R5", cost: 2 },
      { u: "R4", v: "R7", cost: 6 },
      { u: "R5", v: "R6", cost: 3 },
      { u: "R5", v: "R7", cost: 4 },
      { u: "R6", v: "R7", cost: 1 },
    ],
  },
  "ring_topology.json": {
    name: "5-Node Ring Network with Cross Link",
    description: "Resilient ring topology with a central chord (A <-> C) testing alternate rerouting.",
    routers: ["A", "B", "C", "D", "E"],
    positions: {
      A: { x: 400, y: 80 },
      B: { x: 650, y: 190 },
      C: { x: 550, y: 380 },
      D: { x: 250, y: 380 },
      E: { x: 150, y: 190 },
    },
    links: [
      { u: "A", v: "B", cost: 3 },
      { u: "B", v: "C", cost: 4 },
      { u: "C", v: "D", cost: 2 },
      { u: "D", v: "E", cost: 5 },
      { u: "E", v: "A", cost: 1 },
      { u: "A", v: "C", cost: 6 },
    ],
  },
};

/**
 * Robustly resolve node coordinates for any scenario, custom routers, and any network state.
 * Guarantees every router has valid (x, y) coordinates for smooth, error-free animation.
 */
export function resolveNodePositions(network, scenarioKey) {
  const scKey = scenarioKey || network?.scenario_name || 'textbook_topology.json';
  const preset = PRESET_SCENARIOS[scKey] || PRESET_SCENARIOS['textbook_topology.json'] || {};
  const presetPos = preset.positions || {};
  const netPos = network?.positions || {};

  const combined = { ...presetPos, ...netPos };

  const routers = (network?.routers || []).map((r) => (typeof r === 'string' ? r : r.id));
  routers.forEach((rId, idx) => {
    if (!combined[rId] || typeof combined[rId].x !== 'number' || typeof combined[rId].y !== 'number') {
      const angle = (idx / Math.max(routers.length, 1)) * 2 * Math.PI - Math.PI / 2;
      combined[rId] = {
        x: Math.round(420 + 180 * Math.cos(angle)),
        y: Math.round(240 + 150 * Math.sin(angle)),
      };
    }
  });

  return combined;
}

export class LinkStateEngine {
  constructor(scenarioKey = "textbook_topology.json") {
    this.scenarioKey = scenarioKey;
    this.name = PRESET_SCENARIOS[scenarioKey]?.name || "Network Simulator";
    this.routers = {}; // id -> RouterSim
    this.links = {}; // "u-v" (sorted) -> cost
    this.failedLinks = new Set(); // "u-v"
    this.nodePositions = {}; // id -> {x, y}
    this.logs = [];
    this.loadScenario(scenarioKey);
  }

  log(msg, type = "info") {
    const time = new Date().toLocaleTimeString();
    this.logs.unshift({
      id: Math.random().toString(36).substring(2, 9),
      time,
      msg,
      type,
    });
    if (this.logs.length > 80) this.logs.pop();
  }

  loadScenario(key) {
    const data = PRESET_SCENARIOS[key] || PRESET_SCENARIOS["textbook_topology.json"];
    this.scenarioKey = key;
    this.name = data.name;
    this.routers = {};
    this.links = {};
    this.failedLinks.clear();
    this.nodePositions = { ...data.positions };

    for (const rId of data.routers) {
      this.routers[rId] = {
        id: rId,
        neighbors: {},
        seqNumber: 0,
        lsdb: {},
        routingTable: {},
        spfTree: {},
        dijkstraTrace: [],
      };
    }

    for (const link of data.links) {
      const u = link.u;
      const v = link.v;
      const cost = Number(link.cost);
      const linkKey = [u, v].sort().join("-");
      this.links[linkKey] = cost;
      this.routers[u].neighbors[v] = cost;
      this.routers[v].neighbors[u] = cost;
    }

    this.log(`Loaded scenario '${this.name}' with ${data.routers.length} routers and ${data.links.length} links.`, "success");
    this.converge();
  }

  converge() {
    const startTime = performance.now();
    let totalLspPackets = 0;
    let duplicatesDropped = 0;

    // Phase 1: Each router increments sequence number & generates LSP
    const generatedLsps = {};
    for (const rId in this.routers) {
      const r = this.routers[rId];
      r.seqNumber += 1;
      const lsp = {
        router_id: rId,
        sequence_number: r.seqNumber,
        neighbors: { ...r.neighbors },
        age: 64,
        timestamp: Date.now(),
      };
      r.lsdb[rId] = { ...lsp };
      generatedLsps[rId] = lsp;
    }

    // Phase 2: Reliable Flooding Simulation
    for (const originId in this.routers) {
      const originLsp = generatedLsps[originId];
      const queue = [];
      const originNeighbors = Object.keys(this.routers[originId].neighbors);
      for (const nbr of originNeighbors) {
        if (this.routers[nbr]) {
          queue.push({ receiverId: nbr, senderId: originId, lsp: { ...originLsp } });
        }
      }

      while (queue.length > 0) {
        const { receiverId, senderId, lsp } = queue.shift();
        totalLspPackets += 1;

        const receiver = this.routers[receiverId];
        if (!receiver) continue;

        const currentLsp = receiver.lsdb[lsp.router_id];
        let accepted = false;

        if (!currentLsp || lsp.sequence_number > currentLsp.sequence_number) {
          receiver.lsdb[lsp.router_id] = { ...lsp };
          accepted = true;
        } else {
          duplicatesDropped += 1;
        }

        if (accepted && lsp.age > 1) {
          const forwardedLsp = { ...lsp, age: lsp.age - 1 };
          for (const nextHop of Object.keys(receiver.neighbors)) {
            if (nextHop !== senderId && this.routers[nextHop]) {
              queue.push({ receiverId: nextHop, senderId: receiverId, lsp: forwardedLsp });
            }
          }
        }
      }
    }

    // Phase 3: Run Dijkstra SPF on all routers
    for (const rId in this.routers) {
      this.runDijkstra(rId);
    }

    const elapsed = performance.now() - startTime;
    const isConsistent = this.checkLsdbConsistency();

    this.log(`Network converged in ${elapsed.toFixed(2)} ms. LSPs flooded: ${totalLspPackets}, Duplicates: ${duplicatesDropped}.`, "info");

    return {
      converged: true,
      computation_time_ms: elapsed,
      total_lsp_packets: totalLspPackets,
      total_duplicates_dropped: duplicatesDropped,
      lsdb_consistent: isConsistent,
    };
  }

  checkLsdbConsistency() {
    const rIds = Object.keys(this.routers);
    if (rIds.length <= 1) return true;
    const baseKeys = Object.keys(this.routers[rIds[0]].lsdb).sort().join(",");
    for (let i = 1; i < rIds.length; i++) {
      const keys = Object.keys(this.routers[rIds[i]].lsdb).sort().join(",");
      if (keys !== baseKeys) return false;
    }
    return true;
  }

  runDijkstra(routerId) {
    const router = this.routers[routerId];
    if (!router) return {};

    // Build topology graph from LSDB
    const graph = {};
    for (const node in router.lsdb) {
      graph[node] = {};
      const neighbors = router.lsdb[node].neighbors || {};
      for (const nbr in neighbors) {
        graph[node][nbr] = neighbors[nbr];
        if (!graph[nbr]) graph[nbr] = {};
      }
    }

    const allNodes = Object.keys(graph);
    if (allNodes.length === 0) allNodes.push(routerId);

    const distances = {};
    const predecessors = {};
    for (const node of allNodes) {
      distances[node] = Infinity;
      predecessors[node] = null;
    }
    distances[routerId] = 0;

    const unvisited = new Set(allNodes);
    const visited = new Set();
    const trace = [];
    let stepNum = 0;

    while (unvisited.size > 0) {
      let minNode = null;
      let minDistance = Infinity;
      for (const node of unvisited) {
        if (distances[node] < minDistance) {
          minDistance = distances[node];
          minNode = node;
        }
      }

      if (!minNode || distances[minNode] === Infinity) {
        break; // Unreachable remaining nodes
      }

      unvisited.delete(minNode);
      visited.add(minNode);
      stepNum += 1;

      const relaxations = [];
      const neighbors = graph[minNode] || {};
      for (const nbr in neighbors) {
        if (unvisited.has(nbr)) {
          const weight = neighbors[nbr];
          const newDist = distances[minNode] + weight;
          if (newDist < distances[nbr]) {
            const oldDist = distances[nbr];
            distances[nbr] = newDist;
            predecessors[nbr] = minNode;
            relaxations.push({
              neighbor: nbr,
              old_dist: oldDist,
              new_dist: newDist,
              via: minNode,
            });
          }
        }
      }

      trace.push({
        step: stepNum,
        selected_node: minNode,
        selected_cost: distances[minNode],
        visited_nodes: Array.from(visited).sort(),
        unvisited_nodes: Array.from(unvisited).sort(),
        distances: { ...distances },
        predecessors: { ...predecessors },
        relaxations,
      });
    }

    // Reconstruct routing table
    const routingTable = {};
    const spfTree = {};
    for (const node of allNodes) spfTree[node] = [];

    for (const dest of allNodes) {
      if (dest === routerId || distances[dest] === Infinity) continue;
      const path = [];
      let curr = dest;
      while (curr !== null) {
        path.push(curr);
        if (curr === routerId) break;
        curr = predecessors[curr];
      }
      path.reverse();

      if (path.length >= 2 && path[0] === routerId) {
        routingTable[dest] = {
          cost: distances[dest],
          next_hop: path[1],
          full_path: path,
        };
      }
    }

    for (const [node, parent] of Object.entries(predecessors)) {
      if (parent && spfTree[parent]) {
        spfTree[parent].push(node);
      }
    }

    router.routingTable = routingTable;
    router.spfTree = spfTree;
    router.dijkstraTrace = trace;

    return routingTable;
  }

  failLink(u, v) {
    const linkKey = [u, v].sort().join("-");
    if (!this.links[linkKey]) return null;

    const cost = this.links[linkKey];
    this.failedLinks.add(linkKey);

    if (this.routers[u]) delete this.routers[u].neighbors[v];
    if (this.routers[v]) delete this.routers[v].neighbors[u];

    this.log(`🚨 LINK FAILURE: Cable cut between '${u}' and '${v}'!`, "error");
    const stats = this.converge();
    return { cost, stats };
  }

  restoreLink(u, v, cost = null) {
    const linkKey = [u, v].sort().join("-");
    const restoreCost = cost !== null ? Number(cost) : (this.links[linkKey] || 1.0);

    this.links[linkKey] = restoreCost;
    this.failedLinks.delete(linkKey);

    if (this.routers[u]) this.routers[u].neighbors[v] = restoreCost;
    if (this.routers[v]) this.routers[v].neighbors[u] = restoreCost;

    this.log(`✅ LINK RESTORED: Link '${u}' <-> '${v}' restored with metric cost ${restoreCost}.`, "success");
    const stats = this.converge();
    return { cost: restoreCost, stats };
  }

  setLinkCost(u, v, cost) {
    const linkKey = [u, v].sort().join("-");
    const numericCost = Number(cost);
    this.links[linkKey] = numericCost;
    if (!this.failedLinks.has(linkKey)) {
      if (this.routers[u]) this.routers[u].neighbors[v] = numericCost;
      if (this.routers[v]) this.routers[v].neighbors[u] = numericCost;
    }
    this.log(`Updated link metric for '${u}' <-> '${v}' to ${numericCost}`, "info");
    return this.converge();
  }

  addRouter(id, x = 400, y = 250) {
    const cleanId = id.trim();
    if (!cleanId || this.routers[cleanId]) return false;

    this.routers[cleanId] = {
      id: cleanId,
      neighbors: {},
      seqNumber: 0,
      lsdb: {},
      routingTable: {},
      spfTree: {},
      dijkstraTrace: [],
    };
    this.nodePositions[cleanId] = { x, y };
    this.log(`Router '${cleanId}' added to network topology.`, "info");
    this.converge();
    return true;
  }

  removeRouter(id) {
    if (!this.routers[id]) return false;

    delete this.routers[id];
    delete this.nodePositions[id];

    // Remove all associated links
    for (const linkKey in this.links) {
      if (linkKey.includes(id)) {
        delete this.links[linkKey];
        this.failedLinks.delete(linkKey);
      }
    }

    for (const rId in this.routers) {
      delete this.routers[rId].neighbors[id];
    }

    this.log(`Router '${id}' removed from network.`, "warning");
    this.converge();
    return true;
  }

  simulatePacket(src, dst, payload = "Class Project Packet") {
    if (!this.routers[src] || !this.routers[dst]) {
      return {
        src,
        dst,
        delivered: false,
        error: "Invalid source or destination node",
        path_traversed: [],
        accumulated_cost: 0,
        hops: [],
      };
    }

    const pathTraversed = [src];
    let accumulatedCost = 0;
    let current = src;
    let ttl = 30;
    let delivered = false;
    let error = null;
    const hops = [{ node: src, cost: 0, totalCost: 0, action: "Packet Originated" }];

    while (current !== dst && ttl > 0) {
      const router = this.routers[current];
      const route = router.routingTable[dst];

      if (!route || !route.next_hop) {
        error = `No route from '${current}' to '${dst}'`;
        break;
      }

      const nextHop = route.next_hop;
      const linkKey = [current, nextHop].sort().join("-");

      if (this.failedLinks.has(linkKey)) {
        error = `Link ${current} <-> ${nextHop} is down!`;
        break;
      }

      const cost = this.links[linkKey] || 1;
      accumulatedCost += cost;
      ttl -= 1;

      if (pathTraversed.includes(nextHop)) {
        error = `Routing loop detected at '${nextHop}'!`;
        break;
      }

      pathTraversed.push(nextHop);
      current = nextHop;
      hops.push({
        node: current,
        cost,
        totalCost: accumulatedCost,
        action: current === dst ? "Delivered to Destination" : `Forwarded via next-hop ${current}`,
      });
    }

    if (current === dst) {
      delivered = true;
    } else if (ttl <= 0 && !error) {
      error = "TTL expired in transit";
    }

    this.log(
      `Packet ${src} -> ${dst}: ${delivered ? "DELIVERED" : "FAILED"} (Path: ${pathTraversed.join(" -> ")}, Cost: ${accumulatedCost})`,
      delivered ? "success" : "error"
    );

    return {
      src,
      dst,
      payload,
      delivered,
      error,
      path_traversed: pathTraversed,
      accumulated_cost: accumulatedCost,
      ttl_remaining: ttl,
      hops,
    };
  }

  getState() {
    const routersData = Object.values(this.routers).map((r) => ({
      id: r.id,
      neighbors: r.neighbors,
      seq_number: r.seqNumber,
      routing_table: r.routingTable,
      spf_tree: r.spfTree,
      lsdb: r.lsdb,
    }));

    const linksData = Object.entries(this.links).map(([k, cost]) => {
      const [u, v] = k.split("-");
      return {
        u,
        v,
        cost,
        status: this.failedLinks.has(k) ? "DOWN" : "UP",
      };
    });

    return {
      name: this.name,
      scenario_name: this.scenarioKey,
      routers: routersData,
      links: linksData,
      positions: this.nodePositions,
      failed_links: Array.from(this.failedLinks),
      logs: this.logs,
    };
  }
}

