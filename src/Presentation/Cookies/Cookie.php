<?php

declare(strict_types=1);

namespace Presentation\Cookies;

use DateTime;
use DateTimeInterface;
use DateTimeZone;
use InvalidArgumentException;

/** @package Presentation\Cookies */
class Cookie
{
    private string $name;
    private string $value;
    private ?DateTimeInterface $expiresAt;
    private string $path;
    private string $domain;
    private bool $secure;
    private bool $httpOnly;
    private ?string $sameSite;

    /**
     * Constructor
     *
     * @param string $name The name of the cookie
     * @param string $value The value of the cookie
     * @param DateTimeInterface|string|null $expiresAt The time the cookie
     * expires. String value must be valid format for the DateTime class
     * constructor.
     * @param string $path The path on the server in which the cookie will be
     * available on
     * @param string $domain The domain that the cookie is available to
     * @param bool $secure Whether the cookie should only be transmitted over a
     * secure HTTPS connection from the client
     * @param bool $httpOnly Whether the cookie will be made accessible only
     * through the HTTP protocol
     * @param string|null $sameSite Specifies if the cookie should be send on a
     * cross site request
     * @return void
     * @throws InvalidArgumentException When the cookie name is not valid
     */
    public function __construct(
        string $name,
        string $value,
        DateTimeInterface|string|null $expiresAt = null,
        string $path = '',
        string $domain = '',
        bool $secure = false,
        bool $httpOnly = false,
        ?string $sameSite = null
    ) {
        $this->assertName($name);

        if ($sameSite) {
            $this->assertSameSite($sameSite, $secure);
        }

        $this->name = $name;
        $this->value = $value;
        $this->expiresAt = $this->sanitizeExpireDate($expiresAt);
        $this->path = $path;
        $this->domain = $domain;
        $this->secure = $secure;
        $this->httpOnly = $httpOnly;
        $this->sameSite = $sameSite;
    }

    /**
     * Get the name of the cookie
     *
     * @return string
     */
    public function getName(): string
    {
        return $this->name;
    }

    /**
     * Get the value of the cookie
     *
     * @return string
     */
    public function getValue(): string
    {
        return $this->value;
    }

    /**
     * Get the value of the expiresAt value
     *
     * @return null|DateTimeInterface
     */
    public function getExpiresAt(): ?DateTimeInterface
    {
        return $this->expiresAt;
    }

    /**
     * Get the value of the Path attribute
     *
     * @return string
     */
    public function getPath(): string
    {
        return $this->path;
    }

    /**
     * Get the value of the Domain attribute
     *
     * @return string
     */
    public function getDomain(): string
    {
        return $this->domain;
    }

    /**
     * Get the value of the Secure attribute
     *
     * @return bool
     */
    public function isSecure(): bool
    {
        return $this->secure;
    }

    /**
     * Get the value of the HttpOnly attribute
     *
     * @return bool
     */
    public function isHttpOnly(): bool
    {
        return $this->httpOnly;
    }

    /**
     * Get the value of the SameSite attribute
     *
     * @return string
     */
    public function getSameSite(): string
    {
        return $this->sameSite;
    }

    /**
     * Generate value for the HTTP Cookie header
     *
     * @param bool $toRemove If to true, then set expire date
     *                       to some past date to remove.
     * @return string
     */
    public function toHeaderValue(bool $toRemove = false): string
    {
        $parts = [];

        $parts[] = sprintf('%s=%s', $this->name, urlencode($this->value));

        if ($toRemove) {
            $parts[] = sprintf(
                'Expires=%s',
                date('D, d M Y H:i:s T', time() - 30 * 86400) // Set past date
            );
        } elseif ($this->expiresAt) {
            $parts[] = sprintf(
                'Expires=%s',
                $this->expiresAt->format('D, d M Y H:i:s T')
            );
        }

        if (empty($this->path) === false) {
            $parts[] = sprintf('Path=%s', $this->path);
        }

        if (empty($this->domain) === false) {
            $parts[] = sprintf('Domain=%s', $this->domain);
        }

        if ($this->secure) {
            $parts[] = 'Secure';
        }

        if ($this->httpOnly) {
            $parts[] = 'HttpOnly';
        }

        if ($this->sameSite) {
            $parts[] = sprintf('SameSite=%s', $this->sameSite);
        }

        return implode('; ', $parts);
    }

    /**
     * Assert the value of the name attribute
     *
     * @param string $name
     * @return void
     * @throws InvalidArgumentException
     */
    private function assertName(string $name): void
    {
        if (preg_match("/[=,; \t\r\n\013\014]/", $name)) {
            throw new InvalidArgumentException(sprintf(
                'The cookie name "%s" contains invalid characters.',
                $name
            ));
        }

        if (empty($name)) {
            throw new InvalidArgumentException(
                'The cookie name cannot be empty.'
            );
        }
    }

    /**
     * Validates the value of the same site attribute
     *
     * @param string $sameSite
     * @param bool $secure
     * @return void
     * @throws InvalidArgumentException
     */
    private function assertSameSite(string $sameSite, bool $secure): void
    {
        if (!in_array($sameSite, ['lax', 'strict', 'none'])) {
            throw new InvalidArgumentException(
                'The same site attribute must be "lax", "strict" or "none"'
            );
        }

        if ($sameSite === 'none' && !$secure) {
            throw new InvalidArgumentException(
                'The same site attribute can only be "none" when secure is set to true'
            );
        }
    }

    /**
     * Sanitizes the expire date value
     *
     * @param DateTimeInterface|string|null $expiresAt
     * @return null|DateTimeInterface
     */
    private function sanitizeExpireDate(
        DateTimeInterface|string|null $expiresAt
    ): ?DateTimeInterface {
        if ($expiresAt === null) {
            return null;
        }

        $timezone = new DateTimeZone("UTC");

        if (is_string($expiresAt)) {
            $expiresAt = new DateTime($expiresAt);
        }

        $expiresAt = new DateTime(
            $expiresAt->format(DateTimeInterface::ATOM)
        );

        $expiresAt->setTimezone($timezone);
        return $expiresAt;
    }
}
