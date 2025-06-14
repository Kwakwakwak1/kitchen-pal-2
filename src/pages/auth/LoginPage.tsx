import React, { useState, FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProviderAPI';
import { useAppState } from '../../providers/AppStateProvider';
import { APP_NAME } from '../../../constants';
import { Card, Button, InputField, Alert } from '../../../components';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { setActiveView } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await login(email, password);
    if (success) {
      navigate(from, { replace: true });
    } else {
      setError('Invalid email or password.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Login to {APP_NAME}</h2>
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField label="Email" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <InputField label="Password" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <Button type="submit" variant="primary" className="w-full" size="lg">Login</Button>
        </form>
        <p className="text-sm text-center mt-6">
          Don't have an account?{' '}
          <Link to="/signup" onClick={() => setActiveView('signup')} className="font-medium text-blue-600 hover:underline">Sign up</Link>
        </p>
      </Card>
    </div>
  );
};

export default LoginPage;