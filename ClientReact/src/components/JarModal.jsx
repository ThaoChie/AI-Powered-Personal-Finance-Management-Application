import React, { useState, useEffect } from 'react';
import axios from 'axios';

const JarModal = ({ jar, onClose, onSuccess }) => {
    const isEditMode = !!jar;

    const [formData, setFormData] = useState({
        name: '',
        percent: 0,
        goal: '' // Đổi thành chuỗi rỗng để dễ format
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isEditMode && jar) {
            setFormData({
                name: jar.name,
                percent: jar.percent || 0,
                // Format số tiền khi load lên (ví dụ: 1000000 -> 1,000,000)
                goal: jar.goal ? new Intl.NumberFormat('en-US').format(jar.goal) : ''
            });
        }
    }, [jar, isEditMode]);

    // 👇 HÀM XỬ LÝ NHẬP TIỀN (QUAN TRỌNG)
    const handleMoneyChange = (e) => {
        const { name, value } = e.target;
        // 1. Xóa hết dấu phẩy cũ để lấy số thô
        const rawValue = value.replace(/,/g, '');
        
        // 2. Kiểm tra nếu là số thì format lại
        if (!isNaN(rawValue) && rawValue !== '') {
            const formattedValue = new Intl.NumberFormat('en-US').format(rawValue);
            setFormData(prev => ({ ...prev, [name]: formattedValue }));
        } else if (rawValue === '') {
            setFormData(prev => ({ ...prev, [name]: '' }));
        }
    };

    // Hàm xử lý các input thường (Tên, %)
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const payload = {
                ...formData,
                percent: parseFloat(formData.percent),
                // 👇 Trước khi gửi về Backend, phải xóa dấu phẩy đi để thành số nguyên
                goal: formData.goal ? parseFloat(formData.goal.replace(/,/g, '')) : 0,
                id: isEditMode ? jar.id : 0
            };

            if (isEditMode) {
                await axios.put(`/api/Jars/${jar.id}`, payload);
                alert("✅ Cập nhật hũ thành công!");
            } else {
                await axios.post('/api/Jars', { ...payload, balance: 0 });
                alert("✅ Tạo hũ mới thành công!");
            }
            onSuccess();
        } catch (err) {
            alert("❌ Lỗi: " + (err.response?.data || err.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm("⚠️ Bạn có chắc muốn XÓA hũ này?")) {
            try {
                await axios.delete(`/api/Jars/${jar.id}`);
                alert("Đã xóa hũ!");
                onSuccess();
            } catch (err) {
                alert("Lỗi xóa: " + err.message);
            }
        }
    };

    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content shadow-lg border-0 rounded-4">
                    <div className="modal-header border-0 pb-0">
                        <h5 className="modal-title fw-bold">
                            {isEditMode ? '✏️ Chỉnh sửa Hũ' : '✨ Tạo Hũ Mới'}
                        </h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body p-4">
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label className="form-label fw-bold text-secondary small">Tên Hũ</label>
                                <input type="text" name="name" className="form-control" placeholder="VD: Giải trí..." value={formData.name} onChange={handleChange} required />
                            </div>

                            <div className="row">
                                <div className="col-6 mb-3">
                                    <label className="form-label fw-bold text-secondary small">% Phân bổ</label>
                                    <div className="input-group">
                                        <input type="number" name="percent" className="form-control" placeholder="0" value={formData.percent} onChange={handleChange} />
                                        <span className="input-group-text">%</span>
                                    </div>
                                </div>
                                <div className="col-6 mb-3">
                                    <label className="form-label fw-bold text-secondary small">Mục tiêu (VNĐ)</label>
                                    {/* 👇 INPUT TIỀN ĐÃ SỬA: TYPE TEXT + SỰ KIỆN RIÊNG */}
                                    <input 
                                        type="text" 
                                        name="goal"
                                        className="form-control fw-bold text-primary" 
                                        placeholder="0" 
                                        value={formData.goal} 
                                        onChange={handleMoneyChange} // Dùng hàm mới
                                    />
                                </div>
                            </div>

                            <div className="d-flex gap-2 mt-3">
                                {isEditMode && (
                                    <button type="button" className="btn btn-light text-danger fw-bold flex-fill" onClick={handleDelete}>
                                        <i className="fa fa-trash me-2"></i> Xóa
                                    </button>
                                )}
                                <button type="submit" className="btn btn-primary fw-bold flex-fill" disabled={isSubmitting}>
                                    {isEditMode ? 'Lưu Thay Đổi' : 'Tạo Ngay'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JarModal;