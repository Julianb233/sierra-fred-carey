"use client";

import Image from "next/image";
import { useState } from "react";
import { RevenueChart } from "./revenue-chart";

const teamMembers = [
  {
    name: "Fred Cary",
    title: "Chairman",
    stats: "400+ startups launched | $3B+ raised | $1B+ ARR track record.",
    tagline: "Architect of institutional structure.",
    image: "/deck/fred-cary.jpg",
    initials: "FC",
  },
  {
    name: "Ira Hayes",
    title: "CEO",
    stats:
      "Multi-exit CEO | Scaled to $100M+ revenue | Expert in high-velocity monetization.",
    tagline: "Leader in intelligence deployment.",
    image: "/deck/ira-hayes.jpg",
    initials: "IH",
  },
  {
    name: "Alex De La Torre",
    title: "CPO",
    stats: "Deloitte Alum | 3x venture acquisition lead.",
    tagline: "Specialist in native brain architecture.",
    image: "/deck/alex-delatorre.png",
    initials: "AD",
  },
  {
    name: "Bill Hood",
    title: "COO",
    stats:
      "45+ years tech leadership | Expert in infrastructure and enterprise systems.",
    tagline: "Master of operational scaling.",
    image: "/deck/bill-hood.jpg",
    initials: "BH",
  },
  {
    name: "Julian Bradley",
    title: "CTO",
    stats: "AI systems architect | Core digital twin engineer.",
    tagline: "Pioneer in Sahara intelligence.",
    image: "/deck/julian-bradley.jpg",
    initials: "JB",
  },
];

