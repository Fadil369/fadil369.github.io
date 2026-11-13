<?php
declare(strict_types=1);

/**
 * Build / Founder-Accelerator application backend (core).
 *
 * Pure request -> response: handle() takes the method, path, headers and raw body and returns
 * [status, headers, body]. No globals, no output, so the tests drive it directly.
 *
 * Personal data (name, email, phone, country, GitHub username) lives only in the SQLite file under
 * the data directory. It is never written to logs and never returned from the public endpoints
 * except the applicant's own name and email on /progress/<ref> (the reference is the capability).
 */
final class BuildApply
{
    public const BASE_PRICE = 9630.00;
    public const VARIANT_ID = '45947217870931';
    public const PROMOS = ['LAUNCH10' => 10, 'FOUNDER15' => 15];
    public const PLANS = ['full' => 1, 'flex' => 2, 'split' => 3, 'quarter' => 4];
    public const ORIGINS = ['https://fadil369.github.io', 'https://brainsait.de', 'https://www.brainsait.de'];
    /** Placeholder names: replace with the real programme milestones in config before launch. */
    public const MILESTONES = [
        'Onboarding call', 'Cohort and sprint plan', 'Repository set up', 'Problem statement',
        'Customer interviews', 'Solution design', 'Prototype', 'First demo',
        'Pilot users', 'Feedback round', 'Security review', 'Pricing model',
        'Launch plan', 'Go-live', 'Post-launch review', 'Graduation',
    ];

    private PDO $db;

    public function __construct(private string $dataDir, private array $env = [], private ?int $now = null)
    {
        if (!is_dir($dataDir)) {
            mkdir($dataDir, 0750, true);
        }
        $this->db = new PDO('sqlite:' . $dataDir . '/build-apply.sqlite');
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->db->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON');
        $this->migrate();
    }

    private function t(): int { return $this->now ?? time(); }

