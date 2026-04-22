import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido' });
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as {
      userId: string;
      role: string;
    };

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return res.status(401).json({ 
        error: 'Sessão inválida', 
        message: 'Usuário não encontrado no banco de dados',
        code: 'USER_NOT_FOUND' 
      });
    }

    req.userId = payload.userId;
    req.userRole = payload.role;
    next();
  } catch (err: any) {
    console.error('❌ Auth Error:', err.message);
    
    // Se for um erro do Prisma (banco de dados), não deslogar o usuário
    if (err.message?.includes('Prisma') || err.message?.includes('connection') || err.message?.includes('R57P01')) {
      return res.status(503).json({ 
        error: 'Serviço Temporariamente Indisponível',
        message: 'Falha na conexão com o banco de dados. Tente novamente em instantes.',
        code: 'DB_CONNECTION_ERROR'
      });
    }

    return res.status(401).json({ 
      error: 'Token inválido ou expirado',
      code: 'INVALID_TOKEN'
    });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!roles.includes(req.userRole || '')) {
      return res.status(403).json({ error: 'Acesso negado: permissão insuficiente' });
    }
    next();
  };
}
