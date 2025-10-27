import { useImport } from "../context/ImportContext";
import "./ImportProgress.css";

export const ImportProgress: React.FC = () => {
  const {
    isImporting,
    importQueue,
    currentImportFile,
    importProgress,
    error,
    clearError,
  } = useImport();

  if (!isImporting && !error) {
    return null;
  }

  const currentIndex = importQueue.findIndex((file) => file === currentImportFile);
  const totalFiles = importQueue.length;
  const fileName = currentImportFile
    ? currentImportFile.split("/").pop() || currentImportFile
    : "";

  return (
    <div className="import-progress-overlay">
      <div className="import-progress-modal">
        {error ? (
          <>
            <h3>Import Error</h3>
            <div className="import-error">
              <pre>{error}</pre>
            </div>
            <button className="import-close-button" onClick={clearError}>
              Close
            </button>
          </>
        ) : (
          <>
            <h3>Importing Files</h3>
            <div className="import-status">
              <p className="import-filename">{fileName}</p>
              <p className="import-count">
                {currentIndex + 1} of {totalFiles}
              </p>
            </div>
            <div className="import-progress-bar-container">
              <div
                className="import-progress-bar"
                style={{ width: `${importProgress}%` }}
              />
            </div>
            <p className="import-progress-text">{importProgress}%</p>
          </>
        )}
      </div>
    </div>
  );
};
