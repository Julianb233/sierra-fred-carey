"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { TwitterLogoIcon, LinkedInLogoIcon, RocketIcon } from "@radix-ui/react-icons";

const Footer = () => {
  const year = new Date().getFullYear();

  const socialLinks = [
    {
      name: "Twitter",
      href: "https://twitter.com/fredcary",
      icon: TwitterLogoIcon,
    },
    {
      name: "LinkedIn",
      href: "https://linkedin.com/in/fredcary",
      icon: LinkedInLogoIcon,
    },
  ];

  const footerLinks = [
    { name: "Pricing", href: "#pricing" },
    { name: "Features", href: "#features" },
    { name: "Testimonials", href: "#testimonials" },
    { name: "FAQ", href: "#faq" },
  ];

  return (
    <footer className="w-full bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12"
        >
          {/* Brand */}
          <div className="flex flex-col space-y-4 md:col-span-2">
            <Link
              href="/"
              className="hover:opacity-80 transition-opacity"
            >
              <Image
                src="/sahara-logo.svg"
                alt="Sahara"
                width={140}
                height={35}
                className="h-8 w-auto"
              />
            </Link>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm">
              The AI-powered decision operating system for startup founders.
              Built by Fred Cary — 10,000+ founders coached, $50M+ raised.
            </p>
            <Button
              asChild
              className="w-fit bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25 hover:shadow-[#ff6a1a]/40 transition-all"
            >
              <Link href="/get-started">
                Get Started Free
                <RocketIcon className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">Quick Links</h4>
            <div className="flex flex-col space-y-2">
              {footerLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#ff6a1a] transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Connect */}
          <div className="flex flex-col space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">Connect</h4>
            <div className="flex space-x-3">
              {socialLinks.map((social) => (
                <Button
                  key={social.name}
                  asChild
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-[#ff6a1a]/10 hover:text-[#ff6a1a] border border-gray-200 dark:border-gray-700 hover:border-[#ff6a1a]/30 transition-all"
                >
                  <Link
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.name}
                  >
                    <social.icon className="h-4 w-4" />
                  </Link>
                </Button>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Founders earn access to capital tooling by building real businesses.
            </p>
          </div>
        </motion.div>

        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400"
        >
          <span>© {year} Fred Cary. All rights reserved.</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-[#ff6a1a] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[#ff6a1a] transition-colors">Terms</Link>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
