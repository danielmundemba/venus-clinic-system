import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { patientSchema } from "../../utils/validators";
import { generateSecurePassword } from "../../utils/passwordGenerator";
import { sendNewAccountEmail } from "../../utils/emailService";
import { registerPatient } from "../../firebase/auth";
import { useAuditLog } from "../../hooks/useAuditLog";
import { calculateAge } from "../../utils/formatters";
import FloatingInput from "../../components/common/FloatingInput";
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

      // Nobody types this — a fresh, policy-compliant password is
      // generated per patient and emailed to them. It's never displayed
      // in the UI and never logged.
      const generatedPassword = generateSecurePassword();

      const result = await registerPatient(
        data.email,
        generatedPassword,
        patientData,
      );

      // Best-effort: the account already exists at this point, so an
      // email failure shouldn't be treated as the registration failing.
      const emailResult = await sendNewAccountEmail({
        toEmail: data.email,
        toName: `${data.firstName} ${data.lastName}`,
        tempPassword: generatedPassword,
        role: "patient",
      });

      await logAction("create", "patient", result.uid, {
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        patientNumber: result.patientNumber,
        patientInfoId: result.patientInfoId,
      });

      navigate("/patients", {
        state: {
          successMessage: emailResult.success
            ? `${data.firstName} ${data.lastName} was registered successfully as ${result.patientNumber}. Their login details were emailed to ${data.email}.`
            : `${data.firstName} ${data.lastName} was registered successfully as ${result.patientNumber}, but the welcome email couldn't be sent. Use "Forgot password" to get them a login link.`,
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
          A secure password is generated automatically and emailed to the
          patient.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FloatingInput
            label="First Name"
            name="firstName"
            icon={User}
            register={register}
            error={errors.firstName}
          />
          <FloatingInput
            label="Last Name"
            name="lastName"
            icon={User}
            register={register}
            error={errors.lastName}
          />
        </div>

        <div>
          <FloatingInput
            label="Email Address"
            name="email"
            type="email"
            icon={Mail}
            register={register}
            error={errors.email}
          />
          <p className="mt-1 text-xs text-venus-text-muted">
            This will be used for login. A generated password will be sent here
            automatically.
          </p>
        </div>

        <FloatingInput
          label="NRC Number"
          name="nrcNumber"
          icon={Contact}
          register={register}
          error={errors.nrcNumber}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FloatingInput
              label="Date of Birth"
              name="DOB"
              type="date"
              icon={Calendar}
              register={register}
              error={errors.DOB}
            />
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

        <FloatingInput
          label="Phone Number"
          name="phone"
          type="tel"
          icon={Phone}
          register={register}
          error={errors.phone}
        />

        <FloatingInput
          label="Address"
          name="address"
          icon={MapPin}
          register={register}
          error={errors.address}
        />

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
            <FloatingInput
              label="Name"
              name="emergencyContactName"
              register={register}
            />
            <FloatingInput
              label="Phone"
              name="emergencyContactPhone"
              type="tel"
              register={register}
            />
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
