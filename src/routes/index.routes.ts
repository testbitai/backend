import express from "express";

const router = express.Router();

router.use('/auth', require("./auth.routes").default)
router.use('/user', require("./user.routes").default)
router.use('/test', require("./test.routes").default)

export default router;