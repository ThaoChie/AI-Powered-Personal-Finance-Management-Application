import React, { useEffect, useState } from 'react';
import axios from 'axios';
import TransactionModal from '../components/TransactionModal'; 
import JarModal from '../components/JarModal'; 

const Jars = () => {
    const [jars, setJars] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // State Popup
    const [selectedJar, setSelectedJar] = useState(null); 
    const [showTransModal, setShowTransModal] = useState(false); 
    const [showJarModal, setShowJarModal] = useState(false);     

    const fetchData = () => {
        axios.get('/api/Jars')
            .then(res => {
                setJars(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchData();
    }, []);

    const calculateDailyBudget = (balance) => {
        if (balance <= 0) return 0;
        const now = new Date();
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        let remainingDays = lastDayOfMonth - now.getDate() + 1;
        if (remainingDays <= 0) remainingDays = 1;
        return balance / remainingDays;
    };

    const handleTransModal = (jar) => {
        setSelectedJar(jar);
        setShowTransModal(true);
    };

    const handleEditJar = (jar) => {
        setSelectedJar(jar);
        setShowJarModal(true);
    };

    const handleCreateJar = () => {
        setSelectedJar(null); 
        setShowJarModal(true);
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

    if (loading) return <div className="p-5 text-center">Đang tải danh sách hũ...</div>;

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold text-dark mb-1">Quản lý Hũ Chi Tiêu</h2>
                    <p className="text-muted">Chia tiền của bạn vào 6 chiếc hũ thông minh.</p>
                </div>
                <button className="btn btn-primary shadow-sm fw-bold rounded-pill px-4" onClick={handleCreateJar}>
                    <i className="fa fa-plus me-2"></i> Tạo Hũ Mới
                </button>
            </div>

            <div className="row g-4">
                {jars.map((jar) => {
                    const dailyBudget = calculateDailyBudget(jar.balance);
                    
                    // 👇👇👇 CÔNG THỨC TÍNH PHẦN TRĂM TIẾN ĐỘ 👇👇👇
                    let progressPercent = 0;
                    if (jar.goal > 0) {
                        progressPercent = (jar.balance / jar.goal) * 100;
                    }
                    // Giới hạn hiển thị tối đa 100% để không bị vỡ giao diện
                    const visualPercent = Math.min(progressPercent, 100); 

                    return (
                        <div className="col-md-6 col-lg-4" key={jar.id}>
                            <div className="card h-100 border-0 shadow-sm rounded-4 card-hover">
                                <div className="card-body p-4 d-flex flex-column">
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div>
                                            <span className="badge bg-primary bg-opacity-10 text-primary mb-2 rounded-pill px-3">
                                                {jar.percent || 0}% phân bổ
                                            </span>
                                            <h5 className="fw-bold text-dark mb-0">{jar.name}</h5>
                                        </div>
                                        <button 
                                            className="btn btn-light btn-sm rounded-circle shadow-sm" 
                                            style={{width:'32px', height:'32px'}}
                                            onClick={() => handleEditJar(jar)}
                                        >
                                            <i className="fa fa-pen text-secondary" style={{fontSize: '12px'}}></i>
                                        </button>
                                    </div>

                                    <h3 className="fw-bold text-primary mb-3">
                                        {formatCurrency(jar.balance)}
                                    </h3>

                                    {/* 👇 THANH TIẾN ĐỘ ĐÃ SỬA 👇 */}
                                    <div className="progress mb-2" style={{ height: '6px', borderRadius: '10px' }}>
                                        <div 
                                            className="progress-bar bg-primary" 
                                            role="progressbar" 
                                            style={{ width: `${visualPercent}%`, transition: 'width 0.5s ease' }} 
                                            aria-valuenow={visualPercent} 
                                            aria-valuemin="0" 
                                            aria-valuemax="100"
                                        ></div>
                                    </div>

                                    <div className="d-flex justify-content-between small text-muted mb-3">
                                        <span>Đã có: {progressPercent.toFixed(0)}%</span>
                                        <span>Mục tiêu: {jar.goal > 0 ? formatCurrency(jar.goal) : 'N/A'}</span>
                                    </div>

                                    <div className="bg-light p-3 rounded-3 mb-4 d-flex align-items-center justify-content-between">
                                        <div className="d-flex align-items-center gap-2">
                                            <i className="fa fa-calendar-day text-success"></i>
                                            <span className="small fw-bold text-secondary">Mức chi/ngày:</span>
                                        </div>
                                        <span className="fw-bold text-success">{formatCurrency(dailyBudget)}</span>
                                    </div>

                                    <div className="mt-auto">
                                        <button 
                                            className="btn btn-outline-primary w-100 rounded-pill fw-bold py-2"
                                            onClick={() => handleTransModal(jar)}
                                        >
                                            <i className="fa fa-exchange-alt me-2"></i> Thêm / Rút tiền
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {showTransModal && selectedJar && (
                <TransactionModal 
                    jar={selectedJar} 
                    onClose={() => setShowTransModal(false)}
                    onSuccess={() => {
                        setShowTransModal(false);
                        fetchData();
                    }}
                />
            )}

            {showJarModal && (
                <JarModal 
                    jar={selectedJar} 
                    onClose={() => setShowJarModal(false)}
                    onSuccess={() => {
                        setShowJarModal(false);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
};

export default Jars;