<?php
declare(strict_types=1);
// Dependency-free tests: php build-apply/tests/run.php
require __DIR__ . '/../src/BuildApply.php';

$fails = 0;
function check(string $name, bool $ok): void { global $fails; echo ($ok ? '  ok   ' : '  FAIL ') . $name . "\n"; if (!$ok) $fails++; }
function mk(array $env = ['SHOPIFY_WEBHOOK_SECRET' => 's3cret'], int $now = 1800000000): array {
    $dir = sys_get_temp_dir() . '/ba-test-' . bin2hex(random_bytes(4));
    return [new BuildApply($dir, $env, $now), $dir];
}
function call(BuildApply $a, string $m, string $p, $body = '', array $h = [], string $ip = '1.1.1.1'): array {
    [$s, $hd, $b] = $a->handle($m, $p, $h, is_array($body) ? json_encode($body) : $body, $ip);
    return [$s, json_decode($b, true) ?? $b, $hd];
}
$good = ['lang' => 'en', 'fullName' => 'Test Applicant', 'email' => 'Test@Example.com', 'phone' => '+966500000000', 'country' => 'SA', 'plan' => 'quarter', 'promoCode' => 'launch10'];
function sign(string $body, string $secret = 's3cret'): array { return ['X-Shopify-Hmac-Sha256' => base64_encode(hash_hmac('sha256', $body, $secret, true))]; }
function order(string $id, string $ref): string { return json_encode(['id' => $id, 'line_items' => [['properties' => [['name' => 'application_ref', 'value' => $ref]]]]]); }

echo "pricing\n";
[$a] = mk();
check('base price', $a->price(null) === 9630.0);
check('LAUNCH10 is 10% off', $a->price('LAUNCH10') === 8667.0);
check('FOUNDER15 is 15% off', $a->price('founder15') === 8185.5);
check('unknown promo gives no discount', $a->price('NOPE') === 9630.0);
$sch = $a->schedule(9630.0, 'quarter', 0);
check('quarter plan has 4 parts summing to total', count($sch) === 4 && round(array_sum(array_column($sch, 'amount')), 2) === 9630.0);
check('quarter share is 2407.50', $sch[0]['amount'] === 2407.5);
$sch3 = $a->schedule(8667.0, 'split', 0);
check('last instalment absorbs remainder', round(array_sum(array_column($sch3, 'amount')), 2) === 8667.0);

echo "apply\n";
[$s, $r] = call($a, 'POST', '/apply', $good);
check('apply ok', $s === 200 && $r['ok'] === true && preg_match('/^BLD-[A-Z0-9]{10}$/', $r['applicationId']) === 1);
check('promo applied to price', $r['finalPrice'] == 8667.0);
check('checkout url carries ref, variant and promo', str_contains($r['checkoutUrl'], '/discount/LAUNCH10') && str_contains(rawurldecode($r['checkoutUrl']), 'properties[application_ref]=' . $r['applicationId']) && str_contains($r['checkoutUrl'], '45947217870931'));
$ref = $r['applicationId'];
foreach ([['fullName' => 'A'], ['email' => 'nope'], ['phone' => 'abc'], ['country' => ''], ['plan' => 'weekly'], ['promoCode' => 'BOGUS'], ['githubUsername' => 'bad name!']] as $i => $patch) {
    [$s] = call($a, 'POST', '/apply', array_merge($good, $patch), [], "9.9.9.$i");
    check('rejects ' . array_key_first($patch), $s === 400);
}
[$s] = call($a, 'POST', '/apply', 'not json', [], '8.8.8.8');
check('rejects non-JSON', $s === 400);
[$b] = mk();
$codes = [];
for ($i = 0; $i < 7; $i++) { [$s] = call($b, 'POST', '/apply', $good, [], '7.7.7.7'); $codes[] = $s; }
check('rate limit kicks in after 5 applications per hour', array_count_values($codes)[429] === 2);

echo "progress before payment\n";
[$s, $r] = call($a, 'GET', "/progress/$ref");
check('progress ok, unpaid', $s === 200 && $r['paymentStatus'] === 'Pending' && $r['capabilities']['level'] === 'building' && $r['totalTasks'] === 0);
[$s] = call($a, 'GET', '/progress/BLD-NOTAREAL00');
check('unknown ref is 404', $s === 404);
[$s] = call($a, 'GET', "/progress/' OR 1=1 --");
check('malformed ref is 404', $s === 404);

