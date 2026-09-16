import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DEFAULT_GENERATED_PASSWORD, patientSchema } from "../../utils/validators";
import { registerPatient } from "../../firebase/auth";
import { useAuditLog } from "../../hooks/useAuditLog";
import { calculateAge } from "../../utils/formatters";
import {
  ArrowLeft,
  UserPlus,
  Loader2,
  AlertCircle,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Contact,
  HeartPulse,
} from "lucide-react";

const PatientRegistrationPage = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { logAction } = useAuditLog();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(patientSchema),
    defaultValues: { gender: "male" },
  });

  const dob = watch("DOB");
  const age = dob ? calculateAge(dob) : null;

  const onSubmit = async (data) => {
    setSubmitting(true);
    setError("");

    try {
      const patientData = {
        firstName: data.firstName,
        lastName: data.lastName,
        searchableName: `${data.firstName.toLowerCase()} ${data.lastName.toLowerCase()}`,
        phone: data.phone,
        DOB: data.DOB,
        gender: data.gender,
        age,
        nrcNumber: data.nrcNumber || null,
        address: data.address,
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactPhone: data.emergencyContactPhone || null,
        allergies: data.allergies || null,
      };

      const result = await registerPatient(data.email, DEFAULT_GENERATED_PASSWORD, patientData);

      await logAction("create", "patient", result.uid, {
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        patientNumber: result.patientNumber,
        patientInfoId: result.patientInfoId,
      });

      navigate("/patients", {
        state: {
          successMessage:
            `${data.firstName} ${data.lastName} was registered successfully as ${result.patientNumber}. ` +
            `They can now log in with their email and the default password (${DEFAULT_GENERATED_PASSWORD}).`,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      let errorMessage = "Failed to register patient";
      if (error.code === "auth/email-already-in-use") {
        errorMessage =
          "This email is already registered. Please use a different email.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/patients")}
        className="flex items-center gap-2 text-venus-text-muted hover:text-venus-text-primary transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Patients
      </button>

      <div>
        <h1 className="text-2xl font-bold text-venus-text-primary">
          Register New Patient
        </h1>
        <p className="text-venus-text-muted mt-1">
          Creates a patient account with the default password {DEFAULT_GENERATED_PASSWORD}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
              First Name <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
              <input
                {...register("firstName")}
                className="input-field pl-10"
                placeholder="John"
              />
            </div>
            {errors.firstName && (
              <p className="mt-1 text-xs text-red-400">
                {errors.firstName.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
              Last Name <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
              <input
                {...register("lastName")}
                className="input-field pl-10"
                placeholder="Doe"
              />
            </div>
            {errors.lastName && (
              <p className="mt-1 text-xs text-red-400">
                {errors.lastName.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
            Email Address <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
            <input
              {...register("email")}
              type="email"
              className="input-field pl-10"
              placeholder="patient@email.com"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
          )}
          <p className="mt-1 text-xs text-venus-text-muted">
            This will be used for login. Default password will be set to "{DEFAULT_GENERATED_PASSWORD}".
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
            NRC Number
          </label>
          <div className="relative">
            <Contact className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
            <input
              {...register("nrcNumber")}
              className="input-field pl-10"
              placeholder="123456/78/9"
            />
          </div>
          {errors.nrcNumber && (
            <p className="mt-1 text-xs text-red-400">
              {errors.nrcNumber.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Date of Birth <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
              <input
                {...register("DOB")}
                type="date"
                className="input-field pl-10"
              />
            </div>
            {errors.DOB && (
              <p className="mt-1 text-xs text-red-400">{errors.DOB.message}</p>
            )}
            {age !== null && (
              <p className="mt-1 text-xs text-venus-text-muted">
                {age} years old
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Gender <span className="text-red-400">*</span>
            </label>
            <select {...register("gender")} className="input-field">
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            {errors.gender && (
              <p className="mt-1 text-xs text-red-400">
                {errors.gender.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
            Phone Number <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
            <input
              {...register("phone")}
              className="input-field pl-10"
              placeholder="+260 97 1234567"
            />
          </div>
          {errors.phone && (
            <p className="mt-1 text-xs text-red-400">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
            Address <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-venus-text-muted" />
            <textarea
              {...register("address")}
              rows={2}
              className="input-field pl-10 resize-none"
              placeholder="123 Main Street, Kitwe"
            />
          </div>
          {errors.address && (
            <p className="mt-1 text-xs text-red-400">
              {errors.address.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
            Allergies
          </label>
          <div className="relative">
            <HeartPulse className="absolute left-3 top-3 w-4 h-4 text-venus-text-muted" />
            <textarea
              {...register("allergies")}
              rows={2}
              className="input-field pl-10 resize-none"
              placeholder="Penicillin, peanuts, etc. (optional)"
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
                {...register("emergencyContactName")}
                className="input-field"
                placeholder="Contact name"
              />
            </div>
            <div>
              <label className="block text-xs text-venus-text-muted mb-1">
                Phone
              </label>
              <input
                {...register("emergencyContactPhone")}
                className="input-field"
                placeholder="+260 97 1234567"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate("/patients")}
            className="flex-1 px-4 py-2.5 border border-venus-border text-venus-text-primary rounded-lg text-sm font-medium hover:bg-venus-bg-elevated transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Register Patient
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientRegistrationPage;
