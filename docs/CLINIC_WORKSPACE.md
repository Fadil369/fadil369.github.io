# Clinic reception and doctor workspace (synthetic pilot)

`/bpr/clinic` (and `/ar/bpr/clinic`) is a front-end-only demonstration of a small clinic's day: patient reception, front desk, doctor room and overview. It runs entirely in the visitor's browser.

**It is not a clinical or medical-records system.** It holds no real patient data, connects to no OpenEMR, NPHIES or EHR service, and sends nothing anywhere. Patient labels must look like `Patient 007`; names, national IDs, phone numbers and e-mail addresses are refused by the forms and by the note editor. Every FHIR object it produces is tagged `synthetic`.

## What it does

| Area | Behaviour |
| --- | --- |
| Reception | Books a visit for a service on a working day (Sunday to Thursday, Riyadh time). Times come from the schedule below. A time already held by another open or completed visit of the same service is shown as taken and cannot be chosen, also when it was taken in another tab. Times that have started today are not offered. |
| Schedule | Set in **Clinic setup**: first visit start, last visit end, and visit length (15, 20, 30, 45 or 60 minutes). Default 09:00 to 21:00 in 30-minute visits. Existing bookings are not changed. |
| Front desk | Check-in (a future booking cannot be checked in early), walk-ins, urgent patients seen first. |
| Doctor room | Vitals, chief complaint, assessment, plan, optional ICD-10 code, plan lines (lab, imaging, medication draft, referral, advice), follow-up choice. The note is autosaved as a per-visit draft in the browser and restored after a reload; text that trips the identifier check is never saved. Earlier completed visits of the same patient label are shown for reference. |
| Follow-up | Completing a visit with a follow-up creates a new booking on the first working day with a free time, keeping the time of day when free. |
| Export | **Copy FHIR Encounter** and **Copy FHIR Bundle** (collection Bundle with Encounter, Condition, vital-sign Observations, and draft ServiceRequest / MedicationRequest / CommunicationRequest). **Print summary** prints a one-page visit summary. The Bundle uses `http://example.invalid/` URLs and has not been checked with an HL7 validator. |

## Where the data lives

Browser storage only: `brainsait_clinic_requests` (visits), `brainsait_clinic_schedule`, `brainsait_clinic_profile`, in `localStorage`, and `brainsait_clinic_draft_<visit id>` in `sessionStorage` while a note is open (a draft is lost when the tab closes). Clearing site data removes the rest. Nothing is shared between devices.

## Code

- `src/lib/clinicSchedule.ts` – schedule, working days, slot availability, follow-up planning (pure, Riyadh time).
- `src/lib/clinicFlow.ts` – visit state machine, orders, history, FHIR export (pure).
- `src/pages/clinic/ClinicPage.tsx`, `src/pages/clinic/VisitFlow.tsx` – the screens.

## Checks

```bash
npm test                                   # unit tests for schedule and flow logic
npm run dev -- --port 5199 &
CLINIC_E2E_URL=http://localhost:5199 npm run verify:clinic-flow   # browser check of the whole day, English and Arabic
```

Using this for real patients would need, at minimum, server-side storage with access control and audit, a security review, clinical-governance sign-off, a real terminology and FHIR validation step, and a lawful basis under Saudi health-data rules. None of that exists here.
