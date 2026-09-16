import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { registerStaff } from "../../firebase/auth";
import { useAuditLog } from "../../hooks/useAuditLog";
import { calculateAge } from "../../utils/formatters";
import { DEFAULT_GENERATED_PASSWORD, isStrongPassword } from "../../utils/validators";
import {
  ArrowLeft,
  Shield,
  Stethoscope,
  Phone,
  Pill,
  HeartPulse,
  Plus,
  Mail,
  User,
  Key,
  AlertCircle,
  Loader2,
  Calendar,
  MapPin,
  Contact,
} from "lucide-react";

const roles = [
  { value: "admin", label: "Admin", icon: Shield },
  { value: "doctor", label: "Doctor", icon: Stethoscope },
  { value: "receptionist", label: "Receptionist", icon: Phone },
  { value: "pharmacist", label: "Pharmacist", icon: Pill },
  { value: "nurse", label: "Nurse", icon: HeartPulse },
];

const CreateStaffPage = () => {
  const navigate = useNavigate();
  const { logAction } = useAuditLog();
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "receptionist",
    phone: "",
    DOB: "",
    gender: "male",
    nrcNumber: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreateLoading(true);

    try {
      if (!createForm.phone.trim()) {
        setCreateError("Phone number is required.");
        setCreateLoading(false);
        return;
      }
      if (!createForm.DOB) {
        setCreateError("Date of birth is required.");
        setCreateLoading(false);
        return;
      }
      if (!createForm.nrcNumber.trim()) {
        setCreateError("NRC number is required.");
        setCreateLoading(false);
        return;
      }
      if (!createForm.address.trim()) {
        setCreateError("Address is required.");
        setCreateLoading(false);
        return;
      }
      if (createForm.password && !isStrongPassword(createForm.password)) {
        setCreateError(
          `Password must include [8+] characters, [a-z], [A-Z], [0-9], and at least one symbol. Or leave it blank to use the default (${DEFAULT_GENERATED_PASSWORD}).`,
        );
        setCreateLoading(false);
        return;
      }

      const usersQuery = query(
        collection(db, "users"),
        where("email", "==", createForm.email),
      );
      const existingUsers = await getDocs(usersQuery);
      if (!existingUsers.empty) {
        setCreateError("A user with this email already exists in the system.");
        setCreateLoading(false);
        return;
      }

      const age = createForm.DOB ? calculateAge(createForm.DOB) : null;
      const usedDefaultPassword = !createForm.password;
      const finalPassword = createForm.password || DEFAULT_GENERATED_PASSWORD;

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

      const result = await registerStaff(
        createForm.email,
        finalPassword,
        staffData,
      );

      await logAction("create", "staff", result.uid, {
        name: `${createForm.firstName} ${createForm.lastName}`,
        email: createForm.email,
        role: createForm.role,
        patientNumber: result.patientNumber,
        patientInfoId: result.patientInfoId,
      });

      navigate("/admin/users", {
        state: {
          successMessage:
            `${createForm.firstName} ${createForm.lastName} was created successfully as ${createForm.role} (${result.patientNumber}). ` +
            `They can now log in with their email and ${usedDefaultPassword ? `the default password (${DEFAULT_GENERATED_PASSWORD})` : "the password you set"}.`,
        },
      });
    } catch (err) {
      console.error("Error creating user:", err);
      let errorMessage = "Failed to create staff account. Please try again.";
      if (err.code === "auth/email-already-in-use") {
        errorMessage =
          "This email is already registered in Firebase Authentication. Use a different email or delete the existing auth user first.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email address format.";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Use at least 6 characters.";
      } else if (err.code === "auth/network-request-failed") {
        errorMessage = "Network error. Check your internet connection.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      setCreateError(errorMessage);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/admin/users")}
        className="flex items-center gap-2 text-venus-text-muted hover:text-venus-text-primary transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to User Management
      </button>

      <div>
        <h1 className="text-2xl font-bold text-venus-text-primary">
          Create New Staff Account
        </h1>
        <p className="text-venus-text-muted mt-1">
          Staff are also registered as patients in the system
        </p>
      </div>

      <form onSubmit={handleCreateUser} className="space-y-6">
        <div className="card space-y-4">
          <h4 className="text-sm font-semibold text-venus-text-primary flex items-center gap-2">
            <Shield className="w-4 h-4 text-venus-primary-400" />
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
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, firstName: e.target.value }))
                  }
                  className="input-field pl-10"
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
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, lastName: e.target.value }))
                  }
                  className="input-field pl-10"
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
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, email: e.target.value }))
                }
                className="input-field pl-10"
                placeholder="john.doe@clinic.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
                Password{" "}
                <span className="text-xs font-normal text-venus-text-muted">
                  (optional — defaults to Venus@123)
                </span>
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, password: e.target.value }))
                  }
                  className="input-field pl-10"
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
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, role: e.target.value }))
                  }
                  className="input-field pl-10 appearance-none"
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

        <div className="card space-y-4">
          <h4 className="text-sm font-semibold text-venus-text-primary flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-rose-400" />
            Staff Information{" "}
            <span className="text-xs font-normal text-venus-text-muted">
              (Required — Enter personal details for the staff being registered.)
            </span>
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
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  className="input-field pl-10"
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
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, nrcNumber: e.target.value }))
                  }
                  className="input-field pl-10"
                  placeholder="123456/78/9"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, DOB: e.target.value }))
                  }
                  className="input-field pl-10"
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
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, gender: e.target.value }))
                }
                className="input-field"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Address <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-venus-text-muted" />
              <textarea
                rows={2}
                required
                value={createForm.address}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, address: e.target.value }))
                }
                className="input-field pl-10 resize-none"
                placeholder="123 Main Street, Kitwe"
              />
            </div>
          </div>

          <div className="border border-venus-border rounded-lg p-4 space-y-4">
            <h5 className="text-xs font-medium text-venus-text-muted">
              Emergency Contact (Optional)
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-venus-text-muted mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={createForm.emergencyContactName}
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      emergencyContactName: e.target.value,
                    }))
                  }
                  className="input-field"
                  placeholder="Contact name"
                />
              </div>
              <div>
                <label className="block text-xs text-venus-text-muted mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={createForm.emergencyContactPhone}
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      emergencyContactPhone: e.target.value,
                    }))
                  }
                  className="input-field"
                  placeholder="+260 97 1234567"
                />
              </div>
            </div>
          </div>
        </div>

        {createError && (
          <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{createError}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/users")}
            className="flex-1 px-4 py-2.5 border border-venus-border text-venus-text-primary rounded-lg text-sm font-medium hover:bg-venus-bg-elevated transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createLoading}
            className="flex-1 px-4 py-2.5 bg-venus-primary-500 hover:bg-venus-primary-600 text-white rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
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
      </form>
    </div>
  );
};

export default CreateStaffPage;
