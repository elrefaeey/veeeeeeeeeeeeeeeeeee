import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { useFirebase } from '@/contexts/FirebaseContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { signIn, loading } = useFirebaseAuth();
  const { user } = useFirebase();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      navigate('/admin');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError(null);

    try {
      await signIn(email.trim(), password);
      navigate('/admin');
    } catch (err: any) {
      console.error('Admin login failed:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Incorrect credentials. Please check your email and password.');
      } else if (err.code === 'auth/user-disabled') {
        setError('This administrative account has been disabled.');
      } else {
        setError('A secure connection error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-playfair font-black tracking-[0.2em] text-stone-900 mb-2 uppercase">VEE</h2>
          <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400 font-bold">Admin Portal</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-sm flex items-start gap-3">
            <AlertCircle className="w-3.5 h-3.5 text-rose-800 shrink-0 mt-0.5" />
            <p className="text-[10px] uppercase tracking-widest leading-relaxed text-rose-900 font-bold">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest font-black text-stone-400">Email Address</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-none border-stone-100 focus:border-stone-900 h-12 transition text-sm"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest font-black text-stone-400">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-none border-stone-100 focus:border-stone-900 h-12 transition text-sm"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-stone-950 text-white rounded-none uppercase tracking-[0.3em] text-xs font-black hover:bg-stone-800 transition shadow-xl"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </Button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full text-center text-[10px] uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors font-bold"
          >
            ← Return to Store
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
