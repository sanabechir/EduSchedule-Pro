<?php
// ============================================================
//  EduSchedule Pro — API Cahiers de Texte
//  Auteur : Bechir
//  Endpoints : GET  /api/cahiers
//              GET  /api/cahiers?id=X
//              POST /api/cahiers
//              PUT  /api/cahiers?id=X
//              POST /api/cahiers?id=X&action=signer
//              POST /api/cahiers?id=X&action=cloture
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
        Auth::proteger(['admin', 'enseignant', 'delegue', 'surveillant']);
        if ($id) detailCahier($conn, $id);
        else listerCahiers($conn);
        break;

    case 'POST':
        if ($id && $action === 'signer') {
            Auth::proteger(['enseignant', 'delegue']);
            signerCahier($conn, $id);
        } elseif ($id && $action === 'cloture') {
            Auth::proteger(['enseignant']);
            cloturerCahier($conn, $id);
        } else {
            Auth::proteger(['delegue', 'admin']);
            creerCahier($conn);
        }
        break;

    case 'PUT':
        Auth::proteger(['delegue', 'admin']);
        modifierCahier($conn, $id);
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
}

// ============================================================
//  LISTER les cahiers de texte
// ============================================================
function listerCahiers($conn) {
    $id_creneau = $_GET['id_creneau'] ?? null;
    $id_classe  = $_GET['id_classe']  ?? null;
    $mois       = $_GET['mois']       ?? null;
    $statut     = $_GET['statut']     ?? null;

    $sql = "
        SELECT 
            ct.*,
            cr.jour, cr.heure_debut, cr.heure_fin,
            m.libelle   AS matiere,
            e.nom       AS enseignant_nom,
            e.prenom    AS enseignant_prenom,
            cl.libelle  AS classe,
            u.email     AS delegue_email
        FROM cahiers_texte ct
        JOIN creneaux     cr ON ct.id_creneau      = cr.id
        JOIN matieres     m  ON cr.id_matiere       = m.id
        JOIN enseignants  e  ON cr.id_enseignant    = e.id
        JOIN emploi_temps et ON cr.id_emploi_temps  = et.id
        JOIN classes      cl ON et.id_classe        = cl.id
        LEFT JOIN utilisateurs u ON ct.id_delegue   = u.id
        WHERE 1=1
    ";
    $params = [];

    if ($id_creneau) {
        $sql .= " AND ct.id_creneau = :id_creneau";
        $params[':id_creneau'] = $id_creneau;
    }
    if ($id_classe) {
        $sql .= " AND et.id_classe = :id_classe";
        $params[':id_classe'] = $id_classe;
    }
    if ($mois) {
        $sql .= " AND MONTH(ct.date_creation) = :mois";
        $params[':mois'] = $mois;
    }
    if ($statut) {
        $sql .= " AND ct.statut = :statut";
        $params[':statut'] = $statut;
    }

    $sql .= " ORDER BY ct.date_creation DESC";

    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $cahiers = $stmt->fetchAll();

    foreach ($cahiers as &$cahier) {
        $stmt2 = $conn->prepare("SELECT * FROM travaux_demandes WHERE id_cahier = :id");
        $stmt2->execute([':id' => $cahier['id']]);
        $cahier['travaux'] = $stmt2->fetchAll();
    }

    echo json_encode([
        'success' => true,
        'data'    => $cahiers,
        'total'   => count($cahiers)
    ]);
}

