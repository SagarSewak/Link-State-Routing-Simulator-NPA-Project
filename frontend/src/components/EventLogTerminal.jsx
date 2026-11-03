import React, { useState } from 'react';
import { Terminal, Trash2, ArrowDownCircle } from 'lucide-react';

export function EventLogTerminal({ logs = [], onClearLogs }) {
  const [filter, setFilter] = useState('all');

  const filteredLogs = logs.filter((log) => {
    if (filter === 'all') return true;
    return log.type === filter;
  });

  return (
    <div className="terminal-card">
      <div className="terminal-header">
        <div className="terminal-title-group">
          <Terminal size={16} className="text-cyan" />
          <span className="terminal-title">Protocol Event Log Terminal</span>
          <span className="logs-count">{logs.length} events</span>
        </div>

        <div className="terminal-actions">
          <div className="filter-pills">
            {['all', 'info', 'success', 'error'].map((f) => (
              <button
                key={f}
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>

          <button className="btn-clear-logs" onClick={onClearLogs} title="Clear terminal stream">
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="terminal-body">
        {filteredLogs.length === 0 ? (
          <div className="terminal-empty">Waiting for network protocol events...</div>
        ) : (
          filteredLogs.map((log, idx) => {
            const time = log.time || (typeof log === 'string' ? log.slice(1, 9) : '00:00:00');
            const msg = log.msg || log;
            const type = log.type || (typeof log === 'string' && log.includes('FAILURE') ? 'error' : 'info');

            return (
              <div key={log.id || `log-${idx}`} className={`terminal-line log-${type}`}>
                <span className="terminal-time">[{time}]</span>
                <span className="terminal-badge">{type.toUpperCase()}</span>
                <span className="terminal-msg">{msg}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

