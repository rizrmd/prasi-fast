import { PrismaClient, User, Session, Prisma } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

const jsonResponse = (data: any, status: number = 200, headers: Record<string, string> = {}) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
};

const hashPassword = async (password: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.pbkdf2(password, salt, 1000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(salt + ':' + derivedKey.toString('hex'));
    });
  });
};

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':');
    crypto.pbkdf2(password, salt, 1000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(key === derivedKey.toString('hex'));
    });
  });
};

const generateSessionToken = () => crypto.randomBytes(32).toString('hex');

type SessionWithUser = Prisma.SessionGetPayload<{
  include: { user: true }
}>;

export const auth = {
  async createSession(userId: number): Promise<SessionWithUser> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 1 week from now

    return await prisma.session.create({
      data: {
        id: generateSessionToken(),
        user_id: userId,
        expires_at: expiresAt,
      },
      include: {
        user: true
      }
    });
  },

  async getSession(sessionId: string): Promise<SessionWithUser | null> {
    return await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true }
    });
  },

  async deleteSession(sessionId: string): Promise<void> {
    await prisma.session.delete({
      where: { id: sessionId }
    });
  }
};

export const handleLogin = async (request: Request): Promise<Response> => {
  try {
    const data = await request.json() as LoginData;
    if (!data.email || !data.password) {
      return jsonResponse({ error: "Email and password are required" }, 400);
    }

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      return jsonResponse({ error: "Invalid credentials" }, 401);
    }

    const validPassword = await verifyPassword(data.password, user.password_hash);
    if (!validPassword) {
      return jsonResponse({ error: "Invalid credentials" }, 401);
    }

    const session = await auth.createSession(user.id);

    const response = jsonResponse({ user }, 200);
    response.headers.set('Set-Cookie', `session=${session.id}; HttpOnly; Path=/; SameSite=Lax; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`);
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return jsonResponse({ error: "Invalid request" }, 400);
  }
};

export const handleRegister = async (request: Request): Promise<Response> => {
  try {
    const data = await request.json() as RegisterData;
    
    if (!data.email || !data.password) {
      return jsonResponse({ error: "Email and password are required" }, 400);
    }

    const existingUser = await prisma.user.findUnique({ 
      where: { email: data.email } 
    });
    if (existingUser) {
      return jsonResponse({ error: "Email already in use" }, 400);
    }

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password_hash: passwordHash,
        name: data.name || data.email.split('@')[0],
        role: "user",
      }
    });

    return jsonResponse({ user }, 201);
  } catch (error: any) {
    console.error('Registration error:', error);
    return jsonResponse({ 
      error: error.message || "Registration failed" 
    }, 400);
  }
};

export const handleLogout = async (request: Request): Promise<Response> => {
  const sessionId = request.headers.get('Cookie')?.split('session=')?.[1]?.split(';')?.[0];
  if (sessionId) {
    await auth.deleteSession(sessionId);
  }

  const response = jsonResponse(null, 204);
  response.headers.set('Set-Cookie', 'session=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  
  return response;
};

export const requireAuth = async (request: Request): Promise<SessionWithUser> => {
  const sessionId = request.headers.get('Cookie')?.split('session=')?.[1]?.split(';')?.[0];
  if (!sessionId) {
    throw new Error("Unauthorized: Please login to continue");
  }

  const session = await auth.getSession(sessionId);
  if (!session) {
    throw new Error("Session not found: Please login again");
  }

  if (new Date() > session.expires_at) {
    await auth.deleteSession(sessionId);
    throw new Error("Session expired: Please login again");
  }

  return session;
};
