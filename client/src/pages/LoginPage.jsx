import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { ApiError } from "../api/httpClient.js";
import Button from "../components/common/Button.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import useAuth from "../hooks/useAuth.js";

const initialFields = { email: "", password: "" };

function validate(fields) {
  const errors = {};

  if (!fields.email.trim()) {
    errors.email = "Enter your email address.";
  }
  if (!fields.password) {
    errors.password = "Enter your password.";
  }

  return errors;
}

function LoginPage() {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [fields, setFields] = useState(initialFields);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const returnPath = location.state?.from?.pathname || "/dashboard";

  function updateField(event) {
    const { name, value } = event.target;
    setFields((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(fields);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      await login({ email: fields.email.trim(), password: fields.password });
      navigate(returnPath, { replace: true });
    } catch (error) {
      setErrors(error instanceof ApiError ? error.fields || {} : {});
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="public-page">
      <section className="public-panel" aria-labelledby="login-title">
        <p className="eyebrow">MockMateAI</p>
        <h1 id="login-title">Welcome back.</h1>
        <p>Continue building interview confidence.</p>
        {formError ? <InlineAlert tone="error">{formError}</InlineAlert> : null}
        <form className="auth-form" noValidate onSubmit={handleSubmit}>
          <label htmlFor="login-email">
            Email
            <input
              aria-describedby={errors.email ? "login-email-error" : undefined}
              aria-invalid={Boolean(errors.email)}
              autoComplete="email"
              id="login-email"
              name="email"
              onChange={updateField}
              type="email"
              value={fields.email}
            />
            {errors.email ? (
              <span className="field-error" id="login-email-error">
                {errors.email}
              </span>
            ) : null}
          </label>
          <label htmlFor="login-password">
            Password
            <input
              aria-describedby={
                errors.password ? "login-password-error" : undefined
              }
              aria-invalid={Boolean(errors.password)}
              autoComplete="current-password"
              id="login-password"
              name="password"
              onChange={updateField}
              type="password"
              value={fields.password}
            />
            {errors.password ? (
              <span className="field-error" id="login-password-error">
                {errors.password}
              </span>
            ) : null}
          </label>
          <Button isLoading={isSubmitting} type="submit">
            Log in
          </Button>
        </form>
        <p className="public-link">
          Need an account? <Link to="/signup">Sign up</Link>
        </p>
      </section>
    </main>
  );
}

export default LoginPage;
