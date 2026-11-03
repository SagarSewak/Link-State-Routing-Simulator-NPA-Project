"""
Network Simulator for Link State Routing.
Manages network topology, coordinates reliable LSP flooding,
handles dynamic link/node failures, and simulates end-to-end packet forwarding.
"""

from collections import deque
import json
import time
from typing import Dict, List, Optional, Tuple, Any
from .packet import LSP, DataPacket
from .router import Router


class Network:
    """
    Simulates a Link-State Routing network environment.
    """

    def __init__(self, name: str = "LinkStateNetwork"):
        self.name: str = name
        self.routers: Dict[str, Router] = {}
        # Active physical links: tuple(sorted([u, v])) -> cost
        self.links: Dict[Tuple[str, str], float] = {}
        # History of event logs
        self.event_logs: List[str] = []

    def log(self, message: str):
        """Append an event message with timestamp."""
        ts = time.strftime("%H:%M:%S")
        entry = f"[{ts}] {message}"
        self.event_logs.append(entry)

    def add_router(self, router_id: str) -> Router:
        """Add a new router to the network."""
        if router_id not in self.routers:
            self.routers[router_id] = Router(router_id)
            self.log(f"Router '{router_id}' joined the network.")
        return self.routers[router_id]

    def remove_router(self, router_id: str):
        """Remove a router and all its connecting links from the network."""
        if router_id in self.routers:
            del self.routers[router_id]
            # Remove associated links
            to_delete = [link for link in self.links if router_id in link]
            for link in to_delete:
                del self.links[link]
            # Clean up neighbor references in other routers
            for r in self.routers.values():
                r.remove_neighbor(router_id)
            self.log(f"Router '{router_id}' removed from network.")

    def add_link(self, u: str, v: str, cost: float, bidirectional: bool = True):
        """
        Add or update a link between two routers.
        """
        if u not in self.routers:
            self.add_router(u)
        if v not in self.routers:
            self.add_router(v)

        cost = float(cost)
        self.routers[u].add_neighbor(v, cost)
        if bidirectional:
            self.routers[v].add_neighbor(u, cost)
            link_key = tuple(sorted([u, v]))
            self.links[link_key] = cost
        else:
            self.links[(u, v)] = cost

        self.log(f"Link added/updated: {u} <---> {v} (Cost: {cost})")

    def fail_link(self, u: str, v: str):
        """Simulate a link failure between two routers."""
        link_key = tuple(sorted([u, v]))
        if link_key in self.links:
            cost = self.links[link_key]
            del self.links[link_key]
            if u in self.routers:
                self.routers[u].remove_neighbor(v)
            if v in self.routers:
                self.routers[v].remove_neighbor(u)
            self.log(f"LINK FAILURE: Link between '{u}' and '{v}' is DOWN.")
            return cost
        elif (u, v) in self.links:
            cost = self.links[(u, v)]
            del self.links[(u, v)]
            if u in self.routers:
                self.routers[u].remove_neighbor(v)
            self.log(f"LINK FAILURE: Link '{u}' -> '{v}' is DOWN.")
            return cost
        return None

    def restore_link(self, u: str, v: str, cost: float):
        """Restore a previously failed link."""
        self.add_link(u, v, cost)
        self.log(f"LINK RESTORED: Link between '{u}' and '{v}' restored with Cost: {cost}.")

    def flood_lsp(self, origin_router_id: str, lsp: Optional[LSP] = None) -> Dict[str, Any]:
        """
        Reliably flood an LSP across the network.
        Uses a BFS queue to simulate packet transmission over all interfaces.
        """
        if origin_router_id not in self.routers:
            return {"error": f"Router {origin_router_id} not found."}

        origin_router = self.routers[origin_router_id]
        if lsp is None:
            lsp = origin_router.generate_lsp()

        stats = {
            "origin": origin_router_id,
            "seq_number": lsp.sequence_number,
            "packets_transmitted": 0,
            "duplicates_suppressed": 0,
            "hops": 0,
            "delivery_trace": []
        }

        # Queue contains: (current_node, incoming_interface, lsp)
        # Seed the queue: origin router sends LSP to all its immediate neighbors
        queue = deque()
        for neighbor in origin_router.neighbors.keys():
            if neighbor in self.routers:
                queue.append((neighbor, origin_router_id, lsp.copy()))

        while queue:
            receiver_id, sender_id, in_lsp = queue.popleft()
            stats["packets_transmitted"] += 1

            if receiver_id not in self.routers:
                continue

            receiver = self.routers[receiver_id]
            should_forward, reason = receiver.process_incoming_lsp(in_lsp)

            stats["delivery_trace"].append({
                "from": sender_id,
                "to": receiver_id,
                "action": reason,
                "forwarded": should_forward
            })

            if should_forward:
                # Forward to all neighbors EXCEPT the one it arrived from
                next_lsp = in_lsp.copy()
                next_lsp.age -= 1
                if next_lsp.age > 0:
                    for nbr in receiver.neighbors.keys():
                        if nbr != sender_id and nbr in self.routers:
                            queue.append((nbr, receiver_id, next_lsp.copy()))
            else:
                stats["duplicates_suppressed"] += 1

        return stats

    def synchronize_and_converge(self) -> Dict[str, Any]:
        """
        Trigger all routers to generate LSPs, flood them across the network,
        and recompute their routing tables using Dijkstra's algorithm.
        Returns convergence performance metrics.
        """
        start_time = time.time()
        total_packets = 0
        total_duplicates = 0

        # Phase 1: Every router generates and floods its LSP
        for router_id in list(self.routers.keys()):
            stats = self.flood_lsp(router_id)
            total_packets += stats.get("packets_transmitted", 0)
            total_duplicates += stats.get("duplicates_suppressed", 0)

        # Phase 2: Every router executes Dijkstra algorithm on synchronized LSDB
        for router in self.routers.values():
            router.run_dijkstra()

        elapsed_ms = (time.time() - start_time) * 1000

        # Check LSDB consistency across all routers
        lsdb_consistent = self.verify_lsdb_consistency()

        self.log(
            f"Network converged. Packets sent: {total_packets}, "
            f"Duplicates dropped: {total_duplicates}, "
            f"LSDB synchronized: {lsdb_consistent}"
        )

        return {
            "converged": True,
            "lsdb_consistent": lsdb_consistent,
            "total_lsp_packets": total_packets,
            "total_duplicates_dropped": total_duplicates,
            "computation_time_ms": elapsed_ms,
            "num_routers": len(self.routers),
            "num_links": len(self.links)
        }

    def verify_lsdb_consistency() -> bool:
        """
        Check if all routers have identical views in their LSDB.
        """
        pass

    def verify_lsdb_consistency(self) -> bool:
        """Check if all routers have an identical view of the topology in their LSDB."""
        if not self.routers:
            return True

        router_list = list(self.routers.values())
        first_lsdb_keys = set(router_list[0].lsdb.keys())

        for r in router_list[1:]:
            if set(r.lsdb.keys()) != first_lsdb_keys:
                return False
            for node_id, lsp in router_list[0].lsdb.items():
                r_lsp = r.lsdb.get(node_id)
                if r_lsp is None or r_lsp.neighbors != lsp.neighbors:
                    return False
        return True

    def simulate_packet_routing(self, src: str, dst: str, payload: str = "Hello Packet") -> DataPacket:
        """
        Simulate forwarding a data packet hop-by-hop from source to destination
        using the current routing tables of the routers.
        """
        packet = DataPacket(src=src, dst=dst, payload=payload)

        if src not in self.routers:
            packet.error = f"Source router '{src}' does not exist."
            return packet

        if dst not in self.routers:
            packet.error = f"Destination router '{dst}' does not exist."
            return packet

        current_node = src
        packet.add_hop(current_node, cost=0.0)

        visited_in_path = [current_node]

        while current_node != dst:
            router = self.routers[current_node]
            next_hop, status = router.forward_data_packet(packet)

            if next_hop is None:
                # Packet could not be forwarded further
                break

            # Find link cost
            link_key = tuple(sorted([current_node, next_hop]))
            cost = self.links.get(link_key, self.links.get((current_node, next_hop), 1.0))

            # Routing loop detection
            if next_hop in visited_in_path:
                packet.error = f"Routing loop detected at router '{next_hop}'!"
                break

            current_node = next_hop
            visited_in_path.append(current_node)
            packet.add_hop(current_node, cost=cost)

            if packet.ttl <= 0:
                packet.error = "Time-to-Live (TTL) expired before reaching destination."
                break

        if current_node == dst:
            packet.delivered = True

        self.log(
            f"Routed packet '{src}' -> '{dst}': "
            f"Hops={packet.path_traversed}, Cost={packet.accumulated_cost}, "
            f"Delivered={packet.delivered}"
        )

        return packet

    def export_topology_dict(self) -> Dict[str, Any]:
        """Export network topology to dictionary."""
        links_data = []
        for (u, v), cost in self.links.items():
            links_data.append({"u": u, "v": v, "cost": cost})
        return {
            "name": self.name,
            "routers": list(self.routers.keys()),
            "links": links_data
        }

    def save_to_json(self, filepath: str):
        """Save network topology to JSON file."""
        data = self.export_topology_dict()
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    @classmethod
    def load_from_json(cls, filepath: str) -> "Network":
        """Load network topology from JSON file."""
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        net = cls(name=data.get("name", "ImportedNetwork"))
        for r_id in data.get("routers", []):
            net.add_router(r_id)
        for link in data.get("links", []):
            net.add_link(link["u"], link["v"], link["cost"])
        return net
