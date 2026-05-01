<?php
// ============================================================
// EduSchedule Pro — API Authentification
// Auteur : Bechir
// ============================================================

ob_start();

ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/database.php';

function jsonResponse($success, $message = '', $data = null, $statusCode = 200) {
    if (ob_get_length()) {
        ob_clean();
    }

    http_response_code($statusCode);

    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);

    exit();
}

function getJsonBody() {
    $raw = file_get_contents('php://input');

    if (!$raw) {
        return [];
    }

    $data = json_decode($raw, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        jsonResponse(false, 'JSON invalide', null, 400);
    }

    return $data;
}

function generateToken($user) {
    $payload = [
        'id' => (int) $user['id'],
        'email' => $user['email'],
        'role' => $user['role'],
        'exp' => time() + (24 * 60 * 60)
    ];

    return base64_encode(json_encode($payload, JSON_UNESCAPED_UNICODE));
}

try {
    $action = $_GET['action'] ?? '';

    $database = new Database();
    $pdo = $database->getConnection();

    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'login') {
        $body = getJsonBody();

        $email = trim($body['email'] ?? '');
        $password = $body['password'] ?? '';

        if ($email === '' || $password === '') {
            jsonResponse(false, 'Email et mot de passe obligatoires', null, 400);
        }

        $stmt = $pdo->prepare("
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
            jsonResponse(false, 'Identifiants incorrects', null, 401);
        }

        $passwordOk = password_verify($password, $user['password']);

        if (!$passwordOk) {
            jsonResponse(false, 'Identifiants incorrects', null, 401);
        }

        $token = generateToken($user);

        jsonResponse(true, 'OK', [
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
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            jsonResponse(false, 'Token manquant', null, 401);
        }

        $token = trim(str_replace('Bearer ', '', $authHeader));
        $payload = json_decode(base64_decode($token), true);

        if (!$payload || !isset($payload['exp']) || $payload['exp'] < time()) {
            jsonResponse(false, 'Token invalide ou expiré', null, 401);
        }

        jsonResponse(true, 'OK', [
            'user' => $payload
        ]);
    }

    jsonResponse(false, 'Action non reconnue', null, 404);

} catch (Throwable $e) {
    jsonResponse(false, 'Erreur serveur auth.php', [
        'error' => $e->getMessage()
    ], 500);
}