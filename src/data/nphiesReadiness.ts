// Readiness advisor content. Each step is written from the published NPHIES documents named in
// `source`, and `because` links to the official rejection reasons the step helps prevent.
export type Facility = 'hospital' | 'clinic' | 'pharmacy' | 'dental' | 'optical';
export type Billing = 'none' | 'shadow' | 'actual';
export type Stage = 'identity' | 'before' | 'coding' | 'submit' | 'after';
export interface Step { stage: Stage; who?: Facility[]; billing?: Billing[]; en: string; ar: string; because?: string[]; source: string }

const P = 'Profiles v5.4.2';
const C = 'Code sets v5.5.2';
const M = 'Provider Portal Manual';

export const FACILITIES: { id: Facility; en: string; ar: string; profile: string }[] = [
  { id: 'hospital', en: 'Hospital', ar: 'مستشفى', profile: 'institutional-claim, professional-claim' },
  { id: 'clinic', en: 'Clinic or medical centre', ar: 'عيادة أو مركز طبي', profile: 'professional-claim' },
  { id: 'pharmacy', en: 'Pharmacy', ar: 'صيدلية', profile: 'pharmacy-claim' },
  { id: 'dental', en: 'Dental', ar: 'طب الأسنان', profile: 'oral-claim' },
  { id: 'optical', en: 'Optical', ar: 'بصريات', profile: 'vision-claim' },
];

export const STAGES: { id: Stage; en: string; ar: string }[] = [
  { id: 'identity', en: 'Clinicians and facility', ar: 'الممارسون والمنشأة' },
  { id: 'before', en: 'Before the service', ar: 'قبل تقديم الخدمة' },
  { id: 'coding', en: 'Coding and documentation', ar: 'الترميز والتوثيق' },
  { id: 'submit', en: 'Before you submit', ar: 'قبل الإرسال' },
  { id: 'after', en: 'After the response', ar: 'بعد الرد' },
];

