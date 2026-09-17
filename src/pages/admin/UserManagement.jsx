import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { db, auth } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { useAuditLog } from "../../hooks/useAuditLog";
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
  User,
  UserCog,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  PartyPopper,
  Mail,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react";

const UserManagement = () => {
  const { user: currentUser, isAdmin } = useAuth();
  const { logAction } = useAuditLog();
  const navigate = useNavigate();
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingUser, setEditingUser] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  // Per-row id currently running an async action (resend email), so only
  // that row's button shows a spinner and the rest of the table stays
  // interactive.
  const [actionLoadingId, setActionLoadingId] = useState(null);
  // The user pending deletion — having a confirmation dialog is what makes
  // this a two-step, user-cancellable action rather than an accidental
  // one-click delete.
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const usersPerPage = 10;

  // Staff job roles — these are the only roles that can be assigned when
  // creating a brand-new staff account (a "patient" account is created via
  // the separate Patient Registration flow, not from here).
  const roles = [
    {
      value: "admin",
      label: "Admin",
      icon: Shield,
      color:
        "bg-venus-primary-500/15 text-venus-primary-400 border-venus-primary-500/30",
    },
    {
      value: "doctor",
      label: "Doctor",
      icon: Stethoscope,
      color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    },
    {
      value: "receptionist",
      label: "Receptionist",
      icon: Phone,
      color: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    },
    {
      value: "pharmacist",
      label: "Pharmacist",
      icon: Pill,
      color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    },
    {
      value: "nurse",
      label: "Nurse",
      icon: HeartPulse,
      color: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    },
  ];

  // 'patient' is not a job — it's what a user is when they have no staff
  // role. It's included in allRoles (for filtering / relabeling / editing
  // an EXISTING user), but never in `roles` (for creating a new staff
  // account), since you can't "create someone as a patient" from this page.
  const patientRoleConfig = {
    value: "patient",
    label: "Patient",
    icon: User,
    color: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  };
  const allRoles = [...roles, patientRoleConfig];

  // Fetch all users (staff + patients)
  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const usersData = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
          }))
          // Soft-deleted accounts are hidden from the working list entirely
          // rather than shown as an "Inactive"-style status.
          .filter((u) => !u.deletedAt);
        setUsers(usersData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching users:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Pick up the success toast passed from the Create Staff page after a
  // redirect, then clear it from location state so a refresh/back-nav
  // doesn't re-show it.
  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  // Toasts stay up until the user dismisses them with the X — no
  // auto-clear timers. This matters most for the "email couldn't be sent"
  // / "delete failed" cases, which shouldn't vanish before someone reads
  // them.

  // Filter and search logic
  const filteredUsers = users.filter((user) => {
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    const matchesSearch =
      searchQuery === "" ||
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.patientNumber?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && user.isActive !== false) ||
      (statusFilter === "inactive" && user.isActive === false);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const paginatedUsers = filteredUsers.slice(
    startIndex,
    startIndex + usersPerPage,
  );

  // Update user role — role is the single source of truth for access,
  // isStaff is always recomputed alongside it so the two can never drift
  // out of sync. isPatient never changes: everyone in the system, staff
  // included, keeps their patientInfo record.
  const handleRoleUpdate = async (userId, newRole) => {
    setUpdateLoading(true);
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        role: newRole,
        isStaff: newRole !== "patient",
        updatedAt: serverTimestamp(),
      });

      await logAction("update", "user", userId, {
        field: "role",
        newValue: newRole,
      });

      setEditingUser(null);
    } catch (err) {
      console.error("Error updating role:", err);
      setErrorMessage("Failed to update role. Please try again.");
    } finally {
      setUpdateLoading(false);
    }
  };

  // Toggle user active status
  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        isActive: !currentStatus,
        updatedAt: serverTimestamp(),
      });

      await logAction("update", "user", userId, {
        field: "isActive",
        newValue: !currentStatus,
      });
    } catch (err) {
      console.error("Error updating status:", err);
      setErrorMessage("Failed to update status. Please try again.");
    }
  };

  // Resend welcome email — since the client SDK can't set another user's
  // password, this sends Firebase's native password-reset link instead of
  // re-sending a password. The user clicks the link and picks their own
  // new password; their current password keeps working until they do.
  const handleResendWelcomeEmail = async (user) => {
    setActionLoadingId(user.id);
    setErrorMessage("");
    try {
      await sendPasswordResetEmail(auth, user.email);
      await logAction("update", "user", user.id, {
        field: "welcomeEmailResent",
      });
      setSuccessMessage(`A password reset link was sent to ${user.email}.`);
    } catch (err) {
      console.error("Error resending welcome email:", err);
      setErrorMessage(
        `Failed to send an email to ${user.email}. ${err.message || "Please try again."}`,
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // Soft delete — see the note above the component: this deactivates and
  // hides the account from this list. It does not remove the underlying
  // Firebase Auth login, which requires the Admin SDK (Cloud Functions,
  // Blaze plan) to do from a backend.
  const handleDeleteAccount = async () => {
    if (!deletingUser) return;
    setDeleteLoading(true);
    setErrorMessage("");
    try {
      await updateDoc(doc(db, "users", deletingUser.id), {
        isActive: false,
        deletedAt: serverTimestamp(),
        deletedBy: currentUser?.uid || null,
      });

      await logAction("delete", "user", deletingUser.id, {
        name: `${deletingUser.firstName} ${deletingUser.lastName}`,
        email: deletingUser.email,
      });

      setSuccessMessage(
        `${deletingUser.firstName} ${deletingUser.lastName}'s account was removed.`,
      );
      setDeletingUser(null);
    } catch (err) {
      console.error("Error deleting account:", err);
      setErrorMessage("Failed to delete this account. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const getRoleConfig = (role) => {
    return allRoles.find((r) => r.value === role) || patientRoleConfig;
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "U";
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  // Stats
  const getStats = () => {
    const staffUsers = users.filter((u) => u.isStaff === true);
    const patientOnlyUsers = users.filter((u) => u.role === "patient");
    const activeStaff = staffUsers.filter((u) => u.isActive !== false);
    const adminCount = staffUsers.filter((u) => u.role === "admin").length;
    const doctorCount = staffUsers.filter((u) => u.role === "doctor").length;

    return [
      {
        title: "Total Staff",
        value: staffUsers.length.toLocaleString(),
        icon: Users,
        color: "bg-venus-primary-500/20 text-venus-primary-400",
      },
      {
        title: "Active Staff",
        value: activeStaff.length.toLocaleString(),
        icon: UserCheck,
        color: "bg-emerald-500/20 text-emerald-400",
      },
      {
        title: "Patients",
        value: patientOnlyUsers.length.toLocaleString(),
        icon: HeartPulse,
        color: "bg-rose-500/20 text-rose-400",
      },
      {
        title: "Admins",
        value: adminCount.toLocaleString(),
        icon: Shield,
        color: "bg-amber-500/20 text-amber-400",
      },
      {
        title: "Doctors",
        value: doctorCount.toLocaleString(),
        icon: Stethoscope,
        color: "bg-sky-500/20 text-sky-400",
      },
    ];
  };

  const stats = getStats();

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="card hover:bg-venus-bg-elevated transition-all duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-venus-text-muted mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-venus-text-primary">
            {value}
          </h3>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Success Toast — fixed to the viewport, stays until dismissed */}
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
            onClick={() => setSuccessMessage("")}
            className="p-1 hover:bg-emerald-500/20 rounded-lg transition-colors shrink-0"
          >
            <X className="w-4 h-4 text-emerald-300" />
          </button>
        </div>
      )}

      {/* Error Toast — same pattern, stays until dismissed */}
      {errorMessage && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto z-[100] sm:max-w-md flex items-start gap-3 p-4 bg-red-950 border border-red-500/40 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-2 bg-red-500/20 rounded-full shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-300">Error</p>
            <p className="text-sm text-red-400/90">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage("")}
            className="p-1 hover:bg-red-500/20 rounded-lg transition-colors shrink-0"
          >
            <X className="w-4 h-4 text-red-300" />
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
            Manage every account in the system — staff and patients — and change
            access levels.
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/users/create")}
          className="flex items-center gap-2 px-4 py-2.5 bg-venus-primary-500 hover:bg-venus-primary-600 text-white rounded-lg text-sm font-medium transition-all shadow-sm"
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
                  onClick={() => {
                    setRoleFilter("all");
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    roleFilter === "all"
                      ? "bg-venus-primary-500 text-white shadow-sm"
                      : "bg-venus-bg-tertiary text-venus-text-muted hover:bg-venus-bg-elevated hover:text-venus-text-primary"
                  }`}
                >
                  All Roles
                </button>
                {allRoles.map((role) => (
                  <button
                    key={role.value}
                    onClick={() => {
                      setRoleFilter(role.value);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      roleFilter === role.value
                        ? "bg-venus-primary-500 text-white shadow-sm"
                        : "bg-venus-bg-tertiary text-venus-text-muted hover:bg-venus-bg-elevated hover:text-venus-text-primary"
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
                  onClick={() => {
                    setStatusFilter("all");
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    statusFilter === "all"
                      ? "bg-venus-primary-500 text-white shadow-sm"
                      : "bg-venus-bg-tertiary text-venus-text-muted hover:bg-venus-bg-elevated hover:text-venus-text-primary"
                  }`}
                >
                  All Status
                </button>
                <button
                  onClick={() => {
                    setStatusFilter("active");
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    statusFilter === "active"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "bg-venus-bg-tertiary text-venus-text-muted hover:bg-venus-bg-elevated hover:text-venus-text-primary"
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => {
                    setStatusFilter("inactive");
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    statusFilter === "inactive"
                      ? "bg-red-500 text-white shadow-sm"
                      : "bg-venus-bg-tertiary text-venus-text-muted hover:bg-venus-bg-elevated hover:text-venus-text-primary"
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
              placeholder="Search by name, email, role, or Patient ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-10 py-2 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary placeholder-venus-text-muted focus:outline-none focus:border-venus-primary-500 focus:ring-1 focus:ring-venus-primary-500/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-venus-primary-500"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-venus-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-venus-text-muted" />
            </div>
            <p className="text-venus-text-primary font-medium">
              No users found
            </p>
            <p className="text-sm text-venus-text-muted mt-1 max-w-md mx-auto">
              {searchQuery || roleFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters or search to see more results"
                : "Users will appear here once they are added to the system"}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-venus-border">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-venus-text-muted uppercase tracking-wider">
                      User
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-venus-text-muted uppercase tracking-wider">
                      Role
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-venus-text-muted uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-venus-text-muted uppercase tracking-wider">
                      Created
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-venus-text-muted uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-venus-border/50">
                  {paginatedUsers.map((user) => {
                    const roleConfig = getRoleConfig(user.role);
                    const RoleIcon = roleConfig.icon;
                    const isEditing = editingUser === user.id;
                    const isCurrentUser = user.id === currentUser?.uid;
                    const isRowBusy = actionLoadingId === user.id;

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-venus-bg-elevated transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-venus-primary-500/20 flex items-center justify-center text-venus-primary-400 text-sm font-bold">
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
                                onChange={(e) =>
                                  handleRoleUpdate(user.id, e.target.value)
                                }
                                disabled={updateLoading}
                                className="px-3 py-1.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-venus-primary-500"
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
                            <div
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${roleConfig.color}`}
                            >
                              <RoleIcon className="w-3.5 h-3.5" />
                              {roleConfig.label}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() =>
                              !isCurrentUser &&
                              handleToggleStatus(user.id, user.isActive)
                            }
                            disabled={isCurrentUser}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                              user.isActive !== false
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : "bg-red-500/15 text-red-400 border-red-500/30"
                            } ${isCurrentUser ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:opacity-80"}`}
                            title={
                              isCurrentUser
                                ? "Cannot deactivate your own account"
                                : "Click to toggle status"
                            }
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
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            {!isEditing && !isCurrentUser && (
                              <button
                                onClick={() => setEditingUser(user.id)}
                                className="p-2 hover:bg-venus-bg-tertiary rounded-lg transition-colors text-venus-text-muted hover:text-venus-text-primary"
                                title="Edit role"
                              >
                                <UserCog className="w-4 h-4" />
                              </button>
                            )}
                            {!isCurrentUser && (
                              <button
                                onClick={() => handleResendWelcomeEmail(user)}
                                disabled={isRowBusy}
                                className="p-2 hover:bg-venus-bg-tertiary rounded-lg transition-colors text-venus-text-muted hover:text-venus-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Resend welcome email"
                              >
                                {isRowBusy ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Mail className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            {!isCurrentUser && (
                              <button
                                onClick={() => setDeletingUser(user)}
                                className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-venus-text-muted hover:text-red-400"
                                title="Delete account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
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
                  Showing{" "}
                  <span className="font-medium text-venus-text-primary">
                    {startIndex + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-venus-text-primary">
                    {Math.min(startIndex + usersPerPage, filteredUsers.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-venus-text-primary">
                    {filteredUsers.length}
                  </span>{" "}
                  users
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                            ? "bg-venus-primary-500 text-white shadow-sm"
                            : "border border-venus-border hover:bg-venus-bg-elevated text-venus-text-primary"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
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

      {/* Delete confirmation modal — only closes via explicit Cancel/Delete,
          never on its own. */}
      {deletingUser && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
          onClick={() => !deleteLoading && setDeletingUser(null)}
        >
          <div
            className="card w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-500/15 rounded-full shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-venus-text-primary">
                  Delete this account?
                </h3>
                <p className="text-sm text-venus-text-muted mt-1">
                  {deletingUser.firstName} {deletingUser.lastName} (
                  {deletingUser.email}) will lose access immediately and be
                  removed from this list. This can't be undone from here.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingUser(null)}
                disabled={deleteLoading}
                className="px-4 py-2 border border-venus-border text-venus-text-primary rounded-lg text-sm font-medium hover:bg-venus-bg-elevated transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> Delete Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
