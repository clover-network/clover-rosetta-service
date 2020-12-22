/**
 * Copyright (c) 2020 DigiByte Foundation NZ Limited
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
 
/*
  CallHandler calls registered service handlers (if existing).
  Must be called with .bind(expressApp)
*/

const CallAsserter = async function (asserter, className, params) {
  if (!asserter || !className || !params) return;

  const validationFunc = asserter[className];
  if (!validationFunc) {
    console.log(`No validation func ${className} found`);
    return;
  }

  return validationFunc.bind(asserter)(params);
}

const CallHandler = async function (route, args) {
  const app = this;
  const routeHandlers = app.routeHandlers;

  const data = routeHandlers[route];
  if (!data || !data.handler) {
    throw new Error(`Service for ${route} not implemented`);
  }

  // Each route can have a specific asserter.
  // If a specific asserter was not set, the global asserter will
  // be used to validate requests, if set.
  const asserter = data.asserter || app.asserter; 

  // Retrieve the modelName that was set by the Controller (collectRequestParams).
  // Also retrieve the request POST args using the modelName.
  const modelName = args.params.class;
  const requestParamsKey = args.params.requestParamsKey;
  const requestParams = args.params[requestParamsKey];

  // Try to call the asserter.
  await CallAsserter(asserter, modelName, requestParams);

  // Add the ability to access response/requests objects
  // from the service handlers.
  return await data.handler(args.params, args.request, args.response);
};

module.exports = CallHandler;
