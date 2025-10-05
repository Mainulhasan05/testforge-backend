const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const routes = require("./routes");
const { errorHandler, notFound } = require("./middlewares/errorHandler");

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    data: null,
    message: "Too many requests, please try again later",
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      details: {},
    },
  },
});

app.use("/api", limiter);

app.get("/health", (req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    message: "Server is running",
    error: null,
  });
});

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
