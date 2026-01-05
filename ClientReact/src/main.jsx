import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';

// --- IMPORT CSS ---
// 1. Bootstrap Core CSS
import 'bootstrap/dist/css/bootstrap.min.css';
// 2. FontAwesome Icons
import '@fortawesome/fontawesome-free/css/all.min.css';
// 3. Global Custom Styles
import './index.css';

import App from './App.jsx';

// =========================================================
// CẤU HÌNH AXIOS TOÀN CỤC (INTERCEPTOR)
// Đoạn này giúp tự động chèn Token vào mọi API bạn gọi
// =========================================================

// Cấu hình đường dẫn gốc của API server
axios.defaults.baseURL = 'http://localhost:8080'; 

// Cấu hình interceptor để tự động gắn token vào header Authorization
axios.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }, 
  error => {
    return Promise.reject(error);
  }
);

// =========================================================
// KHỞI ĐỘNG ỨNG DỤNG REACT
// =========================================================
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
