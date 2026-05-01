<?php
// ======================================================
//  Gestion du Token (JWT simplifié)
// ======================================================

/**
 * Générer un token utilisateur
 */
function generateToken($user) {

    $payload = [
        "id"    => $user["id"],
        "email" => $user["email"],
        "role"  => $user["role"],
        "exp"   => time() + (60 * 60 * 24) // 24h
    ];

    return base64_encode(json_encode($payload));
}


/**
 * Récupérer le token depuis les headers
 */
function getBearerToken() {

    $headers = getallheaders();

    if (!isset($headers['Authorization'])) {
        return null;
    }

    return str_replace("Bearer ", "", $headers['Authorization']);
}


/**
 * Vérifier et décoder le token
 */
function verifyToken() {

    $token = getBearerToken();

    if (!$token) {
        return null;
    }

    $decoded = json_decode(base64_decode($token), true);

    if (!$decoded) {
        return null;
    }

    // Vérifier expiration
    if (!isset($decoded["exp"]) || $decoded["exp"] < time()) {
        return null;
    }

    return $decoded;
}