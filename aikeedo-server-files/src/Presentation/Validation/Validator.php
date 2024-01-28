<?php

declare(strict_types=1);

namespace Presentation\Validation;

use Psr\Http\Message\ServerRequestInterface;
use Somnambulist\Components\Validation\Factory;

/** @package Shared\Presentation\Validation */
class Validator
{
    /**
     * @param Factory $factory 
     * @return void 
     */
    public function __construct(
        private Factory $factory
    ) {
    }

    /**
     * @param ServerRequestInterface $req 
     * @param array $rules 
     * @return void 
     * @throws ValidationException 
     */
    public function validateRequest(
        ServerRequestInterface $req,
        array $rules
    ): void {
        $inputs = json_decode(json_encode($req->getParsedBody()), true);
        $this->validate($inputs, $rules);
    }

    /**
     * @param array $inputs 
     * @param array $rules 
     * @return void 
     * @throws ValidationException 
     */
    public function validate(array $inputs, array $rules): void
    {
        $validation = $this->factory->validate($inputs, $rules);

        if ($validation->fails()) {;
            $messages = $validation->errors()->firstOfAll();

            foreach ($messages as $field => $message) {
                // Throw exception for the first error
                throw new ValidationException($message, $field);
            }
        }
    }
}
