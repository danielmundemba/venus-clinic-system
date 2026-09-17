import emailjs from "@emailjs/browser";

// ============================================================
// EMAILJS CONFIGURATION
// ============================================================

const EMAILJS_SERVICE_ID = "service_nj4eu7u";
const EMAILJS_PUBLIC_KEY = "VZF0l2vE0gSmByh1y";

const TEMPLATES = {
  // Email sent when an admin creates a brand-new staff account
  NEW_ACCOUNT: "template_q22futi",

  // Email sent to confirm a password was changed
  PASSWORD_RESET_LINK: "template_hklrhmi",
};

// ============================================================
// NEW ACCOUNT EMAIL
// ============================================================

export const sendNewAccountEmail = async ({
  toEmail,
  toName,
  tempPassword,
  role,
}) => {
  try {
    const loginUrl = `${window.location.origin}/login`;

    console.log("Sending new account email to:", toEmail);
    console.log("Login URL:", loginUrl);

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      TEMPLATES.NEW_ACCOUNT,
      {
        to_email: toEmail,
        to_name: toName,
        temp_password: tempPassword,
        role: role,
        login_url: loginUrl,
      },
      {
        publicKey: EMAILJS_PUBLIC_KEY,
      },
    );

    console.log("New account email sent successfully:", response);

    return {
      success: true,
    };
  } catch (err) {
    console.error("Failed to send new-account email:", err);
    console.error("EmailJS status:", err?.status);
    console.error("EmailJS response:", err?.text);

    return {
      success: false,
      error: err,
    };
  }
};

// ============================================================
// PASSWORD RESET LINK EMAIL  (forgot-password flow)
// ============================================================
// Called from ForgotPassword.jsx once the backend has created a
// one-time token. Builds the link the user clicks to land on
// ResetPassword.jsx with ?email=...&token=... in the URL.

export const sendPasswordResetLinkEmail = async ({
  toEmail,
  toName,
  resetToken,
}) => {
  try {
    const resetUrl = `${window.location.origin}/reset-password?email=${encodeURIComponent(
      toEmail,
    )}&token=${resetToken}`;

    console.log("Sending password reset link to:", toEmail);
    console.log("Reset URL:", resetUrl);

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      TEMPLATES.PASSWORD_RESET_LINK,
      {
        to_email: toEmail,
        to_name: toName || toEmail,
        reset_link: resetUrl,
      },
      {
        publicKey: EMAILJS_PUBLIC_KEY,
      },
    );

    console.log("Password reset link email sent successfully:", response);

    return {
      success: true,
    };
  } catch (err) {
    console.error("Failed to send password reset link email:", err);
    console.error("EmailJS status:", err?.status);
    console.error("EmailJS response:", err?.text);

    return {
      success: false,
      error: err,
    };
  }
};
