#!/usr/bin/env python3
"""
REST API Backend for Link-State Routing Simulator.
Wraps the Python link_state_sim package and serves interactive endpoints for the React frontend.
"""

import os
import sys
import json
import time
from typing import Dict, Any
from flask import Flask, jsonify, request, send_from_directory

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from link_state_sim import (
    Network,
    Router,
    LSP,
    DataPacket,
)

app = Flask(__name__, static_folder="frontend/dist", static_url_path="")

# Enable CORS for all routes
@app.after_request
def after_request(response):
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.add("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS")
    return response

# Global active network simulation instance
active_network: Network = None
current_scenario_name = "textbook_topology.json"

SCENARIOS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scenarios")

PRESET_POSITIONS = {
    "textbook_topology.json": {
        "u": {"x": 120, "y": 220},
        "v": {"x": 300, "y": 90},
        "w": {"x": 520, "y": 90},
        "x": {"x": 300, "y": 350},
        "y": {"x": 520, "y": 350},
        "z": {"x": 700, "y": 220},
    },
    "mesh_topology.json": {
        "R1": {"x": 100, "y": 220},
        "R2": {"x": 260, "y": 110},
        "R3": {"x": 260, "y": 330},
        "R4": {"x": 440, "y": 110},
        "R5": {"x": 440, "y": 330},
        "R6": {"x": 620, "y": 220},
        "R7": {"x": 740, "y": 220},
    },
    "ring_topology.json": {
        "A": {"x": 400, "y": 80},
        "B": {"x": 650, "y": 190},
        "C": {"x": 550, "y": 380},
        "D": {"x": 250, "y": 380},
        "E": {"x": 150, "y": 190},
    },
}


def init_default_network(scenario_file: str = "textbook_topology.json") -> Network:
    global active_network, current_scenario_name
    scenario_path = os.path.join(SCENARIOS_DIR, scenario_file)
    if os.path.exists(scenario_path):
        active_network = Network.load_from_json(scenario_path)
    else:
        active_network = Network("DefaultNetwork")
        active_network.add_link("u", "v", 2.0)
        active_network.add_link("u", "w", 5.0)
        active_network.add_link("u", "x", 1.0)
        active_network.add_link("v", "w", 3.0)
        active_network.add_link("v", "y", 2.0)
        active_network.add_link("w", "x", 3.0)
        active_network.add_link("w", "y", 1.0)
        active_network.add_link("w", "z", 5.0)
        active_network.add_link("x", "y", 1.0)
        active_network.add_link("y", "z", 2.0)

    current_scenario_name = scenario_file
    active_network.synchronize_and_converge()
    return active_network


# Initialize on startup
init_default_network()


def serialize_network(net: Network) -> Dict[str, Any]:
    """Serialize the network topology and state for frontend consumption."""
    routers_data = []
    for r_id in sorted(net.routers.keys()):
        r = net.routers[r_id]
        routers_data.append({
            "id": r_id,
            "neighbors": r.neighbors,
            "seq_number": r.seq_number,
            "routing_table": r.routing_table,
            "spf_tree": r.spf_tree,
            "lsdb": {
                k: {
                    "router_id": v.router_id,
                    "sequence_number": v.sequence_number,
                    "neighbors": v.neighbors,
                    "age": v.age,
                    "timestamp": v.timestamp
                } for k, v in r.lsdb.items()
            }
        })

    links_data = []
    for (u, v), cost in sorted(net.links.items()):
        links_data.append({
            "u": u,
            "v": v,
            "cost": cost,
            "status": "UP"
        })

    positions = dict(PRESET_POSITIONS.get(current_scenario_name, {}))
    all_routers = sorted(net.routers.keys())
    for idx, r_id in enumerate(all_routers):
        if r_id not in positions:
            import math
            angle = (idx / max(len(all_routers), 1)) * 2 * math.pi - math.pi / 2
            positions[r_id] = {
                "x": round(420 + 180 * math.cos(angle)),
                "y": round(240 + 150 * math.sin(angle)),
            }

    return {
        "name": net.name,
        "scenario_name": current_scenario_name,
        "routers": routers_data,
        "links": links_data,
        "positions": positions,
        "logs": net.event_logs[-50:]  # last 50 logs
    }


# ===================== API ROUTES =====================

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "online",
        "service": "Link-State Routing Simulator API",
        "author": "Sagar Sewak",
        "timestamp": time.time()
    })


@app.route("/api/scenarios", methods=["GET"])
def get_scenarios():
    """List available topology scenarios."""
    scenarios = []
    if os.path.exists(SCENARIOS_DIR):
        for f in sorted(os.listdir(SCENARIOS_DIR)):
            if f.endswith(".json"):
                fpath = os.path.join(SCENARIOS_DIR, f)
                try:
                    with open(fpath, "r", encoding="utf-8") as fp:
                        meta = json.load(fp)
                        scenarios.append({
                            "id": f,
                            "filename": f,
                            "name": meta.get("name", f),
                            "routers_count": len(meta.get("routers", [])),
                            "links_count": len(meta.get("links", []))
                        })
                except Exception:
                    scenarios.append({"id": f, "filename": f, "name": f})
    return jsonify({"scenarios": scenarios, "current": current_scenario_name})


