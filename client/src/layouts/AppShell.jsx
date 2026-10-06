import {
  BriefcaseBusiness,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  NotebookTabs,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { ApiError } from "../api/httpClient.js";
import Button from "../components/common/Button.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import useAuth from "../hooks/useAuth.js";

const navigation = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: GraduationCap, label: "Practice", path: "/practice" },
  { icon: BriefcaseBusiness, label: "Targets", path: "/targets" },
  { icon: FolderKanban, label: "Projects", path: "/projects" },
  { icon: NotebookTabs, label: "Skills", path: "/skills" },
  { icon: UserRound, label: "Resumes", path: "/resumes" },
];

function AppShell() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const triggerRef = useRef(null);
  const closeMenu = () => setIsMenuOpen(false);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape" && isMenuOpen) {
        closeMenu();
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isMenuOpen]);

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
          ref={triggerRef}
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
              <item.icon aria-hidden="true" size={17} />
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
