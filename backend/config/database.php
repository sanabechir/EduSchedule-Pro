<?php
// ======================================================
//  Connexion Base de Données (PDO)
// ======================================================

class Database {

    private $host = "127.0.0.1";
    private $port = "3308";
    private $db_name = "eduschedulepro";
    private $username = "root";
    private $password = "";

    private $conn = null;

    public function getConnection() {

        if ($this->conn !== null) {
            return $this->conn;
        }

        try {

            $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->db_name};charset=utf8mb4";

            $this->conn = new PDO($dsn, $this->username, $this->password);

            // 🔥 Mode erreur
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            // 🔥 Fetch assoc
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        } catch (PDOException $e) {

            http_response_code(500);

            echo json_encode([
                "success" => false,
                "message" => "Erreur connexion base de données"
            ]);

            exit();
        }

        return $this->conn;
    }
}