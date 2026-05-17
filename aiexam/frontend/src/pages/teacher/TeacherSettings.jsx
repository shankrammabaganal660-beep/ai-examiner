import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { teacherAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import { User, Lock, Bell, Moon, Save, Mail, BookOpen, Building } from 'lucide-react';

export default function TeacherSettings() {
  const { user: authUser, login } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [profile, setProfile] = useState({
    name: '', employeeId: '', department: '', subjects: '', bio: '', phoneNumber: '',
    notificationPreferences: { email: true, push: true },
    themePreference: 'dark'
  });
  
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    teacherAPI.getSettings().then(({ data }) => {
      const u = data.data;
      setProfile({
        name: u.name || '', employeeId: u.employeeId || '', department: u.department || '',
        subjects: u.subjects ? u.subjects.join(', ') : '', bio: u.bio || '', phoneNumber: u.phoneNumber || '',
        notificationPreferences: u.notificationPreferences || { email: true, push: true },
        themePreference: u.themePreference || 'dark'
      });
    }).catch(() => toast.error('Failed to load settings')).finally(() => setLoading(false));
  }, []);

  const handleProfileChange = (e) => setProfile(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleToggle = (key) => setProfile(p => ({
    ...p, notificationPreferences: { ...p.notificationPreferences, [key]: !p.notificationPreferences[key] }
  }));

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...profile, subjects: profile.subjects.split(',').map(s => s.trim()).filter(Boolean) };
      const { data } = await teacherAPI.updateSettings(payload);
      toast.success('Profile updated successfully');
      login(useAuthStore.getState().token, data.data); // Update auth store
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally { setSaving(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) return toast.error('Passwords do not match');
    if (passwords.newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    try {
      await teacherAPI.changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      toast.success('Password changed successfully');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account preferences and profile</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Form */}
          <form onSubmit={saveProfile} className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center">
                <User className="w-5 h-5 text-primary-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-100">Profile Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Full Name</label>
                <input type="text" name="name" value={profile.name} onChange={handleProfileChange} className="input" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Employee ID</label>
                <input type="text" name="employeeId" value={profile.employeeId} onChange={handleProfileChange} className="input" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Department</label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="text" name="department" value={profile.department} onChange={handleProfileChange} className="input pl-10" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Subjects (comma separated)</label>
                <div className="relative">
                  <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="text" name="subjects" value={profile.subjects} onChange={handleProfileChange} className="input pl-10" />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Bio</label>
                <textarea name="bio" value={profile.bio} onChange={handleProfileChange} className="input min-h-[80px]" />
              </div>
            </div>
            
            <div className="flex justify-end border-t border-gray-800 pt-4 mt-6">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Profile</>}
              </button>
            </div>
          </form>

          {/* Password Form */}
          <form onSubmit={changePassword} className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-100">Security</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Current Password</label>
                <input type="password" value={passwords.currentPassword} onChange={e => setPasswords({...passwords, currentPassword: e.target.value})} className="input" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">New Password</label>
                <input type="password" value={passwords.newPassword} onChange={e => setPasswords({...passwords, newPassword: e.target.value})} className="input" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Confirm New Password</label>
                <input type="password" value={passwords.confirmPassword} onChange={e => setPasswords({...passwords, confirmPassword: e.target.value})} className="input" required />
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button type="submit" className="btn-primary bg-gray-800 hover:bg-gray-700 text-gray-200 border-none">
                Update Password
              </button>
            </div>
          </form>
        </div>

        {/* Preferences Sidebar */}
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-100">Notifications</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-200">Email Notifications</p>
                  <p className="text-xs text-gray-500">Receive exam summaries</p>
                </div>
                <button type="button" onClick={() => handleToggle('email')} className={`w-11 h-6 rounded-full transition-colors relative ${profile.notificationPreferences.email ? 'bg-primary-600' : 'bg-gray-700'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${profile.notificationPreferences.email ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-200">Push Notifications</p>
                  <p className="text-xs text-gray-500">Real-time alerts</p>
                </div>
                <button type="button" onClick={() => handleToggle('push')} className={`w-11 h-6 rounded-full transition-colors relative ${profile.notificationPreferences.push ? 'bg-primary-600' : 'bg-gray-700'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${profile.notificationPreferences.push ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
            <button onClick={saveProfile} disabled={saving} className="btn-primary w-full mt-6 text-xs">Save Preferences</button>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
                <Moon className="w-5 h-5 text-violet-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-100">Appearance</h2>
            </div>
            <div className="space-y-3">
              {['dark', 'light', 'system'].map(theme => (
                <button key={theme} type="button" onClick={() => setProfile({...profile, themePreference: theme})}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border ${profile.themePreference === theme ? 'border-primary-500 bg-primary-500/10' : 'border-gray-800 hover:border-gray-700'}`}>
                  <span className="text-sm font-medium text-gray-200 capitalize">{theme}</span>
                  {profile.themePreference === theme && <div className="w-2 h-2 rounded-full bg-primary-500" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
