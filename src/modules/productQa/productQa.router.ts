import { Router } from "express";
import { Role } from "../../generated/enums";
import { checkAuth } from "../../middleware/cheackAuth";
import { validateRequest } from "../../middleware/validateRequest";
import {
  productQaController,
  askQuestionSchema,
  answerQuestionSchema,
} from "./productQa.controler";

const router = Router();

// Public list, scoped by productId
router.get("/products/:productId/questions", productQaController.list);

// Logged-in customers / sellers / admins may ask
router.post(
  "/products/:productId/questions",
  checkAuth(Role.CUSTOMER, Role.SELLER, Role.ADMIN, Role.STAFF),
  validateRequest(askQuestionSchema),
  productQaController.ask
);

// Anyone authenticated may answer; staff/admin/seller flagged isOfficial
router.post(
  "/questions/:questionId/answers",
  checkAuth(Role.CUSTOMER, Role.SELLER, Role.ADMIN, Role.STAFF),
  validateRequest(answerQuestionSchema),
  productQaController.answer
);

// Moderation
router.patch(
  "/questions/:questionId/hide",
  checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF),
  productQaController.hideQuestion
);
router.patch(
  "/questions/:questionId/unhide",
  checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF),
  productQaController.unhideQuestion
);
router.patch(
  "/answers/:answerId/hide",
  checkAuth(Role.CUSTOMER, Role.SELLER, Role.ADMIN, Role.STAFF),
  productQaController.hideAnswer
);

export const productQaRouter = router;
