import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { db, auth } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { useAuditLog } from "../../hooks/useAuditLog";
import { calculateAge } from "../../utils/formatters";
import FloatingInput from "../../components/common/FloatingInput";
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
  ChevronDown,
  ArrowLeft,
  Check,
  X,
} from "lucide-react";

// Same job-role config as User Management — read-only badge only; changing
// a role still requires an admin.
const roleConfig = {
  admin: {
    label: "Admin",
    color:
      "bg-venus-primary-500/15 text-venus-primary-400 border-venus-primary-500/30",
  },
  doctor: {
    label: "Doctor",
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  receptionist: {
    label: "Receptionist",
    color: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  },
  pharmacist: {
    label: "Pharmacist",
    color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  nurse: {
    label: "Nurse",
    color: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  },
  patient: {
    label: "Patient",
    color: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  },
};

// Password policy (matches what the login/zod schema enforces at 6 chars
// minimum on purpose — profile changes are stricter than the login form's
// schema check, which only validates format, not strength).
const PASSWORD_REQUIREMENTS = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (pw) => pw.length >= 8,
  },
  {
    id: "upper",
    label: "One uppercase letter (A-Z)",
    test: (pw) => /[A-Z]/.test(pw),
  },
  {
    id: "lower",
    label: "One lowercase letter (a-z)",
    test: (pw) => /[a-z]/.test(pw),
  },
  {
    id: "symbol",
    label: "One special character (!@#$...)",
    test: (pw) => /[^A-Za-z0-9]/.test(pw),
  },
];

const passwordMeetsPolicy = (pw) =>
  PASSWORD_REQUIREMENTS.every((r) => r.test(pw));

