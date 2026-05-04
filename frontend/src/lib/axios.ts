import axios, { InternalAxiosRequestConfig } from "axios";

// NEXT_PUBLIC_API_URL must be the server ROOT (no /api). Example: http://localhost:4000
const BASE_URL: string = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");

const api = axios.create({
    baseURL: `${BASE_URL}/api`,
    withCredentials: true,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

export default api;
export { BASE_URL };
