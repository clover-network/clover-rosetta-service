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

const defaultConfig = require('./config/default');
const ExpressServer = require('./expressServer');
const logger = require('../logger');

/**
 * @class RosettaServer
 * Convenience Wrapper Class for the Express Server.
 */
class RosettaServer {
  /**
   * RosettaServer Constructor
   * @constructor
   * @param {module:OpenApiConfig} configuration - Custom configuration properties to pass to the Server.
   */
  constructor(configuration = {}) {
    this.config = Object.assign(
      {},
      defaultConfig,
      configuration
    );

    const port = this.config.URL_PORT;
    const host = this.config.URL_HOST;
    const openAPIPath = this.config.OPENAPI_YAML;

    this.expressServer = new ExpressServer(port, host, openAPIPath);
  }

  /**
   * Launches the Server Listener.
   * Makes use of the config provided in the constructor.
   */
  async launch() {
    try {
      const port = this.config.URL_PORT;
      const openAPIPath = this.config.OPENAPI_YAML;

      this.expressServer.launch();

      logger.info(`Express server running on port ${port} using OpenAPI Spec: ${openAPIPath}`);

    } catch (error) {
      logger.error('Express Server failure', error.message);
      await this.close();
    }
  }

  /**
   * Register asserter to be used for all requests.
   * Only one can be registered at a time.
   */
  useAsserter(asserter) {
    this.expressServer.app.asserter = asserter;
  }

  /**
   * Register a routehandler at {route}. 
   * Optionally, pass an asserter that only handles requests to this
   * specific route.
   */
  register(route, handler, asserter) {
    this.expressServer.app.routeHandlers[route] = { handler, asserter };
  }

  /**
   * Gets called on failure. Currently unused.
   */
  async close() {
  }
}

module.exports = RosettaServer;