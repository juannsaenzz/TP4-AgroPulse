require('dotenv').config();
const { Kafka } = require('kafkajs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KAFKA_BROKERS = process.env.KAFKA_BROKERS || 'redpanda:29092';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const kafka = new Kafka({
  clientId: 'agropulse-worker',
  brokers: KAFKA_BROKERS.split(',')
});
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'supabase-ingest-group' });

async function main() {
  try {
    await producer.connect();
    console.log("Kafka Producer connected");
    await consumer.connect();
    console.log("Kafka Consumer connected");
    
    await consumer.subscribe({ topic: 'soil.moisture', fromBeginning: false });

    // 1. Consumer Loop
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const payload = JSON.parse(message.value.toString());
          console.log(`[CONSUMER] Received reading for station: ${payload.station_id} -> ${payload.moisture_pct}%`);
          
          const { error } = await supabase.from('readings').insert({
            station_id: payload.station_id,
            moisture_pct: payload.moisture_pct,
            temp_c: payload.temp_c,
            measured_at: payload.ts,
            source: 'sensor'
          });
          if (error) console.error("[CONSUMER] Error inserting reading:", error);
        } catch (err) {
          console.error("[CONSUMER] Error processing message:", err);
        }
      },
    });

    // 2. Simulator Loop
    const stationState = {};
    setInterval(async () => {
      const { data: stations, error } = await supabase.from('stations').select('id, plot_id');
      if (error || !stations) return;
      
      const { data: valves } = await supabase.from('valves').select('plot_id, status');
      
      for (const station of stations) {
        if (!stationState[station.id]) {
          stationState[station.id] = { 
            moisture: Math.floor(Math.random() * 40) + 15, 
            temp: Math.floor(Math.random() * 10) + 20 
          };
        }
        
        const state = stationState[station.id];
        const stationValve = valves?.find(v => v.plot_id === station.plot_id);
        const isIrrigating = stationValve && stationValve.status === 'open';
        
        if (isIrrigating) {
          state.moisture = Math.min(100, state.moisture + (Math.random() * 1.0 + 0.5));
        } else {
          state.moisture = Math.max(0, state.moisture - (Math.random() * 0.2 + 0.1));
        }
        
        state.temp = state.temp + (Math.random() * 1 - 0.5);
        state.temp = Math.max(10, Math.min(45, state.temp));
        
        const payload = {
          station_id: station.id,
          moisture_pct: Math.round(state.moisture * 10) / 10,
          temp_c: Math.round(state.temp * 10) / 10,
          ts: new Date().toISOString()
        };
        
        await producer.send({
          topic: 'soil.moisture',
          messages: [{ value: JSON.stringify(payload) }]
        });
      }
    }, 5000);

    // 3. Command Processor Loop
    setInterval(async () => {
      const { data: pendingCommands, error } = await supabase
        .from('irrigation_commands')
        .select('*')
        .eq('status', 'pending');
        
      if (error) {
        console.error("[PROCESSOR] Error fetching commands:", error);
        return;
      }
      
      for (const cmd of pendingCommands) {
        console.log(`[PROCESSOR] Processing command ${cmd.id} for valve ${cmd.valve_id}`);
        
        const { error: cmdError } = await supabase
          .from('irrigation_commands')
          .update({ status: 'applied', applied_at: new Date().toISOString() })
          .eq('id', cmd.id);
          
        if (!cmdError) {
          const valveStatus = cmd.action === 'abrir' ? 'open' : 'closed';
          await supabase
            .from('valves')
            .update({ status: valveStatus })
            .eq('id', cmd.valve_id);
            
          console.log(`[PROCESSOR] Applied command ${cmd.id}. Valve is now ${valveStatus}`);
        } else {
          console.error("[PROCESSOR] Error applying command:", cmdError);
        }
      }
    }, 2000);

    // 4. Auto-Close Processor Loop
    setInterval(async () => {
      const { data: openValves } = await supabase.from('valves').select('id, plot_id').eq('status', 'open');
      if (!openValves) return;
      
      for (const valve of openValves) {
        const { data: cmd } = await supabase
          .from('irrigation_commands')
          .select('*')
          .eq('valve_id', valve.id)
          .eq('action', 'abrir')
          .eq('status', 'applied')
          .not('duration_min', 'is', null)
          .order('applied_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cmd) {
          const appliedTime = new Date(cmd.applied_at).getTime();
          const durationMs = cmd.duration_min * 60 * 1000;
          
          if (Date.now() > appliedTime + durationMs) {
            console.log(`[AUTO-CLOSE] Time expired for command ${cmd.id}. Closing valve ${cmd.valve_id}...`);
            
            const { error: insertErr } = await supabase.from('irrigation_commands').insert({
              valve_id: cmd.valve_id,
              action: 'cerrar',
              status: 'pending',
              client_request_id: require('crypto').randomUUID()
            });
            
            if (insertErr) console.error("[AUTO-CLOSE] Error:", insertErr);
            else {
              await supabase.from('alerts').insert({
                plot_id: valve.plot_id,
                type: 'riego_terminado',
                created_at: new Date().toISOString()
              });
            }
          }
        }
      }
    }, 10000);

  } catch (err) {
    console.error("Fatal error:", err);
  }
}

main();



