import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "../api/httpClient.js";
import Button from "../components/common/Button.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import useAuth from "../hooks/useAuth.js";

const initialFields = { email: "", name: "", password: "" };

function validate(fields) {
  const errors = {};

  if (!fields.name.trim()) {
    errors.name = "Enter your name.";
  }
  if (!fields.email.trim()) {
    errors.email = "Enter your email address.";
  }
  if (fields.password.length < 12) {
    errors.password = "Use a password with at least 12 characters.";
  }

  return errors;
}

function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [fields, setFields] = useState(initialFields);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await signup({
        email: fields.email.trim(),
        name: fields.name.trim(),
        password: fields.password,
      });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setErrors(error instanceof ApiError ? error.fields || {} : {});
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Unable to create your account. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="public-page">
      <section className="public-panel" aria-labelledby="signup-title">
        <p className="eyebrow">MockMateAI</p>
        <h1 id="signup-title">Create your practice space.</h1>
        <p>Start with a focused, private interview workspace.</p>
        {formError ? <InlineAlert tone="error">{formError}</InlineAlert> : null}
        <form className="auth-form" noValidate onSubmit={handleSubmit}>
          <label htmlFor="signup-name">
            Name
            <input
              aria-describedby={errors.name ? "signup-name-error" : undefined}
              aria-invalid={Boolean(errors.name)}
              autoComplete="name"
              id="signup-name"
              name="name"
              onChange={updateField}
              type="text"
              value={fields.name}
            />
            {errors.name ? (
              <span className="field-error" id="signup-name-error">
                {errors.name}
              </span>
            ) : null}
          </label>
          <label htmlFor="signup-email">
            Email
            <input
              aria-describedby={errors.email ? "signup-email-error" : undefined}
              aria-invalid={Boolean(errors.email)}
              autoComplete="email"
              id="signup-email"
              name="email"
              onChange={updateField}
              type="email"
              value={fields.email}
            />
            {errors.email ? (
              <span className="field-error" id="signup-email-error">
                {errors.email}
              </span>
            ) : null}
          </label>
          <label htmlFor="signup-password">
            Password
            <input
              aria-describedby={
                errors.password ? "signup-password-error" : undefined
              }
              aria-invalid={Boolean(errors.password)}
              autoComplete="new-password"
              id="signup-password"
              name="password"
              onChange={updateField}
              type="password"
              value={fields.password}
            />
            {errors.password ? (
              <span className="field-error" id="signup-password-error">
                {errors.password}
              </span>
            ) : null}
          </label>
          <Button isLoading={isSubmitting} type="submit">
            Create account
          </Button>
        </form>
        <p className="public-link">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}

export default SignupPage;
