<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\App;

use Easy\Container\Attributes\Inject;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Response\RedirectResponse;
use Presentation\Response\ViewResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use User\Domain\Entities\UserEntity;

#[Route(path: '/account/[profile|email|password|verification:name]?', method: RequestMethod::GET)]
class AccountViewRequestHandler extends AppView implements
    RequestHandlerInterface
{
    public function __construct(
        #[Inject('config.locale.locales')]
        private array $locales = [],

        #[Inject('option.site.email_verification_policy')]
        private ?string $policy = null,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $name = $request->getAttribute('name');

        if (!$name) {
            $name = 'profile';
        }

        if ($name === 'verification') {
            /** @var UserEntity $user */
            $user = $request->getAttribute(UserEntity::class);

            if (
                $user->isEmailVerified()->value
                || !in_array($this->policy, ['strict', 'relaxed'])
            ) {
                return new RedirectResponse('/app/account/profile');
            }

            return new ViewResponse(
                '/templates/app/account/verification.twig',
            );
        }

        return new ViewResponse(
            '/templates/app/account/' . $name . '.twig',
            [
                'locales' => $this->locales,
            ]
        );
    }
}
