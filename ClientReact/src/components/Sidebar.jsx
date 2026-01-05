import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Sidebar = () => {
    const navigate = useNavigate();
    
    // State lưu thông tin user
    const [user, setUser] = useState({ username: 'Loading...', email: '' });

    useEffect(() => {
        // Cách 1: Ưu tiên lấy từ LocalStorage cho nhanh (nếu lúc Login đã lưu)
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) {
            setUser(storedUser);
        }

        // Cách 2: Gọi API để lấy thông tin mới nhất (Sửa lỗi 404 profile)
        axios.get('/api/Auth/profile')
            .then(res => {
                setUser(res.data);
                // Cập nhật lại localStorage luôn cho đồng bộ
                localStorage.setItem('user', JSON.stringify(res.data));
            })
            .catch(err => {
                console.log("Không lấy được profile, dùng tạm local storage", err);
            });
    }, []);

    const handleLogout = () => {
        if (window.confirm('Bạn có chắc muốn đăng xuất?')) {
            localStorage.clear();
            navigate('/login');
            window.location.reload();
        }
    };

    // Style cho Link: Active thì tím đậm, nền nhạt
    const getLinkClass = ({ isActive }) => 
        `d-flex align-items-center py-3 px-4 text-decoration-none fw-medium transition-all ${
            isActive 
            ? 'text-primary bg-primary-subtle border-start border-4 border-primary' 
            : 'text-secondary hover-bg-light'
        }`;

    return (
        <div className="bg-white shadow h-100 d-flex flex-column" style={{ width: '260px', position: 'fixed', top: 0, left: 0, zIndex: 1000 }}>
            {/* 1. LOGO AREA */}
            <div className="p-4 d-flex align-items-center gap-3 border-bottom border-light">
                <div className="rounded-3 d-flex align-items-center justify-content-center text-white shadow-sm" 
                     style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <i className="fa fa-university fa-lg"></i>
                </div>
                <div>
                    <h5 className="mb-0 fw-bold" style={{ color: '#5b55e8', fontFamily: 'Inter, sans-serif' }}>FinanceJar</h5>
                </div>
            </div>

            {/* 2. USER INFO (Đã sửa lỗi hiển thị) */}
            <div className="p-3 mx-3 mt-4 mb-2 bg-light rounded-4 d-flex align-items-center gap-3">
                {/* Avatar tự tạo dựa trên chữ cái đầu của tên */}
                <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm" 
                     style={{width: '40px', height: '40px', background: '#ff9966'}}>
                    {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="d-flex flex-column" style={{overflow: 'hidden'}}>
                    <span className="fw-bold text-dark text-truncate" style={{fontSize: '14px'}}>
                        {user.fullName || user.username}
                    </span>
                    <span className="text-success small" style={{fontSize: '11px'}}>
                        <i className="fa fa-circle me-1" style={{fontSize: '8px'}}></i>Online
                    </span>
                </div>
            </div>

            {/* 3. MENU ITEMS */}
            <div className="flex-grow-1 overflow-auto mt-2 py-2">
                <label className="px-4 mb-2 text-uppercase text-muted fw-bold" style={{fontSize: '11px', letterSpacing: '1px'}}>Quản Lý</label>
                
                <NavLink to="/" className={getLinkClass}>
                    <i className="fa fa-chart-pie me-3" style={{width: '20px'}}></i> Tổng quan
                </NavLink>
                <NavLink to="/jars" className={getLinkClass}>
                    <i className="fa fa-wallet me-3" style={{width: '20px'}}></i> Quản lý Hũ
                </NavLink>
                <NavLink to="/history" className={getLinkClass}>
                    <i className="fa fa-history me-3" style={{width: '20px'}}></i> Lịch sử GD
                </NavLink>

                <label className="px-4 mt-4 mb-2 text-uppercase text-muted fw-bold" style={{fontSize: '11px', letterSpacing: '1px'}}>Tiện ích AI</label>
                
                <NavLink to="/scan" className={getLinkClass}>
                    <i className="fa fa-qrcode me-3" style={{width: '20px'}}></i> Quét Hóa Đơn
                </NavLink>
                <NavLink to="/chat" className={getLinkClass}>
                    <i className="fa fa-robot me-3" style={{width: '20px'}}></i> Trợ lý AI
                </NavLink>

                <div className="my-2 border-top mx-4"></div>
                
                <NavLink to="/settings" className={getLinkClass}>
                    <i className="fa fa-cog me-3" style={{width: '20px'}}></i> Cài đặt
                </NavLink>
            </div>

            {/* 4. FOOTER */}
            <div className="p-3 border-top bg-light bg-opacity-50">
                <button onClick={handleLogout} className="btn btn-outline-danger w-100 rounded-pill fw-bold border-0 bg-white shadow-sm text-start ps-3">
                    <i className="fa fa-sign-out-alt me-2"></i> Đăng xuất
                </button>
            </div>
        </div>
    );
};

export default Sidebar;