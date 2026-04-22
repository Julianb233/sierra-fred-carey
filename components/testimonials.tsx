"use client";

import { motion } from "framer-motion";

export default function Testimonials() {
  return (
    <section id="testimonials" className="scroll-mt-20 relative py-24 sm:py-32 overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <motion.div
          className="absolute top-20 left-[10%] w-64 h-64 bg-[#ff6a1a]/20 rounded-full blur-[100px]"
          animate={{ y: [0, 40, 0], x: [0, 20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 right-[15%] w-80 h-80 bg-orange-400/15 rounded-full blur-[120px]"
          animate={{ y: [0, -50, 0], x: [0, -30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 left-[50%] w-72 h-72 bg-amber-500/15 rounded-full blur-[100px]"
          animate={{ y: [0, 30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Social proof banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="relative bg-white dark:bg-gray-950 rounded-2xl p-8 sm:p-12 border border-gray-200 dark:border-gray-800 text-center overflow-hidden shadow-lg">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#ff6a1a]/5 via-transparent to-orange-400/5" />

            <div className="relative z-10">
              <h3 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900 dark:text-white">
                Join <span className="text-[#ff6a1a]">hundreds of</span> founders who think clearer
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-xl mx-auto">
                Start free. Upgrade when you&apos;re ready to raise or scale.
              </p>
              <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#ff6a1a] rounded-full" />
                  <span>$3B+ raised</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full" />
                  <span>50+ years of experience</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  <span>Hundreds of founders coached</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
