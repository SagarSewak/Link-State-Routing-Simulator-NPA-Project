/**
 * Unified API Client for Link-State Routing Simulator.
 * Bridges between the Python backend (Flask at http://127.0.0.1:5001)
 * and the in-browser LinkStateEngine fallback.
 */

import { LinkStateEngine, PRESET_SCENARIOS } from '../engine/linkStateEngine';

const API_BASE = '/api';

class ApiService {
  constructor() {
    this.engine = new LinkStateEngine('textbook_topology.json');
    this.backendAvailable = false;
    this.isChecking = false;
    this.useBackendIfAvailable = true;
  }

  async checkBackendHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        this.backendAvailable = true;
        return { online: true, data };
      }
    } catch {
      // Backend not running
    }
    this.backendAvailable = false;
    return { online: false };
  }

  async getNetworkState() {
    if (this.backendAvailable && this.useBackendIfAvailable) {
      try {
        const res = await fetch(`${API_BASE}/network`);
        if (res.ok) {
          const data = await res.json();
          // Merge with engine positions
          data.positions = this.engine.nodePositions;
          return { source: 'backend', data };
        }
      } catch (err) {
        console.warn('Backend failed, falling back to client engine', err);
      }
    }
    return { source: 'client', data: this.engine.getState() };
  }

  async getScenarios() {
    if (this.backendAvailable && this.useBackendIfAvailable) {
      try {
        const res = await fetch(`${API_BASE}/scenarios`);
        if (res.ok) {
          const data = await res.json();
          return data;
        }
      } catch {
        // Fallback
      }
    }
    return {
      scenarios: Object.entries(PRESET_SCENARIOS).map(([id, s]) => ({
        id,
        filename: id,
        name: s.name,
        routers_count: s.routers.length,
        links_count: s.links.length,
      })),
      current: this.engine.scenarioKey,
    };
  }

  async loadScenario(scenarioKey) {
    this.engine.loadScenario(scenarioKey);
    if (this.backendAvailable && this.useBackendIfAvailable) {
      try {
        await fetch(`${API_BASE}/scenarios/load`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenario: scenarioKey }),
        });
      } catch {
        // Ignored
      }
    }
    return this.getNetworkState();
  }

  async triggerConvergence() {
    let clientStats = this.engine.converge();
    let stats = clientStats;
    if (this.backendAvailable && this.useBackendIfAvailable) {
      try {
        const res = await fetch(`${API_BASE}/converge`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          stats = data.stats;
        }
      } catch {
        // Ignored
      }
    }
    const state = await this.getNetworkState();
    return { stats, state };
  }

  async getDijkstraTrace(routerId) {
    if (this.backendAvailable && this.useBackendIfAvailable) {
      try {
        const res = await fetch(`${API_BASE}/dijkstra/${routerId}`);
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fallback
      }
    }
    this.engine.runDijkstra(routerId);
    const router = this.engine.routers[routerId];
    return {
      router_id: routerId,
      trace: router?.dijkstraTrace || [],
      routing_table: router?.routingTable || {},
      spf_tree: router?.spfTree || {},
    };
  }

  async simulatePacket(src, dst, payload) {
    if (this.backendAvailable && this.useBackendIfAvailable) {
      try {
        const res = await fetch(`${API_BASE}/simulate-packet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ src, dst, payload }),
        });
        if (res.ok) {
          const data = await res.json();
          this.engine.simulatePacket(src, dst, payload); // keep client in sync
          return data;
        }
      } catch {
        // Fallback
      }
    }
    return this.engine.simulatePacket(src, dst, payload);
  }

  async failLink(u, v) {
    const clientResult = this.engine.failLink(u, v);
    if (this.backendAvailable && this.useBackendIfAvailable) {
      try {
        await fetch(`${API_BASE}/links/fail`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ u, v }),
        });
      } catch {
        // Ignored
      }
    }
    const state = await this.getNetworkState();
    return { result: clientResult, state };
  }

  async restoreLink(u, v, cost) {
    const clientResult = this.engine.restoreLink(u, v, cost);
    if (this.backendAvailable && this.useBackendIfAvailable) {
      try {
        await fetch(`${API_BASE}/links/restore`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ u, v, cost }),
        });
      } catch {
        // Ignored
      }
    }
    const state = await this.getNetworkState();
    return { result: clientResult, state };
  }

  async setLinkCost(u, v, cost) {
    this.engine.setLinkCost(u, v, cost);
    if (this.backendAvailable && this.useBackendIfAvailable) {
      try {
        await fetch(`${API_BASE}/links/restore`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ u, v, cost }),
        });
      } catch {
        // Ignored
      }
    }
    return this.getNetworkState();
  }

  async addRouter(id) {
    const success = this.engine.addRouter(id);
    if (success && this.backendAvailable && this.useBackendIfAvailable) {
      try {
        await fetch(`${API_BASE}/routers/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ router_id: id }),
        });
      } catch {
        // Ignored
      }
    }
    return this.getNetworkState();
  }

  async removeRouter(id) {
    const success = this.engine.removeRouter(id);
    if (success && this.backendAvailable && this.useBackendIfAvailable) {
      try {
        await fetch(`${API_BASE}/routers/remove`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ router_id: id }),
        });
      } catch {
        // Ignored
      }
    }
    return this.getNetworkState();
  }

  async resetNetwork() {
    this.engine.loadScenario(this.engine.scenarioKey);
    if (this.backendAvailable && this.useBackendIfAvailable) {
      try {
        await fetch(`${API_BASE}/reset`, { method: 'POST' });
      } catch {
        // Ignored
      }
    }
    return this.getNetworkState();
  }
}

export const api = new ApiService();

