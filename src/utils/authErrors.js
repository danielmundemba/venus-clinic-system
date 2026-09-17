const AUTH_ERROR_MESSAGES = {
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/user-disabled":
    "This account has been disabled. Contact your administrator.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/invalid-login-credentials": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/user-not-found": "Account not found.",
  "auth/too-many-requests":
    "Too many failed attempts. Please wait a moment and try again.",
  "auth/network-request-failed":
    "Network error — check your connection and try again.",
  "auth/missing-password": "Please enter your password.",
  "auth/operation-not-allowed":
    "Email and password sign-in is not enabled in Firebase Authentication.",
  "auth/unauthorized-domain":
    "This website is not authorized in Firebase Authentication. Add its domain in Firebase Console.",
  "auth/app-not-authorized":
    "This app is not authorized to use Firebase Authentication. Check the Firebase configuration.",
  "auth/invalid-api-key":
    "The Firebase API key is invalid. Check the Firebase configuration.",
  "auth/configuration-not-found":
    "Firebase Authentication is not configured for this project.",
  "auth/internal-error":
    "Firebase Authentication returned an internal error. Check the browser console for details.",
};

export const getAuthErrorMessage = (error) => {
  const code = typeof error === "string" ? error : error?.code;
  const knownMessage = AUTH_ERROR_MESSAGES[code];

  if (knownMessage) {
    return knownMessage;
  }

  if (error?.message) {
    return `Unable to sign in: ${error.message}`;
  }

  return "Unable to sign in. Check your email, password, and connection, then try again.";
};
