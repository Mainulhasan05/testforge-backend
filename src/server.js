const app = require("./app");
const config = require("./config");
const connectDB = require("./config/database");
const seedData = require("./utils/seed");
const emailService = require("./utils/emailService");

const startServer = async () => {
  try {
    await connectDB();
    await emailService.verifyConnection();
    // await seedData();

    const server = app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Environment: ${config.env}`);
      console.log(`Health check: http://localhost:${config.port}/health`);
    });

    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Closing server gracefully...`);
      server.close(async () => {
        console.log("HTTP server closed");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
