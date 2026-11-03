"""
Router Node Implementation for Link State Routing Simulation.
Implements Link-State Database (LSDB), Dijkstra's Shortest Path First (SPF) algorithm,
Routing Table Generation, and Packet Forwarding.
"""

from typing import Dict, List, Optional, Tuple, Any
import copy
from .packet import LSP, DataPacket


class Router:
    """
    Simulates a network router executing the Link-State Routing protocol (e.g., OSPF / IS-IS).
    """

    def __init__(self, router_id: str):
        self.router_id: str = router_id
        # Local directly connected neighbors: neighbor_id -> link_cost
        self.neighbors: Dict[str, float] = {}
        # Link State Database (LSDB): router_id -> LSP
        self.lsdb: Dict[str, LSP] = {}
        # Monotonically increasing sequence number for this router's LSPs
        self.seq_number: int = 0
        
        # Computed Routing Table:
        # dest_id -> { "cost": float, "next_hop": str, "full_path": list[str] }
        self.routing_table: Dict[str, Dict[str, Any]] = {}
        
        # Shortest Path Tree adjacency: parent -> list of children
        self.spf_tree: Dict[str, List[str]] = {}
        
        # Step-by-step logs of the most recent Dijkstra calculation
        self.dijkstra_trace: List[Dict[str, Any]] = []

    def add_neighbor(self, neighbor_id: str, cost: float):
        """Add or update a directly connected link to a neighbor router."""
        self.neighbors[neighbor_id] = float(cost)

    def remove_neighbor(self, neighbor_id: str):
        """Remove a link to a neighbor router (e.g., interface down / link severed)."""
        if neighbor_id in self.neighbors:
            del self.neighbors[neighbor_id]

    def generate_lsp(self) -> LSP:
        """
        Generate a new Link-State Packet containing this router's current local link states.
        Increments the sequence number and installs the LSP into its own LSDB.
        """
        self.seq_number += 1
        lsp = LSP(
            router_id=self.router_id,
            sequence_number=self.seq_number,
            neighbors=dict(self.neighbors),
            age=64
        )
        self.lsdb[self.router_id] = lsp.copy()
        return lsp

    def process_incoming_lsp(self, lsp: LSP) -> Tuple[bool, str]:
        """
        Process an incoming LSP received from flooding.
        Returns:
            (should_forward: bool, status_reason: str)
        """
        if lsp.age <= 0:
            return False, "expired_age"

        current_lsp = self.lsdb.get(lsp.router_id)

        if lsp.is_newer_than(current_lsp):
            # Accept and store the newer LSP
            self.lsdb[lsp.router_id] = lsp.copy()
            return True, "accepted_newer"
        elif current_lsp is not None and lsp.sequence_number == current_lsp.sequence_number:
            # Duplicate LSP already processed
            return False, "duplicate_ignored"
        else:
            # Outdated sequence number
            return False, "outdated_ignored"

    def build_topology_graph(self) -> Dict[str, Dict[str, float]]:
        """
        Reconstruct the global network graph from the synchronized LSDB.
        Returns adjacency representation: graph[u][v] = cost.
        """
        graph: Dict[str, Dict[str, float]] = {}

        # Collect all nodes known in LSDB
        for node_id, lsp in self.lsdb.items():
            if node_id not in graph:
                graph[node_id] = {}
            for neighbor, cost in lsp.neighbors.items():
                # To prevent uni-directional ghost links, a link (u, v) is verified
                # if v's LSP also acknowledges u, or in symmetric link state models:
                graph[node_id][neighbor] = cost
                if neighbor not in graph:
                    graph[neighbor] = {}

        return graph

    def run_dijkstra(self) -> Dict[str, Dict[str, Any]]:
        """
        Execute Dijkstra's algorithm to compute shortest paths from this router
        to all reachable destinations based on its current LSDB.
        Updates self.routing_table, self.spf_tree, and self.dijkstra_trace.
        """
        graph = self.build_topology_graph()
        self.dijkstra_trace.clear()

        # All known routers
        all_nodes = set(graph.keys())
        if not all_nodes:
            all_nodes = {self.router_id}

        # Distance table: distance from self.router_id to each node
        distances: Dict[str, float] = {node: float("inf") for node in all_nodes}
        # Predecessor mapping: node -> previous node on shortest path
        predecessors: Dict[str, Optional[str]] = {node: None for node in all_nodes}

        distances[self.router_id] = 0.0
        unvisited = set(all_nodes)
        visited: set[str] = set()

        step_num = 0

        while unvisited:
            # Pick unvisited node with smallest distance
            current_node = min(unvisited, key=lambda node: distances[node])

            if distances[current_node] == float("inf"):
                # Remaining unvisited nodes are unreachable
                break

            unvisited.remove(current_node)
            visited.add(current_node)
            step_num += 1

            relaxations = []

            # Examine neighbors of current_node
            neighbors = graph.get(current_node, {})
            for neighbor, weight in neighbors.items():
                if neighbor in unvisited:
                    new_dist = distances[current_node] + weight
                    if new_dist < distances[neighbor]:
                        old_dist = distances[neighbor]
                        distances[neighbor] = new_dist
                        predecessors[neighbor] = current_node
                        relaxations.append({
                            "neighbor": neighbor,
                            "old_dist": old_dist,
                            "new_dist": new_dist,
                            "via": current_node
                        })

            # Record step for visualization / logging
            self.dijkstra_trace.append({
                "step": step_num,
                "selected_node": current_node,
                "selected_cost": distances[current_node],
                "visited_nodes": sorted(list(visited)),
                "unvisited_nodes": sorted(list(unvisited)),
                "distances": dict(distances),
                "predecessors": dict(predecessors),
                "relaxations": relaxations
            })

        # Reconstruct Routing Table and Shortest Path Tree
        self.routing_table = {}
        self.spf_tree = {node: [] for node in all_nodes}

        for dest in all_nodes:
            if dest == self.router_id:
                continue

            if distances[dest] == float("inf"):
                # Unreachable destination
                continue

            # Backtrack path from dest to self.router_id
            path = []
            curr: Optional[str] = dest
            while curr is not None:
                path.append(curr)
                if curr == self.router_id:
                    break
                curr = predecessors.get(curr)

            path.reverse()

            if len(path) >= 2 and path[0] == self.router_id:
                next_hop = path[1]
                self.routing_table[dest] = {
                    "cost": distances[dest],
                    "next_hop": next_hop,
                    "full_path": path
                }

        # Build Shortest Path Tree (parent -> children)
        for node, parent in predecessors.items():
            if parent is not None:
                if parent not in self.spf_tree:
                    self.spf_tree[parent] = []
                self.spf_tree[parent].append(node)

        return self.routing_table

    def forward_data_packet(self, packet: DataPacket) -> Tuple[Optional[str], str]:
        """
        Look up destination in the routing table and determine next hop.
        Returns:
            (next_hop: Optional[str], status: str)
        """
        if packet.dst == self.router_id:
            packet.delivered = True
            return None, "destination_reached"

        if packet.ttl <= 0:
            packet.error = "ttl_expired"
            return None, "ttl_expired"

        route_entry = self.routing_table.get(packet.dst)
        if not route_entry:
            packet.error = f"no_route_to_{packet.dst}"
            return None, f"no_route_to_{packet.dst}"

        next_hop = route_entry["next_hop"]
        return next_hop, "forwarded"

    def get_summary(self) -> Dict[str, Any]:
        """Get summary snapshot of the router state."""
        return {
            "router_id": self.router_id,
            "neighbors": self.neighbors,
            "lsdb_entries": {k: repr(v) for k, v in self.lsdb.items()},
            "routing_table": self.routing_table,
            "sequence_number": self.seq_number
        }