@app.route("/api/scenarios/load", methods=["POST"])
def load_scenario():
    """Load a specific preset scenario."""
    data = request.json or {}
    filename = data.get("scenario")
    if not filename:
        return jsonify({"error": "Missing scenario filename"}), 400

    filepath = os.path.join(SCENARIOS_DIR, filename)
    if not os.path.exists(filepath):
        return jsonify({"error": f"Scenario {filename} not found"}), 404

    init_default_network(filename)
    active_network.log(f"Loaded scenario: {filename}")
    return jsonify({
        "message": f"Successfully loaded scenario {filename}",
        "network": serialize_network(active_network)
    })


@app.route("/api/network", methods=["GET"])
def get_network_state():
    """Return the complete current network topology and routing state."""
    return jsonify(serialize_network(active_network))


@app.route("/api/converge", methods=["POST"])
def trigger_convergence():
    """Trigger LSP generation, reliable flooding, and Dijkstra SPF calculation."""
    stats = active_network.synchronize_and_converge()
    return jsonify({
        "stats": stats,
        "network": serialize_network(active_network)
    })


@app.route("/api/dijkstra/<router_id>", methods=["GET"])
def get_dijkstra_trace(router_id: str):
    """Get step-by-step Dijkstra execution trace for a specific router."""
    if router_id not in active_network.routers:
        return jsonify({"error": f"Router {router_id} not found"}), 404

    router = active_network.routers[router_id]
    # Re-run Dijkstra to ensure fresh trace
    routing_table = router.run_dijkstra()

    return jsonify({
        "router_id": router_id,
        "trace": router.dijkstra_trace,
        "routing_table": routing_table,
        "spf_tree": router.spf_tree
    })


@app.route("/api/simulate-packet", methods=["POST"])
def simulate_packet():
    """Simulate routing a packet hop-by-hop from src to dst."""
    data = request.json or {}
    src = data.get("src")
    dst = data.get("dst")
    payload = data.get("payload", "Data Packet")

    if not src or not dst:
        return jsonify({"error": "Both src and dst are required"}), 400

    packet: DataPacket = active_network.simulate_packet_routing(src, dst, payload)

    return jsonify({
        "src": packet.src,
        "dst": packet.dst,
        "payload": packet.payload,
        "path_traversed": packet.path_traversed,
        "accumulated_cost": packet.accumulated_cost,
        "delivered": packet.delivered,
        "error": packet.error,
        "ttl_remaining": packet.ttl,
        "network": serialize_network(active_network)
    })


@app.route("/api/links/fail", methods=["POST"])
def fail_link():
    """Fail a link between two routers."""
    data = request.json or {}
    u = data.get("u")
    v = data.get("v")
    auto_converge = data.get("auto_converge", True)

    if not u or not v:
        return jsonify({"error": "u and v nodes are required"}), 400

    cost = active_network.fail_link(u, v)
    if cost is None:
        return jsonify({"error": f"Link {u} <-> {v} does not exist"}), 404

    stats = None
    if auto_converge:
        stats = active_network.synchronize_and_converge()

    return jsonify({
        "message": f"Link {u} <-> {v} severed (original cost {cost})",
        "failed_link": {"u": u, "v": v, "original_cost": cost},
        "convergence_stats": stats,
        "network": serialize_network(active_network)
    })


@app.route("/api/links/restore", methods=["POST"])
def restore_link():
    """Restore a previously failed link or add/update link cost."""
    data = request.json or {}
    u = data.get("u")
    v = data.get("v")
    cost = float(data.get("cost", 1.0))
    auto_converge = data.get("auto_converge", True)

    if not u or not v:
        return jsonify({"error": "u and v nodes are required"}), 400

    active_network.restore_link(u, v, cost)
    stats = None
    if auto_converge:
        stats = active_network.synchronize_and_converge()

    return jsonify({
        "message": f"Link {u} <-> {v} restored with cost {cost}",
        "link": {"u": u, "v": v, "cost": cost},
        "convergence_stats": stats,
        "network": serialize_network(active_network)
    })


@app.route("/api/routers/add", methods=["POST"])
def add_router():
    """Add a new router to the network."""
    data = request.json or {}
    router_id = data.get("router_id", "").strip()

    if not router_id:
        return jsonify({"error": "router_id is required"}), 400

    active_network.add_router(router_id)
    active_network.synchronize_and_converge()

    return jsonify({
        "message": f"Router {router_id} added",
        "network": serialize_network(active_network)
    })


@app.route("/api/routers/remove", methods=["POST"])
def remove_router():
    """Remove a router and all its links."""
    data = request.json or {}
    router_id = data.get("router_id", "").strip()

    if not router_id:
        return jsonify({"error": "router_id is required"}), 400

    active_network.remove_router(router_id)
    active_network.synchronize_and_converge()

    return jsonify({
        "message": f"Router {router_id} removed",
        "network": serialize_network(active_network)
    })


@app.route("/api/reset", methods=["POST"])
def reset_network():
    """Reset to the default or active scenario."""
    init_default_network(current_scenario_name)
    return jsonify({
        "message": "Network reset to initial scenario",
        "network": serialize_network(active_network)
    })


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    """Serve the React frontend static build if present."""
    if path.startswith("api/"):
        return jsonify({"error": "API route not found"}), 404
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    if os.path.exists(os.path.join(app.static_folder, "index.html")):
        return send_from_directory(app.static_folder, "index.html")
    return jsonify({
        "service": "Link-State Routing Simulator API",
        "author": "Sagar Sewak",
        "status": "online"
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"🚀 Link-State Routing Simulator API running on http://127.0.0.1:{port}")
    print(f"👨‍💻 Project by Sagar Sewak")
    app.run(host="0.0.0.0", port=port, debug=False)
