<?php
ob_start();

ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('X-Auth-Version: CLEAN_AUTH_V4');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/database.php';

function send_json($success, $message = '', $data = null, $status = 200) {
    if (ob_get_length()) {
        ob_clean();
    }

    http_response_code($status);

    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);

    exit();
}

function get_body_json() {
    $raw = file_get_contents('php://input');

    if (!$raw) {
        return [];
    }

    $data = json_decode($raw, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        send_json(false, 'JSON invalide', null, 400);
    }

    return $data;
}

function create_token($user) {
    $payload = [
        'id' => (int) $user['id'],
        'email' => $user['email'],
        'role' => $user['role'],
        'exp' => time() + 86400
    ];

    return base64_encode(json_encode($payload, JSON_UNESCAPED_UNICODE));
}

try {
    $database = new Database();
    $conn = $database->getConnection();

    $action = $_GET['action'] ?? '';

    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'login') {
        $body = get_body_json();

        $email = trim($body['email'] ?? '');
        $password = $body['password'] ?? '';

        if ($email === '' || $password === '') {
            send_json(false, 'Email et mot de passe obligatoires', null, 400);
        }

        $stmt = $conn->prepare("
            SELECT id, email, password, role
            FROM utilisateurs
            WHERE email = :email
            LIMIT 1
        ");

        $stmt->execute([
            ':email' => $email
        ]);

        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            send_json(false, 'Identifiants incorrects', null, 401);
        }

        if (!password_verify($password, $user['password'])) {
            send_json(false, 'Identifiants incorrects', null, 401);
        }

        $token = create_token($user);

        send_json(true, 'OK', [
            'token' => $token,
            'user' => [
                'id' => (int) $user['id'],
                'email' => $user['email'],
                'role' => $user['role']
            ]
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'me') {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';

        if (!$auth || strpos($auth, 'Bearer ') !== 0) {
            send_json(false, 'Token manquant', null, 401);
        }

        $token = trim(str_replace('Bearer ', '', $auth));
        $payload = json_decode(base64_decode($token), true);

        if (!$payload || !isset($payload['exp']) || $payload['exp'] < time()) {
            send_json(false, 'Token invalide ou expiré', null, 401);
        }

        send_json(true, 'OK', [
            'user' => $payload
        ]);
    }

    send_json(false, 'Action non reconnue', null, 404);

} catch (Throwable $e) {
    send_json(false, 'Erreur serveur auth_clean.php', [
        'error' => $e->getMessage()
    ], 500);
}