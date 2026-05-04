import { Router } from "express";

import { authControler } from "./auth.controler";
import { checkAuth } from "../../middleware/cheackAuth";
import { Role } from "../../generated/enums";
import { validateRequest } from "../../middleware/validateRequest";
import { authLimiter } from "../../middleware/rateLimiter";
import {
  changePasswordZodSchema,
  forgotPasswordZodSchema,
  loginZodSchema,
  registerZodSchema,
  updateProfileSchema,
} from "./auth.validation";

const router = Router();

router.post(
  "/register",
  authLimiter,
  validateRequest(registerZodSchema),
  authControler.registeredUser
);
router.post("/login", authLimiter, validateRequest(loginZodSchema), authControler.loginUser);
router.get("/me", checkAuth(), authControler.getMe);
router.post("/refresh-token", authControler.getNewToken);
router.post(
  "/change-password",
  checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF),
  validateRequest(changePasswordZodSchema),
  authControler.changePassword
);
router.post(
  "/logOut",
  checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF),
  authControler.logOutUser
);

router.post("/verify-email", authLimiter, authControler.verifyEmail);
router.post(
  "/forget-password",
  authLimiter,
  validateRequest(forgotPasswordZodSchema),
  authControler.forgetPassword
);
router.post("/reset-password", authLimiter, authControler.resetPassword);

router.get("/login/google", authControler.googleLogin);
router.get("/google/success", authControler.googleLoginSuccess);
router.get("/oauth/error", authControler.handlerOAuthError);
router.get("/check-email", authControler.checkEmailAvailability);

router.put(
  "/update-profile",
  checkAuth(),
  validateRequest(updateProfileSchema),
  authControler.updateProfile
);

export const authRoutes = router;
