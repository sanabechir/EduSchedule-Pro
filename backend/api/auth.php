<?php
// ======================================================
//  Authentification (LOGIN)
// ======================================================

header("Content-Type: application/json");

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/jwt.php';

$db = (new Database())->getConnection();

// Récupération des données
$data = json_decode(file_get_contents("php://input"), true);

// 🔒 Vérification des champs
if (!isset($data["email"]) || !isset($data["password"])) {
    errorResponse("Email et mot de passe requis", 400);
}

$email = $data["email"];
$password = $data["password"];

try {

    // 🔍 Recherche utilisateur
    $stmt = $db->prepare("SELECT * FROM utilisateurs WHERE email = ?");
    $stmt->execute([$email]);

    $user = $stmt->fetch();

    // ❌ Utilisateur non trouvé
    if (!$user) {
        errorResponse("Utilisateur introuvable", 404);
    }

    // ❌ Mot de passe incorrect
    if (!password_verify($password, $user["password"])) {
        errorResponse("Mot de passe incorrect", 401);
    }

    // ✅ Génération du token
    $token = generateToken($user);

    // 🎯 Réponse
    jsonResponse([
        "token" => $token,
        "user" => [
            "id"    => $user["id"],
            "email" => $user["email"],
            "role"  => $user["role"]
        ]
    ], "Connexion réussie");

} catch (Exception $e) {

    errorResponse("Erreur serveur", 500);
}