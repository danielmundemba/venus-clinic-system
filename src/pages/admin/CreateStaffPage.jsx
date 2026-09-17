import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { registerStaff } from "../../firebase/auth";
import { useAuditLog } from "../../hooks/useAuditLog";
import { calculateAge } from "../../utils/formatters";
import { generateSecurePassword } from "../../utils/passwordGenerator";
import { sendNewAccountEmail } from "../../utils/emailService";
import FloatingInput from "../../components/common/FloatingInput";
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
  Briefcase,
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

  const setField = (e) =>
    setCreateForm((p) => ({ ...p, [e.target.name]: e.target.value }));

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

      // Nobody types this — a fresh, policy-compliant password is
      // generated per account and emailed to the new staff member.
      // It's never displayed in the UI and never logged.
      const generatedPassword = generateSecurePassword();

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
        generatedPassword,
        staffData,
      );

      // Best-effort: the account is already created at this point, so an
      // email failure shouldn't block the flow or be treated as the
      // creation itself failing. It just means someone will need to
      // trigger a password reset for this user manually.
      const emailResult = await sendNewAccountEmail({
        toEmail: createForm.email,
        toName: `${createForm.firstName} ${createForm.lastName}`,
        tempPassword: generatedPassword,
        role: createForm.role,
      });

      await logAction("create", "staff", result.uid, {
        name: `${createForm.firstName} ${createForm.lastName}`,
        email: createForm.email,
        role: createForm.role,
        patientNumber: result.patientNumber,
        patientInfoId: result.patientInfoId,
      });

      navigate("/admin/users", {
        state: {
          successMessage: emailResult.success
            ? `${createForm.firstName} ${createForm.lastName} was created successfully as ${createForm.role} (${result.patientNumber}). Their login details were emailed to ${createForm.email}.`
            : `${createForm.firstName} ${createForm.lastName} was created successfully as ${createForm.role} (${result.patientNumber}), but the welcome email couldn't be sent. Use "Forgot password" to get them a login link.`,
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
          Staff are also registered as patients in the system. A secure password
          is generated automatically and emailed to them.
        </p>
      </div>

      <form onSubmit={handleCreateUser} className="space-y-6">
        <div className="card space-y-4">
          <h4 className="text-sm font-semibold text-venus-text-primary flex items-center gap-2">
            <Shield className="w-4 h-4 text-venus-primary-400" />
            Account Information
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FloatingInput
              label="First Name"
              name="firstName"
              icon={User}
              value={createForm.firstName}
              onChange={setField}
            />
            <FloatingInput
              label="Last Name"
              name="lastName"
              icon={User}
              value={createForm.lastName}
              onChange={setField}
            />
          </div>

          <FloatingInput
            label="Email Address"
            name="email"
            type="email"
            icon={Mail}
            value={createForm.email}
            onChange={setField}
          />

          <div>
            <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
              Role <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted pointer-events-none" />
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

        <div className="card space-y-4">
          {/* Briefcase instead of HeartPulse — this section is job/work
              details for the staff member, not a health record, so a
              medical icon here was misleading. */}
          <h4 className="text-sm font-semibold text-venus-text-primary flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-venus-primary-400" />
            Staff Information{" "}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FloatingInput
              label="Phone Number"
              name="phone"
              type="tel"
              icon={Phone}
              value={createForm.phone}
              onChange={setField}
            />
            <FloatingInput
              label="NRC Number"
              name="nrcNumber"
              icon={Contact}
              value={createForm.nrcNumber}
              onChange={setField}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FloatingInput
              label="Date of Birth"
              name="DOB"
              type="date"
              icon={Calendar}
              value={createForm.DOB}
              onChange={setField}
            />
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

          <FloatingInput
            label="Address"
            name="address"
            icon={MapPin}
            value={createForm.address}
            onChange={setField}
          />

          <div className="border border-venus-border rounded-lg p-4 space-y-4">
            <h5 className="text-xs font-medium text-venus-text-muted">
              Emergency Contact (Optional)
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FloatingInput
                label="Name"
                name="emergencyContactName"
                value={createForm.emergencyContactName}
                onChange={setField}
              />
              <FloatingInput
                label="Phone"
                name="emergencyContactPhone"
                type="tel"
                value={createForm.emergencyContactPhone}
                onChange={setField}
              />
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
