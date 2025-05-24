import React, { useState } from "react";
import axios from "axios";

const Login = ({ onSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:8080/auth/login", {
        email,
        password
      });
  
      // Проверяем структуру ответа
      console.log("Login response:", response.data);
      
      // Сохраняем access_token из правильного поля
      localStorage.setItem("access_token", response.data.AccessToken);
      localStorage.setItem("user_id", String(response.data.User.ID)); // Используем User.ID из ответа
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    }
  };
  return (
    <div>
      <h2>Login</h2>
      {error && <div style={{ color: "yellow", marginBottom: "10px" }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <button
          type="submit"
          style={{
            padding: "8px 16px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px"
          }}
        >
          Login
        </button>
      </form>
    </div>
  );
};

export default Login;