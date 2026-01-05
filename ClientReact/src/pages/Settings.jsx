import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Settings = () => {
    // --- STATE CHO THÔNG TIN CÁ NHÂN ---
    const [profile, setProfile] = useState({
        fullName: '',
        email: ''
    });

    // --- STATE CHO ĐỔI MẬT KHẨU ---
    const [passwords, setPasswords] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [isLoading, setIsLoading] = useState(false);

    // 1. Load thông tin khi vào trang
    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            // Gọi API lấy thông tin mới nhất
            const res = await axios.get('/api/Auth/profile');
            setProfile({
                fullName: res.data.fullName || '',
                email: res.data.email || ''
            });
        } catch (err) {
            console.error("Lỗi load profile:", err);
            // Nếu lỗi thì lấy tạm từ localStorage
            const stored = JSON.parse(localStorage.getItem('user'));
            if (stored) {
                setProfile({ fullName: stored.fullName || '', email: stored.email || '' });
            }
        }
    };

    // 2. Xử lý Cập nhật thông tin (Tên)
    const handleUpdateProfile = async () => {
        if (!profile.fullName.trim()) return alert("Tên không được để trống!");
        
        setIsLoading(true);
        try {
            const res = await axios.put('/api/Auth/update-profile', {
                fullName: profile.fullName
            });
            
            alert("✅ " + res.data.message);
            
            // Cập nhật lại localStorage để Sidebar hiển thị đúng tên mới ngay lập tức
            const currentUser = JSON.parse(localStorage.getItem('user')) || {};
            currentUser.fullName = profile.fullName;
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            // Reload trang để Sidebar cập nhật (hoặc dùng Context nếu muốn mượt hơn)
            window.location.reload(); 

        } catch (err) {
            alert("❌ Lỗi: " + (err.response?.data || err.message));
        } finally {
            setIsLoading(false);
        }
    };

    // 3. Xử lý Đổi mật khẩu
    const handleChangePassword = async () => {
        const { oldPassword, newPassword, confirmPassword } = passwords;

        if (!oldPassword || !newPassword || !confirmPassword) {
            return alert("Vui lòng nhập đầy đủ các trường mật khẩu!");
        }
        if (newPassword !== confirmPassword) {
            return alert("Mật khẩu mới không khớp!");
        }
        if (newPassword.length < 6) {
            return alert("Mật khẩu mới phải có ít nhất 6 ký tự!");
        }

        setIsLoading(true);
        try {
            const res = await axios.post('/api/Auth/change-password', {
                oldPassword: oldPassword,
                newPassword: newPassword
            });

            alert("✅ " + res.data.message);
            // Reset form mật khẩu
            setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });

        } catch (err) {
            alert("❌ Lỗi: " + (err.response?.data || err.message));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container-fluid py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <h2 className="fw-bold mb-2 text-dark">Cài đặt Tài khoản</h2>
            <p className="text-muted mb-4">Quản lý thông tin cá nhân và bảo mật của bạn.</p>
            
            <div className="row g-4">
                {/* --- CỘT TRÁI: THÔNG TIN CÁ NHÂN --- */}
                <div className="col-lg-6">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-header bg-white border-0 pt-4 px-4">
                            <h5 className="fw-bold text-dark">Thông tin cá nhân</h5>
                        </div>
                        <div className="card-body p-4">
                            <div className="mb-3">
                                <label className="form-label fw-bold text-secondary small">Họ và tên</label>
                                <input 
                                    type="text" 
                                    className="form-control bg-light" 
                                    value={profile.fullName} 
                                    onChange={(e) => setProfile({...profile, fullName: e.target.value})}
                                    placeholder="Nhập tên hiển thị..." 
                                />
                            </div>

                            <div className="mb-4">
                                <label className="form-label fw-bold text-secondary small">Địa chỉ Email (Không thể thay đổi)</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={profile.email} 
                                    disabled 
                                    style={{backgroundColor: '#e9ecef', cursor: 'not-allowed'}} 
                                />
                            </div>

                            <button 
                                className="btn btn-primary fw-bold px-4 rounded-pill shadow-sm"
                                onClick={handleUpdateProfile}
                                disabled={isLoading}
                                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}
                            >
                                {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- CỘT PHẢI: ĐỔI MẬT KHẨU --- */}
                <div className="col-lg-6">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-header bg-white border-0 pt-4 px-4">
                            <h5 className="fw-bold text-dark">Thay đổi mật khẩu</h5>
                        </div>
                        <div className="card-body p-4">
                            <div className="mb-3">
                                <label className="form-label fw-bold text-secondary small">Mật khẩu cũ</label>
                                <input 
                                    type="password" 
                                    className="form-control bg-light" 
                                    value={passwords.oldPassword}
                                    onChange={(e) => setPasswords({...passwords, oldPassword: e.target.value})}
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label fw-bold text-secondary small">Mật khẩu mới</label>
                                <input 
                                    type="password" 
                                    className="form-control bg-light" 
                                    value={passwords.newPassword}
                                    onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})}
                                />
                            </div>
                            <div className="mb-4">
                                <label className="form-label fw-bold text-secondary small">Xác nhận mật khẩu mới</label>
                                <input 
                                    type="password" 
                                    className="form-control bg-light" 
                                    value={passwords.confirmPassword}
                                    onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})}
                                />
                            </div>

                            <button 
                                className="btn btn-warning text-white fw-bold px-4 rounded-pill shadow-sm"
                                onClick={handleChangePassword}
                                disabled={isLoading}
                                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}
                            >
                                {isLoading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;