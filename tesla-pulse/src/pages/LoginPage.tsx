import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Zap, Shield, Activity, AlertTriangle } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    console.log('🔐 Attempting login:', email);
    
    try {
      if (!auth) {
        throw new Error('Firebase Auth not initialized');
      }
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Login successful:', userCredential.user.email);
    } catch (err: any) {
      console.error('❌ Login error:', err);
      
      if (err.code === 'auth/user-not-found') {
        setError('User not found. Please check your email.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email format.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-900 flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-navy-800 via-navy-900 to-navy-800 border-r border-white/10 p-12 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-electric-500/10 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-safe/5 to-transparent pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative">
          <div className="w-12 h-12 rounded-xl bg-electric-500/20 border border-electric-500/40 flex items-center justify-center">
            <Zap className="w-7 h-7 text-electric-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-widest">TESLA PULSE</h1>
            <p className="text-xs text-gray-400 tracking-wider">Smart Electric Pole Monitoring</p>
          </div>
        </div>

        {/* Center content */}
        <div className="relative">
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            Real-time Safety<br />
            <span className="text-electric-400">For Every Pole</span>
          </h2>
          <p className="text-gray-400 text-base leading-relaxed max-w-sm">
            Monitor leakage current, voltage, moisture, and fault conditions across your entire electrical infrastructure — live, from anywhere.
          </p>

          {/* Feature list */}
          <div className="mt-8 space-y-4">
            {[
              { icon: Activity, text: 'Live sensor data from ESP32 hardware' },
              { icon: AlertTriangle, text: 'Instant fault detection & alerts' },
              { icon: Shield, text: 'Protecting lives in Madhya Pradesh' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-gray-300">
                <Icon className="w-4 h-4 text-electric-400" />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-600 relative">
          Team Tesla Pulse · Smart Electric Pole Monitoring
        </p>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <Zap className="w-7 h-7 text-electric-400" />
            <h1 className="text-xl font-bold text-white tracking-widest">TESLA PULSE</h1>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Sign In</h2>
          <p className="text-gray-400 text-sm mb-8">Electricity board staff & field technicians</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-electric-500/60 focus:bg-white/8 transition-all"
                placeholder="you@electricity-board.gov.in"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-electric-500/60 transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-fault bg-fault/10 border border-fault/20 rounded-xl px-3 py-2.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-electric-500 hover:bg-electric-600 text-white font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-xs text-gray-600 text-center mt-6">
            Access is restricted to authorized personnel only.
          </p>
        </div>
      </div>
    </div>
  );
}
