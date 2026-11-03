import React from 'react';
import { 
  Network, 
  Cpu, 
  BookOpen, 
  Users, 
  RotateCcw, 
  Radio, 
  Layers,
  Sparkles,
  Server
} from 'lucide-react';
import { PROJECT_AUTHORS } from '../config/authors';

export function Navbar({ 
  scenarios, 
  currentScenario, 
  onSelectScenario, 
  onReset, 
  onTriggerConverge, 
  onOpenTheory, 
  onOpenAuthors,
  backendOnline,
  isConverging 
}) {
  return (
    <header className="navbar-container">
      {/* Top Banner Ribbon */}
      <div className="top-attribution-ribbon">
        <div className="ribbon-content">
          <span className="author-badge-primary">
            <Sparkles size={13} className="sparkle-icon" />
            <strong className="author-highlight">{PROJECT_AUTHORS.displayTitle}</strong>
          </span>
          <span className="ribbon-divider">•</span>
          <span className="ribbon-course">{PROJECT_AUTHORS.meta.course}</span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="main-nav">
        <div className="nav-brand">
          <div className="logo-icon-wrapper">
            <Network className="logo-icon" size={26} />
            <div className="logo-glow"></div>
          </div>
          <div className="brand-text">
            <div className="brand-title">
              <span className="brand-gradient">Link-State Routing</span>
              <span className="brand-version">SPF v2.0</span>
            </div>
            <div className="brand-subtitle">
              OSPF-Style Protocol & Dijkstra Shortest Path Simulator
            </div>
          </div>
        </div>

        {/* Center: Scenario Selection */}
        <div className="nav-center">
          <div className="scenario-selector-wrapper">
            <Layers size={16} className="scenario-icon" />
            <label className="scenario-label" htmlFor="scenario-select">Topology:</label>
            <select
              id="scenario-select"
              className="scenario-dropdown"
              value={currentScenario}
              onChange={(e) => onSelectScenario(e.target.value)}
            >
              {scenarios.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name} ({sc.routers_count || '?'} nodes)
                </option>
              ))}
            </select>
          </div>

          <button 
            className={`nav-action-btn btn-converge ${isConverging ? 'loading' : ''}`}
            onClick={onTriggerConverge}
            title="Flood LSPs across all interfaces and recompute Dijkstra SPF tables"
          >
            <Radio size={16} className={isConverging ? 'spin' : 'pulse'} />
            <span>{isConverging ? 'Flooding...' : 'Flood LSPs & Converge'}</span>
          </button>

          <button 
            className="nav-action-btn btn-reset" 
            onClick={onReset}
            title="Reset topology to initial scenario state"
          >
            <RotateCcw size={15} />
            <span>Reset</span>
          </button>
        </div>

        {/* Right: Status and Modals */}
        <div className="nav-right">
          {/* Backend Status Pill */}
          <div className={`status-pill ${backendOnline ? 'online' : 'client'}`} title={backendOnline ? 'Connected to live Python Flask Backend (http://localhost:5001)' : 'Running on High-Performance In-Browser Simulator Engine'}>
            <span className="status-dot"></span>
            <Server size={13} />
            <span>{backendOnline ? 'Python Backend' : 'In-Browser Sim'}</span>
          </div>

          <button className="nav-icon-btn btn-theory" onClick={onOpenTheory} title="Protocol Theory & Math Formulation">
            <BookOpen size={16} />
            <span>Theory & Docs</span>
          </button>

          <button className="nav-icon-btn btn-authors" onClick={onOpenAuthors} title="Project Authors & Team Info">
            <Users size={16} />
            <span>Authors</span>
          </button>
        </div>
      </div>
    </header>
  );
}

