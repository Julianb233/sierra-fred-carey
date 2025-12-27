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
        <div className="text-muted-foreground">
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
        <div className="text-muted-foreground">
          No. Fundraising is never positioned as success by default. Our core principle
          is that founders earn access to capital tooling by building real businesses first.
          We help you understand if and when fundraising makes sense for your specific situation.
        </div>
      ),
    },
    {
      title: "What's the difference between the tiers?",
      content: (
        <div className="text-muted-foreground">
          <strong>Free:</strong> Core decision-making tools, reality lens, and red flag detection.<br />
          <strong>$99/mo:</strong> Full investor lens, pitch deck reviews, strategy documents, and weekly check-ins.<br />
          <strong>$249/mo:</strong> All of the above plus Boardy integration, virtual team agents, and investor outreach tools.
        </div>
      ),
    },
    {
      title: "What is Boardy integration?",
      content: (
        <div className="text-muted-foreground">
          Boardy is our investor matching and warm-intro workflow system. It helps you
          identify the right investors for your stage and sector, provides targeting
          guidance, and helps with outreach sequencing and follow-up logic.
        </div>
      ),
    },
    {
      title: "Can the AI agents replace my team?",
      content: (
        <div className="text-muted-foreground">
          Our virtual team agents are designed to augment, not replace, human judgment.
          They handle operational tasks (sprint planning, email drafts, meeting prep) so you
          can focus on strategy and building relationships. They replace scattered tools
          and some junior headcount, not your core team.
        </div>
      ),
    },
  ];

  return (
    <motion.section
      initial={{ y: 20, opacity: 0 }}
      whileInView={{
        y: 0,
        opacity: 1,
      }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.5, type: "spring", bounce: 0 }}
      className="relative w-full max-w-(--breakpoint-xl) mx-auto px-4 py-28 gap-5 md:px-8 flex flex-col justify-center items-center"
    >
      <div className="flex flex-col gap-3 justify-center items-center">
        <h4 className="text-2xl font-bold sm:text-3xl bg-linear-to-b from-foreground to-muted-foreground text-transparent bg-clip-text">
          FAQ
        </h4>
        <p className="max-w-xl text-muted-foreground text-center">
          Here are some of our frequently asked questions.
        </p>
      </div>
      <div className="flex w-full max-w-lg">
        <Accordion type="multiple" className="w-full">
          {accordionItems.map((item, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="text-muted-foreground"
            >
              <AccordionTrigger className="text-left">
                {item.title}
              </AccordionTrigger>
              <AccordionContent>{item.content}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </motion.section>
  );
}
