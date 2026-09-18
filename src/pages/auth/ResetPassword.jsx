import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { verifyResetCode, confirmPasswordReset } from "../../firebase/auth";
import { getAuthErrorMessage } from "../../utils/authErrors";
import FloatingInput from "../../components/common/FloatingInput";
import { Activity, CheckCircle2, XCircle, Loader2 } from "lucide-react";

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// "verifying" -> checking the oobCode from the email link is still valid
// "valid"     -> code is good, show the new-password form
// "invalid"   -> code missing / expired / already used
// "done"      -> password was successfully reset
const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get("oobCode");

  const [status, setStatus] = useState("verifying");
  const [email, setEmail] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(resetPasswordSchema) });

  useEffect(() => {
    const verify = async () => {
      if (!oobCode) {
        setStatus("invalid");
        return;
      }
      try {
        const accountEmail = await verifyResetCode(oobCode);
        setEmail(accountEmail);
        setStatus("valid");
      } catch (err) {
        setStatus("invalid");
      }
    };
    verify();
  }, [oobCode]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    setGeneralError("");
    try {
      await confirmPasswordReset(oobCode, data.password);
      setStatus("done");
    } catch (err) {
      setGeneralError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "verifying") {
    return (
      <div className="w-full text-center py-10">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-venus-primary" />
        <p className="text-venus-text-muted mt-4">Verifying your link...</p>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="w-full text-center">
        <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 bg-venus-danger/10">
          <XCircle className="w-10 h-10 text-venus-danger" />
        </div>
        <h1 className="text-2xl font-bold text-venus-text-primary">
          Link Expired or Invalid
        </h1>
        <p className="text-venus-text-muted mt-2">
          This password reset link is no longer valid. Please request a new one.
        </p>
        <Link
          to="/forgot-password"
          className="inline-block mt-6 btn-primary py-3 px-6"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="w-full text-center">
        <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-glow logo-bg">
          <CheckCircle2 className="w-10 h-10 logo-icon" />
        </div>
        <h1 className="text-2xl font-bold text-venus-text-primary">
          Password Reset
        </h1>
        <p className="text-venus-text-muted mt-2">
          Your password has been updated. You can now sign in.
        </p>
        <button
          onClick={() => navigate("/login", { replace: true })}
          className="w-full btn-primary py-3 mt-6"
        >
          Continue to Sign In
        </button>
      </div>
    );
  }

  // status === "valid"
  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-glow logo-bg">
          <Activity className="w-10 h-10 logo-icon" />
        </div>
        <h1 className="text-2xl font-bold text-venus-text-primary">
          Set New Password
        </h1>
        <p className="text-venus-text-muted mt-1">
          Resetting password for <span className="font-medium">{email}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {generalError && (
          <div className="p-4 bg-venus-danger/10 border border-venus-danger/30 rounded-lg text-venus-danger text-sm">
            {generalError}
          </div>
        )}

        <FloatingInput
          label="New Password"
          name="password"
          type="password"
          register={register}
          error={errors.password}
          autoComplete="new-password"
        />

        <FloatingInput
          label="Confirm New Password"
          name="confirmPassword"
          type="password"
          register={register}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full btn-primary py-3"
        >
          {submitting ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;
