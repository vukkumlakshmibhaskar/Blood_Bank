import axios from 'axios';
import { toast } from 'react-toastify';

// Create a new Axios instance with a base URL
const apiClient = axios.create({
    baseURL: '/api' // All requests will be prefixed with /api
});

// --- THE CRITICAL INTERCEPTOR ---
// This interceptor will run for every response we receive from the API.
apiClient.interceptors.response.use(
    (response) => {
        // If the response is successful (e.g., status 200), just return it.
        return response;
    }, 
    (error) => {
        // If the server responds with an error
        if (error.response) {
            const { status } = error.response;

            // Specifically check for a 401 Unauthorized error
            if (status === 401) {
                // This means the user's token is invalid or expired.
                toast.error("Your session has expired. Please log in again.");

                // 1. Remove the invalid user data and token from localStorage.
                localStorage.removeItem('token');
                localStorage.removeItem('user');

                // 2. Redirect the user to the login page after a short delay for the toast to be seen.
                //    Using window.location.href ensures a full page refresh, clearing all component state.
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1500);
            }
        }

        // For all other errors, just pass them along so component-level .catch() can handle them.
        return Promise.reject(error);
    }
);

// Add an interceptor to include the auth token in every request
apiClient.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});


export default apiClient;