"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { FileText } from "lucide-react";
import Footer from "@/components/footer";

const sections = [
  { id: "acceptance", title: "Acceptance of Terms" },
  { id: "description", title: "Description of Service" },
  { id: "account", title: "Account Registration" },
  { id: "use", title: "Use of Service" },
  { id: "payment", title: "Payment and Billing" },
  { id: "intellectual", title: "Intellectual Property" },
  { id: "privacy", title: "Privacy and Data Protection" },
  { id: "termination", title: "Termination" },
  { id: "disclaimer", title: "Disclaimer of Warranties" },
  { id: "limitation", title: "Limitation of Liability" },
  { id: "changes", title: "Changes to Terms" },
  { id: "contact", title: "Contact Information" },
];

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState("acceptance");

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
              <FileText className="w-4 h-4" />
              Legal
            </motion.span>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gray-900 dark:text-white">
              Terms of <span className="text-[#ff6a1a]">Service</span>
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
                  <section id="acceptance">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">1. Acceptance of Terms</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      By accessing and using Fred Carey (&quot;Service&quot;), you accept and agree to be bound by the terms
                      and provision of this agreement. If you do not agree to these Terms of Service, please do not
                      use the Service.
                    </p>
                  </section>

                  <section id="description">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">2. Description of Service</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Fred Carey provides a comprehensive decision-making platform designed for founders and executives.
                      The Service includes various tools, frameworks, and analytics to support business decision-making processes.
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      We reserve the right to modify, suspend, or discontinue the Service at any time without notice.
                    </p>
                  </section>

                  <section id="account">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">3. Account Registration</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      To access certain features of the Service, you must register for an account. You agree to:
                    </p>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-400 list-disc list-inside">
                      <li>Provide accurate and complete information during registration</li>
                      <li>Maintain the security of your account credentials</li>
                      <li>Promptly update your account information if it changes</li>
                      <li>Accept responsibility for all activities under your account</li>
                      <li>Notify us immediately of any unauthorized use</li>
                    </ul>
                  </section>

                  <section id="use">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">4. Use of Service</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">You agree to use the Service only for lawful purposes. You must not:</p>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-400 list-disc list-inside">
                      <li>Violate any applicable laws or regulations</li>
                      <li>Infringe on intellectual property rights</li>
                      <li>Transmit harmful code or malware</li>
                      <li>Attempt to gain unauthorized access to systems</li>
                      <li>Use the Service to harm, threaten, or harass others</li>
                      <li>Scrape, copy, or reverse engineer the Service</li>
                    </ul>
                  </section>

                  <section id="payment">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">5. Payment and Billing</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Paid subscriptions are billed in advance on a recurring basis. You agree to:
                    </p>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-400 list-disc list-inside">
                      <li>Provide current and accurate billing information</li>
                      <li>Pay all fees when due</li>
                      <li>Update payment methods if they expire or become invalid</li>
                    </ul>
                    <p className="text-gray-600 dark:text-gray-400 mt-4">
                      Refunds are handled on a case-by-case basis. Subscription fees are non-refundable except
                      where required by law.
                    </p>
                  </section>

                  <section id="intellectual">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">6. Intellectual Property</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      The Service and its original content, features, and functionality are owned by Fred Carey
                      and are protected by international copyright, trademark, and other intellectual property laws.
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      You retain ownership of content you create using the Service. By using the Service, you grant
                      us a license to use, store, and process your content to provide the Service.
                    </p>
                  </section>

                  <section id="privacy">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">7. Privacy and Data Protection</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Your use of the Service is also governed by our Privacy Policy. We are committed to protecting
                      your data and complying with applicable data protection regulations, including GDPR and CCPA.
                    </p>
                  </section>

                  <section id="termination">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">8. Termination</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      We may terminate or suspend your account and access to the Service immediately, without prior
                      notice or liability, for any reason, including breach of these Terms.
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      You may cancel your account at any time through your account settings or by contacting support.
                    </p>
                  </section>

                  <section id="disclaimer">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">9. Disclaimer of Warranties</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER
                      EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
                    </p>
                  </section>

                  <section id="limitation">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">10. Limitation of Liability</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      TO THE MAXIMUM EXTENT PERMITTED BY LAW, FRED CAREY SHALL NOT BE LIABLE FOR ANY INDIRECT,
                      INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES.
                    </p>
                  </section>

                  <section id="changes">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">11. Changes to Terms</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      We reserve the right to modify these Terms at any time. We will provide notice of significant
                      changes via email or through the Service. Continued use of the Service after changes constitutes
                      acceptance of the modified Terms.
                    </p>
                  </section>

                  <section id="contact">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">12. Contact Information</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      If you have questions about these Terms, please contact us at:
                    </p>
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                      <p className="text-gray-600 dark:text-gray-400">
                        Fred Carey Legal Team<br />
                        Email: legal@fredcarey.com<br />
                        Address: 123 Innovation Drive, San Francisco, CA 94102
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
