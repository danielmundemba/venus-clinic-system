import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loginUser } from '../../firebase/auth';
import { Activity, Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    try {
      await loginUser(data.email, data.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-glow logo-bg">
          <Activity className="w-10 h-10 logo-icon" />
        </div>
        <h1 className="text-2xl font-bold text-venus-text-primary">Welcome Back</h1>
        <p className="text-venus-text-muted mt-1">Sign in to Venus Clinic System</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-4 bg-venus-danger/10 border border-venus-danger/30 rounded-lg text-venus-danger text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-venus-text-secondary mb-2">
            Email Address
          </label>
          <input
            {...register('email')}
            type="email"
            className="input-field"
            placeholder="doctor@venus.clinic"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-venus-danger">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-venus-text-secondary mb-2">
            Password
          </label>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              className="input-field pr-12"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-venus-text-muted hover:text-venus-text-primary"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-venus-danger">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-3"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {/* Demo credentials hint */}
      <div className="mt-6 p-4 bg-venus-bg-tertiary rounded-lg border border-venus-border">
        <p className="text-xs text-venus-text-muted font-medium mb-2">Demo Credentials:</p>
        <div className="space-y-1 text-xs text-venus-text-secondary">
          <p>Admin: admin@venus.clinic / password</p>
          <p>Doctor: doctor@venus.clinic / password</p>
          <p>Reception: reception@venus.clinic / password</p>
        </div>
      </div>
    </div>
  );
};

export default Login;