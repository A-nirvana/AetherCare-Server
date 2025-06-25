import { type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import usersModel, { medicModel } from '@/models/user';
import 'dotenv/config';

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'test1234'; // Default test password

function getAllUsers(req: Request, res: Response): void {
  const users = usersModel.getUsers();
  res.status(200).json(users);
}

function login(req: Request, res: Response): void {
  const { userId, password } = req.body;
  if (!userId || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  // For testing: check if user exists and password matches the test password
  const user = usersModel.getUsers().find((u: any) => u.userId === userId);
  if (!user || password !== TEST_PASSWORD) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  // Generate JWT
  const token = jwt.sign({ id: user.userId, name: user.name }, process.env.JWT_SECRET as string, { expiresIn: '10d' });
  res.status(200).json({
    message: 'Login successful',
    user,
    token: token,
  });
}

function medicLogin(req: Request, res: Response): void {
  const { medicId, password } = req.body;
  if (!medicId || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  const user = medicModel.getMedics().find((u: any) => u.medicId === medicId);
  if (!user || password !== TEST_PASSWORD) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  // Generate JWT
  const token = jwt.sign({ id: user.medicId }, process.env.JWT_SECRET as string, { expiresIn: '10d' });
  res.status(200).json({
    message: 'Login successful',
    user,
    token: token,
  });
}

function getUser(req: Request, res: Response): void {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;
  const userType = req.headers['user-type'] || 'user';

  // console.log('User type:', userType);

  if (!token) {
    res.clearCookie('token');
    res.status(401).json({ isValid: false, error: 'No token provided' });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    const user = userType === 'medic'
      ? medicModel.getMedics().find((u: any) => u.medicId
        === payload.id)
      : usersModel.getUsers().find((u: any) => u.userId === payload.id);

    if (!user) {
      res.status(404).json({ isValid: false, error: 'User not found' });
      return;
    }
    res.status(200).json({
      isValid: true,
      user,
    });
  } catch (err) {
    console.error('Token verification failed:', err);
    res.status(401).json({ isValid: false, error: 'Invalid token' }); 
  }
}

export default {
  getAllUsers,
  login,
  getUser,
  medicLogin
};
