import React, { useState, FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, useStores } from '../../../App';
import { MeasurementSystem } from '../../../types';
import { MEASUREMENT_SYSTEM_OPTIONS } from '../../../constants';
import { Card, Button, InputField, SelectField, Alert } from '../../../components';

const ProfilePage: React.FC = () => {
  const { currentUser, updateUserProfile, updateUserPreferences } = useAuth();
  const { stores } = useStores();
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.preferences.avatarUrl || '');
  const [measurementSystem, setMeasurementSystem] = useState<MeasurementSystem>(currentUser?.preferences.measurementSystem || MeasurementSystem.METRIC);
  const [defaultStoreId, setDefaultStoreId] = useState(currentUser?.preferences.defaultStoreId || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!currentUser) return <Navigate to="/login" />;

  const storeOptions = [{value: '', label: 'Select Default Store'}, ...stores.map(s => ({ value: s.id, label: s.name }))];

  const handleProfileUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const success = await updateUserProfile(currentUser.id, { name, email });
    if (success) {
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } else {
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    }
  };
  
  const handlePreferencesUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const success = await updateUserPreferences(currentUser.id, { avatarUrl, measurementSystem, defaultStoreId });
     if (success) {
      setMessage({ type: 'success', text: 'Preferences updated successfully!' });
    } else {
      setMessage({ type: 'error', text: 'Failed to update preferences.' });
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    // WARNING: Plaintext password comparison. DO NOT USE IN PRODUCTION.
    if (currentUser.passwordHash !== currentPassword) {
      setMessage({ type: 'error', text: 'Current password incorrect.' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
       setMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    // WARNING: Storing plaintext password. DO NOT USE IN PRODUCTION.
    const success = await updateUserProfile(currentUser.id, { passwordHash: newPassword });
    if (success) {
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
      setMessage({ type: 'error', text: 'Failed to change password.' });
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-800">Your Profile</h1>
      {message && <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />}
      
      <Card>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Personal Information</h2>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <InputField label="Full Name" id="profileName" value={name} onChange={e => setName(e.target.value)} required />
          <InputField label="Email" id="profileEmail" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <Button type="submit" variant="primary">Save Personal Info</Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Preferences</h2>
         <form onSubmit={handlePreferencesUpdate} className="space-y-4">
            <InputField label="Avatar URL" id="avatarUrl" type="url" placeholder="https://example.com/avatar.jpg" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} />
            <SelectField label="Measurement System" id="measurementSystem" options={MEASUREMENT_SYSTEM_OPTIONS} value={measurementSystem} onChange={e => setMeasurementSystem(e.target.value as MeasurementSystem)} />
            <SelectField label="Default Store" id="defaultStore" options={storeOptions} value={defaultStoreId} onChange={e => setDefaultStoreId(e.target.value)} />
            <Button type="submit" variant="primary">Save Preferences</Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Change Password</h2>
        <p className="text-xs text-red-500 mb-3">Warning: For demonstration, passwords are not securely hashed.</p>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <InputField label="Current Password" id="currentPassword" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
          <InputField label="New Password" id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
          <InputField label="Confirm New Password" id="confirmNewPassword" type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} required />
          <Button type="submit" variant="primary">Change Password</Button>
        </form>
      </Card>
    </div>
  );
};

export default ProfilePage;