import axios from "axios";

// Always set NEXT_PUBLIC_API_URL = server root (no /api)
// Example: http://localhost:4000 or https://yourdomain.com
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const api = axios.create({
  baseURL: `${BASE_URL}/api`, // consistently append /api
  withCredentials: true, // usually sockets + APIs need credentials
});

// Attach token automatically
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
