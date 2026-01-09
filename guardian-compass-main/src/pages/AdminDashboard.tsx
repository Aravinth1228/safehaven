import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  MapPin, 
  AlertTriangle, 
  Shield, 
  Bell,
  CheckCircle,
  Clock,
  Plus,
  Trash2,
  LogOut,
  Wallet,
  Loader2,
  Link as LinkIcon,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/hooks/use-toast';
import MapboxMap from '@/components/MapboxMap';
import { useContract } from '@/hooks/useContract';

interface DangerZone {
  id: string;
  blockchainId?: number;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  level: 'low' | 'medium' | 'high';
}

interface Alert {
  id: number;
  touristId: string;
  username: string;
  status: string;
  timestamp: string;
  location: { lat: number; lng: number };
}

interface DangerZoneAlert {
  id: string;
  touristId: string;
  username: string;
  zoneName: string;
  zoneLevel: string;
  timestamp: string;
  location: { lat: number; lng: number };
}

interface BlockchainAlert {
  id: string;
  tourist: string;
  touristId: string;
  lat: number;
  lng: number;
  timestamp: Date;
  type: 'emergency' | 'status';
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getAllUsers, getUserLocations, adminLogout } = useAuth();
  const { disconnectWallet, walletAddress } = useWallet();
  const [users, setUsers] = useState<any[]>([]);
  const [userLocations, setUserLocations] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dangerZoneAlerts, setDangerZoneAlerts] = useState<DangerZoneAlert[]>([]);
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [newZone, setNewZone] = useState<{ name: string; lat: string; lng: string; radius: string; level: 'low' | 'medium' | 'high' }>({ name: '', lat: '', lng: '', radius: '', level: 'medium' });
  const [showAddZone, setShowAddZone] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [blockchainAlerts, setBlockchainAlerts] = useState<BlockchainAlert[]>([]);

  // Blockchain integration
  const {
    isInitialized: isContractInitialized,
    isLoading: isContractLoading,
    addDangerZone: addBlockchainDangerZone,
    removeDangerZone: removeBlockchainDangerZone,
    getAllDangerZones: getBlockchainDangerZones,
    onEmergencyAlert,
    onStatusUpdate,
    onDangerZoneAdded,
  } = useContract();

  // Setup blockchain event listeners
  useEffect(() => {
    if (!isContractInitialized) return;

    // Listen for emergency alerts from blockchain
    onEmergencyAlert((event) => {
      const newAlert: BlockchainAlert = {
        id: `bc-emergency-${Date.now()}`,
        tourist: event.tourist,
        touristId: event.touristId,
        lat: event.lat,
        lng: event.lng,
        timestamp: event.timestamp,
        type: 'emergency',
      };
      
      setBlockchainAlerts(prev => [newAlert, ...prev].slice(0, 20));
      
      toast({
        title: '🚨 Blockchain Emergency Alert!',
        description: `Emergency from ${event.touristId.slice(0, 8)}... at ${event.lat.toFixed(4)}, ${event.lng.toFixed(4)}`,
        variant: 'destructive',
      });
    });

    // Listen for status updates from blockchain
    onStatusUpdate((event) => {
      const statusNames = ['Safe', 'Alert', 'Danger'];
      const statusName = statusNames[event.status] || 'Unknown';
      
      if (event.status >= 1) { // Alert or Danger
        toast({
          title: `⚡ Blockchain Status Update`,
          description: `Tourist ${event.tourist.slice(0, 8)}... changed to ${statusName}`,
          variant: event.status === 2 ? 'destructive' : 'default',
        });
      }
    });

    // Listen for new danger zones from blockchain
    onDangerZoneAdded((event) => {
      toast({
        title: '🗺️ New Danger Zone',
        description: `Zone "${event.name}" added via blockchain`,
      });
      
      // Reload danger zones
      loadData();
    });
  }, [isContractInitialized, onEmergencyAlert, onStatusUpdate, onDangerZoneAdded, toast]);

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin');
    if (isAdmin !== 'true') {
      navigate('/admin-login');
      return;
    }

    // Load dismissed alerts
    const savedDismissed = JSON.parse(localStorage.getItem('dismissedAlerts') || '[]');
    setDismissedAlerts(new Set(savedDismissed));

    // Load data
    loadData();
    
    // Refresh every 5 seconds
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [navigate]);

  const loadData = () => {
    const allUsers = getAllUsers();
    setUsers(allUsers);

    const locations = getUserLocations();
    setUserLocations(locations);

    const savedAlerts = JSON.parse(localStorage.getItem('alerts') || '[]');
    setAlerts(savedAlerts.slice(-10).reverse());

    const savedDangerZoneAlerts = JSON.parse(localStorage.getItem('dangerZoneAlerts') || '[]');
    setDangerZoneAlerts(savedDangerZoneAlerts.slice(-10).reverse());

    const savedZones = JSON.parse(localStorage.getItem('dangerZones') || '[]');
    setDangerZones(savedZones);
  };

  const handleLogout = () => {
    adminLogout();
    disconnectWallet();
    toast({
      title: 'Logged Out',
      description: 'You have been logged out successfully.',
    });
    navigate('/admin-login');
  };

  const dismissAlert = (alertId: string) => {
    const newDismissed = new Set(dismissedAlerts);
    newDismissed.add(alertId);
    setDismissedAlerts(newDismissed);
    localStorage.setItem('dismissedAlerts', JSON.stringify([...newDismissed]));
  };

  const addDangerZone = async () => {
    if (!newZone.name || !newZone.lat || !newZone.lng || !newZone.radius) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all fields.',
        variant: 'destructive',
      });
      return;
    }

    const zone: DangerZone = {
      id: Date.now().toString(),
      name: newZone.name,
      lat: parseFloat(newZone.lat),
      lng: parseFloat(newZone.lng),
      radius: parseFloat(newZone.radius),
      level: newZone.level,
    };

    // Add to blockchain if connected
    if (isContractInitialized) {
      const success = await addBlockchainDangerZone(
        zone.name,
        zone.lat,
        zone.lng,
        zone.radius,
        zone.level
      );
      if (!success) return;
    }

    const updatedZones = [...dangerZones, zone];
    setDangerZones(updatedZones);
    localStorage.setItem('dangerZones', JSON.stringify(updatedZones));

    setNewZone({ name: '', lat: '', lng: '', radius: '', level: 'medium' });
    setShowAddZone(false);

    toast({
      title: 'Danger Zone Added',
      description: isContractInitialized 
        ? `${zone.name} has been added to the blockchain and map.`
        : `${zone.name} has been added to the map.`,
    });
  };

  const removeDangerZone = async (id: string) => {
    // Find the zone to get its blockchain ID if it exists
    const zone = dangerZones.find(z => z.id === id);
    
    // Remove from blockchain if connected
    if (isContractInitialized && zone?.blockchainId !== undefined) {
      const success = await removeBlockchainDangerZone(zone.blockchainId);
      if (!success) return;
    }

    const updatedZones = dangerZones.filter(z => z.id !== id);
    setDangerZones(updatedZones);
    localStorage.setItem('dangerZones', JSON.stringify(updatedZones));

    toast({
      title: 'Zone Removed',
      description: isContractInitialized 
        ? 'Danger zone has been removed from blockchain.'
        : 'Danger zone has been removed.',
    });
  };

  // Sync danger zones from blockchain
  const syncFromBlockchain = async () => {
    if (!isContractInitialized) {
      toast({
        title: 'Not Connected',
        description: 'Connect to blockchain first.',
        variant: 'destructive',
      });
      return;
    }

    setIsSyncing(true);
    try {
      const blockchainZones = await getBlockchainDangerZones();
      
      // Convert blockchain zones to local format
      const localZones: DangerZone[] = blockchainZones.map((zone: any, index: number) => ({
        id: zone.zoneId?.toString() || `bc-${index}`,
        blockchainId: Number(zone.zoneId || index),
        name: zone.name,
        lat: zone.latitude / 1e6, // Convert from contract format
        lng: zone.longitude / 1e6,
        radius: Number(zone.radius),
        level: ['low', 'medium', 'high'][zone.level] as 'low' | 'medium' | 'high',
      }));

      setDangerZones(localZones);
      localStorage.setItem('dangerZones', JSON.stringify(localZones));

      toast({
        title: 'Synced',
        description: `Loaded ${localZones.length} danger zones from blockchain.`,
      });
    } catch (err) {
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync danger zones from blockchain.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusCounts = () => {
    const safe = users.filter(u => u.status === 'safe').length;
    const alert = users.filter(u => u.status === 'alert').length;
    const danger = users.filter(u => u.status === 'danger').length;
    return { safe, alert, danger };
  };

  const counts = getStatusCounts();

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'medium': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/50';
      default: return 'bg-muted';
    }
  };

  const filteredDangerZoneAlerts = dangerZoneAlerts.filter(
    alert => !dismissedAlerts.has(alert.id)
  );

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold mb-2">
              Admin <span className="gradient-text">Dashboard</span>
            </h1>
            <p className="text-muted-foreground">Monitor tourists and manage safety zones</p>
          </div>
          <div className="flex items-center gap-4">
            {walletAddress && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/30 border border-border">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-sm font-mono">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              </div>
            )}
            <Button onClick={handleLogout} variant="outline" className="gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.safe}</p>
                <p className="text-sm text-muted-foreground">Safe</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center">
                <Bell className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.alert}</p>
                <p className="text-sm text-muted-foreground">Alert</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.danger}</p>
                <p className="text-sm text-muted-foreground">Emergency</p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Map */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Live User Tracking Map
          </h2>
          <div className="h-[400px] rounded-xl overflow-hidden">
            <MapboxMap
              dangerZones={dangerZones}
              userLocations={userLocations}
              showDangerZones={true}
              showUserMarkers={true}
              isAdmin={true}
            />
          </div>
        </div>

        {/* Blockchain Emergency Alerts */}
        {blockchainAlerts.length > 0 && (
          <div className="glass-card rounded-2xl p-6 mb-6 border-2 border-primary/50">
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2 text-primary">
              <LinkIcon className="w-5 h-5" />
              Blockchain Alerts
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary/20">
                Live
              </span>
            </h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {blockchainAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border ${
                    alert.type === 'emergency' 
                      ? 'bg-destructive/10 border-destructive/30' 
                      : 'bg-warning/10 border-warning/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {alert.type === 'emergency' ? (
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                        ) : (
                          <Bell className="w-4 h-4 text-warning" />
                        )}
                        <span className="font-medium">
                          {alert.type === 'emergency' ? 'Emergency' : 'Status Update'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
                          On-Chain
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        {alert.touristId || alert.tourist.slice(0, 16)}...
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {alert.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Danger Zone Alerts */}
        {filteredDangerZoneAlerts.length > 0 && (
          <div className="glass-card rounded-2xl p-6 mb-6 border-2 border-destructive/50">
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              Danger Zone Entry Alerts
            </h2>
            <div className="space-y-3">
              {filteredDangerZoneAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      <span className="font-medium">{alert.username}</span>
                      <span className="text-xs text-muted-foreground">entered</span>
                      <span className="font-medium text-destructive">{alert.zoneName}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{alert.touristId}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {alert.location?.lat?.toFixed(4)}, {alert.location?.lng?.toFixed(4)}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dismissAlert(alert.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Dismiss
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Users List */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              All Tourists
            </h2>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {users.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No registered tourists yet</p>
              ) : (
                users.map((user) => (
                  <div
                    key={user.touristId}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{user.username}</p>
                        <p className="text-xs text-muted-foreground font-mono">{user.touristId}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      user.status === 'safe' ? 'status-safe' :
                      user.status === 'alert' ? 'status-alert' : 'status-danger'
                    }`}>
                      {user.status?.toUpperCase()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Recent Alerts
            </h2>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No alerts yet</p>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-xl border ${
                      alert.status === 'danger' ? 'bg-destructive/10 border-destructive/30' : 'bg-warning/10 border-warning/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {alert.status === 'danger' ? (
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                          ) : (
                            <Bell className="w-4 h-4 text-warning" />
                          )}
                          <span className="font-medium">{alert.username}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{alert.touristId}</p>
                        {alert.location && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {alert.location.lat?.toFixed(4)}, {alert.location.lng?.toFixed(4)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Danger Zones */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Danger Zones
                </h2>
                {isContractInitialized && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <LinkIcon className="w-3 h-3 text-success" />
                    <span>Blockchain connected</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isContractInitialized && (
                  <Button
                    onClick={syncFromBlockchain}
                    variant="outline"
                    size="sm"
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Sync from Chain
                  </Button>
                )}
                <Button
                  onClick={() => setShowAddZone(!showAddZone)}
                  className="btn-gradient"
                  disabled={isContractLoading}
                >
                  {isContractLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Add Zone
                </Button>
              </div>
            </div>

            {/* Add Zone Form */}
            {showAddZone && (
              <div className="mb-6 p-4 rounded-xl bg-muted/30 border border-border">
                <h3 className="font-medium mb-4">Add New Danger Zone</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Input
                    placeholder="Zone Name"
                    value={newZone.name}
                    onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                    className="bg-muted/50"
                  />
                  <Input
                    placeholder="Latitude"
                    type="number"
                    step="0.000001"
                    value={newZone.lat}
                    onChange={(e) => setNewZone({ ...newZone, lat: e.target.value })}
                    className="bg-muted/50"
                  />
                  <Input
                    placeholder="Longitude"
                    type="number"
                    step="0.000001"
                    value={newZone.lng}
                    onChange={(e) => setNewZone({ ...newZone, lng: e.target.value })}
                    className="bg-muted/50"
                  />
                  <Input
                    placeholder="Radius (m)"
                    type="number"
                    value={newZone.radius}
                    onChange={(e) => setNewZone({ ...newZone, radius: e.target.value })}
                    className="bg-muted/50"
                  />
                  <select
                    value={newZone.level}
                    onChange={(e) => setNewZone({ ...newZone, level: e.target.value as 'low' | 'medium' | 'high' })}
                    className="px-3 py-2 rounded-lg bg-muted/50 border border-border"
                  >
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                  </select>
                </div>
              <Button 
                onClick={addDangerZone} 
                className="btn-gradient mt-4"
                disabled={isContractLoading}
              >
                {isContractLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Save Zone
              </Button>
              </div>
            )}

            {/* Zones List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dangerZones.length === 0 ? (
                <p className="text-muted-foreground col-span-full text-center py-8">
                  No danger zones added yet
                </p>
              ) : (
                dangerZones.map((zone) => (
                  <div
                    key={zone.id}
                    className={`p-4 rounded-xl border ${getLevelColor(zone.level)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{zone.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {zone.lat.toFixed(4)}, {zone.lng.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Radius: {zone.radius}m
                        </p>
                      </div>
                      <button
                        onClick={() => removeDangerZone(zone.id)}
                        className="p-2 hover:bg-destructive/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                    <div className="mt-2">
                      <span className={`text-xs font-medium uppercase px-2 py-1 rounded ${getLevelColor(zone.level)}`}>
                        {zone.level} Risk
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