// ============================================================
//  DÉTAIL d'un cahier de texte
// ============================================================
function detailCahier($conn, $id) {
    $stmt = $conn->prepare("
        SELECT 
            ct.*,
            cr.jour, cr.heure_debut, cr.heure_fin,
            m.libelle    AS matiere,
            m.code       AS matiere_code,
            e.nom        AS enseignant_nom,
            e.prenom     AS enseignant_prenom,
            cl.libelle   AS classe,
            cl.niveau    AS classe_niveau,
            u.email      AS delegue_email,
            p.heure_pointage_reelle
        FROM cahiers_texte ct
        JOIN creneaux     cr ON ct.id_creneau      = cr.id
        JOIN matieres     m  ON cr.id_matiere       = m.id
        JOIN enseignants  e  ON cr.id_enseignant    = e.id
        JOIN emploi_temps et ON cr.id_emploi_temps  = et.id
        JOIN classes      cl ON et.id_classe        = cl.id
        LEFT JOIN utilisateurs u ON ct.id_delegue   = u.id
        LEFT JOIN pointages    p ON p.id_creneau    = cr.id AND p.statut != 'invalide'
        WHERE ct.id = :id
    ");
    $stmt->execute([':id' => $id]);
    $cahier = $stmt->fetch();

    if (!$cahier) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Cahier de texte introuvable']);
        return;
    }

    // Récupérer les signatures
    $stmt2 = $conn->prepare("
        SELECT s.*, u.email 
        FROM signatures s
        JOIN utilisateurs u ON s.id_utilisateur = u.id
        WHERE s.id_cahier = :id
        ORDER BY s.horodatage ASC
    ");
    $stmt2->execute([':id' => $id]);
    $cahier['signatures'] = $stmt2->fetchAll();

    // Récupérer les travaux
    $stmt3 = $conn->prepare("SELECT * FROM travaux_demandes WHERE id_cahier = :id");
    $stmt3->execute([':id' => $id]);
    $cahier['travaux'] = $stmt3->fetchAll();

    // Décoder le contenu JSON
    if (!empty($cahier['contenu_json'])) {
        $cahier['contenu'] = json_decode($cahier['contenu_json'], true);
    }

    echo json_encode(['success' => true, 'data' => $cahier]);
}

// ============================================================
//  CRÉER un cahier de texte
// ============================================================
function creerCahier($conn) {
    $user = Auth::proteger(['delegue', 'admin']);
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['id_creneau']) || empty($data['titre_cours'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'id_creneau et titre_cours sont requis'
        ]);
        return;
    }

    // Vérifier qu'il n'existe pas déjà un cahier pour ce créneau
    $stmt = $conn->prepare("SELECT id FROM cahiers_texte WHERE id_creneau = :id_creneau");
    $stmt->execute([':id_creneau' => $data['id_creneau']]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'message' => 'Un cahier de texte existe déjà pour ce créneau'
        ]);
        return;
    }

    // Vérifier que le créneau a bien été pointé
    $stmt = $conn->prepare("
        SELECT id FROM pointages 
        WHERE id_creneau = :id AND statut != 'invalide'
    ");
    $stmt->execute([':id' => $data['id_creneau']]);
    if (!$stmt->fetch()) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Impossible de créer un cahier sans pointage QR préalable'
        ]);
        return;
    }

    $contenu = [
        'points_vus'        => $data['points_vus']        ?? [],
        'niveau_avancement' => $data['niveau_avancement'] ?? '',
        'observations'      => $data['observations']      ?? ''
    ];

    $conn->beginTransaction();
    try {
        $stmt = $conn->prepare("
            INSERT INTO cahiers_texte 
                (id_creneau, id_delegue, titre_cours, contenu_json, statut, date_creation)
            VALUES 
                (:id_creneau, :id_delegue, :titre, :contenu, 'brouillon', NOW())
        ");
        $stmt->execute([
            ':id_creneau' => $data['id_creneau'],
            ':id_delegue' => $user['id'],
            ':titre'      => $data['titre_cours'],
            ':contenu'    => json_encode($contenu)
        ]);
        $id_cahier = $conn->lastInsertId();

        if (!empty($data['travaux']) && is_array($data['travaux'])) {
            $stmt2 = $conn->prepare("
                INSERT INTO travaux_demandes (id_cahier, description, date_limite, type)
                VALUES (:id_cahier, :description, :date_limite, :type)
            ");
            foreach ($data['travaux'] as $travail) {
                $stmt2->execute([
                    ':id_cahier'   => $id_cahier,
                    ':description' => $travail['description'] ?? '',
                    ':date_limite' => $travail['date_limite'] ?? null,
                    ':type'        => $travail['type']        ?? 'devoir'
                ]);
            }
        }

        $stmt3 = $conn->prepare("
            INSERT INTO logs_activite (id_utilisateur, action, details_json, ip)
            VALUES (:id, 'CAHIER_CREE', :details, :ip)
        ");
        $stmt3->execute([
            ':id'      => $user['id'],
            ':details' => json_encode(['id_cahier' => $id_cahier, 'id_creneau' => $data['id_creneau']]),
            ':ip'      => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'
        ]);

        $conn->commit();

        http_response_code(201);
        echo json_encode([
            'success'   => true,
            'message'   => 'Cahier de texte créé avec succès',
            'id_cahier' => $id_cahier
        ]);

    } catch (Exception $e) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur : ' . $e->getMessage()]);
    }
}

// ============================================================
//  MODIFIER un cahier (statut brouillon uniquement)
// ============================================================
function modifierCahier($conn, $id) {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID requis']);
        return;
    }

    $stmt = $conn->prepare("SELECT statut FROM cahiers_texte WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $cahier = $stmt->fetch();

    if (!$cahier) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Cahier introuvable']);
        return;
    }

    if ($cahier['statut'] !== 'brouillon') {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Impossible de modifier un cahier déjà signé ou clôturé'
        ]);
        return;
    }

    $data    = json_decode(file_get_contents('php://input'), true);
    $contenu = [
        'points_vus'        => $data['points_vus']        ?? [],
        'niveau_avancement' => $data['niveau_avancement'] ?? '',
        'observations'      => $data['observations']      ?? ''
    ];

    $conn->beginTransaction();
    try {
        $conn->prepare("
            UPDATE cahiers_texte 
            SET titre_cours = :titre, contenu_json = :contenu
            WHERE id = :id
        ")->execute([
            ':titre'   => $data['titre_cours'],
            ':contenu' => json_encode($contenu),
            ':id'      => $id
        ]);

        $conn->prepare("DELETE FROM travaux_demandes WHERE id_cahier = :id")
             ->execute([':id' => $id]);

        if (!empty($data['travaux'])) {
            $stmt2 = $conn->prepare("
                INSERT INTO travaux_demandes (id_cahier, description, date_limite, type)
                VALUES (:id_cahier, :description, :date_limite, :type)
            ");
            foreach ($data['travaux'] as $travail) {
                $stmt2->execute([
                    ':id_cahier'   => $id,
                    ':description' => $travail['description'] ?? '',
                    ':date_limite' => $travail['date_limite'] ?? null,
                    ':type'        => $travail['type']        ?? 'devoir'
                ]);
            }
        }

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Cahier mis à jour']);

    } catch (Exception $e) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur : ' . $e->getMessage()]);
    }
}

