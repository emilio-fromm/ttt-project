import { createContext, useContext, useEffect, useState } from "react";
import { entriesApi } from "./api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("ttt_token");
    if (!token) {
      setLoading(false);
      return;
    }
    entriesApi
      .get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem("ttt_token"))
      .finally(() => setLoading(false));
  }, []);

  function login(token, userObj) {
    localStorage.setItem("ttt_token", token);
    setUser(userObj);
  }

  function logout() {
    localStorage.removeItem("ttt_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
