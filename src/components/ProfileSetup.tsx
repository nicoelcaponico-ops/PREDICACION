import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { User, Users, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfileSetup() {
  const { user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [group, setGroup] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!fullName || !group) {
      toast.error('Por favor, completa todos los campos');
      return;
    }

    setIsSubmitting(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        fullName,
        group,
        email: user.email,
        displayName: user.displayName || fullName,
        photoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
      });
      toast.success('¡Perfil configurado con éxito!');
      await refreshProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Error al guardar el perfil');
    } finally {
      setIsSubmitting(false);
    }
  };

  const groups = [
    'Grupo 1',
    'Grupo 2',
    'Grupo 3',
    'Grupo 4',
    'Grupo 5',
    'Grupo 6'
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 p-8 space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-blue-200">
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 pt-4">Configura tu perfil</h1>
          <p className="text-slate-400">Queremos saber quién eres y a qué grupo perteneces</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">
              Nombre Completo
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">
              Selecciona tu Grupo
            </label>
            <div className="grid grid-cols-2 gap-3">
              {groups.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroup(g)}
                  className={`p-4 rounded-2xl font-bold transition-all border-2 ${
                    group === g 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' 
                      : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Confirmar Perfil
                <ArrowRight className="w-6 h-6" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
