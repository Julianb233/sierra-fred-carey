"use client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";

export default function Faq() {
  const accordionItems = [
    {
      title: "What is the Founder Decision OS?",
      content: (
        <div className="text-gray-600 dark:text-gray-400">
          The Founder Decision OS is an AI-powered platform that helps startup founders
          think clearly, prepare for fundraising, and scale with leverage. It combines
          strategic frameworks, investor readiness tools, and AI agents to support you
          at every stage of building your company.
        </div>
      ),
    },
    {
      title: "Is fundraising positioned as success by default?",
      content: (
        <div className="text-gray-600 dark:text-gray-400">
          No. Fundraising is never positioned as success by default. Our core principle
          is that founders earn access to capital tooling by building real businesses first.
          We help you understand if and when fundraising makes sense for your specific situation.
        </div>
      ),
    },
    {
      title: "What's the difference between the tiers?",
      content: (
        <div className="text-gray-600 dark:text-gray-400">
          <strong className="text-gray-900 dark:text-white">Free:</strong> Core decision-making tools, reality lens, and red flag detection.<br />
          <strong className="text-gray-900 dark:text-white">$99/mo:</strong> Full investor lens, pitch deck reviews, strategy documents, and weekly check-ins.<br />
          <strong className="text-gray-900 dark:text-white">$249/mo:</strong> All of the above plus Boardy integration, virtual team agents, and investor outreach tools.
        </div>
      ),
    },
    {
      title: "What is Boardy integration?",
      content: (
        <div className="text-gray-600 dark:text-gray-400">
          Boardy is our investor matching and warm-intro workflow system. It helps you
          identify the right investors for your stage and sector, provides targeting
          guidance, and helps with outreach sequencing and follow-up logic.
        </div>
      ),
    },
    {
      title: "Can the AI agents replace my team?",
      content: (
        <div className="text-gray-600 dark:text-gray-400">
          Our virtual team agents are designed to augment, not replace, human judgment.
          They handle operational tasks (sprint planning, email drafts, meeting prep) so you
          can focus on strategy and building relationships. They replace scattered tools
          and some junior headcount, not your core team.
        </div>
      ),
    },
  ];

  return (
    <section id="faq" className="relative w-full bg-white dark:bg-gray-950 py-24 sm:py-28">
      {/* Background accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-1/4 right-[10%] w-64 h-64 bg-[#ff6a1a]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-[10%] w-72 h-72 bg-orange-400/15 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        whileInView={{
          y: 0,
          opacity: 1,
        }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2, type: "spring", bounce: 0 }}
        className="relative z-10 max-w-4xl mx-auto px-4 md:px-8 flex flex-col justify-center items-center"
      >
        {/* Section header */}
        <div className="flex flex-col gap-4 justify-center items-center mb-12">
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block text-sm font-semibold tracking-wider text-[#ff6a1a] bg-[#ff6a1a]/10 px-4 py-2 rounded-full border border-[#ff6a1a]/20"
          >
            FAQ
          </motion.span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white text-center">
            Frequently Asked <span className="text-[#ff6a1a]">Questions</span>
          </h2>
          <p className="max-w-xl text-gray-600 dark:text-gray-400 text-center">
            Here are some of our frequently asked questions.
          </p>
        </div>

        {/* Accordion */}
        <div className="w-full max-w-2xl">
          <Accordion type="multiple" className="w-full space-y-4">
            {accordionItems.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <AccordionItem
                  value={`item-${index}`}
                  className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-6 overflow-hidden hover:border-[#ff6a1a]/30 transition-colors"
                >
                  <AccordionTrigger className="text-left text-gray-900 dark:text-white hover:text-[#ff6a1a] py-5 font-medium">
                    {item.title}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5">
                    {item.content}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </motion.div>
    </section>
  );
}
