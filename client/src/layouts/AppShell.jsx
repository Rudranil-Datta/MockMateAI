import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { ApiError } from "../api/httpClient.js";
import Button from "../components/common/Button.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import useAuth from "../hooks/useAuth.js";

const navigation = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Practice", path: "/practice" },
  { label: "Resumes", path: "/resumes" },
];

function AppShell() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const closeMenu = () => setIsMenuOpen(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    setLogoutError("");

    try {
      await logout();
      closeMenu();
      navigate("/login", { replace: true });
    } catch (error) {
      setLogoutError(
        error instanceof ApiError
          ? error.message
          : "Unable to log out. Please try again.",
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink className="brand" to="/dashboard" onClick={closeMenu}>
          <span className="brand-mark" aria-hidden="true">
            M
          </span>
          <span>MockMateAI</span>
        </NavLink>
        <button
          className="icon-button menu-trigger"
          type="button"
          aria-label={isMenuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
        >
          {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
        <nav
          className={isMenuOpen ? "primary-nav is-open" : "primary-nav"}
          aria-label="Primary navigation"
        >
          {navigation.map((item) => (
            <NavLink
              className={({ isActive }) =>
                isActive ? "nav-link is-active" : "nav-link"
              }
              key={item.path}
              to={item.path}
              onClick={closeMenu}
            >
              {item.label}
            </NavLink>
          ))}
          <NavLink className="profile-link" to="/account" onClick={closeMenu}>
            <span className="avatar" aria-hidden="true">
              {user?.name?.slice(0, 1).toUpperCase() || "M"}
            </span>
            <span>Profile</span>
          </NavLink>
          <Button
            className="logout-button"
            isLoading={isLoggingOut}
            onClick={handleLogout}
          >
            <LogOut aria-hidden="true" size={16} />
            Log out
          </Button>
        </nav>
      </header>
      <main className="app-content">
        {logoutError ? (
          <InlineAlert tone="error">{logoutError}</InlineAlert>
        ) : null}
        <Outlet />
      </main>
    </div>
  );
}

export default AppShell;
