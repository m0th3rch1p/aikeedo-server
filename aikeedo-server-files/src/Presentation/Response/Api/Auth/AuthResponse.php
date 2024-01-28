<?php

declare(strict_types=1);

namespace Presentation\Response\Api\Auth;

use Presentation\Jwt\UserJwt;
use Presentation\Cookies\UserCookie;
use Presentation\Response\JsonResponse;
use User\Domain\Entities\UserEntity;
use User\Domain\ValueObjects\Role;

class AuthResponse extends JsonResponse
{
    public function __construct(UserEntity $user)
    {
        $jwt = new UserJwt((string) $user->getId()->getValue(), $user->getRole() === Role::ADMIN);
        $tokenString = $jwt->getJwtString();
        $cookie = new UserCookie($tokenString);

        $data = ['jwt' =>  $tokenString];
        $headers = ['Set-Cookie' => $cookie->toHeaderValue()];

        parent::__construct(
            $data,
            headers: $headers
        );
    }
}
