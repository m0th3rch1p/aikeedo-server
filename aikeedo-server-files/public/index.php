<?php

declare(strict_types=1);

use Easy\Http\ResponseEmitter\EmitterInterface;
use Laminas\Diactoros\ServerRequestFactory;
use Psr\Container\ContainerInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Presentation\ServerRequestHandler;

// Application start timestamp
define('APP_START', microtime(true));

/** @var ContainerInterface $container */
$container = include __DIR__ . '/../bootstrap/app.php';

/** @var ServerRequestHandler $handler */
$handler = $container->get(ServerRequestHandler::class);

/**
 * A server request captured from global PHP variables
 * @var ServerRequestInterface $request
 */
$request = ServerRequestFactory::fromGlobals();

/** @var ResponseInterface $response */
$response = $handler->handle($request);

/** @var EmitterInterface $emitter */
$emitter = $container->get(EmitterInterface::class);

// Emit response
$emitter->emit($response);
