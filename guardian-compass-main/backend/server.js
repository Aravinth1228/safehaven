const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // ⚠️ Use Service Role Key (server-side only!)
);

// ========================================
// ROUTES
// ========================================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Get all users (Admin only)
app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', req.params.id)
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user status
app.patch('/api/users/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    const { data, error } = await supabase
      .from('profiles')
      .update({ status, updated_at: new Date() })
      .eq('user_id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    // Create alert if status is alert/danger
    if (status === 'alert' || status === 'danger') {
      await supabase.from('alerts').insert({
        user_id: req.params.id,
        tourist_id: data.tourist_id,
        username: data.username,
        status: status,
        alert_type: 'status_change'
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all danger zones
app.get('/api/danger-zones', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('danger_zones')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create danger zone (Admin only)
app.post('/api/danger-zones', async (req, res) => {
  try {
    const { name, lat, lng, radius, level, created_by } = req.body;

    const { data, error } = await supabase
      .from('danger_zones')
      .insert({ name, lat, lng, radius, level, created_by })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all active alerts
app.get('/api/alerts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('dismissed', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Dismiss alert
app.patch('/api/alerts/:id/dismiss', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .update({ dismissed: true })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user location
app.post('/api/locations', async (req, res) => {
  try {
    const { user_id, tourist_id, lat, lng } = req.body;

    // Upsert location
    const { data, error } = await supabase
      .from('user_locations')
      .upsert(
        { user_id, tourist_id, lat, lng, updated_at: new Date() },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) throw error;

    // Check if user is in danger zone
    const { data: zones } = await supabase
      .from('danger_zones')
      .select('*');

    for (const zone of zones || []) {
      const distance = calculateDistance(lat, lng, zone.lat, zone.lng);
      if (distance <= zone.radius) {
        // User entered danger zone - create alert
        await supabase.from('alerts').insert({
          user_id,
          tourist_id,
          username: data.username || 'Unknown',
          status: 'danger',
          alert_type: 'entered_danger_zone',
          lat,
          lng,
          zone_name: zone.name,
          zone_level: zone.level
        });
      }
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Analytics endpoint
app.get('/api/analytics', async (req, res) => {
  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('status');

    const { data: alerts } = await supabase
      .from('alerts')
      .select('*')
      .eq('dismissed', false);

    const stats = {
      total_users: profiles?.length || 0,
      safe_users: profiles?.filter(p => p.status === 'safe').length || 0,
      alert_users: profiles?.filter(p => p.status === 'alert').length || 0,
      danger_users: profiles?.filter(p => p.status === 'danger').length || 0,
      active_alerts: alerts?.length || 0
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});