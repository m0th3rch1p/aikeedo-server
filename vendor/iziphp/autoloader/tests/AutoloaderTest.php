<?php

declare(strict_types=1);

namespace Easy\Autoloader\Tests;

use PHPUnit\Framework\ExpectationFailedException;
use PHPUnit\Framework\TestCase;
use SebastianBergmann\RecursionContext\InvalidArgumentException;

/** @package Easy\Autoloader\Tests */
class AutoloaderTest extends TestCase
{
    protected $loader;

    /** @return void  */
    protected function setUp(): void
    {
        $this->loader = new MockAutoloader();

        $this->loader
            ->addFile('/vendor/foo.bar/src/ClassName.php')
            ->addFile('/vendor/foo.bar/src/DoomClassName.php')
            ->addFile('/vendor/foo.bar/tests/ClassNameTest.php')
            ->addFile('/vendor/foo.bardoom/src/ClassName.php')
            ->addFile('/vendor/foo.bar.baz.dib/src/ClassName.php')
            ->addFile('/vendor/foo.bar.baz.dib.zim.gir/src/ClassName.php')
            ->addFile('/vendor/quux/src/ClassName.php');

        $this->loader->appendNamespace(
            'Foo\Bar',
            '/vendor/foo.bar/src'
        );

        $this->loader->prependNamespace(
            'Foo\Bar',
            '/vendor/foo.bar/tests'
        );

        $this->loader->appendNamespace(
            'Foo\BarDoom',
            '/vendor/foo.bardoom/src'
        );

        $this->loader->appendNamespace(
            'Foo\Bar\Baz\Dib',
            '/vendor/foo.bar.baz.dib/src'
        );

        $this->loader->appendNamespace(
            'Foo\Bar\Baz\Dib\Zim\Gir',
            '/vendor/foo.bar.baz.dib.zim.gir/src'
        );

        $this->loader->appendNamespace(null, '/vendor/quux/src');
    }

    /**
     * @return void
     * @throws InvalidArgumentException
     * @throws ExpectationFailedException
     */
    public function testExistingFile(): void
    {
        $actual = $this->loader->loadClass('Foo\Bar\ClassName');
        $expect = '/vendor/foo.bar/src/ClassName.php';
        $this->assertSame($expect, $actual);

        $actual = $this->loader->loadClass('Foo\Bar\ClassNameTest');
        $expect = '/vendor/foo.bar/tests/ClassNameTest.php';
        $this->assertSame($expect, $actual);

        $actual = $this->loader->loadClass('ClassName');
        $expect = '/vendor/quux/src/ClassName.php';
        $this->assertSame($expect, $actual);
    }

    /**
     * @return void
     * @throws InvalidArgumentException
     * @throws ExpectationFailedException
     */
    public function testMissingFile(): void
    {
        $actual = $this->loader->loadClass('No_Vendor\No_Package\NoClass');
        $this->assertFalse($actual);
    }

    /**
     * @return void
     * @throws InvalidArgumentException
     * @throws ExpectationFailedException
     */
    public function testDeepFile(): void
    {
        $actual = $this->loader->loadClass('Foo\Bar\Baz\Dib\Zim\Gir\ClassName');
        $expect = '/vendor/foo.bar.baz.dib.zim.gir/src/ClassName.php';
        $this->assertSame($expect, $actual);
    }

    /**
     * @return void
     * @throws InvalidArgumentException
     * @throws ExpectationFailedException
     */
    public function testConfusion(): void
    {
        $actual = $this->loader->loadClass('Foo\Bar\DoomClassName');
        $expect = '/vendor/foo.bar/src/DoomClassName.php';
        $this->assertSame($expect, $actual);

        $actual = $this->loader->loadClass('Foo\BarDoom\ClassName');
        $expect = '/vendor/foo.bardoom/src/ClassName.php';
        $this->assertSame($expect, $actual);
    }
}
