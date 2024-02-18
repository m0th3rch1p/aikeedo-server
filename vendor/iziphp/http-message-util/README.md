# iziphp/http-message-util

Utility enums to facilitate common operations of PSR-7

## Installation

```bash
composer require iziphp/http-message-util
```

## Usage

```php
use Easy\Http\Message\Method;
use Easy\Http\Message\StatusCode;

// HTTP Request method.
$method = Method::GET; // GET

// HTTP Response status code.
$statusCode = StatusCode::OK; // 200
$phrase = $statusCode->getReasonPhrase(); // OK
```
