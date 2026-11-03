<?php
declare(strict_types=1);

// Contact-only intake for fadil369.github.io. Free-text messages are deliberately
// not forwarded or stored, so patient details cannot be included in an email.
$origin = 'https://fadil369.github.io';
$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
header_remove('Access-Control-Allow-Origin');
if ($requestOrigin === $origin) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function intakeReply(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

if ($requestOrigin !== $origin) {
    intakeReply(403, ['status' => 'rejected', 'error' => 'origin_not_allowed']);
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 600');
    http_response_code(204);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST, OPTIONS');
    intakeReply(405, ['status' => 'rejected', 'error' => 'method_not_allowed']);
}
if (($_SERVER['CONTENT_TYPE'] ?? '') !== 'application/json') {
    intakeReply(415, ['status' => 'rejected', 'error' => 'json_required']);
}
$length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($length < 2 || $length > 8192) {
    intakeReply(413, ['status' => 'rejected', 'error' => 'invalid_payload_size']);
}
$input = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($input) || array_is_list($input)) {
    intakeReply(400, ['status' => 'rejected', 'error' => 'invalid_payload']);
}

// Honeypot: silently accept bots without sending or storing their payload.
if (!empty($input['website'])) {
    intakeReply(200, ['status' => 'processed', 'receipt_id' => bin2hex(random_bytes(8)), 'routing' => []]);
}

$allowed = [
    'customer_type' => ['doctor', 'nurse', 'clinic_owner', 'hospital_leader', 'founder', 'student', 'partner', 'other'],
    'main_interest' => ['bpr_registry', 'clinical_ai_chatbot', 'build_sprint', 'nphies_fhir', 'clinic_automation', 'solutions_ready', 'partnership'],
    'budget' => ['under_2390', '2390', '4900_9900', '9630', '19900', '24000_plus'],
    'urgency' => ['today', 'this_week', 'this_month', 'exploring'],
    'facility_type' => ['clinic', 'hospital', 'pharmacy', 'dental', 'optical', 'other'],
    'nphies_status' => ['unknown', 'not_started', 'onboarding', 'sandbox', 'production'],
];
$clean = static function (mixed $value, int $max): string {
    if (!is_string($value)) return '';
    $value = trim(preg_replace('/[\r\n\t]+/u', ' ', strip_tags($value)) ?? '');
    return mb_substr($value, 0, $max, 'UTF-8');
};
$name = $clean($input['name'] ?? null, 120);
$email = $clean($input['email'] ?? null, 254);
$phone = $clean($input['phone'] ?? null, 40);
$country = $clean($input['country'] ?? null, 80);
if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    intakeReply(422, ['status' => 'rejected', 'error' => 'valid_name_and_email_required']);
}
$fields = [];
foreach ($allowed as $key => $values) {
    $value = $clean($input[$key] ?? ($key === 'nphies_status' ? 'unknown' : null), 40);
    if ($key === 'nphies_status' && $value === '') $value = 'unknown';
    if ($key === 'facility_type' && $value === '' && ($input['main_interest'] ?? '') !== 'nphies_fhir') continue;
    if ($key === 'budget' && $value === '' && ($input['main_interest'] ?? '') === 'nphies_fhir') continue;
    if (!in_array($value, $values, true)) {
        intakeReply(422, ['status' => 'rejected', 'error' => 'invalid_' . $key]);
    }
    $fields[$key] = $value;
}
$facilityName = $clean($input['facility_name'] ?? null, 120);
$ehrSystem = $clean($input['ehr_system'] ?? null, 120);
$isNphies = $fields['main_interest'] === 'nphies_fhir';
if ($isNphies && ($facilityName === '' || empty($fields['facility_type']))) {
    intakeReply(422, ['status' => 'rejected', 'error' => 'facility_name_and_type_required']);
}
$workflowLabels = [
    'eligibility' => 'Eligibility', 'authorization' => 'Prior authorization',
    'claims' => 'Claims', 'rejections' => 'Responses / rejections',
];
$workflows = $input['workflows'] ?? [];
if (!is_array($workflows) || count($workflows) > count($workflowLabels)) {
    intakeReply(422, ['status' => 'rejected', 'error' => 'invalid_workflows']);
}
foreach ($workflows as $workflow) {
    if (!is_string($workflow) || !isset($workflowLabels[$workflow])) {
        intakeReply(422, ['status' => 'rejected', 'error' => 'invalid_workflows']);
    }
}

