#!/usr/bin/env python3
"""
Comprehensive Demonstration of Link-State Routing Protocol & Dijkstra's Algorithm.
This script demonstrates:
1. Topology Construction
2. LSP Generation and Reliable Flooding
3. LSDB Synchronization across all routers
4. Dijkstra Shortest Path Tree & Routing Table Computation (Step-by-Step)
5. End-to-End Data Packet Forwarding
6. Dynamic Link Failure & Convergence Rerouting
7. Visual Topology Generation
"""

import os
import sys
from link_state_sim import (
    Network,
    print_lsdb,
    print_routing_table,
    print_all_routing_tables,
    print_dijkstra_trace,
    print_packet_trace,
    plot_network_graph,
)


def banner(title: str):
    print("\n" + "#" * 70)
    print(f"  {title}")
    print("#" * 70)


def main():
    banner("STEP 1: NETWORK TOPOLOGY INITIALIZATION")
    scenario_path = os.path.join(os.path.dirname(__file__), "scenarios", "textbook_topology.json")
    print(f"Loading network topology from '{scenario_path}'...")
    net = Network.load_from_json(scenario_path)

    print(f"Topology Name : {net.name}")
    print(f"Routers ({len(net.routers)}) : {', '.join(sorted(net.routers.keys()))}")
    print(f"Links ({len(net.links)})   :")
    for (u, v), cost in sorted(net.links.items()):
        print(f"   {u} <---({cost:.0f})---> {v}")

    banner("STEP 2: LSP GENERATION & RELIABLE FLOODING")
    print("Each router generates a Link-State Packet (LSP) and floods it through the network...")
    convergence_stats = net.synchronize_and_converge()
    
    print(f"Convergence Status          : {'SUCCESS' if convergence_stats['converged'] else 'FAILED'}")
    print(f"Total LSP Packets Flooded   : {convergence_stats['total_lsp_packets']}")
    print(f"Duplicate Packets Dropped   : {convergence_stats['total_duplicates_dropped']}")
    print(f"LSDB Global Consistency     : {convergence_stats['lsdb_consistent']}")
    print(f"Convergence Computation Time: {convergence_stats['computation_time_ms']:.2f} ms")

    # Display synchronized LSDB from router 'u'
    print_lsdb(net.routers["u"])

    banner("STEP 3: DIJKSTRA SPF ALGORITHM COMPUTATION (TRACE FOR ROUTER 'u')")
    print("Dijkstra's Algorithm calculates the shortest path from Source 'u' to all nodes:")
    print_dijkstra_trace(net.routers["u"])

    banner("STEP 4: ROUTING TABLES (FORWARDING INFORMATION BASE)")
    print("Computed forwarding tables for all routers in the network:")
    print_all_routing_tables(net)

    banner("STEP 5: SIMULATING DATA PACKET FORWARDING")
    print("Transmitting a data packet from Source 'u' to Destination 'z'...")
    pkt1 = net.simulate_packet_routing(src="u", dst="z", payload="Network Class Assignment Data")
    print_packet_trace(pkt1)

    # Save initial topology graph
    output_img1 = "topology_initial.png"
    plot_network_graph(
        net,
        highlight_path=pkt1.path_traversed,
        title="Link-State Topology & Shortest Path (u -> z)",
        save_path=output_img1
    )

    banner("STEP 6: DYNAMIC LINK FAILURE & FAULT CONVERGENCE")
    # In the textbook topology, the shortest path u->z is u -> x -> y -> z (cost: 1 + 1 + 2 = 4)
    # Let's fail the link between 'x' and 'y'
    failed_u, failed_v = "x", "y"
    print(f"Simulating physical cable cut between '{failed_u}' and '{failed_v}'...")
    old_cost = net.fail_link(failed_u, failed_v)

    print("\nTriggering event-driven LSP flooding and SPF recalculation...")
    reconv_stats = net.synchronize_and_converge()
    print(f"Re-convergence Status       : {'SUCCESS' if reconv_stats['converged'] else 'FAILED'}")
    print(f"LSPs Flooded for Re-route   : {reconv_stats['total_lsp_packets']}")

    print("\nUpdated Routing Table for Router 'u':")
    print_routing_table(net.routers["u"])

    print("\nRe-transmitting packet from 'u' to 'z' along newly converged alternate path:")
    pkt2 = net.simulate_packet_routing(src="u", dst="z", payload="Re-routed Packet after Link Failure")
    print_packet_trace(pkt2)

    # Save failed link topology graph
    output_img2 = "topology_after_failure.png"
    plot_network_graph(
        net,
        highlight_path=pkt2.path_traversed,
        failed_links=[(failed_u, failed_v)],
        title=f"Topology After Link ({failed_u}-{failed_v}) Failure (u -> z Re-routed)",
        save_path=output_img2
    )

    banner("SIMULATION DEMONSTRATION COMPLETE")
    print(f"Visual graphs generated:")
    print(f"  1. {output_img1} (Initial optimal path)")
    print(f"  2. {output_img2} (Rerouted path after link failure)")


if __name__ == "__main__":
    main()
