import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapPickerProps {
    lat: number;
    lng: number;
    onChange: (lat: number, lng: number) => void;
}

// Sub-component to handle map clicks
function LocationMarker({ lat, lng, setPos }: { lat: number; lng: number, setPos: (lat: number, lng: number) => void }) {
    const map = useMap();

    useMapEvents({
        click(e) {
            setPos(e.latlng.lat, e.latlng.lng);
            // map.flyTo(e.latlng, map.getZoom());
        },
    });

    // Fly to location on initial load or update if valid
    useEffect(() => {
        if (lat && lng && lat !== 0) {
            map.flyTo([lat, lng], 15);
        }
    }, [lat, lng, map]);

    return (lat !== 0 && lng !== 0) ? <Marker position={[lat, lng]} /> : null;
}

export default function MapPicker({ lat, lng, onChange }: MapPickerProps) {
    // Default center: Kathmandu University area as fallback
    const defaultCenter = { lat: 27.6190, lng: 85.5386 };
    const center = (lat && lng) ? [lat, lng] : [defaultCenter.lat, defaultCenter.lng];

    return (
        <div className="w-full h-64 rounded-lg overflow-hidden border border-slate-300 relative z-0">
            <MapContainer
                center={center as L.LatLngExpression}
                zoom={13}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker lat={lat} lng={lng} setPos={onChange} />
            </MapContainer>
        </div>
    );
}
