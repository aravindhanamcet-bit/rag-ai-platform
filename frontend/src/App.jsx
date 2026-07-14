import { useState, useCallback, useEffect } from "react"
import UploadPanel from "./components/UploadPanel"
import FileList from "./components/FileList"
import ChatWindow from "./components/ChatWindow"

function App() {
  const [uploadedFile, setUploadedFile] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleUploadSuccess = useCallback((file) => {
    setUploadedFile(file)
    setRefreshKey(k => k + 1)
    setSidebarOpen(false) // auto-close drawer on mobile after upload
  }, [])

  // close drawer automatically if user resizes back to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) setSidebarOpen(false)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div className="app-container" style={{ display: "flex", height: "100vh", background: "#0f1117", color: "#e8eaf0", fontFamily: "'Inter', 'Segoe UI', sans-serif", position: "relative", overflow: "hidden" }}>

      <style>{`
        .sidebar {
          transition: transform 0.25s ease;
        }

        .mobile-header {
          display: none;
        }

        .sidebar-overlay {
          display: none;
        }

        /* Tablet and below: sidebar becomes an off-canvas drawer */
        @media (max-width: 1024px) {
          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            z-index: 40;
            transform: translateX(-100%);
            box-shadow: 4px 0 24px rgba(0,0,0,0.4);
          }
          .sidebar.open {
            transform: translateX(0);
          }
          .mobile-header {
            display: flex;
          }
          .sidebar-overlay.open {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 30;
          }
        }

        /* Phones: sidebar takes most of the screen instead of a fixed 280px */
        @media (max-width: 640px) {
          .sidebar {
            width: 85vw !important;
            min-width: 0 !important;
          }
        }
      `}</style>

      {/* Overlay backdrop for mobile/tablet drawer */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "open" : ""}`} style={{
        width: "280px",
        minWidth: "280px",
        background: "#161b27",
        borderRight: "1px solid #1e2535",
        display: "flex",
        flexDirection: "column",
        padding: "0",
        overflow: "hidden"
      }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #1e2535" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "8px",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: "600", color: "#f0f2f8" }}>ARAVIND"S</div>
              <div style={{ fontSize: "11px", color: "#6b7280" }}>RAG AI Platform</div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div style={{ padding: "20px", borderBottom: "1px solid #1e2535" }}>
          <UploadPanel onUploadSuccess={handleUploadSuccess} />
        </div>

        {/* File List */}
        <div style={{ flex: 1, padding: "20px", overflow: "auto" }}>
          <FileList refreshKey={refreshKey} uploadedFile={uploadedFile} />
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid #1e2535" }}>
          <div style={{ fontSize: "11px", color: "#4b5563", textAlign: "center" }}>
            Powered by Gemini · ChromaDB · HuggingFace
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Mobile/tablet top bar with hamburger */}
        <div className="mobile-header" style={{
          alignItems: "center",
          gap: "12px",
          padding: "14px 16px",
          borderBottom: "1px solid #1e2535",
          background: "#161b27"
        }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: "transparent",
              border: "none",
              color: "#e8eaf0",
              cursor: "pointer",
              padding: "6px",
              display: "flex"
            }}
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18"/>
            </svg>
          </button>
          <div style={{ fontSize: "14px", fontWeight: "600", color: "#f0f2f8" }}>RAG AI Platform</div>
        </div>

        <ChatWindow uploadedFile={uploadedFile} />
      </div>

    </div>
  )
}

export default App