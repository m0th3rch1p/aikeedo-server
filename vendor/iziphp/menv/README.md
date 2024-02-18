# IziPHP Menv

A PHP library to modify values and comments in .env files.

## Installation

```bash
$ composer require iziphp/menv
```

## Basic Usage

```php
<?php

use Easy\Menv\Env;

$path = '/path/to/.env';
$env = new Env($path);

// Modify the value of the ENVIRONMENT env var.
$env->set('ENVIRONMENT', 'prod');

// Value might be string, numeric or boolean. String 'false' (case insensitive)
// will be converted to 0, string 'true' (case insensitive) will be converted to
// the 1. Boolean values will ve converted 1 or 0. Strings will be wrapped with
// double quotes when necessary.

// Followings are all same
$env->set('DEBUG', true);
$env->set('DEBUG', 'true');
$env->set('DEBUG', '1');
$env->set('DEBUG', 1);

// You can path the 3rd optional parameter to change the entry comment.
// # symbol will be added automatically to the beginning of the comment.
$env->set('DB_HOST', 'localhost', 'The hostname on which the database server resides.');

// You can also modify the entry lines by index. Indices are the line number
// and start with 0. For example to change the endty at line number 3 use:
$env->setByIndex(2, $value, $optionalComment);

// If you want to change only comment, use following methods:
$env->setComment('KEY', $comment);
$env->setCommentByIndex($index, $comment);

// Call save method to save the changes back to the .env file
$env->save();
```
