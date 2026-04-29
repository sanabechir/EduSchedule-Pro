<?php
// ============================================================
//  EduSchedule Pro — API Authentification
//  Auteur : Bechir
//  Endpoints : POST /api/auth/login
//              POST /api/auth/logout
// ============================================================

header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$db     = new Database();
$conn   = $db->getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'POST':
        if ($action === 'login')  login($conn);
        if ($action === 'logout') logout();
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
}

// ============================================================
//  LOGIN
// ============================================================
function login($conn) {
    $data = json_decode(file_get_contents('php://input'), true);

    // Validation des champs
    if (empty($data['email']) || empty($data['password'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Email et mot de passe requis'
        ]);
        return;
    }

    // Chercher l'utilisateur
    $stmt = $conn->prepare("
        SELECT u.*, 
               CASE 
                 WHEN u.role = 'enseignant' THEN e.nom
                 ELSE NULL 
               END AS nom_enseignant,
               CASE 
                 WHEN u.role = 'enseignant' THEN e.prenom
                 ELSE NULL 
               END AS prenom_enseignant
        FROM utilisateurs u
        LEFT JOIN enseignants e ON u.id_lien = e.id AND u.role = 'enseignant'
        WHERE u.email = :email AND u.actif = 1
    ");
    $stmt->execute([':email' => $data['email']]);
    $utilisateur = $stmt->fetch();

    // Vérifier mot de passe
    if (!$utilisateur || !password_verify($data['password'], $utilisateur['mot_de_passe_hash'])) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Email ou mot de passe incorrect'
        ]);
        return;
    }

    // Générer le token JWT
    $token = Auth::genererToken([
        'id'      => $utilisateur['id'],
        'email'   => $utilisateur['email'],
        'role'    => $utilisateur['role'],
        'id_lien' => $utilisateur['id_lien']
    ]);

    // Mettre à jour la dernière connexion
    $stmt = $conn->prepare("
        UPDATE utilisateurs 
        SET derniere_connexion = NOW() 
        WHERE id = :id
    ");
    $stmt->execute([':id' => $utilisateur['id']]);

    // Logger l'action
    $stmt = $conn->prepare("
        INSERT INTO logs_activite (id_utilisateur, action, ip) 
        VALUES (:id, 'LOGIN', :ip)
    ");
    $stmt->execute([
        ':id' => $utilisateur['id'],
        ':ip' => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'
    ]);

    // Réponse succès
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Connexion réussie',
        'token'   => $token,
        'user'    => [
            'id'     => $utilisateur['id'],
            'email'  => $utilisateur['email'],
            'role'   => $utilisateur['role'],
            'nom'    => $utilisateur['nom_enseignant'],
            'prenom' => $utilisateur['prenom_enseignant']
        ]
    ]);
}

// ============================================================
//  LOGOUT
// ============================================================
function logout() {
    $utilisateur = Auth::proteger();

    // Logger la déconnexion
    global $conn;
    $stmt = $conn->prepare("
        INSERT INTO logs_activite (id_utilisateur, action, ip) 
        VALUES (:id, 'LOGOUT', :ip)
    ");
    $stmt->execute([
        ':id' => $utilisateur['id'],
        ':ip' => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'
    ]);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Déconnexion réussie'
    ]);
}