// ------- Collapsible section wrapper -------
// Only one section open at a time; the parent holds `openSection`.
const Section = ({
  id,
  icon: Icon,
  title,
  subtitle,
  open,
  onToggle,
  children,
}) => (
  <div className="card overflow-hidden">
    <button
      type="button"
      onClick={() => onToggle(id)}
      aria-expanded={open}
      className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-venus-bg-tertiary/50 transition-colors"
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${open ? "bg-venus-primary-500/15" : "bg-venus-bg-tertiary"}`}
      >
        <Icon
          className={`w-4.5 h-4.5 w-5 h-5 ${open ? "text-venus-primary-400" : "text-venus-text-muted"}`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-semibold text-venus-text-primary">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-venus-text-muted truncate">{subtitle}</p>
        )}
      </div>
      <ChevronDown
        className={`w-5 h-5 text-venus-text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      />
    </button>

    <div
      className={`grid transition-all duration-200 ease-in-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
    >
      <div className="overflow-hidden">
        <div className="px-5 pb-5 pt-1">{children}</div>
      </div>
    </div>
  </div>
);

const ProfilePage = () => {
  const { user: currentUser, userRole } = useAuth();
  const { logAction } = useAuditLog();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [patientInfoId, setPatientInfoId] = useState(null);

  // Personal Information is open by default; Change Password is collapsed
  // until the header is clicked. Exactly one section open at a time.
  const [openSection, setOpenSection] = useState(null); // both sections start collapsed
  const toggleSection = (id) =>
    setOpenSection((prev) => (prev === id ? null : id));

  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    DOB: "",
    gender: "male",
    nrcNumber: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // users/{uid} holds name/role; phone/DOB/gender/NRC/address/emergency
  // contact live on the patientInfo subdocument (auto-generated id).
  useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser?.uid) return;
      try {
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        const userData = userSnap.exists() ? userSnap.data() : {};

        const patientInfoSnap = await getDocs(
          collection(db, "users", currentUser.uid, "patientInfo"),
        );
        const patientInfoDoc = patientInfoSnap.docs[0];
        const patientData = patientInfoDoc ? patientInfoDoc.data() : {};
        setPatientInfoId(patientInfoDoc ? patientInfoDoc.id : null);

        setProfile({ ...userData, ...patientData });
        setProfileForm({
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          phone: userData.phone || "",
          DOB: patientData.DOB || "",
          gender: patientData.gender || "male",
          nrcNumber: patientData.nrcNumber || "",
          address: patientData.address || "",
          emergencyContactName: patientData.emergencyContactName || "",
          emergencyContactPhone: patientData.emergencyContactPhone || "",
        });
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [currentUser?.uid]);

  // Auto-clear toasts
  useEffect(() => {
    if (!profileSuccess) return;
    const t = setTimeout(() => setProfileSuccess(""), 4000);
    return () => clearTimeout(t);
  }, [profileSuccess]);

  useEffect(() => {
    if (!passwordSuccess) return;
    const t = setTimeout(() => setPasswordSuccess(""), 4000);
    return () => clearTimeout(t);
  }, [passwordSuccess]);

  const setField = (setter) => (e) =>
    setter((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    if (!profileForm.firstName.trim() || !profileForm.lastName.trim()) {
      setProfileError("First and last name are required.");
      return;
    }
    if (!profileForm.phone.trim()) {
      setProfileError("Phone number is required.");
      return;
    }
    if (!profileForm.address.trim()) {
      setProfileError("Address is required.");
      return;
    }

    setProfileSaving(true);
    try {
      const age = profileForm.DOB ? calculateAge(profileForm.DOB) : null;

      const userUpdates = {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        searchableName: `${profileForm.firstName.toLowerCase()} ${profileForm.lastName.toLowerCase()}`,
        updatedAt: serverTimestamp(),
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
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "users", currentUser.uid), userUpdates);

      if (patientInfoId) {
        await updateDoc(
          doc(db, "users", currentUser.uid, "patientInfo", patientInfoId),
          patientInfoUpdates,
        );
      } else {
        const newDoc = await addDoc(
          collection(db, "users", currentUser.uid, "patientInfo"),
          patientInfoUpdates,
        );
        setPatientInfoId(newDoc.id);
      }

      const fullName = `${profileForm.firstName} ${profileForm.lastName}`;
      if (auth.currentUser && auth.currentUser.displayName !== fullName) {
        await updateProfile(auth.currentUser, { displayName: fullName });
      }

      await logAction("update", "user", currentUser.uid, {
        field: "profile",
        self: true,
      });

      setProfile((prev) => ({
        ...prev,
        ...userUpdates,
        ...patientInfoUpdates,
      }));
      setProfileSuccess("Your profile has been updated successfully.");
    } catch (err) {
      console.error("Error updating profile:", err);
      setProfileError("Failed to update profile. Please try again.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword) {
      setPasswordError("Enter your current password to confirm this change.");
      return;
    }
    if (!passwordMeetsPolicy(newPassword)) {
      setPasswordError(
        "New password must be 8+ characters with uppercase, lowercase, and a special character.",
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError(
        "New password must be different from your current password.",
      );
      return;
    }

    setPasswordSaving(true);
    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword,
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);

      await logAction("update", "user", currentUser.uid, {
        field: "password",
        self: true,
      });

      // Best-effort notification email — sent client-side via EmailJS since
      // we're on the Spark (free) plan and can't use Cloud Functions /
      // Firebase Extensions. A failure here must never block the fact that
      // the password itself was already changed successfully.

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordSuccess("Your password has been changed successfully.");
    } catch (err) {
      console.error("Error changing password:", err);
      let msg = "Failed to change password. Please try again.";
      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        msg = "Current password is incorrect.";
      } else if (err.code === "auth/too-many-requests") {
        msg = "Too many attempts. Please wait a moment and try again.";
      } else if (err.code === "auth/weak-password") {
        msg =
          "Password is too weak. Use 8+ characters with uppercase, lowercase, and a special character.";
      }
      setPasswordError(msg);
    } finally {
      setPasswordSaving(false);
    }
  };

  const getInitials = (firstName, lastName) =>
    `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "U";

  const role = roleConfig[userRole] || roleConfig.patient;
  const newPw = passwordForm.newPassword;
  const confirmMatches =
    passwordForm.confirmPassword.length > 0 &&
    passwordForm.confirmPassword === newPw;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-venus-primary-500"></div>
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
          <h1 className="text-2xl font-bold text-venus-text-primary">
            My Profile
          </h1>
          <p className="text-venus-text-muted mt-1">
            Manage your personal information and password
          </p>
        </div>
      </div>

      {/* Identity Card */}
      <div className="card flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-venus-primary-500/20 flex items-center justify-center text-venus-primary-400 text-xl font-bold shrink-0">
          {getInitials(profileForm.firstName, profileForm.lastName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-venus-text-primary truncate">
            {profileForm.firstName} {profileForm.lastName}
          </p>
          <p className="text-sm text-venus-text-muted truncate">
            {currentUser?.email}
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border shrink-0 ${role.color}`}
        >
          <Shield className="w-3.5 h-3.5" />
          {role.label}
        </div>
      </div>

      {/* 1. Personal Information (collapsed until clicked) */}
      <Section
        id="profile"
        icon={User}
        title="Personal Information"
        subtitle="Name, contact details, and emergency contact"
        open={openSection === "profile"}
        onToggle={toggleSection}
      >
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
                  name="firstName"
                  required
                  value={profileForm.firstName}
                  onChange={setField(setProfileForm)}
                  className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-venus-primary-500 focus:ring-1 focus:ring-venus-primary-500/20 transition-all"
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
                  name="lastName"
                  required
                  value={profileForm.lastName}
                  onChange={setField(setProfileForm)}
                  className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-venus-primary-500 focus:ring-1 focus:ring-venus-primary-500/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Email stays read-only: changing an auth email needs its own
              verification flow, kept out of scope so login never breaks. */}
          <div>
            <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
              <input
                type="email"
                disabled
                value={currentUser?.email || ""}
                className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary/50 border border-venus-border rounded-lg text-sm text-venus-text-muted cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-venus-text-muted mt-1">
              Contact an admin to change your email address.
            </p>
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
                  name="phone"
                  required
                  value={profileForm.phone}
                  onChange={setField(setProfileForm)}
                  className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-venus-primary-500 focus:ring-1 focus:ring-venus-primary-500/20 transition-all"
                  placeholder="Not provided"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
                NRC Number
              </label>
              <div className="relative">
                <Contact className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                <input
                  type="text"
                  name="nrcNumber"
                  value={profileForm.nrcNumber}
                  onChange={setField(setProfileForm)}
                  className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-venus-primary-500 focus:ring-1 focus:ring-venus-primary-500/20 transition-all"
                  placeholder="Not provided"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
                Date of Birth
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                <input
                  type="date"
                  name="DOB"
                  value={profileForm.DOB}
                  onChange={setField(setProfileForm)}
                  className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-venus-primary-500 focus:ring-1 focus:ring-venus-primary-500/20 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
                Gender
              </label>
              <select
                name="gender"
                value={profileForm.gender}
                onChange={setField(setProfileForm)}
                className="w-full px-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-venus-primary-500 focus:ring-1 focus:ring-venus-primary-500/20 transition-all"
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
                name="address"
                rows={2}
                required
                value={profileForm.address}
                onChange={setField(setProfileForm)}
                className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-venus-primary-500 focus:ring-1 focus:ring-venus-primary-500/20 transition-all resize-none"
                placeholder="Not provided"
              />
            </div>
          </div>

          <div className="border border-venus-border rounded-lg p-4 space-y-4">
            <h5 className="text-xs font-medium text-venus-text-muted">
              Emergency Contact
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-venus-text-muted mb-1">
                  Name
                </label>
                <input
                  type="text"
                  name="emergencyContactName"
                  value={profileForm.emergencyContactName}
                  onChange={setField(setProfileForm)}
                  className="w-full px-3 py-2 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-venus-primary-500"
                  placeholder="Not provided"
                />
              </div>
              <div>
                <label className="block text-xs text-venus-text-muted mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="emergencyContactPhone"
                  value={profileForm.emergencyContactPhone}
                  onChange={setField(setProfileForm)}
                  className="w-full px-3 py-2 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-venus-primary-500"
                  placeholder="Not provided"
                />
              </div>
            </div>
          </div>

          {profileError && (
            <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400/90 flex-1">{profileError}</p>
            </div>
          )}
          {profileSuccess && (
            <div className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-400/90 flex-1">
                {profileSuccess}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={profileSaving}
              className="px-5 py-2.5 bg-venus-primary-500 hover:bg-venus-primary-600 text-white rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {profileSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </Section>

      {/* 2. Change Password (collapsed until clicked) */}
      <Section
        id="password"
        icon={Lock}
        title="Change Password"
        subtitle="Enter your current password to set a new one"
        open={openSection === "password"}
        onToggle={toggleSection}
      >
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <FloatingInput
            label="Current Password"
            name="currentPassword"
            type="password"
            icon={Key}
            autoComplete="current-password"
            value={passwordForm.currentPassword}
            onChange={setField(setPasswordForm)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FloatingInput
              label="New Password"
              name="newPassword"
              type="password"
              icon={Key}
              autoComplete="new-password"
              value={passwordForm.newPassword}
              onChange={setField(setPasswordForm)}
            />
            <div>
              <FloatingInput
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                icon={Key}
                autoComplete="new-password"
                value={passwordForm.confirmPassword}
                onChange={setField(setPasswordForm)}
              />
              {confirmMatches && (
                <p className="mt-1 text-xs text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Passwords match
                </p>
              )}
            </div>
          </div>

          {/* Live requirements checklist — only shown while typing a new password */}
          {newPw.length > 0 && (
            <div className="border border-venus-border rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-medium text-venus-text-muted mb-2">
                New password must include:
              </p>
              {PASSWORD_REQUIREMENTS.map((req) => {
                const passed = req.test(newPw);
                return (
                  <p
                    key={req.id}
                    className={`text-xs flex items-center gap-2 ${passed ? "text-emerald-400" : "text-venus-text-muted"}`}
                  >
                    {passed ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                    {req.label}
                  </p>
                );
              })}
            </div>
          )}

          {passwordError && (
            <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400/90 flex-1">{passwordError}</p>
            </div>
          )}
          {passwordSuccess && (
            <div className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-400/90 flex-1">
                {passwordSuccess}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={passwordSaving}
              className="px-5 py-2.5 bg-venus-primary-500 hover:bg-venus-primary-600 text-white rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {passwordSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Updating...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" /> Update Password
                </>
              )}
            </button>
          </div>
        </form>
      </Section>
    </div>
  );
};

export default ProfilePage;
