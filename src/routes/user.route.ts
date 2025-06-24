import express from 'express';

import UserController from '@/controllers/user.controller';

const router = express.Router();

router.get('/', UserController.getAllUsers);
router.post('/login', UserController.login);
router.get('/me', UserController.getUser);
router.post('/medic/login', UserController.medicLogin);

export default router;
