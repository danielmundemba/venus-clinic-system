import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { confirmPasswordReset } from "../../firebase/passwordReset";
import { sendPasswordChangedEmail } from "../../services/emailService";
import FloatingInput from "../../components/common/FloatingInput";
import { ShieldCheck } from "lucide-react";

const resetSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [generalError, setGeneralError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(resetSchema) });

  const onSubmit = async ({ password }) => {
    if (!email || !token) {
      setGeneralError("This reset link is invalid. Please request a new one.");
      return;
    }
    setSubmitting(true);
    setGeneralError("");
    try {
      await confirmPasswordReset({ email, token, newPassword: password });

      // Fire-and-forget confirmation email — don't block the redirect on it
      sendPasswordChangedEmail({ toEmail: email, toName: email });

      setDone(true);
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (err) {
      setGeneralError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!email || !token) {
    return (
      <div className="w-full text-center">
        <h1 className="text-2xl font-bold text-venus-text-primary">
          Invalid Link
        </h1>
        <p className="text-venus-text-muted mt-2">
          This password reset link is missing or malformed.
        </p>
        <Link
          to="/forgot-password"
          className="text-venus-primary hover:underline text-sm mt-6 inline-block"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full text-center">
        <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-glow logo-bg">
          <ShieldCheck className="w-10 h-10 logo-icon" />
        </div>
        <h1 className="text-2xl font-bold text-venus-text-primary">
          Password Updated
        </h1>
        <p className="text-venus-text-muted mt-2">
          Redirecting you to sign in...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-glow logo-bg">
          <ShieldCheck className="w-10 h-10 logo-icon" />
        </div>
        <h1 className="text-2xl font-bold text-venus-text-primary">
          Set New Password
        </h1>
        <p className="text-venus-text-muted mt-1">
          Choose a new password for {email}
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
