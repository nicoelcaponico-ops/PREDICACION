import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { Search, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import ContactCard, { Contact } from '../components/ContactCard';
import ContactForm from '../components/ContactForm';

export default function Studies() {
  const [studies, setStudies] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStudy, setEditingStudy] = useState<Contact | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) return;

    // Query 1: Manual Contacts
    const q1 = query(
      collection(db, 'contacts'),
      where('ownerId', '==', auth.currentUser.uid),
      where('type', '==', 'estudio')
    );

    // Query 2: Map Markers (Estudios)
    const q2 = query(
      collection(db, 'markers'),
      where('ownerId', '==', auth.currentUser.uid),
      where('type', '==', 'estudio')
    );

    let contactsList: Contact[] = [];
    let markersList: Contact[] = [];

    const unsub1 = onSnapshot(q1, (snapshot) => {
      contactsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact));
      setStudies([...contactsList, ...markersList]);
    });

    const unsub2 = onSnapshot(q2, (snapshot) => {
      markersList = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name || 'Estudio sin nombre',
          type: 'estudio',
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
      setStudies([...contactsList, ...markersList]);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  const filtered = studies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col gap-8 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Estudios Bíblicos</h1>
          <p className="text-slate-500 font-medium mt-1">Tus estudiantes que progresan en el conocimiento.</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar estudiante..."
          className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-3xl focus:ring-4 focus:ring-green-500/10 outline-none shadow-sm transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-24 scrollbar-hide">
        {filtered.map((c) => (
          <ContactCard 
            key={c.id} 
            contact={c} 
            onEdit={() => setEditingStudy(c)} 
            onGoToMap={() => {
              if (c.lat && c.lng) {
                navigate('/', { state: { center: [c.lat, c.lng], zoom: 19 } });
              }
            }}
            onDelete={async () => {
              if (window.confirm('¿Eliminar registro?')) {
                try {
                  const collectionName = (c as any).isMarker ? 'markers' : 'contacts';
                  await deleteDoc(doc(db, collectionName, c.id));
                  toast.success('Estudio eliminado');
                } catch (error) {
                  console.error('Error al eliminar estudio:', error);
                  toast.error('Error al eliminar');
                }
              }
             }}
          />
        ))}
        
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                <BookOpen size={32} />
             </div>
             <h3 className="text-lg font-bold text-slate-800">No hay estudios registrados</h3>
             <p className="text-slate-500 max-w-xs text-sm">Registrá a tus estudiantes para llevar el control de su progreso.</p>
          </div>
        )}
      </div>

      {editingStudy && (
        <ContactForm 
          contact={editingStudy} 
          onClose={() => {
            setEditingStudy(null);
          }} 
          type="estudio"
        />
      )}
    </div>
  );
}
