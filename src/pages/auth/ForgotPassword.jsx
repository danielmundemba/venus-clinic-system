import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { requestPasswordReset } from "../../firebase/passwordReset";
import { sendPasswordResetLinkEmail } from "../../services/emailService";
import FloatingInput from "../../components/common/FloatingInput";
import { KeyRound } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const ForgotPassword = () => {
  const [generalError, setGeneralError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async ({ email }) => {
    setSubmitting(true);
    setGeneralError("");
    try {
      const { token, displayName } = await requestPasswordReset(email);

      // Always show the same success state, whether or not an
      // account exists for that email — avoids leaking who's registered.
      if (token) {
        await sendPasswordResetLinkEmail({
          toEmail: email,
          toName: displayName,
          resetToken: token,
        });
      }

      setSent(true);
    } catch (err) {
      setGeneralError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="w-full text-center">
        <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-glow logo-bg">
          <KeyRound className="w-10 h-10 logo-icon" />
        </div>
        <h1 className="text-2xl font-bold text-venus-text-primary">
          Check your email
        </h1>
        <p className="text-venus-text-muted mt-2">
          If an account exists for that address, we've sent a link to reset your
          password. The link expires in 1 hour.
        </p>
        <Link
          to="/login"
          className="text-venus-primary hover:underline text-sm mt-6 inline-block"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-glow logo-bg">
          <KeyRound className="w-10 h-10 logo-icon" />
        </div>
        <h1 className="text-2xl font-bold text-venus-text-primary">
          Forgot Password
        </h1>
        <p className="text-venus-text-muted mt-1">
          Enter your email and we'll send you a reset link
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {generalError && (
          <div className="p-4 bg-venus-danger/10 border border-venus-danger/30 rounded-lg text-venus-danger text-sm">
            {generalError}
          </div>
        )}

        <FloatingInput
          label="Email Address"
          name="email"
          type="email"
          register={register}
          error={errors.email}
          autoComplete="email"
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full btn-primary py-3"
        >
          {submitting ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      <p className="text-center text-sm text-venus-text-muted mt-6">
        Remembered your password?{" "}
        <Link to="/login" className="text-venus-primary hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  );
};

export default ForgotPassword;
