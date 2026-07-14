import axios from "axios"

const api = axios.create({
  baseURL: "https://rag-ai-platform.onrender.com"
})

export default api