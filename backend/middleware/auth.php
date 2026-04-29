<?php
// ============================================================
//  EduSchedule Pro — Middleware Authentification JWT
//  Auteur : Bechir
// ============================================================

require_once __DIR__ . '/../config/config.php';

class Auth {

    // Générer un token JWT
    public static function genererToken($payload) {
        $header = base64_encode(json_encode([
            'alg' => 'HS256',
            'typ' => 'JWT'
        ]));

        $payload['iat'] = time();
        $payload['exp'] = time() + JWT_EXPIRATION;

        $payload_encode = base64_encode(json_encode($payload));

        $signature = hash_hmac(
            'sha256',
            "$header.$payload_encode",
            JWT_SECRET,
            true
        );
        $signature = base64_encode($signature);

        return "$header.$payload_encode.$signature";
    }

    // Vérifier et décoder un token JWT
    public static function verifierToken($token) {
        $parties = explode('.', $token);

        if (count($parties) !== 3) {
            return null;
        }

        [$header, $payload, $signature] = $parties;

        // Vérifier la signature
        $signature_valide = base64_encode(
            hash_hmac('sha256', "$header.$payload", JWT_SECRET, true)
        );

        if ($signature !== $signature_valide) {
            return null;
        }

        // Décoder le payload
        $data = json_decode(base64_decode($payload), true);

        // Vérifier expiration
        if (!isset($data['exp']) || $data['exp'] < time()) {
            return null;
        }

        return $data;
    }

    // Extraire le token du header Authorization
    public static function getTokenDepuisHeader() {
        $headers = getallheaders();
        if (!isset($headers['Authorization'])) {
            return null;
        }

        $auth = $headers['Authorization'];
        if (!str_starts_with($auth, 'Bearer ')) {
            return null;
        }

        return substr($auth, 7);
    }

    // Protéger une route — retourne les données utilisateur ou bloque
    public static function proteger($roles_autorises = []) {
        $token = self::getTokenDepuisHeader();

        if (!$token) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'Token manquant — accès refusé'
            ]);
            exit();
        }

        $data = self::verifierToken($token);

        if (!$data) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'Token invalide ou expiré'
            ]);
            exit();
        }

        // Vérifier le rôle si spécifié
        if (!empty($roles_autorises) && !in_array($data['role'], $roles_autorises)) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Accès interdit — rôle insuffisant'
            ]);
            exit();
        }

        return $data;
    }
}