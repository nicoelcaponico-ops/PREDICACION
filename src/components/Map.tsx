import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { MapPin, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'motion/react';

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
  notes?: string;
  address?: string;
  lastVisitDate?: any;
}

function MapViewUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center]);
  return null;
}

export default function PreachingMap() {
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [center, setCenter] = useState<[number, number]>([-34.6037, -58.3816]); // Buenos Aires
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [showForm, setShowForm] = useState<{ lat: number, lng: number } | null>(null);

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
    // Watch location for the blue dot
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(newPos);
        // Only set center once on first location if it hasn't been set
        if (center[0] === -34.6037) {
          setCenter(newPos);
        }
      },
      (err) => console.warn('Geolocation error:', err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const handleAddMarker = async (type: MarkerData['type'], notes: string, address: string) => {
    if (!showForm || !auth.currentUser) return;

    try {
      await addDoc(collection(db, 'markers'), {
        ownerId: auth.currentUser.uid,
        lat: showForm.lat,
        lng: showForm.lng,
        type,
        notes,
        address,
        createdAt: serverTimestamp(),
      });
      setShowForm(null);
    } catch (error) {
      handleFirestoreError(error, 'create', 'markers');
    }
  };

  const goToMyLocation = () => {
    if (userPos) {
      setCenter(userPos);
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setCenter(newPos);
          setUserPos(newPos);
        },
        (err) => {
          console.error('Error getting location:', err);
          alert('No se pudo obtener la ubicación.');
        },
        { enableHighAccuracy: true }
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

  return (
    <div className="h-full w-full rounded-3xl overflow-hidden shadow-2xl border border-white relative bg-slate-100">
      <MapContainer center={center} zoom={15} className="h-full w-full z-10" preferCanvas={true}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapViewUpdater center={center} />
        <LocationEvents onContextMenu={(lat, lng) => setShowForm({ lat, lng })} />

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
                    {m.type === 'no_casa' ? 'No en casa' : m.type === 'revisita' ? 'Revisita' : 'Estudio'}
                  </h3>
                </div>
                {m.address && <p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1 font-bold italic"><MapPin className="w-3 h-3" /> {m.address}</p>}
                {m.notes && <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">{m.notes}</p>}
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

      {/* Form Modal */}
      {showForm && (
        <div className="absolute inset-0 z-[2000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-[2.5rem] shadow-2xl p-8 w-full max-w-sm border border-slate-100"
          >
            <h2 className="text-2xl font-black text-slate-800 mb-6">Nuevo Punto</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddMarker(
                formData.get('type') as MarkerData['type'],
                formData.get('notes') as string,
                formData.get('address') as string
              );
            }}>
              <div className="space-y-4">
                <select name="type" className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold text-slate-700">
                  <option value="no_casa">No en casa (Rojo)</option>
                  <option value="revisita">Revisita (Verde)</option>
                  <option value="estudio">Estudio (Naranja)</option>
                </select>
                <input name="address" type="text" className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none" placeholder="Dirección opcional" />
                <textarea name="notes" className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none h-24" placeholder="Notas..." />
              </div>
              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => setShowForm(null)} className="flex-1 py-4 text-slate-400 font-bold">Cancelar</button>
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

function LocationEvents({ onContextMenu }: { onContextMenu: (lat: number, lng: number) => void }) {
  const map = useMap();

  useMapEvents({
    contextmenu(e) {
      onContextMenu(e.latlng.lat, e.latlng.lng);
    },
    longpress(e: any) { // Some mobile devices use longpress
       onContextMenu(e.latlng.lat, e.latlng.lng);
    }
  });

  return null;
}
