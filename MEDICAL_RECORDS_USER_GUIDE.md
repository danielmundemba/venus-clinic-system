# Medical Records Module - Quick Start Guide

## 🚀 Getting Started

### For Doctors

#### Creating a Medical Record

1. **Navigate to Medical Records**
   - Click "Medical Records" in the sidebar
   - Click "Create Medical Record" button

2. **Select a Patient**
   - Search by patient name, phone number, or NRC
   - Click on the patient to select
   - System displays patient demographics automatically

3. **Fill the Medical Record Form**
   - **Visit Information**: Enter date, time, visit type
   - **Chief Complaint**: Describe why patient is visiting
   - **Medical History**: Add relevant history (optional sections)
   - **Allergies**: Click "Add Allergy" to add known allergies
   - **Current Medications**: Add patient's current medications
   - **Vital Signs**: Enter measurements (optional)
   - **Physical Examination**: Add examination findings
   - **Diagnosis**: Enter primary diagnosis (required)
   - **Lab/Imaging**: Request any tests needed
   - **Treatment Plan**: Prescribe medications (required)
   - **Payment**: Enter fees and payment status

4. **Submit**
   - Click "Save Medical Record"
   - Wait for confirmation
   - View the created record

#### Viewing a Medical Record

1. Click on "Medical Records" in sidebar
2. Find the record in the list
3. Click "View" button
4. See all details in professional format

#### Printing/Downloading a Record

1. Open the medical record
2. Click "Print" button
3. Choose "Save as PDF" in browser dialog
4. Save to your computer

---

### For Admins

#### Viewing All Medical Records

1. Navigate to Medical Records
2. See all records from all doctors
3. Filter by payment status using tabs:
   - All: All records
   - Pending: Unpaid records
   - Paid: Paid records
   - Insurance: Insurance covered

#### Viewing Payment Information

1. Open any record
2. See "Payment Summary" section at bottom
3. View breakdown of:
   - Consultation fee
   - Laboratory fee
   - Medication fee
   - Other charges
   - Total amount
   - Payment status

---

### For Patients

#### Viewing Your Medical Records

1. Login as patient
2. Click "Medical Records" in sidebar
3. See all YOUR medical records
4. Cannot access other patients' records

#### Downloading Your Record

1. Click "View" on a record
2. Click "Print"
3. Choose "Save as PDF"
4. Your record is saved

---

### For Nurses

#### Viewing Medical Records

1. Navigate to Medical Records
2. View all records (read-only)
3. Cannot create or edit

---

## 📋 Form Field Guide

### Visit Information
- **Visit Date**: Calendar picker (required)
- **Visit Time**: Time picker (required)
- **Visit Type**: Choose one:
  - Outpatient - Regular office visit
  - Follow-up - Follow-up appointment
  - Emergency - Emergency visit
  - Review - Medical review

### Chief Complaint
- Free text describing patient's main reason for visit (minimum 5 characters, required)

### Medical History
- **History of Present Illness**: Current symptoms and timeline
- **Past Medical History**: Previous diseases or conditions
- **Surgical History**: Previous surgeries
- **Family History**: Relevant family medical conditions
- **Social History**: Occupation, lifestyle, smoking, alcohol use
- All optional

### Allergies
1. Click "Add Allergy"
2. Enter:
   - Allergy Name (e.g., "Penicillin")
   - Reaction (e.g., "Rash")
   - Severity: Mild / Moderate / Severe
3. Click trash icon to remove

### Current Medications
1. Click "Add Medication"
2. Enter:
   - Medication Name (e.g., "Metformin")
   - Dosage (e.g., "500mg")
   - Frequency (e.g., "Twice daily")
3. Click trash icon to remove

### Vital Signs
- **Temperature**: in °C (e.g., 36.5)
- **Blood Pressure**: Systolic and Diastolic separately (e.g., 120 and 80)
- **Pulse Rate**: beats per minute (e.g., 72)
- **Respiratory Rate**: breaths per minute (e.g., 16)
- **Oxygen Saturation**: percentage (e.g., 98)
- **Weight**: in kilograms (e.g., 70)
- **Height**: in centimeters (e.g., 175)
- All optional

### Physical Examination
- Free text with findings from physical exam

### Diagnosis
- **Primary Diagnosis**: Main diagnosis (required, e.g., "Hypertension")
- **Secondary Diagnosis**: Additional diagnosis if applicable
- **ICD Code**: International Classification code if known (e.g., "I10")