echo "webhook\n";
$body = order('1001', $ref);
[$s] = call($a, 'POST', '/webhook/shopify', $body);
check('missing signature is 401', $s === 401);
[$s] = call($a, 'POST', '/webhook/shopify', $body, sign($body, 'wrong'));
check('wrong signature is 401', $s === 401);
[$s] = call($a, 'POST', '/webhook/shopify', $body, sign($body));
check('valid webhook is 200', $s === 200);
[$s, $r] = call($a, 'GET', "/progress/$ref");
check('now Paid + Approved with 16 milestones', $r['paymentStatus'] === 'Paid' && $r['applicationStatus'] === 'Approved' && $r['totalTasks'] === 16 && $r['capabilities']['level'] === 'full');
[$s, $r] = call($a, 'POST', '/webhook/shopify', $body, sign($body));
check('replayed order is deduplicated', $s === 200 && ($r['duplicate'] ?? false) === true);
$other = order('1002', 'BLD-ZZZZZZZZZZ');
[$s, $r] = call($a, 'POST', '/webhook/shopify', $other, sign($other));
check('order without a known application_ref is ignored', $s === 200 && ($r['ignored'] ?? false) === true);
[$c] = mk([]);
[$s] = call($c, 'POST', '/webhook/shopify', $body, sign($body));
check('503 when secret is not configured', $s === 503);

echo "installments, certificate\n";
[$s, $r] = call($a, 'GET', "/installment/$ref");
check('installment plan shown as completed', $r['plan']['status'] === 'COMPLETED' && count($r['plan']['installments']) === 4);
[$s] = call($a, 'GET', "/certificate/$ref");
check('no certificate while milestones are open', $s === 404);
$dir = (new ReflectionProperty($a, 'dataDir'))->getValue($a);
$pdo = new PDO('sqlite:' . $dir . '/build-apply.sqlite');
$pdo->exec("UPDATE milestones SET status='Completed' WHERE ref='$ref'");
[$s, $html] = call($a, 'GET', "/certificate/$ref");
check('certificate once all complete, name escaped', $s === 200 && str_contains($html, 'Test Applicant'));
[$s, $svg, $hd] = call($a, 'GET', "/badge/$ref");
check('badge is svg with a locked-down CSP', $s === 200 && ($hd['Content-Type'] ?? '') === 'image/svg+xml' && str_contains($hd['Content-Security-Policy'] ?? '', "default-src 'none'"));
$pdo->prepare('UPDATE applications SET full_name = ? WHERE ref = ?')->execute(['<script>x</script>', $ref]);
[, $html] = call($a, 'GET', "/certificate/$ref");
check('names are HTML-escaped on the certificate', !str_contains($html, '<script>x'));

echo "events, sync, cors\n";
[$s, $r] = call($a, 'POST', '/events/journey.plan_selected', ['email' => 'leak@example.com']);
check('event returns 204 and stores no payload', $s === 204 && $pdo->query("SELECT COUNT(*) FROM events")->fetchColumn() == 1 && !str_contains(json_encode($pdo->query('SELECT * FROM events')->fetchAll(PDO::FETCH_ASSOC)), 'leak'));
[$s] = call($a, 'POST', '/events/Bad Stage!');
check('invalid stage is 400', $s === 400);
[$s] = call($a, 'POST', '/customer/sync', ['email' => 'x@example.com', 'fullName' => 'X', 'acceptsMarketing' => true, 'applicationRef' => $ref]);
check('customer sync ok', $s === 200);
[$s] = call($a, 'POST', '/customer/sync', ['email' => 'bad']);
check('customer sync rejects bad email', $s === 400);
[$s, , $hd] = call($a, 'GET', '/healthz', '', ['Origin' => 'https://fadil369.github.io']);
check('CORS allows the site', ($hd['Access-Control-Allow-Origin'] ?? '') === 'https://fadil369.github.io');
[$s, , $hd] = call($a, 'GET', '/healthz', '', ['Origin' => 'https://evil.example']);
check('CORS does not allow other origins', !isset($hd['Access-Control-Allow-Origin']));
[$s] = call($a, 'POST', '/customer/github-claim', []);
check('unfinished endpoints say 501, not success', $s === 501);
[$s] = call($a, 'GET', '/nope');
check('unknown path is 404', $s === 404);

echo $fails === 0 ? "\nAll checks passed.\n" : "\n$fails check(s) failed.\n";
exit($fails === 0 ? 0 : 1);
