import { Router } from "express";
import { searchController } from "./search.controler";

const router = Router();

router.get("/", searchController.search);
router.get("/suggest", searchController.suggest);

export const searchRouter = router;
