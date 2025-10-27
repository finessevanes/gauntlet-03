import React from "react";
import { Session } from "../types/session";
import { EmptyState } from "./EmptyState";
import "./AppShell.css";

interface AppShellProps {
  session: Session;
  onSessionChange: (session: Session) => void;
}

export const AppShell: React.FC<AppShellProps> = ({ session }) => {
  return (
    <div className="app-shell">
      {/* Left Panel: Library */}
      <div className="library-panel">
        <div className="panel-header">
          <h2>Library</h2>
        </div>
        <div className="panel-content">
          {session.clips.length === 0 ? (
            <EmptyState message="Drag & drop video files or click Import to get started" />
          ) : (
            <div className="clips-list">
              {session.clips.map((clip) => (
                <div key={clip.id} className="clip-card">
                  <div className="clip-thumbnail">📹</div>
                  <div className="clip-info">
                    <p className="clip-filename">{clip.filePath.split("/").pop()}</p>
                    <p className="clip-duration">
                      {Math.floor(clip.duration)}s
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center Panel: Preview Player */}
      <div className="preview-panel">
        <div className="panel-header">
          <h2>Preview</h2>
        </div>
        <div className="panel-content">
          <EmptyState message="Select a clip or play timeline" icon="▶️" />
        </div>
      </div>

      {/* Right Sidebar: Controls */}
      <div className="controls-sidebar">
        <button className="control-button">Import</button>
      </div>

      {/* Bottom Panel: Timeline */}
      <div className="timeline-panel">
        <div className="panel-header">
          <h2>Timeline</h2>
        </div>
        <div className="panel-content">
          {session.timelineOrder.length === 0 ? (
            <EmptyState message="Drag clips here to start editing" icon="📽️" />
          ) : (
            <div className="timeline-container">
              {session.timelineOrder.map((clipId) => {
                const clip = session.clips.find((c) => c.id === clipId);
                return (
                  <div key={clipId} className="timeline-clip">
                    {clip?.filePath.split("/").pop()}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
