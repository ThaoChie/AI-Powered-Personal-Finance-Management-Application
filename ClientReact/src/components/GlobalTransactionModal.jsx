import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, ToggleButton, ToggleButtonGroup } from 'react-bootstrap';
import axios from 'axios';
import Swal from 'sweetalert2';

const GlobalTransactionModal = ({ show, handleClose, onSaveSuccess }) => {
    // --- FORM STATE ---
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        jarId: '',
        type: 'expense',
        date: new Date().toISOString().split('T')[0]
    });
    const [jars, setJars] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    // --- DATA FETCHING for Jars dropdown ---
    useEffect(() => {
        if (show) {
            const fetchJars = async () => {
                try {
                    const response = await axios.get('http://localhost:8080/api/Jars');
                    const jarsData = response.data || [];
                    setJars(jarsData);
                    if (jarsData.length > 0) {
                        // Set default jar when modal opens
                        setFormData(prev => ({ ...prev, jarId: jarsData[0].id }));
                    }
                } catch (error) {
                    console.error("Lỗi tải danh sách hũ:", error);
                }
            };
            fetchJars();
        }
    }, [show]);

    // --- FORM HANDLERS ---
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleTypeChange = (val) => {
        setFormData({ ...formData, type: val });
    };

    const resetForm = () => {
        setFormData({
            description: '',
            amount: '',
            jarId: jars[0]?.id || '',
            type: 'expense',
            date: new Date().toISOString().split('T')[0]
        });
    };

    const handleInternalClose = () => {
        resetForm();
        handleClose();
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.jarId || !formData.amount || !formData.description) {
            Swal.fire('Thiếu thông tin', 'Vui lòng điền đầy đủ các trường bắt buộc.', 'warning');
            return;
        }

        setIsSaving(true);
        let finalAmount = parseFloat(formData.amount) || 0;
        if (formData.type === 'expense') {
            finalAmount = -Math.abs(finalAmount);
        } else {
            finalAmount = Math.abs(finalAmount);
        }
        
        const payload = {
            description: formData.description,
            amount: finalAmount,
            jarId: parseInt(formData.jarId),
            date: formData.date
        };

        try {
            await axios.post('http://localhost:8080/api/Transactions', payload);
            Swal.fire('Thành công!', 'Giao dịch đã được lưu.', 'success');
            onSaveSuccess(); // Trigger data refresh in App.jsx
            handleInternalClose();
        } catch (error) {
            Swal.fire('Lỗi!', 'Không thể lưu giao dịch.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal show={show} onHide={handleInternalClose} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title className="fw-bold text-gradient-primary">
                    <i className="fa-solid fa-plus-minus me-2"></i>
                    Thêm Giao Dịch Nhanh
                </Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSave}>
                <Modal.Body>
                     <ToggleButtonGroup
                        type="radio"
                        name="txType"
                        value={formData.type}
                        onChange={handleTypeChange}
                        className="d-flex mb-4"
                    >
                        <ToggleButton id="tbg-global-expense" value={'expense'} variant="outline-danger" className="w-100 rounded-pill me-2 fw-semibold">
                            <i className="fa-solid fa-arrow-up me-2"></i>Chi Tiêu
                        </ToggleButton>
                        <ToggleButton id="tbg-global-income" value={'income'} variant="outline-success" className="w-100 rounded-pill fw-semibold">
                           <i className="fa-solid fa-arrow-down me-2"></i>Thu Nhập
                        </ToggleButton>
                    </ToggleButtonGroup>

                    <div className="row g-3">
                        <div className="col-md-8">
                             <Form.Group>
                                <Form.Label className="fw-semibold">Mô tả</Form.Label>
                                <Form.Control type="text" name="description" placeholder="VD: Mua sắm, Lương tháng..." value={formData.description} onChange={handleChange} required className="form-control-lg rounded-3" />
                            </Form.Group>
                        </div>
                        <div className="col-md-4">
                             <Form.Group>
                                <Form.Label className="fw-semibold">Số tiền (VNĐ)</Form.Label>
                                <Form.Control type="number" name="amount" placeholder="0" value={formData.amount} onChange={handleChange} required className="form-control-lg rounded-3 fw-bold"/>
                            </Form.Group>
                        </div>
                         <div className="col-md-8">
                             <Form.Group>
                                <Form.Label className="fw-semibold">Chọn hũ để {formData.type === 'expense' ? 'trừ tiền' : 'cộng tiền'}</Form.Label>
                                <Form.Select name="jarId" value={formData.jarId} onChange={handleChange} required className="form-select-lg rounded-3">
                                    {jars.length > 0 ? (
                                        jars.map(jar => (
                                            <option key={jar.id} value={jar.id}>{jar.name}</option>
                                        ))
                                    ) : (
                                        <option disabled>Đang tải danh sách hũ...</option>
                                    )}
                                </Form.Select>
                            </Form.Group>
                        </div>
                         <div className="col-md-4">
                             <Form.Group>
                                <Form.Label className="fw-semibold">Ngày giao dịch</Form.Label>
                                <Form.Control type="date" name="date" value={formData.date} onChange={handleChange} required className="form-control-lg rounded-3"/>
                            </Form.Group>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light" onClick={handleInternalClose} className="rounded-pill px-4">
                        Hủy
                    </Button>
                    <Button variant="primary" type="submit" className="bg-gradient-primary border-0 rounded-pill px-5 py-2 fw-bold" disabled={isSaving}>
                       {isSaving ? 'Đang lưu...' : 'Lưu Giao Dịch'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default GlobalTransactionModal;