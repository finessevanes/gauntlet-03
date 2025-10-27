import { useImport } from "../context/ImportContext";
import "./VideoImportButton.css";

export const VideoImportButton: React.FC = () => {
  const { isImporting, openFilePicker } = useImport();

  return (
    <button
      className="video-import-button"
      onClick={openFilePicker}
      disabled={isImporting}
    >
      {isImporting ? "Importing..." : "Import"}
    </button>
  );
};
