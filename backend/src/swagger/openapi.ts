import swaggerJsdoc from "swagger-jsdoc";

export const openApiSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "WingFin Real-Time Market API",
      version: "1.0.0"
    },
    servers: [{ url: "/" }]
  },
  apis: ["./src/controllers/**/*.ts", "./dist/controllers/**/*.js"]
});
