import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { sendVerificationEmail } from '../lib/mail';

const ENABLE_VERIFICATION = process.env.ENABLE_EMAIL_VERIFICATION === 'true';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { name, email, password, atelierName, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Gerar código de verificação se habilitado
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 3600000); // 1 hora

    const user = await prisma.user.create({
      data: { 
        name: name || email.split('@')[0], 
        email, 
        passwordHash, 
        atelierName: atelierName || name, 
        phone,
        isVerified: !ENABLE_VERIFICATION, // Se desativado, já nasce verificado
        verificationCode: ENABLE_VERIFICATION ? verificationCode : null,
        verificationExpires: ENABLE_VERIFICATION ? verificationExpires : null
      },
      select: { id: true, name: true, email: true, atelierName: true, role: true, isVerified: true, createdAt: true },
    });

    if (ENABLE_VERIFICATION) {
      await sendVerificationEmail(user.email, verificationCode, user.name);
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    return res.status(201).json({ 
      user, 
      token, 
      message: ENABLE_VERIFICATION ? 'Código de verificação enviado ao e-mail' : 'Conta criada com sucesso' 
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Se a verificação estiver ligada e o usuário não for verificado
    if (ENABLE_VERIFICATION && !user.isVerified) {
      return res.status(403).json({ 
        error: 'E-mail não verificado', 
        requiresVerification: true,
        email: user.email 
      });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    const { passwordHash: _, verificationCode: __, verificationExpires: ___, ...userSafe } = user;
    return res.json({ user: userSafe, token });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  try {
    const payload = jwt.verify(
      authHeader.substring(7),
      process.env.JWT_SECRET || 'dev-secret'
    ) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true, atelierName: true, role: true, phone: true, logoUrl: true },
    });

    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    return res.json({ user });
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req: Request, res: Response) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'E-mail e código são obrigatórios' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Este e-mail já foi verificado' });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ error: 'Código de verificação inválido' });
    }

    if (user.verificationExpires && new Date() > user.verificationExpires) {
      return res.status(400).json({ error: 'Código de verificação expirado' });
    }

    await prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
        verificationCode: null,
        verificationExpires: null,
      },
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    const { passwordHash: _, verificationCode: __, ...userSafe } = user;
    return res.json({ 
      message: 'E-mail verificado com sucesso!', 
      user: { ...userSafe, isVerified: true }, 
      token 
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao verificar e-mail' });
  }
});

// POST /api/auth/resend-code
router.post('/resend-code', async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: 'E-mail é obrigatório' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (user.isVerified) return res.status(400).json({ error: 'E-mail já verificado' });

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newExpires = new Date(Date.now() + 3600000);

    await prisma.user.update({
      where: { email },
      data: {
        verificationCode: newCode,
        verificationExpires: newExpires,
      },
    });

    await sendVerificationEmail(user.email, newCode, user.name);

    return res.json({ message: 'Novo código enviado com sucesso!' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao reenviar código' });
  }
});

export default router;
