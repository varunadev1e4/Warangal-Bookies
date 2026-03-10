import { useState, useEffect, Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(e) { return { err: e }; }
  componentDidCatch(e, info) { console.error("RENDER CRASH:", e, info); }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 40, fontFamily: "sans-serif", background: "#faf6ef", minHeight: "100vh" }}>
          <div style={{ background: "#fee2e2", border: "2px solid #fca5a5", borderRadius: 12, padding: 28, maxWidth: 680, margin: "60px auto" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#dc2626", marginBottom: 12 }}>💥 Render crash — here is the exact error:</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#7f1d1d", marginBottom: 12, background: "#fff", padding: 14, borderRadius: 8 }}>
              {this.state.err.message}
            </div>
            <pre style={{ fontSize: 11, color: "#7f1d1d", background: "#fff8f8", padding: 16, borderRadius: 8, overflowX: "auto", whiteSpace: "pre-wrap", maxHeight: 300, overflowY: "auto" }}>
              {this.state.err.stack}
            </pre>
            <div style={{ marginTop: 16, fontSize: 13, color: "#666" }}>
              Screenshot this and share it — it will show exactly what broke and where.
            </div>
            <button onClick={() => window.location.reload()}
              style={{ marginTop: 16, padding: "10px 20px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE CONFIG — replace these two values after you create your project
// ─────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://aycyyddqyytaenwnksaa.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_gZNhwY9KteONQi-m6h4Edw_fnISCGn-";

// ── Tiny Supabase client (no npm package needed) ──────────────────────────
const sb = {
  headers: {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    "Prefer": "return=representation",
  },
  url: (table, query = "") => `${SUPABASE_URL}/rest/v1/${table}${query}`,

  async select(table, query = "") {
    const r = await fetch(this.url(table, query), { headers: this.headers });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async insert(table, data) {
    const r = await fetch(this.url(table), {
      method: "POST", headers: { ...this.headers, "Prefer": "return=representation" },
      body: JSON.stringify(Array.isArray(data) ? data : [data]),
    });
    if (!r.ok) throw new Error(await r.text());
    // Supabase may return 204 No Content — handle gracefully
    const text = await r.text();
    if (!text || text === "null") return null;
    const json = JSON.parse(text);
    return Array.isArray(data) ? json : (json[0] ?? null);
  },
  async update(table, match, data) {
    const query = "?" + Object.entries(match).map(([k, v]) => `${k}=eq.${v}`).join("&");
    const r = await fetch(this.url(table, query), {
      method: "PATCH", headers: this.headers,
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error(await r.text());
    const json = await r.json();
    return json[0];
  },
  async delete(table, match) {
    const query = "?" + Object.entries(match).map(([k, v]) => `${k}=eq.${v}`).join("&");
    const r = await fetch(this.url(table, query), { method: "DELETE", headers: this.headers });
    if (!r.ok) throw new Error(await r.text());
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const ADMIN_INVITE_CODE = "BOOKIES@ADMIN";
const COVERS = ["📗", "📘", "📙", "📕", "📓", "📔"];

function makeAvatar(name) {
  const p = name.trim().split(" ");
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}
function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function isOverdue(due) { return new Date(due) < new Date(); }

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
const iStyle = { width: "100%", padding: "9px 12px", border: "1.5px solid #e0d5c5", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginTop: 4 };
const lStyle = { fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#8b5e3c", display: "block" };

function Field({ label, children }) {
  return <div style={{ marginBottom: 14 }}><label style={lStyle}>{label}</label>{children}</div>;
}

function Btn({ children, onClick, variant = "primary", small, disabled, style = {} }) {
  const base = { display: "inline-flex", alignItems: "center", gap: 6, border: "none", cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 600, borderRadius: 8, opacity: disabled ? 0.6 : 1, ...style };
  const sizes = small ? { padding: "6px 12px", fontSize: 12 } : { padding: "9px 18px", fontSize: 13 };
  const variants = {
    primary: { background: "#1a1008", color: "#fff" },
    gold: { background: "#c9883a", color: "#fff" },
    outline: { background: "none", border: "1.5px solid #d4c9b8", color: "#8b5e3c" },
    danger: { background: "#fee2e2", color: "#dc2626" },
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...sizes, ...variants[variant] }}>{children}</button>;
}

function Badge({ type, children }) {
  const s = {
    green: { background: "#dcfce7", color: "#166534" },
    yellow: { background: "#fef9c3", color: "#854d0e" },
    red: { background: "#fee2e2", color: "#dc2626" },
    gold: { background: "#c9883a", color: "#fff" },
    gray: { background: "#f3f4f6", color: "#6b7280" },
  };
  return <span style={{ ...s[type], fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 3 }}>{children}</span>;
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
      {tabs.map(([id, label]) => (
        <button key={id} onClick={() => onChange(id)} style={{
          padding: "8px 16px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit",
          border: `1.5px solid ${active === id ? "#1a1008" : "#e0d5c5"}`,
          background: active === id ? "#1a1008" : "transparent",
          color: active === id ? "#fff" : "#8b5e3c",
        }}>{label}</button>
      ))}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: 460, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "#1a1008", margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#888" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toast({ msg, type = "success" }) {
  const bg = type === "error" ? "#dc2626" : "#1a1008";
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, background: bg, color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 14, zIndex: 2000, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", maxWidth: 340 }}>
      {type === "error" ? "⚠ " : "✓ "}{msg}
    </div>
  );
}

function Spinner({ size = 20 }) {
  return (
    <div style={{
      width: size, height: size, border: `2px solid #e0d5c5`, borderTop: `2px solid #c9883a`,
      borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block"
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function LoadingScreen({ message = "Loading…" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 16, background: "#faf6ef" }}>
      <div style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 900, color: "#c9883a" }}>Warangal Bookies</div>
      <Spinner size={32} />
      <div style={{ fontSize: 14, color: "#8b5e3c" }}>{message}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH PAGE
// ─────────────────────────────────────────────────────────────────────────────
function AuthPage({ onLoginSuccess }) {
  const [mode, setMode] = useState("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [signupCode, setSignupCode] = useState("");
  const [showCodeHint, setShowCodeHint] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupRole, setSignupRole] = useState("member");

  async function handleLogin() {
    setLoginError(""); setLoginLoading(true);
    try {
      const rows = await sb.select("users", `?email=eq.${encodeURIComponent(loginEmail.trim().toLowerCase())}`);
      if (!rows.length || rows[0].password !== loginPassword) {
        setLoginError("Wrong email or password.");
      } else {
        onLoginSuccess(rows[0]);
      }
    } catch (e) {
      setLoginError("Connection error. Check your Supabase config.");
    } finally { setLoginLoading(false); }
  }

  async function handleSignup() {
    setSignupError("");
    if (!signupName.trim()) return setSignupError("Please enter your full name.");
    if (!signupEmail.trim() || !signupEmail.includes("@")) return setSignupError("Please enter a valid email.");
    if (signupPassword.length < 6) return setSignupError("Password must be at least 6 characters.");
    if (signupPassword !== signupConfirm) return setSignupError("Passwords do not match.");
    if (signupCode.trim() && signupCode.trim() !== ADMIN_INVITE_CODE) return setSignupError("Invalid admin invite code. Leave blank to join as a regular member.");

    setSignupLoading(true);
    try {
      const existing = await sb.select("users", `?email=eq.${encodeURIComponent(signupEmail.trim().toLowerCase())}`);
      if (existing.length) { setSignupError("An account with this email already exists."); setSignupLoading(false); return; }

      const role = signupCode.trim() === ADMIN_INVITE_CODE ? "admin" : "member";
      const emailKey = signupEmail.trim().toLowerCase();
      await sb.insert("users", {
        name: signupName.trim(),
        email: emailKey,
        password: signupPassword,
        role,
        avatar: makeAvatar(signupName),
        points: 0,
        books_lent: 0,
        meetups_attended: 0,
      });
      setSignupRole(role);
      setSignupSuccess(true);
      // Wait for the success screen, then re-fetch fresh from DB right before login
      // (avoids stale closure and Supabase replication delay)
      setTimeout(async () => {
        try {
          const rows2 = await sb.select("users", "?email=eq." + encodeURIComponent(emailKey));
          const freshUser = rows2[0];
          if (!freshUser || !freshUser.id || !freshUser.name) {
            setSignupSuccess(false);
            setSignupError("Account created! Please sign in manually.");
            return;
          }
          onLoginSuccess(freshUser);
        } catch (e) {
          setSignupSuccess(false);
          setSignupError("Account created! Please sign in manually.");
        }
      }, 1800);
    } catch (e) {
      setSignupError("Could not create account. " + e.message);
    } finally { setSignupLoading(false); }
  }

  const leftPanel = (
    <div style={{ flex: 1, background: "#1a1008", display: window.innerWidth < 640 ? "none" : "flex", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,136,58,0.2), transparent 70%)" }} />
      <div style={{ fontSize: 52, fontWeight: 900, color: "#c9883a", lineHeight: 1.1, fontFamily: "Georgia, serif" }}>Warangal<br />Bookies</div>
      <div style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", marginTop: 16, lineHeight: 1.9, maxWidth: 340 }}>
        A community of passionate readers from Warangal — sharing stories, lending books, and celebrating literature together.
      </div>
      <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12 }}>
        {[["📅", "Monthly meetups & discussions"], ["📚", "Community book library"], ["🏆", "Points & leaderboard"], ["🔄", "Easy book lending"]].map(([icon, text]) => (
          <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "rgba(255,255,255,0.45)" }}>
            <span style={{ fontSize: 18 }}>{icon}</span>{text}
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 40, right: 50, fontSize: 140, opacity: 0.05 }}>📚</div>
    </div>
  );

  if (signupSuccess) return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "sans-serif" }}>
      {leftPanel}
      <div style={{ width: 440, background: "#faf6ef", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "60px 48px", textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>{signupRole === "admin" ? "👑" : "🎉"}</div>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, color: "#1a1008" }}>
          {signupRole === "admin" ? "Welcome, Admin!" : "Welcome to the club!"}
        </div>
        <div style={{ fontSize: 14, color: "#8b5e3c", marginTop: 8, lineHeight: 1.7 }}>Your account has been saved. Signing you in…</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "sans-serif" }}>
      {leftPanel}
      <div style={{ width: "min(440px, 100vw)", background: "#faf6ef", display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px clamp(20px, 6vw, 48px)", overflowY: "auto" }}>
        <div style={{ display: "flex", background: "#f0e8d8", borderRadius: 10, padding: 4, marginBottom: 24 }}>
          {[["login", "Sign In"], ["signup", "Create Account"]].map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setLoginError(""); setSignupError(""); }} style={{
              flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer",
              fontFamily: "inherit", fontWeight: 600, fontSize: 13,
              background: mode === m ? "#1a1008" : "transparent",
              color: mode === m ? "#fff" : "#8b5e3c",
            }}>{label}</button>
          ))}
        </div>

        {mode === "login" ? (
          <>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, color: "#1a1008", marginBottom: 4 }}>Welcome back</div>
            <div style={{ fontSize: 13, color: "#8b5e3c", marginBottom: 24 }}>Sign in to your book club account</div>
            <Field label="Email Address">
              <input style={iStyle} type="email" value={loginEmail} placeholder="you@example.com"
                onChange={e => { setLoginEmail(e.target.value); setLoginError(""); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </Field>
            <Field label="Password">
              <input style={iStyle} type="password" value={loginPassword} placeholder="••••••••"
                onChange={e => { setLoginPassword(e.target.value); setLoginError(""); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </Field>
            {loginError && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>⚠ {loginError}</div>}
            <Btn onClick={handleLogin} disabled={loginLoading} style={{ width: "100%", justifyContent: "center", gap: 10 }}>
              {loginLoading ? <><Spinner size={14} /> Signing in…</> : "Sign In →"}
            </Btn>
            <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#8b5e3c" }}>
              New here?{" "}
              <button onClick={() => setMode("signup")} style={{ background: "none", border: "none", color: "#c9883a", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Create an account</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, color: "#1a1008", marginBottom: 4 }}>Join Warangal Bookies</div>
            <div style={{ fontSize: 13, color: "#8b5e3c", marginBottom: 20 }}>Create your free member account</div>
            <Field label="Full Name"><input style={iStyle} value={signupName} placeholder="e.g. Sita Reddy" onChange={e => { setSignupName(e.target.value); setSignupError(""); }} /></Field>
            <Field label="Email Address"><input style={iStyle} type="email" value={signupEmail} placeholder="you@example.com" onChange={e => { setSignupEmail(e.target.value); setSignupError(""); }} /></Field>
            <Field label="Password"><input style={iStyle} type="password" value={signupPassword} placeholder="Min. 6 characters" onChange={e => { setSignupPassword(e.target.value); setSignupError(""); }} /></Field>
            <Field label="Confirm Password"><input style={iStyle} type="password" value={signupConfirm} placeholder="Re-enter password" onChange={e => { setSignupConfirm(e.target.value); setSignupError(""); }} /></Field>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label style={lStyle}>Admin Invite Code <span style={{ color: "#aaa", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
                <button onClick={() => setShowCodeHint(!showCodeHint)} style={{ background: "none", border: "none", fontSize: 12, color: "#c9883a", cursor: "pointer", fontFamily: "inherit" }}>{showCodeHint ? "Hide" : "What's this?"}</button>
              </div>
              {showCodeHint && <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#92400e", marginBottom: 6, lineHeight: 1.6 }}>Have a secret admin invite code? Enter it here to create an admin account. Leave blank to join as a regular member.</div>}
              <input style={{ ...iStyle, borderColor: signupCode && signupCode === ADMIN_INVITE_CODE ? "#22c55e" : signupCode ? "#fca5a5" : "#e0d5c5" }}
                type="password" value={signupCode} placeholder="Enter code if you have one…"
                onChange={e => { setSignupCode(e.target.value); setSignupError(""); }}
                onKeyDown={e => e.key === "Enter" && handleSignup()} />
              {signupCode === ADMIN_INVITE_CODE && <div style={{ fontSize: 12, color: "#16a34a", marginTop: 4 }}>✓ Valid code — you'll be signed up as an <strong>Admin</strong> 👑</div>}
            </div>
            {signupError && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>⚠ {signupError}</div>}
            <Btn onClick={handleSignup} disabled={signupLoading} style={{ width: "100%", justifyContent: "center", gap: 10 }}>
              {signupLoading ? <><Spinner size={14} /> Creating account…</> : signupCode === ADMIN_INVITE_CODE ? "Create Admin Account →" : "Create Account →"}
            </Btn>
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#8b5e3c" }}>
              Already a member?{" "}
              <button onClick={() => setMode("login")} style={{ background: "none", border: "none", color: "#c9883a", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Sign in</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR (desktop) + MOBILE NAV
// ─────────────────────────────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

function Sidebar({ user, page, setPage, onLogout, pendingCount = 0 }) {
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const NAV = [
    { id: "dashboard", icon: "🏠", label: "Dashboard" },
    { id: "about", icon: "ℹ️", label: "About" },
    { id: "books", icon: "📚", label: "Books" },
    { id: "meetups", icon: "📅", label: "Meetups" },
    { id: "leaderboard", icon: "🏆", label: "Leaderboard" },
    { id: "loans", icon: "🔄", label: "Book Loans", badge: pendingCount },
    ...(user.role === "admin" ? [{ id: "admin", icon: "⚙️", label: "Admin" }] : []),
  ];

  const navBtn = (id, icon, label, badge = 0, onClick) => (
    <button key={id} onClick={() => { setPage(id); if (onClick) onClick(); }} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 14px",
      borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500,
      fontFamily: "sans-serif", textAlign: "left", marginBottom: 2,
      background: page === id ? "#c9883a" : "rgba(255,255,255,0.04)",
      color: page === id ? "#1a1008" : "rgba(255,255,255,0.6)",
    }}>
      <span style={{ width: 22, textAlign: "center" }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge > 0 && <span style={{ background: "#ef4444", color: "#fff", borderRadius: 20, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>{badge}</span>}
    </button>
  );

  // ── Mobile: top bar + slide-down menu ──
  if (isMobile) return (
    <>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, background: "#1a1008", display: "flex", alignItems: "center", padding: "0 16px", height: 52, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 900, color: "#c9883a", flex: 1 }}>Warangal Bookies</div>
        {pendingCount > 0 && <span style={{ background: "#ef4444", color: "#fff", borderRadius: 20, fontSize: 10, fontWeight: 700, padding: "2px 7px", marginRight: 10 }}>{pendingCount}</span>}
        <button onClick={() => setMenuOpen(o => !o)} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", padding: 4 }}>
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>
      {menuOpen && (
        <div style={{ position: "fixed", top: 52, left: 0, right: 0, zIndex: 199, background: "#1a1008", padding: "10px 12px 16px", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
          {NAV.map(n => navBtn(n.id, n.icon, n.label, n.badge || 0, () => setMenuOpen(false)))}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 10, paddingTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#c9883a", color: "#1a1008", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{user.avatar}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{user.name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "capitalize" }}>{user.role}</div>
            </div>
            <button onClick={onLogout} style={{ background: "#fee2e2", border: "none", color: "#dc2626", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>Logout</button>
          </div>
        </div>
      )}
    </>
  );

  // ── Desktop: fixed left sidebar ──
  return (
    <div style={{ width: 240, background: "#1a1008", display: "flex", flexDirection: "column", flexShrink: 0, height: "100vh", position: "sticky", top: 0 }}>
      <div style={{ padding: "24px 18px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 900, color: "#c9883a" }}>Warangal Bookies</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 2, textTransform: "uppercase", marginTop: 3 }}>Book Club · Warangal</div>
      </div>
      <div style={{ flex: 1, padding: "14px 10px", overflowY: "auto" }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: 2, textTransform: "uppercase", padding: "4px 10px 8px" }}>Menu</div>
        {NAV.map(n => navBtn(n.id, n.icon, n.label, n.badge || 0))}
      </div>
      <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#c9883a", color: "#1a1008", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{user.avatar}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "capitalize" }}>{user.role}</div>
        </div>
        <button onClick={onLogout} title="Logout" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "rgba(255,255,255,0.4)", padding: 4 }}>⏏</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function Dashboard({ user, books, meetups, loans, loanRequests, setPage, loading }) {
  if (!user) return null;

  const safeBooks = (books || []).filter(b => b && b.id);
  const safeMeetups = (meetups || []).filter(m => m && m.id);
  const safeLoans = (loans || []).filter(l => l && l.id);
  const safeLoanReqs = (loanRequests || []).filter(r => r && r.id);

  const myBooks = safeBooks.filter(b => b.owner_id === user.id);
  const activeLoans = safeLoans.filter(l =>
    (l.lender_id === user.id || l.borrower_id === user.id) && l.status === "active"
  );
  const pendingForMe = safeLoanReqs.filter(r =>
    r.status === "pending" && (
      (r.type === "request" && r.book_owner_id === user.id) ||
      (r.type === "offer" && r.requester_id === user.id)
    )
  );
  const upcomingMeetups = safeMeetups.filter(m => m.status === "upcoming");
  const safeDate = d => { try { const dt = new Date(d); return isNaN(dt.getTime()) ? null : dt; } catch { return null; } };

  const stats = [
    { icon: "⭐", val: user.points || 0, label: "Points" },
    { icon: "📅", val: user.meetups_attended || 0, label: "Meetups" },
    { icon: "📚", val: myBooks.length, label: "Books Owned" },
    { icon: "🔄", val: activeLoans.length, label: "Active Loans" },
  ];

  return (
    <div style={{ padding: "clamp(14px, 4vw, 28px)" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#8b5e3c" }}>Welcome back,</div>
        <div style={{ fontFamily: "Georgia, serif", fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 700, color: "#1a1008" }}>{user.name} 👋</div>
      </div>

      {pendingForMe.length > 0 && (
        <div onClick={() => setPage("loans")} style={{ background: "#fffbeb", border: "1.5px solid #f59e0b", borderRadius: 12, padding: "12px 18px", marginBottom: 18, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
          <span style={{ fontSize: 22 }}>🔔</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#92400e" }}>{pendingForMe.length} loan request{pendingForMe.length > 1 ? "s" : ""} waiting for you</div>
            <div style={{ fontSize: 12, color: "#b45309" }}>Tap to review and respond</div>
          </div>
          <span style={{ color: "#b45309", fontSize: 18 }}>→</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12, marginBottom: 20 }}>
        {stats.map(({ icon, val, label }) => (
          <div key={label} style={{ background: "#fff", border: "1px solid #e8ddd0", borderRadius: 12, padding: "16px 14px" }}>
            {loading
              ? <div style={{ height: 54, display: "flex", alignItems: "center", justifyContent: "center" }}><Spinner size={20} /></div>
              : <>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, color: "#1a1008" }}>{val}</div>
                  <div style={{ fontSize: 11, color: "#8b5e3c", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>{label}</div>
                </>
            }
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        <div style={{ background: "#fff", border: "1px solid #e8ddd0", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700 }}>Upcoming Meetups</div>
            <Btn onClick={() => setPage("meetups")} variant="outline" small>View all</Btn>
          </div>
          {loading
            ? <div style={{ display: "flex", justifyContent: "center", padding: 20 }}><Spinner /></div>
            : upcomingMeetups.length === 0
              ? <div style={{ color: "#aaa", fontSize: 13 }}>No upcoming meetups yet.</div>
              : upcomingMeetups.slice(0, 2).map(m => {
                  const dt = safeDate(m.date);
                  const attending = Array.isArray(m.attendees) && m.attendees.includes(user.id);
                  return (
                    <div key={m.id} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                      <div style={{ background: "#1a1008", color: "#fff", borderRadius: 8, padding: "8px 10px", textAlign: "center", minWidth: 42, flexShrink: 0 }}>
                        <div style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{dt ? dt.getDate() : "?"}</div>
                        <div style={{ fontSize: 9, opacity: 0.5, textTransform: "uppercase" }}>{dt ? dt.toLocaleString("en", { month: "short" }) : ""}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{m.title || "Untitled"}</div>
                        <div style={{ fontSize: 12, color: "#8b5e3c" }}>📍 {m.venue || "TBD"}</div>
                        {attending && <Badge type="green">✓ Attending</Badge>}
                      </div>
                    </div>
                  );
                })
          }
        </div>

        <div style={{ background: "#fff", border: "1px solid #e8ddd0", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700 }}>My Active Loans</div>
            <Btn onClick={() => setPage("loans")} variant="outline" small>View all</Btn>
          </div>
          {loading
            ? <div style={{ display: "flex", justifyContent: "center", padding: 20 }}><Spinner /></div>
            : activeLoans.length === 0
              ? <div style={{ color: "#aaa", fontSize: 13 }}>No active loans right now.</div>
              : activeLoans.slice(0, 3).map(l => (
                <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f5f0e8" }}>
                  <span style={{ fontSize: 20 }}>📗</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{l.book_title || "Unknown book"}</div>
                    <div style={{ fontSize: 12, color: "#8b5e3c" }}>{l.lender_id === user.id ? `→ ${l.borrower_name || "?"}` : `← ${l.lender_name || "?"}`}</div>
                  </div>
                  <Badge type={isOverdue(l.due_date) ? "red" : "yellow"}>{isOverdue(l.due_date) ? "Overdue" : "Active"}</Badge>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ABOUT
// ─────────────────────────────────────────────────────────────────────────────
function AboutPage({ users }) {
  return (
    <div style={{ padding: 'clamp(14px, 4vw, 28px)' }}>
      <div style={{ background: "#1a1008", color: "#fff", borderRadius: 14, padding: 36, marginBottom: 22, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: 36, top: "50%", transform: "translateY(-50%)", fontSize: 110, opacity: 0.07 }}>📖</div>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 700 }}>Warangal Bookies 📖</div>
        <div style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", marginTop: 10, maxWidth: 500, lineHeight: 1.8 }}>
          A community of passionate readers from Warangal, coming together to share stories, ideas, and the timeless joy of books.
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, marginBottom: 22 }}>
        <div style={{ background: "#fff", border: "1px solid #e8ddd0", borderRadius: 12, padding: 20 }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Our Mission</div>
          <div style={{ fontSize: 14, color: "#555", lineHeight: 1.8 }}>Founded with the belief that reading is better together. We celebrate diverse books, spirited discussion, and a welcoming community.</div>
          <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
            {[["📅", "Monthly\nMeetups"], ["📚", "Shared\nLibrary"], ["🌟", "Points &\nRewards"]].map(([e, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24 }}>{e}</div>
                <div style={{ fontSize: 11, color: "#8b5e3c", marginTop: 4, whiteSpace: "pre-line" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e8ddd0", borderRadius: 12, padding: 20 }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, marginBottom: 10 }}>How It Works</div>
          {["Join and get your member profile", "Add your books to the shared library", "Attend meetups to earn points", "Lend & borrow books for more points", "Climb the leaderboard!"].map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#1a1008", color: "#c9883a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ fontSize: 13, paddingTop: 2 }}>{t}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Our Members</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))", gap: 12 }}>
        {users.map(u => (
          <div key={u.id} style={{ background: "#fff", border: "1px solid #e8ddd0", borderRadius: 12, padding: 16, textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#1a1008", color: "#c9883a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, margin: "0 auto 10px" }}>{u.avatar}</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
            <div style={{ fontSize: 11, color: "#8b5e3c", textTransform: "capitalize" }}>{u.role}</div>
            <div style={{ fontSize: 12, color: "#c9883a", marginTop: 4 }}>⭐ {u.points} pts</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOKS
// ─────────────────────────────────────────────────────────────────────────────
function BooksPage({ books, users, currentUser, onRefresh, showToast, loading }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: "", author: "", genre: "", rating: "4.0" });
  const [saving, setSaving] = useState(false);

  const filtered = (books || []).filter(b => {
    if (!b) return false;
    const q = search.toLowerCase();
    const ok = (b.title || "").toLowerCase().includes(q) || (b.author || "").toLowerCase().includes(q);
    if (filter === "mine") return ok && b.owner_id === currentUser.id;
    if (filter === "available") return ok && b.available;
    return ok;
  });

  async function addBook() {
    if (!form.title.trim() || !form.author.trim()) return;
    setSaving(true);
    try {
      await sb.insert("books", {
        title: form.title.trim(), author: form.author.trim(),
        genre: form.genre.trim(), rating: parseFloat(form.rating) || 4.0,
        owner_id: currentUser.id, owner_name: currentUser.name,
        available: true, cover: COVERS[Math.floor(Math.random() * COVERS.length)],
      });
      setForm({ title: "", author: "", genre: "", rating: "4.0" });
      setModal(false);
      showToast("Book added to library!");
      onRefresh();
    } catch (e) { showToast("Failed to add book: " + e.message, "error"); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ padding: "clamp(14px, 4vw, 28px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 700, color: "#1a1008" }}>Book Library</div>
          <div style={{ fontSize: 13, color: "#8b5e3c" }}>Browse and borrow from our community collection</div>
        </div>
        <Btn onClick={() => setModal(true)}>+ Add Book</Btn>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search books or authors…"
          style={{ padding: "8px 14px", border: "1.5px solid #e0d5c5", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", width: 230 }} />
        <TabBar tabs={[["all", "All Books"], ["available", "Available"], ["mine", "My Books"]]} active={filter} onChange={setFilter} />
      </div>

      {loading
        ? <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner size={36} /></div>
        : filtered.length === 0
          ? <div style={{ textAlign: "center", padding: 60, color: "#aaa", fontSize: 14 }}>No books found.</div>
          : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 14 }}>
              {filtered.map(b => {
                const owner = users.find(u => u.id === b.owner_id);
                return (
                  <div key={b.id} style={{ background: "#fff", border: "1px solid #e8ddd0", borderRadius: 12, padding: 18 }}>
                    <div style={{ fontSize: 38, marginBottom: 10 }}>{b.cover}</div>
                    <div style={{ fontFamily: "Georgia, serif", fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{b.title}</div>
                    <div style={{ fontSize: 13, color: "#8b5e3c", marginTop: 2 }}>by {b.author}</div>
                    {b.genre && <div style={{ fontSize: 11, background: "#f0e8d8", color: "#8b5e3c", borderRadius: 20, padding: "2px 10px", display: "inline-block", margin: "7px 0" }}>{b.genre}</div>}
                    <div style={{ fontSize: 13, color: "#c9883a" }}>{"★".repeat(Math.round(b.rating || 4))} <span style={{ fontSize: 12, color: "#aaa" }}>{b.rating}</span></div>
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>By {owner?.name || b.owner_name || "Unknown"}</div>
                    <div style={{ marginTop: 8 }}><Badge type={b.available ? "green" : "yellow"}>{b.available ? "✓ Available" : "⏳ On Loan"}</Badge></div>
                  </div>
                );
              })}
            </div>
      }

      {modal && (
        <Modal title="Add a Book" onClose={() => setModal(false)}>
          <Field label="Book Title"><input style={iStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Author"><input style={iStyle} value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} /></Field>
          <Field label="Genre"><input style={iStyle} value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })} /></Field>
          <Field label="Rating (1–5)"><input type="number" min="1" max="5" step="0.1" style={iStyle} value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })} /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn variant="outline" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn onClick={addBook} disabled={saving}>{saving ? "Saving…" : "Add Book"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// MEETUPS
// ─────────────────────────────────────────────────────────────────────────────
function MeetupsPage({ meetups, users, currentUser, onRefresh, showToast, loading }) {
  const [tab, setTab] = useState("upcoming");
  const [saving, setSaving] = useState(null);
  const shown = (meetups || []).filter(m => m && m.status === tab);

  async function toggleRSVP(m) {
    const attendees = Array.isArray(m.attendees) ? m.attendees : [];
    const joined = attendees.includes(currentUser.id);
    const updated = joined ? attendees.filter(a => a !== currentUser.id) : [...attendees, currentUser.id];
    setSaving(m.id);
    try {
      await sb.update("meetups", { id: m.id }, { attendees: updated });
      showToast(joined ? "Removed from meetup." : "You're attending! 🎉");
      onRefresh();
    } catch (e) { showToast("Error: " + e.message, "error"); }
    finally { setSaving(null); }
  }

  return (
    <div style={{ padding: "clamp(14px, 4vw, 28px)" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 700, color: "#1a1008" }}>Meetups</div>
        <div style={{ fontSize: 13, color: "#8b5e3c" }}>Join us for our monthly book discussions</div>
      </div>
      <TabBar tabs={[["upcoming", "📅 Upcoming"], ["past", "📜 Past Meetups"]]} active={tab} onChange={setTab} />
      {loading
        ? <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner size={36} /></div>
        : shown.length === 0
          ? <div style={{ textAlign: "center", padding: 60, color: "#8b5e3c" }}>No {tab} meetups.</div>
          : shown.map(m => {
              if (!m || !m.id) return null;
              const joined = Array.isArray(m.attendees) && m.attendees.includes(currentUser.id);
              const host = users.find(u => u.id === m.host_id);
              const safeDate = d => { try { const dt = new Date(d); return isNaN(dt.getTime()) ? null : dt; } catch { return null; } };
              const dt = safeDate(m.date);
              return (
                <div key={m.id} style={{ background: "#fff", border: "1px solid #e8ddd0", borderRadius: 12, padding: "16px 20px", display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ background: "#1a1008", color: "#fff", borderRadius: 10, padding: "8px 12px", textAlign: "center", minWidth: 50, flexShrink: 0 }}>
                    <div style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{dt ? dt.getDate() : "?"}</div>
                    <div style={{ fontSize: 9, opacity: 0.5, textTransform: "uppercase", marginTop: 2 }}>{dt ? dt.toLocaleString("en", { month: "short" }) : ""}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700 }}>{m.title}</div>
                    <div style={{ fontSize: 13, color: "#8b5e3c", marginTop: 4, display: "flex", flexWrap: "wrap", gap: 10 }}>
                      <span>🕕 {m.time}</span><span>📍 {m.venue}</span><span>📗 {m.book}</span>
                      {host?.name && <span>👤 {host.name}</span>}
                    </div>
                    <div style={{ fontSize: 13, color: "#999", marginTop: 6 }}>{m.description}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10, flexWrap: "wrap" }}>
                      {(Array.isArray(m.attendees) ? m.attendees : []).map(aid => {
                        const u = users.find(x => x.id === aid);
                        return (u && u.name) ? <div key={aid} title={u.name} style={{ width: 24, height: 24, borderRadius: "50%", background: "#f0e8d8", color: "#8b5e3c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700 }}>{u.avatar}</div> : null;
                      })}
                      <span style={{ fontSize: 12, color: "#aaa" }}>{(Array.isArray(m.attendees) ? m.attendees : []).length}/{m.max_attendees} attending</span>
                    </div>
                  </div>
                  {m.status === "upcoming" && (
                    <Btn onClick={() => toggleRSVP(m)} variant={joined ? "outline" : "primary"} small disabled={saving === m.id} style={{ flexShrink: 0 }}>
                      {saving === m.id ? "…" : joined ? "✓ Joined" : "RSVP"}
                    </Btn>
                  )}
                </div>
              );
            })
      }
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────────────────────────────────────────
function LeaderboardPage({ users, loading }) {
  const sorted = [...(users || [])].sort((a, b) => (b.points || 0) - (a.points || 0));
  const max = sorted[0]?.points || 1;
  return (
    <div style={{ padding: "clamp(14px, 4vw, 28px)" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 700, color: "#1a1008" }}>Leaderboard</div>
        <div style={{ fontSize: 13, color: "#8b5e3c" }}>Earn points by attending meetups and lending books</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, marginBottom: 22 }}>
        <div style={{ background: "#1a1008", color: "#fff", borderRadius: 12, padding: 22 }}>
          <div style={{ fontSize: 12, opacity: 0.5, textTransform: "uppercase", letterSpacing: 1 }}>🏆 Top Reader</div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, marginTop: 8 }}>{sorted[0]?.name || "—"}</div>
          <div style={{ color: "#c9883a", fontSize: 18, fontWeight: 700, marginTop: 4 }}>{sorted[0]?.points || 0} points</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e8ddd0", borderRadius: 12, padding: 22 }}>
          <div style={{ fontSize: 12, color: "#8b5e3c", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Earn Points</div>
          {[["📅 Attend a meetup", "+20 pts"], ["📚 Lend a book", "+15 pts"], ["🔄 Return a book", "+10 pts"]].map(([l, p]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
              <span>{l}</span><span style={{ fontWeight: 700, color: "#c9883a" }}>{p}</span>
            </div>
          ))}
        </div>
      </div>
      {loading
        ? <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spinner size={36} /></div>
        : <div style={{ background: "#fff", border: "1px solid #e8ddd0", borderRadius: 12, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f0e8d8" }}>
                  {["Rank", "Member", "Meetups", "Books Lent", "Points", "Progress"].map(h => (
                    <th key={h} style={{ textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#8b5e3c", padding: "10px 14px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid #faf5f0" }}>
                    <td style={{ padding: "12px 14px", fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, color: i < 3 ? "#c9883a" : "#aaa" }}>
                      {["🥇", "🥈", "🥉"][i] || `#${i + 1}`}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f0e8d8", color: "#8b5e3c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{u.avatar}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                          {u.role === "admin" && <Badge type="gold">Admin</Badge>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px", color: "#8b5e3c", fontSize: 13 }}>{u.meetups_attended || 0}</td>
                    <td style={{ padding: "12px 14px", color: "#8b5e3c", fontSize: 13 }}>{u.books_lent || 0}</td>
                    <td style={{ padding: "12px 14px" }}><span style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, color: "#c9883a" }}>{u.points || 0}</span></td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ width: 90, height: 6, background: "#f0e8d8", borderRadius: 3 }}>
                        <div style={{ width: `${((u.points || 0) / max) * 100}%`, height: 6, background: "#c9883a", borderRadius: 3 }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      }
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOK LOANS
// ─────────────────────────────────────────────────────────────────────────────
function BookLoansPage({ loans, loanRequests, books, users, currentUser, onRefresh, showToast, loading }) {
  const [tab, setTab] = useState("active");
  const [offerModal, setOfferModal] = useState(false);
  const [requestModal, setRequestModal] = useState(false);
  const [offerForm, setOfferForm] = useState({ bookId: "", borrowerId: "", dueDate: "", message: "" });
  const [reqForm, setReqForm] = useState({ bookId: "", dueDate: "", message: "" });
  const [saving, setSaving] = useState(false);

  const activeLoans = loans.filter(l => l.status === "active" && (l.lender_id === currentUser.id || l.borrower_id === currentUser.id));
  const pastLoans = loans.filter(l => l.status === "returned" && (l.lender_id === currentUser.id || l.borrower_id === currentUser.id));
  const overdueLoans = activeLoans.filter(l => isOverdue(l.due_date));
  const pendingForMe = loanRequests.filter(r => r.status === "pending" && (
    (r.type === "request" && r.book_owner_id === currentUser.id) ||
    (r.type === "offer" && r.requester_id === currentUser.id)
  ));
  const mySentRequests = loanRequests.filter(r => r.status === "pending" && (
    (r.type === "request" && r.requester_id === currentUser.id) ||
    (r.type === "offer" && r.book_owner_id === currentUser.id)
  ));
  const shown = tab === "active" ? activeLoans : tab === "past" ? pastLoans : overdueLoans;

  async function markReturned(loan) {
    setSaving(true);
    try {
      await sb.update("loans", { id: loan.id }, { status: "returned" });
      // Award points to lender
      await sb.update("users", { id: loan.lender_id }, { points: (users.find(u => u.id === loan.lender_id)?.points || 0) + 10 });
      showToast("Marked as returned! +10 points awarded.");
      onRefresh();
    } catch (e) { showToast("Error: " + e.message, "error"); }
    finally { setSaving(false); }
  }

  async function sendOffer() {
    const bk = books.find(b => b.id === parseInt(offerForm.bookId));
    const borrower = users.find(u => u.id === parseInt(offerForm.borrowerId));
    if (!bk || !borrower || !offerForm.dueDate) { showToast("Please fill all fields.", "error"); return; }
    setSaving(true);
    try {
      await sb.insert("loan_requests", {
        type: "offer", book_id: bk.id, book_title: bk.title,
        book_owner_id: currentUser.id, owner_name: currentUser.name,
        requester_id: borrower.id, requester_name: borrower.name,
        message: offerForm.message, proposed_due_date: offerForm.dueDate, status: "pending",
      });
      setOfferForm({ bookId: "", borrowerId: "", dueDate: "", message: "" });
      setOfferModal(false);
      showToast(`Loan offer sent to ${borrower.name}!`);
      onRefresh();
    } catch (e) { showToast("Error: " + e.message, "error"); }
    finally { setSaving(false); }
  }

  async function sendRequest() {
    const bk = books.find(b => b.id === parseInt(reqForm.bookId));
    if (!bk || !reqForm.dueDate) { showToast("Please fill all fields.", "error"); return; }
    const owner = users.find(u => u.id === bk.owner_id);
    setSaving(true);
    try {
      await sb.insert("loan_requests", {
        type: "request", book_id: bk.id, book_title: bk.title,
        book_owner_id: bk.owner_id, owner_name: owner?.name || bk.owner_name,
        requester_id: currentUser.id, requester_name: currentUser.name,
        message: reqForm.message, proposed_due_date: reqForm.dueDate, status: "pending",
      });
      setReqForm({ bookId: "", dueDate: "", message: "" });
      setRequestModal(false);
      showToast(`Request sent to ${owner?.name}!`);
      onRefresh();
    } catch (e) { showToast("Error: " + e.message, "error"); }
    finally { setSaving(false); }
  }

  async function acceptRequest(req) {
    setSaving(true);
    try {
      await sb.insert("loans", {
        book_id: req.book_id, book_title: req.book_title,
        lender_id: req.book_owner_id, lender_name: req.owner_name,
        borrower_id: req.requester_id, borrower_name: req.requester_name,
        lent_date: new Date().toISOString().split("T")[0],
        due_date: req.proposed_due_date, status: "active",
      });
      await sb.update("loan_requests", { id: req.id }, { status: "accepted" });
      await sb.update("books", { id: req.book_id }, { available: false });
      // Award lender points
      const lender = users.find(u => u.id === req.book_owner_id);
      await sb.update("users", { id: req.book_owner_id }, { points: (lender?.points || 0) + 15, books_lent: (lender?.books_lent || 0) + 1 });
      showToast("Loan accepted! It's now active. +15 points!");
      onRefresh();
    } catch (e) { showToast("Error: " + e.message, "error"); }
    finally { setSaving(false); }
  }

  async function declineRequest(req) {
    try {
      await sb.update("loan_requests", { id: req.id }, { status: "declined" });
      showToast("Request declined.");
      onRefresh();
    } catch (e) { showToast("Error: " + e.message, "error"); }
  }

  const availableBooks = books.filter(b => b.available && b.owner_id !== currentUser.id);
  const myBooks = books.filter(b => b.owner_id === currentUser.id);

  return (
    <div style={{ padding: 'clamp(14px, 4vw, 28px)' }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 700, color: "#1a1008" }}>Book Loans</div>
          <div style={{ fontSize: 13, color: "#8b5e3c" }}>Offer to lend your books, or request books from others</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn variant="outline" onClick={() => setRequestModal(true)}>📥 Request a Book</Btn>
          <Btn onClick={() => setOfferModal(true)}>📤 Offer to Lend</Btn>
        </div>
      </div>

      {pendingForMe.length > 0 && (
        <div style={{ background: "#fffbeb", border: "1.5px solid #f59e0b", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#92400e", marginBottom: 12 }}>🔔 {pendingForMe.length} request{pendingForMe.length > 1 ? "s" : ""} waiting for your response</div>
          {pendingForMe.map(req => (
            <div key={req.id} style={{ background: "#fff", borderRadius: 10, padding: "12px 16px", marginBottom: 8, display: "flex", gap: 12, alignItems: "flex-start", border: "1px solid #fde68a" }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>📗</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{req.book_title}</div>
                {req.type === "request"
                  ? <div style={{ fontSize: 13, color: "#8b5e3c", marginTop: 2 }}><strong>{req.requester_name}</strong> wants to borrow this from you</div>
                  : <div style={{ fontSize: 13, color: "#8b5e3c", marginTop: 2 }}><strong>{req.owner_name}</strong> is offering to lend you this book</div>}
                {req.message && <div style={{ fontSize: 12, color: "#999", marginTop: 4, fontStyle: "italic" }}>"{req.message}"</div>}
                <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>Return by: {formatDate(req.proposed_due_date)}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <Btn variant="gold" small disabled={saving} onClick={() => acceptRequest(req)}>✓ Accept</Btn>
                <Btn variant="danger" small disabled={saving} onClick={() => declineRequest(req)}>✗ Decline</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {mySentRequests.length > 0 && (
        <div style={{ background: "#f0f9ff", border: "1.5px solid #bae6fd", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0c4a6e", marginBottom: 10 }}>⏳ Awaiting response</div>
          {mySentRequests.map(req => (
            <div key={req.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid #e0f2fe" }}>
              <span style={{ fontSize: 20 }}>📗</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{req.book_title}</div>
                <div style={{ fontSize: 12, color: "#0369a1" }}>
                  {req.type === "request" ? `Requested from ${req.owner_name || "Unknown"}` : `Offered to ${req.requester_name || "Unknown"}`}
                  {" · "} Due by {formatDate(req.proposed_due_date)}
                </div>
              </div>
              <Badge type="yellow">Pending</Badge>
            </div>
          ))}
        </div>
      )}

      <TabBar tabs={[["active", `📚 Active (${activeLoans.length})`], ["overdue", `⚠️ Overdue (${overdueLoans.length})`], ["past", `✓ Past (${pastLoans.length})`]]} active={tab} onChange={setTab} />

      {loading
        ? <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spinner size={32} /></div>
        : shown.length === 0
        ? <div style={{ textAlign: "center", padding: 50, color: "#8b5e3c", fontSize: 14 }}>No {tab} loans found.</div>
        : shown.map(l => {
          const over = isOverdue(l.due_date) && l.status === "active";
          return (
            <div key={l.id} style={{ background: "#fff", border: `1.5px solid ${over ? "#fca5a5" : "#e8ddd0"}`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
              <span style={{ fontSize: 26 }}>📗</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 14 }}>{l.book_title}</div>
                <div style={{ fontSize: 13, color: "#8b5e3c" }}>{l.lender_id === currentUser.id ? `📤 Lent to ${l.borrower_name}` : `📥 Borrowed from ${l.lender_name}`}</div>
                <div style={{ fontSize: 12, color: "#aaa" }}>Lent: {formatDate(l.lent_date)} · Due: {formatDate(l.due_date)}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <Badge type={l.status === "returned" ? "green" : over ? "red" : "yellow"}>
                  {l.status === "returned" ? "✓ Returned" : over ? "⚠ Overdue" : "Active"}
                </Badge>
                {l.status === "active" && l.lender_id === currentUser.id && (
                  <Btn onClick={() => markReturned(l)} variant="outline" small disabled={saving}>Mark Returned</Btn>
                )}
              </div>
            </div>
          );
        })}

      {offerModal && (
        <Modal title="📤 Offer to Lend a Book" onClose={() => setOfferModal(false)}>
          <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#0369a1" }}>
            The recipient must <strong>accept</strong> before the loan becomes active.
          </div>
          <Field label="Book to Lend">
            <select style={iStyle} value={offerForm.bookId} onChange={e => setOfferForm({ ...offerForm, bookId: e.target.value })}>
              <option value="">Select a book…</option>
              {myBooks.map(b => <option key={b.id} value={b.id}>{b.title}{!b.available ? " (on loan)" : ""}</option>)}
            </select>
          </Field>
          <Field label="Offer to Member">
            <select style={iStyle} value={offerForm.borrowerId} onChange={e => setOfferForm({ ...offerForm, borrowerId: e.target.value })}>
              <option value="">Select member…</option>
              {users.filter(u => u.id !== currentUser.id).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
          <Field label="Proposed Return Date"><input type="date" style={iStyle} value={offerForm.dueDate} onChange={e => setOfferForm({ ...offerForm, dueDate: e.target.value })} /></Field>
          <Field label="Message (optional)"><textarea style={{ ...iStyle, minHeight: 60, resize: "vertical" }} placeholder="e.g. I think you'll love this one!" value={offerForm.message} onChange={e => setOfferForm({ ...offerForm, message: e.target.value })} /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn variant="outline" onClick={() => setOfferModal(false)}>Cancel</Btn>
            <Btn onClick={sendOffer} disabled={saving}>{saving ? "Sending…" : "Send Offer"}</Btn>
          </div>
        </Modal>
      )}

      {requestModal && (
        <Modal title="📥 Request a Book" onClose={() => setRequestModal(false)}>
          <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#0369a1" }}>
            The book owner must <strong>approve</strong> before the loan is confirmed.
          </div>
          <Field label="Book You Want to Borrow">
            <select style={iStyle} value={reqForm.bookId} onChange={e => setReqForm({ ...reqForm, bookId: e.target.value })}>
              <option value="">Select a book…</option>
              {availableBooks.map(b => {
                const owner = users.find(u => u.id === b.owner_id);
                return <option key={b.id} value={b.id}>{b.title} — owned by {owner?.name || b.owner_name}</option>;
              })}
            </select>
          </Field>
          <Field label="Proposed Return Date"><input type="date" style={iStyle} value={reqForm.dueDate} onChange={e => setReqForm({ ...reqForm, dueDate: e.target.value })} /></Field>
          <Field label="Message to Owner (optional)"><textarea style={{ ...iStyle, minHeight: 60, resize: "vertical" }} placeholder="e.g. I've been wanting to read this for ages!" value={reqForm.message} onChange={e => setReqForm({ ...reqForm, message: e.target.value })} /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn variant="outline" onClick={() => setRequestModal(false)}>Cancel</Btn>
            <Btn onClick={sendRequest} disabled={saving}>{saving ? "Sending…" : "Send Request"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────────
function AdminPage({ books, meetups, loans, loanRequests, users, currentUser, onRefresh, showToast, loading }) {
  const [tab, setTab] = useState("meetups");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", time: "", venue: "", book: "", max_attendees: "15", description: "" });

  async function createMeetup() {
    if (!form.title.trim() || !form.date) { showToast("Title and date required.", "error"); return; }
    setSaving(true);
    try {
      await sb.insert("meetups", {
        title: form.title, date: form.date, time: form.time, venue: form.venue,
        book: form.book, max_attendees: parseInt(form.max_attendees) || 15,
        description: form.description, attendees: [], status: "upcoming", host_id: currentUser.id,
      });
      setForm({ title: "", date: "", time: "", venue: "", book: "", max_attendees: "15", description: "" });
      setModal(false);
      showToast("Meetup created!");
      onRefresh();
    } catch (e) { showToast("Error: " + e.message, "error"); }
    finally { setSaving(false); }
  }

  async function deleteMeetup(id) {
    try {
      await sb.delete("meetups", { id });
      showToast("Meetup deleted.");
      onRefresh();
    } catch (e) { showToast("Error: " + e.message, "error"); }
  }

  async function markPast(m) {
    try {
      await sb.update("meetups", { id: m.id }, { status: "past" });
      // Award +20 points to all attendees
      for (const uid of (m.attendees || [])) {
        const u = users.find(x => x.id === uid);
        if (u) await sb.update("users", { id: uid }, { points: (u.points || 0) + 20, meetups_attended: (u.meetups_attended || 0) + 1 });
      }
      showToast(`Meetup marked as past. +20 pts awarded to ${(m.attendees || []).length} attendees!`);
      onRefresh();
    } catch (e) { showToast("Error: " + e.message, "error"); }
  }

  return (
    <div style={{ padding: 'clamp(14px, 4vw, 28px)' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 700, color: "#1a1008" }}>Admin Dashboard</div>
        <div style={{ fontSize: 13, color: "#8b5e3c" }}>Manage meetups, members, and club activities</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 22 }}>
        {[["👥", users.length, "Members"], ["📚", books.length, "Books"], ["📅", meetups.filter(m => m.status === "upcoming").length, "Upcoming"], ["🔄", loans.filter(l => l.status === "active").length, "Active Loans"]].map(([icon, val, label]) => (
          <div key={label} style={{ background: "#fff", border: "1px solid #e8ddd0", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700 }}>{val}</div>
            <div style={{ fontSize: 11, color: "#8b5e3c", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
          </div>
        ))}
      </div>
      <TabBar tabs={[["meetups", "📅 Meetups"], ["members", "👥 Members"], ["loans", "🔄 Loans"]]} active={tab} onChange={setTab} />

      {tab === "meetups" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
            <Btn onClick={() => setModal(true)}>+ Create Meetup</Btn>
          </div>
          {meetups.map(m => (
            <div key={m.id} style={{ background: "#fff", border: "1px solid #e8ddd0", borderRadius: 12, padding: "14px 18px", display: "flex", gap: 14, alignItems: "center", marginBottom: 10 }}>
              <div style={{ background: "#1a1008", color: "#fff", borderRadius: 8, padding: "7px 10px", textAlign: "center", minWidth: 44, flexShrink: 0 }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 700, lineHeight: 1 }}>{new Date(m.date).getDate()}</div>
                <div style={{ fontSize: 9, opacity: 0.5, textTransform: "uppercase" }}>{new Date(m.date).toLocaleString("en", { month: "short" })}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{m.title}</div>
                <div style={{ fontSize: 12, color: "#8b5e3c" }}>{m.time} · {m.venue} · {(m.attendees || []).length} attending</div>
              </div>
              <Badge type={m.status === "upcoming" ? "green" : "gray"}>{m.status}</Badge>
              {m.status === "upcoming" && (
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn variant="gold" small onClick={() => markPast(m)}>✓ Mark Past</Btn>
                  <Btn variant="danger" small onClick={() => deleteMeetup(m.id)}>Delete</Btn>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {tab === "members" && (
        <div style={{ background: "#fff", border: "1px solid #e8ddd0", borderRadius: 12, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
            <thead><tr style={{ borderBottom: "2px solid #f0e8d8" }}>
              {["Member", "Role", "Points", "Meetups", "Books Lent"].map(h => (
                <th key={h} style={{ textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#8b5e3c", padding: "10px 14px" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: "1px solid #faf5f0" }}>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#f0e8d8", color: "#8b5e3c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{u.avatar}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: "#aaa" }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px" }}><Badge type={u.role === "admin" ? "gold" : "gray"}>{u.role}</Badge></td>
                  <td style={{ padding: "12px 14px", fontFamily: "Georgia, serif", fontWeight: 700, color: "#c9883a" }}>{u.points || 0}</td>
                  <td style={{ padding: "12px 14px", color: "#8b5e3c" }}>{u.meetups_attended || 0}</td>
                  <td style={{ padding: "12px 14px", color: "#8b5e3c" }}>{u.books_lent || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "loans" && (
        <>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, marginBottom: 12 }}>All Loans</div>
          <div style={{ background: "#fff", border: "1px solid #e8ddd0", borderRadius: 12, overflow: "hidden", marginBottom: 22 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ borderBottom: "2px solid #f0e8d8" }}>
                {["Book", "Lender", "Borrower", "Due Date", "Status"].map(h => (
                  <th key={h} style={{ textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#8b5e3c", padding: "10px 14px" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {loans.map(l => {
                  const over = isOverdue(l.due_date) && l.status === "active";
                  return (
                    <tr key={l.id} style={{ borderBottom: "1px solid #faf5f0" }}>
                      <td style={{ padding: "11px 14px", fontWeight: 600, fontSize: 13 }}>📗 {l.book_title}</td>
                      <td style={{ padding: "11px 14px", color: "#8b5e3c", fontSize: 13 }}>{l.lender_name}</td>
                      <td style={{ padding: "11px 14px", color: "#8b5e3c", fontSize: 13 }}>{l.borrower_name}</td>
                      <td style={{ padding: "11px 14px", fontSize: 13 }}>{formatDate(l.due_date)}</td>
                      <td style={{ padding: "11px 14px" }}><Badge type={l.status === "returned" ? "green" : over ? "red" : "yellow"}>{l.status === "returned" ? "Returned" : over ? "Overdue" : "Active"}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Pending Requests</div>
          {loanRequests.filter(r => r.status === "pending").length === 0
            ? <div style={{ color: "#aaa", fontSize: 13 }}>No pending requests.</div>
            : loanRequests.filter(r => r.status === "pending").map(r => (
              <div key={r.id} style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", marginBottom: 8, display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 22 }}>📗</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{r.book_title}</div>
                  <div style={{ fontSize: 12, color: "#8b5e3c" }}>
                    {r.type === "request" ? `${r.requester_name} → ${r.owner_name}` : `${r.owner_name} → ${r.requester_name}`}
                    {" · "} Due {formatDate(r.proposed_due_date)}
                  </div>
                </div>
                <Badge type="yellow">Pending</Badge>
              </div>
            ))}
        </>
      )}

      {modal && (
        <Modal title="Create Meetup" onClose={() => setModal(false)}>
          <Field label="Meetup Title"><input style={iStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Date"><input type="date" style={iStyle} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Time (e.g. 6:00 PM)"><input style={iStyle} value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></Field>
          <Field label="Venue"><input style={iStyle} value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} /></Field>
          <Field label="Book to Discuss"><input style={iStyle} value={form.book} onChange={e => setForm({ ...form, book: e.target.value })} /></Field>
          <Field label="Max Attendees"><input type="number" style={iStyle} value={form.max_attendees} onChange={e => setForm({ ...form, max_attendees: e.target.value })} /></Field>
          <Field label="Description"><textarea style={{ ...iStyle, minHeight: 70, resize: "vertical" }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn variant="outline" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn onClick={createMeetup} disabled={saving}>{saving ? "Creating…" : "Create Meetup"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("wb_user");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [page, setPage] = useState("dashboard");
  const [users, setUsers] = useState([]);
  const [books, setBooks] = useState([]);
  const [meetups, setMeetups] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loanRequests, setLoanRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // loadData accepts the user explicitly to avoid any stale closure issues
  async function loadData(loggedInUser) {
    if (!loggedInUser) return;
    setLoading(true);
    setDataLoaded(false);
    try {
      const [u, b, m, l, lr] = await Promise.all([
        sb.select("users", "?order=points.desc"),
        sb.select("books", "?order=title.asc"),
        sb.select("meetups", "?order=date.desc"),
        sb.select("loans", "?order=lent_date.desc"),
        sb.select("loan_requests", "?order=id.desc"),
      ]);
      setUsers(u || []); setBooks(b || []); setMeetups(m || []);
      setLoans(l || []); setLoanRequests(lr || []);
    } catch (e) {
      showToast("Could not load data: " + e.message, "error");
    } finally {
      setLoading(false);
      setDataLoaded(true);
    }
  }

  // On mount: if user was restored from localStorage, load data
  useEffect(() => {
    const saved = localStorage.getItem("wb_user");
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u && u.id) loadData(u);
      } catch { localStorage.removeItem("wb_user"); }
    }
  }, []); // eslint-disable-line

  // Not logged in
  if (!user) return <AuthPage onLoginSuccess={u => {
    if (!u || !u.id || !u.name) {
      alert("Login failed — user profile not found. Please try again.");
      return;
    }
    localStorage.setItem("wb_user", JSON.stringify(u));
    setUser(u);
    setPage("dashboard");
    loadData(u); // pass user directly, no stale closure possible
  }} />;

  // Logged in but data still loading
  if (!dataLoaded) return <LoadingScreen message={"Welcome, " + user.name + "! Loading your book club…"} />;



  const myPending = loanRequests.filter(r => r.status === "pending" && (
    (r.type === "request" && r.book_owner_id === user.id) ||
    (r.type === "offer" && r.requester_id === user.id)
  ));

  // Config not set yet — show a helpful banner instead of crashing
  const configMissing = SUPABASE_URL.includes("YOUR_PROJECT_ID");

  const renderPage = () => {
      const props = { users, books, meetups, loans, loanRequests, currentUser: user, onRefresh: () => loadData(user), showToast, loading };
    if (page === "dashboard") return <Dashboard {...props} setPage={setPage} loading={loading} />;
    if (page === "about") return <AboutPage users={users} />;
    if (page === "books") return <BooksPage {...props} />;
    if (page === "meetups") return <MeetupsPage {...props} />;
    if (page === "leaderboard") return <LeaderboardPage users={users} />;
    if (page === "loans") return <BookLoansPage {...props} />;
    if (page === "admin" && user.role === "admin") return <AdminPage {...props} />;
    return <Dashboard {...props} setPage={setPage} />;
  };

  const isMobile = window.innerWidth < 768;
  return (
    <ErrorBoundary>
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif", background: "#faf6ef", overflow: "hidden" }}>
      <Sidebar user={user} page={page} setPage={setPage} onLogout={() => { localStorage.removeItem("wb_user"); setUser(null); setPage("dashboard"); }} pendingCount={myPending.length} />
      <div style={{ flex: 1, overflowY: "auto", background: "#faf6ef", paddingTop: isMobile ? 52 : 0 }}>
        {configMissing && (
          <div style={{ background: "#1a1008", color: "#c9883a", padding: "12px 24px", fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>⚙️</span>
            <strong>Supabase not configured yet.</strong> Replace <code style={{ background: "rgba(255,255,255,0.1)", padding: "1px 6px", borderRadius: 4 }}>SUPABASE_URL</code> and <code style={{ background: "rgba(255,255,255,0.1)", padding: "1px 6px", borderRadius: 4 }}>SUPABASE_ANON_KEY</code> at the top of App.jsx with your project values. See the setup guide below.
          </div>
        )}
        {loading && (
          <div style={{ position: "fixed", top: 14, right: 24, zIndex: 500, display: "flex", alignItems: "center", gap: 8, background: "#fff", padding: "6px 14px", borderRadius: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", fontSize: 13, color: "#8b5e3c" }}>
            <Spinner size={14} /> Syncing…
          </div>
        )}
        {renderPage()}
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
    </ErrorBoundary>
  );
}
