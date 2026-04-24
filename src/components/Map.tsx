import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { MapPin, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';

// Fix for default marker icons in Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const NO_CASA_ICON = new L.DivIcon({
  html: '<div class="bg-red-500 p-2 rounded-full border-2 border-white shadow-lg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg></div>',
  className: 'custom-div-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const REVISITA_ICON = new L.DivIcon({
  html: '<div class="bg-green-500 p-2 rounded-full border-2 border-white shadow-lg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg></div>',
  className: 'custom-div-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const ESTUDIO_ICON = new L.DivIcon({
  html: '<div class="bg-orange-500 p-2 rounded-full border-2 border-white shadow-lg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg></div>',
  className: 'custom-div-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const USER_LOCATION_ICON = new L.DivIcon({
  html: '<div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-sm animate-pulse shadow-blue-400"></div>',
  className: 'user-location-icon',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

interface MarkerData {
  id: string;
  lat: number;
  lng: number;
  type: 'no_casa' | 'revisita' | 'estudio';
  name?: string;
  notes?: string;
  address?: string;
  territory?: string;
  contactInfo?: string;
  lastSummary?: string;
  nextTopic?: string;
  nextVisitDate?: any;
  lastVisitDate?: any;
}

function MapViewUpdater({ center, zoom, trigger }: { center: [number, number], zoom: number, trigger: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
    // Force invalidation to ensure full tiles are rendered
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [center, zoom, trigger, map]);
  return null;
}

export default function PreachingMap() {
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [mapTrigger, setMapTrigger] = useState(0);
  // Try to load last position from cache, default to Buenos Aires
  const [center, setCenter] = useState<[number, number]>(() => {
    const saved = localStorage.getItem('last_map_pos');
    return saved ? JSON.parse(saved) : [-34.6037, -58.3816];
  });
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem('last_map_zoom');
    return saved ? parseInt(saved) : 15;
  });
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [showForm, setShowForm] = useState<{ lat: number, lng: number } | null>(null);
  const [editingMarker, setEditingMarker] = useState<MarkerData | null>(null);
  const [markerToDelete, setMarkerToDelete] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'no_casa' | 'revisita' | 'estudio'>('no_casa');
  const location = useLocation();

  useEffect(() => {
    if (editingMarker) {
      setSelectedType(editingMarker.type);
    } else {
      setSelectedType('no_casa');
    }
  }, [editingMarker, showForm]);

  useEffect(() => {
    // Priority 1: Navigation state (Go to Map from Contact)
    if (location.state?.center) {
      setCenter(location.state.center);
      if (location.state.zoom) {
        setZoom(location.state.zoom);
      }
      setMapTrigger(prev => prev + 1);
    } 
    // Priority 2: Initial centering if no cache
    else if (!localStorage.getItem('last_map_pos')) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setCenter(newPos);
          setZoom(18);
          setMapTrigger(prev => prev + 1);
        },
        (err) => console.warn('Initial location error:', err),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [location.state]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'markers'),
      where('ownerId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarkerData));
      setMarkers(data);
    }, (error) => {
      console.error(error);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Check permission status first to avoid redundant prompts
    if ("permissions" in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted' || result.state === 'prompt') {
          startWatchingLocation();
        } else {
          console.warn('Geolocation permission denied by user.');
        }
      });
    } else {
      startWatchingLocation();
    }
  }, []);

  const startWatchingLocation = () => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(newPos);
      },
      (err) => console.warn('Geolocation error:', err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  };

  const handleAddMarker = (type: MarkerData['type'], notes: string, address: string, territory: string, name: string, contactInfo?: string, nextTopic?: string, nextVisitDate?: string) => {
    if (!auth.currentUser) return;

    // Close modals immediately for fluid UI
    const isEditing = !!editingMarker;
    const currentEditingMarker = editingMarker;
    const currentShowForm = showForm;
    
    setEditingMarker(null);
    setShowForm(null);

    // Run Firestore writes in the background
    (async () => {
      try {
        if (isEditing && currentEditingMarker) {
          const previousType = currentEditingMarker.type;
          
          await updateDoc(doc(db, 'markers', currentEditingMarker.id), {
            type,
            name,
            notes,
            address,
            territory,
            contactInfo: contactInfo || '',
            nextTopic: nextTopic || '',
            nextVisitDate: nextVisitDate ? new Date(nextVisitDate) : null,
            lastSummary: notes,
            visitCount: (currentEditingMarker.visitCount || 0) + 1,
            lastVisitDate: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          // Add history entry
          await addDoc(collection(db, 'history'), {
            ownerId: auth.currentUser.uid,
            targetId: currentEditingMarker.id,
            previousType: previousType,
            currentType: type,
            date: serverTimestamp(),
            notes: notes,
            topic: nextTopic || '',
          });
        } else if (currentShowForm) {
          const markerRef = await addDoc(collection(db, 'markers'), {
            ownerId: auth.currentUser.uid,
            lat: currentShowForm.lat,
            lng: currentShowForm.lng,
            type,
            name,
            notes,
            address,
            territory,
            contactInfo: contactInfo || '',
            nextTopic: nextTopic || '',
            nextVisitDate: nextVisitDate ? new Date(nextVisitDate) : null,
            lastSummary: notes,
            visitCount: 1,
            lastVisitDate: serverTimestamp(),
            createdAt: serverTimestamp(),
          });

          // Add initial history entry
          await addDoc(collection(db, 'history'), {
            ownerId: auth.currentUser.uid,
            targetId: markerRef.id,
            previousType: 'none',
            currentType: type,
            date: serverTimestamp(),
            notes: notes,
            topic: nextTopic || '',
          });
        }
      } catch (error) {
        console.error('Error in background sync:', error);
        handleFirestoreError(error, 'create', 'markers');
      }
    })();
  };

  const handleDeleteMarker = async (id: string) => {
    if (!id) return;
    
    // Clear the confirmation modal state immediately for fluid feel
    setMarkerToDelete(null);
    
    try {
      await deleteDoc(doc(db, 'markers', id));
      toast.success('Punto eliminado');
    } catch (error) {
      console.error('Error deleting marker:', error);
      toast.error('Error al eliminar');
    }
  };

  const goToMyLocation = () => {
    if (userPos) {
      setCenter(userPos);
      setZoom(18);
      setMapTrigger(prev => prev + 1);
    } else {
      // Show manual loading indicator or message
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setCenter(newPos);
          setUserPos(newPos);
          setZoom(18);
          setMapTrigger(prev => prev + 1);
        },
        (err) => {
          console.error('Error getting location:', err);
          alert('No se pudo obtener la ubicación. Activá el GPS.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const getIcon = (type: MarkerData['type']) => {
    switch (type) {
      case 'no_casa': return NO_CASA_ICON;
      case 'revisita': return REVISITA_ICON;
      case 'estudio': return ESTUDIO_ICON;
      default: return NO_CASA_ICON;
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'markers'), where('ownerId', '==', auth.currentUser.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setIsSyncing(snapshot.metadata.hasPendingWrites);
    });
    return unsub;
  }, []);

  return (
    <div className="h-full w-full rounded-3xl overflow-hidden shadow-2xl border border-white relative bg-slate-100">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        className="h-full w-full z-10" 
        preferCanvas={true}
        zoomControl={false}
        markerZoomAnimation={true}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          keepBuffer={8}
          updateWhenIdle={false}
          updateWhenZooming={true}
        />
        
        <MapViewUpdater center={center} zoom={zoom} trigger={mapTrigger} />
        <LocationEvents 
          onContextMenu={(lat, lng) => setShowForm({ lat, lng })}
          onMove={(pos, z) => {
            localStorage.setItem('last_map_pos', JSON.stringify(pos));
            localStorage.setItem('last_map_zoom', z.toString());
          }}
        />

        {userPos && (
          <Marker position={userPos} icon={USER_LOCATION_ICON} zIndexOffset={1000} />
        )}

        {markers.map((m) => (
          <Marker 
            key={m.id} 
            position={[m.lat, m.lng]} 
            icon={getIcon(m.type)}
          >
            <Popup className="rounded-2xl overflow-hidden">
               <div className="p-2 min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${m.type === 'no_casa' ? 'bg-red-500' : m.type === 'revisita' ? 'bg-green-500' : 'bg-orange-500'}`} />
                  <h3 className="font-bold text-slate-800 text-sm">
                    {m.name || (m.type === 'no_casa' ? 'No en casa' : m.type === 'revisita' ? 'Revisita' : 'Estudio')}
                  </h3>
                </div>
                {m.territory && <p className="text-[10px] text-blue-600 font-bold mb-1 uppercase tracking-tighter">Territorio: {m.territory}</p>}
                {m.address && <p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1 font-bold italic"><MapPin className="w-3 h-3" /> {m.address}</p>}
                {m.notes && <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 mb-3">{m.notes}</p>}
                
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingMarker(m);
                    }}
                    className="flex-1 py-3 bg-blue-50 text-blue-600 text-xs font-black rounded-xl hover:bg-blue-100 transition-colors uppercase tracking-widest"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (m.type === 'no_casa') {
                        handleDeleteMarker(m.id);
                      } else {
                        setMarkerToDelete(m.id);
                      }
                    }}
                    className="flex-1 py-3 bg-red-50 text-red-600 text-xs font-black rounded-xl hover:bg-red-100 transition-colors uppercase tracking-widest"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Floating Instructions */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001] w-[80%] pointer-events-none">
         <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/50 text-[10px] font-black text-slate-600 text-center uppercase tracking-widest">
            Mantené pulsado el mapa para marcar
         </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {markerToDelete && (
          <div className="absolute inset-0 z-[3000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] p-8 w-full max-w-xs shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 rotate-45" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">¿Eliminar punto?</h3>
              <p className="text-slate-500 text-sm mb-8">Esta acción no se puede deshacer y borrará todo el historial asociado.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setMarkerToDelete(null)}
                  className="flex-1 py-3 text-slate-400 font-bold"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDeleteMarker(markerToDelete)}
                  className="flex-1 py-3 bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-100"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Form Modal */}
      {(showForm || editingMarker) && (
        <div className="absolute inset-0 z-[2000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-[2.5rem] shadow-2xl p-8 w-full max-w-sm border border-slate-100"
          >
            <h2 className="text-2xl font-black text-slate-800 mb-6">{editingMarker ? 'Editar Punto' : 'Nuevo Punto'}</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddMarker(
                selectedType,
                formData.get('notes') as string,
                formData.get('address') as string || '',
                formData.get('territory') as string,
                formData.get('name') as string || '',
                formData.get('contactInfo') as string || '',
                formData.get('nextTopic') as string || '',
                formData.get('nextVisitDate') as string || ''
              );
            }}>
              <div className="relative">
                <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 scrollbar-hide pb-4">
                  <select 
                    name="type" 
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as any)}
                    className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 mb-2"
                  >
                    <option value="no_casa">No en casa (Rojo)</option>
                    <option value="revisita">Revisita (Verde)</option>
                    <option value="estudio">Estudio (Naranja)</option>
                  </select>
                  
                  {selectedType === 'no_casa' ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                      <input name="territory" type="text" defaultValue={editingMarker?.territory} className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold" placeholder="Territorio #" />
                      <textarea name="notes" defaultValue={editingMarker?.notes} className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none h-32" placeholder="Observaciones (opcional)" />
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div className="grid grid-cols-2 gap-3">
                        <input name="territory" type="text" defaultValue={editingMarker?.territory} className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold" placeholder="Territorio #" />
                        <input name="name" type="text" defaultValue={editingMarker?.name} className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold" placeholder="Nombre" />
                      </div>

                      <input name="address" type="text" defaultValue={editingMarker?.address} className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none" placeholder="Dirección / Puerta" />
                      <input name="contactInfo" type="text" defaultValue={editingMarker?.contactInfo} className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none" placeholder="Teléfono / Contacto" />
                      <textarea name="notes" defaultValue={editingMarker?.notes} className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none h-24" placeholder="¿De qué hablaron hoy?" />
                      
                      <div className="bg-blue-50 p-4 rounded-2xl space-y-3">
                         <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Próxima Visita</p>
                         <input name="nextTopic" type="text" defaultValue={editingMarker?.nextTopic} className="w-full p-3 rounded-xl bg-white border-none outline-none text-sm" placeholder="Tema a tratar..." />
                         <input 
                           name="nextVisitDate" 
                           type="datetime-local" 
                           className="w-full p-3 rounded-xl bg-white border-none outline-none text-sm font-bold text-slate-800" 
                           defaultValue={(() => {
                              if (!editingMarker?.nextVisitDate) return '';
                              const d = editingMarker.nextVisitDate;
                              const date = d.toDate ? d.toDate() : (d.seconds ? new Date(d.seconds * 1000) : new Date(d));
                              try {
                                return format(date, "yyyy-MM-dd'T'HH:mm");
                              } catch (e) {
                                return '';
                              }
                           })()}
                         />
                      </div>
                    </div>
                  )}
                </div>
                {selectedType !== 'no_casa' && (
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none rounded-b-[2.5rem]" />
                )}
                {selectedType !== 'no_casa' && (
                  <div className="flex justify-center mt-2">
                    <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex flex-col items-center animate-bounce">
                      <span>Más opciones abajo</span>
                      <Plus className="w-3 h-3 rotate-180" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => { setShowForm(null); setEditingMarker(null); }} className="flex-1 py-4 text-slate-400 font-bold">Cancelar</button>
                <button type="submit" className="flex-2 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100">Guardar</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {/* Location Button */}
      <div className="absolute bottom-6 right-6 z-[1001]">
         <button 
           onClick={goToMyLocation}
           className="bg-blue-600 text-white p-4 rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-90 transition-all flex items-center justify-center border-2 border-white"
           title="Mi ubicación"
         >
           <MapPin className="w-6 h-6" />
         </button>
      </div>
    </div>
  );
}

function LocationEvents({ onContextMenu, onMove }: { 
  onContextMenu: (lat: number, lng: number) => void;
  onMove: (pos: [number, number], zoom: number) => void;
}) {
  const map = useMap();

  useMapEvents({
    contextmenu(e) {
      onContextMenu(e.latlng.lat, e.latlng.lng);
    },
    longpress(e: any) {
       onContextMenu(e.latlng.lat, e.latlng.lng);
    },
    moveend() {
      const center = map.getCenter();
      onMove([center.lat, center.lng], map.getZoom());
    }
  });

  return null;
}
