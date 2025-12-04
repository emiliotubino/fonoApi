import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

/**
 * Middleware factory para verificar se o usuário tem uma das roles permitidas
 * @param allowedRoles - Array de roles que podem acessar a rota
 * @returns Middleware que valida a role do usuário
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Verificar se usuário está autenticado
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    // Verificar se a role do usuário está nas roles permitidas
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Acesso negado. Permissões insuficientes.',
        requiredRole: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
};
