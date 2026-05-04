import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import {
  shippingController,
  quoteShippingSchema,
} from "./shipping.controler";

const router = Router();

// Public — anyone can preview a shipping quote (acts on a cart or item list)
router.post("/quote", validateRequest(quoteShippingSchema), shippingController.quote);

export const shippingRouter = router;
