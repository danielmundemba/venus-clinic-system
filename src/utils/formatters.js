export const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-ZM', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('en-ZM', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const calculateAge = (dob) => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const generateSearchableName = (firstName, lastName) => {
  return `${firstName} ${lastName}`.toLowerCase().trim();
};

export const formatPhone = (phone) => {
  // Format Zambian numbers: +260 97 1234567
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('260')) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
};

// Medical Record Formatters
export const formatBloodPressure = (systolic, diastolic) => {
  if (!systolic || !diastolic) return 'N/A';
  return `${systolic}/${diastolic} mmHg`;
};

export const formatTemperature = (temp) => {
  if (!temp) return 'N/A';
  return `${temp}°C`;
};

export const formatVitalSign = (value, unit = '') => {
  if (!value) return 'N/A';
  return unit ? `${value} ${unit}` : value;
};

export const calculateTotalFees = (consultation = 0, lab = 0, medication = 0, other = 0) => {
  return parseFloat(consultation || 0) + parseFloat(lab || 0) + parseFloat(medication || 0) + parseFloat(other || 0);
};

export const formatCurrency = (amount) => {
  if (!amount) return 'K0.00';
  return `K${parseFloat(amount).toFixed(2)}`;
};