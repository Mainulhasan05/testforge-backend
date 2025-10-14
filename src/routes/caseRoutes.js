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
router.get("/cases/:caseId", authenticate, caseController.getCaseById);
router.put(
  "/cases/:caseId",
  authenticate,
  validate(updateCaseSchema),
  caseController.updateCase
);
router.delete("/cases/:caseId", authenticate, caseController.deleteCase);

module.exports = router;
