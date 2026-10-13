import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useAuthStore } from '@/store/authStore';
import { Sun, Moon, Bell, MapPin, Users, Plus, Save } from 'lucide-react';

interface MockPole { id: string; name: string; lat: string; lng: string }

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [leakThreshold, setLeakThreshold] = useState(15);
  const [moistThreshold, setMoistThreshold] = useState(70);
  const [newPole, setNewPole] = useState<MockPole>({ id: '', name: '', lat: '', lng: '' });
  const [saved, setSaved] = useState(false);

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        Admin access required to view this page.
      </div>
    );
  }

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <SectionHeader title="Admin Settings" subtitle="System configuration & management" />

      {/* Appearance */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sun className="w-4 h-4 text-warning" />
          <p className="text-sm font-semibold text-white">Appearance</p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-300">Dashboard Theme</p>
            <p className="text-xs text-gray-500 mt-0.5">Toggle between dark control-room and light mode</p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-sm text-white hover:bg-white/15 transition-all"
          >
            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
        </div>
      </GlassCard>

      {/* Notifications */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-electric-400" />
          <p className="text-sm font-semibold text-white">Notification Preferences</p>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300">Email Fault Alerts</p>
              <p className="text-xs text-gray-500">Send email when fault is detected</p>
            </div>
            <button
              onClick={() => setEmailAlerts(!emailAlerts)}
              className={`w-11 h-6 rounded-full transition-all ${emailAlerts ? 'bg-electric-500' : 'bg-gray-600'}`}
            >
              <span className={`block w-4 h-4 rounded-full bg-white transition-transform mx-1 ${emailAlerts ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Global Leakage Alert Threshold (mA)</label>
            <input
              type="number"
              value={leakThreshold}
              onChange={(e) => setLeakThreshold(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-electric-500/60"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Global Moisture Alert Threshold (%)</label>
            <input
              type="number"
              value={moistThreshold}
              onChange={(e) => setMoistThreshold(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-electric-500/60"
            />
          </div>
        </div>
      </GlassCard>

      {/* Add Pole */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-safe" />
          <p className="text-sm font-semibold text-white">Add New Pole</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(['id', 'name', 'lat', 'lng'] as const).map((field) => (
            <div key={field}>
              <label className="text-xs text-gray-400 block mb-1 capitalize">{field === 'id' ? 'Pole ID' : field === 'lat' ? 'Latitude' : field === 'lng' ? 'Longitude' : 'Name'}</label>
              <input
                type="text"
                value={newPole[field]}
                onChange={(e) => setNewPole({ ...newPole, [field]: e.target.value })}
                placeholder={field === 'id' ? 'pole_07' : field === 'lat' ? '22.7196' : field === 'lng' ? '75.8577' : 'Pole 07 - Area'}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-electric-500/60"
              />
            </div>
          ))}
        </div>
        <button className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-safe/20 border border-safe/30 text-safe text-sm hover:bg-safe/30 transition-all">
          <Plus className="w-4 h-4" />
          Add Pole to Firebase
        </button>
      </GlassCard>

      {/* Users */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-electric-400" />
          <p className="text-sm font-semibold text-white">User Management</p>
        </div>
        <p className="text-xs text-gray-500">
          Manage technician accounts and permissions via Firebase Console → Authentication.
          Role data is stored in Firestore <code className="text-electric-400">users/{'{uid}'}</code> documents.
        </p>
      </GlassCard>

      {/* Save */}
      <button
        onClick={handleSave}
        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${saved ? 'bg-safe text-white' : 'bg-electric-500 hover:bg-electric-600 text-white'}`}
      >
        <Save className="w-4 h-4" />
        {saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
