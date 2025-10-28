import React, { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Session } from "../types/session";
import { EmptyState } from "./EmptyState";
import { VideoImportButton } from "./VideoImportButton";
import { ImportProgress } from "./ImportProgress";
import { Library } from "./Library";
import { useImport } from "../context/ImportContext";
import "./AppShell.css";

interface AppShellProps {
  session: Session;
  onSessionChange: (session: Session) => void;
}

export const AppShell: React.FC<AppShellProps> = ({ session }) => {
  const { importFiles } = useImport();
  const [isDragging, setIsDragging] = useState(false);

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
      <div style={{ display: "flex", height: "100%", width: "100%" }}>
        {/* Library Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{
            padding: "8px 12px",
            borderBottom: "1px solid #333",
            backgroundColor: "#1e1e1e",
            display: "flex",
            justifyContent: "flex-end"
          }}>
            <VideoImportButton />
          </div>
          <Library />
        </div>

        {/* Main content area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Top area: Preview */}
          <div className="preview-panel" style={{ flex: 1 }}>
            <div className="panel-header">
              <h2>Preview</h2>
            </div>
            <div className="panel-content">
              <EmptyState message="Select a clip or play timeline" icon="▶️" />
            </div>
          </div>

          {/* Bottom area: Timeline */}
          <div className="timeline-panel" style={{ height: "30%" }}>
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
      </div>

      {/* Import Progress Modal */}
      <ImportProgress />
    </div>
  );
};
