<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

include("../config/database.php");

$sql = "
SELECT 
c.id,

cl.nom AS classe,

m.nom AS matiere,

CONCAT(e.nom, ' ', e.prenom) AS enseignant,

s.nom AS salle,

c.jour,

h.label AS horaire,
h.heure_debut,
h.heure_fin,

c.type,
c.groupe

FROM creneaux c

JOIN classes cl ON c.classe_id = cl.id
JOIN matieres m ON c.matiere_id = m.id
JOIN enseignants e ON c.enseignant_id = e.id
JOIN salles s ON c.salle_id = s.id
JOIN horaires h ON c.horaire_id = h.id

ORDER BY c.jour, h.heure_debut
";

$result = $conn->query($sql);

$data = [];

while ($row = $result->fetch_assoc()) {
    $data[] = $row;
}

echo json_encode([
    "success" => true,
    "data" => $data
]);