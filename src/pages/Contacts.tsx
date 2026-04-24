import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Plus, Search, Users } from 'lucide-react';
import { isTomorrow } from 'date-fns';
import { toast } from 'sonner';
import ContactCard, { Contact } from '../components/ContactCard';
import ContactForm from '../components/ContactForm';

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'contacts'),
      where('ownerId', '==', auth.currentUser.uid),
      where('type', '==', 'revisita')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact));
      setContacts(data);
    }, (error) => {
      console.error(error);
    });

    return unsubscribe;
  }, []);

  // Notification check for tomorrow's visits
  useEffect(() => {
    contacts.forEach(c => {
      if (c.nextVisitDate) {
        const date = c.nextVisitDate.toDate();
        if (isTomorrow(date)) {
          toast.info(`Recordatorio: Mañana visitás a ${c.name}`, {
            description: `Toca re-visitar: ${c.nextTopic || 'Sin tema definido'}`,
            duration: 10000,
          });
        }
      }
    });
  }, [contacts.length]);

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Revisitas</h1>
          <p className="text-slate-500 font-medium">Administrá las personas que mostraron interés.</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          Nueva Revisita
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar por nombre o dirección..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-8">
        {filteredContacts.map((c) => (
          <ContactCard 
            key={c.id} 
            contact={c} 
            onEdit={() => setEditingContact(c)} 
            onDelete={async () => {
              if (confirm('¿Eliminar esta revisita?')) {
                await deleteDoc(doc(db, 'contacts', c.id));
                toast.success('Revisita eliminada');
              }
            }}
          />
        ))}

        {filteredContacts.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
               <Users size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No se encontraron revisitas</h3>
            <p className="text-sm text-slate-500 max-w-xs">Agregá tu primera revisita para empezar a llevar el registro.</p>
          </div>
        )}
      </div>

      {(showAdd || editingContact) && (
        <ContactForm 
          contact={editingContact} 
          onClose={() => {
            setShowAdd(false);
            setEditingContact(null);
          }} 
          type="revisita"
        />
      )}
    </div>
  );
}
