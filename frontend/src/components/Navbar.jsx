import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { todayISO } from "../utils/date";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  // "/" immediately redirects to "/day/:today", so the board link's active
  // state is driven off the path prefix rather than an exact "/" match.
  const onBoard = location.pathname === "/" || location.pathname.startsWith("/day");

  return (
    <header className="navbar">
      <NavLink to="/" className="logo">
        TTT
      </NavLink>
      <nav>
        <NavLink to={`/day/${todayISO()}`} className={onBoard ? "active" : ""}>
          Board
        </NavLink>
        <NavLink to="/github">GitHub</NavLink>
        <NavLink to="/settings">Settings</NavLink>
        <NavLink to="/readme">Read me!</NavLink>
        <button className="marker-btn small" onClick={handleLogout}>
          Log out
        </button>
      </nav>
    </header>
  );
}
