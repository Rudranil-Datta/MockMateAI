import { FileUp } from "lucide-react";

import Card from "../components/common/Card.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";

function ResumesPage() {
  return (
    <>
      <section className="page-heading compact-heading">
        <div>
          <p className="eyebrow">Resumes</p>
          <h1>Keep resume context optional.</h1>
          <p className="page-description">
            Resume upload and extraction are scheduled for Week 5.
          </p>
        </div>
      </section>
      <Card className="empty-state resume-placeholder">
        <FileUp aria-hidden="true" className="empty-icon" />
        <h2>No resumes uploaded</h2>
        <p>Interview practice will always work without a resume.</p>
      </Card>
      <InlineAlert>
        Upload controls remain unavailable until secure file handling is
        implemented.
      </InlineAlert>
    </>
  );
}

export default ResumesPage;