    private function migrate(): void
    {
        $this->db->exec(<<<'SQL'
CREATE TABLE IF NOT EXISTS applications (
  ref TEXT PRIMARY KEY, lang TEXT, full_name TEXT, email TEXT, phone TEXT, country TEXT, github TEXT,
  promo TEXT, plan TEXT, final_price REAL, payment_status TEXT DEFAULT 'Pending',
  application_status TEXT DEFAULT 'Submitted', order_id TEXT, created_at INTEGER, paid_at INTEGER,
  certificate_at INTEGER);
CREATE TABLE IF NOT EXISTS milestones (ref TEXT, position INTEGER, name TEXT, status TEXT DEFAULT 'Not started',
  PRIMARY KEY (ref, position));
CREATE TABLE IF NOT EXISTS processed_orders (order_id TEXT PRIMARY KEY, ref TEXT, at INTEGER);
CREATE TABLE IF NOT EXISTS customers (email TEXT PRIMARY KEY, full_name TEXT, phone TEXT, country TEXT,
  application_ref TEXT, accepts_marketing INTEGER, updated_at INTEGER);
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, stage TEXT, at INTEGER);
CREATE TABLE IF NOT EXISTS hits (bucket TEXT, at INTEGER);
CREATE INDEX IF NOT EXISTS hits_idx ON hits (bucket, at);
SQL);
    }

    /** @return array{0:int,1:array<string,string>,2:string} */
    public function handle(string $method, string $path, array $headers, string $body, string $ip): array
    {
        $h = array_change_key_case($headers, CASE_LOWER);
        $origin = $h['origin'] ?? '';
        $cors = in_array($origin, self::ORIGINS, true)
            ? ['Access-Control-Allow-Origin' => $origin, 'Vary' => 'Origin',
               'Access-Control-Allow-Methods' => 'GET, POST, OPTIONS',
               'Access-Control-Allow-Headers' => 'Content-Type, X-Token', 'Access-Control-Max-Age' => '600']
            : [];
        if ($method === 'OPTIONS') {
            return [204, $cors, ''];
        }
        try {
            [$status, $payload, $type] = $this->route($method, '/' . trim($path, '/'), $body, $ip, $h);
        } catch (Throwable $e) {
            error_log('build-apply: ' . get_class($e)); // class only: messages can carry data
            [$status, $payload, $type] = [500, ['ok' => false, 'error' => 'Server error'], 'json'];
        }
        if ($status === 204) {
            return [204, $cors + ['Cache-Control' => 'no-store'], ''];
        }
        $headers = $cors + ['X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'no-store'];
        if ($type === 'json') {
            $headers['Content-Type'] = 'application/json; charset=utf-8';
            return [$status, $headers, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)];
        }
        $headers['Content-Type'] = $type === 'svg' ? 'image/svg+xml' : 'text/html; charset=utf-8';
        $headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; img-src data:";
        return [$status, $headers, (string) $payload];
    }

    private function route(string $method, string $path, string $body, string $ip, array $h): array
    {
        $segs = explode('/', ltrim($path, '/'));
        $a = $segs[0] ?? '';
        $b = $segs[1] ?? '';
        if ($path === '/healthz') return [200, ['ok' => true], 'json'];
        if ($method === 'POST' && $path === '/apply') return $this->apply($body, $ip);
        if ($method === 'GET' && $a === 'progress' && $b !== '') return $this->progress($b, $ip);
        if ($method === 'GET' && $a === 'installment' && $b !== '') return $this->installment($b, $ip);
        if ($method === 'POST' && $path === '/customer/sync') return $this->customerSync($body, $ip);
        if ($method === 'POST' && $a === 'events' && $b !== '') return $this->event($b, $ip);
        if ($method === 'GET' && $a === 'certificate' && $b !== '') return $this->certificate($b, false);
        if ($method === 'GET' && $a === 'badge' && $b !== '') return $this->certificate($b, true);
        if ($method === 'POST' && $path === '/webhook/shopify') return $this->webhook($body, $h);
        if (in_array($path, ['/customer/link-shopify', '/customer/github-claim', '/installment', '/webhook/forge/event'], true)) {
            return [501, ['ok' => false, 'error' => 'Not available yet'], 'json'];
        }
        return [404, ['ok' => false, 'error' => 'Not found'], 'json'];
    }

    // ---- helpers -------------------------------------------------------------------------------

    private function limited(string $bucket, int $max, int $windowSeconds): bool
    {
        $now = $this->t();
        $this->db->prepare('DELETE FROM hits WHERE at < ?')->execute([$now - 3600]);
        $s = $this->db->prepare('SELECT COUNT(*) FROM hits WHERE bucket = ? AND at > ?');
        $s->execute([$bucket, $now - $windowSeconds]);
        if ((int) $s->fetchColumn() >= $max) return true;
        $this->db->prepare('INSERT INTO hits (bucket, at) VALUES (?, ?)')->execute([$bucket, $now]);
        return false;
    }

    private function tooMany(): array { return [429, ['ok' => false, 'error' => 'Too many requests, try again later'], 'json']; }
    private function bad(string $m): array { return [400, ['ok' => false, 'error' => $m], 'json']; }
    private function json(string $body): ?array
    {
        if (strlen($body) > 16384) return null;
        $d = json_decode($body, true);
        return is_array($d) ? $d : null;
    }
    private function str(mixed $v, int $max): string
    {
        return is_string($v) ? trim(mb_substr($v, 0, $max)) : '';
    }
    private function refOk(string $ref): bool { return (bool) preg_match('/^BLD-[A-Z0-9]{10}$/', $ref); }

    public function price(?string $promo): float
    {
        $pct = $promo !== null ? (self::PROMOS[strtoupper($promo)] ?? 0) : 0;
        return round(self::BASE_PRICE * (1 - $pct / 100), 2);
    }

    /** @return list<array{no:int,label:string,amount:float,dueAt:string}> */
    public function schedule(float $total, string $plan, int $from): array
    {
        $count = self::PLANS[$plan] ?? 1;
        $share = round($total / $count, 2);
        $out = [];
        for ($i = 1; $i <= $count; $i++) {
            $out[] = [
                'no' => $i, 'label' => $count === 1 ? 'Full payment' : "Installment $i of $count",
                'amount' => $i < $count ? $share : round($total - $share * ($count - 1), 2),
                'dueAt' => gmdate('Y-m-d', $from + 30 * 86400 * ($i - 1)),
            ];
        }
        return $out;
    }

    private function verifyTurnstile(string $token, string $ip): bool
    {
        $secret = $this->env['TURNSTILE_SECRET'] ?? '';
        if ($secret === '') return true; // optional until the secret is supplied
        if ($token === '') return false;
        $ch = curl_init('https://challenges.cloudflare.com/turnstile/v0/siteverify');
        curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8,
            CURLOPT_POSTFIELDS => http_build_query(['secret' => $secret, 'response' => $token, 'remoteip' => $ip])]);
        $r = curl_exec($ch);
        $d = is_string($r) ? json_decode($r, true) : null;
        return is_array($d) && ($d['success'] ?? false) === true;
    }

    // ---- endpoints -----------------------------------------------------------------------------

    private function apply(string $body, string $ip): array
    {
        if ($this->limited("apply:$ip", 5, 3600)) return $this->tooMany();
        $d = $this->json($body);
        if ($d === null) return $this->bad('Invalid request');
        $name = $this->str($d['fullName'] ?? '', 120);
        $email = strtolower($this->str($d['email'] ?? '', 254));
        $phone = $this->str($d['phone'] ?? '', 30);
        $country = $this->str($d['country'] ?? '', 60);
        $github = ltrim($this->str($d['githubUsername'] ?? '', 40), '@');
        $promoIn = $this->str($d['promoCode'] ?? '', 30);
        $plan = $this->str($d['plan'] ?? 'full', 10);
        $lang = ($d['lang'] ?? 'en') === 'ar' ? 'ar' : 'en';
        if (mb_strlen($name) < 2) return $this->bad('Please enter your full name');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return $this->bad('Please enter a valid email');
        if (!preg_match('/^[+0-9 ()\-]{6,30}$/', $phone)) return $this->bad('Please enter a valid phone number');
        if ($country === '') return $this->bad('Please choose your country');
        if ($github !== '' && !preg_match('/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/', $github)) return $this->bad('Invalid GitHub username');
        if (!isset(self::PLANS[$plan])) return $this->bad('Invalid plan');
        $promo = null;
        if ($promoIn !== '') {
            $promo = strtoupper($promoIn);
            if (!isset(self::PROMOS[$promo])) return $this->bad('Invalid promo code');
        }
        if (!$this->verifyTurnstile($this->str($d['turnstileToken'] ?? '', 2048), $ip)) return $this->bad('Verification failed, please retry');

        $final = $this->price($promo);
        $ref = 'BLD-' . strtoupper(substr(bin2hex(random_bytes(8)), 0, 10));
        $this->db->prepare('INSERT INTO applications (ref, lang, full_name, email, phone, country, github, promo, plan, final_price, created_at)
                            VALUES (?,?,?,?,?,?,?,?,?,?,?)')
            ->execute([$ref, $lang, $name, $email, $phone, $country, $github, $promo, $plan, $final, $this->t()]);

        $q = http_build_query([
            'id' => self::VARIANT_ID, 'quantity' => 1,
            'properties[eligibility_tier]' => 'standard', 'properties[final_price]' => $final,
            'properties[application_ref]' => $ref, 'properties[applicant_email]' => $email,
        ], '', '&', PHP_QUERY_RFC3986);
        $q = str_replace(['%5B', '%5D'], ['[', ']'], $q);
        $store = $this->env['SHOPIFY_STORE_URL'] ?? 'https://store.brainsait.de';
        $path = $promo !== null ? '/discount/' . rawurlencode($promo) . '?redirect=' . rawurlencode('/cart/add?' . $q) : '/cart/add?' . $q;
        return [200, ['ok' => true, 'applicationId' => $ref, 'finalPrice' => $final, 'checkoutUrl' => rtrim($store, '/') . $path], 'json'];
    }

    private function load(string $ref): ?array
    {
        if (!$this->refOk($ref)) return null;
        $s = $this->db->prepare('SELECT * FROM applications WHERE ref = ?');
        $s->execute([$ref]);
        $r = $s->fetch(PDO::FETCH_ASSOC);
        return $r ?: null;
    }

    private function progress(string $ref, string $ip): array
    {
        if ($this->limited("read:$ip", 60, 300)) return $this->tooMany();
        $app = $this->load($ref);
        if (!$app) return [404, ['ok' => false, 'error' => 'Application not found'], 'json'];
        $ms = $this->db->prepare('SELECT name, status FROM milestones WHERE ref = ? ORDER BY position');
        $ms->execute([$ref]);
        $milestones = $ms->fetchAll(PDO::FETCH_ASSOC);
        $total = count($milestones);
        $done = count(array_filter($milestones, fn($m) => $m['status'] === 'Completed'));
        $paid = $app['payment_status'] === 'Paid';
        $next = null;
        foreach ($milestones as $m) { if ($m['status'] !== 'Completed') { $next = $m['name']; break; } }
        $badges = ['Onboarded'];
        if ($paid) { $badges[] = 'Paid'; $badges[] = 'Activated'; }
        if ($done >= 1) $badges[] = 'Builder';
        if ($total > 0 && $done === $total) { $badges[] = 'Launch Ready'; $badges[] = 'Launched'; $badges[] = 'Verified'; }
        return [200, [
            'ok' => true, 'name' => $app['full_name'], 'email' => $app['email'], 'tier' => 'standard', 'track' => 'Founder Accelerator',
            'trackUrl' => null, 'paymentStatus' => $app['payment_status'], 'applicationStatus' => $app['application_status'],
            'notionUrl' => null, 'repoUrl' => null,
            'capabilities' => ['level' => $paid ? 'full' : 'building', 'deploy' => $paid, 'launch' => $paid, 'marketing' => $paid,
                'buildResources' => $paid, 'secondBrainPublic' => false, 'secondBrainUrl' => null],
            'totalTasks' => $total, 'doneTasks' => $done, 'percent' => $total ? (int) round($done * 100 / $total) : 0,
            'badges' => $badges, 'tasks' => [], 'milestones' => $milestones, 'nextTask' => $next,
        ], 'json'];
    }

    private function installment(string $ref, string $ip): array
    {
        if ($this->limited("read:$ip", 60, 300)) return $this->tooMany();
        $app = $this->load($ref);
        if (!$app) return [404, ['ok' => false, 'error' => 'Plan not found'], 'json'];
        $paid = $app['payment_status'] === 'Paid';
        $items = [];
        foreach ($this->schedule((float) $app['final_price'], $app['plan'], (int) $app['created_at']) as $it) {
            // Only whole-programme payment is tracked until instalment webhooks exist.
            $it['status'] = $paid ? 'paid' : 'due';
            if ($paid) $it['paidAt'] = gmdate('c', (int) $app['paid_at']);
            $items[] = $it;
        }
        return [200, ['ok' => true, 'plan' => [
            'ref' => $ref, 'plan' => $app['plan'], 'total' => (float) $app['final_price'],
            'status' => $paid ? 'COMPLETED' : 'ACTIVE', 'createdAt' => gmdate('c', (int) $app['created_at']), 'installments' => $items,
        ]], 'json'];
    }

    private function customerSync(string $body, string $ip): array
    {
        if ($this->limited("sync:$ip", 20, 3600)) return $this->tooMany();
        $d = $this->json($body);
        $email = strtolower($this->str($d['email'] ?? '', 254));
        if ($d === null || !filter_var($email, FILTER_VALIDATE_EMAIL)) return $this->bad('Invalid request');
        $ref = $this->str($d['applicationRef'] ?? '', 20);
        $this->db->prepare('INSERT INTO customers (email, full_name, phone, country, application_ref, accepts_marketing, updated_at)
            VALUES (?,?,?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET full_name=excluded.full_name, phone=excluded.phone,
            country=excluded.country, application_ref=excluded.application_ref, accepts_marketing=excluded.accepts_marketing,
            updated_at=excluded.updated_at')
            ->execute([$email, $this->str($d['fullName'] ?? '', 120), $this->str($d['phone'] ?? '', 30), $this->str($d['country'] ?? '', 60),
                $this->refOk($ref) ? $ref : null, empty($d['acceptsMarketing']) ? 0 : 1, $this->t()]);
        return [200, ['ok' => true], 'json'];
    }

    private function event(string $stage, string $ip): array
    {
        if ($this->limited("event:$ip", 120, 300)) return $this->tooMany();
        if (!preg_match('/^[a-z0-9_.-]{1,60}$/', $stage)) return $this->bad('Invalid stage');
        // Body is deliberately ignored: this endpoint stores the stage name and time only, never PII.
        $this->db->prepare('INSERT INTO events (stage, at) VALUES (?, ?)')->execute([$stage, $this->t()]);
        return [204, '', 'json'];
    }

    private function webhook(string $body, array $h): array
    {
        $secret = $this->env['SHOPIFY_WEBHOOK_SECRET'] ?? '';
        if ($secret === '') return [503, ['ok' => false, 'error' => 'Webhook not configured'], 'json'];
        $given = $h['x-shopify-hmac-sha256'] ?? '';
        $want = base64_encode(hash_hmac('sha256', $body, $secret, true));
        if ($given === '' || !hash_equals($want, $given)) return [401, ['ok' => false, 'error' => 'Bad signature'], 'json'];
        $o = json_decode($body, true);
        if (!is_array($o) || !isset($o['id'])) return $this->bad('Invalid payload');
        $orderId = (string) $o['id'];
        $ref = '';
        foreach (($o['line_items'] ?? []) as $li) {
            foreach (($li['properties'] ?? []) as $p) {
                if (($p['name'] ?? '') === 'application_ref') $ref = (string) ($p['value'] ?? '');
            }
        }
        foreach (($o['note_attributes'] ?? []) as $p) {
            if (($p['name'] ?? '') === 'application_ref' && $ref === '') $ref = (string) ($p['value'] ?? '');
        }
        $app = $this->load($ref);
        if (!$app) return [200, ['ok' => true, 'ignored' => true], 'json']; // not ours; 200 so Shopify stops retrying

        $this->db->beginTransaction();
        try {
            $ins = $this->db->prepare('INSERT OR IGNORE INTO processed_orders (order_id, ref, at) VALUES (?,?,?)');
            $ins->execute([$orderId, $ref, $this->t()]);
            if ($ins->rowCount() === 0) { $this->db->commit(); return [200, ['ok' => true, 'duplicate' => true], 'json']; }
            $this->db->prepare("UPDATE applications SET payment_status='Paid', application_status='Approved', order_id=?, paid_at=? WHERE ref=?")
                ->execute([$orderId, $this->t(), $ref]);
            $seed = $this->db->prepare('INSERT OR IGNORE INTO milestones (ref, position, name) VALUES (?,?,?)');
            foreach (self::MILESTONES as $i => $name) $seed->execute([$ref, $i + 1, $name]);
            $this->db->commit();
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
        return [200, ['ok' => true], 'json'];
    }

    /** Issued once, when all milestones are Completed. */
    private function certificate(string $ref, bool $badge): array
    {
        $app = $this->load($ref);
        $s = $this->db->prepare("SELECT COUNT(*) total, SUM(status='Completed') done FROM milestones WHERE ref = ?");
        $s->execute([$ref]);
        $c = $s->fetch(PDO::FETCH_ASSOC);
        if (!$app || (int) $c['total'] === 0 || (int) $c['done'] !== (int) $c['total']) {
            return [404, ['ok' => false, 'error' => 'Certificate not available'], 'json'];
        }
        if (empty($app['certificate_at'])) {
            $this->db->prepare('UPDATE applications SET certificate_at = ? WHERE ref = ? AND certificate_at IS NULL')->execute([$this->t(), $ref]);
            $app['certificate_at'] = $this->t();
        }
        $name = htmlspecialchars($app['full_name'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $date = gmdate('Y-m-d', (int) $app['certificate_at']);
        if ($badge) {
            return [200, '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="96" role="img" aria-label="BrainSAIT Founder Accelerator graduate">'
                . '<rect width="320" height="96" rx="12" fill="#0b3d2e"/><text x="16" y="40" fill="#fff" font-family="sans-serif" font-size="16" font-weight="700">Founder Accelerator</text>'
                . '<text x="16" y="68" fill="#bfe8d6" font-family="sans-serif" font-size="14">Graduate · ' . $date . '</text></svg>', 'svg'];
        }
        return [200, '<!doctype html><meta charset="utf-8"><title>Certificate</title><body style="font-family:sans-serif;text-align:center;padding:4rem">'
            . '<h1>Certificate of Completion</h1><p>BrainSAIT Founder Accelerator</p><h2>' . $name . '</h2><p>Completed all milestones · ' . $date
            . '</p><p><small>Reference ' . htmlspecialchars($ref) . '</small></p>', 'html'];
    }
}
