const express = require("express");
const router = express.Router();
const caseController = require("../controllers/caseController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
  createCaseSchema,
  updateCaseSchema,
} = require("../validators/caseValidator");

router.post(
  "/features/:featureId/cases",
  authenticate,
  validate(createCaseSchema),
  caseController.createCase
);
router.get(
  "/features/:featureId/cases",
  authenticate,
  caseController.getFeatureCases
);
router.get("/cases/:caseId", authenticate, caseController.getCaseById);
router.put(
  "/cases/:caseId",
  authenticate,
  validate(updateCaseSchema),
  caseController.updateCase
);
router.delete("/cases/:caseId", authenticate, caseController.deleteCase);

module.exports = router;
