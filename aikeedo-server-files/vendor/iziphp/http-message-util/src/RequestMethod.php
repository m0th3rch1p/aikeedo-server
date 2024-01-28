<?php

declare(strict_types=1);

namespace Easy\Http\Message;

/**
 * Enumaration of HTTP request methods
 *
 * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods
 */
enum RequestMethod: string
{
    /**
     * The GET method requests a representation of the specified resource.
     * Requests using GET should only retrieve data.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/GET
     */
    case GET = 'GET';

    /**
     * The HEAD method asks for a response identical to that of a GET request,
     * but without the response body.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/HEAD
     */
    case HEAD = 'HEAD';

    /**
     * The POST method is used to submit an entity to the specified resource,
     * often causing a change in state or side effects on the server.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/POST
     */
    case POST = 'POST';

    /**
     * The PUT method replaces all current representations of the target resource
     * with the request payload.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/PUT
     */
    case PUT = 'PUT';

    /**
     * The DELETE method deletes the specified resource.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/DELETE
     */
    case DELETE = 'DELETE';

    /**
     * The CONNECT method establishes a tunnel to the server identified by the
     * target resource.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/CONNECT
     */
    case CONNECT = 'CONNECT';

    /**
     * The OPTIONS method is used to describe the communication options for the
     * target resource.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/OPTIONS
     */
    case OPTIONS = 'OPTIONS';

    /**
     * The TRACE method performs a message loop-back test along the path to the
     * target resource.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/TRACE
     */
    case TRACE = 'TRACE';

    /**
     * The PATCH method is used to apply partial modifications to a resource.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/PATCH
     */
    case PATCH = 'PATCH';
}
