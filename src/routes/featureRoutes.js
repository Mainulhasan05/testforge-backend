const express = require("express");
const router = express.Router();
const featureController = require("../controllers/featureController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
  createFeatureSchema,
  updateFeatureSchema,
} = require("../validators/featureValidator");

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
router.get(
  "/features/:featureId",
  authenticate,
  featureController.getFeatureById
);
router.put(
  "/features/:featureId",
  authenticate,
  validate(updateFeatureSchema),
  featureController.updateFeature
);
router.delete(
  "/features/:featureId",
  authenticate,
  featureController.deleteFeature
);

module.exports = router;
