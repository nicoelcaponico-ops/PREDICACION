import { motion } from 'motion/react';
import { Edit2, Trash2, MapPin, Calendar, BookOpen } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

export interface Contact {
  id: string;
  name: string;
  type: 'revisita' | 'estudio';
  contactInfo?: string;
  address?: string;
  lastSummary?: string;
  nextTopic?: string;
  nextVisitDate?: any;
  status: 'activo' | 'inactivo';
}

interface ContactCardProps {
  key?: string | number;
  contact: Contact;
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
}

export default function ContactCard({ contact, onEdit, onDelete }: ContactCardProps) {
  const isScheduledToday = contact.nextVisitDate && isToday(contact.nextVisitDate.toDate());
  const isStudy = contact.type === 'estudio';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col gap-4 relative group h-full"
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 ${isStudy ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'} rounded-full flex items-center justify-center font-black text-xl`}>
            {contact.name[0].toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">{contact.name}</h3>
            {contact.address && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {contact.address}
              </p>
            )}
            {isStudy && (
              <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider flex items-center gap-1 mt-1">
                <BookOpen className="w-3 h-3" /> Estudiante
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3 flex-1">
         <div className="bg-slate-50 p-4 rounded-2xl">
            <p className="text-[10px] uppercase font-black text-slate-400 mb-1 tracking-wider">
              {isStudy ? 'Vimos por última vez:' : 'Hablamos por última vez:'}
            </p>
            <p className="text-sm text-slate-700 italic">"{contact.lastSummary || 'Sin registro...'}"</p>
         </div>

         <div className={`${isStudy ? 'bg-green-50/50 border-green-100/50' : 'bg-blue-50/50 border-blue-100/50'} p-4 rounded-2xl border`}>
            <p className={`text-[10px] uppercase font-black ${isStudy ? 'text-green-400' : 'text-blue-400'} mb-1 tracking-wider`}>
              {isStudy ? 'Próxima lección:' : 'Próximo tema:'}
            </p>
            <p className={`text-sm ${isStudy ? 'text-green-700' : 'text-blue-700'} font-medium`}>
              {contact.nextTopic || (isStudy ? 'Continuar folleto' : 'Saludar')}
            </p>
         </div>
      </div>

      {contact.nextVisitDate && (
        <div className={`mt-2 flex items-center gap-2 p-3 rounded-xl font-bold text-xs ${isScheduledToday ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-500'}`}>
          <Calendar className="w-4 h-4" />
          {format(contact.nextVisitDate.toDate(), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
        </div>
      )}
    </motion.div>
  );
}
