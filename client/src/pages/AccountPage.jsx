import { ShieldCheck } from "lucide-react";

import Card from "../components/common/Card.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import useAuth from "../hooks/useAuth.js";

function AccountPage() {
  const { user } = useAuth();

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
      </Card>
      <InlineAlert>
        Your interview history, resumes, and feedback are available only while
        you are signed in.
      </InlineAlert>
    </>
  );
}

export default AccountPage;
