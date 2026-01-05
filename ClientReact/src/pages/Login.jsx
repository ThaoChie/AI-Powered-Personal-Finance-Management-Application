import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

const Login = ({ onLoginSuccess }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '' // For registration
    });
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const endpoint = isLoginView ? '/api/auth/login' : '/api/auth/register';
        const payload = isLoginView 
            ? { email: formData.email, password: formData.password } 
            : { name: formData.name, email: formData.email, password: formData.password };
        
        try {
            const response = await axios.post(endpoint, payload);
            if (response.data && response.data.token) {
                localStorage.setItem('token', response.data.token);
                onLoginSuccess();
                navigate('/');
            } else {
                // Handle registration success (if no token is returned)
                Swal.fire({
                    icon: 'success',
                    title: 'Đăng ký thành công!',
                    text: 'Vui lòng đăng nhập để tiếp tục.',
                    timer: 2000,
                    showConfirmButton: false
                });
                setIsLoginView(true); // Switch to login view after registration
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.';
            Swal.fire({
                icon: 'error',
                title: isLoginView ? 'Đăng nhập thất bại' : 'Đăng ký thất bại',
                text: errorMessage
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div 
            className="min-vh-100 d-flex align-items-center justify-content-center bg-gradient-primary p-3"
        >
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-12 col-md-8 col-lg-5">
                        <div className="card shadow-lg border-0 rounded-4">
                            <div className="card-body p-4 p-lg-5">
                                
                                <div className="text-center mb-4">
                                    <i className="fa-solid fa-piggy-bank fa-3x text-gradient-primary mb-2"></i>
                                    <h3 className="fw-bold text-gradient-primary">FinanceJar</h3>
                                    <p className="text-muted">
                                        {isLoginView ? 'Chào mừng trở lại!' : 'Tạo tài khoản mới'}
                                    </p>
                                </div>
                                
                                <form onSubmit={handleSubmit}>
                                    {!isLoginView && (
                                        <div className="form-floating mb-3">
                                            <input
                                                type="text"
                                                className="form-control rounded-3"
                                                id="name"
                                                name="name"
                                                placeholder="Họ và tên"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                required
                                            />
                                            <label htmlFor="name">Họ và tên</label>
                                        </div>
                                    )}

                                    <div className="form-floating mb-3">
                                        <input
                                            type="email"
                                            className="form-control rounded-3"
                                            id="email"
                                            name="email"
                                            placeholder="name@example.com"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            required
                                        />
                                        <label htmlFor="email">Địa chỉ Email</label>
                                    </div>

                                    <div className="form-floating mb-3">
                                        <input
                                            type="password"
                                            className="form-control rounded-3"
                                            id="password"
                                            name="password"
                                            placeholder="Mật khẩu"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            required
                                        />
                                        <label htmlFor="password">Mật khẩu</label>
                                    </div>

                                    {isLoginView && (
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <div className="form-check">
                                                <input className="form-check-input" type="checkbox" value="" id="rememberMe" />
                                                <label className="form-check-label" htmlFor="rememberMe">
                                                    Ghi nhớ tôi
                                                </label>
                                            </div>
                                            <a href="#" className="small text-decoration-none">Quên mật khẩu?</a>
                                        </div>
                                    )}

                                    <div className="d-grid">
                                        <button 
                                            className="btn btn-primary btn-lg fw-bold bg-gradient-primary border-0 rounded-3" 
                                            type="submit"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                            ) : (
                                                isLoginView ? 'Đăng Nhập' : 'Đăng Ký'
                                            )}
                                        </button>
                                    </div>
                                </form>

                                <div className="text-center mt-4">
                                    <p className="text-muted">
                                        {isLoginView ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
                                        <button 
                                            className="btn btn-link text-decoration-none fw-bold p-0 ms-1"
                                            onClick={() => setIsLoginView(!isLoginView)}
                                        >
                                            {isLoginView ? 'Đăng ký ngay' : 'Đăng nhập'}
                                        </button>
                                    </p>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
