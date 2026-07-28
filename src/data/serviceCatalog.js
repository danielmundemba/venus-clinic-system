// Hardcoded tickable services shown at each stage of a visit.
// This is intentionally simple/hardcoded for now (dummy data) so we can
// nail down how the workflow behaves. Once that's settled, move this to a
// Firestore `services` collection so admins can edit name/price without a
// code change, and load it once in a context/provider instead of importing
// this file everywhere.

export const SERVICE_CATALOG = {
  reception: [
    { id: 'registration', name: 'Registration Fee', price: 20 },
    { id: 'consultation', name: 'Consultation Fee', price: 50 },
  ],
  nurse: [
    { id: 'vitals_check', name: 'Vitals Check', price: 15 },
  ],
  doctor: [
    { id: 'general_exam', name: 'General Examination', price: 30 },
    { id: 'minor_procedure', name: 'Minor Procedure', price: 100 },
    { id: 'lab_test', name: 'Lab Test', price: 40 },
    { id: 'dressing', name: 'Wound Dressing', price: 25 },
  ],
  pharmacy: [
    { id: 'dispensing_fee', name: 'Dispensing Fee', price: 10 },
  ],
};

// Sum the price of a list of ticked service objects ({ id, name, price }).
export const sumServices = (services = []) =>
  services.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);