import React from 'react';
import { 
  Users, 
  X, 
  Sparkles, 
  GraduationCap
} from 'lucide-react';
import { PROJECT_AUTHORS } from '../config/authors';

export function AuthorsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container author-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="author-icon-circle">
              <GraduationCap size={22} className="text-cyan" />
            </div>
            <div>
              <h2 className="modal-title">{PROJECT_AUTHORS.displayTitle}</h2>
              <p className="modal-subtitle">
                {PROJECT_AUTHORS.meta.course} • {PROJECT_AUTHORS.meta.department}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Main Author Cards Grid */}
          <div className="authors-showcase-grid">
            {/* Sagar Sewak */}
            <div className="author-card primary-card">
              <div className="card-top-glow"></div>
              <div className="author-badge-lead">
                <Sparkles size={12} />
                <span>Project Author</span>
              </div>
              <div className="author-avatar-circle avatar-lead">
                SS
              </div>
              <h3 className="author-name">{PROJECT_AUTHORS.lead.name}</h3>
              <p className="author-role">{PROJECT_AUTHORS.lead.role}</p>
              <div className="author-details-box">
                <div className="detail-row">
                  <span className="detail-key">Project:</span>
                  <span className="detail-val">Protocol Architecture</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Focus:</span>
                  <span className="detail-val text-emerald">LSR Flooding & Dijkstra SPF</span>
                </div>
              </div>
            </div>

            {/* Sharukesh */}
            <div className="author-card collaborator-card">
              <div className="card-top-glow secondary-glow"></div>
              <div className="author-badge-partner">
                <Users size={12} />
                <span>Project Author</span>
              </div>
              <div className="author-avatar-circle avatar-partner">
                SH
              </div>
              <h3 className="author-name">{PROJECT_AUTHORS.collaborator.name}</h3>
              <p className="author-role">{PROJECT_AUTHORS.collaborator.role}</p>
              <div className="author-details-box">
                <div className="detail-row">
                  <span className="detail-key">Project:</span>
                  <span className="detail-val">Simulation & Verification</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Focus:</span>
                  <span className="detail-val text-cyan">Routing Tables & Packet Tests</span>
                </div>
              </div>
            </div>
          </div>

          {/* Academic Project Info */}
          <div className="project-academic-summary">
            <div className="academic-item">
              <span className="ac-label">Course:</span>
              <span className="ac-value">{PROJECT_AUTHORS.meta.course} ({PROJECT_AUTHORS.meta.courseCode})</span>
            </div>
            <div className="academic-item">
              <span className="ac-label">Academic Year:</span>
              <span className="ac-value">{PROJECT_AUTHORS.meta.year}</span>
            </div>
            <div className="academic-item">
              <span className="ac-label">Topic:</span>
              <span className="ac-value">Link-State Routing (OSPF) & Dijkstra Shortest Path First</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-modal-done" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
