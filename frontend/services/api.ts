// frontend/services/api.ts
import axios from 'axios';

const api = axios.create({
  // Si estás en la misma PC usa localhost
  baseURL: 'http://localhost:4000/api', 
  
  // SOLO SI ESTÁS CON LA TABLET/CELULAR usa tu IP real
  // baseURL: 'http://192.168.1.15:4000/api', 
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;