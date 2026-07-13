import React, { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
  getDocs,
  where
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { 
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  UserCheck,
  Stethoscope,
  Phone,
  Plus,
  X,
  RefreshCw,
  Mail,
  User,
  Key,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Filter,
  MoreHorizontal,
  Edit3,
  Save,
  UserCog,
  Clock,
  Activity
} from 'lucide-react';

const UserManagement  = () => {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingUser, setEditingUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'receptionist'
  });
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const usersPerPage = 10;

  const roles = [
    { value: 'admin', label: 'Admin', icon: Shield, color: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
    { value: 'doctor', label: 'Doctor', icon: Stethoscope, color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    { value: 'receptionist', label: 'Receptionist', icon: Phone, color: 'bg-sky-500/15 text-sky-400 border-sky-500/30' }
  ];

  // Fetch all users
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

  // Update user role
  const handleRoleUpdate = async (userId, newRole) => {
    setUpdateLoading(true);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: serverTimestamp()
      });
      setEditingUser(null);
    } catch (err) {
      console.error('Error updating role:', err);
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
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Create new user (admin creates account, no auth login)
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);

    try {
      // Check if email already exists in users collection
      const usersQuery = query(collection(db, 'users'), where('email', '==', createForm.email));
      const existingUsers = await getDocs(usersQuery);
      if (!existingUsers.empty) {
        setCreateError('A user with this email already exists');
        setCreateLoading(false);
        return;
      }

      // Generate a unique ID for the new user document
      const newUserId = doc(collection(db, 'users')).id;

      // Create user document in Firestore directly (no Firebase Auth)
      await setDoc(doc(db, 'users', newUserId), {
        email: createForm.email,
        firstName: createForm.firstName,
        lastName: createForm.lastName,
        fullName: `${createForm.firstName} ${createForm.lastName}`.trim(),
        role: createForm.role,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Reset form and close modal
      setCreateForm({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'receptionist'
      });
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating user:', err);
      setCreateError('Failed to create user. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  const getRoleConfig = (role) => {
    return roles.find(r => r.value === role) || roles[2];
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
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive !== false).length;
    const adminCount = users.filter(u => u.role === 'admin').length;
    const doctorCount = users.filter(u => u.role === 'doctor').length;

    return [
      { 
        title: 'Total Users', 
        value: totalUsers.toLocaleString(), 
        icon: Users, 
        color: 'bg-violet-500/20 text-violet-400' 
      },
      { 
        title: 'Active Users', 
        value: activeUsers.toLocaleString(), 
        icon: UserCheck, 
        color: 'bg-emerald-500/20 text-emerald-400' 
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-venus-text-primary">
            Users
          </h1>
          <p className="text-venus-text-muted mt-1">
            Manage user accounts, roles, and access permissions
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm font-medium transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create User
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Filters Bar */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Role Filter */}
            <div className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-venus-text-muted" />
              <div className="flex gap-1.5">
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
                {roles.map((role) => (
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
              User Accounts
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
                                {roles.map((role) => (
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
                              <Edit3 className="w-4 h-4" />
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

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-venus-border">
              <h3 className="text-lg font-semibold text-venus-text-primary">Create New User</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError('');
                  setCreateForm({
                    email: '',
                    password: '',
                    firstName: '',
                    lastName: '',
                    role: 'receptionist'
                  });
                }}
                className="p-2 hover:bg-venus-bg-tertiary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-venus-text-muted" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {createError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {createError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
                    First Name
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
                    Last Name
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
                  Email Address
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

              <div>
                <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={createForm.password}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary placeholder-venus-text-muted focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
                    placeholder="Min. 6 characters"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
                  Role
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

              <div className="pt-2 flex gap-3">
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
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement ;