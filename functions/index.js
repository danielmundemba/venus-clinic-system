import functions from 'firebase-functions';
import admin from 'firebase-admin';
import nodemailer from 'nodemailer';

admin.initializeApp();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: (process.env.SMTP_SECURE || 'false') === 'true',
  auth: {
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
  },
});

export const sendAccountCreatedEmail = functions.https.onCall(async (data) => {
  const email = data?.email;
  const name = data?.name || 'User';
  const password = data?.password || 'Venus@123';
  const loginUrl = data?.loginUrl || 'https://venus-clinic-system.firebaseapp.com/login';

  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required.');
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'Venus Clinic <noreply@venus-clinic.com>',
      to: email,
      subject: 'Your Venus Clinic account has been created',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
          <h2 style="color: #7c3aed;">Welcome to Venus Clinic</h2>
          <p>Hello ${name},</p>
          <p>Your Venus Clinic account has been created successfully.</p>
          <p><strong>Login email:</strong> ${email}</p>
          <p><strong>Default password:</strong> ${password}</p>
          <p>Use this password to sign in at:</p>
          <p><a href="${loginUrl}">${loginUrl}</a></p>
          <p>For security, please change your password after you log in.</p>
          <p>Regards,<br />Venus Clinic</p>
        </div>
      `,
      text: `Hello ${name},\n\nYour Venus Clinic account has been created successfully.\nLogin email: ${email}\nDefault password: ${password}\nLogin here: ${loginUrl}\n\nPlease change your password after logging in.\n\nRegards,\nVenus Clinic`,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Unable to send the welcome email right now. Please try again later.',
    );
  }
});