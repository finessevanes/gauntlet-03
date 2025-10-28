import React, { useState, useEffect } from "react";
import { useSession } from "../context/SessionContext";
import { ClipCard } from "./ClipCard";
import { ClipWithMetadata } from "../types/session";

/**
 * Library - Displays all imported clips in a scrollable sidebar
 * Users can select clips and drag them to the timeline
 */
export const Library: React.FC = () => {
  const { session } = useSession();
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [clipMetadata, setClipMetadata] = useState<Record<string, any>>({});

  // Load clip metadata from localStorage
  useEffect(() => {
    const loadMetadata = () => {
      try {
        const stored = localStorage.getItem("clipMetadata");
        if (stored) {
          setClipMetadata(JSON.parse(stored));
        }
      } catch (error) {
        console.error("Failed to load clip metadata:", error);
      }
    };

    loadMetadata();

    // Listen for storage changes (when new clips are imported)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "clipMetadata" && e.newValue) {
        setClipMetadata(JSON.parse(e.newValue));
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Re-load metadata when session clips change
  useEffect(() => {
    const stored = localStorage.getItem("clipMetadata");
    if (stored) {
      setClipMetadata(JSON.parse(stored));
    }
  }, [session.clips.length]);

  // Convert Clip to ClipWithMetadata by merging with metadata from localStorage
  const clips: ClipWithMetadata[] = session.clips.map((clip) => ({
    ...clip,
    thumbnail: clipMetadata[clip.id]?.thumbnail,
    resolution: clipMetadata[clip.id]?.resolution,
    frameRate: clipMetadata[clip.id]?.frameRate,
    codec: clipMetadata[clip.id]?.codec,
    importedAt: clipMetadata[clip.id]?.importedAt,
  }));

  const handleSelectClip = (clipId: string) => {
    setSelectedClipId(clipId);
    // TODO: Trigger preview player update (Story 6)
    console.log("Selected clip:", clipId);
  };

  const handleDragStart = (clip: ClipWithMetadata) => {
    console.log("Drag started for clip:", clip.id);
    // Drag data is set in ClipCard component
  };

  return (
    <div
      className="library"
      style={{
        width: "20%",
        minWidth: "220px",
        maxWidth: "320px",
        height: "100%",
        backgroundColor: "#1e1e1e",
        borderRight: "1px solid #000",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid #3a3a3a",
          fontSize: "13px",
          fontWeight: "600",
          color: "#e0e0e0",
          backgroundColor: "#2a2a2a",
          letterSpacing: "0.3px",
        }}
      >
        Library
        {clips.length > 0 && (
          <span style={{ marginLeft: "8px", color: "#888", fontSize: "11px", fontWeight: "400" }}>
            {clips.length} clip{clips.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Clip List (scrollable) */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "12px 8px",
          backgroundColor: "#1e1e1e",
        }}
      >
        {clips.length === 0 ? (
          // Empty state
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              padding: "30px 20px",
              textAlign: "center",
              color: "#666",
            }}
          >
            <div style={{ fontSize: "56px", marginBottom: "16px", opacity: 0.5 }}>📹</div>
            <div style={{ fontSize: "13px", lineHeight: "1.6", color: "#888" }}>
              Drag & drop video files or click Import to get started
            </div>
          </div>
        ) : (
          // Clip cards
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {clips.map((clip) => (
              <ClipCard
                key={clip.id}
                clip={clip}
                isSelected={selectedClipId === clip.id}
                onSelect={handleSelectClip}
                onDragStart={handleDragStart}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
