import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loginUser } from "../../firebase/auth";
import { useAuth } from "../../context/AuthContext";
import { getAuthErrorMessage } from "../../utils/authErrors";
import FloatingInput from "../../components/common/FloatingInput";
import { Activity } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const Login = () => {
  const navigate = useNavigate();
  const { isAuthenticated, userRole, loading: authLoading } = useAuth();
  const [generalError, setGeneralError] = useState("");
  // Per-field server errors: which one is wrong, shown under that input.
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(userRole === "patient" ? "/my-health" : "/dashboard", {
        replace: true,
      });
    }
  }, [authLoading, isAuthenticated, userRole, navigate]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    setGeneralError("");
    setFieldErrors({ email: "", password: "" });
    try {
      await loginUser(data.email, data.password);
      // Redirect is handled reactively by the useEffect above.
    } catch (err) {
      const message = getAuthErrorMessage(err);
      if (
        err.code === "auth/invalid-login-credentials" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found"
      ) {
        setFieldErrors((prev) => ({
          ...prev,
          [err.code === "auth/user-not-found" ? "email" : "password"]: message,
        }));
      } else {
        setGeneralError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-glow logo-bg">
          <Activity className="w-10 h-10 logo-icon" />
        </div>
        <h1 className="text-2xl font-bold text-venus-text-primary">
          Welcome Back
        </h1>
        <p className="text-venus-text-muted mt-1">
          Sign in to Venus Clinic System
        </p>
      </div>

      {/* Form */}
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
          externalError={fieldErrors.email}
          autoComplete="email"
        />

        <div>
          <FloatingInput
            label="Password"
            name="password"
            type="password"
            register={register}
            error={errors.password}
            externalError={fieldErrors.password}
            autoComplete="current-password"
          />
          {/* Reset-password link lives under the password field */}
          <div className="mt-2 text-right">
            <Link
              to="/forgot-password"
              className="text-sm text-venus-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full btn-primary py-3"
        >
          {submitting ? "Signing in..." : "Sign In"}
        </button>
      </form>

      {/* Demo credentials hint */}
      <div className="mt-6 p-4 bg-venus-bg-tertiary rounded-lg border border-venus-border">
        <p className="text-xs text-venus-text-muted font-medium mb-2">
          Demo Credentials:
        </p>
        <div className="space-y-1 text-xs text-venus-text-secondary">
          <p>Admin: admin@venus.clinic / password</p>
          <p>Doctor: doctor@venus.clinic / password</p>
          <p>Reception: reception@venus.clinic / password</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
