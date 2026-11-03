#!/usr/bin/env python3
"""
Interactive CLI Simulator for Link-State Routing & Dijkstra's Algorithm.
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


def print_menu():
    print("""
============================================================
       LINK STATE ROUTING (LSR) PROTOCOL SIMULATOR          
============================================================
 [1] View Current Network Topology & Active Links
 [2] View Link-State Database (LSDB) of a Router
 [3] View Routing / Forwarding Table of a Router (or ALL)
 [4] View Step-by-Step Dijkstra SPF Execution Trace
 [5] Simulate Data Packet Forwarding (Hop-by-Hop Trace)
 [6] Add or Modify a Link / Add Router
 [7] Simulate Link Failure (Sever Link)
 [8] Restore a Failed Link
 [9] Trigger LSP Flooding & Convergence
 [10] Load Preset Topology Scenario
 [11] Export Topology Graph as Image (.png)
 [0] Exit
============================================================
""")


def get_preset_scenario_list():
    scenarios_dir = os.path.join(os.path.dirname(__file__), "scenarios")
    if not os.path.exists(scenarios_dir):
        return []
    return [f for f in os.listdir(scenarios_dir) if f.endswith(".json")]


def main():
    # Initialize with default textbook topology
    scenario_path = os.path.join(os.path.dirname(__file__), "scenarios", "textbook_topology.json")
    if os.path.exists(scenario_path):
        net = Network.load_from_json(scenario_path)
    else:
        net = Network("DefaultNetwork")
        net.add_link("A", "B", 2)
        net.add_link("A", "C", 5)
        net.add_link("B", "C", 1)

    print(f"Loaded network: '{net.name}' with {len(net.routers)} routers.")
    net.synchronize_and_converge()

    while True:
        print_menu()
        choice = input("Enter choice [0-11]: ").strip()

        if choice == "0":
            print("Exiting Link State Simulator. Goodbye!")
            sys.exit(0)

        elif choice == "1":
            print(f"\nTopology: {net.name}")
            print(f"Routers ({len(net.routers)}): {', '.join(sorted(net.routers.keys()))}")
            print(f"Active Links ({len(net.links)}):")
            for (u, v), cost in sorted(net.links.items()):
                print(f"  {u} <--- (Cost: {cost:.1f}) ---> {v}")

        elif choice == "2":
            r_id = input(f"Enter Router ID ({', '.join(sorted(net.routers.keys()))}): ").strip()
            if r_id in net.routers:
                print_lsdb(net.routers[r_id])
            else:
                print(f"Error: Router '{r_id}' not found.")

        elif choice == "3":
            sub = input("Enter Router ID (or press ENTER for all routers): ").strip()
            if not sub:
                print_all_routing_tables(net)
            elif sub in net.routers:
                print_routing_table(net.routers[sub])
            else:
                print(f"Error: Router '{sub}' not found.")

        elif choice == "4":
            r_id = input(f"Enter Source Router ID for Dijkstra Trace ({', '.join(sorted(net.routers.keys()))}): ").strip()
            if r_id in net.routers:
                router = net.routers[r_id]
                router.run_dijkstra()
                print_dijkstra_trace(router)
            else:
                print(f"Error: Router '{r_id}' not found.")

        elif choice == "5":
            src = input(f"Enter Source Router ({', '.join(sorted(net.routers.keys()))}): ").strip()
            dst = input(f"Enter Destination Router ({', '.join(sorted(net.routers.keys()))}): ").strip()
            payload = input("Enter Packet Payload text [default: 'Data']: ").strip() or "Data"
            
            if src in net.routers and dst in net.routers:
                pkt = net.simulate_packet_routing(src, dst, payload)
                print_packet_trace(pkt)
            else:
                print("Error: Invalid source or destination router.")

        elif choice == "6":
            u = input("Enter Node 1 ID: ").strip()
            v = input("Enter Node 2 ID: ").strip()
            try:
                cost = float(input("Enter Link Cost (positive number): ").strip())
                if cost <= 0:
                    print("Error: Cost must be positive.")
                    continue
                net.add_link(u, v, cost)
                print(f"Link {u} <-> {v} added/updated with cost {cost}.")
                print("Re-converging network...")
                net.synchronize_and_converge()
                print("Network converged with updated link state.")
            except ValueError:
                print("Error: Invalid cost value.")

        elif choice == "7":
            print(f"Active links: {', '.join(f'{u}-{v}' for (u, v) in net.links.keys())}")
            u = input("Enter first node of link to fail: ").strip()
            v = input("Enter second node of link to fail: ").strip()
            cost = net.fail_link(u, v)
            if cost is not None:
                print(f"Link {u} <-> {v} (Cost {cost}) is now DOWN.")
                print("Triggering LSP flooding and route re-calculation...")
                stats = net.synchronize_and_converge()
                print(f"Re-converged: {stats['total_lsp_packets']} LSPs flooded.")
            else:
                print(f"Error: Link '{u}' <-> '{v}' does not exist.")

        elif choice == "8":
            u = input("Enter Node 1: ").strip()
            v = input("Enter Node 2: ").strip()
            try:
                cost = float(input("Enter link cost: ").strip())
                net.restore_link(u, v, cost)
                print(f"Link {u} <-> {v} restored with cost {cost}.")
                net.synchronize_and_converge()
            except ValueError:
                print("Error: Invalid cost value.")

        elif choice == "9":
            print("Triggering LSP flooding and running Dijkstra on all nodes...")
            stats = net.synchronize_and_converge()
            print(f"Convergence Complete!")
            print(f" - Packets Transmitted   : {stats['total_lsp_packets']}")
            print(f" - Duplicates Suppressed : {stats['total_duplicates_dropped']}")
            print(f" - LSDB Consistent       : {stats['lsdb_consistent']}")
            print(f" - Time                  : {stats['computation_time_ms']:.2f} ms")

        elif choice == "10":
            files = get_preset_scenario_list()
            if not files:
                print("No scenario files found in 'scenarios/' directory.")
                continue
            print("\nAvailable Preset Scenarios:")
            for idx, fname in enumerate(files, 1):
                print(f"  [{idx}] {fname}")
            idx_choice = input(f"Select preset [1-{len(files)}]: ").strip()
            try:
                chosen_file = files[int(idx_choice) - 1]
                path = os.path.join(os.path.dirname(__file__), "scenarios", chosen_file)
                net = Network.load_from_json(path)
                net.synchronize_and_converge()
                print(f"Successfully loaded '{net.name}' ({len(net.routers)} nodes, {len(net.links)} links).")
            except (ValueError, IndexError):
                print("Invalid selection.")

        elif choice == "11":
            filename = input("Enter image filename [default: 'network_topology.png']: ").strip() or "network_topology.png"
            plot_network_graph(net, title=f"Network Topology: {net.name}", save_path=filename)
            print(f"Topology saved to {filename}")

        else:
            print("Invalid option. Please choose between 0 and 11.")


if __name__ == "__main__":
    main()
