<?php
declare(strict_types=1);
namespace Vedas;

final class Validator
{
    public static function required(array $input, array $fields): array
    {
        $errors = [];
        foreach ($fields as $field) {
            if (!array_key_exists($field, $input) || trim((string) $input[$field]) === '') {
                $errors[$field] = sprintf('%s is required.', $field);
            }
        }
        return $errors;
    }

    public static function email(?string $email, string $field = 'email'): array
    {
        if ($email === null || filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return [];
        }
        return [$field => 'A valid email address is required.'];
    }
}
