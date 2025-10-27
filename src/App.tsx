import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSession } from "./context/SessionContext";
import { AppShell } from "./components/AppShell";
import { ErrorDialog } from "./components/ErrorDialog";
import { AppInitState } from "./types/session";
import "./App.css";

function App() {
  const { session, loading, error, setSession, setLoading, setError } =
    useSession();

  // Initialize app on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        setError(null);

        // Call Tauri command to initialize app
        const result: AppInitState = await invoke("init_app");

        if (result.ffmpegStatus !== "ok") {
          setError("FFmpeg binary not found. Please reinstall the app.");
          return;
        }

        // Restore session state
        setSession(result.session);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : String(err);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, [setSession, setLoading, setError]);

  // Save session on window close
  useEffect(() => {
    const handleBeforeUnload = async () => {
      try {
        await invoke("save_session", { session });
      } catch (err) {
        console.error("Failed to save session:", err);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [session]);

  // Loading state
  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Initializing...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorDialog
        title="Cannot Start"
        message={error}
        onClose={() => {
          // Close the application window
          window.close();
        }}
      />
    );
  }

  // Success state - render main app
  return <AppShell session={session} onSessionChange={setSession} />;
}

export default App;