// Rate-limit by a one-way hash of the client address. The file contains only
// timestamp counters and an IP hash, never form content or contact details.
$rateFile = '/var/lib/brainsait/intake-rate.json';
$ipHash = hash('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
$now = time();
$limits = [];
umask(0077);
$handle = @fopen($rateFile, 'c+');
if (!$handle || !flock($handle, LOCK_EX)) {
    if (is_resource($handle)) fclose($handle);
    error_log('intake rate limiter unavailable');
    intakeReply(503, ['status' => 'rejected', 'error' => 'temporarily_unavailable']);
}
$stored = stream_get_contents($handle);
$decoded = json_decode($stored ?: '{}', true);
if (is_array($decoded)) {
    foreach ($decoded as $key => $values) {
        if (!is_string($key) || !is_array($values)) continue;
        $fresh = array_values(array_filter($values, static fn($ts) => is_int($ts) && $ts > $now - 3600));
        if ($fresh) $limits[$key] = $fresh;
    }
}
$timestamps = $limits[$ipHash] ?? [];
if (count($timestamps) >= 5 || (!isset($limits[$ipHash]) && count($limits) >= 5000)) {
    flock($handle, LOCK_UN);
    fclose($handle);
    header('Retry-After: 3600');
    intakeReply(429, ['status' => 'rejected', 'error' => 'rate_limit']);
}
$timestamps[] = $now;
$limits[$ipHash] = $timestamps;
ftruncate($handle, 0);
rewind($handle);
fwrite($handle, json_encode($limits));
fflush($handle);
flock($handle, LOCK_UN);
fclose($handle);

$interestLabels = [
    'bpr_registry' => 'BPR Provider Registry', 'clinical_ai_chatbot' => 'Clinical AI Chatbot',
    'build_sprint' => 'BUILD Sprint', 'nphies_fhir' => 'NPHIES / FHIR interoperability',
    'clinic_automation' => 'Clinic Automation', 'solutions_ready' => 'Solutions Ready',
    'partnership' => 'Partnership',
];
$subject = $fields['main_interest'] === 'nphies_fhir'
    ? 'NPHIES facility readiness inquiry'
    : 'BrainSAIT website inquiry';
$receiptId = 'BSI-' . strtoupper(bin2hex(random_bytes(4)));
$body = implode("\n", [
    'A website contact request was submitted.',
    'Confirmation ID: ' . $receiptId,
    'Name: ' . $name,
    'Email: ' . $email,
    'Phone: ' . ($phone !== '' ? $phone : '(not provided)'),
    'City / country: ' . ($country !== '' ? $country : '(not provided)'),
    'Customer type: ' . $fields['customer_type'],
    'Interest: ' . ($interestLabels[$fields['main_interest']] ?? $fields['main_interest']),
    'Budget range: ' . ($fields['budget'] ?? '(scoped after discovery)'),
    'Urgency: ' . $fields['urgency'],
    ...($isNphies ? [
        'Facility: ' . $facilityName,
        'Facility type: ' . $fields['facility_type'],
        'NPHIES onboarding: ' . $fields['nphies_status'],
        'EHR / claims system: ' . ($ehrSystem !== '' ? $ehrSystem : '(not provided)'),
        'Priority workflows: ' . (count($workflows) ? implode(', ', array_map(static fn($workflow) => $workflowLabels[$workflow], $workflows)) : '(not selected)'),
    ] : []),
    '',
    'Free-text message was intentionally omitted. Do not request or send patient data or passwords.',
]);
$headers = [
    'From: BrainSAIT Website <registry@brainsait.de>',
    'Reply-To: ' . $email,
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: BrainSAIT Intake',
];
// PHP's configured default msmtp account is Mailpit by design. Select the
// existing live konsoleH account so this request reaches the team inbox.
if (!mail('hello@brainsait.de', $subject, $body, implode("\r\n", $headers), '-a konsoleh')) {
    error_log('intake email delivery failed');
    intakeReply(503, ['status' => 'rejected', 'error' => 'delivery_failed']);
}

intakeReply(200, ['status' => 'processed', 'receipt_id' => $receiptId, 'routing' => []]);
