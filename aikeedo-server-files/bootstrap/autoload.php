<?php

/**
 * Load applicatino classes and libraries, 
 * as well as 3rd party vendor libraries
 */

declare(strict_types=1);

use Easy\Autoloader\Autoloader;

// Load vendors
require_once "vendor/autoload.php";

// Instantiate the loader
$loader = new Autoloader();

// Add namespaces to autoload
$loader->appendNamespace(null, "src"); # Root source

// Register the autoloader
$loader->register();
