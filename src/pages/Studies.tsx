import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { Plus, Search, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import ContactCard, { Contact } from '../components/ContactCard';
import ContactForm from '../components/ContactForm';

export default function Studies() {
  const [studies, setStudies] = useState<Contact[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStudy, setEditingStudy] = useState<Contact | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'contacts'),
      where('ownerId', '==', auth.currentUser.uid),
      where('type', '==', 'estudio')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact));
      setStudies(data);
    }, (error) => {
      console.error(error);
    });

    return unsubscribe;
  }, []);

  const filtered = studies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Estudios Bíblicos</h1>
          <p className="text-slate-500 font-medium">Tus estudiantes que progresan en el conocimiento.</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-4 rounded-2xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 transition-all active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          Nuevo Estudio
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar estudiante..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-8">
        {filtered.map((c) => (
          <ContactCard 
            key={c.id} 
            contact={c} 
            onEdit={() => setEditingStudy(c)} 
            onDelete={async () => {
              if (confirm('¿Eliminar registro?')) {
                await deleteDoc(doc(db, 'contacts', c.id));
                toast.success('Estudio eliminado');
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

      {(showAdd || editingStudy) && (
        <ContactForm 
          contact={editingStudy} 
          onClose={() => {
            setShowAdd(false);
            setEditingStudy(null);
          }} 
          type="estudio"
        />
      )}
    </div>
  );
}
