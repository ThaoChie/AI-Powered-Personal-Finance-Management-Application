import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// Import Layout & Pages
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Jars from './pages/Jars';
import History from './pages/History';
import ScanReceipt from './pages/ScanReceipt';
import Chatbot from './pages/Chatbot';
import Settings from './pages/Settings';
import Login from './pages/Login';

// Import Modals
import GlobalTransactionModal from './components/GlobalTransactionModal';

const PrivateRoute = ({ children, isAuthenticated }) => {
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  // --- STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Dashboard-specific data, managed globally to allow refresh from modal
  const [dashboardData, setDashboardData] = useState({
      stats: { totalAssets: 0, income: 0, expense: 0 },
      jars: [],
      recentTransactions: [],
      userName: 'Bạn',
      isLoading: true
  });

  // --- DATA FETCHING ---
  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return; // Don't fetch if not logged in

    setDashboardData(prev => ({ ...prev, isLoading: true }));
    try {
        const [jarsRes, transRes, profileRes] = await Promise.all([
            axios.get('/api/Jars'),
            axios.get('/api/Transactions?_sort=date&_order=desc'),
            axios.get('/api/auth/profile').catch(() => ({ data: { name: 'Bạn' } }))
        ]);

        const jarsData = jarsRes.data || [];
        const allTrans = transRes.data || [];
        
        const totalAssets = jarsData.reduce((sum, jar) => sum + jar.balance, 0);
        const monthlyIncome = allTrans.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
        const monthlyExpense = allTrans.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);

        setDashboardData({
            stats: { totalAssets, income: monthlyIncome, expense: Math.abs(monthlyExpense) },
            jars: jarsData,
            recentTransactions: allTrans.slice(0, 5),
            userName: profileRes.data.name,
            isLoading: false
        });

    } catch (error) {
        console.error("Lỗi tải dữ liệu chung:", error);
        setDashboardData(prev => ({ ...prev, isLoading: false }));
    }
  }, [isAuthenticated]);

  // Initial auth check and data fetch
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
    setIsLoading(false); // App loading is done
  }, []);

  // Fetch data when authentication status changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);


  // --- HANDLERS ---
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };
  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return <div className="spinner-border"></div>; // Initial app loading
  }

  return (
    <Router>
      <div className="d-flex">
        {isAuthenticated && <Sidebar onLogout={handleLogout} onOpenGlobalModal={() => setIsModalOpen(true)} />}

        <main className="flex-grow-1 p-4" style={{ marginLeft: isAuthenticated ? '260px' : '0', transition: 'margin-left 0.3s' }}>
          <Routes>
            <Route path="/login" element={!isAuthenticated ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/" />} />
            
            {/* Pass fetched data down to Dashboard */}
            <Route path="/" element={<PrivateRoute isAuthenticated={isAuthenticated}><Dashboard dashboardData={dashboardData} onOpenGlobalModal={() => setIsModalOpen(true)} /></PrivateRoute>} />
            
            <Route path="/jars" element={<PrivateRoute isAuthenticated={isAuthenticated}><Jars /></PrivateRoute>} />
            <Route path="/history" element={<PrivateRoute isAuthenticated={isAuthenticated}><History /></PrivateRoute>} />
            <Route path="/scan" element={<PrivateRoute isAuthenticated={isAuthenticated}><ScanReceipt /></PrivateRoute>} />
            <Route path="/chat" element={<PrivateRoute isAuthenticated={isAuthenticated}><Chatbot /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute isAuthenticated={isAuthenticated}><Settings /></PrivateRoute>} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>

      {isAuthenticated && (
        <GlobalTransactionModal 
            show={isModalOpen} 
            handleClose={() => setIsModalOpen(false)}
            onSaveSuccess={fetchData} // Pass the refresh function
        />
      )}
    </Router>
  );
}

export default App;