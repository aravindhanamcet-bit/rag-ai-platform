import { useState, useRef } from "react"
import api from "../api/api"

export default function UploadPanel({ onUploadSuccess }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
  const inputRef = useRef()

  const handleFile = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported.")
      return
    }

    setError("")
    setUploading(true)
    setProgress(10)

    const formData = new FormData()
    formData.append("file", file)

    try {
      // Simulate progress
      const interval = setInterval(() => {
        setProgress(p => Math.min(p + 15, 85))
      }, 300)

      await api.post("/upload", formData)

      clearInterval(interval)
      setProgress(100)

      setTimeout(() => {
        setUploading(false)
        setProgress(0)
        onUploadSuccess(file.name)
      }, 600)

    } catch (err) {
      setError("Upload failed. Try again.")
      setUploading(false)
      setProgress(0)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  const onInputChange = (e) => {
    const file = e.target.files[0]
    handleFile(file)
    e.target.value = ""
  }

  return (
    <div>
      <div style={{
        fontSize: "11px",
        fontWeight: "600",
        color: "#6b7280",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: "12px"
      }}>
        Upload Document
      </div>

      {/* Drop Zone */}
      <div
        onClick={() => !uploading && inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          border: `1.5px dashed ${dragging ? "#6366f1" : uploading ? "#6366f1" : "#2a3248"}`,
          borderRadius: "10px",
          padding: "20px 16px",
          textAlign: "center",
          cursor: uploading ? "default" : "pointer",
          background: dragging ? "#1a1f35" : "transparent",
          transition: "all 0.2s",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          onChange={onInputChange}
          style={{ display: "none" }}
        />

        {uploading ? (
          <div>
            <div style={{ fontSize: "13px", color: "#a5b4fc", marginBottom: "10px" }}>
              Processing PDF...
            </div>
            <div style={{
              background: "#1e2535", borderRadius: "99px", height: "4px", overflow: "hidden"
            }}>
              <div style={{
                height: "100%",
                width: `${progress}%`,
                background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                borderRadius: "99px",
                transition: "width 0.3s ease"
              }} />
            </div>
            <div style={{ fontSize: "11px", color: "#4b5563", marginTop: "8px" }}>{progress}%</div>
          </div>
        ) : (
          <div>
            <div style={{
              width: "36px", height: "36px", borderRadius: "8px",
              background: "#1e2535",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 10px"
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "4px" }}>
              Drop PDF here or <span style={{ color: "#818cf8" }}>browse</span>
            </div>
            <div style={{ fontSize: "11px", color: "#4b5563" }}>PDF files only</div>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          marginTop: "8px", padding: "8px 12px",
          background: "#2d1b1b", borderRadius: "6px",
          fontSize: "12px", color: "#f87171",
          border: "1px solid #3d2020"
        }}>
          {error}
        </div>
      )}
    </div>
  )
}