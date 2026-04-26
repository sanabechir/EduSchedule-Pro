<?php
// ============================================================
//  EduSchedule Pro — Configuration Générale
//  Auteur : Bechir
// ============================================================

// URL de base de l'API
define('BASE_URL', 'http://localhost/EduSchedule-Pro/backend');

// Clé secrète JWT (ne jamais exposer)
define('JWT_SECRET', 'EduSchedulePro_Secret_2025_ISGE');
define('JWT_EXPIRATION', 3600); // 1 heure en secondes

// Fenêtre de validité QR-Code (en minutes)
define('QR_WINDOW_MINUTES', 15);

// Délai d'alerte retard enseignant (en minutes)
define('RETARD_ALERTE_MINUTES', 30);

// Taux de retenue par défaut (%)
define('TAUX_RETENUE_DEFAULT', 0);

// En-têtes CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');

// Gérer les requêtes OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}