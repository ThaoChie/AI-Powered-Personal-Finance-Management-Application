import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

const Settings = () => {
    // --- STATE ---
    const [profileData, setProfileData] = useState({ name: '', email: '' });
    const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [isProfileLoading, setIsProfileLoading] = useState(false);
    const [isPasswordLoading, setIsPasswordLoading] = useState(false);

    // --- DATA FETCHING ---
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await axios.get('http://localhost:8080/api/auth/profile');
                if (response.data) {
                    setProfileData({
                        name: response.data.name,
                        email: response.data.email
                    });
                }
            } catch (error) {
                console.error("Lỗi tải thông tin cá nhân:", error);
                Swal.fire('Lỗi', 'Không thể tải thông tin cá nhân.', 'error');
            }
        };
        fetchProfile();
    }, []);

    // --- HANDLERS ---
    const handleProfileChange = (e) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = (e) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setIsProfileLoading(true);
        try {
            await axios.put('http://localhost:8080/api/auth/profile', profileData);
            Swal.fire('Thành công', 'Thông tin cá nhân đã được cập nhật.', 'success');
        } catch (error) {
            Swal.fire('Lỗi', error.response?.data?.message || 'Không thể cập nhật thông tin.', 'error');
        } finally {
            setIsProfileLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            Swal.fire('Lỗi', 'Mật khẩu mới không khớp.', 'warning');
            return;
        }
        setIsPasswordLoading(true);
        try {
            await axios.put('http://localhost:8080/api/auth/password', {
                oldPassword: passwordData.oldPassword,
                newPassword: passwordData.newPassword
            });
            Swal.fire('Thành công', 'Mật khẩu đã được thay đổi.', 'success');
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' }); // Reset fields
        } catch (error) {
            Swal.fire('Lỗi', error.response?.data?.message || 'Không thể thay đổi mật khẩu.', 'error');
        } finally {
            setIsPasswordLoading(false);
        }
    };

    return (
        <div className="container-fluid">
            {/* 1. Header */}
            <header className="mb-4">
                <h2 className="fw-bold mb-0">Cài đặt Tài khoản</h2>
                <p className="text-muted">Quản lý thông tin cá nhân và bảo mật của bạn.</p>
            </header>

            <div className="row g-4">
                {/* --- LEFT COLUMN: PERSONAL INFO --- */}
                <div className="col-lg-6">
                    <div className="card h-100 rounded-4 shadow-sm border-0">
                        <div className="card-header bg-white border-0 pt-4 px-4">
                            <h5 className="fw-bold mb-0">Thông tin cá nhân</h5>
                        </div>
                        <div className="card-body p-4">
                            <form onSubmit={handleProfileSubmit}>
                                <div className="form-floating mb-3">
                                    <input type="text" className="form-control rounded-3" id="name" name="name" placeholder="Họ và tên" value={profileData.name} onChange={handleProfileChange} />
                                    <label htmlFor="name">Họ và tên</label>
                                </div>
                                <div className="form-floating mb-3">
                                    <input type="email" className="form-control rounded-3" id="email" name="email" placeholder="Email" value={profileData.email} onChange={handleProfileChange} readOnly disabled />
                                    <label htmlFor="email">Địa chỉ Email (Không thể thay đổi)</label>
                                </div>
                                <button type="submit" className="btn btn-primary bg-gradient-primary border-0 rounded-pill px-4" disabled={isProfileLoading}>
                                    {isProfileLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* --- RIGHT COLUMN: CHANGE PASSWORD --- */}
                <div className="col-lg-6">
                     <div className="card h-100 rounded-4 shadow-sm border-0">
                        <div className="card-header bg-white border-0 pt-4 px-4">
                            <h5 className="fw-bold mb-0">Thay đổi mật khẩu</h5>
                        </div>
                        <div className="card-body p-4">
                             <form onSubmit={handlePasswordSubmit}>
                                <div className="form-floating mb-3">
                                    <input type="password" name="oldPassword" className="form-control rounded-3" id="oldPassword" placeholder="Mật khẩu cũ" value={passwordData.oldPassword} onChange={handlePasswordChange} required />
                                    <label htmlFor="oldPassword">Mật khẩu cũ</label>
                                </div>
                                <div className="form-floating mb-3">
                                    <input type="password" name="newPassword" className="form-control rounded-3" id="newPassword" placeholder="Mật khẩu mới" value={passwordData.newPassword} onChange={handlePasswordChange} required />
                                    <label htmlFor="newPassword">Mật khẩu mới</label>
                                </div>
                                 <div className="form-floating mb-3">
                                    <input type="password" name="confirmPassword" className="form-control rounded-3" id="confirmPassword" placeholder="Xác nhận mật khẩu" value={passwordData.confirmPassword} onChange={handlePasswordChange} required />
                                    <label htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
                                </div>
                                <button type="submit" className="btn btn-primary bg-gradient-primary border-0 rounded-pill px-4" disabled={isPasswordLoading}>
                                    {isPasswordLoading ? 'Đang lưu...' : 'Đổi mật khẩu'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
