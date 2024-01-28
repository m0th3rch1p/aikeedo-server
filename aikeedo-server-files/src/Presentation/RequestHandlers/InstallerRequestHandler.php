<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers;

use Application;
use Doctrine\DBAL\DriverManager;
use Doctrine\ORM\EntityManager;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\ORMSetup;
use Doctrine\ORM\Tools\SchemaTool;
use Easy\Container\Attributes\Inject;
use Easy\Http\Message\RequestMethod;
use Easy\Menv\Env;
use Easy\Router\Attributes\Middleware;
use Easy\Router\Attributes\Route;
use Presentation\Commands\ImportPresetsCommand;
use Presentation\Exceptions\UnprocessableEntityException;
use Presentation\Middlewares\ExceptionMiddleware;
use Presentation\Middlewares\InstallMiddleware;
use Presentation\Middlewares\LocaleMiddleware;
use Presentation\Middlewares\RequestBodyParserMiddleware;
use Presentation\Middlewares\ViewMiddleware;
use Presentation\Response\EmptyResponse;
use Presentation\Response\JsonResponse;
use Presentation\Response\ViewResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\BufferedOutput;
use Throwable;
use User\Application\Commands\CreateUserCommand;

#[Middleware(ExceptionMiddleware::class)]
#[Middleware(InstallMiddleware::class)]
#[Middleware(RequestBodyParserMiddleware::class)]
#[Middleware(LocaleMiddleware::class)]
#[Middleware(ViewMiddleware::class)]
#[Route(path: '/install', method: RequestMethod::GET)]
#[Route(path: '/install/api/[requirements|db|install:action]', method: RequestMethod::POST)]
class InstallerRequestHandler implements RequestHandlerInterface
{
    public function __construct(
        private Application $app,
        private Dispatcher $dispatcher,

        #[Inject('config.dirs.root')]
        private string $rootDir,

        #[Inject('config.dirs.src')]
        private string $srcDir,

        #[Inject('config.dirs.cache')]
        private string $proxyDir
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $action = $request->getAttribute('action');

        try {
            if ($action == 'requirements') {
                return $this->handleRequirementsRequest($request);
            }

            if ($action == 'db') {
                return $this->handleDbRequest($request);
            }

            if ($action == 'install') {
                return $this->handleInstallRequest($request);
            }
        } catch (Throwable $th) {
            throw new UnprocessableEntityException($th->getMessage());
        }

        return new ViewResponse('templates/install/index.twig');
    }

    private function handleRequirementsRequest(
        ServerRequestInterface $request
    ): ResponseInterface {
        $config = [];

        // Check PHP version
        $config[] = [
            'name' => 'PHP Version',
            'requirement' => '8.2+',
            'current' => PHP_VERSION,
            'is_satisfied' => version_compare(PHP_VERSION, '8.2') >= 0,
            'is_required' => true
        ];


        // PHP INI: file_uploads
        $config[] = [
            'name' => 'File uploads',
            'requirement' => 'On',
            'current' => ini_get('file_uploads') ? 'On' : 'Off',
            'is_satisfied' => (bool) ini_get('file_uploads'),
            'is_required' => true
        ];

        // PHP INI: post_max_size
        $config[] = [
            'name' => 'Post max size',
            'requirement' => '25M+',
            'current' => ini_get('post_max_size'),
            'is_satisfied' => true,
            'is_required' => false
        ];

        // PHP INI: upload_max_filesize
        $config[] = [
            'name' => 'Upload max filesize',
            'requirement' => '25M+',
            'current' => ini_get('upload_max_filesize'),
            'is_satisfied' => true,
            'is_required' => false
        ];

        $extensions = array();

        // Check extensions
        $installedExts = array_map('strtolower', get_loaded_extensions());
        $check = ['ctype', 'curl', 'dom', 'json', 'libxml', 'mbstring', 'pcre', 'phar', 'simplexml', 'tokenizer', 'xml', 'xmlwriter', 'intl'];

        foreach ($check as $ext) {
            $isInstalled = in_array(strtolower($ext), $installedExts);

            $extensions[] = [
                'name' => $ext,
                'is_satisfied' => $isInstalled,
                'is_required' => true
            ];
        }

        $check = ['amqp', 'mongodb', 'xdebug', 'pcov', 'ext-uuid'];
        foreach ($check as $ext) {
            $isInstalled = in_array(strtolower($ext), $installedExts);

            $extensions[] = [
                'name' => $ext,
                'is_satisfied' => $isInstalled,
                'is_required' => false
            ];
        }

        // Check writeable directories
        $writeAccess = [];
        $checkDirs = [
            '/public/uploads/',
            '/public_html/uploads/',
            '/var/',
            '/',
        ];

        foreach ($checkDirs as $dir) {
            $path = realpath($this->rootDir . $dir);

            if (!$path) {
                continue;
            }

            $writeAccess[] = [
                'name' => $dir,
                'is_satisfied' => is_writable($path),
                'is_dir' => is_dir($path),
                'is_required' => true
            ];
        }


        // Check global isSatisfied value
        $isSatisfied = true;
        foreach ($config as $set) {
            if ($set['is_required'] && !$set['is_satisfied']) {
                $isSatisfied = false;
            }
        }

        foreach ($extensions as $set) {
            if ($set['is_required'] && !$set['is_satisfied']) {
                $isSatisfied = false;
            }
        }

        foreach ($writeAccess as $set) {
            if ($set['is_required'] && !$set['is_satisfied']) {
                $isSatisfied = false;
            }
        }

        return new JsonResponse([
            'is_satisfied' => $isSatisfied,
            'config' => $config,
            'ext' => $extensions,
            'write_access' => $writeAccess
        ]);
    }

