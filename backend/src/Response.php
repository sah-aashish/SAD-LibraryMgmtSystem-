<?php
declare(strict_types=1);
namespace Vivlix;

final class Response
{
    public static function json(array $payload, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function success(array $data = [], int $status = 200): never
    {
        self::json(['success' => true, 'data' => $data], $status);
    }

    public static function error(string $message, int $status = 400, array $extra = []): never
    {
        $payload = ['success' => false, 'message' => $message];
        foreach ($extra as $key => $value) {
            if ($value !== null) {
                $payload[$key] = $value;
            }
        }
        self::json($payload, $status);
    }
}
