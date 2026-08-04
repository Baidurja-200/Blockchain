import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { login as loginRequest } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("cv_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) localStorage.setItem("cv_user", JSON.stringify(user));
    else localStorage.removeItem("cv_user");
  }, [user]);

  const login = useCallback(async (name, role, password) => {
    setLoading(true);
    try {
      let loggedInUser;
      try {
        const res = await loginRequest({ name, role, password });
        loggedInUser = res.user;
        if (res.token) localStorage.setItem("cv_token", res.token);
      } catch (err) {
        // Static GitHub Pages fallback
        loggedInUser = {
          name,
          role,
          email: `${name.toLowerCase().replace(/\s+/g, ".")}@hashflow.demo`,
          avatarColor: "#6366f1",
        };
        localStorage.setItem("cv_token", "demo-token-" + Date.now());
      }
      setUser(loggedInUser);
      return loggedInUser;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("cv_token");
    localStorage.removeItem("cv_user");
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
