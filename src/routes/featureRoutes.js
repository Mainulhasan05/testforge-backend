const express = require("express");
const router = express.Router();
const featureController = require("../controllers/featureController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
  createFeatureSchema,
  updateFeatureSchema,
} = require("../validators/featureValidator");

// Session-scoped routes (mounted at /sessions)
router.post(
  "/:sessionId/features",
  authenticate,
  validate(createFeatureSchema),
  featureController.createFeature
);
router.get(
  "/:sessionId/features",
  authenticate,
  featureController.getSessionFeatures
);

// Direct feature routes (mounted at /features)
router.get(
  "/:featureId",
  authenticate,
  featureController.getFeatureById
);
router.put(
  "/:featureId",
  authenticate,
  validate(updateFeatureSchema),
  featureController.updateFeature
);
router.delete(
  "/:featureId",
  authenticate,
  featureController.deleteFeature
);

module.exports = router;
