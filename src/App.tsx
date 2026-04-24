import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import { AnimatePresence, motion } from 'motion/react';
import PreachingMap from './components/Map';
import Login from './components/Login';
import ProfileSetup from './components/ProfileSetup';
import Contacts from './pages/Contacts';
import Studies from './pages/Studies';
import Dashboard from './pages/Dashboard';
import { Toaster } from 'sonner';

function AppContent() {
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    // Aggressive Zoom Blocking
    const preventZoom = (e: any) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const preventKeyZoom = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '0')) {
        e.preventDefault();
      }
    };

    const preventWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchstart', preventZoom, { passive: false });
    document.addEventListener('keydown', preventKeyZoom);
    document.addEventListener('wheel', preventWheelZoom, { passive: false });

    return () => {
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('keydown', preventKeyZoom);
      document.removeEventListener('wheel', preventWheelZoom);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // If user is logged in but doesn't have a profile doc in Firestore (no group selected)
  if (!profile || !profile.group) {
    return (
      <>
        <ProfileSetup />
        <Toaster richColors position="top-center" />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 flex items-center justify-center p-0 md:p-4 font-sans">
      <div className="w-full h-screen md:h-[844px] md:w-[390px] md:rounded-[3rem] md:shadow-[0_0_80px_rgba(0,0,0,0.15)] md:border-[8px] md:border-slate-800 bg-white overflow-hidden relative transition-all duration-500">
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<PreachingMap />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/studies" element={<Studies />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster richColors position="top-center" />
          </Layout>
        </BrowserRouter>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