export const STEPS: Step[] = [
  { stage: 'identity', en: 'Add every clinician to your NPHIES account with their licence number and specialty, and map each one to the facility where they work.', ar: 'أضف كل ممارس إلى حسابك في نفيس برقم ترخيصه وتخصصه، واربطه بالمنشأة التي يعمل فيها.', because: ['AD-1-8'], source: `${M} 3.11, 3.12` },
  { stage: 'identity', en: 'Send the correct practice code for the clinician on every claim. The care team qualification is required, and payers read it as the specialty.', ar: 'أرسل رمز التخصص الصحيح للممارس في كل مطالبة، فحقل التأهيل في فريق الرعاية إلزامي وتقرؤه شركات التأمين على أنه التخصص.', because: ['AD-1-2', 'AD-1-6'], source: `${P}, Claim.careTeam.qualification` },
  { stage: 'identity', en: 'Review licence expiry dates every month, and update the practitioner record the day a clinician joins, changes role or leaves.', ar: 'راجع تواريخ انتهاء التراخيص شهريًا، وحدّث سجل الممارس في يوم انضمامه أو تغيّر دوره أو مغادرته.', because: ['AD-1-8'], source: 'BrainSAIT guidance' },
  { stage: 'before', en: 'Check eligibility at booking, and again on the day for policies near renewal.', ar: 'تحقق من الأهلية عند الحجز، ثم في يوم الزيارة للوثائق القريبة من التجديد.', because: ['AD-2-3', 'CV-2-1', 'CV-1-1'], source: `${P}, Eligibility Request` },
  { stage: 'before', en: 'Identify the patient by national ID or Iqama, and copy the name and member details from the eligibility response.', ar: 'حدّد المريض برقم الهوية أو الإقامة، وانسخ الاسم وبيانات العضوية من رد الأهلية.', because: ['AD-1-9'], source: 'BrainSAIT guidance' },
  { stage: 'before', en: 'Enter dates in one calendar and convert only on display. A Hijri date in a Gregorian field fails the birth-date check.', ar: 'أدخل التواريخ بتقويم واحد واجعل التحويل عند العرض فقط، فالتاريخ الهجري في حقل ميلادي يُفشل فحص تاريخ الميلاد.', because: ['AD-2-1'], source: 'BrainSAIT guidance' },
  { stage: 'before', en: 'Check the table of benefits and tell the patient about any out-of-pocket amount before the service.', ar: 'راجع جدول المنافع وأبلغ المريض بأي مبلغ يتحمله قبل تقديم الخدمة.', because: ['CV-1-3', 'CV-1-4', 'CV-1-8', 'CV-3-1'], source: `${M} 5.5` },
  { stage: 'before', en: 'Keep each payer’s authorisation list at the point of ordering, and hold listed services until the approval is attached.', ar: 'اجعل قائمة الموافقات لكل شركة ظاهرة عند طلب الخدمة، وأجّل الخدمات المدرجة حتى تُرفق الموافقة.', because: ['BE-1-4'], source: `${M} 6.1` },
  { stage: 'before', en: 'Match the service to the approval by code, side and quantity, and stay within its validity dates. Ask for an extension before they end.', ar: 'طابق الخدمة مع الموافقة في الرمز والجهة والكمية، والتزم بفترة صلاحيتها، واطلب التمديد قبل انتهائها.', because: ['BE-1-5', 'AD-2-6'], source: `${M} 6.9` },
  { stage: 'coding', en: 'Code diagnoses in ICD-10-AM, not US ICD-10-CM. Remove US code lists from favourites and order sets.', ar: 'رمّز التشخيصات بـICD-10-AM لا ICD-10-CM الأمريكي، واحذف القوائم الأمريكية من المفضلة ومجموعات الطلبات.', source: `${C}, diagnosis-icd-10-am` },
  { stage: 'coding', en: 'Mark exactly one principal diagnosis on each claim, and link every service to the diagnosis that justifies it.', ar: 'حدّد تشخيصًا رئيسيًا واحدًا فقط في كل مطالبة، واربط كل خدمة بالتشخيص الذي يبررها.', because: ['SE-1-7', 'AD-1-4'], source: `${P}, Claim.diagnosis` },
  { stage: 'coding', en: 'Record the chief complaint, vital signs, examination and treatment plan in a form you can send as supporting information.', ar: 'سجّل الشكوى الرئيسية والعلامات الحيوية والفحص وخطة العلاج بصيغة يمكن إرسالها معلومات داعمة.', because: ['SE-1-1', 'SE-1-3', 'SE-1-4', 'SE-1-8'], source: `${P}, Supporting Info` },
  { stage: 'submit', en: 'Check the arithmetic: each item net equals ((quantity × unit price) × factor) + tax, and the claim total equals the sum of item nets, in SAR.', ar: 'راجع الحساب: صافي كل بند = ((الكمية × سعر الوحدة) × المعامل) + الضريبة، وإجمالي المطالبة = مجموع صافي البنود، بالريال السعودي.', because: ['BE-1-6'], source: `${P}, Claim.item` },
  { stage: 'submit', en: 'Run the message through the pre-check on this page, and keep each message under the 10 MB limit.', ar: 'افحص الرسالة بأداة الفحص في هذه الصفحة، وأبقِ حجم كل رسالة دون حد 10 ميجابايت.', source: 'BrainSAIT guidance' },
  { stage: 'submit', en: 'Know each payer’s submission window. Submit daily and review an ageing report of unsent claims every week.', ar: 'اعرف مهلة التقديم لكل شركة، وقدّم يوميًا، وراجع تقرير أعمار المطالبات غير المرسلة كل أسبوع.', because: ['AD-2-5'], source: 'BrainSAIT guidance' },
  { stage: 'after', en: 'Route each rejection by its reason code. Documentation gaps go back as supporting information, and data errors go back as a Prior Claim.', ar: 'وجّه كل رفض حسب رمز السبب: نواقص التوثيق تعود معلومات داعمة، وأخطاء البيانات تعود مطالبة سابقة.', source: `${M} 6.9; Claim Resubmission guide` },
  { stage: 'after', en: 'Never resend a correction as a brand-new claim. Reference the original, because only the new version is considered.', ar: 'لا تُعد إرسال التصحيح مطالبة جديدة تمامًا، بل أشر إلى الأصلية، فلا يُنظر إلا في النسخة الجديدة.', because: ['AD-2-4'], source: `${M} 6.9` },
  { stage: 'after', en: 'Review the top rejection reasons every week and give each one a named owner.', ar: 'راجع أهم أسباب الرفض كل أسبوع، وعيّن مسؤولًا محددًا لكل سبب.', source: 'BrainSAIT guidance' },
  // Hospital
  { stage: 'coding', who: ['hospital'], en: 'For admissions, record the admission specialty, the discharge specialty and the discharge disposition once the encounter ends.', ar: 'في حالات التنويم، سجّل تخصص الدخول وتخصص الخروج وحالة الخروج عند انتهاء الزيارة.', source: `${P}, Encounter.hospitalization` },
  { stage: 'coding', who: ['hospital'], en: 'Send ICU hours and ventilation hours as supporting information where they apply, using the ICU room codes.', ar: 'أرسل ساعات العناية المركزة وساعات التنفس الصناعي معلومات داعمة عند انطباقها، مع رموز غرف العناية.', source: `${P}, Supporting Info; ${C}` },
  { stage: 'coding', who: ['hospital'], billing: ['shadow', 'actual'], en: 'Give the DRG grouper clean inputs: principal and additional diagnoses, procedures, length of stay, and admission and discharge details.', ar: 'وفّر لمجمّع DRG مدخلات سليمة: التشخيص الرئيسي والإضافي والإجراءات ومدة الإقامة وبيانات الدخول والخروج.', because: ['AD-3-4'], source: `${M} 5.12` },
  { stage: 'submit', who: ['hospital'], billing: ['actual'], en: 'Actual billing: put one DRG code on the first item with quantity 1 and a net above zero. Add-on devices and high-cost medicines go in its details with zero net.', ar: 'الفوترة الفعلية: ضع رمز DRG واحدًا في البند الأول بكمية 1 وصافي أكبر من صفر، وتوضع الأجهزة والأدوية مرتفعة التكلفة في التفاصيل بصافي صفر.', source: `${M} 5.12` },
  { stage: 'submit', who: ['hospital'], billing: ['shadow'], en: 'Shadow billing: the DRG item and its details carry zero net, and an extra non-DRG item carries the amount above zero. Ask whether enforcement is on for your facility.', ar: 'الفوترة الموازية: يكون صافي بند DRG وتفاصيله صفرًا، ويحمل بند إضافي غير DRG المبلغ الأكبر من صفر. واستفسر عمّا إذا كان الإلزام مفعّلًا لمنشأتك.', source: `${M} 5.12` },
  { stage: 'after', who: ['hospital'], billing: ['shadow', 'actual'], en: 'Read the payer’s recalculated DRG and adjustment reason on each response, and feed the differences back to coding.', ar: 'اقرأ رمز DRG المعاد احتسابه وسبب التعديل في كل رد، وأعد الفروق إلى فريق الترميز.', because: ['AD-3-4'], source: `${M} 5.12; ${C}, adjustment-reason` },
  // Clinic
  { stage: 'before', who: ['clinic'], en: 'Check referrals during eligibility when the visit comes through one, and quote the clinic specialty code the referral uses.', ar: 'تحقق من الإحالة ضمن فحص الأهلية عندما تأتي الزيارة عبرها، واستخدم رمز تخصص العيادة الوارد فيها.', source: `${P}, Eligibility Request; ${C}, clinic-specialty` },
  { stage: 'coding', who: ['clinic'], en: 'Watch the 14-day follow-up period. If a return visit is a new, unrelated problem, make the diagnosis and the note show that.', ar: 'انتبه لفترة المتابعة البالغة 14 يومًا، وإذا كانت الزيارة لمشكلة جديدة غير مرتبطة فليوضح التشخيص والملاحظة ذلك.', because: ['CV-1-9'], source: 'BrainSAIT guidance' },
  // Pharmacy
  { stage: 'before', who: ['pharmacy'], en: 'Check the prescription date and the last dispense date before dispensing.', ar: 'راجع تاريخ الوصفة وتاريخ آخر صرف قبل الصرف.', because: ['CV-4-4', 'CV-4-8'], source: `${M} 9` },
  { stage: 'coding', who: ['pharmacy'], en: 'Use the medication code the pharmacy claim expects, send days of supply, and dispense only SFDA-registered products.', ar: 'استخدم رمز الدواء الذي تتطلبه مطالبة الصيدلية، وأرسل مدة الصرف، ولا تصرف إلا المنتجات المسجلة لدى هيئة الغذاء والدواء.', because: ['CV-4-2', 'CV-4-10'], source: `${P}, Claim Pharmacy; ${C}, pharmacy-billing` },
  { stage: 'submit', who: ['pharmacy'], en: 'Keep the claimed quantity within the prescribed quantity. Disagreements go through prescription appealing.', ar: 'أبقِ الكمية المطالب بها ضمن الكمية الموصوفة، ويكون الاعتراض عبر مسار استئناف الوصفة.', because: ['CV-4-3'], source: `${M} 9.9` },
  // Dental
  { stage: 'coding', who: ['dental'], en: 'Report the tooth on each item with the FDI body site, and use tooth-specific codes where they apply.', ar: 'حدّد السن في كل بند باستخدام موضع FDI، واستخدم رموز الأسنان المحددة عند انطباقها.', source: `${C}, tooth-specific-codes; ${P}, Claim Dental` },
  { stage: 'coding', who: ['dental'], en: 'Record missing teeth as supporting information with the date and the reason.', ar: 'سجّل الأسنان المفقودة معلومات داعمة مع التاريخ والسبب.', source: `${P}, Supporting Info` },
  // Optical
  { stage: 'coding', who: ['optical'], en: 'Include the vision prescription with the claim, because it has its own profile and required fields.', ar: 'أرفق الوصفة البصرية مع المطالبة، فلها ملف تعريفي وحقول إلزامية خاصة بها.', source: `${P}, VisionPrescription` },
  { stage: 'coding', who: ['optical'], en: 'Bill only from the vision code systems: medical devices, procedures and services.', ar: 'فوتر فقط من أنظمة رموز البصريات: الأجهزة الطبية والإجراءات والخدمات.', source: `${C}, vision-billing` },
];

