import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
  orderBy,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import {
  getActiveMedicalRecords,
  getRecentlyCompletedRecords,
  getAllNurseRooms,
} from "../../firebase/db";
import { formatDate } from "../../utils/formatters";
import DutyToggle from "../../components/common/DutyToggle";
import PageSkeleton from "../../components/common/PageSkeleton";
import {
  Users,
  CalendarCheck,
  FileText,
  TrendingUp,
  Activity,
  ChevronRight,
  Stethoscope,
  Pill,
  ClipboardList,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Shield,
  UserCheck,
  DoorOpen,
} from "lucide-react";

const todayStr = () => new Date().toISOString().split("T")[0];
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Short "12m ago" / "3h ago" style label for the admin activity feed —
// matches the pattern AuditLogs.jsx uses, kept local since it's the only
// other place on the dashboard that needs it.
const formatRelativeTime = (date) => {
  const diff = new Date() - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
};

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-venus-bg-secondary border border-venus-border rounded-xl p-5 hover:bg-venus-bg-elevated transition-all duration-200">
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

const QuickAction = ({ icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-3 p-4 bg-venus-bg-tertiary hover:bg-venus-bg-elevated border border-venus-border hover:border-venus-border-hover rounded-lg transition-all duration-200 w-full text-left"
  >
    <Icon className="w-5 h-5 text-venus-primary-400" />
    <span className="text-sm font-medium text-venus-text-primary">{label}</span>
  </button>
);

// What each role's Recent Activity entry should read — never surfaces the
// diagnosis to roles that shouldn't see it (matches the record-detail
// visibility matrix: only doctor sees clinical diagnosis text). Admin isn't
// handled here — admin's feed is system activity (audit logs), not visit
// activity, since admin no longer works patients or medical records.
const activityLabel = (record, role) => {
  if (role === "doctor") return record.doctor?.diagnosis || "Visit completed";
  if (role === "nurse") return "Vitals recorded";
  if (role === "pharmacist") {
    const count = record.pharmacy?.medications?.length || 0;
    return count > 0
      ? `${count} medication${count === 1 ? "" : "s"} dispensed`
      : "Visit completed";
  }
  return "Visit completed";
};

// Same action->icon/color mapping used in AuditLogs.jsx, trimmed to what
// actually shows up on the dashboard feed.
const auditActionIcon = (action) => {
  const icons = {
    CREATE: UserPlus,
    UPDATE: Shield,
    DELETE: AlertCircle,
    LOGIN: UserCheck,
  };
  return icons[action?.toUpperCase()] || Activity;
};

const UnifiedDashboard = () => {
  const navigate = useNavigate();
  const { user, userRole, isAdmin, isDoctor, isReceptionist, isNurse } =
    useAuth();
  const isPharmacist = userRole === "pharmacist";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);
  // Admin-only feed: latest system/audit events instead of visit activity.
  const [adminActivity, setAdminActivity] = useState([]);

  const loadAdminDashboard = useCallback(async () => {
    // Admin's domain is staff, rooms, and system oversight — not individual
    // patients or medical records, so none of that is queried here.
    const [staffSnap, roomsData, auditTodaySnap, recentAuditSnap] =
      await Promise.all([
        getDocs(query(collection(db, "users"), where("isStaff", "==", true))),
        getAllNurseRooms(),
        getCountFromServer(
          query(
            collection(db, "auditLogs"),
            where("timestamp", ">=", startOfToday()),
          ),
        ),
        getDocs(
          query(
            collection(db, "auditLogs"),
            orderBy("timestamp", "desc"),
            limit(5),
          ),
        ),
      ]);

    const staffDocs = staffSnap.docs.map((d) => d.data());
    const totalRooms = roomsData.length;
    const roomsInUse = roomsData.filter(
      (r) => (r.nurses?.length || 0) > 0,
    ).length;

    setMetrics({
      totalStaff: staffDocs.length,
      activeStaff: staffDocs.filter((u) => u.isActive !== false).length,
      totalRooms,
      roomsInUse,
      auditEventsToday: auditTodaySnap.data().count,
    });

    // Resolve the acting user's name for each of the 5 recent log entries.
    const recentLogs = recentAuditSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      timestamp: d.data().timestamp?.toDate() || new Date(),
    }));
    const uids = [...new Set(recentLogs.map((l) => l.userId).filter(Boolean))];
    const nameMap = {};
    await Promise.all(
      uids.map(async (uid) => {
        const uDoc = await getDoc(doc(db, "users", uid));
        if (uDoc.exists()) {
          const d = uDoc.data();
          nameMap[uid] =
            `${d.firstName || ""} ${d.lastName || ""}`.trim() ||
            d.email ||
            "Unknown user";
        }
      }),
    );

    setAdminActivity(
      recentLogs.map((l) => ({
        ...l,
        userName: nameMap[l.userId] || "Unknown user",
      })),
    );
  }, []);

  const loadStaffDashboard = useCallback(async () => {
    const [activeRecords, completedToday] = await Promise.all([
      getActiveMedicalRecords(),
      getRecentlyCompletedRecords(startOfToday()),
    ]);

    const countByStatus = (status) =>
      activeRecords.filter((r) => r.status === status).length;
    const revenueToday = completedToday.reduce(
      (sum, r) => sum + (r.billing?.totalAmount || 0),
      0,
    );

    let patientsCount = null;
    let appointmentsToday = null;

    // Only receptionist needs the clinic-wide patient/appointment counts —
    // doctor/nurse/pharmacist stats are all queue-based (see countByStatus).
    if (isReceptionist) {
      const patientsSnap = await getDocs(
        query(collection(db, "users"), where("isPatient", "==", true)),
      );
      patientsCount = patientsSnap.size;

      try {
        const apptSnap = await getDocs(
          query(
            collection(db, "appointments"),
            where("date", "==", todayStr()),
          ),
        );
        appointmentsToday = apptSnap.size;
      } catch (e) {
        console.warn("Could not load today's appointments:", e);
      }
    }

    setMetrics({
      patientsCount,
      appointmentsToday,
      activeRecordsCount: activeRecords.length,
      completedTodayCount: completedToday.length,
      revenueToday,
      waitingReception: countByStatus("reception"),
      waitingNurse: countByStatus("nurse"),
      waitingDoctor: countByStatus("doctor"),
      waitingPharmacy: countByStatus("pharmacy"),
      waitingBilling: countByStatus("billing"),
    });

    // Only show visits *this person* actually touched today.
    const identity = user?.displayName || user?.email;
    const relevantToMe = (record) => {
      if (isDoctor) return record.doctor?.recordedBy === identity;
      if (isNurse) return record.vitals?.recordedBy === identity;
      if (isPharmacist) return record.pharmacy?.dispensedBy === identity;
      if (isReceptionist)
        return (
          record.reception?.checkedInBy === identity ||
          record.billing?.billedBy === identity
        );
      return false;
    };

    const mine = completedToday.filter(relevantToMe).slice(0, 5);
    const patientIds = [...new Set(mine.map((r) => r.patientId))];
    const nameMap = {};
    await Promise.all(
      patientIds.map(async (pid) => {
        const pDoc = await getDoc(doc(db, "users", pid));
        if (pDoc.exists()) {
          const d = pDoc.data();
          nameMap[pid] = `${d.firstName || ""} ${d.lastName || ""}`.trim();
        }
      }),
    );

    setRecentActivity(
      mine.map((r) => ({
        ...r,
        patientName: nameMap[r.patientId] || "Unknown patient",
        label: activityLabel(r, userRole),
      })),
    );
  }, [isReceptionist, isDoctor, isNurse, isPharmacist, userRole, user]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isAdmin) {
        await loadAdminDashboard();
      } else {
        await loadStaffDashboard();
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
      setError("Could not load dashboard data right now.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, loadAdminDashboard, loadStaffDashboard]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const getStats = () => {
    if (isAdmin)
      return [
        {
          title: "Total Staff",
          value: metrics.totalStaff ?? 0,
          icon: Shield,
          color: "bg-venus-primary-500/20 text-venus-primary-400",
        },
        {
          title: "Active Staff",
          value: metrics.activeStaff ?? 0,
          icon: UserCheck,
          color: "bg-venus-success/20 text-venus-success",
        },
        {
          title: "Nurse Rooms In Use",
          value: `${metrics.roomsInUse ?? 0} / ${metrics.totalRooms ?? 0}`,
          icon: DoorOpen,
          color: "bg-venus-warning/20 text-venus-warning",
        },
        {
          title: "Audit Events Today",
          value: metrics.auditEventsToday ?? 0,
          icon: Activity,
          color: "bg-venus-info/20 text-venus-info",
        },
      ];

    if (isDoctor)
      return [
        {
          title: "Waiting for Doctor",
          value: metrics.waitingDoctor ?? 0,
          icon: Stethoscope,
          color: "bg-purple-500/20 text-purple-400",
        },
        {
          title: "At Pharmacy",
          value: metrics.waitingPharmacy ?? 0,
          icon: Pill,
          color: "bg-green-500/20 text-green-400",
        },
        {
          title: "Awaiting Billing",
          value: metrics.waitingBilling ?? 0,
          icon: CreditCard,
          color: "bg-orange-500/20 text-orange-400",
        },
        {
          title: "Completed Today",
          value: metrics.completedTodayCount ?? 0,
          icon: CalendarCheck,
          color: "bg-venus-success/20 text-venus-success",
        },
      ];

    if (isReceptionist)
      return [
        {
          title: "Checked In",
          value: metrics.waitingReception ?? 0,
          icon: Users,
          color: "bg-venus-success/20 text-venus-success",
        },
        {
          title: "Active Visits",
          value: metrics.activeRecordsCount ?? 0,
          icon: ClipboardList,
          color: "bg-venus-warning/20 text-venus-warning",
        },
        {
          title: "Today's Appointments",
          value: metrics.appointmentsToday ?? "—",
          icon: CalendarCheck,
          color: "bg-venus-primary-500/20 text-venus-primary-400",
        },
        {
          title: "Completed Today",
          value: metrics.completedTodayCount ?? 0,
          icon: CheckCircle2,
          color: "bg-venus-info/20 text-venus-info",
        },
      ];

    if (isNurse)
      return [
        {
          title: "Vitals Pending",
          value: metrics.waitingNurse ?? 0,
          icon: Activity,
          color: "bg-venus-warning/20 text-venus-warning",
        },
        {
          title: "With Doctor",
          value: metrics.waitingDoctor ?? 0,
          icon: Stethoscope,
          color: "bg-purple-500/20 text-purple-400",
        },
        {
          title: "Completed Today",
          value: metrics.completedTodayCount ?? 0,
          icon: CalendarCheck,
          color: "bg-venus-success/20 text-venus-success",
        },
      ];

    if (isPharmacist)
      return [
        {
          title: "Awaiting Dispensing",
          value: metrics.waitingPharmacy ?? 0,
          icon: Pill,
          color: "bg-green-500/20 text-green-400",
        },
        {
          title: "Awaiting Billing",
          value: metrics.waitingBilling ?? 0,
          icon: CreditCard,
          color: "bg-orange-500/20 text-orange-400",
        },
        {
          title: "Completed Today",
          value: metrics.completedTodayCount ?? 0,
          icon: CalendarCheck,
          color: "bg-venus-success/20 text-venus-success",
        },
      ];

    return [];
  };

  const getQuickActions = () => {
    const actions = [];

    if (isAdmin) {
      actions.push(
        {
          icon: Shield,
          label: "Manage Users",
          onClick: () => navigate("/admin/users"),
        },
        {
          icon: DoorOpen,
          label: "Manage Nurse Rooms",
          onClick: () => navigate("/admin/nurse-rooms"),
        },
        {
          icon: Activity,
          label: "View Audit Logs",
          onClick: () => navigate("/admin/audit"),
        },
      );
      return actions;
    }

    if (isReceptionist) {
      actions.push(
        {
          icon: UserPlus,
          label: "Register New Patient",
          onClick: () => navigate("/patients/register"),
        },
        {
          icon: CalendarCheck,
          label: "Schedule Appointment",
          onClick: () => navigate("/appointments"),
        },
        {
          icon: ClipboardList,
          label: "Start New Visit",
          onClick: () => navigate("/medical-records/create"),
        },
      );
    }

    if (isDoctor) {
      actions.push(
        {
          icon: FileText,
          label: "View Medical Records",
          onClick: () => navigate("/medical-records"),
        },
        {
          icon: Users,
          label: "View Patient Queue",
          onClick: () => navigate("/appointments"),
        },
      );
    }

    // Nurse just gets a direct link into medical records to pick up their
    // next vitals check.
    if (isNurse) {
      actions.push({
        icon: FileText,
        label: "View Medical Records",
        onClick: () => navigate("/medical-records"),
      });
    }

    if (isPharmacist) {
      actions.push({
        icon: Pill,
        label: "View Pharmacy Queue",
        onClick: () => navigate("/medical-records"),
      });
    }

    return actions;
  };

  if (loading) {
    return <PageSkeleton variant="dashboard" />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <AlertCircle className="w-10 h-10 text-venus-danger" />
        <p className="text-venus-danger">{error}</p>
        <button onClick={loadDashboard} className="btn-secondary">
          Retry
        </button>
      </div>
    );
  }

  const stats = getStats();
  const quickActions = getQuickActions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-venus-text-primary">
          Good{" "}
          {new Date().getHours() < 12
            ? "Morning"
            : new Date().getHours() < 17
              ? "Afternoon"
              : "Evening"}
          , {user?.displayName?.split(" ")[0] || "there"}
        </h1>
        <p className="text-venus-text-muted mt-1">
          {isAdmin
            ? "Here's the current state of the system"
            : "Here's what's happening at the clinic today"}
        </p>
      </div>

      {(isDoctor || isNurse) && <DutyToggle />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {(isAdmin || isReceptionist || isPharmacist || isDoctor || isNurse) && (
        <div>
          <h2 className="text-lg font-semibold text-venus-text-primary mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <QuickAction key={index} {...action} />
            ))}
          </div>
        </div>
      )}

      {isAdmin ? (
        <div className="bg-venus-bg-secondary border border-venus-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-venus-text-primary">
              Recent System Activity
            </h2>
            <button
              onClick={() => navigate("/admin/audit")}
              className="text-sm text-venus-primary-400 hover:text-venus-primary-300 flex items-center gap-1 transition-colors"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {adminActivity.length === 0 ? (
            <p className="text-venus-text-muted text-sm italic">
              No system activity recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {adminActivity.map((log) => {
                const LogIcon = auditActionIcon(log.action);
                return (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 p-3 bg-venus-bg-tertiary rounded-lg"
                  >
                    <div className="w-10 h-10 bg-venus-primary-500/20 rounded-full flex items-center justify-center shrink-0">
                      <LogIcon className="w-5 h-5 text-venus-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-venus-text-primary truncate">
                        {log.userName} {log.action?.toLowerCase()}d a{" "}
                        {log.resourceType || "record"}
                      </p>
                      <p className="text-xs text-venus-text-muted">
                        {formatRelativeTime(log.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-venus-bg-secondary border border-venus-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-venus-text-primary">
              Your Recent Activity
            </h2>
            <button
              onClick={() => navigate("/medical-records")}
              className="text-sm text-venus-primary-400 hover:text-venus-primary-300 flex items-center gap-1 transition-colors"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-venus-text-muted text-sm italic">
              Nothing completed by you today yet.
            </p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-4 p-3 bg-venus-bg-tertiary rounded-lg"
                >
                  <div className="w-10 h-10 bg-venus-primary-500/20 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-venus-primary-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-venus-text-primary">
                      {record.label} — {record.patientName}
                    </p>
                    <p className="text-xs text-venus-text-muted">
                      {formatDate(record.visitDate)} • K
                      {record.billing?.totalAmount ?? 0}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UnifiedDashboard;
