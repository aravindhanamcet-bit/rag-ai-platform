import { useEffect, useState } from "react"
import api from "../api/api"

export default function FileList({ refreshKey, uploadedFile }) {
  const [files, setFiles] = useState([])

  const fetchFiles = async () => {
    try {
      const res = await api.get("/files")
      setFiles(res.data.files || [])
    } catch (e) {
      setFiles([])
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [refreshKey])

  const formatTime = (iso) => {
    if (!iso) return ""
    try {
      return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } catch {
      return ""
    }
  }

  const getStatusColor = (status) => {
    if (status === "completed") return { bg: "#0d2818", color: "#4ade80", dot: "#22c55e" }
    if (status === "pending") return { bg: "#1a1a0d", color: "#fbbf24", dot: "#f59e0b" }
    if (status === "failed") return { bg: "#2d1b1b", color: "#f87171", dot: "#ef4444" }
    return { bg: "#1e2535", color: "#6b7280", dot: "#4b5563" }
  }

  return (
    <div>
      <div style={{
        fontSize: "11px",
        fontWeight: "600",
        color: "#6b7280",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <span>Documents</span>
        <span style={{
          background: "#1e2535",
          color: "#818cf8",
          padding: "2px 6px",
          borderRadius: "99px",
          fontSize: "10px",
          fontWeight: "500"
        }}>
          {files.length}
        </span>
      </div>

      {files.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "24px 0",
          color: "#374151"
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2a3248" strokeWidth="1.5" style={{ display: "block", margin: "0 auto 8px" }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <div style={{ fontSize: "12px", color: "#374151" }}>No documents yet</div>
          <div style={{ fontSize: "11px", color: "#2a3248", marginTop: "4px" }}>Upload a PDF to get started</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {files.map((file, index) => {
            const status = getStatusColor(file.vector_index_status)
            const isActive = uploadedFile === file.filename

            return (
              <div
                key={index}
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: isActive ? "#1a1f35" : "#1e2535",
                  border: isActive ? "1px solid #3730a3" : "1px solid transparent",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "6px",
                    background: "#0f1117",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "12px",
                      color: "#e2e8f0",
                      fontWeight: "500",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>
                      {file.filename}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: "4px",
                        fontSize: "10px", color: status.color,
                        background: status.bg,
                        padding: "2px 6px", borderRadius: "99px"
                      }}>
                        <span style={{
                          width: "5px", height: "5px", borderRadius: "50%",
                          background: status.dot, display: "inline-block"
                        }} />
                        {file.vector_index_status || "unknown"}
                      </span>
                      {file.upload_time && (
                        <span style={{ fontSize: "10px", color: "#4b5563" }}>
                          {formatTime(file.upload_time)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}