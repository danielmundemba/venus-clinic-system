// Generates a random password that always satisfies isStrongPassword()
// from validators.js (8+ chars, upper, lower, digit, symbol) so accounts
// created here never fail the same policy users are held to when they
// change their own password later.

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O — avoids look-alikes
const LOWER = "abcdefghijkmnpqrstuvwxyz"; // no l
const DIGITS = "23456789"; // no 0/1
const SYMBOLS = "!@#$%&*?";
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

const randomChar = (charset) =>
  charset[Math.floor(Math.random() * charset.length)];

// Fisher-Yates shuffle so the guaranteed one-of-each characters above
// aren't always in the same first-four positions.
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const generateSecurePassword = (length = 12) => {
  const guaranteed = [
    randomChar(UPPER),
    randomChar(LOWER),
    randomChar(DIGITS),
    randomChar(SYMBOLS),
  ];
  const rest = Array.from({ length: length - guaranteed.length }, () =>
    randomChar(ALL),
  );
  return shuffle([...guaranteed, ...rest]).join("");
};
