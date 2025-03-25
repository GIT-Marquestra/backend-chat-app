import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_USER_PASS } from "../config";

// Extend Express Request to include the custom `id` property
interface AuthenticatedRequest extends Request {
  id?: string;
}

export function userMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = req.headers["authorization"];
  
  // Check if the token is provided
  if (!token) {
    console.log("Token missing");
    res.status(401).json({ message: "Token is missing" });
    return 
  }

  try {
    // Verify the JWT token
    const decoded = jwt.verify(token, JWT_USER_PASS as string) as jwt.JwtPayload;

    // Attach the user ID to the request object
    req.id = decoded.id;

    console.log("Token:", token); 
    next();
  } catch (error) {
    console.error("JWT Error:", error);
    res.status(401).json({ message: "Invalid token" });
  }
}