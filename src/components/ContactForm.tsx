import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MoreVertical } from 'lucide-react';
import { db, auth, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Contact } from './ContactCard';

interface ContactFormProps {
  contact?: Contact | null;
  onClose: () => void;
  type: 'revisita' | 'estudio';
}

export default function ContactForm({ contact, onClose, type }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: contact?.name || '',
    contactInfo: contact?.contactInfo || '',
    address: contact?.address || '',
    lastSummary: contact?.lastSummary || '',
    nextTopic: contact?.nextTopic || '',
    territory: (contact as any)?.territory || '',
    nextVisitDate: contact?.nextVisitDate ? format(contact.nextVisitDate.toDate(), "yyyy-MM-dd'T'HH:mm") : '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const data = {
        ...formData,
        ownerId: auth.currentUser.uid,
        type,
        nextVisitDate: formData.nextVisitDate ? new Date(formData.nextVisitDate) : null,
        updatedAt: serverTimestamp(),
      };

      if (contact) {
        const collectionName = (contact as any).isMarker ? 'markers' : 'contacts';
        await updateDoc(doc(db, collectionName, contact.id), data);
        
        // Add history entry
        await addDoc(collection(db, 'history'), {
          ownerId: auth.currentUser.uid,
          targetId: contact.id,
          previousType: contact.type,
          currentType: type,
          date: serverTimestamp(),
          notes: formData.lastSummary,
          topic: formData.nextTopic,
        });
        
        toast.success('Actualizado correctamente');
      } else {
        const contactRef = await addDoc(collection(db, 'contacts'), {
          ...data,
          status: 'activo',
          createdAt: serverTimestamp(),
        });

        // Add history entry
        await addDoc(collection(db, 'history'), {
          ownerId: auth.currentUser.uid,
          targetId: contactRef.id,
          previousType: 'none',
          currentType: type,
          date: serverTimestamp(),
          notes: formData.lastSummary,
          topic: formData.nextTopic,
        });

        toast.success('Registrado correctamente');
      }
      onClose();
    } catch (error) {
      handleFirestoreError(error, contact ? 'update' : 'create', 'contacts');
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2.5rem] p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-white"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-slate-800">
            {contact ? 'Editar' : 'Nuevo'} {type === 'revisita' ? 'Revisita' : 'Estudio'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400">
            <MoreVertical className="rotate-90" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
             <div>
               <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Nombre</label>
               <input 
                 required
                 value={formData.name}
                 onChange={e => setFormData({...formData, name: e.target.value})}
                 className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold text-slate-800"
                 placeholder="Ej: Juan Pérez"
               />
             </div>
             <div>
               <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Dirección</label>
               <input 
                 value={formData.address}
                 onChange={e => setFormData({...formData, address: e.target.value})}
                 className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-medium text-slate-800"
                 placeholder="Ej: Calle 123"
               />
             </div>
             <div>
               <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Teléfono</label>
               <input 
                 value={formData.contactInfo}
                 onChange={e => setFormData({...formData, contactInfo: e.target.value})}
                 className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-medium text-slate-800"
                 placeholder="Ej: 11 1234-5678"
               />
             </div>
             <div>
               <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Territorio #</label>
               <input 
                 value={formData.territory}
                 onChange={e => setFormData({...formData, territory: e.target.value})}
                 className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-medium text-slate-800"
                 placeholder="Ej: 5"
               />
             </div>
             <div>
               <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Próxima Visita</label>
               <input 
                 type="datetime-local"
                 value={formData.nextVisitDate}
                 onChange={e => setFormData({...formData, nextVisitDate: e.target.value})}
                 className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold text-slate-800"
               />
             </div>
          </div>

          <div className="space-y-4">
             <div>
               <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                 {type === 'revisita' ? 'De qué hablamos' : 'Resumen de hoy'}
               </label>
               <textarea 
                 value={formData.lastSummary}
                 onChange={e => setFormData({...formData, lastSummary: e.target.value})}
                 className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-medium text-slate-800 h-32"
               />
             </div>
             <div>
               <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                 {type === 'revisita' ? 'Próximo tema' : 'Próxima lección'}
               </label>
               <textarea 
                 value={formData.nextTopic}
                 onChange={e => setFormData({...formData, nextTopic: e.target.value})}
                 className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-medium text-slate-800 h-24"
               />
             </div>
          </div>

          <div className="md:col-span-2 flex gap-4 mt-4">
            <button type="button" onClick={onClose} className="flex-1 p-4 rounded-2xl text-slate-600 font-bold hover:bg-slate-100 transition-all">Cancelar</button>
            <button type="submit" 
              className={`flex-1 p-4 rounded-2xl ${type === 'estudio' ? 'bg-green-600 shadow-green-200' : 'bg-blue-600 shadow-blue-200'} text-white font-black shadow-xl hover:opacity-90 transition-all`}>
              Guardar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
