import express from "express";

const router = express.Router();

router.use('/health', require("./health.routes").default)
router.use('/auth', require("./auth.routes").default)
router.use('/user', require("./user.routes").default)
router.use('/test', require("./test.routes").default)
router.use('/support', require("./support.routes").default)
router.use('/contact', require("./contact.routes").default)
router.use('/admin/students', require("./student.routes").default)
router.use('/admin/tutors', require("./tutor.routes").default)

export default router;