import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc,
  updateDoc,
  getDocs,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { registerStaff } from '../../firebase/auth';
import { useAuth } from '../../context/AuthContext';
import { useAuditLog } from '../../hooks/useAuditLog';
import { calculateAge } from '../../utils/formatters';
import { 
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  UserCheck,
  Stethoscope,
  Phone,
  Pill,
  HeartPulse,
  Plus,
  X,
  RefreshCw,
  Mail,
  User,
  Key,
  AlertCircle,
  CheckCircle2,
  XCircle,
  UserCog,
  Clock,
  Activity,
  Loader2,
  Calendar,
  MapPin,
  Contact,
  PartyPopper
} from 'lucide-react';

const UserManagement = () => {
  const { user: currentUser, isAdmin } = useAuth();
  const { logAction } = useAuditLog();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingUser, setEditingUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const usersPerPage = 10;

  // Staff job roles — these are the only roles that can be assigned when
  // creating a brand-new staff account (a "patient" account is created via
  // the separate Patient Registration flow, not from here).
  const roles = [
    { value: 'admin', label: 'Admin', icon: Shield, color: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
    { value: 'doctor', label: 'Doctor', icon: Stethoscope, color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    { value: 'receptionist', label: 'Receptionist', icon: Phone, color: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
    { value: 'pharmacist', label: 'Pharmacist', icon: Pill, color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    { value: 'nurse', label: 'Nurse', icon: HeartPulse, color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' }
  ];

  // 'patient' is not a job — it's what a user is when they have no staff
  // role. It's included in allRoles (for filtering / relabeling / editing
  // an EXISTING user), but never in `roles` (for creating a new staff
  // account), since you can't "create someone as a patient" from this page.
  const patientRoleConfig = {
    value: 'patient',
    label: 'Patient',
    icon: User,
    color: 'bg-slate-500/15 text-slate-400 border-slate-500/30'
  };
  const allRoles = [...roles, patientRoleConfig];

  // Create form state — staff + patient info combined
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'receptionist',
    phone: '',
    DOB: '',
    gender: 'male',
    nrcNumber: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: ''
  });

  // Fetch all users (staff + patients)
  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching users:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Auto-clear success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Filter and search logic
  const filteredUsers = users.filter(user => {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const matchesSearch = 
      searchQuery === '' || 
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.isActive !== false) ||
      (statusFilter === 'inactive' && user.isActive === false);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);

  // Update user role — role is the single source of truth for access,
  // isStaff is always recomputed alongside it so the two can never drift
  // out of sync. isPatient never changes: everyone in the system, staff
  // included, keeps their patientInfo record.
  const handleRoleUpdate = async (userId, newRole) => {
    setUpdateLoading(true);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: newRole,
        isStaff: newRole !== 'patient',
        updatedAt: serverTimestamp()
      });

      await logAction('update', 'user', userId, { 
        field: 'role', 
        newValue: newRole 
      });

      setEditingUser(null);
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Failed to update role');
    } finally {
      setUpdateLoading(false);
    }
  };

  // Toggle user active status
  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isActive: !currentStatus,
        updatedAt: serverTimestamp()
      });

      await logAction('update', 'user', userId, { 
        field: 'isActive', 
        newValue: !currentStatus 
      });
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    }
  };

  // Create new staff user — uses secondary auth + creates patientInfo.
  // Password is optional: if left blank we fall back to the same default
  // (123456) used for patient self-registration, so both flows are
  // consistent and the person can change it after their first login.
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);

    try {
      // Validate required patient info fields
      if (!createForm.phone || !createForm.phone.trim()) {
        setCreateError('Phone number is required.');
        setCreateLoading(false);
        return;
      }
      if (!createForm.DOB) {
        setCreateError('Date of birth is required.');
        setCreateLoading(false);
        return;
      }
      if (!createForm.nrcNumber || !createForm.nrcNumber.trim()) {
        setCreateError('NRC number is required.');
        setCreateLoading(false);
        return;
      }
      if (!createForm.address || !createForm.address.trim()) {
        setCreateError('Address is required.');
        setCreateLoading(false);
        return;
      }
      if (createForm.password && createForm.password.length < 6) {
        setCreateError('Password must be at least 6 characters, or leave it blank to use the default (123456).');
        setCreateLoading(false);
        return;
      }

      // Check if email already exists in Firestore
      const usersQuery = query(collection(db, 'users'), where('email', '==', createForm.email));
      const existingUsers = await getDocs(usersQuery);
      if (!existingUsers.empty) {
        setCreateError('A user with this email already exists in the system.');
        setCreateLoading(false);
        return;
      }

      const age = createForm.DOB ? calculateAge(createForm.DOB) : null;
      const usedDefaultPassword = !createForm.password;
      const finalPassword = createForm.password || '123456';

      const staffData = {
        firstName: createForm.firstName,
        lastName: createForm.lastName,
        searchableName: `${createForm.firstName.toLowerCase()} ${createForm.lastName.toLowerCase()}`,
        phone: createForm.phone || null,
        role: createForm.role,
        DOB: createForm.DOB || null,
        gender: createForm.gender,
        age,
        nrcNumber: createForm.nrcNumber || null,
        address: createForm.address || null,
        emergencyContactName: createForm.emergencyContactName || null,
        emergencyContactPhone: createForm.emergencyContactPhone || null,
      };

      // registerStaff uses secondary auth — current admin stays logged in
      const result = await registerStaff(createForm.email, finalPassword, staffData);

      await logAction('create', 'staff', result.uid, {
        name: `${createForm.firstName} ${createForm.lastName}`,
        email: createForm.email,
        role: createForm.role,
        patientInfoId: result.patientInfoId,
      });

      const createdName = `${createForm.firstName} ${createForm.lastName}`;
      const createdRole = createForm.role;

      // Close modal FIRST, then show success
      setShowCreateModal(false);
      setCreateError('');

      // Reset form after modal closes
      setCreateForm({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'receptionist',
        phone: '',
        DOB: '',
        gender: 'male',
        nrcNumber: '',
        address: '',
        emergencyContactName: '',
        emergencyContactPhone: ''
      });

      // Fixed-position toast (see render below) — always visible regardless
      // of scroll position, so closing a scrolled-down modal never hides it.
      setSuccessMessage(
        `${createdName} was created successfully as ${createdRole}. ` +
        `They can now log in with their email and ${usedDefaultPassword ? 'the default password (123456)' : 'the password you set'}.`
      );

    } catch (err) {
      console.error('Error creating user:', err);

      let errorMessage = 'Failed to create staff account. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered in Firebase Authentication. Use a different email or delete the existing auth user first.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Use at least 6 characters.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Check your internet connection.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setCreateError(errorMessage);
    } finally {
      setCreateLoading(false);
    }
  };

  const getRoleConfig = (role) => {
    return allRoles.find(r => r.value === role) || patientRoleConfig;
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  // Stats
  const getStats = () => {
    const staffUsers = users.filter(u => u.isStaff === true);
    const patientOnlyUsers = users.filter(u => u.role === 'patient');
    const activeStaff = staffUsers.filter(u => u.isActive !== false);
    const adminCount = staffUsers.filter(u => u.role === 'admin').length;
    const doctorCount = staffUsers.filter(u => u.role === 'doctor').length;

    return [
      { 
        title: 'Total Staff', 
        value: staffUsers.length.toLocaleString(), 
        icon: Users, 
        color: 'bg-violet-500/20 text-violet-400' 
      },
      { 
        title: 'Active Staff', 
        value: activeStaff.length.toLocaleString(), 
        icon: UserCheck, 
        color: 'bg-emerald-500/20 text-emerald-400' 
      },
      { 
        title: 'Patients', 
        value: patientOnlyUsers.length.toLocaleString(), 
        icon: HeartPulse, 
        color: 'bg-rose-500/20 text-rose-400' 
      },
      { 
        title: 'Admins', 
        value: adminCount.toLocaleString(), 
        icon: Shield, 
        color: 'bg-amber-500/20 text-amber-400' 
      },
      { 
        title: 'Doctors', 
        value: doctorCount.toLocaleString(), 
        icon: Stethoscope, 
        color: 'bg-sky-500/20 text-sky-400' 
      },
    ];
  };

  const stats = getStats();

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="card hover:bg-venus-bg-elevated transition-all duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-venus-text-muted mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-venus-text-primary">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Success Toast — fixed to the viewport so it's always visible,
          regardless of scroll position or whether a modal just closed. */}
      {successMessage && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto z-[100] sm:max-w-md flex items-start gap-3 p-4 bg-emerald-950 border border-emerald-500/40 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-2 bg-emerald-500/20 rounded-full shrink-0">
            <PartyPopper className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-300">Success!</p>
            <p className="text-sm text-emerald-400/90">{successMessage}</p>
          </div>
          <button 
            onClick={() => setSuccessMessage('')}
            className="p-1 hover:bg-emerald-500/20 rounded-lg transition-colors shrink-0"
          >
            <X className="w-4 h-4 text-emerald-300" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-venus-text-primary">
            User Management
          </h1>
          <p className="text-venus-text-muted mt-1">
            Manage every account in the system — staff and patients — and change access levels.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm font-medium transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Staff Account
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Filters Bar */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Role Filter — includes Patient so you can isolate patient-only accounts */}
            <div className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-venus-text-muted" />
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => { setRoleFilter('all'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    roleFilter === 'all' 
                      ? 'bg-violet-500 text-white shadow-sm' 
                      : 'bg-venus-bg-tertiary text-venus-text-muted hover:bg-venus-bg-elevated hover:text-venus-text-primary'
                  }`}
                >
                  All Roles
                </button>
                {allRoles.map((role) => (
                  <button
                    key={role.value}
                    onClick={() => { setRoleFilter(role.value); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      roleFilter === role.value 
                        ? 'bg-violet-500 text-white shadow-sm' 
                        : 'bg-venus-bg-tertiary text-venus-text-muted hover:bg-venus-bg-elevated hover:text-venus-text-primary'
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-venus-text-muted" />
              <div className="flex gap-1.5">
                <button
                  onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    statusFilter === 'all' 
                      ? 'bg-violet-500 text-white shadow-sm' 
                      : 'bg-venus-bg-tertiary text-venus-text-muted hover:bg-venus-bg-elevated hover:text-venus-text-primary'
                  }`}
                >
                  All Status
                </button>
                <button
                  onClick={() => { setStatusFilter('active'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    statusFilter === 'active' 
                      ? 'bg-emerald-500 text-white shadow-sm' 
                      : 'bg-venus-bg-tertiary text-venus-text-muted hover:bg-venus-bg-elevated hover:text-venus-text-primary'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => { setStatusFilter('inactive'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    statusFilter === 'inactive' 
                      ? 'bg-red-500 text-white shadow-sm' 
                      : 'bg-venus-bg-tertiary text-venus-text-muted hover:bg-venus-bg-elevated hover:text-venus-text-primary'
                  }`}
                >
                  Inactive
                </button>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-10 py-2 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary placeholder-venus-text-muted focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-venus-text-muted hover:text-venus-text-primary" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-venus-text-primary">
              All User Accounts
            </h2>
            <span className="px-2.5 py-1 bg-venus-bg-tertiary rounded-full text-xs font-medium text-venus-text-muted">
              {filteredUsers.length} users
            </span>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="p-2 hover:bg-venus-bg-tertiary rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-venus-text-muted" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-venus-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-venus-text-muted" />
            </div>
            <p className="text-venus-text-primary font-medium">No users found</p>
            <p className="text-sm text-venus-text-muted mt-1 max-w-md mx-auto">
              {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters or search to see more results' 
                : 'Users will appear here once they are added to the system'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-venus-border">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-venus-text-muted uppercase tracking-wider">User</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-venus-text-muted uppercase tracking-wider">Role</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-venus-text-muted uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-venus-text-muted uppercase tracking-wider">Created</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-venus-text-muted uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-venus-border/50">
                  {paginatedUsers.map((user) => {
                    const roleConfig = getRoleConfig(user.role);
                    const RoleIcon = roleConfig.icon;
                    const isEditing = editingUser === user.id;
                    const isCurrentUser = user.id === currentUser?.uid;

                    return (
                      <tr 
                        key={user.id} 
                        className="hover:bg-venus-bg-elevated transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-sm font-bold">
                              {getInitials(user.firstName, user.lastName)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-venus-text-primary">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-xs text-venus-text-muted">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={user.role}
                                onChange={(e) => handleRoleUpdate(user.id, e.target.value)}
                                disabled={updateLoading}
                                className="px-3 py-1.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-violet-500"
                                autoFocus
                              >
                                {allRoles.map((role) => (
                                  <option key={role.value} value={role.value}>
                                    {role.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => setEditingUser(null)}
                                className="p-1 hover:bg-venus-bg-tertiary rounded transition-colors"
                              >
                                <X className="w-4 h-4 text-venus-text-muted" />
                              </button>
                            </div>
                          ) : (
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${roleConfig.color}`}>
                              <RoleIcon className="w-3.5 h-3.5" />
                              {roleConfig.label}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => !isCurrentUser && handleToggleStatus(user.id, user.isActive)}
                            disabled={isCurrentUser}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                              user.isActive !== false 
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                                : 'bg-red-500/15 text-red-400 border-red-500/30'
                            } ${isCurrentUser ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
                            title={isCurrentUser ? 'Cannot deactivate your own account' : 'Click to toggle status'}
                          >
                            {user.isActive !== false ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5" />
                                Inactive
                              </>
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-sm text-venus-text-muted">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDate(user.createdAt)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!isEditing && !isCurrentUser && (
                            <button
                              onClick={() => setEditingUser(user.id)}
                              className="p-2 hover:bg-venus-bg-tertiary rounded-lg transition-colors text-venus-text-muted hover:text-venus-text-primary"
                              title="Edit role"
                            >
                              <UserCog className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-venus-border">
                <p className="text-sm text-venus-text-muted">
                  Showing <span className="font-medium text-venus-text-primary">{startIndex + 1}</span> to <span className="font-medium text-venus-text-primary">{Math.min(startIndex + usersPerPage, filteredUsers.length)}</span> of <span className="font-medium text-venus-text-primary">{filteredUsers.length}</span> users
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-venus-border hover:bg-venus-bg-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                          currentPage === page 
                            ? 'bg-violet-500 text-white shadow-sm' 
                            : 'border border-venus-border hover:bg-venus-bg-elevated text-venus-text-primary'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-venus-border hover:bg-venus-bg-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Staff Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          {/*
            Layout: header (static) + body (scrollable, flex-1) + footer
            (static, solid background). The footer is OUTSIDE the scrolling
            area so the Cancel/Create buttons — and the error message right
            above them — are always visible without scrolling, even on a
            short/landscape viewport, and never have other form content
            bleeding through behind them.
          */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-venus-border shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-venus-text-primary">Create New Staff Account</h3>
                <p className="text-xs text-venus-text-muted mt-0.5">Staff are also registered as patients in the system</p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError('');
                }}
                className="p-2 hover:bg-venus-bg-tertiary rounded-lg transition-colors shrink-0"
              >
                <X className="w-5 h-5 text-venus-text-muted" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="flex flex-col flex-1 min-h-0">
              {/* Scrollable body — fields only, no error banner and no
                  buttons in here, so it can scroll freely */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
                {/* Account Info Section */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-venus-text-primary flex items-center gap-2">
                    <Shield className="w-4 h-4 text-violet-400" />
                    Account Information
                  </h4>

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
                          value={createForm.firstName}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, firstName: e.target.value }))}
                          className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary placeholder-venus-text-muted focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
                          placeholder="John"
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
                          value={createForm.lastName}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, lastName: e.target.value }))}
                          className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary placeholder-venus-text-muted focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
                          placeholder="Doe"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                      <input
                        type="email"
                        required
                        value={createForm.email}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary placeholder-venus-text-muted focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
                        placeholder="john.doe@clinic.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
                        Password <span className="text-xs font-normal text-venus-text-muted">(optional — defaults to 123456)</span>
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                        <input
                          type="password"
                          value={createForm.password}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                          className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary placeholder-venus-text-muted focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
                          placeholder="Leave blank for default"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
                        Role <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                        <select
                          value={createForm.role}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value }))}
                          className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all appearance-none"
                        >
                          {roles.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-venus-border/50 pt-4">
                  <h4 className="text-sm font-semibold text-venus-text-primary flex items-center gap-2 mb-4">
                    <HeartPulse className="w-4 h-4 text-rose-400" />
                    Patient Information <span className="text-xs font-normal text-venus-text-muted">(Required — staff are also registered as patients)</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
                        Phone Number <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                        <input
                          type="tel"
                          required
                          value={createForm.phone}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary placeholder-venus-text-muted focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
                          placeholder="+260 97 1234567"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
                        NRC Number <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <Contact className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                        <input
                          type="text"
                          required
                          value={createForm.nrcNumber}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, nrcNumber: e.target.value }))}
                          className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary placeholder-venus-text-muted focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
                          placeholder="123456/78/9"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
                        Date of Birth <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                        <input
                          type="date"
                          required
                          value={createForm.DOB}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, DOB: e.target.value }))}
                          className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
                        Gender <span className="text-red-400">*</span>
                      </label>
                      <select
                        required
                        value={createForm.gender}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, gender: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
                      Address <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-venus-text-muted" />
                      <textarea
                        rows={2}
                        required
                        value={createForm.address}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary placeholder-venus-text-muted focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all resize-none"
                        placeholder="123 Main Street, Kitwe"
                      />
                    </div>
                  </div>

                  <div className="border border-venus-border rounded-lg p-4 space-y-4 mt-4">
                    <h5 className="text-xs font-medium text-venus-text-muted">Emergency Contact (Optional)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-venus-text-muted mb-1">Name</label>
                        <input
                          type="text"
                          value={createForm.emergencyContactName}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, emergencyContactName: e.target.value }))}
                          className="w-full px-3 py-2 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary placeholder-venus-text-muted focus:outline-none focus:border-violet-500"
                          placeholder="Contact name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-venus-text-muted mb-1">Phone</label>
                        <input
                          type="tel"
                          value={createForm.emergencyContactPhone}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, emergencyContactPhone: e.target.value }))}
                          className="w-full px-3 py-2 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary placeholder-venus-text-muted focus:outline-none focus:border-violet-500"
                          placeholder="+260 97 1234567"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Static footer — solid background, sits below the scroll
                  area, always visible. Error appears here, directly above
                  the buttons, so it's never missed on a short viewport. */}
              <div className="shrink-0 border-t border-venus-border bg-white dark:bg-gray-900 px-6 py-4 space-y-3">
                {createError && (
                  <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-red-300">Error</p>
                      <p className="text-sm text-red-400/90">{createError}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCreateError('')}
                      className="p-1 hover:bg-red-500/20 rounded-lg transition-colors shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateError('');
                    }}
                    className="flex-1 px-4 py-2.5 border border-venus-border text-venus-text-primary rounded-lg text-sm font-medium hover:bg-venus-bg-elevated transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="flex-1 px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {createLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Create Staff Account
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;