import ContactInfo from "./ContactInfo";
import InquiryForm from "./InquiryForm";

export default function ContactGrid() {
  return (
    <div className="mb-32 grid grid-cols-1 gap-8 lg:grid-cols-12">
      <ContactInfo />
      <InquiryForm />
    </div>
  );
}
