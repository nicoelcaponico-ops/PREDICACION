import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Search, Users } from 'lucide-react';
import { isTomorrow } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import ContactCard, { Contact } from '../components/ContactCard';
import ContactForm from '../components/ContactForm';

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) return;

    // Query 1: Manual Contacts
    const q1 = query(
      collection(db, 'contacts'),
      where('ownerId', '==', auth.currentUser.uid),
      where('type', '==', 'revisita')
    );

    // Query 2: Map Markers (Revisitas)
    const q2 = query(
      collection(db, 'markers'),
      where('ownerId', '==', auth.currentUser.uid),
      where('type', '==', 'revisita')
    );

    let contactsList: Contact[] = [];
    let markersList: Contact[] = [];

    const unsub1 = onSnapshot(q1, (snapshot) => {
      contactsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact));
      setContacts([...contactsList, ...markersList]);
    });

    const unsub2 = onSnapshot(q2, (snapshot) => {
      markersList = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name || 'Sin nombre',
          type: 'revisita',
          address: d.address,
          notes: d.notes,
          contactInfo: d.contactInfo,
          lastSummary: d.lastSummary || d.notes,
          nextTopic: d.nextTopic,
          nextVisitDate: d.nextVisitDate,
          territory: d.territory,
          lat: d.lat,
          lng: d.lng,
          isMarker: true
        } as any;
      });
      setContacts([...contactsList, ...markersList]);
    });

    return () => {
      unsub1();
      unsub2();
    };
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
    <div className="h-full flex flex-col gap-8 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Revisitas</h1>
          <p className="text-slate-500 font-medium mt-1">Administrá las personas que mostraron interés.</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar por nombre o dirección..."
          className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-3xl focus:ring-4 focus:ring-blue-500/10 outline-none shadow-sm transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-24 scrollbar-hide">
        {filteredContacts.map((c) => (
          <ContactCard 
            key={c.id} 
            contact={c} 
            onEdit={() => setEditingContact(c)} 
            onGoToMap={() => {
              if (c.lat && c.lng) {
                navigate('/', { state: { center: [c.lat, c.lng], zoom: 19 } });
              }
            }}
            onDelete={async () => {
              if (window.confirm('¿Eliminar esta revisita?')) {
                try {
                  const collectionName = (c as any).isMarker ? 'markers' : 'contacts';
                  await deleteDoc(doc(db, collectionName, c.id));
                  toast.success('Revisita eliminada');
                } catch (error) {
                  console.error('Error al eliminar revisita:', error);
                  toast.error('Error al eliminar');
                }
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

      {editingContact && (
        <ContactForm 
          contact={editingContact} 
          onClose={() => {
            setEditingContact(null);
          }} 
          type="revisita"
        />
      )}
    </div>
  );
}