export interface Release { id: string; en: string; ar: string; when: string; docs: string; who: [string, string]; pointsEn: string[]; pointsAr: string[] }
export const RELEASES: Release[] = [
  { id: 'cr162', en: 'CR162 and 3 Nov server snapshot', ar: 'CR162 ونسخة الخادم بتاريخ 3 نوفمبر', when: '3 Nov 2026 · local document snapshot', docs: 'nphies profiles_OBA_3NOV 2026 · Nphies Codeable Concept_OBA_3NOV 2026 · nphies-ValidationErrorCodes_OBA_3NOV 2026', who: ['Clinics, claims teams and integration engineers', 'العيادات وفرق المطالبات ومهندسو التكامل'],
    pointsEn: [
      'CR162 adds Claim.supportingInfo category expected-delivery-date. The profile sheet maps it to timingDate; the local pre-check now flags a missing or malformed FHIR date.',
      'The code-set change log shows the expected-delivery-date-absence-reason value set and code system were added, then removed. Do not send an absence-reason code based on this snapshot without confirming the current NPHIES package.',
      'The validation workbook records Patient.active as fixed true (BV-00339), Task poll count as a positive integer below a configured limit (DT-01301), and a configured maximum number of claims in PaymentReconciliation.detail (BV-01259). The latter limits are facility/system configuration; this desk cannot infer them.',
      'These files were found on the BrainSAIT server on 3 Nov 2026. Their filename is not proof of a NPHIES production go-live date; confirm effective dates with the portal before sending live transactions.',
    ],
    pointsAr: [
      'يضيف CR162 الفئة expected-delivery-date إلى Claim.supportingInfo. ويربطها ملف التعريف بالحقل timingDate؛ ويفحص المكتب الآن وجود تاريخ FHIR صالح.',
      'يسجل سجل تغييرات الرموز إضافة مجموعة القيم والنظام expected-delivery-date-absence-reason ثم إزالتهما. لا ترسل رمز سبب غياب بناءً على هذه النسخة قبل التحقق من حزمة نفيس الحالية.',
      'يسجل ملف التحقق أن Patient.active ثابتة على true (BV-00339)، وأن عدد طلبات Task poll عدد صحيح موجب دون حد مضبوط (DT-01301)، وأن PaymentReconciliation.detail لا يتجاوز عدد المطالبات المضبوط لكل دفعة (BV-01259). الحدود الأخيرة إعدادات للمنشأة أو النظام ولا يمكن استنتاجها هنا.',
      'عُثر على هذه الملفات في خادم BrainSAIT بتاريخ 3 نوفمبر 2026. اسم الملف لا يثبت تاريخ بدء التطبيق في بيئة نفيس الإنتاجية؛ تحقّق من تاريخ السريان عبر البوابة قبل إرسال معاملات فعلية.',
    ] },
  { id: 'drg', en: 'DRG release', ar: 'إصدار DRG', when: 'June 2026', docs: 'Profiles 5.4.2 · Code sets 5.5.2 · Portal Manual, DRG Release', who: ['Hospitals, coders, claims teams', 'المستشفيات والمرمّزون وفرق المطالبات'],
    pointsEn: ['DRG joins institutional billing as its own code system, on the first item of admitted-care requests.', 'Actual and shadow billing follow different money rules, and enforcement in shadow billing is configurable.', 'The old diagnosisRelatedGroup extension is gone from authorisation and claim profiles. Payers now return a DRG on the response item, with a recalculatedDRG category and an adjustment reason.', 'New tables: adjustment reasons, ICU room codes, maternity diagnoses and tooth-specific codes.', 'Item details gain a factor, and last menstrual period gains an absence reason.'],
    pointsAr: ['ينضم DRG إلى فوترة المؤسسات بنظام رموز خاص، في البند الأول من طلبات التنويم.', 'تختلف القواعد المالية بين الفوترة الفعلية والموازية، ويمكن ضبط الإلزام في الموازية.', 'أُزيل امتداد diagnosisRelatedGroup القديم من ملفات الموافقات والمطالبات، وصارت شركات التأمين تعيد DRG في بند الرد مع فئة recalculatedDRG وسبب تعديل.', 'جداول جديدة: أسباب التعديل ورموز غرف العناية المركزة وتشخيصات الأمومة ورموز الأسنان المحددة.', 'أُضيف المعامل إلى تفاصيل البنود، وسبب غياب لتاريخ آخر دورة شهرية.'] },
  { id: 'gss', en: 'GSS, ZATCA and reopen', ar: 'GSS وZATCA وإعادة الفتح', when: 'May 2025 to January 2026', docs: 'Profiles 5.4 · Code sets 5.5 and 5.5.1', who: ['Finance and claims teams', 'فرق المالية والمطالبات'],
    pointsEn: ['New task flows for GSS, ZATCA and reopening, with new input and output types.', 'Communication category moves to an NPHIES code system, its about element becomes optional, and inResponseTo is added.', 'GSS rejection reasons were revised in January 2026.'],
    pointsAr: ['مسارات مهام جديدة لـGSS وZATCA وإعادة الفتح، بأنواع مدخلات ومخرجات جديدة.', 'انتقلت فئة التواصل إلى نظام رموز نفيس، وصار عنصر about اختياريًا، وأُضيف inResponseTo.', 'نُقّحت أسباب رفض GSS في يناير 2026.'] },
  { id: 'coverage', en: 'Coverage type and benefits', ar: 'نوع التغطية والمنافع', when: 'August 2025', docs: 'Code sets 5.5', who: ['Registration and insurance desks', 'التسجيل ومكاتب التأمين'],
    pointsEn: ['Coverage type adds DOM, and the benefit category list gains new values.'], pointsAr: ['أضيفت القيمة DOM إلى نوع التغطية، وقيم جديدة إلى فئات المنافع.'] },
  { id: 'referral', en: 'Referral', ar: 'الإحالة', when: '2023 to 2024', docs: 'Profiles 5.3 · Code sets 5.4', who: ['Clinics and hospitals receiving referrals', 'العيادات والمستشفيات المستقبلة للإحالات'],
    pointsEn: ['Referral tasks, referral extensions on eligibility and professional claims, and offline referral fields.', 'A clinic specialty table was added, and the specialty appendix was renamed practice codes.'],
    pointsAr: ['مهام الإحالة وامتداداتها في الأهلية والمطالبات المهنية، وحقول الإحالة غير المتصلة.', 'أضيف جدول لتخصصات العيادات، وأُعيدت تسمية ملحق التخصصات إلى رموز الممارسة.'] },
];
