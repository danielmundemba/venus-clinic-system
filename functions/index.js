const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});

// handleCodeInApp: true means the link points straight at YOUR app's URL
// (with ?mode=resetPassword&oobCode=... appended by Firebase) instead of
// Firebase's default hosted action-handler page.
const actionCodeSettings = {
  url: "https://venus-clinic-system.web.app/reset-password",
  handleCodeInApp: true,
};

function buildResetEmailHtml(link) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color:#1f2937;">
      <h2 style="margin-bottom: 8px;">Reset your password</h2>
      <p>We received a request to reset the password for your Venus Clinic System account.</p>
      <p style="margin: 24px 0;">
        <a href="${link}"
           style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#ffffff;
                  border-radius:8px;text-decoration:none;font-weight:600;">
          Reset Password
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;">
        This link expires in 1 hour. If you didn't request a password reset,
        you can safely ignore this email — your password will stay the same.
      </p>
    </div>
  `;
}

exports.sendPasswordResetEmail = functions.https.onCall(
  async (data, context) => {
    const email = ((data && data.email) || "").trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "A valid email address is required.",
      );
    }

    try {
      const link = await admin
        .auth()
        .generatePasswordResetLink(email, actionCodeSettings);

      await transporter.sendMail({
        from: `"Venus Clinic System" <${gmailEmail}>`,
        to: email,
        subject: "Reset your Venus Clinic password",
        html: buildResetEmailHtml(link),
      });

      return { success: true };
    } catch (error) {
      // Don't reveal whether the account exists — respond success either way.
      if (error.code === "auth/user-not-found") {
        return { success: true };
      }

      console.error("sendPasswordResetEmail error:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Something went wrong sending the reset email. Please try again.",
      );
    }
  },
);
