"use client";

import { motion } from "framer-motion";
import { GlassCard3D } from "@/components/premium/Card3D";
import { GradientBg, FloatingOrbs } from "@/components/premium/GradientBg";
import { useState } from "react";

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
    <div className="relative min-h-screen overflow-hidden bg-background">
      <GradientBg variant="radial" />
      <FloatingOrbs />

      <div className="relative z-10 container mx-auto px-4 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-blue-400 to-purple-500 bg-clip-text text-transparent">
            Terms of Service
          </h1>
          <p className="text-lg text-muted-foreground">
            Last updated: December 27, 2024
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-1"
          >
            <GlassCard3D className="p-6 sticky top-24">
              <h3 className="font-bold mb-4">Table of Contents</h3>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`block w-full text-left px-3 py-2 rounded-lg transition-colors text-sm
                      ${activeSection === section.id 
                        ? "bg-primary/10 text-primary font-medium" 
                        : "hover:bg-background/50 text-muted-foreground"
                      }`}
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            </GlassCard3D>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="lg:col-span-3"
          >
            <GlassCard3D className="p-8 md:p-12">
              <div className="prose prose-lg dark:prose-invert max-w-none space-y-12">
                <section id="acceptance">
                  <h2 className="text-3xl font-bold mb-4">1. Acceptance of Terms</h2>
                  <p className="text-muted-foreground">
                    By accessing and using Decision OS ("Service"), you accept and agree to be bound by the terms 
                    and provision of this agreement. If you do not agree to these Terms of Service, please do not 
                    use the Service.
                  </p>
                </section>

                <section id="description">
                  <h2 className="text-3xl font-bold mb-4">2. Description of Service</h2>
                  <p className="text-muted-foreground mb-4">
                    Decision OS provides a comprehensive decision-making platform designed for founders and executives. 
                    The Service includes various tools, frameworks, and analytics to support business decision-making processes.
                  </p>
                  <p className="text-muted-foreground">
                    We reserve the right to modify, suspend, or discontinue the Service at any time without notice.
                  </p>
                </section>

                <section id="account">
                  <h2 className="text-3xl font-bold mb-4">3. Account Registration</h2>
                  <p className="text-muted-foreground mb-4">
                    To access certain features of the Service, you must register for an account. You agree to:
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>Provide accurate and complete information during registration</li>
                    <li>Maintain the security of your account credentials</li>
                    <li>Promptly update your account information if it changes</li>
                    <li>Accept responsibility for all activities under your account</li>
                    <li>Notify us immediately of any unauthorized use</li>
                  </ul>
                </section>

                <section id="use">
                  <h2 className="text-3xl font-bold mb-4">4. Use of Service</h2>
                  <p className="text-muted-foreground mb-4">You agree to use the Service only for lawful purposes. You must not:</p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>Violate any applicable laws or regulations</li>
                    <li>Infringe on intellectual property rights</li>
                    <li>Transmit harmful code or malware</li>
                    <li>Attempt to gain unauthorized access to systems</li>
                    <li>Use the Service to harm, threaten, or harass others</li>
                    <li>Scrape, copy, or reverse engineer the Service</li>
                  </ul>
                </section>

                <section id="payment">
                  <h2 className="text-3xl font-bold mb-4">5. Payment and Billing</h2>
                  <p className="text-muted-foreground mb-4">
                    Paid subscriptions are billed in advance on a recurring basis. You agree to:
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>Provide current and accurate billing information</li>
                    <li>Pay all fees when due</li>
                    <li>Update payment methods if they expire or become invalid</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    Refunds are handled on a case-by-case basis. Subscription fees are non-refundable except 
                    where required by law.
                  </p>
                </section>

                <section id="intellectual">
                  <h2 className="text-3xl font-bold mb-4">6. Intellectual Property</h2>
                  <p className="text-muted-foreground mb-4">
                    The Service and its original content, features, and functionality are owned by Decision OS 
                    and are protected by international copyright, trademark, and other intellectual property laws.
                  </p>
                  <p className="text-muted-foreground">
                    You retain ownership of content you create using the Service. By using the Service, you grant 
                    us a license to use, store, and process your content to provide the Service.
                  </p>
                </section>

                <section id="privacy">
                  <h2 className="text-3xl font-bold mb-4">7. Privacy and Data Protection</h2>
                  <p className="text-muted-foreground">
                    Your use of the Service is also governed by our Privacy Policy. We are committed to protecting 
                    your data and complying with applicable data protection regulations, including GDPR and CCPA.
                  </p>
                </section>

                <section id="termination">
                  <h2 className="text-3xl font-bold mb-4">8. Termination</h2>
                  <p className="text-muted-foreground mb-4">
                    We may terminate or suspend your account and access to the Service immediately, without prior 
                    notice or liability, for any reason, including breach of these Terms.
                  </p>
                  <p className="text-muted-foreground">
                    You may cancel your account at any time through your account settings or by contacting support.
                  </p>
                </section>

                <section id="disclaimer">
                  <h2 className="text-3xl font-bold mb-4">9. Disclaimer of Warranties</h2>
                  <p className="text-muted-foreground">
                    THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER 
                    EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
                  </p>
                </section>

                <section id="limitation">
                  <h2 className="text-3xl font-bold mb-4">10. Limitation of Liability</h2>
                  <p className="text-muted-foreground">
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, DECISION OS SHALL NOT BE LIABLE FOR ANY INDIRECT, 
                    INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES.
                  </p>
                </section>

                <section id="changes">
                  <h2 className="text-3xl font-bold mb-4">11. Changes to Terms</h2>
                  <p className="text-muted-foreground">
                    We reserve the right to modify these Terms at any time. We will provide notice of significant 
                    changes via email or through the Service. Continued use of the Service after changes constitutes 
                    acceptance of the modified Terms.
                  </p>
                </section>

                <section id="contact">
                  <h2 className="text-3xl font-bold mb-4">12. Contact Information</h2>
                  <p className="text-muted-foreground">
                    If you have questions about these Terms, please contact us at:
                  </p>
                  <div className="mt-4 p-4 bg-background/50 rounded-lg border border-border/50">
                    <p className="text-muted-foreground">
                      Decision OS Legal Team<br />
                      Email: legal@decisionos.com<br />
                      Address: 123 Innovation Drive, San Francisco, CA 94102
                    </p>
                  </div>
                </section>
              </div>
            </GlassCard3D>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
