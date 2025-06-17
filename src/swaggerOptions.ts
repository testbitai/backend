import { Options } from "swagger-jsdoc";

const options: Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Testbit API",
      version: "1.0.0",
      description: "Testbit REST API with Swagger and TypeScript",
    },
    servers: [
      {
        url: "http://localhost:5000",
      },
    ],
  },
  apis: ["./src/routes/*.ts"], 
};

export default options;
