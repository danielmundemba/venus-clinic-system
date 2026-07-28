// ============================================
// HARDCODED SERVICES CATALOG (dummy data)
// Move this to a Firestore 'services' collection later so admins
// can edit names/prices without a code change.
// ============================================

// Added automatically whenever a nurse records vitals — not tickable.
export const NURSE_AUTO_SERVICE = { id: 'vitals_check', name: 'Vitals Check', price: 30 };

// Doctor ticks whichever of these apply during the visit.
export const DOCTOR_SERVICES = [
  { id: 'consultation', name: 'Consultation', price: 100 },
  { id: 'follow_up', name: 'Follow-up Consultation', price: 50 },
  { id: 'dressing', name: 'Wound Dressing', price: 40 },
  { id: 'injection', name: 'Injection Administration', price: 25 },
  { id: 'minor_procedure', name: 'Minor Procedure', price: 150 },
  { id: 'lab_referral', name: 'Lab Test Referral', price: 20 },
];

// Pharmacist ticks whichever of these apply (on top of medication prices).
export const PHARMACY_SERVICES = [
  { id: 'dispensing_fee', name: 'Dispensing Fee', price: 15 },
];