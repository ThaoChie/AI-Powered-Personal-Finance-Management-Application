import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown'; // 👈 Import thư viện render Markdown
import remarkGfm from 'remark-gfm';       // 👈 Import plugin hỗ trợ bảng biểu

const Chatbot = () => {
    const [messages, setMessages] = useState([
        { role: 'model', content: 'Xin chào! Tôi là trợ lý tài chính AI. Tôi có thể giúp gì cho bạn?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const res = await axios.get('/api/Chat/history');
            if (res.data && res.data.length > 0) {
                const mappedMsgs = res.data.map(m => ({
                    role: m.role,
                    content: m.content
                }));
                setMessages(mappedMsgs);
            }
        } catch (err) {
            console.error("Lỗi load history:", err);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await axios.post('/api/Chat/send', { message: input });
            const botMsg = { role: 'model', content: res.data.reply };
            setMessages(prev => [...prev, botMsg]);
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'model', content: '⚠️ Lỗi kết nối server. Vui lòng thử lại.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = async () => {
        if (!window.confirm("Bạn muốn xóa toàn bộ đoạn chat này?")) return;
        try {
            await axios.delete('/api/Chat/clear');
            setMessages([{ role: 'model', content: 'Đã xóa ký ức. Chúng ta bắt đầu lại nhé!' }]);
        } catch (err) {
            alert("Lỗi xóa: " + err.message);
        }
    };

    return (
        <div className="container-fluid h-100 d-flex flex-column p-0" style={{ height: '100vh', backgroundColor: '#f5f7fb' }}>
            
            {/* Header */}
            <div className="bg-white px-4 py-3 border-bottom d-flex justify-content-between align-items-center shadow-sm">
                <div className="d-flex align-items-center gap-3">
                    <div className="rounded-circle d-flex align-items-center justify-content-center text-white shadow-sm" 
                         style={{width: '45px', height: '45px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
                        <i className="fa fa-robot fs-5"></i>
                    </div>
                    <div>
                        <h5 className="fw-bold mb-0 text-dark">Trợ lý Tài chính AI</h5>
                        <small className="text-muted"><i className="fa fa-circle text-success me-1" style={{fontSize:'8px'}}></i>Sẵn sàng hỗ trợ</small>
                    </div>
                </div>
                <button onClick={handleClear} className="btn btn-light text-danger btn-sm fw-bold rounded-pill px-3">
                    <i className="fa fa-trash me-2"></i> Xóa lịch sử
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-grow-1 overflow-auto p-4" style={{ maxHeight: 'calc(100vh - 160px)' }}>
                {messages.map((msg, index) => {
                    const isUser = msg.role === 'user';
                    return (
                        <div key={index} className={`d-flex mb-3 ${isUser ? 'justify-content-end' : 'justify-content-start'}`}>
                            {!isUser && (
                                <div className="rounded-circle bg-white border d-flex align-items-center justify-content-center me-2 mt-1" style={{width: '35px', height: '35px', flexShrink: 0}}>
                                    <i className="fa fa-robot text-primary" style={{fontSize:'14px'}}></i>
                                </div>
                            )}
                            
                            <div className={`p-3 rounded-4 shadow-sm ${isUser ? 'text-white' : 'bg-white text-dark'}`}
                                 style={{ 
                                     maxWidth: '80%', // Tăng độ rộng để hiển thị bảng đẹp hơn
                                     background: isUser ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#fff',
                                     borderBottomRightRadius: isUser ? '4px' : '20px',
                                     borderBottomLeftRadius: isUser ? '20px' : '4px'
                                 }}>
                                
                                {/* 👇👇👇 DÙNG REACT MARKDOWN ĐỂ RENDER BẢNG & FORMAT ĐẸP 👇👇👇 */}
                                <div style={{ fontSize: '15px', lineHeight: '1.6' }}>
                                    <ReactMarkdown 
                                        remarkPlugins={[remarkGfm]} // Kích hoạt plugin bảng
                                        components={{
                                            // Tùy chỉnh style cho bảng để nó có viền đẹp
                                            table: ({node, ...props}) => <div className="table-responsive"><table className="table table-bordered table-sm my-2" style={{fontSize: '14px'}} {...props} /></div>,
                                            thead: ({node, ...props}) => <thead className="table-light" {...props} />,
                                            p: ({node, ...props}) => <p className="mb-1" {...props} />
                                        }}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>

                            </div>
                        </div>
                    );
                })}
                {isLoading && (
                    <div className="d-flex justify-content-start mb-3">
                         <div className="rounded-circle bg-white border d-flex align-items-center justify-content-center me-2" style={{width: '35px', height: '35px'}}>
                            <i className="fa fa-robot text-primary"></i>
                        </div>
                        <div className="bg-white p-3 rounded-4 shadow-sm text-muted fst-italic">
                            <i className="fa fa-circle-notch fa-spin me-2"></i> Đang suy nghĩ...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-top">
                <form onSubmit={handleSend} className="input-group">
                    <input 
                        type="text" 
                        className="form-control form-control-lg border-0 bg-light rounded-pill px-4" 
                        placeholder="Hỏi tôi về chi tiêu, ngân sách..." 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                    />
                    <button 
                        className="btn btn-primary rounded-circle ms-2 d-flex align-items-center justify-content-center shadow-sm" 
                        type="submit" 
                        style={{width: '50px', height: '50px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none'}}
                        disabled={isLoading || !input.trim()}
                    >
                        <i className="fa fa-paper-plane fs-5"></i>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Chatbot;