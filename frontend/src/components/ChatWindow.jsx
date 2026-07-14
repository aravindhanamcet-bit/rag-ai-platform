import { useState, useRef, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import api from "../api/api"

const SUGGESTIONS = [
  "What is this document about?",
  "Summarize the key points",
  "What are the main skills listed?",
  "What is the person's educational background?",
]

export default function ChatWindow({ uploadedFile }) {
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()
  const inputRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const askQuestion = async (q) => {
    const text = q || question
    if (!text.trim() || loading) return

    const userMsg = { role: "user", content: text }
    setMessages(prev => [...prev, userMsg])
    setQuestion("")
    setLoading(true)

    try {
      const res = await api.post("/chat", { question: text })
      const aiMsg = { role: "ai", content: res.data.answer }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      setMessages(prev => [...prev, { role: "ai", content: "Something went wrong. Please try again." }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      askQuestion()
    }
  }

  const clearChat = () => setMessages([])

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0f1117" }}>

      {/* Header */}
      <div style={{
        padding: "16px 24px",
        borderBottom: "1px solid #1e2535",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#161b27"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "8px", height: "8px", borderRadius: "50%",
            background: uploadedFile ? "#22c55e" : "#4b5563"
          }} />
          <div>
            <div style={{ fontSize: "14px", fontWeight: "500", color: "#f0f2f8" }}>
              {uploadedFile ? uploadedFile : "No document loaded"}
            </div>
            <div style={{ fontSize: "11px", color: "#4b5563" }}>
              {uploadedFile ? "Ready to answer questions" : "Upload a PDF to start chatting"}
            </div>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={clearChat}
            style={{
              background: "transparent",
              border: "1px solid #1e2535",
              color: "#6b7280",
              padding: "5px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: "5px"
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
            </svg>
            Clear chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px"
      }}>

        {/* Empty State */}
        {messages.length === 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "24px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: "56px", height: "56px", borderRadius: "16px",
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px"
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div style={{ fontSize: "18px", fontWeight: "600", color: "#f0f2f8", marginBottom: "8px" }}>
                Ask anything about your document
              </div>
              <div style={{ fontSize: "13px", color: "#6b7280", maxWidth: "340px" }}>
                {uploadedFile
                  ? `"${uploadedFile}" is loaded. Ask a question below.`
                  : "Upload a PDF first, then ask questions about its content."}
              </div>
            </div>

            {/* Suggestion chips */}
            {uploadedFile && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", maxWidth: "520px" }}>
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => askQuestion(s)}
                    style={{
                      background: "#161b27",
                      border: "1px solid #1e2535",
                      color: "#a5b4fc",
                      padding: "7px 14px",
                      borderRadius: "99px",
                      fontSize: "12px",
                      cursor: "pointer",
                      transition: "all 0.15s"
                    }}
                    onMouseEnter={e => e.target.style.borderColor = "#4f46e5"}
                    onMouseLeave={e => e.target.style.borderColor = "#1e2535"}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              gap: "10px",
              alignItems: "flex-start"
            }}
          >
            {/* AI Avatar */}
            {msg.role === "ai" && (
              <div style={{
                width: "28px", height: "28px", borderRadius: "8px",
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, marginTop: "2px"
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                </svg>
              </div>
            )}

            {/* Message Bubble */}
            <div style={{
              maxWidth: "68%",
              padding: "12px 16px",
              borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: msg.role === "user"
                ? "linear-gradient(135deg, #4f46e5, #6d28d9)"
                : "#161b27",
              border: msg.role === "ai" ? "1px solid #1e2535" : "none",
              fontSize: "14px",
              lineHeight: "1.65",
              color: "#e2e8f0",
              wordBreak: "break-word"
            }}>
              {msg.role === "ai" ? (
                <div style={{
                  color: "#e2e8f0",
                  fontSize: "14px",
                  lineHeight: "1.7"
                }}>
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => (
                        <p style={{ margin: "0 0 10px", lastChild: { margin: 0 } }}>{children}</p>
                      ),
                      strong: ({ children }) => (
                        <strong style={{ color: "#a5b4fc", fontWeight: "600" }}>{children}</strong>
                      ),
                      ul: ({ children }) => (
                        <ul style={{ paddingLeft: "18px", margin: "6px 0" }}>{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol style={{ paddingLeft: "18px", margin: "6px 0" }}>{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li style={{ marginBottom: "4px" }}>{children}</li>
                      ),
                      code: ({ children }) => (
                        <code style={{
                          background: "#0f1117",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          color: "#818cf8",
                          fontFamily: "monospace"
                        }}>{children}</code>
                      ),
                      h1: ({ children }) => (
                        <h1 style={{ fontSize: "16px", fontWeight: "600", color: "#f0f2f8", margin: "0 0 8px" }}>{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 style={{ fontSize: "15px", fontWeight: "600", color: "#f0f2f8", margin: "0 0 6px" }}>{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#f0f2f8", margin: "0 0 6px" }}>{children}</h3>
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "8px",
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              </svg>
            </div>
            <div style={{
              padding: "14px 18px",
              background: "#161b27",
              border: "1px solid #1e2535",
              borderRadius: "16px 16px 16px 4px",
              display: "flex", gap: "5px", alignItems: "center"
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: "6px", height: "6px", borderRadius: "50%",
                  background: "#6366f1",
                  animation: "bounce 1.2s ease-in-out infinite",
                  animationDelay: `${i * 0.2}s`
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: "16px 24px 20px",
        borderTop: "1px solid #1e2535",
        background: "#161b27"
      }}>
        <div style={{
          display: "flex",
          gap: "10px",
          background: "#0f1117",
          border: "1px solid #2a3248",
          borderRadius: "12px",
          padding: "8px 8px 8px 16px",
          alignItems: "flex-end"
        }}>
          <textarea
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your document..."
            rows={1}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#e2e8f0",
              fontSize: "14px",
              resize: "none",
              lineHeight: "1.5",
              padding: "6px 0",
              fontFamily: "inherit",
              maxHeight: "120px",
              overflowY: "auto"
            }}
            onInput={(e) => {
              e.target.style.height = "auto"
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"
            }}
          />
          <button
            onClick={() => askQuestion()}
            disabled={!question.trim() || loading}
            style={{
              width: "36px", height: "36px",
              borderRadius: "8px",
              background: question.trim() && !loading
                ? "linear-gradient(135deg, #4f46e5, #6d28d9)"
                : "#1e2535",
              border: "none",
              cursor: question.trim() && !loading ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
              flexShrink: 0
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <div style={{ textAlign: "center", marginTop: "8px", fontSize: "11px", color: "#374151" }}>
          Press Enter to send · Shift+Enter for new line
        </div>
      </div>

      {/* Bounce animation */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}