function TeamMemberPhoto({
  member,
}: {
  member: (typeof teamMembers)[number];
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="aspect-square bg-slate-200 mb-4 border border-[#101828]/5 overflow-hidden grayscale hover:grayscale-0 transition-all relative">
      {failed ? (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#101828] to-[#1e293b]">
          <span className="text-5xl font-black text-white/30">
            {member.initials}
          </span>
        </div>
      ) : (
        <Image
          alt={member.name}
          src={member.image}
          fill
          className="object-cover"
          unoptimized
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export function DeckContent() {
  return (
    <div className="relative selection:bg-[#FF6A1A] selection:text-white">
      {/* Subtle dot grid background */}
      <style jsx global>{`
        .subtle-grid {
          background-image: radial-gradient(
            circle,
            #e2e8f0 0.5px,
            transparent 0.5px
          );
          background-size: 24px 24px;
        }
        .deck-slide {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
        }
        @media (max-width: 768px) {
          .deck-slide {
            padding: 6rem 1.5rem 4rem;
          }
        }
        .text-hero {
          font-size: clamp(3.5rem, 8vw, 110px);
          line-height: 0.95;
        }
        .serif {
          font-family: "Georgia", "Times New Roman", serif;
        }
        @media print {
          .deck-slide {
            width: 1600px;
            height: 900px;
            min-height: unset;
            page-break-after: always;
          }
        }
      `}</style>

      {/* Header */}
      <header className="fixed top-0 left-0 w-full p-4 md:p-8 flex justify-between items-center z-50 bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Image
            alt="Sahara"
            src="/deck/logo.svg"
            width={120}
            height={32}
            className="h-8 w-auto"
            unoptimized
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:block text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-100">
            Persistent Intelligence Core &bull; Seed Round
          </div>
          <a
            href="/SHD-2026.pdf"
            download="SHD-2026.pdf"
            className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-white bg-[#FF6A1A] hover:bg-[#B45309] transition-colors px-4 py-1.5 rounded-full flex items-center gap-1.5"
          >
            &darr; Download Deck
          </a>
        </div>
      </header>

      {/* Slide 1: Hero */}
      <section className="deck-slide text-center subtle-grid">
        <div className="max-w-6xl mx-auto w-full px-4 md:px-0">
          <div className="mb-6 md:mb-10 inline-block px-4 py-1 rounded-full border border-[#FF6A1A]/20 bg-[#FF6A1A]/5 text-[#FF6A1A] text-[10px] font-bold uppercase tracking-widest">
            Institutional Founder Intelligence
          </div>
          <h1 className="text-hero font-black tracking-tight text-[#101828] mb-10 md:mb-12">
            Building{" "}
            <span className="serif italic font-normal text-[#FF6A1A]">
              Ready
            </span>{" "}
            <br />
            Companies.
          </h1>
          <p className="text-lg md:text-2xl text-slate-500 max-w-2xl mx-auto leading-tight px-4">
            Sahara turns founder chaos <br />
            <span className="text-[#101828] font-bold">
              into institutional-grade signal.
            </span>
          </p>
        </div>
      </section>

      {/* Slide 2: The Global Signal Problem */}
      <section className="deck-slide subtle-grid">
        <div className="max-w-6xl mx-auto w-full px-4 md:px-0">
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-7">
              <h2 className="text-[#FF6A1A] text-[10px] font-bold uppercase tracking-widest mb-6">
                The Global Signal Problem
              </h2>
              <h3 className="text-4xl md:text-5xl font-bold text-[#101828] leading-[1.1] mb-8">
                VCs don&apos;t lack capital.{" "}
                <br />
                <span className="text-slate-400">
                  They lack reliable, upstream signal.
                </span>
              </h3>
              <div className="space-y-6 text-base md:text-lg text-slate-600 mb-8 max-w-xl leading-relaxed">
                <p>
                  Investors review 1,000+ deals to fund 10. Pattern recognition
                  currently happens <span className="italic">after</span>{" "}
                  capital is deployed.
                </p>
                <p>
                  Sahara becomes the pre-funding intelligence layer that
                  standardizes validation before mistakes compound.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-8 py-8 border-t border-[#101828]/5">
                <div>
                  <p className="text-3xl font-black text-[#101828]">65–75%</p>
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    VC Startups Return &lt;1x
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-black text-[#101828]">$100B</p>
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Spent on Inefficient Tools
                  </p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-5 grid grid-cols-1 gap-4 md:gap-6">
              {[
                {
                  stat: "$100B+",
                  label: "Capital lost to misallocation",
                },
                { stat: "~90%", label: "Startup failure rate" },
                {
                  stat: "<1%",
                  label: "Founders reaching institutional raise",
                },
              ].map((item) => (
                <div
                  key={item.stat}
                  className="p-8 border-l-2 border-[#FF6A1A]/20 bg-[#FAF9F6]"
                >
                  <p className="text-3xl md:text-4xl font-black text-[#101828] mb-1">
                    {item.stat}
                  </p>
                  <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Slide 3: The Sahara Brain */}
      <section className="deck-slide subtle-grid text-[#101828]">
        <div className="max-w-6xl mx-auto w-full px-4 md:px-0">
          <h2 className="text-[#FF6A1A] text-[10px] font-bold uppercase tracking-[0.3em] mb-12 md:mb-16">
            The Sahara Brain: Directed Execution
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              {
                num: "01",
                phase: "Validation",
                title: "Reality Lens",
                desc: "Validates demand and positioning through persistent behavioral mapping before capital is at risk.",
              },
              {
                num: "02",
                phase: "Scoring",
                title: "Readiness Score",
                desc: "Benchmarks founders against real institutional criteria to identify validation gaps.",
              },
              {
                num: "03",
                phase: "Build",
                title: "Construction Engine",
                desc: "Builds institutional-grade deliverables and collateral required for high-velocity fundraising.",
              },
              {
                num: "04",
                phase: "Execute",
                title: "Activation Layer",
                desc: "Deploys virtual execution agents for growth and fundraising, turning structure into motion.",
              },
            ].map((card) => (
              <div
                key={card.num}
                className="p-8 border border-[#101828]/5 bg-[#FAF9F6] shadow-sm group hover:border-[#FF6A1A]/30 transition-all"
              >
                <p className="text-[10px] font-black uppercase text-[#FF6A1A] tracking-widest mb-6">
                  {card.num} / {card.phase}
                </p>
                <h4 className="text-xl font-bold mb-4 leading-tight">
                  {card.title}
                </h4>
                <p className="text-slate-500 text-xs leading-relaxed">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                label: "Tactical Sequencing",
                text: "Daily & Weekly sequencing ensures founders execute, not wander.",
              },
              {
                label: "Drift Detection",
                text: "Detects stress and validation risks before they compound into failure.",
              },
              {
                label: "Pattern Recognition",
                text: "Cross-company learning makes the brain smarter with every interaction.",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="p-6 border-l-2 border-[#101828] bg-slate-50"
              >
                <p className="text-[9px] font-black uppercase text-slate-400 mb-2">
                  {item.label}
                </p>
                <p className="text-sm font-bold text-[#101828]">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Slide 4: Proof of Concept */}
      <section className="deck-slide subtle-grid">
        <div className="max-w-6xl mx-auto w-full px-4 md:px-0">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <h2 className="text-[#FF6A1A] text-[10px] font-bold uppercase tracking-widest mb-8">
                Proof of Concept
              </h2>
              <h3 className="text-4xl md:text-5xl font-bold text-[#101828] mb-8 leading-tight">
                Proven <br />
                Revenue POC.
              </h3>
              <p className="text-lg text-slate-500 mb-8 max-w-md">
                Sahara isn&apos;t a theory. We generated $27M using this
                structural model manually. AI now scales this institutional
                intelligence.
              </p>
              <div className="p-8 bg-white border border-[#101828]/5 shadow-sm inline-block rounded">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">
                  Pre-AI Legacy Proof
                </p>
                <p className="text-5xl font-black text-[#101828]">
                  $27,000,000
                </p>
              </div>
            </div>
            <div className="lg:col-span-6 grid grid-cols-2 gap-4 md:gap-6">
              {[
                {
                  stat: "650K",
                  category: "Followers",
                  desc: "Proprietary Distribution",
                },
                {
                  stat: "100K",
                  category: "Email Opt-ins",
                  desc: "Deep Data Ingestion",
                },
                {
                  stat: "2.5K+",
                  category: "Waitlist",
                  desc: "50% MoM Growth",
                },
                {
                  stat: "100M+",
                  category: "Views",
                  desc: "Viral Acquisition Loop",
                },
              ].map((item) => (
                <div
                  key={item.category}
                  className="p-8 border border-[#101828]/5 bg-white shadow-sm"
                >
                  <p className="text-2xl md:text-3xl font-black text-[#101828] mb-1">
                    {item.stat}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF6A1A] mb-2">
                    {item.category}
                  </p>
                  <p className="text-[10px] text-slate-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Slide 5: Revenue Engine */}
      <section className="deck-slide subtle-grid">
        <div className="max-w-6xl mx-auto w-full px-4 md:px-0">
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-4">
              <h2 className="text-[#FF6A1A] text-[10px] font-bold uppercase tracking-widest mb-8">
                The Revenue Engine
              </h2>
              <h3 className="text-4xl md:text-5xl font-bold mb-8 leading-[1.1]">
                Monetizing <br />
                Intelligence.
              </h3>
              <div className="space-y-4">
                {[
                  {
                    name: "Sahara Starter",
                    price: "Free",
                    desc: "Data ingestion for future fundability. Persistent memory capture.",
                  },
                  {
                    name: "Strategy / Raise",
                    price: "$99/mo",
                    desc: "For founders preparing to raise. Converts anxiety into structure.",
                  },
                  {
                    name: "Venture Studio",
                    price: "$249/mo",
                    desc: "Virtual execution teams. Produces the signal investors respond to.",
                  },
                ].map((tier) => (
                  <div
                    key={tier.name}
                    className="p-5 border border-[#101828]/5 bg-[#FAF9F6] relative"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-black text-sm uppercase">
                        {tier.name}
                      </h4>
                      <span className="text-[#FF6A1A] font-black text-xs">
                        {tier.price}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">{tier.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-8 p-6 md:p-10 border border-[#101828]/5 bg-[#FAF9F6] shadow-inner">
              <div className="flex justify-between items-center mb-10">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#101828]">
                  T2D3 Expansion Model
                </h4>
                <div className="flex gap-4 text-[9px] font-bold uppercase">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-[#101828]" /> Strategy ($99)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-[#475467]" /> Studio ($249)
                  </div>
                </div>
              </div>
              <div className="h-[300px] md:h-[400px]">
                <RevenueChart />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Slide 6: Reactive vs Directed */}
      <section className="deck-slide subtle-grid">
        <div className="max-w-6xl mx-auto w-full px-4 md:px-0">
          <h2 className="text-[#FF6A1A] text-[10px] font-bold uppercase tracking-widest mb-12">
            Reactive vs Directed
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 border border-[#101828]/5 opacity-50">
              <h4 className="text-lg font-bold mb-4">Generic AI Chat</h4>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Reactive and forgetful. Tools answer prompts but lack founder
                context and persistent memory.
              </p>
              <span className="text-[10px] font-bold text-red-500 uppercase">
                Non-Persistent
              </span>
            </div>
            <div className="p-8 border border-[#101828]/5 opacity-50">
              <h4 className="text-lg font-bold mb-4">Legacy Accelerators</h4>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Hyper-selective and equity-heavy. High friction, human-limited
                mentorship capacity.
              </p>
              <span className="text-[10px] font-bold text-red-500 uppercase">
                Legacy Model
              </span>
            </div>
            <div className="p-8 border-2 border-[#FF6A1A] bg-[#FF6A1A]/5">
              <h4 className="text-lg font-bold mb-4">Sahara Intelligence</h4>
              <p className="text-xs text-[#101828] font-medium leading-relaxed mb-6">
                Directed execution based on persistent middle-layer
                intelligence. Cross-company pattern recognition.
              </p>
              <span className="text-[10px] font-bold text-[#FF6A1A] uppercase">
                Institutional Standard
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Slide 7: Leadership Team */}
      <section className="deck-slide subtle-grid">
        <div className="max-w-6xl mx-auto w-full px-4 md:px-0">
          <h2 className="text-[#FF6A1A] text-[10px] font-bold uppercase tracking-widest mb-12">
            The Leadership Team
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
            {teamMembers.map((member) => (
              <div key={member.name}>
                <TeamMemberPhoto member={member} />
                <h4 className="font-bold text-lg mb-1">{member.name}</h4>
                <p className="text-[10px] font-black uppercase text-[#FF6A1A] mb-3">
                  {member.title}
                </p>
                <p className="text-[11px] text-slate-600 font-bold leading-tight mb-1">
                  {member.stats}
                </p>
                <p className="text-[10px] text-slate-400 italic">
                  {member.tagline}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Slide 8: Why Invest Now */}
      <section className="deck-slide bg-[#101828] text-white">
        <div className="max-w-6xl mx-auto w-full px-4 md:px-0">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-[#FF6A1A] text-[10px] font-bold uppercase tracking-widest mb-8">
                The Opportunity
              </h2>
              <h3 className="text-5xl md:text-7xl font-black leading-tight mb-8">
                Why Invest <br />
                Now?
              </h3>
              <p className="text-xl text-slate-400 mb-12">
                Sahara is building the intelligence layer between founders and
                capital. We are the disrupter to a disruptive industry.
              </p>
              <div className="space-y-6">
                {[
                  {
                    num: "1",
                    title: "100M+ Global Founders",
                    desc: "Massive TAM with built-in distribution dynamics.",
                  },
                  {
                    num: "2",
                    title: "Compounding Data Moat",
                    desc: "Join before scale and category lock-in.",
                  },
                  {
                    num: "3",
                    title: "Platform SaaS Dynamics",
                    desc: "Infrastructure role in the venture ecosystem.",
                  },
                ].map((item) => (
                  <div key={item.num} className="flex gap-4 items-start">
                    <div className="w-6 h-6 rounded-full bg-[#FF6A1A] flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white">
                      {item.num}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{item.title}</p>
                      <p className="text-sm text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-10 border border-white/10 bg-white/5 backdrop-blur-sm rounded-lg">
              <p className="text-[10px] font-black uppercase text-[#FF6A1A] mb-8">
                Early Matters
              </p>
              <h4 className="text-2xl font-bold mb-6 italic serif text-slate-200">
                &ldquo;We are building the upstream filter for the entire venture
                industry.&rdquo;
              </h4>
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/10">
                <div>
                  <p className="text-3xl font-black">$70M</p>
                  <p className="text-[9px] font-bold uppercase text-slate-500">
                    Y3 ARR Target
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-black">50%</p>
                  <p className="text-[9px] font-bold uppercase text-slate-500">
                    Waitlist MoM Growth
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Slide 9: The Ask */}
      <section className="deck-slide subtle-grid">
        <div className="max-w-6xl mx-auto w-full px-4 md:px-0">
          <div className="max-w-4xl mx-auto p-8 md:p-24 border border-[#101828] bg-[#FAF9F6] text-[#101828] relative">
            <div className="text-center mb-12">
              <h2 className="text-[#FF6A1A] text-[10px] font-bold uppercase tracking-widest mb-6">
                Summary of Terms
              </h2>
              <h3 className="text-6xl md:text-8xl font-black mb-8 leading-none uppercase tracking-tight">
                THE ASK
              </h3>
              <p className="text-lg text-slate-500 italic">
                Establishing the default pre-funding layer for venture
                companies.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-10 border-y border-[#101828]/10 mb-12">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Raising
                </p>
                <p className="text-5xl font-black">$2.0M</p>
                <p className="text-[10px] font-bold text-[#FF6A1A] mt-2 italic">
                  Soft Commit: $1.0M (Priced Seed)
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Valuation
                </p>
                <p className="text-5xl font-black">$10.0M</p>
                <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase">
                  Post-Money | Delaware C Corp
                </p>
              </div>
            </div>
            <div className="mb-12">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-6 text-center">
                What $2M Unlocks
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    title: "Product V2",
                    desc: "Fully operational Sahara Brain + Production-grade memory engine.",
                  },
                  {
                    title: "Growth",
                    desc: "150K registered users | 5K paying founders | Conversion validation.",
                  },
                  {
                    title: "Revenue",
                    desc: "Target $5M ARR + 3-5 Investor group partnerships.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="p-4 border border-[#101828]/5 bg-white shadow-sm"
                  >
                    <p className="font-bold text-xs mb-1 text-[#FF6A1A]">
                      {item.title}
                    </p>
                    <p className="text-[10px] leading-relaxed text-slate-500">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center pt-8">
              <div className="flex flex-col md:flex-row justify-center gap-4 md:gap-6 items-center">
                <a
                  href="mailto:ira@saharacompanies.com"
                  className="w-full md:w-auto px-10 py-5 bg-[#101828] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#FF6A1A] transition-all flex items-center justify-center gap-3"
                >
                  Contact Ira <span className="opacity-50">&rarr;</span>
                </a>
                <a
                  href="mailto:fred@saharacompanies.com"
                  className="w-full md:w-auto px-10 py-5 border-2 border-[#101828] text-[#101828] text-xs font-bold uppercase tracking-widest hover:border-[#FF6A1A] hover:text-[#FF6A1A] transition-all flex items-center justify-center gap-3"
                >
                  Contact Fred <span className="opacity-50">&rarr;</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="p-8 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 text-center border-t border-[#101828]/5 bg-[#FAF9F6]">
        Sahara Ventures 2025 &bull; Confidential &bull; www.joinsahara.com
      </footer>
    </div>
  );
}
