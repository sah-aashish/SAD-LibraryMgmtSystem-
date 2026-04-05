<?php
declare(strict_types=1);

require_once __DIR__ . '/Config.php';
require_once __DIR__ . '/Response.php';
require_once __DIR__ . '/Request.php';
require_once __DIR__ . '/Validator.php';
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Auth.php';

\Vedas\Config::load(dirname(__DIR__));
