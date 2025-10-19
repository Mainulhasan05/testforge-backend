const express = require("express");
const router = express.Router();
const caseController = require("../controllers/caseController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
  createCaseSchema,
  updateCaseSchema,
  bulkCreateCasesSchema,
} = require("../validators/caseValidator");

// Feature-scoped routes (mounted at /features)
router.post(
  "/:featureId/cases/bulk",
  authenticate,
  validate(bulkCreateCasesSchema),
  caseController.bulkCreateCases
);
router.post(
  "/:featureId/cases",
  authenticate,
  validate(createCaseSchema),
  caseController.createCase
);
router.get("/:featureId/cases", authenticate, caseController.getFeatureCases);

// Direct case routes (mounted at /cases)
router.get("/:caseId", authenticate, caseController.getCaseById);
router.put(
  "/:caseId",
  authenticate,
  validate(updateCaseSchema),
  caseController.updateCase
);
router.delete("/:caseId", authenticate, caseController.deleteCase);

module.exports = router;
