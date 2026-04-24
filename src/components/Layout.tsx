import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Map, Users, BookOpen, Settings, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { logout } from '../lib/firebase';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, profile } = useAuth();

  const navItems = [
    { to: '/', icon: <Map className="w-5 h-5" />, label: 'Mapa' },
    { to: '/contacts', icon: <Users className="w-5 h-5" />, label: 'Contactos' },
    { to: '/studies', icon: <BookOpen className="w-5 h-5" />, label: 'Estudios' },
  ];

  return (
    <div className="h-full flex flex-col bg-white font-sans relative overflow-hidden">
      {/* App Header (Always Mobile Style) */}
      <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-[1000] shadow-sm shrink-0">
        <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
           <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-100">
              <Map className="w-5 h-5 text-white" />
           </div>
           {profile?.group || 'Predicación'}
        </h1>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)} 
          className="p-2 text-slate-600 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all active:scale-95"
        >
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative bg-slate-50">
        {children}
      </main>

      {/* Navigation Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000]"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 left-0 w-4/5 max-w-[300px] bg-white z-[3000] shadow-2xl p-6 flex flex-col"
            >
              <div className="flex justify-between items-center mb-10">
                 <h2 className="text-2xl font-black text-slate-800">Menú</h2>
                 <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-slate-50 rounded-full">
                    <X className="w-5 h-5 text-slate-400" />
                 </button>
              </div>

              <nav className="flex-1 space-y-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-4 text-lg p-4 rounded-2xl transition-all ${
                        isActive ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-200' : 'text-slate-600 hover:bg-slate-50'
                      }`
                    }
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              <div className="pt-6 border-t border-slate-100">
                {user && (
                  <div className="flex items-center gap-3 mb-6 bg-slate-50 p-3 rounded-2xl">
                    <img src={user.photoURL || `https://ui-avatars.com/api/?name=${profile?.fullName || user.email}`} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt="Avatar" />
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-slate-800 truncate">{profile?.fullName || user.displayName || 'Usuario'}</p>
                      <p className="text-[10px] text-slate-400 truncate tracking-wider font-bold">{profile?.group || user.email}</p>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-4 text-lg p-4 text-red-600 w-full font-bold hover:bg-red-50 rounded-2xl transition-all"
                >
                  <LogOut />
                  Cerrar Sesión
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
