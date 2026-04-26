<?php
// ============================================================
//  EduSchedule Pro — API Enseignants
//  Auteur : Bechir
//  Endpoints : GET    /api/enseignants
//              POST   /api/enseignants
//              PUT    /api/enseignants/{id}
//              DELETE /api/enseignants/{id}
// ============================================================

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$db     = new Database();
$conn   = $db->getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$id     = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        Auth::proteger(['admin', 'surveillant', 'comptable']);
        listerEnseignants($conn);
        break;
    case 'POST':
        Auth::proteger(['admin']);
        creerEnseignant($conn);
        break;
    case 'PUT':
        Auth::proteger(['admin']);
        modifierEnseignant($conn, $id);
        break;
    case 'DELETE':
        Auth::proteger(['admin']);
        supprimerEnseignant($conn, $id);
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
}

// ============================================================
//  LISTER les enseignants
// ============================================================
function listerEnseignants($conn) {
    $specialite = $_GET['specialite'] ?? null;
    $statut     = $_GET['statut'] ?? null;

    $sql    = "SELECT * FROM enseignants WHERE actif = 1";
    $params = [];

    if ($specialite) {
        $sql .= " AND specialite LIKE :specialite";
        $params[':specialite'] = "%$specialite%";
    }

    if ($statut) {
        $sql .= " AND statut = :statut";
        $params[':statut'] = $statut;
    }

    $sql .= " ORDER BY nom, prenom";

    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $enseignants = $stmt->fetchAll();

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data'    => $enseignants,
        'total'   => count($enseignants)
    ]);
}

// ============================================================
//  CREER un enseignant
// ============================================================
function creerEnseignant($conn) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['nom']) || empty($data['prenom']) || empty($data['email'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Nom, prénom et email sont requis'
        ]);
        return;
    }

    try {
        // Générer matricule automatique
        $stmt = $conn->query("SELECT COUNT(*) as total FROM enseignants");
        $row  = $stmt->fetch();
        $matricule = 'ENS' . str_pad($row['total'] + 1, 3, '0', STR_PAD_LEFT);

        // Créer l'enseignant
        $stmt = $conn->prepare("
            INSERT INTO enseignants 
                (matricule, nom, prenom, email, telephone, specialite, statut, taux_horaire)
            VALUES 
                (:matricule, :nom, :prenom, :email, :telephone, :specialite, :statut, :taux)
        ");
        $stmt->execute([
            ':matricule'  => $matricule,
            ':nom'        => strtoupper(trim($data['nom'])),
            ':prenom'     => ucfirst(trim($data['prenom'])),
            ':email'      => trim($data['email']),
            ':telephone'  => $data['telephone']   ?? null,
            ':specialite' => $data['specialite']  ?? null,
            ':statut'     => $data['statut']       ?? 'vacataire',
            ':taux'       => $data['taux_horaire'] ?? 0
        ]);

        $id_enseignant = $conn->lastInsertId();

        // Créer automatiquement un compte utilisateur
        $hash = password_hash('password123', PASSWORD_BCRYPT);
        $stmt = $conn->prepare("
            INSERT INTO utilisateurs (email, mot_de_passe_hash, role, id_lien)
            VALUES (:email, :hash, 'enseignant', :id_lien)
        ");
        $stmt->execute([
            ':email'   => trim($data['email']),
            ':hash'    => $hash,
            ':id_lien' => $id_enseignant
        ]);

        http_response_code(201);
        echo json_encode([
            'success'   => true,
            'message'   => 'Enseignant créé avec succès',
            'id'        => $id_enseignant,
            'matricule' => $matricule
        ]);

    } catch (PDOException $e) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'message' => 'Cet email existe déjà'
        ]);
    }
}

// ============================================================
//  MODIFIER un enseignant
// ============================================================
function modifierEnseignant($conn, $id) {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID requis']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    $stmt = $conn->prepare("
        UPDATE enseignants 
        SET nom = :nom, prenom = :prenom, email = :email,
            telephone = :telephone, specialite = :specialite,
            statut = :statut, taux_horaire = :taux
        WHERE id = :id
    ");
    $stmt->execute([
        ':nom'        => strtoupper(trim($data['nom'])),
        ':prenom'     => ucfirst(trim($data['prenom'])),
        ':email'      => trim($data['email']),
        ':telephone'  => $data['telephone']   ?? null,
        ':specialite' => $data['specialite']  ?? null,
        ':statut'     => $data['statut']       ?? 'vacataire',
        ':taux'       => $data['taux_horaire'] ?? 0,
        ':id'         => $id
    ]);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Enseignant modifié avec succès'
    ]);
}

// ============================================================
//  SUPPRIMER un enseignant (désactivation)
// ============================================================
function supprimerEnseignant($conn, $id) {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID requis']);
        return;
    }

    // Désactivation au lieu de suppression physique
    $stmt = $conn->prepare("UPDATE enseignants SET actif = 0 WHERE id = :id");
    $stmt->execute([':id' => $id]);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Enseignant désactivé avec succès'
    ]);
}