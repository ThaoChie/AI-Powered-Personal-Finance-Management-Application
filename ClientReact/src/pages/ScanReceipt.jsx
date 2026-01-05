import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ScanReceipt = () => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    // Dữ liệu kết quả sau khi quét
    const [scanResult, setScanResult] = useState({
        storeName: '',
        totalAmount: '',
        date: '',
        items: []
    });

    // --- HÀM HỖ TRỢ FORMAT TIỀN ---
    const formatMoney = (val) => {
        // Xóa tất cả ký tự không phải số để lấy giá trị thô
        const raw = val ? val.toString().replace(/,/g, '') : '';
        // Nếu là số thì format, không thì trả về rỗng
        return !isNaN(raw) && raw !== '' ? new Intl.NumberFormat('en-US').format(raw) : '';
    };

    // 1. Xử lý chọn ảnh
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    // 2. Xử lý khi người dùng sửa số tiền bằng tay
    const handleAmountChange = (e) => {
        const val = e.target.value;
        // Format lại giá trị ngay khi gõ
        setScanResult({ ...scanResult, totalAmount: formatMoney(val) });
    };

    // 3. Gửi ảnh lên Server (OCR)
    const handleScan = async () => {
        if (!selectedImage) return alert("Vui lòng chọn ảnh trước!");

        setIsLoading(true);
        const formData = new FormData();
        
        // 👇 Key là 'image' để khớp với Backend
        formData.append('image', selectedImage); 

        try {
            const res = await axios.post('/api/ocr/scan', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const data = res.data;
            
            // Điền dữ liệu vào Form & Format tiền ngay lập tức
            setScanResult({
                storeName: data.storeName || '',
                totalAmount: formatMoney(data.totalAmount || ''), // Format số tiền từ AI
                date: data.date || '',
                items: data.items || []
            });
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.title || err.response?.data || err.message;
            alert("Lỗi khi quét: " + errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    // 4. Lưu kết quả vào Hũ
    const handleSave = async () => {
        // Xóa dấu phẩy để lấy số thực trước khi gửi
        const cleanAmount = parseFloat(scanResult.totalAmount.toString().replace(/,/g, ''));
        
        if (!cleanAmount) return alert("Chưa có số tiền!");

        try {
            // Lấy danh sách hũ để tìm hũ mặc định
            const jarsRes = await axios.get('/api/Jars');
            // Ưu tiên hũ 'Thiết yếu', nếu không có lấy hũ đầu tiên
            const targetJar = jarsRes.data.find(j => j.name.toLowerCase().includes('thiết yếu')) || jarsRes.data[0];

            if (!targetJar) return alert("Bạn chưa có Hũ nào!");

            const payload = {
                description: `Mua sắm tại ${scanResult.storeName || 'Cửa hàng'}`,
                amount: -Math.abs(cleanAmount), // Chi tiêu là số âm
                date: scanResult.date ? new Date(scanResult.date).toISOString() : new Date().toISOString(),
                jarId: targetJar.id
            };

            await axios.post('/api/Transactions', payload);
            alert("✅ Đã lưu giao dịch thành công!");
            navigate('/'); // Quay về Dashboard
        } catch (err) {
            alert("Lỗi lưu: " + err.message);
        }
    };

    return (
        <div className="container-fluid py-4">
            <h2 className="fw-bold mb-4">📸 Quét Hóa Đơn AI</h2>
            
            <div className="row g-4">
                {/* CỘT TRÁI: UPLOAD ẢNH */}
                <div className="col-md-5">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-body text-center p-4">
                            <div className="mb-3 d-flex justify-content-center align-items-center bg-light rounded-4" 
                                 style={{height: '300px', border: '2px dashed #ccc', overflow: 'hidden'}}>
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" style={{maxWidth: '100%', maxHeight: '100%'}} />
                                ) : (
                                    <div className="text-muted">
                                        <i className="fa fa-image fa-3x mb-2"></i>
                                        <p>Chưa có ảnh</p>
                                    </div>
                                )}
                            </div>
                            
                            <input type="file" id="fileInput" className="d-none" accept="image/*" onChange={handleImageChange} />
                            
                            <div className="d-grid gap-2">
                                <label htmlFor="fileInput" className="btn btn-outline-primary fw-bold rounded-pill">
                                    <i className="fa fa-upload me-2"></i> Chọn Ảnh
                                </label>
                                <button 
                                    className="btn btn-gradient text-white fw-bold rounded-pill"
                                    onClick={handleScan}
                                    disabled={isLoading || !selectedImage}
                                    style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                                >
                                    {isLoading ? <i className="fa fa-spinner fa-spin"></i> : <i className="fa fa-magic me-2"></i>}
                                    {isLoading ? ' Đang phân tích...' : ' Quét Thông Tin'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CỘT PHẢI: KẾT QUẢ */}
                <div className="col-md-7">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-header bg-white border-0 pt-4 px-4">
                            <h5 className="fw-bold text-primary"><i className="fa fa-receipt me-2"></i>Kết Quả Quét</h5>
                        </div>
                        <div className="card-body p-4">
                            <div className="mb-3">
                                <label className="form-label fw-bold text-muted small">Tên Cửa Hàng</label>
                                <input type="text" className="form-control" value={scanResult.storeName} 
                                    onChange={e => setScanResult({...scanResult, storeName: e.target.value})} />
                            </div>

                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label fw-bold text-muted small">Tổng Tiền</label>
                                    {/* 👇 INPUT TIỀN ĐÃ FORMAT DẤU PHẨY */}
                                    <input 
                                        type="text" 
                                        className="form-control fw-bold text-danger" 
                                        value={scanResult.totalAmount} 
                                        onChange={handleAmountChange}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label fw-bold text-muted small">Ngày Mua</label>
                                    <input type="date" className="form-control" value={scanResult.date} 
                                        onChange={e => setScanResult({...scanResult, date: e.target.value})} />
                                </div>
                            </div>

                            {/* Danh sách món ăn (nếu có) */}
                            {scanResult.items && scanResult.items.length > 0 && (
                                <div className="mb-3 bg-light p-3 rounded-3">
                                    <label className="fw-bold small text-muted mb-2">Chi tiết món:</label>
                                    <ul className="list-unstyled mb-0 small">
                                        {scanResult.items.map((item, idx) => (
                                            <li key={idx} className="d-flex justify-content-between border-bottom py-1">
                                                <span>{typeof item === 'string' ? item : item.name}</span>
                                                {item.price && <span className="fw-bold">{item.price}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="mt-4 pt-3 border-top">
                                <button className="btn btn-success w-100 py-3 rounded-pill fw-bold shadow-sm" onClick={handleSave}>
                                    <i className="fa fa-check-circle me-2"></i> Lưu Giao Dịch
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScanReceipt;