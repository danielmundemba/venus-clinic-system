import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import {
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { db, auth } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useAuditLog } from '../../hooks/useAuditLog';
import { calculateAge } from '../../utils/formatters';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Contact,
  Shield,
  Key,
  Lock,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowLeft,
  Eye,
  EyeOff
} from 'lucide-react';

// Same job-role config as User Management, used here only to render a
// read-only badge — a user can see their role but can't change it from
// their own profile (that still requires an admin).
const roleConfig = {
  admin: { label: 'Admin', color: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
  doctor: { label: 'Doctor', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  receptionist: { label: 'Receptionist', color: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  pharmacist: { label: 'Pharmacist', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  nurse: { label: 'Nurse', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  patient: { label: 'Patient', color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' }
};

const ProfilePage = () => {
  const { user: currentUser, userRole } = useAuth();
  const { logAction } = useAuditLog();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [patientInfoId, setPatientInfoId] = useState(null);

  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    DOB: '',
    gender: 'male',
    nrcNumber: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: ''
  });

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Load the current user's own profile: name/role live on the users/{uid}
  // doc itself, but phone, DOB, gender, NRC, address, and emergency
  // contact live on the patientInfo subdocument at
  // users/{uid}/patientInfo/{autoId} (auto-generated id, not the uid).
  useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser?.uid) return;
      try {
        const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userSnap.exists() ? userSnap.data() : {};

        const patientInfoSnap = await getDocs(
          collection(db, 'users', currentUser.uid, 'patientInfo')
        );
        const patientInfoDoc = patientInfoSnap.docs[0]; // one per user
        const patientData = patientInfoDoc ? patientInfoDoc.data() : {};
        setPatientInfoId(patientInfoDoc ? patientInfoDoc.id : null);

        setProfile({ ...userData, ...patientData });
        setProfileForm({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          phone: userData.phone || '',
          DOB: patientData.DOB || '',
          gender: patientData.gender || 'male',
          nrcNumber: patientData.nrcNumber || '',
          address: patientData.address || '',
          emergencyContactName: patientData.emergencyContactName || '',
          emergencyContactPhone: patientData.emergencyContactPhone || ''
        });
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [currentUser?.uid]);

  // Auto-clear toasts
  useEffect(() => {
    if (profileSuccess) {
      const t = setTimeout(() => setProfileSuccess(''), 4000);
      return () => clearTimeout(t);
    }
  }, [profileSuccess]);

  useEffect(() => {
    if (passwordSuccess) {
      const t = setTimeout(() => setPasswordSuccess(''), 4000);
      return () => clearTimeout(t);
    }
  }, [passwordSuccess]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!profileForm.firstName.trim() || !profileForm.lastName.trim()) {
      setProfileError('First and last name are required.');
      return;
    }
    if (!profileForm.phone.trim()) {
      setProfileError('Phone number is required.');
      return;
    }
    if (!profileForm.address.trim()) {
      setProfileError('Address is required.');
      return;
    }

    setProfileSaving(true);
    try {
      const age = profileForm.DOB ? calculateAge(profileForm.DOB) : null;

      const userUpdates = {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        searchableName: `${profileForm.firstName.toLowerCase()} ${profileForm.lastName.toLowerCase()}`,
        updatedAt: serverTimestamp()
      };

      const patientInfoUpdates = {
        phone: profileForm.phone,
        DOB: profileForm.DOB || null,
        gender: profileForm.gender,
        age,
        nrcNumber: profileForm.nrcNumber || null,
        address: profileForm.address,
        emergencyContactName: profileForm.emergencyContactName || null,
        emergencyContactPhone: profileForm.emergencyContactPhone || null,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'users', currentUser.uid), userUpdates);

      if (patientInfoId) {
        await updateDoc(
          doc(db, 'users', currentUser.uid, 'patientInfo', patientInfoId),
          patientInfoUpdates
        );
      } else {
        // No patientInfo subdocument yet — create one rather than failing.
        const newDoc = await addDoc(
          collection(db, 'users', currentUser.uid, 'patientInfo'),
          patientInfoUpdates
        );
        setPatientInfoId(newDoc.id);
      }

      // Keep the Firebase Auth displayName in sync so it shows correctly
      // in places (like the sidebar) that read from auth rather than
      // Firestore.
      const fullName = `${profileForm.firstName} ${profileForm.lastName}`;
      if (auth.currentUser && auth.currentUser.displayName !== fullName) {
        await updateProfile(auth.currentUser, { displayName: fullName });
      }

      await logAction('update', 'user', currentUser.uid, {
        field: 'profile',
        self: true
      });

      setProfile((prev) => ({ ...prev, ...userUpdates, ...patientInfoUpdates }));
      setProfileSuccess('Your profile has been updated successfully.');
    } catch (err) {
      console.error('Error updating profile:', err);
      setProfileError('Failed to update profile. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword) {
      setPasswordError('Enter your current password to confirm this change.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('New password must be different from your current password.');
      return;
    }

    setPasswordSaving(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);

      await logAction('update', 'user', currentUser.uid, {
        field: 'password',
        self: true
      });

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordSuccess('Your password has been changed successfully.');
    } catch (err) {
      console.error('Error changing password:', err);
      let msg = 'Failed to change password. Please try again.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Current password is incorrect.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many attempts. Please wait a moment and try again.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak. Use at least 6 characters.';
      }
      setPasswordError(msg);
    } finally {
      setPasswordSaving(false);
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';
  };

  const role = roleConfig[userRole] || roleConfig.patient;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-venus-bg-tertiary rounded-lg transition-colors text-venus-text-muted hover:text-venus-text-primary"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-venus-text-primary">My Profile</h1>
          <p className="text-venus-text-muted mt-1">Manage your personal information and password</p>
        </div>
      </div>

      {/* Identity Card */}
      <div className="card flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-xl font-bold shrink-0">
          {getInitials(profileForm.firstName, profileForm.lastName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-venus-text-primary truncate">
            {profileForm.firstName} {profileForm.lastName}
          </p>
          <p className="text-sm text-venus-text-muted truncate">{currentUser?.email}</p>
        </div>
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border shrink-0 ${role.color}`}>
          <Shield className="w-3.5 h-3.5" />
          {role.label}
        </div>
      </div>

      {/* Edit Profile */}
      <div className="card">
        <h2 className="text-lg font-semibold text-venus-text-primary flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-violet-400" />
          Personal Information
        </h2>

        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
                First Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                <input
                  type="text"
                  required
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
                Last Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                <input
                  type="text"
                  required
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Email is intentionally read-only here — changing an auth
              email requires its own verification flow, kept out of scope
              for this page to avoid silently breaking login. */}
          <div>
            <label className="block text-sm font-medium text-venus-text-primary mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
              <input
                type="email"
                disabled
                value={currentUser?.email || ''}
                className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary/50 border border-venus-border rounded-lg text-sm text-venus-text-muted cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-venus-text-muted mt-1">Contact an admin to change your email address.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
                Phone Number <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                <input
                  type="tel"
                  required
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
                  placeholder="Not provided"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-venus-text-primary mb-1.5">NRC Number</label>
              <div className="relative">
                <Contact className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                <input
                  type="text"
                  value={profileForm.nrcNumber}
                  onChange={(e) => setProfileForm((p) => ({ ...p, nrcNumber: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
                  placeholder="Not provided"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-venus-text-primary mb-1.5">Date of Birth</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                <input
                  type="date"
                  value={profileForm.DOB}
                  onChange={(e) => setProfileForm((p) => ({ ...p, DOB: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-venus-text-primary mb-1.5">Gender</label>
              <select
                value={profileForm.gender}
                onChange={(e) => setProfileForm((p) => ({ ...p, gender: e.target.value }))}
                className="w-full px-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
              Address <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-venus-text-muted" />
              <textarea
                rows={2}
                required
                value={profileForm.address}
                onChange={(e) => setProfileForm((p) => ({ ...p, address: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all resize-none"
                placeholder="Not provided"
              />
            </div>
          </div>

          <div className="border border-venus-border rounded-lg p-4 space-y-4">
            <h5 className="text-xs font-medium text-venus-text-muted">Emergency Contact</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-venus-text-muted mb-1">Name</label>
                <input
                  type="text"
                  value={profileForm.emergencyContactName}
                  onChange={(e) => setProfileForm((p) => ({ ...p, emergencyContactName: e.target.value }))}
                  className="w-full px-3 py-2 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-violet-500"
                  placeholder="Not provided"
                />
              </div>
              <div>
                <label className="block text-xs text-venus-text-muted mb-1">Phone</label>
                <input
                  type="tel"
                  value={profileForm.emergencyContactPhone}
                  onChange={(e) => setProfileForm((p) => ({ ...p, emergencyContactPhone: e.target.value }))}
                  className="w-full px-3 py-2 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-violet-500"
                  placeholder="Not provided"
                />
              </div>
            </div>
          </div>

          {profileError && (
            <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400/90 flex-1">{profileError}</p>
              <button type="button" onClick={() => setProfileError('')} className="p-1 hover:bg-red-500/20 rounded-lg transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {profileSuccess && (
            <div className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-400/90 flex-1">{profileSuccess}</p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={profileSaving}
              className="px-5 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {profileSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="card">
        <h2 className="text-lg font-semibold text-venus-text-primary flex items-center gap-2 mb-1">
          <Lock className="w-5 h-5 text-violet-400" />
          Change Password
        </h2>
        <p className="text-sm text-venus-text-muted mb-4">
          Enter your current password to confirm any change.
        </p>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
              Current Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
              <input
                type={showPasswords ? 'text' : 'password'}
                required
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
                New Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                <input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
                  placeholder="At least 6 characters"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
                Confirm New Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                <input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPasswords((s) => !s)}
            className="flex items-center gap-1.5 text-xs text-venus-text-muted hover:text-venus-text-primary transition-colors"
          >
            {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPasswords ? 'Hide passwords' : 'Show passwords'}
          </button>

          {passwordError && (
            <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400/90 flex-1">{passwordError}</p>
              <button type="button" onClick={() => setPasswordError('')} className="p-1 hover:bg-red-500/20 rounded-lg transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {passwordSuccess && (
            <div className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-400/90 flex-1">{passwordSuccess}</p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={passwordSaving}
              className="px-5 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {passwordSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Update Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;