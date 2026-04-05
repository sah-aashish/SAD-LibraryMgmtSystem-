<?php
declare(strict_types=1);
namespace Vedas;

final class Config
{
    private static array $values = [];

    public static function load(string $basePath): void
    {
        self::$values = [
            'DB_HOST' => '127.0.0.1',
            'DB_PORT' => '3306',
            'DB_NAME' => 'vedas_library',
            'DB_USER' => 'root',
            'DB_PASS' => '',
            'APP_ENV' => 'development',
            'TOKEN_TTL_HOURS' => '24',
            'FINE_PER_DAY' => '1.00',
        ];

        $envPath = $basePath . DIRECTORY_SEPARATOR . '.env';
        if (!is_file($envPath)) {
            return;
        }

        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            return;
        }

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
                continue;
            }

            [$key, $value] = explode('=', $line, 2);
            self::$values[trim($key)] = trim($value);
        }
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        return self::$values[$key] ?? $default;
    }
}
