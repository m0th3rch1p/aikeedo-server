<?php

declare(strict_types=1);

namespace Presentation\Cookies;

use DateTime;
use InvalidArgumentException;
use Psr\Http\Message\ServerRequestInterface;

/** @package Presentation\Cookies */
class UserCookie extends Cookie
{
    private const NAME = 'user';

    /**
     * @param string $value 
     * @return void 
     * @throws InvalidArgumentException 
     */
    public function __construct(string $value)
    {
        parent::__construct(
            self::NAME,
            $value,
            new DateTime('@' . (time() + 86400 * 30)),
            '/',
            secure: env('ENVIRONMENT') == 'demo',
            sameSite: env('ENVIRONMENT') == 'demo' ?  'none' : null
        );
    }

    /**
     * Create an instance of this object with the
     * cookies values from the request
     * 
     * @param ServerRequestInterface $req 
     * @return null|UserCookie 
     */
    public static function createFromRequest(
        ServerRequestInterface $req
    ): ?UserCookie {
        $cookies = $req->getCookieParams();

        if (isset($cookies[self::NAME])) {
            return new UserCookie($cookies[self::NAME]);
        }

        return null;
    }
}
