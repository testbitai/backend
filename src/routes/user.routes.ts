import express from 'express';
import userValidation from '../validations/user.validation';
import authMiddleware from '../middlewares/auth.middleware';
import userController from '../controllers/user.controller';
import { validate } from '../middlewares/validate';

const router = express.Router();

// Authenticated routes (require valid JWT)
router.use(authMiddleware.authenticate);

router.get(
  '/me',
  userController.getCurrentUser
);

router.patch(
  '/me',
  validate(userValidation.updateMe),
  userController.updateCurrentUser
);

router.delete(
  '/me',
  userController.deleteCurrentUser
);

router.post(
  '/me/avatar',
  userController.uploadAvatar
);

router.get(
  '/me/badges',
  userController.getMyBadges
);

router.patch(
  '/me/study-buddy',
  validate(userValidation.updateStudyBuddy),
  userController.updateStudyBuddy
);

// Admin-only routes
router.use(authMiddleware.authorizeRoles('admin'));

router.get(
  '/',
  validate(userValidation.getUsers),
  userController.getUsers
);

router.get(
  '/:userId',
  validate(userValidation.getUser),
  userController.getUserById
);

router.patch(
  '/:userId',
  validate(userValidation.updateUser),
  userController.updateUserById
);

router.delete(
  '/:userId',
  validate(userValidation.deleteUser),
  userController.deleteUserById
);

export default router;