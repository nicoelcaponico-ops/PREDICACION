import { signInWithGoogle } from '../lib/firebase';
import { motion } from 'motion/react';

export default function Login() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2rem] p-8 md:p-12 shadow-2xl border border-white"
      >
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-blue-200">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-white fill-current">
               <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Predicación</h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            Administrá tus revisitas, estudios y grupo de servicio de forma simple y bonita.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-4 bg-white border-2 border-slate-100 p-4 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-[0.98] shadow-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
            Entrar con Google
          </button>
        </div>

        <div className="mt-12 text-center">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-[0.2em]">Versión Argentina 1.0</p>
        </div>
      </motion.div>
      
      <div className="mt-8 text-center max-w-sm">
        <p className="text-sm text-slate-400">
          Tus datos se sincronizan automáticamente con la nube cuando tenés conexión.
        </p>
      </div>
    </div>
  );
}
