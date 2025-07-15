import React, { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebase"; // Assuming these are correctly configured
import { Link, useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc"; // Import the Google icon from react-icons/fc

export default function Login() {
    const navigate = useNavigate();
    const[email,setEmail]=useState("");
    const[password,setPassword]=useState("");


  const signInWithEmail= async(e) =>{
    e.preventDefault();
    try {
        const result = await signInWithEmailAndPassword(auth,email,password);
        localStorage.setItem("user", JSON.stringify(result.user));
        navigate('/dashboard');
    } catch (error) {
        alert("Login failed. Check your credential and try again");
        console.log("Error in Login :",error)
    }

  }

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      localStorage.setItem("user", JSON.stringify(user));
      navigate("/dashboard"); // Redirect to dashboard on successful login
    } catch (err) {
      console.error("Google Sign in error:", err);
      alert("Failed to sign in with Google. Please try again.");
    }
  };

  const navigateToSignUp = () => {
    navigate("/signup"); // Redirect to a signup page
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-8 border border-gray-300 rounded-lg shadow-xl bg-white">
        <div>
          <h2 className="mt-6 text-center font-semibold text-3xl text-gray-900">
            Sign in to InsightFlow
          </h2>
        </div>

        <form className="mt-8 space-y-6 px-4" onSubmit={signInWithEmail}>
          <input type="hidden" name="remember" defaultValue="true" />
          <div className="rounded-md shadow-sm space-y-3">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email Address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
                autoComplete="email"
                placeholder="Email Address"
                required
                className="appearance-none rounded-none relative block px-3 py-2 w-full border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="appearance-none rounded-none w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-gray-900"
              >
                Remember me
              </label>
            </div>
            <div className="text-sm">
              <a
                href="#"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Forgot your password?
              </a>
            </div>
          </div>
          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium cursor-pointer rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign in
            </button>
          </div>

          {/* Separator */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* Google Sign-in Button */}
          <div>
            <button
              type="button"
              className="group relative w-full flex justify-center items-center py-2 px-4 border border-gray-300 cursor-pointer text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={loginWithGoogle}
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <FcGoogle className="h-5 w-5" /> {/* Using the react-icons Google icon */}
              </span>
              Sign in with Google
            </button>
          </div>

          {/* Sign Up Section */}
          <div className="mt-6 text-center text-sm">
            <p className="text-gray-600">
              Don't have an account?{" "}
              <Link to='/signup' className="text-blue-500 hover:text-blue-600 underline">
              Sign up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}