    private function handleDbRequest(
        ServerRequestInterface $request
    ): ResponseInterface {
        $payload = $request->getParsedBody();

        $conn = DriverManager::getConnection([
            'dbname' => $payload->name,
            'user' => $payload->user,
            'password' =>  $payload->password,
            'host' => $payload->host,
            'port' => $payload->port,
            'driver' => $payload->driver,
        ]);
        $conn->connect();

        return new EmptyResponse();
    }

    private function handleInstallRequest(
        ServerRequestInterface $request
    ): ResponseInterface {
        $payload = $request->getParsedBody();

        $this->setupEnvironment($payload);
        $this->setupDbSchema($payload);
        $this->createUserAccount($payload);
        $this->importBuiltInPresets();

        // Save license on sucess
        file_put_contents(
            $this->rootDir . '/LICENSE',
            $payload->license
        );

        return new JsonResponse($payload);
    }

    private function setupEnvironment(object $payload)
    {
        // Save env file
        $path = $this->rootDir . '/.env';
        if (!file_exists($path)) {
            // Create a new .env file
            copy($this->rootDir . '/.env.example', $path);
        }

        $menv = new Env($path);
        $menv
            ->set('ENVIRONMENT', 'prod')
            ->set('DEBUG', false)
            ->set('JWT_TOKEN', bin2hex(random_bytes(16)))
            ->set('DB_DRIVER', 'mysql')
            ->set('DB_USER', $payload->db->user)
            ->set('DB_PASSWORD', $payload->db->password)
            ->set('DB_HOST', $payload->db->host)
            ->set('DB_PORT', $payload->db->port)
            ->set('DB_NAME', $payload->db->name)
            ->save();
    }

    private function setupDbSchema(object $payload)
    {
        $config = ORMSetup::createAttributeMetadataConfiguration(
            paths: [$this->srcDir],
            isDevMode: true,
            proxyDir: $this->proxyDir
        );

        $connection = DriverManager::getConnection([
            'dbname' => $payload->db->name,
            'user' => $payload->db->user,
            'password' =>  $payload->db->password,
            'host' => $payload->db->host,
            'port' => $payload->db->port,
            'driver' => $payload->db->driver,
        ], $config);

        $em = new EntityManager($connection, $config);
        $em->getConnection()->getDatabasePlatform()
            ->registerDoctrineTypeMapping('uuid_binary', 'binary');

        $tool = new SchemaTool($em);
        $tool->updateSchema($em->getMetadataFactory()->getAllMetadata(), true);

        $this->app
            ->set(EntityManagerInterface::class, $em);
    }

    private function createUserAccount(object $payload)
    {
        $cmd = new CreateUserCommand(
            $payload->account->email,
            $payload->account->first_name,
            $payload->account->last_name
        );

        $cmd->setPassword($payload->account->password);
        $cmd->setStatus(1);
        $cmd->setRole(1);

        $this->dispatcher->dispatch($cmd);
    }

    private function importBuiltInPresets()
    {
        $input = new ArrayInput([]);
        $output = new BufferedOutput();

        $cmd = new ImportPresetsCommand($this->dispatcher);
        $cmd->run($input, $output);
    }
}
