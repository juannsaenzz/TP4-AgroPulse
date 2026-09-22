import React, { useEffect, useState } from 'react';
import { View, KeyboardAvoidingView, Platform, Text, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput, ScrollView, Dimensions, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/components/AuthProvider';
import * as Location from 'expo-location';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get("window").width;

export default function PlotDetailScreen() {
  const { id } = useLocalSearchParams();
  const { session } = useAuth();
  
  const [plot, setPlot] = useState(null);
  const [reading, setReading] = useState(null);
  const [history, setHistory] = useState([]);
  const [valve, setValve] = useState(null);
  const [hasPendingCommand, setHasPendingCommand] = useState(false);
    const [historyCommands, setHistoryCommands] = useState([]);
  const [manualMoisture, setManualMoisture] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  const submitManualMoisture = async () => {
    if (!manualMoisture || isNaN(manualMoisture) || manualMoisture < 0 || manualMoisture > 100) {
      Alert.alert('Error', 'Ingresá un valor de humedad válido entre 0 y 100.');
      return;
    }
    setIsSubmittingManual(true);
    const { data: stationData } = await supabase.from('stations').select('id').eq('plot_id', id).maybeSingle();
    if (!stationData) {
      Alert.alert('Error', 'No se encontró la estación.');
      setIsSubmittingManual(false);
      return;
    }
    const { error } = await supabase.from('readings').insert({
      station_id: stationData.id,
      moisture_pct: parseFloat(manualMoisture),
      temp_c: reading?.temp_c || 25,
      measured_at: new Date().toISOString(),
      source: 'manual'
    });
    if (error) {
      Alert.alert('Error', 'No se pudo guardar la lectura manual.');
    } else {
      Alert.alert('Éxito', 'Lectura manual registrada.');
      setManualMoisture('');
      fetchPlotDetails();
    }
    setIsSubmittingManual(false);
  };
  const [duration, setDuration] = useState(30);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commandLoading, setCommandLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPlotDetails();
    setRefreshing(false);
  };

  // Modal State
  const [isModalVisible, setModalVisible] = useState(false);
  const [minThreshold, setMinThreshold] = useState('');
  const [maxThreshold, setMaxThreshold] = useState('');
  const [savingThresholds, setSavingThresholds] = useState(false);

  // GPS State
  const [locationStatus, setLocationStatus] = useState('buscando');
  const [gpsError, setGpsError] = useState('');



  useEffect(() => {
    fetchPlotDetails();
  }, [id]);

  useEffect(() => {
    let intervalId;
    if (hasPendingCommand && valve) {
      intervalId = setInterval(async () => {
        // Consultar estado del último comando
        const { data: latestCommand } = await supabase
          .from('irrigation_commands')
          .select('status')
          .eq('valve_id', valve.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestCommand && latestCommand.status !== 'pending') {
          // El comando ya terminó (applied o failed)
          setHasPendingCommand(false);
          // Refrescar estado de la válvula
          const { data: updatedValve } = await supabase
            .from('valves')
            .select('*')
            .eq('id', valve.id)
            .maybeSingle();
          if (updatedValve) setValve(updatedValve);
        }
      }, 3000);
    }
    return () => clearInterval(intervalId);
  }, [hasPendingCommand, valve]);

  useEffect(() => {
    if (plot && plot.geom) {
      checkLocation();
    }
  }, [plot]);

  function parseGeoJSON(geom) {
    if (!geom || !geom.coordinates || !geom.coordinates[0]) return [];
    return geom.coordinates[0].map(coord => ({ lng: coord[0], lat: coord[1] }));
  }

  function isPointInPolygon(point, polygon) {
    const x = point.lng, y = point.lat;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng, yi = polygon[i].lat;
      const xj = polygon[j].lng, yj = polygon[j].lat;
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  async function checkLocation() {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denegado');
        setGpsError('Permiso denegado por el usuario.');
        return;
      }

      let location = await Location.getLastKnownPositionAsync({});
      
      if (!location) {
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      }

      const userPoint = { lat: location.coords.latitude, lng: location.coords.longitude };
      const polygon = parseGeoJSON(plot.geom);
      
      if (isPointInPolygon(userPoint, polygon)) {
        setLocationStatus('adentro');
      } else {
        setLocationStatus('afuera');
      }
    } catch (error) {
      setLocationStatus('denegado');
      setGpsError(error.message || 'Error desconocido al obtener GPS.');
    }
  }

  async function fetchPlotDetails() {
    try {
      if (session?.user?.id) {
        const { data: memberData, error: memberError } = await supabase
          .from('memberships')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (memberData) setRole(memberData.role);
        if (memberError) console.error("memberError", memberError);
      }

      const { data: plotData, error: plotError } = await supabase
        .from('plots')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (plotError) console.error("plotError", plotError);
      
      if (plotData) {
        setPlot(plotData);
        if (plotData.threshold_min) setMinThreshold(plotData.threshold_min.toString());
        if (plotData.threshold_max) setMaxThreshold(plotData.threshold_max.toString());
      }

      const { data: valveData, error: valveError } = await supabase
        .from('valves')
        .select('*')
        .eq('plot_id', id)
        .maybeSingle();
      
      if (valveError) console.error("valveError", valveError);
      if (valveData) {
        setValve(valveData);
        
        // Fetch command history
        const { data: cmdHistory } = await supabase
          .from('irrigation_commands')
          .select('*')
          .eq('valve_id', valveData.id)
          .order('created_at', { ascending: false })
          .limit(20);
        if (cmdHistory) setHistoryCommands(cmdHistory);

        const { data: latestCommand } = await supabase
          .from('irrigation_commands')
          .select('status')
          .eq('valve_id', valveData.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latestCommand?.status === 'pending') {
          setHasPendingCommand(true);
        }
      }

      const { data: stationData, error: stationError } = await supabase
        .from('stations')
        .select('id')
        .eq('plot_id', id)
        .maybeSingle();
        
      if (stationError) console.error("stationError", stationError);
      
      if (stationData) {
        const { data: readings, error: readingError } = await supabase
          .from('readings')
          .select('*')
          .eq('station_id', stationData.id)
          .order('measured_at', { ascending: false })
          .limit(10);
          
        if (readingError) console.error("readingError", readingError);
        
        if (readings && readings.length > 0) {
          setReading(readings[0]);
          setHistory(readings.reverse());
        } else {
           console.log("No sensor readings found for station", stationData.id);
        }
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      Alert.alert('Error DB', 'Ocurrió un problema al cargar los datos');
    } finally {
      setLoading(false);
    }
  }

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async function toggleValve() {
    if (role === 'advisor') return;
    
    setCommandLoading(true);
    try {
      const { error } = await supabase
        .from('irrigation_commands')
                        .insert({
          valve_id: valve.id,
          action: isValveOpen ? 'cerrar' : 'abrir',
          duration_min: isValveOpen ? null : duration,
          status: 'pending',
          client_request_id: generateUUID()
        });

      if (error) {
        console.error("Toggle Valve Error:", error);
        Alert.alert('Error de Permisos', 'No tenés permisos para escribir en irrigation_commands. Verificá las políticas RLS en Supabase.');
        throw error;
      }

      const { error: updateError } = await supabase
        .from('valves')
        .update({ is_open: !valve.is_open })
        .eq('id', valve.id);
        
      
      setHasPendingCommand(true);

      setValve({ ...valve, is_open: !valve.is_open });
    } catch (error) {
      console.log(error);
    } finally {
      setCommandLoading(false);
    }
  }

  async function saveThresholds() {
    setSavingThresholds(true);
    try {
      const { error } = await supabase
        .from('plots')
        .update({ 
          threshold_min: parseInt(minThreshold),
          threshold_max: parseInt(maxThreshold)
        })
        .eq('id', plot.id);
      
      if (error) throw error;
      
      setPlot({ ...plot, threshold_min: parseInt(minThreshold), threshold_max: parseInt(maxThreshold) });
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Error Umbrales', error?.message || 'Error desconocido');
    } finally {
      setSavingThresholds(false);
    }
  }

  if (loading) return (
    <View className="flex-1 items-center justify-center bg-slate-50">
      <ActivityIndicator size="large" color="#F7C35F" />
    </View>
  );

  if (!plot) return (
    <View className="flex-1 items-center justify-center bg-slate-50">
      <Text className="text-gray-500">Lote no encontrado</Text>
    </View>
  );

    const isValveOpen = valve?.status === 'open';
  const isAdvisor = role === 'advisor';
  
  const computedMinThreshold = plot.threshold_min ?? 25;
  const computedMaxThreshold = plot.threshold_max ?? 45;

  const readingTime = reading ? new Date(reading.measured_at) : null;
  const isStale = !readingTime || (new Date() - readingTime) > 900000;

  let moistureStatus = 'Sin datos (Stale)';
  let moistureColor = '#9ca3af';

  if (!isStale) {
    if (reading.moisture_pct < computedMinThreshold) {
      moistureStatus = 'Seco (Dry)';
      moistureColor = '#ef4444';
    } else if (reading.moisture_pct > computedMaxThreshold) {
      moistureStatus = 'Húmedo (Wet)';
      moistureColor = '#3b82f6';
    } else {
      moistureStatus = 'Óptimo (Optimal)';
      moistureColor = '#10b981';
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : null} style={{flex: 1}}><ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#263C28" />}>
      <View className="mb-4 flex-row justify-between items-start">
        <View>
          <Text className="text-gray-800 text-3xl font-bold">{plot.name}</Text>
          <Text className="text-gray-500 text-lg mb-2">Cultivo: {plot.crop}</Text>
          
          <View className="flex-row items-center mt-2">
            <Ionicons name="location" size={16} color={locationStatus === 'adentro' ? '#F7C35F' : '#9ca3af'} />
            <Text className="text-gray-500 text-sm ml-1 font-medium">
              {locationStatus === 'buscando' && 'Buscando GPS...'}
              {locationStatus === 'denegado' && 'Ubicación no disponible'}
              {locationStatus === 'adentro' && 'Estás dentro del lote'}
              {locationStatus === 'afuera' && 'Estás fuera del lote'}
            </Text>
          </View>
          {locationStatus === 'denegado' && gpsError ? (
            <Text className="text-gray-400 text-xs mt-1">{gpsError}</Text>
          ) : null}
        </View>
        
        {role === 'producer' && (
          <TouchableOpacity 
            className="bg-secondary p-3 rounded-full"
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="settings" size={24} color="#F7C35F" />
          </TouchableOpacity>
        )}
      </View>

      <View className="bg-secondary p-6 rounded-3xl shadow-sm mb-4 border border-gray-100 flex-row items-center justify-between">
        <View>
          <Text className="text-gray-300 text-base mb-1">Humedad del Suelo</Text>
          <Text className="text-4xl font-bold" style={{ color: moistureColor }}>
            {reading ? `${reading.moisture_pct}%` : '--%'}
          </Text>
          <Text className="text-sm mt-1" style={{ color: moistureColor }}>
            Estado: {moistureStatus}
          </Text>
          <Text className="text-xs text-gray-400 mt-1 italic">
            {isStale ? 'Desactualizado' : 'En línea'}
          </Text>
        </View>
        <View className={`bg-primary p-4 rounded-full ${isStale ? 'opacity-50' : ''}`}>
          <Ionicons name="water" size={32} color={moistureColor} />
        </View>
      </View>

      <View className="bg-secondary p-6 rounded-3xl shadow-sm mb-6 border border-gray-100 flex-row items-center justify-between">
        <View>
          <Text className="text-gray-300 text-base mb-1">Temperatura</Text>
          <Text className={`text-4xl font-bold ${isStale ? 'text-gray-400' : 'text-white'}`}>
            {reading ? `${reading.temp_c}°C` : '--°C'}
          </Text>
        </View>
        <View className={`bg-primary p-4 rounded-full ${isStale ? 'opacity-50' : ''}`}>
          <Ionicons name="thermometer" size={32} color={isStale ? '#9ca3af' : '#f97316'} />
        </View>
      </View>

      {history.length > 1 && (
        <View className="bg-secondary p-6 rounded-3xl shadow-sm mb-6 border border-gray-100">
          <Text className="text-gray-300 font-semibold mb-4 uppercase tracking-wider text-center">Evolución (Últimas 6hs)</Text>
          <LineChart
            data={{
              labels: history.map((h, i) => {
                if (i === 0) return "Hace 6hs";
                if (i === Math.floor(history.length / 2)) return "Hace 3hs";
                if (i === history.length - 1) return "Ahora";
                return "";
              }),
              datasets: [{
                data: history.map(h => h.moisture_pct)
              }]
            }}
            width={screenWidth - 80}
            height={180}
            yAxisSuffix="%"
            chartConfig={{
              backgroundColor: "#2D442F",
              backgroundGradientFrom: "#2D442F",
              backgroundGradientTo: "#2D442F",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(247, 195, 95, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(209, 213, 219, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: "4", strokeWidth: "2", stroke: "#F7C35F" }
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
          />
        </View>
      )}

            {valve && (
        <View className="bg-secondary p-6 rounded-3xl shadow-sm border border-gray-100 mt-auto">
          <Text className="text-center text-gray-300 mb-4 font-semibold uppercase tracking-wider">Control de Riego</Text>
          
          {!isValveOpen && !isAdvisor && !hasPendingCommand && (
            <View className="mb-4">
              <View className="flex-row justify-center space-x-2 mb-3 gap-2">
                {[15, 30, 60].map(min => (
                  <TouchableOpacity 
                    key={min} 
                    onPress={() => setDuration(min)}
                    className={`px-4 py-2 rounded-full border ${duration === min ? 'bg-accent border-accent' : 'bg-transparent border-gray-500'}`}
                  >
                    <Text className={`font-bold ${duration === min ? 'text-primary' : 'text-gray-400'}`}>{min} min</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View className="flex-row items-center justify-center">
                <Text className="text-gray-400 mr-2">O personalizar:</Text>
                <TextInput
                  className="bg-gray-800 text-white px-4 py-2 rounded-xl text-center border border-gray-600 w-24"
                  keyboardType="numeric"
                  value={duration ? duration.toString() : ''}
                  onChangeText={(val) => {
                    if (val === '') setDuration('');
                    else {
                      const num = parseInt(val);
                      if (!isNaN(num)) setDuration(num);
                    }
                  }}
                />
                <Text className="text-gray-400 ml-2">minutos</Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={toggleValve}
            disabled={commandLoading || isAdvisor || hasPendingCommand}
            className={`p-5 rounded-2xl flex-row justify-center items-center ${isAdvisor ? 'bg-gray-500' : hasPendingCommand ? 'bg-orange-500' : isValveOpen ? 'bg-red-500' : 'bg-accent'}`}
          >
            {commandLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name={isAdvisor ? 'lock-closed' : hasPendingCommand ? 'time' : isValveOpen ? 'stop-circle' : 'water'} size={24} color={isAdvisor ? 'white' : hasPendingCommand ? 'white' : '#263C28'} />
                <Text className={`text-xl font-bold ml-3 ${isAdvisor || hasPendingCommand ? 'text-white' : 'text-primary'}`}>
                  {isAdvisor ? 'PERMISOS INSUFICIENTES' : hasPendingCommand ? 'COMANDO EN PROCESO' : isValveOpen ? 'CERRAR VÁLVULA' : `ABRIR VÁLVULA (${duration}m)`}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <Text className="text-center text-gray-400 text-xs mt-3">
            {isAdvisor ? 'Modo Asesor: Sólo lectura.' : `Estado actual de ${valve.name}: ${isValveOpen ? 'ABIERTA' : 'CERRADA'}`}
          </Text>
        </View>
      )}

      {/* Modal de Configuración de Umbrales */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="bg-primary w-full rounded-3xl p-6 border border-secondary">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-white">Ajustes del Lote</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-300 mb-4">
              Establecé los límites de humedad para {plot.name}. Si la humedad cae por debajo del mínimo, el estado cambiará a Crítico.
            </Text>

            <View className="mb-4">
              <Text className="text-gray-400 font-semibold mb-2">Humedad Mínima (%)</Text>
              <TextInput
                className="bg-secondary text-white p-4 rounded-xl text-lg border border-gray-600"
                keyboardType="numeric"
                value={minThreshold}
                onChangeText={setMinThreshold}
              />
            </View>

            <View className="mb-8">
              <Text className="text-gray-400 font-semibold mb-2">Humedad Máxima (%)</Text>
              <TextInput
                className="bg-secondary text-white p-4 rounded-xl text-lg border border-gray-600"
                keyboardType="numeric"
                value={maxThreshold}
                onChangeText={setMaxThreshold}
              />
            </View>

            <TouchableOpacity 
              className="bg-accent p-4 rounded-xl items-center mb-6"
              onPress={saveThresholds}
              disabled={savingThresholds}
            >
              {savingThresholds ? <ActivityIndicator color="#263C28" /> : <Text className="text-primary font-bold text-lg">Guardar Umbrales</Text>}
            </TouchableOpacity>

            <View className="border-t border-secondary pt-6">
              <Text className="text-xl font-bold text-white mb-2 text-center">Forzar Humedad (Admin)</Text>
              <Text className="text-gray-400 text-xs text-center mb-4">Ingresa un valor manual para sobrescribir el sensor.</Text>
              
              <View className="flex-row items-center">
                <TextInput
                  className="flex-1 bg-secondary text-white border border-gray-600 rounded-xl px-4 py-3 mr-3 text-lg"
                  placeholder="Ej: 45"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={manualMoisture}
                  onChangeText={setManualMoisture}
                />
                <TouchableOpacity 
                  className={`bg-accent px-6 py-4 rounded-xl justify-center items-center ${isSubmittingManual ? 'opacity-50' : ''}`}
                  onPress={submitManualMoisture}
                  disabled={isSubmittingManual}
                >
                  {isSubmittingManual ? (
                    <ActivityIndicator color="#263C28" size="small" />
                  ) : (
                    <Text className="text-primary font-bold">Cargar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

          

      <View className="mb-6 mt-8">
        <Text className="text-xl font-bold text-primary mb-4">Historial de Riegos</Text>
        {historyCommands.length === 0 ? (
          <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <Text className="text-gray-400 text-center py-4">No hay riegos registrados.</Text>
          </View>
        ) : (
          historyCommands.map((cmd) => (
            <View key={cmd.id} className="bg-primary rounded-3xl p-5 mb-4 shadow-sm flex-row items-center border border-primary">
              <View className="p-3 rounded-full mr-4 bg-[#2D442F]">
                <Ionicons name={cmd.action === 'abrir' ? 'water' : 'stop-circle'} size={24} color={cmd.action === 'abrir' ? '#34d399' : '#ef4444'} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-white">
                  {cmd.action === 'abrir' ? 'Apertura de Válvula' : 'Cierre de Válvula'}
                </Text>
                <Text className="text-sm mt-1 text-gray-300">
                  {cmd.duration_min && cmd.action === 'abrir' ? `Duración: ${cmd.duration_min} min` : 'Operación del sistema'}
                </Text>
                <Text className="text-xs mt-2 text-accent">
                  {new Date(cmd.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                </Text>
              </View>
              <View className="items-end ml-2">
                <View className={`px-3 py-1 rounded-full ${cmd.status === 'applied' ? 'bg-[#10b981]/20' : cmd.status === 'failed' ? 'bg-[#ef4444]/20' : 'bg-[#f59e0b]/20'}`}>
                  <Text className={`font-bold text-xs ${cmd.status === 'applied' ? 'text-[#34d399]' : cmd.status === 'failed' ? 'text-[#f87171]' : 'text-[#fcd34d]'}`}>
                    {cmd.status === 'applied' ? 'APLICADO' : cmd.status === 'failed' ? 'FALLÓ' : 'PENDIENTE'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}
































