import React, { useState } from 'react';
import axios from 'axios';

const TransactionModal = ({ jar, onClose, onSuccess }) => {
    // jar: Object chứa thông tin hũ được truyền từ trang cha
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('expense'); // 'expense' (Rút/Chi) hoặc 'income' (Thêm/Nạp)
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAmountChange = (e) => {
        let val = e.target.value.replace(/,/g, '');
        if (!isNaN(val)) {
            setAmount(new Intl.NumberFormat('en-US').format(val));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || !description) return alert("Vui lòng nhập đủ thông tin!");

        setIsSubmitting(true);
        try {
            let rawAmount = parseFloat(amount.replace(/,/g, ''));
            // Nếu là Chi tiêu -> Số Âm. Nếu Thu nhập -> Số Dương.
            const finalAmount = type === 'expense' ? -Math.abs(rawAmount) : Math.abs(rawAmount);

            const payload = {
                description: description,
                amount: finalAmount,
                date: new Date().toISOString(),
                jarId: jar.id // Lấy ID từ hũ được chọn
            };

            await axios.post('/api/Transactions', payload);
            alert("✅ Giao dịch thành công!");
            onSuccess(); // Gọi hàm reset data ở trang cha
        } catch (err) {
            alert("❌ Lỗi: " + (err.response?.data || err.message));
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content shadow-lg border-0 rounded-4">
                    
                    {/* Header: Đổi màu theo loại giao dịch */}
                    <div className={`modal-header border-0 text-white rounded-top-4 ${type === 'income' ? 'bg-success' : 'bg-danger'}`}>
                        <div>
                            <h5 className="modal-title fw-bold mb-0">
                                {type === 'income' ? 'Nạp tiền vào hũ' : 'Rút tiền / Chi tiêu'}
                            </h5>
                            <small className="opacity-75">Hũ: {jar.name}</small>
                        </div>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>

                    <div className="modal-body p-4">
                        <form onSubmit={handleSubmit}>
                            {/* Switcher */}
                            <div className="d-flex bg-light p-1 rounded-pill mb-4 border">
                                <button type="button" 
                                    className={`btn flex-fill rounded-pill fw-bold ${type === 'income' ? 'btn-success shadow-sm' : 'text-muted'}`} 
                                    onClick={() => setType('income')}>
                                    <i className="fa fa-arrow-down me-2"></i> Nạp thêm
                                </button>
                                <button type="button" 
                                    className={`btn flex-fill rounded-pill fw-bold ${type === 'expense' ? 'btn-danger shadow-sm' : 'text-muted'}`} 
                                    onClick={() => setType('expense')}>
                                    <i className="fa fa-arrow-up me-2"></i> Rút / Chi
                                </button>
                            </div>

                            <div className="mb-3">
                                <label className="fw-bold small text-muted mb-1">Số tiền (VNĐ)</label>
                                <input 
                                    type="text" 
                                    className={`form-control form-control-lg fw-bold ${type === 'income' ? 'text-success' : 'text-danger'}`} 
                                    placeholder="0" 
                                    value={amount} 
                                    onChange={handleAmountChange} 
                                    autoFocus 
                                />
                            </div>

                            <div className="mb-4">
                                <label className="fw-bold small text-muted mb-1">Mô tả</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    placeholder={type === 'income' ? "VD: Phân bổ lương..." : "VD: Mua sắm, Đổ xăng..."}
                                    value={description} 
                                    onChange={e => setDescription(e.target.value)} 
                                />
                            </div>

                            <button disabled={isSubmitting} type="submit" className={`btn w-100 py-3 rounded-3 fw-bold text-white ${type === 'income' ? 'btn-success' : 'btn-danger'}`}>
                                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransactionModal;