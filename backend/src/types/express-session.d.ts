declare module "express-session" {
  const session: (options: any) => any;
  export default session;

  export interface Session {
    userId?: string;
    destroy: (callback: (err?: any) => void) => void;
  }

  export interface SessionData {
    userId?: string;
  }
}

declare namespace Express {
  interface Request {
    session: import("express-session").Session;
  }
}

