<?php
header("Content-Type: application/json");

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../middleware/auth.php';

try {
    checkAuth();

    $db = (new Database())->getConnection();

    $sql = "
        SELECT 
            c.id,
            cl.nom AS classe,
            m.nom AS matiere,
            CONCAT(e.nom, ' ', e.prenom) AS enseignant,
            s.nom AS salle,
            c.jour,
            h.label AS horaire,
            c.type,
            c.groupe
        FROM creneaux c
        JOIN classes cl ON c.classe_id = cl.id
        JOIN matieres m ON c.matiere_id = m.id
        JOIN enseignants e ON c.enseignant_id = e.id
        JOIN salles s ON c.salle_id = s.id
        JOIN horaires h ON c.horaire_id = h.id
        ORDER BY 
            FIELD(c.jour, 'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'),
            h.id ASC
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute();
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Groupement par jour
    $jours = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
    $emploi = array_fill_keys($jours, []);

    foreach ($data as $row) {
        $emploi[$row['jour']][] = $row;
    }

    jsonResponse($emploi);

} catch (Exception $e) {
    errorResponse($e->getMessage(), 500);
}