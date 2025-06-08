import React, { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useAppState } from '../../providers/AppProvidersBridge';
import { APP_NAME } from '../../../constants';
import { Card, Button, InputField, Alert } from '../../../components';

const SignupPageAPI: React.FC = () => {
  const { signup } = useAuth();
  const { setActiveView } = useAppState();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    
    // Check password complexity
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    if (!hasUppercase || !hasLowercase || !hasNumber) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, and one number.');
      return;
    }
    
    // Combine first and last name for the signup function
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    
    console.log('Signup form data:', { 
      fullName, 
      firstName: firstName.trim(), 
      lastName: lastName.trim(), 
      email 
    });
    
    try {
      const success = await signup(fullName, email, password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Signup failed. Please check the browser console for more details.');
      }
    } catch (error) {
      console.error('Signup form error:', error);
      setError(`Signup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Sign up for {APP_NAME}</h2>
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InputField 
              label="First Name" 
              id="firstName" 
              value={firstName} 
              onChange={e => setFirstName(e.target.value)} 
              required 
            />
            <InputField 
              label="Last Name" 
              id="lastName" 
              value={lastName} 
              onChange={e => setLastName(e.target.value)} 
              required 
            />
          </div>
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

export default SignupPageAPI; 