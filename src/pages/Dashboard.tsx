import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Users, 
  BookOpen, 
  Home, 
  MapPin, 
  Calendar,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface HistoryEntry {
  id: string;
  targetId: string;
  previousType: string;
  currentType: string;
  date: any;
  notes: string;
  topic: string;
}

interface MarkerData {
  id: string;
  type: 'no_casa' | 'revisita' | 'estudio';
  name?: string;
  visitCount?: number;
}

export default function Dashboard() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const hQuery = query(
      collection(db, 'history'),
      where('ownerId', '==', auth.currentUser.uid),
      orderBy('date', 'desc'),
      limit(20)
    );

    const mQuery = query(
      collection(db, 'markers'),
      where('ownerId', '==', auth.currentUser.uid)
    );

    const unsubH = onSnapshot(hQuery, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HistoryEntry)));
    });

    const unsubM = onSnapshot(mQuery, (snapshot) => {
      setMarkers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarkerData)));
      setLoading(false);
    });

    return () => {
      unsubH();
      unsubM();
    };
  }, []);

  const stats = {
    total: markers.length,
    no_casa: markers.filter(m => m.type === 'no_casa').length,
    revisitaMarkers: markers.filter(m => m.type === 'revisita').length,
    estudioLimit: markers.filter(m => m.type === 'estudio').length,
    // Every visit to a study or a revisita marker counts as a return visit
    totalRevisitas: markers
      .filter(m => m.type === 'revisita' || m.type === 'estudio')
      .reduce((acc, m) => acc + (m.visitCount || 0), 0),
    totalVisits: markers.reduce((acc, m) => acc + (m.visitCount || 0), 0)
  };

  const getStatusLabel = (type: string) => {
    switch (type) {
      case 'no_casa': return 'No en casa';
      case 'revisita': return 'Revisita';
      case 'estudio': return 'Estudio';
      default: return type;
    }
  };

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'no_casa': return 'bg-red-500';
      case 'revisita': return 'bg-green-500';
      case 'estudio': return 'bg-orange-500';
      default: return 'bg-slate-500';
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24 overflow-y-auto h-full scrollbar-hide">
      <header className="space-y-1">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Tu Progreso</h2>
        <p className="text-slate-400 font-medium">Resumen de tu actividad en el campo</p>
      </header>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between"
        >
          <div className="bg-blue-50 w-10 h-10 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-800">{stats.totalRevisitas}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Revisitas Realizadas</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between"
        >
          <div className="bg-orange-50 w-10 h-10 rounded-2xl flex items-center justify-center text-orange-600 mb-4">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-800">{stats.estudioLimit}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Estudios Activos</p>
          </div>
        </motion.div>
      </div>

      {/* Secondary Stats */}
      <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-xl shadow-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-lg">Distribución de Casa</h3>
          <MapPin className="w-5 h-5 text-slate-400" />
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm font-bold text-slate-300">No en casa</span>
            </div>
            <span className="font-black">{stats.no_casa}</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-red-500 h-full" style={{ width: `${(stats.no_casa/stats.total || 0)*100}%` }} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm font-bold text-slate-300">Revisitas (Puntos)</span>
            </div>
            <span className="font-black">{stats.revisitaMarkers}</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-green-500 h-full" style={{ width: `${(stats.revisitaMarkers/stats.total || 0)*100}%` }} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-sm font-bold text-slate-300">Estudios (Puntos)</span>
            </div>
            <span className="font-black">{stats.estudioLimit}</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-orange-500 h-full" style={{ width: `${(stats.estudioLimit/stats.total || 0)*100}%` }} />
          </div>
        </div>
      </div>

      {/* Activity History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-800">Actividad Reciente</h3>
          <Calendar className="w-5 h-5 text-slate-300" />
        </div>

        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center p-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              <p className="text-slate-400 font-medium">Aún no hay actividad registrada</p>
            </div>
          ) : (
            history.map((entry, idx) => {
              const marker = markers.find(m => m.id === entry.targetId);
              const isTransition = entry.previousType !== 'none' && entry.previousType !== entry.currentType;

              return (
                <motion.div 
                  key={entry.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white p-4 rounded-3xl border border-slate-100 flex items-start gap-4"
                >
                  <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-white ${getStatusColor(entry.currentType)} shadow-lg shadow-opacity-20`}>
                    {entry.currentType === 'no_casa' ? <Home className="w-5 h-5" /> : entry.currentType === 'revisita' ? <Users className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-800 text-sm">
                        {marker?.name || 'Punto en el mapa'}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                        {entry.date?.seconds ? format(new Date(entry.date.seconds * 1000), 'd MMM', { locale: es }) : 'Reciente'}
                      </span>
                    </div>
                    
                    {isTransition ? (
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter">
                        <span className="text-slate-400">{getStatusLabel(entry.previousType)}</span>
                        <ArrowRight className="w-3 h-3 text-blue-500" />
                        <span className="text-blue-600">{getStatusLabel(entry.currentType)}</span>
                      </div>
                    ) : (
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Visita Realizada ({getStatusLabel(entry.currentType)})
                      </p>
                    )}

                    {entry.notes && (
                      <p className="text-xs text-slate-500 line-clamp-1 italic mt-1 bg-slate-50 px-2 py-1 rounded-lg">
                        "{entry.notes}"
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
