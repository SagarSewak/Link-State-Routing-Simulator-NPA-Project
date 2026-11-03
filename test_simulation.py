"""
Unit and Integration Tests for Link-State Routing Simulator.
"""

import unittest
from link_state_sim import (
    Network,
    Router,
    LSP,
    DataPacket
)


class TestLinkStateRouting(unittest.TestCase):

    def setUp(self):
        # Build textbook 6-node network:
        # u-v:2, u-w:5, u-x:1, v-w:3, v-y:2, w-x:3, w-y:1, w-z:5, x-y:1, y-z:2
        self.net = Network("TestNetwork")
        links = [
            ("u", "v", 2),
            ("u", "w", 5),
            ("u", "x", 1),
            ("v", "w", 3),
            ("v", "y", 2),
            ("w", "x", 3),
            ("w", "y", 1),
            ("w", "z", 5),
            ("x", "y", 1),
            ("y", "z", 2)
        ]
        for u, v, c in links:
            self.net.add_link(u, v, c)

    def test_lsp_generation_and_sequencing(self):
        router = Router("R1")
        router.add_neighbor("R2", 4.0)
        lsp1 = router.generate_lsp()
        self.assertEqual(lsp1.sequence_number, 1)
        self.assertEqual(lsp1.neighbors, {"R2": 4.0})

        lsp2 = router.generate_lsp()
        self.assertEqual(lsp2.sequence_number, 2)
        self.assertTrue(lsp2.is_newer_than(lsp1))
        self.assertFalse(lsp1.is_newer_than(lsp2))

    def test_flooding_and_lsdb_sync(self):
        stats = self.net.synchronize_and_converge()
        self.assertTrue(stats["converged"])
        self.assertTrue(stats["lsdb_consistent"])

        # Check that all routers have all 6 nodes in their LSDB
        for r in self.net.routers.values():
            self.assertEqual(len(r.lsdb), 6)
            self.assertIn("u", r.lsdb)
            self.assertIn("z", r.lsdb)

    def test_dijkstra_shortest_paths(self):
        self.net.synchronize_and_converge()
        u = self.net.routers["u"]

        # Expected shortest path costs from 'u':
        # u -> v: 2 (direct)
        # u -> x: 1 (direct)
        # u -> y: 2 (via x, cost 1+1=2)
        # u -> w: 3 (via x->y->w, cost 1+1+1=3)
        # u -> z: 4 (via x->y->z, cost 1+1+2=4)
        self.assertEqual(u.routing_table["v"]["cost"], 2.0)
        self.assertEqual(u.routing_table["x"]["cost"], 1.0)
        self.assertEqual(u.routing_table["y"]["cost"], 2.0)
        self.assertEqual(u.routing_table["w"]["cost"], 3.0)
        self.assertEqual(u.routing_table["z"]["cost"], 4.0)

        # Next hops from 'u'
        self.assertEqual(u.routing_table["v"]["next_hop"], "v")
        self.assertEqual(u.routing_table["x"]["next_hop"], "x")
        self.assertEqual(u.routing_table["y"]["next_hop"], "x")
        self.assertEqual(u.routing_table["w"]["next_hop"], "x")
        self.assertEqual(u.routing_table["z"]["next_hop"], "x")

    def test_packet_routing(self):
        self.net.synchronize_and_converge()
        pkt = self.net.simulate_packet_routing("u", "z", "Test Payload")

        self.assertTrue(pkt.delivered)
        self.assertEqual(pkt.path_traversed, ["u", "x", "y", "z"])
        self.assertEqual(pkt.accumulated_cost, 4.0)
        self.assertIsNone(pkt.error)

    def test_dynamic_link_failure_rerouting(self):
        self.net.synchronize_and_converge()

        # Fail link x-y
        self.net.fail_link("x", "y")
        self.net.synchronize_and_converge()

        u = self.net.routers["u"]
        # After x-y is down:
        # u -> z becomes u -> v -> y -> z (cost 2 + 2 + 2 = 6)
        self.assertEqual(u.routing_table["z"]["cost"], 6.0)
        self.assertEqual(u.routing_table["z"]["next_hop"], "v")

        pkt = self.net.simulate_packet_routing("u", "z")
        self.assertTrue(pkt.delivered)
        self.assertEqual(pkt.path_traversed, ["u", "v", "y", "z"])
        self.assertEqual(pkt.accumulated_cost, 6.0)

    def test_unreachable_destination(self):
        # Create an isolated node
        self.net.add_router("ISOLATED")
        self.net.synchronize_and_converge()

        pkt = self.net.simulate_packet_routing("u", "ISOLATED")
        self.assertFalse(pkt.delivered)
        self.assertIn("no_route", pkt.error)


if __name__ == "__main__":
    unittest.main()
