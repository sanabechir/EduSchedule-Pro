<?php
// ======================================================
//  Middleware d'authentification
// ======================================================

require_once __DIR__ . '/../utils/jwt.php';
require_once __DIR__ . '/../utils/response.php';

/**
 * Vérifie si l'utilisateur est connecté
 * et optionnellement son rôle
 */
function checkAuth($requiredRole = null) {

    // 🔐 Vérifier le token
    $user = verifyToken();

    if (!$user) {
        errorResponse("Accès non autorisé (token invalide ou expiré)", 401);
    }

    // 🔥 Vérifier le rôle si nécessaire
    if ($requiredRole !== null && $user["role"] !== $requiredRole) {
        errorResponse("Accès refusé (rôle insuffisant)", 403);
    }

    return $user;
}