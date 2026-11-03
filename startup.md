# 🚀 Quick Startup Guide

> 📖 **Deep Dive Documentation:** For a complete breakdown of algorithms, mathematical formulations, architecture, and real-world relevance, read [**`overview.md`**](overview.md).

**Project:** Link-State Routing Protocol & Dijkstra Shortest Path Simulator  
**Authors:** Project by Sagar and Sharukesh (Sagar Sewak & Sharukesh)  
**Course:** Network Protocols and Algorithms (7th Semester)

---

## 📋 System Prerequisites

Ensure you have the following installed on your machine:
* **Python 3.9+** (`python3 --version`)
* **Node.js 18+** & **npm** (`node -v && npm -v`)

---

## 📦 Step 1: Install Dependencies

Open a terminal in the project root directory and run:

### 1. Install Python Dependencies
```bash
pip install -r requirements.txt
```
*(Installs `networkx`, `matplotlib`, `tabulate`, `pytest`, and `flask`)*

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

---

## 💻 Step 2: Choose How to Run the Project

You can run the project in any of the following modes:

### 🌟 Mode 1: Full-Stack React Web GUI (Recommended)
This starts the Python REST API server, which automatically serves the compiled, bright and colorful React web interface.

```bash
python3 server.py
```
Open your browser and navigate to:
👉 **[http://localhost:5001](http://localhost:5001)**

---

### ⚡ Mode 2: React Frontend with Live Hot-Reloading
If you want to actively edit the React components with instantaneous hot reloading:

1. **Terminal 1 (Backend API):**
   ```bash
   python3 server.py
   ```

2. **Terminal 2 (Frontend Dev Server):**
   ```bash
   cd frontend
   npm run dev
   ```
Open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

*(Note: The frontend also features a standalone in-browser simulation engine, so it can run even if Terminal 1 is not running!)*

---

### 🖥️ Mode 3: Interactive Terminal CLI
If you prefer running the simulation directly inside your terminal with menu options:

```bash
python3 interactive_cli.py
```
**Interactive options include:**
- Inspecting the Link-State Database (LSDB)
- Viewing step-by-step Dijkstra SPF calculations
- Sending test data packets
- Simulating dynamic link cuts and re-convergence

---

### 🤖 Mode 4: Automated Demonstration Script
Runs an end-to-end walkthrough that floods LSPs, traces Dijkstra iterations, routes packets, injects a link cut ($x \leftrightarrow y$), dynamically reroutes traffic, and exports PNG topology diagrams:

```bash
python3 demo.py
```

---

### 🧪 Mode 5: Automated Unit Tests
To verify protocol correctness and algorithm integrity:

```bash
python3 -m unittest test_simulation.py
```

---

## 👥 Project Team & Authors

**Project by Sagar and Sharukesh**
* **Sagar Sewak** – Protocol Architecture & Algorithm Development
* **Sharukesh** – Simulation, Testing & Verification

---

## 🔧 Port Reference & Troubleshooting

| Service | Default URL | Purpose |
|---|---|---|
| **Flask API Server** | `http://localhost:5001` | REST endpoints & static web GUI bundle |
| **Vite Dev Server** | `http://localhost:3000` | React hot-reload development server |

* **Port already in use?** You can run the backend on a custom port with:
  ```bash
  PORT=5002 python3 server.py
  ```
* **Rebuilding Frontend:** If you make changes inside `frontend/src/`, recompile the static bundle with:
  ```bash
  cd frontend && npm run build && cd ..
  ```

