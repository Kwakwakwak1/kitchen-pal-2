import React, { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useAppState } from '../../../App';
import { APP_NAME } from '../../../constants';
import { Card, Button, InputField, Alert } from '../../../components';

const SignupPage: React.FC = () => {
  const { signup } = useAuth();
  const { setActiveView } = useAppState();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    const success = await signup(name, email, password);
    if (success) {
      navigate('/dashboard');
    } else {
      setError('Signup failed. Email may already be in use or an unexpected error occurred.');
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Create your {APP_NAME} Account</h2>
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        <p className="text-xs text-red-500 mb-3 text-center">Warning: For demonstration, passwords are not securely hashed. Do not use real passwords.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField label="Full Name" id="name" value={name} onChange={e => setName(e.target.value)} required />
          <InputField label="Email" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <InputField label="Password" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <InputField label="Confirm Password" id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          <Button type="submit" variant="primary" className="w-full" size="lg">Sign Up</Button>
        </form>
        <p className="text-sm text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" onClick={() => setActiveView('login')} className="font-medium text-blue-600 hover:underline">Login</Link>
        </p>
      </Card>
    </div>
  );
};

export default SignupPage;