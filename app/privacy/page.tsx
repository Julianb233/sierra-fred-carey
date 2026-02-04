"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Shield } from "lucide-react";
import Footer from "@/components/footer";

const sections = [
  { id: "overview", title: "Overview" },
  { id: "collection", title: "Information We Collect" },
  { id: "usage", title: "How We Use Information" },
  { id: "sharing", title: "Information Sharing" },
  { id: "security", title: "Data Security" },
  { id: "retention", title: "Data Retention" },
  { id: "rights", title: "Your Rights" },
  { id: "cookies", title: "Cookies and Tracking" },
  { id: "international", title: "International Transfers" },
  { id: "children", title: "Children's Privacy" },
  { id: "updates", title: "Policy Updates" },
  { id: "contact", title: "Contact Us" },
];

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState("overview");

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 relative overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-[#ff6a1a]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-orange-400/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-[150px]" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff6a1a]/10 border border-[#ff6a1a]/20 text-sm font-medium text-[#ff6a1a] mb-6"
            >
              <Shield className="w-4 h-4" />
              Your Privacy Matters
            </motion.span>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gray-900 dark:text-white">
              Privacy <span className="text-[#ff6a1a]">Policy</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Last updated: December 27, 2024
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="relative z-10 px-4 pb-16">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Table of Contents */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-1"
            >
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 sticky top-24">
                <h3 className="font-bold mb-4 text-gray-900 dark:text-white">Table of Contents</h3>
                <nav className="space-y-2">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`block w-full text-left px-3 py-2 rounded-lg transition-colors text-sm
                        ${activeSection === section.id
                          ? "bg-[#ff6a1a]/10 text-[#ff6a1a] font-medium"
                          : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                        }`}
                    >
                      {section.title}
                    </button>
                  ))}
                </nav>
              </div>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-3"
            >
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 md:p-12 border border-gray-200 dark:border-gray-800">
                <div className="prose prose-lg dark:prose-invert max-w-none space-y-12">
                  <section id="overview">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">1. Overview</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      At Fred Carey, we take your privacy seriously. This Privacy Policy explains how we collect,
                      use, disclose, and safeguard your information when you use our service.
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      We are committed to protecting your personal data and complying with applicable data protection
                      laws, including the General Data Protection Regulation (GDPR) and the California Consumer Privacy
                      Act (CCPA).
                    </p>
                  </section>

                  <section id="collection">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">2. Information We Collect</h2>

                    <h3 className="text-xl font-semibold mb-3 mt-6 text-gray-900 dark:text-white">Information You Provide</h3>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-400 list-disc list-inside">
                      <li>Account information (name, email, password)</li>
                      <li>Profile information (company, role, preferences)</li>
                      <li>Payment information (processed securely through Stripe)</li>
                      <li>Communication data (support tickets, feedback)</li>
                      <li>Content you create using the Service</li>
                    </ul>

                    <h3 className="text-xl font-semibold mb-3 mt-6 text-gray-900 dark:text-white">Automatically Collected Information</h3>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-400 list-disc list-inside">
                      <li>Device information (browser type, operating system)</li>
                      <li>Usage data (features used, time spent, interactions)</li>
                      <li>Log data (IP address, access times, pages viewed)</li>
                      <li>Cookies and similar tracking technologies</li>
                    </ul>
                  </section>

                  <section id="usage">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">3. How We Use Information</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">We use your information to:</p>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-400 list-disc list-inside">
                      <li>Provide, maintain, and improve the Service</li>
                      <li>Process transactions and send related information</li>
                      <li>Send technical notices and support messages</li>
                      <li>Respond to your comments and questions</li>
                      <li>Analyze usage patterns and optimize performance</li>
                      <li>Detect, prevent, and address technical issues</li>
                      <li>Comply with legal obligations</li>
                      <li>Send marketing communications (with your consent)</li>
                    </ul>
                  </section>

                  <section id="sharing">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">4. Information Sharing</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      We do not sell your personal information. We may share your information with:
                    </p>

                    <h3 className="text-xl font-semibold mb-3 mt-6 text-gray-900 dark:text-white">Service Providers</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Third-party vendors who perform services on our behalf, such as:
                    </p>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-400 list-disc list-inside">
                      <li>Payment processing (Stripe)</li>
                      <li>Cloud hosting (Vercel, AWS)</li>
                      <li>Analytics (Google Analytics)</li>
                      <li>Customer support tools</li>
                    </ul>

                    <h3 className="text-xl font-semibold mb-3 mt-6 text-gray-900 dark:text-white">Legal Requirements</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      We may disclose information if required by law or in response to valid legal requests.
                    </p>
                  </section>

                  <section id="security">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">5. Data Security</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      We implement appropriate technical and organizational measures to protect your data:
                    </p>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-400 list-disc list-inside">
                      <li>Encryption in transit (TLS/SSL)</li>
                      <li>Encryption at rest for sensitive data</li>
                      <li>Regular security assessments</li>
                      <li>Access controls and authentication</li>
                      <li>Regular backups and disaster recovery</li>
                      <li>Employee security training</li>
                    </ul>
                    <p className="text-gray-600 dark:text-gray-400 mt-4">
                      However, no method of transmission over the Internet is 100% secure. We cannot guarantee
                      absolute security of your data.
                    </p>
                  </section>

                  <section id="retention">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">6. Data Retention</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      We retain your personal information for as long as necessary to:
                    </p>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-400 list-disc list-inside">
                      <li>Provide the Service to you</li>
                      <li>Comply with legal obligations</li>
                      <li>Resolve disputes</li>
                      <li>Enforce our agreements</li>
                    </ul>
                    <p className="text-gray-600 dark:text-gray-400 mt-4">
                      When you delete your account, we will delete or anonymize your personal information within 30 days,
                      unless we are required to retain it for legal purposes.
                    </p>
                  </section>

                  <section id="rights">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">7. Your Rights</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Depending on your location, you may have the following rights:
                    </p>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-400 list-disc list-inside">
                      <li><strong>Access:</strong> Request a copy of your personal data</li>
                      <li><strong>Correction:</strong> Update inaccurate or incomplete data</li>
                      <li><strong>Deletion:</strong> Request deletion of your data</li>
                      <li><strong>Portability:</strong> Receive your data in a portable format</li>
                      <li><strong>Restriction:</strong> Limit how we process your data</li>
                      <li><strong>Objection:</strong> Object to certain data processing</li>
                      <li><strong>Withdraw Consent:</strong> Withdraw previously given consent</li>
                    </ul>
                    <p className="text-gray-600 dark:text-gray-400 mt-4">
                      To exercise these rights, contact us at privacy@fredcarey.com.
                    </p>
                  </section>

                  <section id="cookies">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">8. Cookies and Tracking</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      We use cookies and similar technologies to:
                    </p>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-400 list-disc list-inside">
                      <li>Remember your preferences</li>
                      <li>Understand how you use the Service</li>
                      <li>Improve your experience</li>
                      <li>Measure the effectiveness of our marketing</li>
                    </ul>
                    <p className="text-gray-600 dark:text-gray-400 mt-4">
                      You can control cookies through your browser settings. However, disabling cookies may affect
                      your ability to use certain features of the Service.
                    </p>
                  </section>

                  <section id="international">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">9. International Data Transfers</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Your information may be transferred to and processed in countries other than your country of
                      residence. These countries may have different data protection laws.
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      We ensure appropriate safeguards are in place for international transfers, such as Standard
                      Contractual Clauses approved by the European Commission.
                    </p>
                  </section>

                  <section id="children">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">10. Children&apos;s Privacy</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      The Service is not intended for children under 16. We do not knowingly collect personal
                      information from children. If you believe we have collected information from a child,
                      please contact us immediately.
                    </p>
                  </section>

                  <section id="updates">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">11. Policy Updates</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      We may update this Privacy Policy from time to time. We will notify you of significant
                      changes via email or through the Service. The &quot;Last updated&quot; date at the top indicates
                      when this policy was last revised.
                    </p>
                  </section>

                  <section id="contact">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">12. Contact Us</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      If you have questions about this Privacy Policy or our data practices:
                    </p>
                    <div className="mt-4 p-6 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                      <p className="text-gray-600 dark:text-gray-400">
                        <strong>Email:</strong> privacy@fredcarey.com<br />
                        <strong>Address:</strong> Fred Carey Privacy Team<br />
                        123 Innovation Drive<br />
                        San Francisco, CA 94102<br />
                        United States
                      </p>
                      <p className="text-gray-600 dark:text-gray-400 mt-4">
                        <strong>Data Protection Officer:</strong> dpo@fredcarey.com
                      </p>
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