### Lab/Imaging Requests
- **Laboratory Tests**: List tests to order (e.g., "Full Blood Count, Urinalysis")
- **Imaging Requests**: List imaging needed (e.g., "Chest X-ray")

### Treatment Plan
- **Prescribed Medications**: Include all medications with instructions (required)
- **Procedures**: Any procedures to perform
- **Doctor Instructions**: Special instructions for patient
- **Follow-up Instructions**: When to return, what to monitor

### Payment Information
- **Consultation Fee**: Amount in Kwacha (K)
- **Laboratory Fee**: Amount in Kwacha
- **Medication Fee**: Amount in Kwacha
- **Other Charges**: Additional fees
- **Payment Status**: Choose one:
  - Pending - Bill not yet paid
  - Paid - Bill has been paid
  - Insurance - Covered by insurance
- **Total**: Auto-calculated from all fees

---

## ✅ Validation Rules

### Required Fields (Cannot leave empty)
- Patient selection
- Visit date and time
- Visit type
- Chief complaint
- Primary diagnosis
- Prescribed medications (treatment plan)
- Payment status

### Field Format Validation
- **Numeric fields**: Must be numbers (vitals, fees)
  - Can include decimals: 36.5, 120.50
- **Date/Time**: Must be valid dates/times
- **Enums**: Must select from dropdown options

### Error Messages
If you see red error text below a field:
- Read the error message
- Fix the issue (e.g., enter a number instead of text)
- Continue filling form

---

## 🔍 Searching for Patients

When creating a record:

1. Search field accepts:
   - **Patient Name**: "John Doe" or just "John"
   - **Phone Number**: "097123456" or "+260971234567"
   - **NRC Number**: "123456/45/1"

2. Results update as you type
3. Click patient to select
4. To change patient, click "Change Patient" button

---

## 📊 Filtering Records

On Medical Records list page:

- **All**: Show all records
- **Pending**: Show unpaid records
- **Paid**: Show paid records
- **Insurance**: Show insurance-covered records

Click any tab to filter.

---

## 🖨️ Printing Tips

### To Print a Medical Record

1. Open the record
2. Click "Print" button
3. In print dialog:
   - Select printer or "Save as PDF"
   - Check "Background graphics" for colors
   - Set margins (narrow = more content)
4. Print or save

### What Gets Printed
- Clinic header and title
- Patient demographics
- Doctor information
- All medical sections
- Payment summary
- Confidentiality footer
- Timestamps

### What Gets Hidden
- Navigation buttons
- Action buttons
- Print/Download buttons

---

## ⚙️ Settings & Access

### Changing Theme
- Click theme toggle in top right
- Light mode: Professional white background
- Dark mode: Blue/dark background

### Logging Out
- Click your profile in bottom left
- Click "Logout"

### Cannot Access?
If you see "You do not have permission":
- You don't have the right role
- Contact admin to get access
- Ask admin to assign you a doctor/admin role

---

## 🆘 Troubleshooting

### Form Not Saving
- Check all required fields are filled (marked with *)
- Check error messages below fields
- Ensure internet connection is stable
- Try again

### Cannot Find Patient
- Check spelling of patient name
- Try searching by phone or NRC instead
- Patient might not be registered yet
- Ask receptionist to register patient first

### Cannot Create Medical Record
- Check if you're logged in as doctor or admin
- Only doctors and admins can create
- Nurses can only view
- Contact admin if you need access

### Print Not Working
- Try different browser (Chrome, Firefox, Edge)
- Check if pop-ups are blocked
- Disable browser extensions
- Try "Print to PDF" first

### Record Won't Display
- Might be deleted by another user
- Might not have permission to view
- Try refreshing the page
- Contact doctor who created it

---

## 📱 Mobile Tips

- Form is responsive - easier to use on desktop
- On mobile, you may need to scroll more
- Touch-friendly buttons and inputs
- Portrait orientation recommended
- Landscape for viewing printed record

---

## 🔒 Privacy & Security

- Your password is never stored in browser
- Records auto-logout after 24 hours of inactivity
- Only see your own records as patient
- Doctors see only their own records
- Admins can see all records
- All actions are logged for audit

---

## 📞 Support

For issues or questions:
1. Check error message on screen
2. Refer to section above matching your issue
3. Contact IT support with error details
4. Include:
   - What you were doing
   - Error message (if any)
   - Your role
   - Time the issue occurred

---

**Last Updated**: May 2026
**Version**: 1.0
