# iziphp/autoloader

PSR-4 compatible Autoloader. This is the updated version of the example
autoloader from the [PSR-4 specification](https://www.php-fig.org/psr/psr-4/).

## Installation

```bash
composer require iziphp/autoloader
```

## Usage

```php

// Instantiate the loader
$loader = new \Easy\Autoloader\Autoloader();

// Add namespaces to autoload
$loader->appendNamespace("Components", "components"); # Root source
$loader->prependNamespace(null, "src"); # Root source

// Register the autoloader
$loader->register();

```
