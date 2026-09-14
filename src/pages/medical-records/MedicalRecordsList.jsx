import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import {
  getActiveMedicalRecords,
  getRecentlyCompletedRecords,
} from "../../firebase/db";
import RowActionsMenu from "../../components/common/RowActionsMenu";
import {
  ClipboardList,
  Eye,
  Loader2,
  User,
  Calendar,
  Clock,
  Stethoscope,
  Pill,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  X,
} from "lucide-react";

const statusConfig = {
  reception: {
    label: "Reception",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    icon: ClipboardList,
  },
  nurse: {
    label: "Nurse/Vitals",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    icon: Stethoscope,
  },
  doctor: {
    label: "Doctor",
    color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    icon: Stethoscope,
  },
  pharmacy: {
    label: "Pharmacy",
    color: "bg-green-500/10 text-green-500 border-green-500/20",
    icon: Pill,
  },
  billing: {
    label: "Billing",
    color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    icon: CreditCard,
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    icon: CheckCircle2,
  },
};

// Which workflow stage each role's queue lives at — used to default the
// view to "just my part of the workflow" instead of everything at once.
const ROLE_STAGE = {
  receptionist: "reception",
  nurse: "nurse",
  doctor: "doctor",
  pharmacist: "pharmacy",
};

const MedicalRecordsList = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("mine"); // 'mine' | 'all' | 'completed'
  const [searchQuery, setSearchQuery] = useState("");

  const myStage = ROLE_STAGE[userRole] || null;

  useEffect(() => {
    loadRecords();
  }, [viewMode]);

  const loadRecords = async () => {
    setLoading(true);
    setError(null);

    try {
      let recordsData;
      if (viewMode === "completed") {
        recordsData = await getRecentlyCompletedRecords(
          new Date(Date.now() - 24 * 60 * 60 * 1000),
        );
      } else if (viewMode === "mine" && myStage) {
        recordsData = await getActiveMedicalRecords(myStage);
      } else {
        recordsData = await getActiveMedicalRecords();
      }

      const patientIds = [...new Set(recordsData.map((r) => r.patientId))];
      const patientMap = {};

      await Promise.all(
        patientIds.map(async (pid) => {
          const patientDoc = await getDoc(doc(db, "users", pid));
          if (patientDoc.exists()) {
            const data = patientDoc.data();
            patientMap[pid] = {
              name: `${data.firstName} ${data.lastName}`,
              phone: data.phone,
              patientNumber: data.patientNumber,
            };
          }
        }),
      );

      setRecords(
        recordsData.map((r) => ({
          ...r,
          patientName: patientMap[r.patientId]?.name || "Unknown",
          patientPhone: patientMap[r.patientId]?.phone || "",
          patientNumber: patientMap[r.patientId]?.patientNumber || "",
        })),
      );
    } catch (error) {
      console.error("Failed to load medical records:", error);
      if (error.message && error.message.includes("index")) {
        setError(
          "Firestore index required for this query — check the console for a direct link to create it.",
        );
      } else {
        setError(`Failed to load records: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      r.patientName.toLowerCase().includes(term) ||
      r.patientNumber.toLowerCase().includes(term) ||
      r.patientPhone.includes(searchQuery)
    );
  });

  const canCreateVisit = () => ["admin", "receptionist"].includes(userRole);

  const viewLabel = {
    mine: myStage
      ? `My Queue (${statusConfig[myStage].label})`
      : "Active Visits",
    all: "All Active Visits",
    completed: "Completed (24h)",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-venus-text-primary">
            Medical Records
          </h1>
          <p className="text-venus-text-muted mt-1">
            Manage patient visits and workflow
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="input-field !w-auto"
          >
            {myStage && <option value="mine">{viewLabel.mine}</option>}
            <option value="all">{viewLabel.all}</option>
            <option value="completed">{viewLabel.completed}</option>
          </select>
          {canCreateVisit() && (
            <button
              onClick={() => navigate("/medical-records/create")}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Visit
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="card bg-venus-danger/5 border-venus-danger/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-venus-danger flex-shrink-0 mt-0.5" />
            <p className="text-sm text-venus-danger font-medium">{error}</p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
          <input
            type="text"
            placeholder="Search by Patient ID, name, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary placeholder-venus-text-muted focus:outline-none focus:border-venus-primary-500 focus:ring-1 focus:ring-venus-primary-500/20 transition-all"
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

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-venus-bg-tertiary border-b border-venus-border">
                <th className="text-left text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">
                  Patient
                </th>
                <th className="text-left text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">
                  Visit
                </th>
                <th className="text-left text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">
                  Status
                </th>
                <th className="text-left text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">
                  Assigned Doctor
                </th>
                <th className="text-right text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-venus-border">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-venus-primary-400 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-12 text-center text-venus-text-muted"
                  >
                    {searchQuery
                      ? "No matching records"
                      : viewMode === "completed"
                        ? "No visits completed in the last 24 hours"
                        : "Nothing in this queue right now"}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const statusInfo =
                    statusConfig[record.status] || statusConfig.reception;
                  const StatusIcon = statusInfo.icon;

                  return (
                    <tr
                      key={record.id}
                      onClick={() =>
                        navigate(
                          `/medical-records/${record.patientId}/${record.id}`,
                        )
                      }
                      className="hover:bg-venus-bg-tertiary/50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-venus-primary-500/20 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-venus-primary-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-venus-text-primary">
                              {record.patientName}
                            </p>
                            <p className="text-xs text-venus-text-muted font-mono">
                              {record.patientNumber || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-sm text-venus-text-secondary">
                            <Calendar className="w-3.5 h-3.5 text-venus-text-muted" />
                            {record.visitDate}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-venus-text-muted">
                            <Clock className="w-3.5 h-3.5" />
                            {record.visitTime}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border ${statusInfo.color}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-venus-text-secondary">
                          {record.assignedDoctorName
                            ? `Dr. ${record.assignedDoctorName}`
                            : "—"}
                        </span>
                      </td>
                      <td
                        className="px-6 py-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <RowActionsMenu
                          actions={[
                            {
                              label: "View Record",
                              icon: Eye,
                              onClick: () =>
                                navigate(
                                  `/medical-records/${record.patientId}/${record.id}`,
                                ),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MedicalRecordsList;
