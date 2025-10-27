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

      try {
        setIsImporting(true);
        setImportQueue(filePaths);
        setError(undefined);

        // Simulate progress updates for each file
        for (let i = 0; i < filePaths.length; i++) {
          setCurrentImportFile(filePaths[i]);
          setImportProgress(Math.round(((i + 1) / filePaths.length) * 100));
        }

        // Call Tauri command to import files
        const result: ImportResult = await invoke("import_video_files", {
          filePaths,
        });

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

          // Store metadata in localStorage temporarily
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
