import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Fix Leaflet default icon paths
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.Icon.Default.prototype;
(DefaultIcon as any).options.iconUrl = icon;
(DefaultIcon as any).options.shadowUrl = iconShadow;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
);
