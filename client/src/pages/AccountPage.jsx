import { ShieldCheck } from "lucide-react";

import Card from "../components/common/Card.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";

function AccountPage() {
  return (
    <>
      <section className="page-heading compact-heading">
        <div>
          <p className="eyebrow">Profile</p>
          <h1>Account access is next.</h1>
          <p className="page-description">
            Authentication begins in Week 2. This route confirms shell
            navigation only.
          </p>
        </div>
      </section>
      <Card className="empty-state">
        <ShieldCheck aria-hidden="true" className="empty-icon" />
        <h2>Protected-route placeholder</h2>
        <p>
          Session checks, account details, and logout will replace this state
          during authentication work.
        </p>
      </Card>
      <InlineAlert>
        Current shell does not create or store an authenticated session.
      </InlineAlert>
    </>
  );
}

export default AccountPage;
