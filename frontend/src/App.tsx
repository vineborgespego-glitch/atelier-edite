import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';

import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';

import Dashboard from './pages/Dashboard';
import OrdersKanban from './pages/OrdersKanban';
import OrderForm from './pages/OrderForm';
import OrderHistory from './pages/OrderHistory';
import ClientsCRM from './pages/ClientsCRM';
import ClientForm from './pages/ClientForm';
import Admin from './pages/Admin';

// Components
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes wrapped in Layout */}
        <Route path="/app" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          <Route path="orders">
            <Route index element={<OrdersKanban />} />
            <Route path="new" element={<OrderForm />} />
            <Route path="history" element={<OrderHistory />} />
          </Route>
          
          <Route path="clients">
            <Route index element={<ClientsCRM />} />
            <Route path="new" element={<ClientForm />} />
          </Route>


          <Route path="admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
