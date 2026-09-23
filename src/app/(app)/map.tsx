import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { supabase } from '@/lib/supabase';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

export default function MapScreen() {
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const webViewRef = useRef(null);

  useEffect(() => {
    fetchPlots();
    fetchUserLocation();
    
    const interval = setInterval(() => {
      fetchPlots(false);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (webViewRef.current && plots.length > 0 && !loading) {
      const currentGeojson = {
        type: "FeatureCollection",
        features: plots.map(plot => {
          let geomObj = plot.geom;
          if (typeof plot.geom === 'string') {
            try { geomObj = JSON.parse(plot.geom); } catch (e) { }
          }
          return {
            type: "Feature",
            properties: { 
              name: plot.name, 
              crop: plot.crop,
              moisture: plot.moisture,
              min: plot.threshold_min,
              max: plot.threshold_max
            },
            geometry: geomObj
          };
        })
      };

      const script = `
        if (window.geojsonLayer) {
          window.geojsonLayer.clearLayers();
          window.geojsonLayer.addData(${JSON.stringify(currentGeojson)});
        }
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [plots]);

  async function fetchUserLocation() {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getLastKnownPositionAsync({});
        if (!location) {
          location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        }
        if (location) {
          setUserLocation({ lat: location.coords.latitude, lng: location.coords.longitude });
        }
      }
    } catch (err) {
      console.log('Error obteniendo ubicación para el mapa:', err);
    }
  }

  async function fetchPlots(showLoading = true) {
    if (showLoading && plots.length === 0) setLoading(true);
    try {
      const { data: plotsData } = await supabase.from('vw_plots').select('*');
      
      const enrichedPlots = await Promise.all((plotsData || []).map(async (plot) => {
        const { data: station } = await supabase.from('stations').select('id').eq('plot_id', plot.id).maybeSingle();
        let moisture = null;
        if (station) {
          const { data: reading } = await supabase.from('readings').select('moisture_pct').eq('station_id', station.id).order('measured_at', { ascending: false }).limit(1).maybeSingle();
          if (reading) moisture = reading.moisture_pct;
        }
        return { ...plot, moisture };
      }));
      setPlots(enrichedPlots);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function centerOnUser() {
    if (userLocation && webViewRef.current) {
      // Leaflet 'flyTo' hace un movimiento de paneo mucho más suave y espectacular que 'setView'
      const script = `map.flyTo([${userLocation.lat}, ${userLocation.lng}], 15, { animate: true, duration: 2.0 }); true;`;
      webViewRef.current.injectJavaScript(script);
    }
  }



  const geojson = {
    type: "FeatureCollection",
    features: plots.map(plot => {
      let geomObj = plot.geom;
      if (typeof plot.geom === 'string') {
        try { geomObj = JSON.parse(plot.geom); } catch (e) { }
      }
      return {
        type: "Feature",
        properties: { 
          name: plot.name, 
          crop: plot.crop,
          moisture: plot.moisture,
          min: plot.threshold_min,
          max: plot.threshold_max
        },
        geometry: geomObj
      };
    })
  };

  const centerLat = userLocation ? userLocation.lat : -31.3970;
  const centerLng = userLocation ? userLocation.lng : -58.0130;
  const zoomLevel = userLocation ? 15 : 11;

  const mapHtml = useMemo(() => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { padding: 0; margin: 0; background-color: #000; }
        html, body, #map { height: 100vh; width: 100vw; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${centerLat}, ${centerLng}], ${zoomLevel});
        
        L.tileLayer('http://mt0.google.com/vt/lyrs=y&hl=es&x={x}&y={y}&z={z}', {
          maxZoom: 20
        }).addTo(map);

        var data = ${JSON.stringify(geojson)};
        
        window.geojsonLayer = L.geoJSON(data, {
          style: function (feature) {
            var moisture = feature.properties.moisture;
            var min = feature.properties.min;
            var max = feature.properties.max;
            
            var fillColor = '#10b981';
            var borderColor = '#34d399';
            
            if (moisture !== null) {
              if (moisture < min) {
                fillColor = '#e11d48'; // Red (Crtico)
                borderColor = '#fb7185';
              } else if (moisture > max) {
                fillColor = '#3b82f6'; // Orange (Exceso)
                borderColor = '#60a5fa';
              } else {
                fillColor = '#10b981'; // Green (ptimo)
                borderColor = '#34d399';
              }
            } else {
               fillColor = '#9ca3af'; // Gray
               borderColor = '#d1d5db';
            }

            return {
              color: borderColor,
              weight: 3,
              fillColor: fillColor,
              fillOpacity: 0.5
            };
          },
          onEachFeature: function (feature, layer) {
            var moistureText = feature.properties.moisture !== null ? feature.properties.moisture + "%" : "Sin datos";
            layer.bindPopup("<div style='font-family:sans-serif;text-align:center;'><b>" + feature.properties.name + "</b><br>Humedad: " + moistureText + "</div>");
          }
        }).addTo(map);

        ${userLocation ? `
        var userIcon = L.divIcon({
          className: 'custom-user-icon',
          html: "<div style='background-color:#3b82f6; width:18px; height:18px; border-radius:50%; border:3px solid white; box-shadow:0 0 10px rgba(0,0,0,0.6);'></div>",
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        L.marker([${centerLat}, ${centerLng}], {icon: userIcon}).addTo(map)
          .bindPopup("<div style='font-family:sans-serif;text-align:center;'><b>📍 Tu Ubicación Actual</b></div>");
        ` : ''}
      </script>
    </body>
    </html>
    `, [userLocation]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }]}>
        <ActivityIndicator size="large" color="#12723D" />
        <Text style={{ marginTop: 10, color: 'gray' }}>Cargando satélite y loteos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView 
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={styles.map}
        scrollEnabled={false}
        bounces={false}
      />

      {userLocation && (
        <TouchableOpacity 
          style={{ position: 'absolute', bottom: 30, right: 20, backgroundColor: '#263C28', padding: 16, borderRadius: 50, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}
          onPress={centerOnUser}
        >
          <Ionicons name="locate" size={26} color="#F7C35F" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  map: { flex: 1 },
});










