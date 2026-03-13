import { useState } from "react";
import { auth } from "../Firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

export default function SignInSignUp() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-[400px]">
        <h1 className="text-center text-2xl font-bold text-indigo-700">QuickPrint</h1>
        <p className="text-center text-gray-500 mb-6">Professional printing services</p>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-lg overflow-hidden mb-6">
          <button
            className={`w-1/2 py-2 ${!isSignUp ? "bg-white font-semibold" : ""}`}
            onClick={() => setIsSignUp(false)}
          >
            Sign In
          </button>
          <button
            className={`w-1/2 py-2 ${isSignUp ? "bg-white font-semibold" : ""}`}
            onClick={() => setIsSignUp(true)}
          >
            Sign Up
          </button>
        </div>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <input
              type="text"
              placeholder="Full Name"
              className="w-full border rounded-lg p-3 bg-gray-50"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            className="w-full border rounded-lg p-3 bg-gray-50"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full border rounded-lg p-3 bg-gray-50"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {isSignUp && (
            <input
              type="password"
              placeholder="Confirm Password"
              className="w-full border rounded-lg p-3 bg-gray-50"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          )}
          <button
            type="submit"
            className="w-full bg-indigo-700 text-white py-3 rounded-lg hover:bg-indigo-800"
          >
            {isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
