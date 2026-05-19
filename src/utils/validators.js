import { z } from 'zod';

export const patientSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  nrcNumber: z.string().min(6, 'NRC number is required').optional().or(z.literal('')),
  DOB: z.string().refine((val) => {
    const date = new Date(val);
    const now = new Date();
    return date < now && date > new Date('1900-01-01');
  }, 'Invalid date of birth'),
  gender: z.enum(['male', 'female', 'other'], {
    required_error: 'Please select a gender',
  }),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().min(5, 'Address is required'),
  emergencyContactName: z.string().optional().or(z.literal('')),
  emergencyContactPhone: z.string().optional().or(z.literal('')),
});

export const appointmentSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  doctorId: z.string().min(1, 'Doctor is required'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  type: z.enum(['scheduled', 'walk-in']),
  notes: z.string().optional(),
});

// Medical Record Validators
export const medicalRecordSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  visitDate: z.string().min(1, 'Visit date is required'),
  visitTime: z.string().min(1, 'Visit time is required'),
  visitType: z.enum(['outpatient', 'follow-up', 'emergency', 'review'], {
    required_error: 'Please select a visit type',
  }),
  chiefComplaint: z.string().min(5, 'Chief complaint is required and must be at least 5 characters'),
  
  // Medical History
  presentIllness: z.string().min(0).optional(),
  pastMedicalHistory: z.string().min(0).optional(),
  surgicalHistory: z.string().min(0).optional(),
  familyHistory: z.string().min(0).optional(),
  socialHistory: z.string().min(0).optional(),
  
  // Allergies
  allergies: z.array(z.object({
    name: z.string().min(1, 'Allergy name is required'),
    reaction: z.string().min(1, 'Reaction is required'),
    severity: z.enum(['mild', 'moderate', 'severe'], {
      required_error: 'Please select severity',
    }),
  })).optional(),
  
  // Current Medications
  currentMedications: z.array(z.object({
    name: z.string().min(1, 'Medication name is required'),
    dosage: z.string().min(1, 'Dosage is required'),
    frequency: z.string().min(1, 'Frequency is required'),
  })).optional(),
  
  // Vital Signs
  temperature: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid temperature').optional(),
  bloodPressureSystolic: z.string().regex(/^\d+$/, 'Invalid systolic pressure').optional(),
  bloodPressureDiastolic: z.string().regex(/^\d+$/, 'Invalid diastolic pressure').optional(),
  pulseRate: z.string().regex(/^\d+$/, 'Invalid pulse rate').optional(),
  respiratoryRate: z.string().regex(/^\d+$/, 'Invalid respiratory rate').optional(),
  oxygenSaturation: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid oxygen saturation').optional(),
  weight: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid weight').optional(),
  height: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid height').optional(),
  
  // Physical Examination
  physicalExamination: z.string().min(0).optional(),
  
  // Diagnosis
  primaryDiagnosis: z.string().min(1, 'Primary diagnosis is required'),
  secondaryDiagnosis: z.string().min(0).optional(),
  icdCode: z.string().min(0).optional(),
  
  // Lab Requests
  labRequests: z.string().min(0).optional(),
  imagingRequests: z.string().min(0).optional(),
  
  // Treatment Plan
  prescribedMedications: z.string().min(1, 'Treatment plan must include prescribed medications or procedures'),
  procedures: z.string().min(0).optional(),
  doctorInstructions: z.string().min(0).optional(),
  followUpInstructions: z.string().min(0).optional(),
  
  // Payment Information
  consultationFee: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid consultation fee').optional(),
  laboratoryFee: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid laboratory fee').optional(),
  medicationFee: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid medication fee').optional(),
  otherCharges: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid other charges').optional(),
  paymentStatus: z.enum(['paid', 'pending', 'insurance'], {
    required_error: 'Please select payment status',
  }),
});