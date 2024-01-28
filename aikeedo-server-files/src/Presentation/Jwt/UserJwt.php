<?php

declare(strict_types=1);

namespace Presentation\Jwt;

use DateTime;
use DateTimeInterface;
use DomainException;
use Firebase\JWT\BeforeValidException;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use InvalidArgumentException;
use Firebase\JWT\SignatureInvalidException;
use Ramsey\Uuid\Uuid;
use UnexpectedValueException;

/** @package Presentation\Api\Auth */
class UserJwt
{
    /**
     * @param string $jwt 
     * @return UserJwt 
     * @throws InvalidArgumentException 
     * @throws DomainException 
     * @throws UnexpectedValueException 
     * @throws SignatureInvalidException 
     * @throws BeforeValidException 
     * @throws ExpiredException 
     */
    public static function createFromJwtString(string $jwt): UserJwt
    {
        $key = new Key(env('JWT_TOKEN'), 'HS256');
        $payload = JWT::decode($jwt, $key);

        $exp = null;
        if (isset($payload->exp)) {
            $exp = new DateTime('@' . $payload->exp);
        }

        return new UserJwt(
            $payload->uuid,
            $payload->is_admin,
            $exp
        );
    }

    /**
     * @param string $uuid 
     * @param bool $isAdmin 
     * @param null|DateTimeInterface $expiresAt 
     * @return void 
     */
    public function __construct(
        private string $uuid,
        private bool $isAdmin = false,
        private ?DateTimeInterface $expiresAt = null
    ) {
    }

    /**
     * @return string 
     * @throws DomainException 
     */
    public function getJwtString(): string
    {
        $payload = [
            'uuid' => $this->uuid,
            'iat' => time(),
            'jti' => Uuid::uuid4()->toString(),
            'is_admin' => $this->isAdmin
        ];

        if ($this->expiresAt) {
            $payload['exp'] = $this->expiresAt->getTimestamp();
        }

        return JWT::encode($payload, env('JWT_TOKEN'), 'HS256');
    }

    /** @return string  */
    public function getUuid(): string
    {
        return $this->uuid;
    }
}
