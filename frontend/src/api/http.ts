import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

const http = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" }
});

// Request interceptor to attach token from localStorage
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default http;
