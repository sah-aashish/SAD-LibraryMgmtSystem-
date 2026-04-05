<?php
declare(strict_types=1);
namespace Vedas;

use PDO;

final class Auth
{
    public static function user(?array $roles = null): array
    {
        $token = Request::bearerToken();
        if (!$token) {
            Response::error('Authentication token is required.', 401);
        }

        $pdo = Database::connection();
        $statement = $pdo->prepare(
            'SELECT users.id, users.full_name, users.email, users.role
             FROM access_tokens
             INNER JOIN users ON users.id = access_tokens.user_id
             WHERE token_hash = :token_hash AND expires_at > NOW()
             LIMIT 1'
        );
        $statement->execute(['token_hash' => hash('sha256', $token)]);
        $user = $statement->fetch();

        if (!$user) {
            Response::error('Invalid or expired token.', 401);
        }

        if ($roles !== null && !in_array($user['role'], $roles, true)) {
            Response::error('You do not have permission to access this resource.', 403);
        }

        return $user;
    }

    public static function issueToken(PDO $pdo, int $userId): string
    {
        $token = bin2hex(random_bytes(32));
        $statement = $pdo->prepare(
            'INSERT INTO access_tokens (user_id, token_hash, expires_at)
             VALUES (:user_id, :token_hash, DATE_ADD(NOW(), INTERVAL :ttl HOUR))'
        );
        $statement->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $statement->bindValue(':token_hash', hash('sha256', $token));
        $statement->bindValue(':ttl', (int) Config::get('TOKEN_TTL_HOURS', '24'), PDO::PARAM_INT);
        $statement->execute();

        return $token;
    }
}
