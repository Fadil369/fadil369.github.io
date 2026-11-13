<?php
declare(strict_types=1);
require __DIR__ . '/../src/BuildApply.php';

$envFile = getenv('BUILD_APPLY_ENV') ?: '/etc/build-apply.env';
$env = is_readable($envFile) ? (parse_ini_file($envFile, false, INI_SCANNER_RAW) ?: []) : [];
$app = new BuildApply(getenv('BUILD_APPLY_DATA') ?: '/var/lib/brainsait/build-apply', $env);

$headers = function_exists('getallheaders') ? getallheaders() : [];
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
[$status, $out, $body] = $app->handle($_SERVER['REQUEST_METHOD'] ?? 'GET', parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/', $headers, file_get_contents('php://input') ?: '', $ip);
http_response_code($status);
foreach ($out as $k => $v) header("$k: $v");
echo $body;
