import axios from "axios";

// Talks to the real backend now (see server/index.js). In dev, requests to
// relative /api/... paths are proxied to it by vite.config.js, so this needs
// no base URL locally. In production, point VITE_BASE_URL at wherever the
// Node server is actually deployed — see README.md.
const api = axios.create({
    baseURL: import.meta.env.VITE_BASE_URL || "",
    withCredentials: true,
});

export default api;
