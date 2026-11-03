"""
Visualization and Terminal Output Tools for Link State Routing Simulation.
Supports ASCII tables, Dijkstra step-by-step logs, and graphical Matplotlib plots.
"""

from typing import List, Optional, Dict, Any, Tuple
from tabulate import tabulate
import networkx as nx
import matplotlib.pyplot as plt
from .router import Router
from .network import Network
from .packet import DataPacket


def print_routing_table(router: Router):
    """Print the forwarding/routing table of a router in clean tabular format."""
    print(f"\n================ ROUTING TABLE: Router [{router.router_id}] ================")
    if not router.routing_table:
        print("  (Empty routing table - run SPF convergence first)")
        return

    table_data = []
    for dest, entry in sorted(router.routing_table.items()):
        full_path_str = " -> ".join(entry["full_path"])
        table_data.append([
            dest,
            entry["next_hop"],
            f"{entry['cost']:.1f}",
            full_path_str
        ])

    headers = ["Destination", "Next Hop", "Cost (Metric)", "Shortest Path"]
    print(tabulate(table_data, headers=headers, tablefmt="fancy_grid"))


def print_all_routing_tables(network: Network):
    """Print routing tables for all routers in the network."""
    for router_id, router in sorted(network.routers.items()):
        print_routing_table(router)


def print_lsdb(router: Router):
    """Print the Link-State Database (LSDB) of a given router."""
    print(f"\n================ LINK STATE DATABASE (LSDB) @ Router [{router.router_id}] ================")
    if not router.lsdb:
        print("  (Empty LSDB)")
        return

    table_data = []
    for origin_id, lsp in sorted(router.lsdb.items()):
        nbrs_str = ", ".join(f"{nbr} (cost={cost})" for nbr, cost in sorted(lsp.neighbors.items()))
        table_data.append([
            origin_id,
            lsp.sequence_number,
            lsp.age,
            nbrs_str if nbrs_str else "None"
        ])

    headers = ["Origin Router", "Sequence #", "Age / TTL", "Advertised Link States"]
    print(tabulate(table_data, headers=headers, tablefmt="fancy_grid"))


def print_dijkstra_trace(router: Router):
    """Print the step-by-step execution history of Dijkstra's algorithm for a router."""
    print(f"\n================ DIJKSTRA SPF EXECUTION TRACE: Router [{router.router_id}] ================")
    if not router.dijkstra_trace:
        print("  (No trace available - run run_dijkstra() first)")
        return

    for step_info in router.dijkstra_trace:
        step = step_info["step"]
        chosen = step_info["selected_node"]
        chosen_cost = step_info["selected_cost"]
        visited = ", ".join(step_info["visited_nodes"])
        unvisited = ", ".join(step_info["unvisited_nodes"]) if step_info["unvisited_nodes"] else "(empty)"

        print(f"\n--- [Step {step}] Selected Node: '{chosen}' (Cumulative Cost: {chosen_cost:.1f}) ---")
        print(f"  Visited Set N'   : {{ {visited} }}")
        print(f"  Unvisited Nodes  : {{ {unvisited} }}")

        # Relaxation details
        relaxations = step_info.get("relaxations", [])
        if relaxations:
            print("  Relaxed Edges:")
            for r in relaxations:
                old_val = "inf" if r["old_dist"] == float("inf") else f"{r['old_dist']:.1f}"
                print(f"    - Edge to '{r['neighbor']}': dist updated from {old_val} -> {r['new_dist']:.1f} via '{r['via']}'")
        else:
            print("  No shorter tentative distances discovered this step.")

        # Distance snapshot
        dist_str = ", ".join(
            f"{k}: {v if v != float('inf') else 'inf'}"
            for k, v in sorted(step_info["distances"].items())
        )
        print(f"  Current Tentative Distances: {dist_str}")


def print_packet_trace(packet: DataPacket):
    """Print detailed hop-by-hop forwarding summary for a simulated packet."""
    print("\n================ PACKET FORWARDING TRACE ================")
    print(f"  Source      : {packet.src}")
    print(f"  Destination : {packet.dst}")
    print(f"  Payload     : '{packet.payload}'")
    print(f"  Status      : {'DELIVERED' if packet.delivered else 'FAILED'}")
    if packet.error:
        print(f"  Error / Note: {packet.error}")
    
    if packet.path_traversed:
        path_str = " -> ".join(packet.path_traversed)
        print(f"  Path Traversed: {path_str}")
        print(f"  Total Hops    : {len(packet.path_traversed) - 1}")
        print(f"  Total Cost    : {packet.accumulated_cost:.1f}")
    print("=========================================================\n")


def plot_network_graph(
    network: Network,
    highlight_path: Optional[List[str]] = None,
    failed_links: Optional[List[Tuple[str, str]]] = None,
    title: str = "Link-State Network Topology",
    save_path: Optional[str] = None,
    show_plot: bool = False
):
    """
    Render network topology graph using NetworkX and Matplotlib.
    Optionally highlights an active route or failed links.
    """
    G = nx.Graph()

    for router_id in network.routers.keys():
        G.add_node(router_id)

    for (u, v), cost in network.links.items():
        G.add_edge(u, v, weight=cost)

    plt.figure(figsize=(9, 6))
    pos = nx.spring_layout(G, seed=42)

    # Base node colors
    node_colors = ["#4A90E2" for _ in G.nodes()]
    nx.draw_networkx_nodes(G, pos, node_color=node_colors, node_size=1200, edgecolors="#1B365D", linewidths=2)
    nx.draw_networkx_labels(G, pos, font_size=12, font_family="sans-serif", font_weight="bold", font_color="white")

    # Base edges
    base_edges = list(G.edges())
    nx.draw_networkx_edges(G, pos, edgelist=base_edges, width=2, edge_color="#7F8C8D", style="solid")

    # Edge weight labels
    edge_labels = {(u, v): f"{d['weight']:.0f}" for u, v, d in G.edges(data=True)}
    nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels, font_size=10, font_color="#C0392B", font_weight="bold")

    # Highlight shortest path if provided
    if highlight_path and len(highlight_path) >= 2:
        path_edges = [(highlight_path[i], highlight_path[i+1]) for i in range(len(highlight_path) - 1)]
        nx.draw_networkx_edges(G, pos, edgelist=path_edges, width=4, edge_color="#2ECC71")
        # Highlight source and destination nodes
        src, dst = highlight_path[0], highlight_path[-1]
        nx.draw_networkx_nodes(G, pos, nodelist=[src], node_color="#27AE60", node_size=1300)
        nx.draw_networkx_nodes(G, pos, nodelist=[dst], node_color="#E67E22", node_size=1300)

    # Highlight failed links if provided
    if failed_links:
        for u, v in failed_links:
            if G.has_edge(u, v):
                nx.draw_networkx_edges(G, pos, edgelist=[(u, v)], width=3, edge_color="#E74C3C", style="dashed")

    plt.title(title, fontsize=14, fontweight="bold", pad=15)
    plt.axis("off")
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=200, bbox_inches="tight")
        print(f"[Visualizer] Network topology plot saved to '{save_path}'")

    if show_plot:
        plt.show()
    plt.close()
