"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import {
  RocketIcon,
  EnterIcon,
  CheckCircledIcon,
  CursorArrowIcon,
  QuestionMarkCircledIcon,
  TwitterLogoIcon,
  LinkedInLogoIcon,
} from "@radix-ui/react-icons";

const links = [
  {
    title: "Website",
    description: "Explore Sahara's AI-powered decision OS",
    href: "/",
    icon: RocketIcon,
    gradient: "from-[#ff6a1a] to-[#ea580c]",
  },
  {
    title: "Get Started",
    description: "Begin your founder journey today",
    href: "/get-started",
    icon: EnterIcon,
    gradient: "from-[#fb923c] to-[#ff6a1a]",
  },
  {
    title: "Join Waitlist",
    description: "Early access to new features",
    href: "/waitlist",
    icon: CheckCircledIcon,
    gradient: "from-[#ff8c4a] to-[#fb923c]",
  },
  {
    title: "Pricing",
    description: "Plans for every founder stage",
    href: "/pricing",
    icon: CursorArrowIcon,
    gradient: "from-[#ea580c] to-[#c2410c]",
  },
  {
    title: "About",
    description: "Meet Fred Cary and learn our story",
    href: "/about",
    icon: QuestionMarkCircledIcon,
    gradient: "from-[#ff6a1a] to-[#fb923c]",
  },
];

const socialLinks = [
  {
    title: "Twitter",
    href: "https://twitter.com/fredcary",
    icon: TwitterLogoIcon,
  },
  {
    title: "LinkedIn",
    href: "https://linkedin.com/in/fredcary",
    icon: LinkedInLogoIcon,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 12,
    },
  },
};

const socialVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 200,
      damping: 15,
    },
  },
};

export default function LinksPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white dark:bg-gray-950">
      {/* Animated background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <motion.div
          className="absolute top-10 left-[15%] w-96 h-96 bg-[#ff6a1a]/20 rounded-full blur-[120px]"
          animate={{
            y: [0, 50, 0],
            x: [0, 30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 right-[10%] w-[28rem] h-[28rem] bg-orange-400/15 rounded-full blur-[140px]"
          animate={{
            y: [0, -60, 0],
            x: [0, -40, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#fb923c]/10 rounded-full blur-[100px]"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-2xl space-y-12"
        >
          {/* Logo and header */}
          <div className="text-center space-y-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                duration: 0.8,
                ease: "easeOut",
                delay: 0.1,
              }}
              className="flex justify-center mb-8"
            >
              <motion.div
                whileHover={{ scale: 1.05, rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-[#ff6a1a]/20 rounded-full blur-2xl animate-pulse" />
                <Image
                  src="/sahara-logo.svg"
                  alt="Sahara Logo"
                  width={120}
                  height={120}
                  className="relative drop-shadow-2xl"
                  priority
                />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="text-gradient-orange">Sahara</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
                AI-Powered Founder Operating System
              </p>
            </motion.div>

            {/* Bio section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="max-w-lg mx-auto mt-8"
            >
              <div className="glass-dark rounded-2xl p-6 border border-[#ff6a1a]/20">
                <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                  Built by <span className="font-semibold text-[#ff6a1a]">Fred Cary</span>
                  {" "}— Founder coach, startup veteran, and AI pioneer.{" "}
                  <span className="text-[#ff6a1a] font-semibold">10,000+ founders coached</span> over two decades.
                  Helping you think clearer, raise smarter, and scale faster.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Main links */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            {links.map((link, index) => (
              <motion.div key={link.href} variants={itemVariants}>
                <Link href={link.href}>
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative overflow-hidden rounded-2xl border-2 border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/50 transition-all duration-300 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm hover:shadow-2xl hover:shadow-[#ff6a1a]/20"
                  >
                    {/* Gradient background on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-r ${link.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

                    {/* Content */}
                    <div className="relative flex items-center gap-4 p-5 md:p-6">
                      {/* Icon */}
                      <motion.div
                        whileHover={{ rotate: [0, -10, 10, 0] }}
                        transition={{ duration: 0.5 }}
                        className={`flex-shrink-0 p-3 md:p-4 rounded-xl bg-gradient-to-br ${link.gradient} shadow-lg`}
                      >
                        <link.icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                      </motion.div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-[#ff6a1a] transition-colors">
                          {link.title}
                        </h3>
                        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                          {link.description}
                        </p>
                      </div>

                      {/* Arrow */}
                      <motion.div
                        animate={{ x: [0, 5, 0] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
                      >
                        <svg
                          className="w-6 h-6 text-[#ff6a1a]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </motion.div>
                    </div>

                    {/* Shimmer effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* Social links */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="flex justify-center gap-4"
          >
            {socialLinks.map((social, index) => (
              <motion.div
                key={social.href}
                variants={socialVariants}
                custom={index}
              >
                <Link
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: [0, -10, 10, 0] }}
                    whileTap={{ scale: 0.9 }}
                    className="group relative p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/50 transition-all duration-300 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm hover:shadow-xl hover:shadow-[#ff6a1a]/20"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#ff6a1a] to-[#ea580c] opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300" />
                    <social.icon className="relative w-7 h-7 text-gray-700 dark:text-gray-300 group-hover:text-[#ff6a1a] transition-colors" />
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* Footer text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="text-center"
          >
            <p className="text-sm text-gray-500 dark:text-gray-500">
              © 2024 Sahara. Built with passion for founders worldwide.
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-[#ff6a1a] rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>
    </div>
  );
}
