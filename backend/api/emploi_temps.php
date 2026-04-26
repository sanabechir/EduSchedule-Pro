<?php
// ============================================================
//  EduSchedule Pro — API Emploi du Temps
//  Auteur : Bechir
//  Endpoints : GET    /api/emploi_temps
//              POST   /api/emploi_temps
//              PUT    /api/emploi_temps/{id}/publier
//              DELETE /api/emploi_temps/{id}
// ============================================================

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$db     = new Database();
$conn   = $db->getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$id     = $_GET['id']     ?? null;
$action = $_GET['action'] ?? null;

switch ($method) {
    case 'GET':
        Auth::proteger(['admin', 'enseignant', 'delegue', 'surveillant', 'etudiant']);
        listerEmploiTemps($conn);
        break;
    case 'POST':
        Auth::proteger(['admin']);
        creerEmploiTemps($conn);
        break;
    case 'PUT':
        Auth::proteger(['admin']);
        if ($action === 'publier') publierEmploiTemps($conn, $id);
        else modifierEmploiTemps($conn, $id);
        break;
    case 'DELETE':
        Auth::proteger(['admin']);
        supprimerEmploiTemps($conn, $id);
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
}

// ============================================================
//  LISTER les emplois du temps
// ============================================================
function listerEmploiTemps($conn) {
    $id_classe = $_GET['id_classe'] ?? null;
    $semaine   = $_GET['semaine']   ?? null;

    $sql = "
        SELECT 
            et.*,
            c.code        AS classe_code,
            c.libelle     AS classe_libelle,
            c.niveau      AS classe_niveau,
            u.email       AS cree_par_email
        FROM emploi_temps et
        JOIN classes      c ON et.id_classe = c.id
        JOIN utilisateurs u ON et.cree_par  = u.id
        WHERE 1=1
    ";
    $params = [];

    if ($id_classe) {
        $sql .= " AND et.id_classe = :id_classe";
        $params[':id_classe'] = $id_classe;
    }

    if ($semaine) {
        $sql .= " AND et.semaine_debut = :semaine";
        $params[':semaine'] = $semaine;
    }

    $sql .= " ORDER BY et.semaine_debut DESC, c.code";

    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $emplois = $stmt->fetchAll();

    // Récupérer les créneaux pour chaque emploi du temps
    foreach ($emplois as &$emploi) {
        $stmt2 = $conn->prepare("
            SELECT 
                cr.*,
                m.libelle  AS matiere_libelle,
                m.code     AS matiere_code,
                e.nom      AS enseignant_nom,
                e.prenom   AS enseignant_prenom,
                s.libelle  AS salle_libelle,
                s.code     AS salle_code
            FROM creneaux     cr
            JOIN matieres     m  ON cr.id_matiere    = m.id
            JOIN enseignants  e  ON cr.id_enseignant = e.id
            JOIN salles       s  ON cr.id_salle      = s.id
            WHERE cr.id_emploi_temps = :id
            ORDER BY FIELD(cr.jour,'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'),
                     cr.heure_debut
        ");
        $stmt2->execute([':id' => $emploi['id']]);
        $emploi['creneaux'] = $stmt2->fetchAll();
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data'    => $emplois,
        'total'   => count($emplois)
    ]);
}

// ============================================================
//  CREER un emploi du temps avec ses créneaux
// ============================================================
function creerEmploiTemps($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $user = Auth::proteger(['admin']);

    if (empty($data['id_classe']) || empty($data['semaine_debut'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Classe et semaine de début requis'
        ]);
        return;
    }

    try {
        $conn->beginTransaction();

        // Créer l'en-tête
        $stmt = $conn->prepare("
            INSERT INTO emploi_temps (id_classe, semaine_debut, cree_par)
            VALUES (:id_classe, :semaine, :cree_par)
        ");
        $stmt->execute([
            ':id_classe' => $data['id_classe'],
            ':semaine'   => $data['semaine_debut'],
            ':cree_par'  => $user['id']
        ]);
        $id_emploi = $conn->lastInsertId();

        // Insérer les créneaux si fournis
        if (!empty($data['creneaux'])) {
            foreach ($data['creneaux'] as $creneau) {
                // Vérifier conflit enseignant
                $conflit = verifierConflit($conn, $creneau, $id_emploi);
                if ($conflit) {
                    $conn->rollBack();
                    http_response_code(409);
                    echo json_encode([
                        'success' => false,
                        'message' => $conflit
                    ]);
                    return;
                }

                $stmt = $conn->prepare("
                    INSERT INTO creneaux 
                        (id_emploi_temps, id_matiere, id_enseignant, id_salle, 
                         jour, heure_debut, heure_fin)
                    VALUES 
                        (:id_emploi, :id_matiere, :id_enseignant, :id_salle,
                         :jour, :heure_debut, :heure_fin)
                ");
                $stmt->execute([
                    ':id_emploi'    => $id_emploi,
                    ':id_matiere'   => $creneau['id_matiere'],
                    ':id_enseignant'=> $creneau['id_enseignant'],
                    ':id_salle'     => $creneau['id_salle'],
                    ':jour'         => $creneau['jour'],
                    ':heure_debut'  => $creneau['heure_debut'],
                    ':heure_fin'    => $creneau['heure_fin']
                ]);
            }
        }

        $conn->commit();

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Emploi du temps créé avec succès',
            'id'      => $id_emploi
        ]);

    } catch (PDOException $e) {
        $conn->rollBack();
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'message' => 'Cet emploi du temps existe déjà pour cette classe et cette semaine'
        ]);
    }
}

