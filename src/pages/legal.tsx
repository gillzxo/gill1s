// =====================================================================
// Privacy Policy & Terms and Conditions — static legal pages.
// =====================================================================
import { Hono } from 'hono'
import type { Bindings } from '../lib/types'
import { PageHero } from '../components/shared'

const legal = new Hono<{ Bindings: Bindings }>()

legal.get('/privacy-policy', (c) => {
  const settings = c.get('settings')
  return c.render(
    <>
      <PageHero title="Privacy Policy" breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Privacy Policy' }]} />
      <section class="py-16">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose-content">
          <p>
            <strong>Last updated:</strong> {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p>
            {settings.business_name} ("we", "our", "us") respects your privacy. This Privacy Policy explains how we
            collect, use, and protect your personal information when you visit our website or submit an enquiry.
          </p>
          <h2>Information We Collect</h2>
          <p>
            When you submit an enquiry form, we collect your name, phone number, email address, city, service
            interest, preferred study destination, last qualification, and any message you provide. We may also
            collect your IP address for security and anti-spam purposes.
          </p>
          <h2>How We Use Your Information</h2>
          <ul>
            <li>To respond to your enquiry and provide consultation services</li>
            <li>To send you relevant updates about our coaching, study abroad, loan, and visa services</li>
            <li>To improve our website and services</li>
            <li>To comply with legal obligations</li>
          </ul>
          <h2>Data Sharing</h2>
          <p>
            We do not sell your personal information. We may share your enquiry details internally with our staff
            for follow-up, and with partner banks/NBFCs only with your explicit consent for loan assistance.
          </p>
          <h2>Data Security</h2>
          <p>
            We use industry-standard security practices including encrypted storage and access-controlled admin
            portals to protect your data from unauthorised access.
          </p>
          <h2>Your Rights</h2>
          <p>
            You may request access to, correction of, or deletion of your personal data at any time by contacting
            us at <a href={`mailto:${settings.email}`}>{settings.email}</a>.
          </p>
          <h2>Cookies</h2>
          <p>
            Our website may use cookies for session management (e.g. admin login) and analytics purposes. You can
            disable cookies in your browser settings, though some features may not function correctly.
          </p>
          <h2>Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at {settings.address}, phone{' '}
            {settings.phone_primary}, or email {settings.email}.
          </p>
        </div>
      </section>
    </>,
    { title: 'Privacy Policy', noindex: false }
  )
})

legal.get('/terms', (c) => {
  const settings = c.get('settings')
  return c.render(
    <>
      <PageHero title="Terms & Conditions" breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Terms & Conditions' }]} />
      <section class="py-16">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose-content">
          <p>
            <strong>Last updated:</strong> {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p>
            By accessing or using the {settings.business_name} website, you agree to be bound by these Terms &amp;
            Conditions. Please read them carefully.
          </p>
          <h2>Services</h2>
          <p>
            {settings.business_name} provides IELTS/PTE coaching, study abroad counselling, education loan
            assistance, and visa guidance services. We act as consultants and facilitators — final admission, loan
            sanction, and visa decisions rest solely with the respective universities, banks/NBFCs, and government
            immigration authorities.
          </p>
          <h2>No Guarantee of Outcome</h2>
          <p>
            While we strive to provide accurate and up-to-date guidance, we do not guarantee visa approval, loan
            sanction, or admission outcomes, as these are subject to the sole discretion of third-party
            institutions and government bodies.
          </p>
          <h2>Calculator Disclaimers</h2>
          <p>
            The EMI, Flat vs Reducing Rate, and Eligibility calculators on our Education Loan page are for
            illustrative purposes only. Actual interest rates, eligibility, and EMI amounts will be determined by
            the lending bank/NBFC based on your complete application and credit assessment.
          </p>
          <h2>Fees & Refunds</h2>
          <p>
            Coaching fees, once paid, are subject to our refund policy as communicated at the time of enrolment.
            Consultation for study abroad, loan, and visa services may be free or chargeable depending on the scope
            of service, as agreed in writing before engagement.
          </p>
          <h2>Intellectual Property</h2>
          <p>
            All content on this website, including text, images, logos, and the {settings.business_name} name, is
            our property and may not be reproduced without written permission.
          </p>
          <h2>Governing Law</h2>
          <p>These terms are governed by the laws of India, with jurisdiction in Ludhiana, Punjab.</p>
          <h2>Contact Us</h2>
          <p>
            For any questions about these Terms, contact us at {settings.address}, phone {settings.phone_primary},
            or email {settings.email}.
          </p>
        </div>
      </section>
    </>,
    { title: 'Terms & Conditions' }
  )
})

export default legal
