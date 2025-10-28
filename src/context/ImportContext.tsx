import React, { createContext, useContext, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { ImportResult, ImportedClip } from "../types/video";
import { useSession } from "./SessionContext";

interface ImportContextType {
  isImporting: boolean;
  importQueue: string[];
  currentImportFile?: string;
  importProgress: number;
  lastImportDirectory?: string;
  error?: string;
  importFiles: (filePaths: string[]) => Promise<void>;
  openFilePicker: () => Promise<void>;
  clearError: () => void;
}

const ImportContext = createContext<ImportContextType | undefined>(undefined);

export const ImportProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { session, setSession } = useSession();
  const [isImporting, setIsImporting] = useState(false);
  const [importQueue, setImportQueue] = useState<string[]>([]);
  const [currentImportFile, setCurrentImportFile] = useState<string | undefined>();
  const [importProgress, setImportProgress] = useState(0);
  const [lastImportDirectory, setLastImportDirectory] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const importFiles = useCallback(
    async (filePaths: string[]) => {
      if (filePaths.length === 0) return;

      // Check localStorage usage before importing
      try {
        const stored = localStorage.getItem("clipMetadata");
        if (stored) {
          const sizeInMB = new Blob([stored]).size / (1024 * 1024);
          console.log(`[Import] Current localStorage usage: ${sizeInMB.toFixed(2)}MB`);

          // Warn if approaching quota (typical limit is 5-10MB)
          if (sizeInMB > 4) {
            console.warn(`[Import] localStorage usage is high. Importing ${filePaths.length} more clips may cause issues.`);
          }
        }
      } catch (err) {
        console.warn("[Import] Failed to check storage usage:", err);
      }

      // Limit maximum batch import size to prevent quota issues
      const MAX_BATCH_SIZE = 50;
      if (filePaths.length > MAX_BATCH_SIZE) {
        setError(`Too many files. Please import ${MAX_BATCH_SIZE} or fewer files at a time.`);
        return;
      }

      try {
        setIsImporting(true);
        setImportQueue(filePaths);
        setError(undefined);
        setImportProgress(0);

        // Process files one at a time to show real progress
        const allClips: ImportedClip[] = [];
        const allErrors: string[] = [];

        for (let i = 0; i < filePaths.length; i++) {
          const filePath = filePaths[i];
          setCurrentImportFile(filePath);

          try {
            // Import single file
            const result: ImportResult = await invoke("import_video_files", {
              filePaths: [filePath],
            });

            // Collect results
            allClips.push(...result.clips);
            allErrors.push(...result.errors);

            // Update progress after each file completes
            setImportProgress(Math.round(((i + 1) / filePaths.length) * 100));

            // Small delay to prevent overwhelming the system
            if (i < filePaths.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            allErrors.push(`${filePath}: ${errorMsg}`);
          }
        }

        // Create combined result
        const result: ImportResult = {
          success: allErrors.length === 0,
          clips: allClips,
          errors: allErrors,
        };

        // Handle errors
        if (result.errors.length > 0) {
          setError(result.errors.join("\n"));
        }

        // Add successfully imported clips to session
        if (result.clips.length > 0) {
          const newClips = result.clips.map((importedClip: ImportedClip) => ({
            id: importedClip.id,
            filePath: importedClip.filePath,
            duration: importedClip.duration,
            inPoint: 0,
            outPoint: importedClip.duration,
            // Store metadata separately or in localStorage for now
            // Session persistence (Story 8) will handle full metadata storage
          }));

          setSession({
            ...session,
            clips: [...session.clips, ...newClips],
          });

          // Store metadata in localStorage temporarily with quota error handling
          try {
            const clipMetadata = result.clips.reduce((acc, clip) => {
              acc[clip.id] = {
                thumbnail: clip.thumbnail,
                resolution: clip.resolution,
                frameRate: clip.frameRate,
                codec: clip.codec,
                importedAt: clip.importedAt,
              };
              return acc;
            }, {} as Record<string, any>);

            const existing = localStorage.getItem("clipMetadata");
            const merged = existing
              ? { ...JSON.parse(existing), ...clipMetadata }
              : clipMetadata;

            localStorage.setItem("clipMetadata", JSON.stringify(merged));
          } catch (storageErr) {
            // Handle localStorage quota exceeded
            if (storageErr instanceof Error &&
                (storageErr.name === 'QuotaExceededError' ||
                 storageErr.message.includes('quota'))) {
              console.warn("LocalStorage quota exceeded. Attempting to free up space...");

              // Try to clear and save just the new clips
              try {
                const clipMetadata = result.clips.reduce((acc, clip) => {
                  acc[clip.id] = {
                    thumbnail: clip.thumbnail,
                    resolution: clip.resolution,
                    frameRate: clip.frameRate,
                    codec: clip.codec,
                    importedAt: clip.importedAt,
                  };
                  return acc;
                }, {} as Record<string, any>);

                // Keep only metadata for current session clips
                const currentClipIds = new Set([...session.clips.map(c => c.id), ...result.clips.map(c => c.id)]);
                const existing = localStorage.getItem("clipMetadata");
                const filtered = existing
                  ? Object.fromEntries(
                      Object.entries(JSON.parse(existing))
                        .filter(([id]) => currentClipIds.has(id))
                    )
                  : {};

                const merged = { ...filtered, ...clipMetadata };
                localStorage.setItem("clipMetadata", JSON.stringify(merged));
                console.info("Successfully freed up space. Old clip thumbnails removed.");
              } catch (retryErr) {
                console.error("Failed to recover from quota error:", retryErr);
                setError("Storage full: Too many clips imported. Some thumbnails may not display. Try importing fewer clips at once.");
              }
            } else {
              throw storageErr;
            }
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(errorMsg);
      } finally {
        setIsImporting(false);
        setImportQueue([]);
        setCurrentImportFile(undefined);
        setImportProgress(0);
      }
    },
    [session, setSession]
  );

  const openFilePicker = useCallback(async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: "Video Files",
            extensions: ["mp4", "mov"],
          },
        ],
        defaultPath: lastImportDirectory,
      });

      if (selected) {
        const filePaths = Array.isArray(selected) ? selected : [selected];

        // Store directory for next time
        if (filePaths.length > 0) {
          const firstPath = filePaths[0];
          const dirPath = firstPath.substring(0, firstPath.lastIndexOf("/"));
          setLastImportDirectory(dirPath);
        }

        await importFiles(filePaths);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
    }
  }, [importFiles, lastImportDirectory]);

  const clearError = useCallback(() => {
    setError(undefined);
  }, []);

  const value: ImportContextType = {
    isImporting,
    importQueue,
    currentImportFile,
    importProgress,
    lastImportDirectory,
    error,
    importFiles,
    openFilePicker,
    clearError,
  };

  return (
    <ImportContext.Provider value={value}>{children}</ImportContext.Provider>
  );
};

export const useImport = (): ImportContextType => {
  const context = useContext(ImportContext);
  if (context === undefined) {
    throw new Error("useImport must be used within an ImportProvider");
  }
  return context;
};
