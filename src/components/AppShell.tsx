import React, { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Session } from "../types/session";
import { EmptyState } from "./EmptyState";
import { VideoImportButton } from "./VideoImportButton";
import { ImportProgress } from "./ImportProgress";
import { useImport } from "../context/ImportContext";
import "./AppShell.css";

interface AppShellProps {
  session: Session;
  onSessionChange: (session: Session) => void;
}

export const AppShell: React.FC<AppShellProps> = ({ session }) => {
  const { importFiles } = useImport();
  const [isDragging, setIsDragging] = useState(false);
  const [clipMetadata, setClipMetadata] = useState<Record<string, any>>({});

  // Load clip metadata from localStorage
  useEffect(() => {
    const loadMetadata = () => {
      const stored = localStorage.getItem("clipMetadata");
      if (stored) {
        setClipMetadata(JSON.parse(stored));
      }
    };

    loadMetadata();

    // Reload metadata when clips change
    const interval = setInterval(loadMetadata, 500);
    return () => clearInterval(interval);
  }, [session.clips]);

  // Set up Tauri's native drag-drop event listener
  useEffect(() => {
    const window = getCurrentWindow();

    const unlisten = window.onDragDropEvent((event) => {
      if (event.payload.type === "enter") {
        setIsDragging(true);
      } else if (event.payload.type === "leave") {
        setIsDragging(false);
      } else if (event.payload.type === "drop") {
        setIsDragging(false);
        const paths = event.payload.paths as string[];

        // Filter for valid video files
        const validPaths = paths.filter((path) =>
          path.toLowerCase().match(/\.(mp4|mov)$/)
        );

        if (validPaths.length > 0) {
          importFiles(validPaths);
        }
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [importFiles]);

  return (
    <div className={`app-shell ${isDragging ? "dragging" : ""}`}>
      {/* Left Panel: Library */}
      <div className="library-panel">
        <div className="panel-header">
          <h2>Library</h2>
          <VideoImportButton />
        </div>
        <div className="panel-content">
          {session.clips.length === 0 ? (
            <EmptyState message="Drag & drop video files or click Import to get started" />
          ) : (
            <div className="clips-list">
              {session.clips.map((clip) => {
                const metadata = clipMetadata[clip.id];
                return (
                  <div key={clip.id} className="clip-card">
                    <div className="clip-thumbnail">
                      {metadata?.thumbnail ? (
                        <img
                          src={metadata.thumbnail}
                          alt={clip.filePath.split("/").pop()}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        "📹"
                      )}
                    </div>
                    <div className="clip-info">
                      <p className="clip-filename">
                        {clip.filePath.split("/").pop()}
                      </p>
                      <p className="clip-duration">
                        {Math.floor(clip.duration)}s
                      </p>
                    </div>
                  </div>
                );
              })}
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
        {/* Reserved for future controls */}
      </div>

      {/* Import Progress Modal */}
      <ImportProgress />

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
