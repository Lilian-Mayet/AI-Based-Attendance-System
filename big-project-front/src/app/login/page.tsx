"use client";

import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Make sure your backend is running on http://localhost:8000
      const response = await axios.post("http://localhost:8000/teachers/login", {
        username,
        password,
      });

      // Assuming your backend returns a teacher object on successful login
      localStorage.setItem("teacher", JSON.stringify(response.data.teacher));
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Login error:", err);
      // More specific error handling could be added here based on err.response.status
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message); // Use error message from backend if available
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50"> {/* Light pastel green background */}
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-green-800">Teacher Login</h1> {/* Darker green text */}
        {error && (
          // Keeping standard error colors for clarity, but maybe adjust shade if desired
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-gray-700 font-medium mb-2"> {/* Keeping label text color neutral */}
              Username
            </label>
            <input
              type="text"
              id="username"
              // Adjusted border color to fit the pastel theme
              className="w-full px-3 py-2 border border-green-200 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 font-medium mb-2"> {/* Keeping label text color neutral */}
              Password
            </label>
            <input
              type="password"
              id="password"
              // Adjusted border color and focus styles
              className="w-full px-3 py-2 border border-green-200 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            // Button using a pleasant green shade, slightly darker on hover
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition duration-200 ease-in-out"
            disabled={loading} // Disable button while loading
          >
            {loading ? "Connecting..." : "Login"}
          </button>
        </form>
        <button
          onClick={() => router.push("/test-actions")}
          // Demo button styling adjusted to fit the theme
          className="mt-4 w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition duration-200 ease-in-out"
          disabled={loading} // Also disable demo button while logging in
        >
          Go to Demo Mode
        </button>
      </div>
    </div>
  );
};

export default LoginPage;