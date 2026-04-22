import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.atelier.d3tech.com.br/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar o token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor para tratar erros de resposta
api.interceptors.response.use((response) => {
  return response;
}, (error) => {
  const status = error.response?.status;
  const errorCode = error.response?.data?.code;

  // Só deslogamos se for realmente um erro de autenticação (Token inválido ou expirado)
  // Ignoramos erros 503 (Banco fora) ou códigos de erro de conexão
  if (status === 401 && errorCode !== 'DB_CONNECTION_ERROR') {
    console.warn('⚠️ Sessão finalizada: redirecionando para login.');
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  
  return Promise.reject(error);
});

export default api;
