import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    const payload = jwt.verify(token, process.env.JWT_SECRET || "chainverify_super_secret_change_me");
    const user = await User.findById(payload.id);
    if (!user || !user.active) return res.status(401).json({ message: "Not authenticated" });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: `Only ${roles.join(" or ")} can do this. You're signed in as ${req.user.role}.` });
    }
    next();
  };
}
