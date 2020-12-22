# Rosetta SDK Server

## Project Files
### Root Directory:
In the root directory we have (besides package.json, config.js, and log files):
- **index.js** - This is the servers 'main' class.
- **expressServer.js** - The core of the Express.js server.

### Configuration
- *config/default.js* - This file is the basic configuration for the OpenAPI server.

### Schema File
- **api/openapi.yaml** - This is the OpenAPI contract to which this server will comply. The file was generated using the codegen, and should contain everything needed to run the API Gateway - no references to external models/schemas.

### utils/
Currently a single file:

- **openapiRouter.js** - This is where the routing to our back-end code happens. If the request object includes an ```openapi``` object, it picks up the following values (that are part of the ```openapi.yaml``` file): 'x-openapi-router-controller', and 'x-openapi-router-service'. These variables are names of files/classes in the controllers and services directories respectively. The operationId of the request is also extracted. The operationId is a method in the controller and the service that was generated as part of the codegen process. The routing process sends the request and response objects to the controller, which will extract the expected variables from the request, and send it to be processed by the service, returning the response from the service to the caller.

### controllers/
After validating the request, and ensuring this belongs to our API gateway, we send the request to a `controller`, where the variables and parameters are extracted from the request and sent to the relevant `service` for processing. The `controller` handles the response from the `service` and builds the appropriate HTTP response to be sent back to the user.

- **index.js** - load all the controllers that were generated for this project, and export them to be used dynamically by the `openapiRouter.js`. If you would like to customize your controller, it is advised that you link to your controller here, and ensure that the codegen does not rewrite this file.

- **Controller.js** - The core processor of the generated controllers. The generated controllers are designed to be as slim and generic as possible, referencing to the `Controller.js` for the business logic of parsing the needed variables and arguments from the request, and for building the HTTP response which will be sent back. The `Controller.js` is a class with static methods.

- **.js** - auto-generated code, processing all the operations. The Controller is a class that is constructed with the service class it will be sending the request to. Every request defined by the `openapi.yaml`  has an operationId. The operationId is the name of the method that will be called. Every method receives the request and response, and calls the `Controller.js` to process the request and response, adding the service method that should be called for the actual business-logic processing.
