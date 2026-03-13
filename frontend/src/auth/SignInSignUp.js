import React, { useState } from "react";
import { auth } from "../Firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export default function SignInSignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        if (password !== confirmPassword) {
          toast.error("Passwords do not match!");
          setLoading(false);
          return;
        }

        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: name });
        toast.success("✅ Account created successfully!");
        navigate("/upload");
      } else {
        const userCred = await signInWithEmailAndPassword(auth, email, password);

        // Check if this user is admin
        if (email === "admin@quickprint.com") {
          localStorage.setItem("isAdmin", "true");
          navigate("/admin");
        } else {
          localStorage.setItem("isAdmin", "false");
          navigate("/upload");
        }

        toast.success("✅ Logged in successfully!");
      }
    } catch (err) {
      console.error(err);
      let errorMessage = err.message;
      if (err.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email";
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = "Incorrect password";
      } else if (err.code === 'auth/email-already-in-use') {
        errorMessage = "Email already in use";
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = () => {
    navigate('/admin_login');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">QuickPrint</h2>
        <p className="auth-subtitle">Fast, reliable printing at your fingertips</p>

        {/* Tabs */}
        <div className="tabs">
          <button
            type="button"
            className={`tab-btn ${!isRegister ? "active" : ""}`}
            onClick={() => setIsRegister(false)}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`tab-btn ${isRegister ? "active" : ""}`}
            onClick={() => setIsRegister(true)}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-row">
              <label className="input-label">Name</label>
              <input
                type="text"
                className="input"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-row">
            <label className="input-label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <label className="input-label">Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {isRegister && (
            <div className="form-row">
              <label className="input-label">Confirm Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
          >
            {loading ? "Please wait..." : (isRegister ? "Sign Up" : "Sign In")}
          </button>
        </form>

        <button 
          className="btn-secondary" 
          style={{ marginTop: '10px' }}
          onClick={handleAdminLogin}
        >
          Login As Admin
        </button>

        {!isRegister && (
          <p className="small-muted" style={{ marginTop: 16 }}>
            Demo: admin@quickprint.com / any password
          </p>
        )}
      </div>
    </div>
  );
}