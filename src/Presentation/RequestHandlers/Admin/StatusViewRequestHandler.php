<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin;

use Easy\Container\Attributes\Inject;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Response\ViewResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;

#[Route(path: '/status', method: RequestMethod::GET)]
class StatusViewRequestHandler extends AbstractAdminViewRequestHandler implements
    RequestHandlerInterface
{
    public function __construct(
        private Dispatcher $dispatcher,

        #[Inject('config.enable_debugging')]
        private bool $isDebug,

        #[Inject('config.enable_caching')]
        private bool $isCache,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $data = [
            'debug' => $this->isDebug,
            'cache' => $this->isCache,
            'environment' => env('ENVIRONMENT'),
            'database' => true,
            'memory_limit' => ini_get('memory_limit'),
            'file_uploads' => ini_get('file_uploads') === false ? false : in_array(strtolower(ini_get('file_uploads')), ['on', 'true', '1', 'yes']),
            'post_max_size' => ini_get('post_max_size'),
            'upload_max_filesize' => ini_get('upload_max_filesize'),
            'disk_free_space' => @disk_free_space('/') === false ? null : $this->getHumanReadableSize((int)disk_free_space('/')),
            'disk_total_space' => @disk_total_space('/') === false ? null : $this->getHumanReadableSize((int)disk_total_space('/')),
        ];

        return new ViewResponse(
            '/templates/admin/status.twig',
            $data
        );
    }

    private function getHumanReadableSize(int $size): string
    {
        $units = array('B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB');
        $step = 1024;
        $i = 0;
        while (($size / $step) > 0.9) {
            $size = $size / $step;
            $i++;
        }
        return round($size, 2) . $units[$i];
    }
}
