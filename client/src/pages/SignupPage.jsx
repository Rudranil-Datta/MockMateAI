import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "../api/httpClient.js";
import Button from "../components/common/Button.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import PasswordInput from "../components/common/PasswordInput.jsx";
import useAuth from "../hooks/useAuth.js";
import { getPasswordPolicyError } from "../utils/passwordPolicy.js";

const initialFields = { email: "", name: "", password: "" };
const emailLocalPartPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i;
const emailDomainLabelPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const emailTopLevelDomainPattern = /^[a-z]{2,63}$/i;

function hasValidSignupEmailSyntax(value) {
  const email = value.trim();
  const separatorIndex = email.indexOf("@");

  if (separatorIndex <= 0 || separatorIndex !== email.lastIndexOf("@")) {
    return false;
  }

  const localPart = email.slice(0, separatorIndex);
  const domainLabels = email.slice(separatorIndex + 1).split(".");

  return (
    !localPart.startsWith(".") &&
    !localPart.endsWith(".") &&
    !localPart.includes("..") &&
    emailLocalPartPattern.test(localPart) &&
    domainLabels.length >= 2 &&
    domainLabels.every((label) => emailDomainLabelPattern.test(label)) &&
    emailTopLevelDomainPattern.test(domainLabels.at(-1))
  );
}

function validate(fields) {
  const errors = {};

  if (!fields.name.trim()) {
    errors.name = "Enter your name.";
  }
  if (!fields.email.trim()) {
    errors.email = "Enter your email address.";
  } else if (!hasValidSignupEmailSyntax(fields.email)) {
    errors.email = "Enter a valid email address.";
  }
  const passwordError = getPasswordPolicyError(fields);
  if (passwordError) {
    errors.password = passwordError;
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
              placeholder="name@example.com"
              type="email"
              value={fields.email}
            />
            {errors.email ? (
              <span className="field-error" id="signup-email-error">
                {errors.email}
              </span>
            ) : null}
          </label>
          <div className="auth-field">
            <label htmlFor="signup-password">
              Password
              <PasswordInput
                aria-describedby={
                  errors.password
                    ? "signup-password-hint signup-password-error"
                    : "signup-password-hint"
                }
                aria-invalid={Boolean(errors.password)}
                autoComplete="new-password"
                id="signup-password"
                name="password"
                onChange={updateField}
                value={fields.password}
              />
            </label>
            <span className="field-hint" id="signup-password-hint">
              Use 15–72 bytes with at least one number or special character.
            </span>
            {errors.password ? (
              <span className="field-error" id="signup-password-error">
                {errors.password}
              </span>
            ) : null}
          </div>
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
