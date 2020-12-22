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

const fs = require('fs');
const path = require('path');
const config = require('../config/default');

const CallHandler = require('./CallHandler');

class Controller {
  static sendResponse(response, payload, beautify = false) {
    /**
     * The default response-code is 200. We want to allow to change that. in That case,
     * payload will be an object consisting of a code and a payload. If not customized
     * send 200 and the payload as received in this method.
     */
    response.status(payload.code || 200);
    response.setHeader('content-type', 'application/json');
    
    const responsePayload = payload.payload !== undefined ? payload.payload : payload;

    if (responsePayload instanceof Object) {
      if (beautify) {
        const json = JSON.stringify(responsePayload, null, 4);
        response.send(json);
        response.end();
      } else {
        response.json(responsePayload, null, 4);
      }
    } else {
      response.send(responsePayload);
      response.end();
    }
  }

  static sendError(response, error) {
    console.error(error);
    
    const errResponse = {
      code: error.code,
      message: error.error || error.message,
      retriable: error.retriable || false,
      details: error.details,
    };

    const serialized = JSON.stringify(errResponse, null, 4);

    response.status(500);
    response.send(serialized);
    response.end();
  }

  /**
   * Files have been uploaded to the directory defined by config.js as upload directory
   * Files have a temporary name, that was saved as 'filename' of the file object that is
   * referenced in reuquest.files array.
   * This method finds the file and changes it to the file name that was originally called
   * when it was uploaded. To prevent files from being overwritten, a timestamp is added between
   * the filename and its extension
   * @param request
   * @param fieldName
   * @returns {string}
   */
  static collectFile(request, fieldName) {
    let uploadedFileName = '';
    if (request.files && request.files.length > 0) {
      const fileObject = request.files.find(file => file.fieldname === fieldName);
      if (fileObject) {
        const fileArray = fileObject.originalname.split('.');
        const extension = fileArray.pop();
        fileArray.push(`_${Date.now()}`);
        uploadedFileName = `${fileArray.join('')}.${extension}`;
        fs.renameSync(path.join(config.FILE_UPLOAD_PATH, fileObject.filename),
          path.join(config.FILE_UPLOAD_PATH, uploadedFileName));
      }
    }
    return uploadedFileName;
  }

  // static collectFiles(request) {
  //   logger.info('Checking if files are expected in schema');
  //   const requestFiles = {};
  //   if (request.openapi.schema.requestBody !== undefined) {
  //     const [contentType] = request.headers['content-type'].split(';');
  //     if (contentType === 'multipart/form-data') {
  //       const contentSchema = request.openapi.schema.requestBody.content[contentType].schema;
  //       Object.entries(contentSchema.properties).forEach(([name, property]) => {
  //         if (property.type === 'string' && ['binary', 'base64'].indexOf(property.format) > -1) {
  //           const fileObject = request.files.find(file => file.fieldname === name);
  //           const fileArray = fileObject.originalname.split('.');
  //           const extension = fileArray.pop();
  //           fileArray.push(`_${Date.now()}`);
  //           const uploadedFileName = `${fileArray.join('')}.${extension}`;
  //           fs.renameSync(path.join(config.FILE_UPLOAD_PATH, fileObject.filename),
  //             path.join(config.FILE_UPLOAD_PATH, uploadedFileName));
  //           requestFiles[name] = uploadedFileName;
  //         }
  //       });
  //     } else if (request.openapi.schema.requestBody.content[contentType] !== undefined
  //         && request.files !== undefined) {
  //       [request.body] = request.files;
  //     }
  //   }
  //   return requestFiles;
  // }

  /**
    * Extracts the given schema model name.
    * input: { $ref: '#components/scope/ModelName' }
    * output: ModelName (if lcFirstChar == false)
    * output: modelName (if lcFirstChar == true)
  **/
  static extractModelName(schema, lcFirstChar = true) {
    const index = schema.$ref.lastIndexOf('/');

    if (index == -1) {
      console.warn(`${schema.$ref} did not have the expected format.`);
      return schema.$ref;
    }

    const lastPart = schema.$ref.substr(index + 1);
    if (!lcFirstChar) return lastPart;

    return lastPart.charAt(0).toLowerCase() + lastPart.slice(1);
  }

  static collectRequestParams(request) {
    const requestParams = {};
    if (request.openapi.schema.requestBody !== undefined) {
      const { content } = request.openapi.schema.requestBody;
      if (content['application/json'] !== undefined) {
        const schema = request.openapi.schema.requestBody.content['application/json'].schema;

        if (schema.$ref) {
          let modelName = Controller.extractModelName(schema);
          requestParams[modelName] = request.body;
          requestParams['class'] = Controller.extractModelName(schema, false);
          requestParams['requestParamsKey'] = modelName;

        } else {
          requestParams.body = request.body;
        }
      } else if (content['multipart/form-data'] !== undefined) {
        Object.keys(content['multipart/form-data'].schema.properties).forEach(
          (property) => {
            const propertyObject = content['multipart/form-data'].schema.properties[property];
            if (propertyObject.format !== undefined && propertyObject.format === 'binary') {
              requestParams[property] = this.collectFile(request, property);
            } else {
              requestParams[property] = request.body[property];
            }
          },
        );
      }
    }
    // if (request.openapi.schema.requestBody.content['application/json'] !== undefined) {
    //   const schema = request.openapi.schema.requestBody.content['application/json'];
    //   if (schema.$ref) {
    //     requestParams[schema.$ref.substr(schema.$ref.lastIndexOf('.'))] = request.body;
    //   } else {
    //     requestParams.body = request.body;
    //   }
    // }
    request.openapi.schema.parameters.forEach((param) => {
      if (param.in === 'path') {
        requestParams[param.name] = request.openapi.pathParams[param.name];
      } else if (param.in === 'query') {
        requestParams[param.name] = request.query[param.name];
      } else if (param.in === 'header') {
        requestParams[param.name] = request.headers[param.name];
      }
    });
    return requestParams;
  }

  static rejectResponse(error, code = 500) {
    return { error, code };
  }

  static successResponse(payload, code = 200) {
    return { payload, code };
  }

  static async handleRequest(request, response) {
    try {
      const params = {
        params: this.collectRequestParams(request),
        request,
        response,
      };

      const app = request.app;
      const route = request.route.path;

      // Call the registered service handler
      const content = await CallHandler.bind(app)(route, params);

      // Internally wrap the service handler response in a success message
      const wrapped = Controller.successResponse(content);

      // And finalize the response (json)
      Controller.sendResponse(response, wrapped, config.BEAUTIFY_JSON);

    } catch (error) {
      Controller.sendError(response, error);
    }
  }
}

module.exports = Controller;
