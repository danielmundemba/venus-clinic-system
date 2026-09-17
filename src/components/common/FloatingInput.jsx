import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
// Requires ../styles/floating-label.css to be imported in your app entry.

/**
 * Floating-label input.
 * The label sits inside the box like a placeholder; it moves to the top
 * edge when the input is focused, has text, OR was autofilled by the
 * browser (handled in floating-label.css via :-webkit-autofill).
 *
 * Two usage modes:
 *  - react-hook-form: pass `register` (Login / ForgotPassword pages)
 *  - controlled:      pass `value` + `onChange` (Profile page)
 *
 * `icon` renders a left-side icon and shifts the label right to clear it.
 */
const FloatingInput = ({
  label,
  name,
  type = "text",
  register,
  value,
  onChange,
  error,
  externalError,
  autoComplete,
  icon: Icon,
  disabled,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  // FIX: controlled mode was missing `name` on the underlying <input>,
  // so e.target.name was always "" and setField() in ProfilePage never
  // updated the right key in state. register() already includes `name`
  // internally, so only the controlled branch needed it added.
  const inputProps = register
    ? register(name)
    : { name, value: value ?? "", onChange };

  const hasError = !!(error || externalError);

  return (
    <div>
      <div
        className={`floating-field relative ${Icon ? "floating-field--icon" : ""}`}
      >
        <input
          {...inputProps}
          type={inputType}
          id={name}
          placeholder=" "
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={hasError}
          className={`input-field peer w-full ${Icon ? "pl-10" : ""} ${isPassword ? "pr-12" : ""} ${hasError ? "!border-venus-danger" : ""}`}
        />
        <label htmlFor={name} className="floating-label">
          {label}
        </label>
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted pointer-events-none" />
        )}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-venus-text-muted hover:text-venus-text-primary"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      {(error || externalError) && (
        <p className="mt-1 text-sm text-venus-danger">
          {error?.message || externalError}
        </p>
      )}
    </div>
  );
};

export default FloatingInput;
