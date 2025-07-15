import { createUserWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");


  const Signup =async (e) => {
    e.preventDefault();
    try {
        const result= await createUserWithEmailAndPassword(auth,email,password);
      localStorage.setItem("user",JSON.stringify(result.user));
      navigate('/dashboard');
    } catch (err) {
        alert("Signup failed.");
      console.error(err);
    }
    

  };
  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-200">
      <div className="bg-white max-w-md w-full p-8 space-y-8 border rounded shadow-lg">
        <div>
          <h2 className="text-center font-semibold text-2xl text-gray-900">
            Create your InsightFlow Account
          </h2>
        </div>
        <div>
          <form onSubmit={Signup}>
            <div className="flex flex-col space-y-4">
              <div>
                <input
                  id="email"
                  name="email"
                  placeholder="Email"
                  type="email "
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 appearance-none rounded-none border border-gray-300 text-gray-900 rounded-t-md focus:outline-none  placeholder:text-gray-500 focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm "
                />
              </div>
              <div>
                <input
                  id="password"
                  name="password"
                  value={password}
                  placeholder="Password"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="appearance-none rounded-none px-3 py-2 w-full border rounded-b-md border-gray-300 focus:outline-none focus:border-indigo-500 focus:ring-indigo-500 focus:z-10 sm:text-sm"
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded cursor-pointer focus:outline-none focus:ring-indigo-500 focus: border-amber-500 font-semibold text-white transition "
                >
                  Sign up
                </button>
              </div>
            </div>
          </form>
          <div className="mt-6 text-center text-sm">
            <p className="text-gray-600">
              Already have an account?{" "}
              <Link
                to="/"
                className="text-blue-500 hover:text-blue-600 underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
      hi
    </div>
  );
}
