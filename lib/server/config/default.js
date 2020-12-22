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

const path = require('path');

/**
 * @type module:OpenApiConfig
 *
 * Server Application Configuration
 * @property {string} ROOT_DIR - The root directory of the nodeapi
 * @property {number} URL_PORT - The port to listen on
 * @property {string} URL_PATH - Hostname and protocol specification
 * @property {string} BASE_VERSION - OpenAPI Version
 * @property {string} CONTROLLER_DIRECTORY - Specifies the location of the controller files.
 * @property {string} PROJECT_DIR - Specifies the root location of the project.
 * @property {boolean} BEAUTIFY_JSON - Specifies whether to beautify the returned json response.

 * @property {boolean} OPENAPI_YAML - Specifies the location of the yaml file
 * @property {boolean} FULL_PATH - undocumented
 * @property {boolean} FILE_UPLOAD_PATH - unused within this project
 */
const config = {
  ROOT_DIR: path.join(__dirname, '..'),
  URL_PORT: 8080,
  URL_PATH: 'http://localhost',
  BASE_VERSION: 'v2',
  CONTROLLER_DIRECTORY: path.join(__dirname, '..', 'controllers'),
  PROJECT_DIR: path.join(__dirname, '..'),
  BEAUTIFY_JSON: true,
};

config.OPENAPI_YAML = path.join(config.ROOT_DIR, 'api', 'openapi.yaml');
config.FULL_PATH = `${config.URL_PATH}:${config.URL_PORT}/${config.BASE_VERSION}`;
config.FILE_UPLOAD_PATH = path.join(config.PROJECT_DIR, 'uploaded_files');

module.exports = config;
