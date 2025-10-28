import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ClipWithMetadata } from "../types/session";

interface ClipCardProps {
  clip: ClipWithMetadata;
  isSelected: boolean;
  onSelect: (clipId: string) => void;
  onDragStart: (clip: ClipWithMetadata) => void;
}

/**
 * ClipCard - Individual clip card in the Library
 * Displays thumbnail, filename, and duration
 * Supports selection and drag-and-drop to timeline
 */
export const ClipCard: React.FC<ClipCardProps> = ({
  clip,
  isSelected,
  onSelect,
  onDragStart,
}) => {
  const [fileExists, setFileExists] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Check if file exists when component mounts or clip changes
  useEffect(() => {
    const checkFile = async () => {
      try {
        const exists = await invoke<boolean>("check_file_exists", {
          filePath: clip.filePath,
        });
        setFileExists(exists);
      } catch (error) {
        console.error(`[ClipCard] Failed to check file existence:`, error);
        setFileExists(false);
      }
    };

    // Initial check
    checkFile();

    // Recheck every 5 seconds to detect deleted files
    const interval = setInterval(checkFile, 5000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [clip.filePath]);

  // Format duration to MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Extract filename from file path
  const getFileName = (filePath: string): string => {
    const parts = filePath.split(/[\\/]/); // Handle both / and \ separators
    return parts[parts.length - 1] || filePath;
  };

  // Truncate filename if too long
  const truncateFilename = (filename: string, maxLength: number = 50): string => {
    if (filename.length <= maxLength) return filename;
    const extension = filename.split(".").pop() || "";
    const nameWithoutExt = filename.slice(0, filename.lastIndexOf("."));
    const truncated = nameWithoutExt.slice(0, maxLength - extension.length - 4) + "...";
    return `${truncated}.${extension}`;
  };

  const filename = getFileName(clip.filePath);
  const displayName = truncateFilename(filename);

  const handleClick = () => {
    if (fileExists) {
      onSelect(clip.id);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!fileExists) {
      e.preventDefault();
      return;
    }

    // Set drag data with clip information
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("application/json", JSON.stringify(clip));
    e.dataTransfer.setData("text/plain", clip.id);

    onDragStart(clip);
  };

  return (
    <div
      className={`clip-card ${isSelected ? "selected" : ""} ${!fileExists ? "missing" : ""}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      draggable={fileExists}
      onDragStart={handleDragStart}
      style={{
        padding: "0",
        borderRadius: "6px",
        border: isSelected ? "2px solid #ffcc00" : "2px solid transparent",
        backgroundColor: isHovered && fileExists ? "#2d2d2d" : "#252525",
        cursor: fileExists ? "pointer" : "not-allowed",
        transition: "all 0.15s ease",
        transform: isHovered && fileExists ? "scale(1.02)" : "scale(1)",
        boxShadow: isSelected
          ? "0 0 0 1px rgba(255, 204, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.4)"
          : isHovered && fileExists
          ? "0 4px 12px rgba(0, 0, 0, 0.5)"
          : "0 2px 4px rgba(0, 0, 0, 0.3)",
        opacity: fileExists ? 1 : 0.5,
        overflow: "hidden",
      }}
      title={filename !== displayName ? filename : undefined}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
          backgroundColor: "#000",
          borderRadius: "4px 4px 0 0",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Show thumbnail or placeholder */}
        {clip.thumbnail ? (
          <img
            src={clip.thumbnail}
            alt={filename}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: fileExists ? 1 : 0.3,
            }}
            draggable={false}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#666",
            }}
          >
            No preview
          </div>
        )}

        {/* Missing file overlay */}
        {!fileExists && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#ff4444",
            }}
            title={`File not found: ${filename}`}
          >
            <div style={{ fontSize: "32px", marginBottom: "4px" }}>⚠️</div>
            <div style={{ fontSize: "11px", fontWeight: "600" }}>File not found</div>
          </div>
        )}

        {/* Duration badge */}
        {fileExists && (
          <div
            style={{
              position: "absolute",
              bottom: "4px",
              right: "4px",
              backgroundColor: "rgba(0, 0, 0, 0.85)",
              color: "#fff",
              padding: "3px 6px",
              borderRadius: "3px",
              fontSize: "10px",
              fontWeight: "600",
              letterSpacing: "0.3px",
            }}
          >
            {formatDuration(clip.duration)}
          </div>
        )}
      </div>

      {/* Info section */}
      <div style={{ padding: "8px 10px" }}>
        {/* Filename */}
        <div
          style={{
            fontSize: "12px",
            color: fileExists ? "#e0e0e0" : "#888",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginBottom: "4px",
            fontWeight: "500",
          }}
          title={filename}
        >
          {displayName}
        </div>

        {/* Metadata (resolution, codec) */}
        {fileExists && clip.resolution && (
          <div
            style={{
              fontSize: "10px",
              color: "#888",
              letterSpacing: "0.2px",
            }}
          >
            {clip.resolution} • {clip.codec?.toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
};
