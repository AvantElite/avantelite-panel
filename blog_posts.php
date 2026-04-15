<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$host = "localhost";
$dbname = "avantservice";
$user = "root";
$pass = "";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "DB connection failed: " . $e->getMessage()]);
    exit;
}

// Create table if not exists
$pdo->exec("CREATE TABLE IF NOT EXISTS blog_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    resumen TEXT,
    contenido LONGTEXT NOT NULL,
    autor VARCHAR(100),
    categoria VARCHAR(100),
    tags VARCHAR(255),
    imagen_portada VARCHAR(500),
    publicado TINYINT(1) DEFAULT 0,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)");

$method = $_SERVER['REQUEST_METHOD'];
$body = json_decode(file_get_contents("php://input"), true);

switch ($method) {
    case 'GET':
        $stmt = $pdo->query("SELECT * FROM blog_posts ORDER BY fecha_creacion DESC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    case 'POST':
        $stmt = $pdo->prepare("INSERT INTO blog_posts (titulo, slug, resumen, contenido, autor, categoria, tags, imagen_portada, publicado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $body['titulo'], $body['slug'], $body['resumen'] ?? '',
            $body['contenido'], $body['autor'] ?? '', $body['categoria'] ?? '',
            $body['tags'] ?? '', $body['imagen_portada'] ?? '',
            $body['publicado'] ? 1 : 0
        ]);
        echo json_encode(["id" => $pdo->lastInsertId(), "success" => true]);
        break;

    case 'PUT':
        $stmt = $pdo->prepare("UPDATE blog_posts SET titulo=?, slug=?, resumen=?, contenido=?, autor=?, categoria=?, tags=?, imagen_portada=?, publicado=? WHERE id=?");
        $stmt->execute([
            $body['titulo'], $body['slug'], $body['resumen'] ?? '',
            $body['contenido'], $body['autor'] ?? '', $body['categoria'] ?? '',
            $body['tags'] ?? '', $body['imagen_portada'] ?? '',
            $body['publicado'] ? 1 : 0, $body['id']
        ]);
        echo json_encode(["success" => true]);
        break;

    case 'DELETE':
        $stmt = $pdo->prepare("DELETE FROM blog_posts WHERE id=?");
        $stmt->execute([$body['id']]);
        echo json_encode(["success" => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed"]);
}
