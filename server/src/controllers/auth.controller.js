import jwt from "jsonwebtoken";
import User, { ROLES } from "../models/User.js";
import monitorBus from "../services/monitorBus.js";
import { broadcastDataChange } from "../services/socketManager.js";

// Classroom mode: everyone shares one password, and picks their own display
// name + role at login. This trades per-person credentials for something a
// room full of people can use instantly during a live demo.
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "demo123";

const ROLE_COMPANY = {
  "Procurement Officer": "ChainVerify Corp",
  "Warehouse Officer": "ChainVerify Corp",
  "Finance Officer": "ChainVerify Corp",
  Vendor: "Independent Vendor",
  Auditor: "ChainVerify Corp",
};

const AVATAR_COLORS = ["#6366f1", "#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#a855f7", "#14b8a6"];

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "chainverify_super_secret_change_me", {
    expiresIn: "12h",
  });
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function login(req, res, next) {
  try {
    const { name, role, password } = req.body;
    const cleanName = (name || "").trim();

    if (!cleanName) {
      return res.status(400).json({ message: "Please enter your name" });
    }
    if (!ROLES.includes(role)) {
      return res.status(400).json({ message: "Please select a valid role" });
    }

    monitorBus.info(`POST /api/auth/login (${cleanName} as ${role})`);

    if (password !== DEMO_PASSWORD) {
      monitorBus.error(`Login failed — wrong shared password for ${cleanName}`);
      return res.status(401).json({ message: `Incorrect password. The shared classroom password is "${DEMO_PASSWORD}".` });
    }

    // One person can hold one identity per role (e.g. "Alex" as Vendor and
    // "Alex" as Finance Officer are two separate demo identities).
    const email = `${slugify(cleanName)}-${slugify(role)}@classroom.demo`;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: cleanName,
        email,
        password: DEMO_PASSWORD,
        role,
        company: ROLE_COMPANY[role],
        avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      });
      monitorBus.success(`New classroom identity created — ${cleanName} (${role})`);
    } else if (user.name !== cleanName) {
      user.name = cleanName;
      await user.save();
    }

    const token = signToken(user);
    monitorBus.success(`Login SUCCESS — ${user.name} (${user.role})`);
    broadcastDataChange("user_login", { name: user.name, role: user.role, email: user.email });
    res.json({ token, user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res) {
  res.json({ user: req.user.toSafeJSON() });
}

export async function listRoles(req, res) {
  res.json({ roles: ROLES });
}

export default { login, me, listRoles };
