import { ShieldCheck } from "lucide-react";
import { useState } from "react";

import Card from "../components/common/Card.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import PasswordInput from "../components/common/PasswordInput.jsx";
import useAuth from "../hooks/useAuth.js";
import { ApiError } from "../api/httpClient.js";
import Button from "../components/common/Button.jsx";
import { getPasswordPolicyError } from "../utils/passwordPolicy.js";

function getProfileFields(user) {
  return {
    experienceLevel: user.profile?.experienceLevel || "",
    name: user.name || "",
    targetRole: user.profile?.targetRole || "",
  };
}

const initialPasswordFields = {
  confirmation: "",
  currentPassword: "",
  newPassword: "",
};

function AccountPage() {
  const { updatePassword, updateProfile, user } = useAuth();
  const [profileFields, setProfileFields] = useState(() =>
    getProfileFields(user),
  );
  const [passwordFields, setPasswordFields] = useState(initialPasswordFields);
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  function updateProfileField(event) {
    const { name, value } = event.target;
    setProfileFields((current) => ({ ...current, [name]: value }));
    setProfileErrors((current) => ({ ...current, [name]: undefined }));
    setProfileMessage("");
  }

  function updatePasswordField(event) {
    const { name, value } = event.target;
    setPasswordFields((current) => ({ ...current, [name]: value }));
    setPasswordErrors((current) => ({ ...current, [name]: undefined }));
    setPasswordMessage("");
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    const name = profileFields.name.trim();
    const targetRole = profileFields.targetRole.trim();
    const nextErrors = name
      ? {}
      : { name: "Enter a name between 1 and 100 characters." };
    setProfileErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsProfileSaving(true);
    setProfileMessage("");
    try {
      const updatedUser = await updateProfile({
        name,
        profile: {
          experienceLevel: profileFields.experienceLevel,
          targetRole,
        },
      });
      setProfileFields(getProfileFields(updatedUser));
      setProfileMessage("Profile saved.");
    } catch (error) {
      setProfileErrors(error instanceof ApiError ? error.fields || {} : {});
      setProfileMessage(
        error instanceof ApiError
          ? error.message
          : "Unable to save your profile. Please try again.",
      );
    } finally {
      setIsProfileSaving(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    const passwordError = getPasswordPolicyError({
      email: user.email,
      name: user.name,
      password: passwordFields.newPassword,
    });

    if (!passwordFields.currentPassword) {
      nextErrors.currentPassword = "Enter your current password.";
    }
    if (passwordError) {
      nextErrors.newPassword = passwordError;
    }
    if (passwordFields.confirmation !== passwordFields.newPassword) {
      nextErrors.confirmation = "Passwords do not match.";
    }
    setPasswordErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsPasswordSaving(true);
    setPasswordMessage("");
    try {
      await updatePassword(passwordFields);
      setPasswordFields(initialPasswordFields);
      setPasswordMessage("Password updated.");
    } catch (error) {
      setPasswordErrors(error instanceof ApiError ? error.fields || {} : {});
      setPasswordMessage(
        error instanceof ApiError
          ? error.message
          : "Unable to update your password. Please try again.",
      );
    } finally {
      setIsPasswordSaving(false);
    }
  }

  return (
    <>
      <section className="page-heading compact-heading">
        <div>
          <p className="eyebrow">Profile</p>
          <h1>Your account.</h1>
          <p className="page-description">
            Review the identity connected to this private practice workspace.
          </p>
        </div>
      </section>
      <Card className="account-card">
        <ShieldCheck aria-hidden="true" className="empty-icon" />
        <h2>Signed-in profile</h2>
        <dl className="account-details">
          <div>
            <dt>Name</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
        </dl>
        <div className="account-form-grid">
          <form className="auth-form" noValidate onSubmit={handleProfileSubmit}>
            <div>
              <h2>Update profile</h2>
              <p>Keep your practice preferences current.</p>
            </div>
            {profileMessage ? (
              <InlineAlert
                tone={Object.keys(profileErrors).length > 0 ? "error" : "info"}
              >
                {profileMessage}
              </InlineAlert>
            ) : null}
            <label htmlFor="account-name">
              Name
              <input
                aria-describedby={
                  profileErrors.name ? "account-name-error" : undefined
                }
                aria-invalid={Boolean(profileErrors.name)}
                autoComplete="name"
                id="account-name"
                name="name"
                onChange={updateProfileField}
                type="text"
                value={profileFields.name}
              />
              {profileErrors.name ? (
                <span className="field-error" id="account-name-error">
                  {profileErrors.name}
                </span>
              ) : null}
            </label>
            <label htmlFor="account-target-role">
              Target role (optional)
              <input
                aria-describedby={
                  profileErrors.targetRole
                    ? "account-target-role-error"
                    : undefined
                }
                aria-invalid={Boolean(profileErrors.targetRole)}
                id="account-target-role"
                name="targetRole"
                onChange={updateProfileField}
                type="text"
                value={profileFields.targetRole}
              />
              {profileErrors.targetRole ? (
                <span className="field-error" id="account-target-role-error">
                  {profileErrors.targetRole}
                </span>
              ) : null}
            </label>
            <label htmlFor="account-experience-level">
              Experience level (optional)
              <select
                aria-describedby={
                  profileErrors.experienceLevel
                    ? "account-experience-level-error"
                    : undefined
                }
                aria-invalid={Boolean(profileErrors.experienceLevel)}
                id="account-experience-level"
                name="experienceLevel"
                onChange={updateProfileField}
                value={profileFields.experienceLevel}
              >
                <option value="">Not selected</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              {profileErrors.experienceLevel ? (
                <span
                  className="field-error"
                  id="account-experience-level-error"
                >
                  {profileErrors.experienceLevel}
                </span>
              ) : null}
            </label>
            <Button isLoading={isProfileSaving} type="submit">
              Save profile
            </Button>
          </form>
          <form
            className="auth-form"
            noValidate
            onSubmit={handlePasswordSubmit}
          >
            <div>
              <h2>Change password</h2>
              <p>Confirm your current password before choosing a new one.</p>
            </div>
            {passwordMessage ? (
              <InlineAlert
                tone={Object.keys(passwordErrors).length > 0 ? "error" : "info"}
              >
                {passwordMessage}
              </InlineAlert>
            ) : null}
            <label htmlFor="account-current-password">
              Current password
              <PasswordInput
                aria-describedby={
                  passwordErrors.currentPassword
                    ? "account-current-password-error"
                    : undefined
                }
                aria-invalid={Boolean(passwordErrors.currentPassword)}
                autoComplete="current-password"
                id="account-current-password"
                name="currentPassword"
                onChange={updatePasswordField}
                type="password"
                value={passwordFields.currentPassword}
              />
              {passwordErrors.currentPassword ? (
                <span
                  className="field-error"
                  id="account-current-password-error"
                >
                  {passwordErrors.currentPassword}
                </span>
              ) : null}
            </label>
            <div className="auth-field">
              <label htmlFor="account-new-password">
                New password
                <PasswordInput
                  aria-describedby={
                    passwordErrors.newPassword
                      ? "account-password-hint account-new-password-error"
                      : "account-password-hint"
                  }
                  aria-invalid={Boolean(passwordErrors.newPassword)}
                  autoComplete="new-password"
                  id="account-new-password"
                  name="newPassword"
                  onChange={updatePasswordField}
                  value={passwordFields.newPassword}
                />
              </label>
              <span className="field-hint" id="account-password-hint">
                Use 15–72 bytes with at least one number or special character.
              </span>
              {passwordErrors.newPassword ? (
                <span className="field-error" id="account-new-password-error">
                  {passwordErrors.newPassword}
                </span>
              ) : null}
            </div>
            <label htmlFor="account-password-confirmation">
              Confirm new password
              <PasswordInput
                aria-describedby={
                  passwordErrors.confirmation
                    ? "account-password-confirmation-error"
                    : undefined
                }
                aria-invalid={Boolean(passwordErrors.confirmation)}
                autoComplete="new-password"
                id="account-password-confirmation"
                name="confirmation"
                onChange={updatePasswordField}
                value={passwordFields.confirmation}
              />
              {passwordErrors.confirmation ? (
                <span
                  className="field-error"
                  id="account-password-confirmation-error"
                >
                  {passwordErrors.confirmation}
                </span>
              ) : null}
            </label>
            <Button isLoading={isPasswordSaving} type="submit">
              Update password
            </Button>
          </form>
        </div>
      </Card>
      <InlineAlert>
        Your interview history, resumes, and feedback are available only while
        you are signed in.
      </InlineAlert>
    </>
  );
}

export default AccountPage;
