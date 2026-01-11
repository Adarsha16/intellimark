import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000',
    // INCREASE TIMEOUT to 2 minutes (120000ms) for AI tasks
    timeout: 120000,
});

// Request Interceptor (Keep your existing token logic)
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor (Optional: Better error logging)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.code === 'ECONNABORTED') {
            console.error("Request timed out! The AI took too long.");
        }
        return Promise.reject(error);
    }
);

export default api;