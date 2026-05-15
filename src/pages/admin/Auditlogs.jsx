import React, { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  where,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { 
  Shield, 
  Clock, 
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  Users,
  CalendarCheck,
  TrendingUp,
  AlertCircle,
  Activity,
  UserCheck,
  Trash2,
  Edit3,
  Plus,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  Eye,
  User,
  Hash,
  Tag,
  Stethoscope,
  CreditCard,
  Calendar,
  ArrowRight
} from 'lucide-react';

const AuditLogs = () => {
  const { user, isAdmin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedLog, setExpandedLog] = useState(null);
  const [dateRange, setDateRange] = useState('all');
  const logsPerPage = 10;

  // Fetch user data from users collection
  const fetchUserData = useCallback(async (userIds) => {
    const uniqueIds = [...new Set(userIds)].filter(id => id && id !== 'unknown');
    const newUsers = {};

    await Promise.all(
      uniqueIds.map(async (uid) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            newUsers[uid] = {
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              fullName: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.displayName || 'Unknown User',
              email: data.email || '',
              role: data.role || data.userRole || 'unknown',
              avatar: data.avatar || data.photoURL || null
            };
          } else {
            newUsers[uid] = { fullName: 'Unknown User', role: 'unknown' };
          }
        } catch (err) {
          console.error(`Error fetching user ${uid}:`, err);
          newUsers[uid] = { fullName: 'Unknown User', role: 'unknown' };
        }
      })
    );

    setUsersMap(prev => ({ ...prev, ...newUsers }));
  }, []);

  useEffect(() => {
    let q;
    if (isAdmin) {
      q = query(
        collection(db, 'auditLogs'),
        orderBy('timestamp', 'desc'),
        limit(200)
      );
    } else {
      q = query(
        collection(db, 'auditLogs'),
        where('userId', '==', user?.uid),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
    }

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));

      const userIds = logsData.map(log => log.userId).filter(Boolean);
      if (userIds.length > 0) {
        await fetchUserData(userIds);
      }

      setLogs(logsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching audit logs:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid, isAdmin, fetchUserData]);

  // Date range filter
  const isWithinDateRange = (date) => {
    if (dateRange === 'all') return true;
    const now = new Date();
    const logDate = new Date(date);

    switch (dateRange) {
      case 'today':
        return logDate.toDateString() === now.toDateString();
      case 'week':
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        return logDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
        return logDate >= monthAgo;
      default:
        return true;
    }
  };

  // Filter and search logic
  const filteredLogs = logs.filter(log => {
    const userData = usersMap[log.userId];
    const displayName = userData?.fullName || log.userName || 'Unknown User';
    const userRole = userData?.role || log.userRole || 'unknown';

    const matchesDate = isWithinDateRange(log.timestamp);
    const matchesSearch = 
      searchQuery === '' || 
      displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resourceType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resourceId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(log.details).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDate && matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + logsPerPage);

  // Action icon mapping
  const getActionIcon = (action) => {
    const icons = {
      'CREATE': Plus,
      'UPDATE': Edit3,
      'DELETE': Trash2,
      'VIEW': Eye,
      'LOGIN': UserCheck,
      'EXPORT': Download,
      'SCHEDULE': CalendarCheck,
      'BILLING': CreditCard,
      'ALERT': AlertCircle,
      'VITALS': Activity
    };
    return icons[action?.toUpperCase()] || FileText;
  };

  const getActionColor = (action) => {
    const colors = {
      'CREATE': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      'UPDATE': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      'DELETE': 'bg-red-500/15 text-red-400 border-red-500/30',
      'VIEW': 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      'LOGIN': 'bg-violet-500/15 text-violet-400 border-violet-500/30',
      'EXPORT': 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      'SCHEDULE': 'bg-violet-500/15 text-violet-400 border-violet-500/30',
      'BILLING': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      'ALERT': 'bg-red-500/15 text-red-400 border-red-500/30',
      'VITALS': 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    };
    return colors[action?.toUpperCase()] || 'bg-gray-500/15 text-gray-400 border-gray-500/30';
  };

  const getActionDot = (action) => {
    const colors = {
      'CREATE': 'bg-emerald-400',
      'UPDATE': 'bg-amber-400',
      'DELETE': 'bg-red-400',
      'VIEW': 'bg-sky-400',
      'LOGIN': 'bg-violet-400',
      'EXPORT': 'bg-sky-400',
      'SCHEDULE': 'bg-violet-400',
      'BILLING': 'bg-emerald-400',
      'ALERT': 'bg-red-400',
      'VITALS': 'bg-amber-400'
    };
    return colors[action?.toUpperCase()] || 'bg-gray-400';
  };

  const formatTimestamp = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const formatRelativeTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatTimestamp(date);
  };

  const dateRanges = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' }
  ];

  // Stats
  const getStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLogs = logs.filter(log => new Date(log.timestamp) >= today);
    const createCount = logs.filter(log => log.action === 'CREATE').length;
    const updateCount = logs.filter(log => log.action === 'UPDATE').length;
    const deleteCount = logs.filter(log => log.action === 'DELETE').length;

    return [
      { 
        title: 'Total Logs', 
        value: logs.length.toLocaleString(), 
        icon: Shield, 
        color: 'bg-violet-500/20 text-violet-400' 
      },
      { 
        title: "Today's Activity", 
        value: todayLogs.length.toString(), 
        icon: Clock, 
        trend: logs.length > 0 ? ((todayLogs.length / logs.length) * 100).toFixed(1) : 0, 
        color: 'bg-sky-500/20 text-sky-400' 
      },
      { 
        title: 'Creates', 
        value: createCount.toLocaleString(), 
        icon: Plus, 
        color: 'bg-emerald-500/20 text-emerald-400' 
      },
      { 
        title: 'Modifications', 
        value: (updateCount + deleteCount).toLocaleString(), 
        icon: Edit3, 
        color: 'bg-amber-500/20 text-amber-400' 
      },
    ];
  };

  const StatCard = ({ title, value, icon: Icon, trend, color }) => (
    <div className="card hover:bg-venus-bg-elevated transition-all duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-venus-text-muted mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-venus-text-primary">{value}</h3>
          {trend !== undefined && (
            <p className={`text-sm mt-2 flex items-center gap-1 ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              <TrendingUp className="w-4 h-4" />
              {trend > 0 ? '+' : ''}{trend}% of total
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );

  const stats = getStats();

  const getUserDisplay = (log) => {
    const userData = usersMap[log.userId];
    if (userData) {
      return {
        name: userData.fullName,
        role: userData.role,
        initials: `${userData.firstName?.[0] || ''}${userData.lastName?.[0] || ''}`.toUpperCase() || 'U'
      };
    }
    return {
      name: log.userName || 'Unknown User',
      role: log.userRole || 'unknown',
      initials: 'U'
    };
  };

  // Render details in a clean card format instead of JSON
  const renderDetails = (details) => {
    if (!details || Object.keys(details).length === 0) {
      return (
        <p className="text-sm text-venus-text-muted italic">No additional details recorded</p>
      );
    }

    const getDetailIcon = (key) => {
      const keyLower = key.toLowerCase();
      if (keyLower.includes('patient')) return Stethoscope;
      if (keyLower.includes('name')) return User;
      if (keyLower.includes('id')) return Hash;
      if (keyLower.includes('type')) return Tag;
      if (keyLower.includes('date') || keyLower.includes('time')) return Calendar;
      return ArrowRight;
    };

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(details).map(([key, value]) => {
          const DetailIcon = getDetailIcon(key);
          const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
          const isLongValue = displayValue.length > 50;

          return (
            <div 
              key={key} 
              className="bg-white dark:bg-gray-800/50 rounded-lg p-3 border border-venus-border hover:border-violet-500/30 transition-colors"
            >
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-md bg-violet-500/10 text-violet-400 shrink-0 mt-0.5">
                  <DetailIcon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-venus-text-muted uppercase tracking-wide mb-1">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </p>
                  <p className={`text-sm font-medium text-venus-text-primary break-all ${isLongValue ? 'text-xs' : ''}`}>
                    {displayValue}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-venus-text-primary">
          Audit Logs
        </h1>
        <p className="text-venus-text-muted mt-1">
          Track all system activities and user actions across the clinic
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Filters Bar - Only Time & Search */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-venus-text-muted shrink-0" />
            <div className="flex gap-1.5">
              {dateRanges.map((range) => (
                <button
                  key={range.value}
                  onClick={() => {
                    setDateRange(range.value);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    dateRange === range.value 
                      ? 'bg-violet-500 text-white shadow-sm' 
                      : 'bg-venus-bg-tertiary text-venus-text-muted hover:bg-venus-bg-elevated hover:text-venus-text-primary'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
            <input
              type="text"
              placeholder="Search users, actions, resources..."
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

      {/* Logs Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-venus-text-primary">
              Activity Log
            </h2>
            <span className="px-2.5 py-1 bg-venus-bg-tertiary rounded-full text-xs font-medium text-venus-text-muted">
              {filteredLogs.length} entries
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
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-venus-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-venus-text-muted" />
            </div>
            <p className="text-venus-text-primary font-medium">No audit logs found</p>
            <p className="text-sm text-venus-text-muted mt-1 max-w-md mx-auto">
              {searchQuery || dateRange !== 'all' 
                ? 'Try adjusting your time filter or search to see more results' 
                : 'Logs will appear here when users perform actions in the system'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-venus-border">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-venus-text-muted uppercase tracking-wider">Action</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-venus-text-muted uppercase tracking-wider">User</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-venus-text-muted uppercase tracking-wider">Resource</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-venus-text-muted uppercase tracking-wider">Time</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-venus-border/50">
                  {paginatedLogs.map((log) => {
                    const ActionIcon = getActionIcon(log.action);
                    const userDisplay = getUserDisplay(log);
                    const isExpanded = expandedLog === log.id;

                    return (
                      <React.Fragment key={log.id}>
                        <tr 
                          className="hover:bg-venus-bg-elevated transition-colors cursor-pointer"
                          onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg border ${getActionColor(log.action)}`}>
                                <ActionIcon className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-venus-text-primary">
                                  {log.action}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${getActionDot(log.action)}`}></span>
                                  <span className="text-xs text-venus-text-muted capitalize">
                                    {log.resourceType || 'unknown'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-xs font-bold">
                                {userDisplay.initials}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-venus-text-primary">
                                  {userDisplay.name}
                                </p>
                                <p className="text-xs text-venus-text-muted capitalize">
                                  {userDisplay.role}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="text-sm text-venus-text-primary capitalize">
                                {log.resourceType || 'N/A'}
                              </span>
                              <span className="text-xs text-venus-text-muted font-mono mt-0.5">
                                {log.resourceId?.substring(0, 16) || 'N/A'}
                                {log.resourceId?.length > 16 ? '...' : ''}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="text-sm text-venus-text-primary">
                                {formatRelativeTime(log.timestamp)}
                              </span>
                              <span className="text-xs text-venus-text-muted">
                                {formatTimestamp(log.timestamp)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <button className="p-1 hover:bg-venus-bg-tertiary rounded transition-colors">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-venus-text-muted" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-venus-text-muted" />
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Details - Clean Card UI */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={5} className="px-4 py-5 bg-venus-bg-tertiary/40">
                              <div className="space-y-5">
                                {/* Action Summary */}
                                <div className="flex items-center gap-3 pb-4 border-b border-venus-border/50">
                                  <div className={`p-2.5 rounded-xl border ${getActionColor(log.action)}`}>
                                    <ActionIcon className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <h3 className="text-base font-semibold text-venus-text-primary">
                                      {log.action} {log.resourceType}
                                    </h3>
                                    <p className="text-sm text-venus-text-muted">
                                      {formatTimestamp(log.timestamp)} by {userDisplay.name}
                                    </p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                  {/* User Info Card */}
                                  <div className="bg-white dark:bg-gray-800/30 rounded-xl p-4 border border-venus-border">
                                    <h4 className="text-sm font-semibold text-venus-text-primary flex items-center gap-2 mb-4">
                                      <div className="p-1.5 rounded-md bg-violet-500/10">
                                        <User className="w-4 h-4 text-violet-400" />
                                      </div>
                                      User Information
                                    </h4>
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-venus-text-muted">Full Name</span>
                                        <span className="text-sm font-medium text-venus-text-primary">{userDisplay.name}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-venus-text-muted">Role</span>
                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-500/10 text-violet-400 capitalize">
                                          {userDisplay.role}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-venus-text-muted">User ID</span>
                                        <span className="text-xs font-mono text-venus-text-primary bg-venus-bg-tertiary px-2 py-1 rounded">{log.userId}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Resource Info Card */}
                                  <div className="bg-white dark:bg-gray-800/30 rounded-xl p-4 border border-venus-border">
                                    <h4 className="text-sm font-semibold text-venus-text-primary flex items-center gap-2 mb-4">
                                      <div className="p-1.5 rounded-md bg-sky-500/10">
                                        <FileText className="w-4 h-4 text-sky-400" />
                                      </div>
                                      Resource Details
                                    </h4>
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-venus-text-muted">Type</span>
                                        <span className="text-sm font-medium text-venus-text-primary capitalize">{log.resourceType || 'N/A'}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-venus-text-muted">Resource ID</span>
                                        <span className="text-xs font-mono text-venus-text-primary bg-venus-bg-tertiary px-2 py-1 rounded">{log.resourceId || 'N/A'}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-venus-text-muted">Action Type</span>
                                        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${getActionColor(log.action)}`}>
                                          {log.action}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Additional Details - Clean Card Grid */}
                                {log.details && Object.keys(log.details).length > 0 && (
                                  <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-venus-text-primary flex items-center gap-2">
                                      <div className="p-1.5 rounded-md bg-amber-500/10">
                                        <Eye className="w-4 h-4 text-amber-400" />
                                      </div>
                                      Additional Details
                                    </h4>
                                    {renderDetails(log.details)}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-venus-border">
                <p className="text-sm text-venus-text-muted">
                  Showing <span className="font-medium text-venus-text-primary">{startIndex + 1}</span> to <span className="font-medium text-venus-text-primary">{Math.min(startIndex + logsPerPage, filteredLogs.length)}</span> of <span className="font-medium text-venus-text-primary">{filteredLogs.length}</span> entries
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
    </div>
  );
};

export default AuditLogs;