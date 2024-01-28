<?php

declare(strict_types=1);

namespace Presentation\Middlewares;

use Easy\Container\Attributes\Inject;
use Gettext\Loader\PoLoader;
use Gettext\Translator;
use Gettext\TranslatorFunctions;
use Presentation\Response\RedirectResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use User\Domain\Entities\UserEntity;

class LocaleMiddleware implements MiddlewareInterface
{
    private array $enabledLocaleCodes = [];
    private PoLoader $poLoader;

    public function __construct(
        #[Inject('config.dirs.locale')]
        private string $localeDir,

        #[Inject('config.dirs.themes')]
        private string $themesDir,

        #[Inject('config.locale.locales')]
        private array $locales = [],

        #[Inject('config.locale.default')]
        private string $defaultLocale = 'en-US'
    ) {
        $this->enabledLocaleCodes = $this->enabledLocales();
        $this->poLoader = new PoLoader();
    }

    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler
    ): ResponseInterface {
        $locale = $request->getAttribute('locale');
        if ($locale && !in_array($locale, $this->enabledLocaleCodes)) {
            $path = $request->getUri()->getPath();
            $path = preg_replace('/^\/[a-z]{2}-[A-Z]{2}/', '', $path);

            return new RedirectResponse($request->getUri()->withPath($path));
        }

        $translations = [];
        $languages = $this->getPreferredLanguages($request);

        $locale = $this->loadTranslations(
            $this->localeDir . "/{locale}/LC_MESSAGES/messages.po",
            $translations,
            $languages
        );

        $themeLocale = $this->loadTranslations(
            $this->themesDir . '/default/locale' . "/{locale}/LC_MESSAGES/theme.po",
            $translations,
            $languages,
            function ($translation) {
                return $translation->setDomain('theme');
            }
        );

        $translator = $translations ?
            Translator::createFromTranslations(...$translations)
            : new Translator();

        TranslatorFunctions::register($translator);

        return $handler->handle(
            $request
                ->withAttribute('locale', $locale)
                ->withAttribute('theme.locale', $themeLocale)
        );
    }

    private function loadTranslations(
        string $filePathPattern,
        array &$translations,
        array $languages,
        callable $callback = null
    ): string {
        foreach ($languages as $language) {
            $loc = $this->findLocale($language);

            if (!$loc) {
                continue;
            }

            $filePath = str_replace('{locale}', $loc, $filePathPattern);

            if (!file_exists($filePath)) {
                continue;
            }

            $translation = $this->poLoader->loadFile($filePath);

            if ($callback !== null) {
                $callback($translation);
            }

            $translations[] = $translation;
            return $loc;
        }

        return $this->defaultLocale;
    }

    private function findLocale(string $locale): ?string
    {
        if (in_array($locale, $this->enabledLocaleCodes)) {
            return $locale;
        }

        foreach ($this->enabledLocaleCodes as $enabledLocaleCode) {
            $parts = explode('-', $enabledLocaleCode);

            if ($parts[0] === $locale) {
                return $enabledLocaleCode;
            }
        }

        return null;
    }

    private function enabledLocales(): array
    {
        $locales = [];

        foreach ($this->locales as $locale) {
            if ($locale['enabled']) {
                $locales[] = $locale['name'];
            }
        }

        return array_unique($locales);
    }

    private function getPreferredLanguages(ServerRequestInterface $request): array
    {
        $languages = [];

        // Get the url language
        $languages[] = $request->getAttribute('locale');

        // Get the user language
        /** @var UserEntity */
        $user = $request->getAttribute(UserEntity::class);

        if ($user) {
            $languages[] = $user->getLanguage()->value;
        }

        // Get the cookie language
        $cookie = $request->getCookieParams()['locale'] ?? null;

        if ($cookie) {
            $languages[] = $cookie;
        }

        // Get the browser language
        $languages = array_merge(
            $languages,
            $this->getAcceptLanguages($request)
        );

        // Get the default language
        $languages[] = $this->defaultLocale;

        // Remove empty values
        $languages = array_filter($languages);

        array_walk($languages, function (&$language) {
            $language = $this->normalizeLanguage($language);
        });

        $languages = array_unique($languages);

        return $languages;
    }

    private function getAcceptLanguages(
        ServerRequestInterface $request
    ): array {
        $accept_langs = explode(
            ',',
            $request->getHeaderLine('Accept-Language')
        );

        $locales = array_reduce($accept_langs, function ($carry, $item) {
            list($l, $q) = array_merge(explode(';q=', $item), [1]);
            $carry[$l] = (float) $q;
            return $carry;
        }, []);

        return array_keys($locales);
    }

    /**
     * Normalize the language string
     *
     * @param string $language
     * @return string
     */
    private function normalizeLanguage(string $language): string
    {
        $parts = explode('-', strtolower($language));

        if (count($parts) > 1) {
            $parts[1] = strtoupper($parts[1]);
        }

        return implode('-', $parts);
    }
}
