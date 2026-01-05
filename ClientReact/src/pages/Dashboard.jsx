import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

// Đăng ký thành phần biểu đồ
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const Dashboard = () => {
    // --- STATE DỮ LIỆU ---
    const [stats, setStats] = useState({ totalAssets: 0, income: 0, expense: 0 });
    const [jars, setJars] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- STATE BIỂU ĐỒ LINE ---
    const [lineChartData, setLineChartData] = useState({ labels: [], datasets: [] });

    // --- STATE MODAL ---
    const [showModal, setShowModal] = useState(false);
    const [newTrans, setNewTrans] = useState({
        title: '',
        amount: '',
        type: 'expense',
        jarId: ''
    });

    const API_URL = 'http://localhost:8080/api';
    const chartColors = ['#4a90e2', '#50c878', '#e85d75', '#f39c12', '#9b59b6', '#34495e'];

    // 1. LOAD DỮ LIỆU
    const fetchData = async () => {
        try {
            const [jarsRes, transRes] = await Promise.all([
                axios.get(`${API_URL}/Jars`),
                axios.get(`${API_URL}/Transactions`)
            ]);

            const jarsData = jarsRes.data || [];
            const transactions = transRes.data || [];

            setJars(jarsData);
            setRecentTransactions(transactions);

            // Mặc định chọn hũ đầu tiên
            if (jarsData.length > 0) {
                setNewTrans(prev => ({ ...prev, jarId: jarsData[0].id }));
            }

            // Tính toán thống kê
            const totalJarsBalance = jarsData.reduce((acc, jar) => acc + jar.balance, 0);
            const income = transactions.filter(t => t.amount > 0).reduce((acc, cur) => acc + cur.amount, 0);
            const expense = transactions.filter(t => t.amount < 0).reduce((acc, cur) => acc + cur.amount, 0);

            setStats({
                totalAssets: totalJarsBalance,
                income: income,
                expense: Math.abs(expense)
            });

            processLineChart(transactions);

        } catch (err) {
            console.error("Lỗi tải data:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 2. XỬ LÝ BIỂU ĐỒ LINE
    const processLineChart = (transactions) => {
        const dataMap = {}; 
        const sortedTrans = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

        sortedTrans.forEach(t => {
            const date = new Date(t.date).toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' });
            if (!dataMap[date]) dataMap[date] = { income: 0, expense: 0 };
            
            if (t.amount > 0) dataMap[date].income += t.amount;
            else dataMap[date].expense += Math.abs(t.amount);
        });

        const labels = Object.keys(dataMap);
        const incomeData = labels.map(date => dataMap[date].income);
        const expenseData = labels.map(date => dataMap[date].expense);

        setLineChartData({
            labels,
            datasets: [
                {
                    label: 'Thu Nhập',
                    data: incomeData,
                    borderColor: '#10b981', 
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Chi Tiêu',
                    data: expenseData,
                    borderColor: '#ef4444', 
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    tension: 0.4,
                    fill: true
                }
            ]
        });
    };

    // 3. XỬ LÝ BIỂU ĐỒ TRÒN
    const doughnutData = {
        labels: jars.map(j => j.name),
        datasets: [
            {
                data: jars.map(j => j.balance),
                backgroundColor: chartColors,
                borderWidth: 0,
                hoverOffset: 10
            }
        ]
    };

    // 4. XỬ LÝ NHẬP TIỀN (CÓ DẤU PHẨY)
    const handleAmountChange = (e) => {
        // Xóa dấu phẩy cũ để lấy số
        let val = e.target.value.replace(/,/g, '');
        
        // Format lại
        if (!isNaN(val) && val !== '') {
            setNewTrans({ ...newTrans, amount: new Intl.NumberFormat('en-US').format(val) });
        } else if (val === '') {
            setNewTrans({ ...newTrans, amount: '' });
        }
    };

    const handleSaveTransaction = async (e) => {
        e.preventDefault();
        if (!newTrans.amount || !newTrans.title || !newTrans.jarId) {
            return alert("Vui lòng nhập đủ thông tin và chọn Hũ!");
        }

        try {
            // Xóa dấu phẩy trước khi parse số
            let rawAmount = parseFloat(newTrans.amount.replace(/,/g, ''));
            const finalAmount = newTrans.type === 'expense' ? -Math.abs(rawAmount) : Math.abs(rawAmount);

            const payload = {
                description: newTrans.title,
                amount: finalAmount,
                date: new Date().toISOString(),
                jarId: parseInt(newTrans.jarId)
            };

            await axios.post(`${API_URL}/Transactions`, payload);
            alert("✅ Đã lưu giao dịch thành công!");
            
            setShowModal(false);
            setNewTrans({ 
                title: '', 
                amount: '', 
                type: 'expense', 
                jarId: jars.length > 0 ? jars[0].id : '' 
            });
            fetchData(); 
        } catch (err) {
            alert("Lỗi: " + err.message);
        }
    };

    // Helpers
    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('vi-VN') : '';

    return (
        <div className="container-fluid py-4" style={{ minHeight: '100vh' }}>
            
            {/* --- HEADER --- */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold mb-1 text-dark">Tổng quan</h2>
                    <p className="text-muted mb-0">Chào buổi sáng! Đây là bức tranh tài chính của bạn.</p>
                </div>
                <div className="d-flex gap-3">
                    <Link to="/scan" className="btn btn-light text-primary shadow-sm fw-bold d-flex align-items-center gap-2 rounded-3 px-3">
                        <i className="fa fa-qrcode"></i> Quét Hóa Đơn
                    </Link>
                    <button 
                        className="btn text-white shadow-sm fw-bold d-flex align-items-center gap-2 rounded-3 px-3" 
                        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                        onClick={() => setShowModal(true)}
                    >
                        <i className="fa fa-plus"></i> Thêm Giao Dịch
                    </button>
                </div>
            </div>

            {/* --- STATS CARDS --- */}
            <div className="row g-4 mb-4">
                {/* CARD 1: TỔNG SỐ DƯ */}
                <div className="col-md-5">
                    <div className="card border-0 shadow text-white h-100 rounded-4" 
                         style={{ background: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)', overflow: 'hidden' }}>
                        <div className="card-body p-4 d-flex flex-column justify-content-center position-relative">
                            <div style={{position: 'absolute', right: '-20px', top: '-20px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)'}}></div>
                            <div className="d-flex align-items-center gap-2 mb-2 opacity-75">
                                <i className="fa fa-wallet"></i> <span>Tổng Số Dư</span>
                            </div>
                            <h1 className="fw-bold mb-0 display-5">{formatCurrency(stats.totalAssets)}</h1>
                            <small className="opacity-75 mt-2">Tổng tiền trong tất cả các hũ</small>
                        </div>
                    </div>
                </div>

                {/* CARD 2: THU NHẬP */}
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm h-100 rounded-4">
                        <div className="card-body p-4 d-flex flex-column justify-content-center">
                            <div className="d-flex align-items-center gap-2 text-success mb-2">
                                <div className="bg-success bg-opacity-10 p-2 rounded-circle">
                                    <i className="fa fa-arrow-down"></i>
                                </div>
                                <span className="fw-bold">Thu nhập tháng</span>
                            </div>
                            <h3 className="fw-bold text-success mb-0">{formatCurrency(stats.income)}</h3>
                        </div>
                    </div>
                </div>

                {/* CARD 3: CHI TIÊU */}
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100 rounded-4">
                        <div className="card-body p-4 d-flex flex-column justify-content-center">
                            <div className="d-flex align-items-center gap-2 text-danger mb-2">
                                <div className="bg-danger bg-opacity-10 p-2 rounded-circle">
                                    <i className="fa fa-arrow-up"></i>
                                </div>
                                <span className="fw-bold">Chi tiêu tháng</span>
                            </div>
                            <h3 className="fw-bold text-danger mb-0">{formatCurrency(stats.expense)}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CHARTS SECTION --- */}
            <div className="row g-4 mb-4">
                <div className="col-lg-8">
                    <div className="card border-0 shadow-sm h-100 rounded-4">
                        <div className="card-header bg-white border-0 pt-4 px-4">
                            <h6 className="fw-bold mb-0 text-secondary">📊 Biến động Tài chính</h6>
                        </div>
                        <div className="card-body px-4 pb-4">
                            <div style={{ height: '300px', width: '100%' }}>
                                <Line 
                                    data={lineChartData} 
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { position: 'top' } },
                                        scales: {
                                            y: { beginAtZero: true, grid: { borderDash: [5, 5] } },
                                            x: { grid: { display: false } }
                                        }
                                    }} 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-lg-4">
                    <div className="card border-0 shadow-sm h-100 rounded-4">
                        <div className="card-header bg-white border-0 pt-4 px-4">
                            <h6 className="fw-bold mb-0 text-secondary">🍰 Phân Bổ Tài Sản</h6>
                        </div>
                        <div className="card-body d-flex flex-column align-items-center justify-content-center">
                            <div style={{ width: '220px', height: '220px', position: 'relative' }}>
                                <Doughnut 
                                    data={doughnutData} 
                                    options={{
                                        responsive: true,
                                        cutout: '70%',
                                        plugins: { legend: { display: false } }
                                    }} 
                                />
                                <div style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center'}}>
                                    <small className="text-muted">Tổng</small>
                                    <div className="fw-bold">{jars.length} Hũ</div>
                                </div>
                            </div>
                            
                            <div className="mt-4 w-100 overflow-auto" style={{maxHeight: '150px'}}>
                                {jars.map((jar, index) => (
                                    <div key={jar.id} className="d-flex justify-content-between align-items-center mb-2 px-2">
                                        <div className="d-flex align-items-center gap-2">
                                            <span style={{width: '10px', height: '10px', borderRadius: '50%', backgroundColor: chartColors[index % chartColors.length]}}></span>
                                            <span className="small fw-medium text-dark">{jar.name}</span>
                                        </div>
                                        <span className="small fw-bold text-muted">{((jar.balance/stats.totalAssets)*100 || 0).toFixed(0)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- RECENT TRANSACTIONS --- */}
            <div className="card border-0 shadow-sm rounded-4">
                <div className="card-header bg-white border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                    <h6 className="fw-bold mb-0 text-secondary">Giao Dịch Gần Nhất</h6>
                    <Link to="/history" className="btn btn-sm btn-light text-primary fw-bold rounded-pill">Xem tất cả</Link>
                </div>
                <div className="card-body p-4">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th className="border-0 rounded-start">Nội dung</th>
                                    <th className="border-0">Ngày</th>
                                    <th className="border-0 text-end rounded-end">Số tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentTransactions.slice(0, 5).map((tx, idx) => (
                                    <tr key={tx.id || idx}>
                                        <td className="border-0">
                                            <div className="d-flex align-items-center gap-3">
                                                <div className={`rounded-circle d-flex align-items-center justify-content-center ${tx.amount < 0 ? 'bg-danger bg-opacity-10 text-danger' : 'bg-success bg-opacity-10 text-success'}`} style={{width: '40px', height: '40px'}}>
                                                    <i className={`fa ${tx.amount < 0 ? 'fa-shopping-cart' : 'fa-money-bill'}`}></i>
                                                </div>
                                                <span className="fw-bold text-dark">{tx.description}</span>
                                            </div>
                                        </td>
                                        <td className="border-0 text-muted">{formatDate(tx.date)}</td>
                                        <td className={`border-0 text-end fw-bold ${tx.amount < 0 ? 'text-danger' : 'text-success'}`}>
                                            {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                                        </td>
                                    </tr>
                                ))}
                                {recentTransactions.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="text-center py-4 text-muted">Chưa có giao dịch nào</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- MODAL ADD TRANSACTION --- */}
            {showModal && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content shadow-lg border-0 rounded-4">
                            <div className={`modal-header border-0 text-white rounded-top-4 ${newTrans.type === 'income' ? 'bg-success' : 'bg-danger'}`}>
                                <h5 className="modal-title fw-bold">
                                    <i className={`fa ${newTrans.type === 'income' ? 'fa-arrow-down' : 'fa-arrow-up'} me-2`}></i>
                                    {newTrans.type === 'income' ? 'Thêm Thu Nhập' : 'Thêm Chi Tiêu'}
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <form onSubmit={handleSaveTransaction}>
                                    
                                    {/* Type Switcher */}
                                    <div className="d-flex bg-light p-1 rounded-pill mb-4 border">
                                        <button type="button" className={`btn flex-fill rounded-pill fw-bold ${newTrans.type === 'income' ? 'btn-success shadow-sm' : 'text-muted'}`} onClick={() => setNewTrans({...newTrans, type: 'income'})}>Thu Nhập</button>
                                        <button type="button" className={`btn flex-fill rounded-pill fw-bold ${newTrans.type === 'expense' ? 'btn-danger shadow-sm' : 'text-muted'}`} onClick={() => setNewTrans({...newTrans, type: 'expense'})}>Chi Tiêu</button>
                                    </div>

                                    <div className="mb-3">
                                        <label className="fw-bold small text-muted mb-1">Số tiền</label>
                                        {/* 👇 INPUT TIỀN ĐÃ FORMAT DẤU PHẨY */}
                                        <input 
                                            type="text" 
                                            className={`form-control form-control-lg fw-bold ${newTrans.type === 'income' ? 'text-success' : 'text-danger'}`} 
                                            placeholder="0" 
                                            value={newTrans.amount} 
                                            onChange={handleAmountChange} 
                                            autoFocus 
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="fw-bold small text-muted mb-1">Nội dung</label>
                                        <input type="text" className="form-control" placeholder="VD: Lương, Tiền nhà..." value={newTrans.title} onChange={e => setNewTrans({...newTrans, title: e.target.value})} />
                                    </div>

                                    <div className="mb-4">
                                        <label className="fw-bold small text-muted mb-1">Chọn Hũ</label>
                                        <select className="form-select" value={newTrans.jarId} onChange={e => setNewTrans({...newTrans, jarId: e.target.value})}>
                                            {jars.map(jar => (
                                                <option key={jar.id} value={jar.id}>{jar.name} (Dư: {formatCurrency(jar.balance)})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <button type="submit" className={`btn w-100 py-3 rounded-3 fw-bold text-white ${newTrans.type === 'income' ? 'btn-success' : 'btn-danger'}`}>
                                        Xác nhận
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;