// ============================================================
//  SIGNER un cahier (délégué ou enseignant)
// ============================================================
function signerCahier($conn, $id) {
    $user = Auth::proteger(['enseignant', 'delegue']);
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['signature_base64']) || empty($data['type'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'signature_base64 et type (delegue|enseignant) requis'
        ]);
        return;
    }

    $stmt = $conn->prepare("SELECT * FROM cahiers_texte WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $cahier = $stmt->fetch();

    if (!$cahier) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Cahier introuvable']);
        return;
    }

    if ($cahier['statut'] === 'cloture') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Cahier déjà clôturé']);
        return;
    }

    $stmt = $conn->prepare("
        SELECT id FROM signatures 
        WHERE id_cahier = :id AND type_signataire = :type
    ");
    $stmt->execute([':id' => $id, ':type' => $data['type']]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'message' => 'Ce signataire a déjà signé ce cahier'
        ]);
        return;
    }

    $conn->beginTransaction();
    try {
        $conn->prepare("
            INSERT INTO signatures 
                (id_cahier, type_signataire, id_utilisateur, signature_base64, horodatage)
            VALUES 
                (:id_cahier, :type, :id_user, :signature, NOW())
        ")->execute([
            ':id_cahier'  => $id,
            ':type'       => $data['type'],
            ':id_user'    => $user['id'],
            ':signature'  => $data['signature_base64']
        ]);

        // Compter les signatures pour déterminer le statut
        $stmt2 = $conn->prepare("SELECT COUNT(*) as total FROM signatures WHERE id_cahier = :id");
        $stmt2->execute([':id' => $id]);
        $count = $stmt2->fetch()['total'];

        if ($count >= 2) {
            $nouveau_statut = 'cloture';
        } else {
            $nouveau_statut = ($data['type'] === 'delegue') ? 'signe_delegue' : 'signe_enseignant';
        }

        $conn->prepare("UPDATE cahiers_texte SET statut = :statut WHERE id = :id")
             ->execute([':statut' => $nouveau_statut, ':id' => $id]);

        $conn->commit();

        echo json_encode([
            'success' => true,
            'message' => '✅ Signature enregistrée',
            'statut'  => $nouveau_statut
        ]);

    } catch (Exception $e) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur : ' . $e->getMessage()]);
    }
}

// ============================================================
//  CLÔTURER une séance (enseignant saisit l'heure de fin)
// ============================================================
function cloturerCahier($conn, $id) {
    $user = Auth::proteger(['enseignant']);
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['heure_fin'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'heure_fin requis']);
        return;
    }

    $stmt = $conn->prepare("SELECT statut FROM cahiers_texte WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $cahier = $stmt->fetch();

    if (!$cahier) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Cahier introuvable']);
        return;
    }

    $conn->beginTransaction();
    try {
        $conn->prepare("
            UPDATE cahiers_texte 
            SET heure_fin_reelle = :heure_fin, statut = 'cloture'
            WHERE id = :id
        ")->execute([':heure_fin' => $data['heure_fin'], ':id' => $id]);

        if (!empty($data['signature_base64'])) {
            $conn->prepare("
                INSERT INTO signatures 
                    (id_cahier, type_signataire, id_utilisateur, signature_base64, horodatage)
                VALUES (:id, 'enseignant', :id_user, :sig, NOW())
            ")->execute([
                ':id'      => $id,
                ':id_user' => $user['id'],
                ':sig'     => $data['signature_base64']
            ]);
        }

        $conn->commit();

        echo json_encode([
            'success' => true,
            'message' => '✅ Séance clôturée avec succès'
        ]);

    } catch (Exception $e) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur : ' . $e->getMessage()]);
    }
}