// ============================================================
//  PUBLIER / DEPUBLIER un emploi du temps
// ============================================================
function publierEmploiTemps($conn, $id) {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID requis']);
        return;
    }

    // Récupérer statut actuel
    $stmt = $conn->prepare("SELECT statut_publication FROM emploi_temps WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $emploi = $stmt->fetch();

    if (!$emploi) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Emploi du temps non trouvé']);
        return;
    }

    $nouveau_statut = $emploi['statut_publication'] === 'publié' ? 'brouillon' : 'publié';

    $stmt = $conn->prepare("
        UPDATE emploi_temps SET statut_publication = :statut WHERE id = :id
    ");
    $stmt->execute([':statut' => $nouveau_statut, ':id' => $id]);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => "Emploi du temps $nouveau_statut avec succès",
        'statut'  => $nouveau_statut
    ]);
}

// ============================================================
//  MODIFIER un emploi du temps
// ============================================================
function modifierEmploiTemps($conn, $id) {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID requis']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $conn->prepare("
        UPDATE emploi_temps 
        SET semaine_debut = :semaine 
        WHERE id = :id
    ");
    $stmt->execute([':semaine' => $data['semaine_debut'], ':id' => $id]);

    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Emploi du temps modifié avec succès']);
}

// ============================================================
//  SUPPRIMER un emploi du temps
// ============================================================
function supprimerEmploiTemps($conn, $id) {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID requis']);
        return;
    }

    $stmt = $conn->prepare("DELETE FROM emploi_temps WHERE id = :id");
    $stmt->execute([':id' => $id]);

    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Emploi du temps supprimé avec succès']);
}

// ============================================================
//  VERIFIER les conflits d'horaire
// ============================================================
function verifierConflit($conn, $creneau, $id_emploi) {
    // Conflit enseignant
    $stmt = $conn->prepare("
        SELECT COUNT(*) as total FROM creneaux cr
        JOIN emploi_temps et ON cr.id_emploi_temps = et.id
        WHERE cr.id_enseignant = :id_enseignant
        AND cr.jour = :jour
        AND cr.id_emploi_temps != :id_emploi
        AND et.semaine_debut = (SELECT semaine_debut FROM emploi_temps WHERE id = :id_emploi2)
        AND (
            (cr.heure_debut < :heure_fin AND cr.heure_fin > :heure_debut)
        )
    ");
    $stmt->execute([
        ':id_enseignant' => $creneau['id_enseignant'],
        ':jour'          => $creneau['jour'],
        ':id_emploi'     => $id_emploi,
        ':id_emploi2'    => $id_emploi,
        ':heure_debut'   => $creneau['heure_debut'],
        ':heure_fin'     => $creneau['heure_fin']
    ]);
    $row = $stmt->fetch();
    if ($row['total'] > 0) {
        return "Conflit : cet enseignant a déjà un cours à ce créneau";
    }

    // Conflit salle
    $stmt = $conn->prepare("
        SELECT COUNT(*) as total FROM creneaux cr
        JOIN emploi_temps et ON cr.id_emploi_temps = et.id
        WHERE cr.id_salle = :id_salle
        AND cr.jour = :jour
        AND cr.id_emploi_temps != :id_emploi
        AND et.semaine_debut = (SELECT semaine_debut FROM emploi_temps WHERE id = :id_emploi2)
        AND (
            (cr.heure_debut < :heure_fin AND cr.heure_fin > :heure_debut)
        )
    ");
    $stmt->execute([
        ':id_salle'    => $creneau['id_salle'],
        ':jour'        => $creneau['jour'],
        ':id_emploi'   => $id_emploi,
        ':id_emploi2'  => $id_emploi,
        ':heure_debut' => $creneau['heure_debut'],
        ':heure_fin'   => $creneau['heure_fin']
    ]);
    $row = $stmt->fetch();
    if ($row['total'] > 0) {
        return "Conflit : cette salle est déjà occupée à ce créneau";
    }

    return null;
}