"use client";
import { motion } from "framer-motion";

export default function Testimonials() {
  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Founder, HealthTech Startup",
      avatar: "https://i.pravatar.cc/150?img=1",
      content:
        "The Decision OS told me honestly that I wasn't ready to raise. It hurt to hear, but 6 months later I closed my seed round in 3 weeks. That honesty saved me from burning bridges.",
      rating: 5,
    },
    {
      name: "Marcus Rodriguez",
      role: "CEO, AI Infrastructure",
      avatar: "https://i.pravatar.cc/150?img=3",
      content:
        "The Investor Readiness Score changed everything. I knew exactly what to fix before my first pitch. Went from 0% response rate to 40% meeting rate in one month.",
      rating: 5,
    },
    {
      name: "Emma Thompson",
      role: "Solo Founder, B2B SaaS",
      avatar: "https://i.pravatar.cc/150?img=5",
      content:
        "The virtual team agents are like having a chief of staff. My inbox is managed, my fundraise is organized, and I can finally focus on building product.",
      rating: 5,
    },
    {
      name: "James Wilson",
      role: "First-time Founder",
      avatar: "https://i.pravatar.cc/150?img=15",
      content:
        "I started with the free tier just to think through my idea. The Reality Lens caught 3 fatal flaws I would have discovered the hard way. Worth every minute.",
      rating: 5,
    },
    {
      name: "Maria Garcia",
      role: "Founder, FinTech",
      avatar: "https://i.pravatar.cc/150?img=17",
      content:
        "Boardy connected me with the perfect Series A leads. The warm intro workflow is what convinced me to upgrade — and it paid for itself in one meeting.",
      rating: 5,
    },
    {
      name: "Kevin Lee",
      role: "Technical Founder",
      avatar: "https://i.pravatar.cc/150?img=19",
      content:
        "I'm a builder, not a fundraiser. The pitch deck review and strategy documents gave me the language and structure to communicate my vision. Closed $2M pre-seed.",
      rating: 5,
    },
    {
      name: "Sophie Anderson",
      role: "Second-time Founder",
      avatar: "https://i.pravatar.cc/150?img=21",
      content:
        "Even as an experienced founder, the weekly check-ins keep me accountable. It's like having a co-founder who never misses a beat.",
      rating: 5,
    },
    {
      name: "David Park",
      role: "Founder, Climate Tech",
      avatar: "https://i.pravatar.cc/150?img=23",
      content:
        "The Red Flag Detection caught a co-founder issue I was ignoring. Hard conversation, but saved the company. This thing is brutally honest — exactly what founders need.",
      rating: 5,
    },
    {
      name: "Elena Petrov",
      role: "Founder, EdTech",
      avatar: "https://i.pravatar.cc/150?img=25",
      content:
        "From idea validation to Series A strategy docs, this platform grew with me. The 30/60/90 planning alone is worth the subscription.",
      rating: 5,
    },
  ];

  const StarIcon = () => (
    <svg
      className="w-4 h-4 text-yellow-500"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );

  return (
    <section id="testimonials" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-20 flex flex-col gap-3"
        >
          <span className="text-sm font-medium text-primary">TESTIMONIALS</span>
          <h2 className="text-3xl font-semibold sm:text-4xl bg-linear-to-b from-foreground to-muted-foreground text-transparent bg-clip-text">
            Trusted by Founders
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground text-center">
            Real founders sharing their experience with the Decision OS.
          </p>
        </motion.div>

        <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.6,
                delay: index * 0.05,
                ease: "easeOut",
              }}
              className="break-inside-avoid mb-8"
            >
              <div className="p-6 rounded-xl bg-card border border-border transition-colors duration-300">
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i} />
                  ))}
                </div>

                <p className="text-muted-foreground mb-6 leading-relaxed text-sm">
                  &ldquo;{testimonial.content}&rdquo;
                </p>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-linear-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center text-sm font-medium border border-primary/20">
                    {testimonial.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">
                      {testimonial.name}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
