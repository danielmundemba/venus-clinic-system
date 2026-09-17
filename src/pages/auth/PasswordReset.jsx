// Talks to the small local Express server in /server, which holds
// the Firebase Admin SDK. Set VITE_RESET_API_URL in your .env if the
// server isn't running on the default localhost:5000.

const API_BASE_URL =
  import.meta.env.VITE_RESET_API_URL || "http://localhost:5000";

export async function requestPasswordReset(email) {
  const res = await fetch(`${API_BASE_URL}/api/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to request password reset");
  }

  return res.json(); // { success, token, displayName }
}

export async function confirmPasswordReset({ email, token, newPassword }) {
  const res = await fetch(`${API_BASE_URL}/api/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, token, newPassword }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to reset password");
  }

  return res.json(); // { success }
}
