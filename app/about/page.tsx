"use client";

import { motion } from "framer-motion";
import {
  FadeUpOnScroll,
  GradientText,
  HighlightText,
  CountUp,
  StaggerContainer,
  StaggerItem
} from "@/components/premium/AnimatedText";
import {
  Parallax,
  FadeInSection,
  ScaleOnScroll,
  ParallaxHero,
  SlideReveal
} from "@/components/premium/ParallaxSection";
import { GradientBg, FloatingOrbs, GridPattern } from "@/components/premium/GradientBg";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Footer from "@/components/footer";
import Link from "next/link";
import {
  RocketIcon,
  LightningBoltIcon,
  TargetIcon,
  MixerHorizontalIcon,
  CheckCircledIcon,
  PersonIcon,
  HeartIcon
} from "@radix-ui/react-icons";

const stats = [
  { value: 10000, suffix: "+", label: "Founders Coached" },
  { value: 20, suffix: "+", label: "Years Experience" },
  { value: 100, suffix: "M+", label: "Capital Raised" },
  { value: 500, suffix: "+", label: "Startups Launched" },
];

const timeline = [
  {
    year: "2004",
    title: "The Beginning",
    description: "Started coaching founders on decision-making frameworks after selling first startup.",
    icon: RocketIcon,
  },
  {
    year: "2010",
    title: "Scaling Impact",
    description: "Developed systematic approach to founder decision-making after working with 1,000+ founders.",
    icon: TargetIcon,
  },
  {
    year: "2018",
    title: "AI Integration",
    description: "Began researching how AI could enhance founder decision-making processes.",
    icon: LightningBoltIcon,
  },
  {
    year: "2024",
    title: "Decision OS Launch",
    description: "Launched the AI-powered Founder Decision OS to democratize access to world-class decision frameworks.",
    icon: MixerHorizontalIcon,
  },
];

const values = [
  {
    icon: TargetIcon,
    title: "Clarity First",
    description: "We believe the best decisions come from absolute clarity on what matters most.",
  },
  {
    icon: LightningBoltIcon,
    title: "Speed Matters",
    description: "In startups, the cost of slow decisions compounds. We help you move fast with confidence.",
  },
  {
    icon: HeartIcon,
    title: "Founder-Centric",
    description: "Built by a founder, for founders. Every feature serves your unique journey.",
  },
  {
    icon: CheckCircledIcon,
    title: "Data-Driven",
    description: "Decisions informed by 20+ years of founder patterns, powered by AI insights.",
  },
];

export default function AboutPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10">
        <GradientBg variant="mesh" />
        <GridPattern />
      </div>

      {/* Hero Section with Parallax */}
      <ParallaxHero className="relative min-h-[90vh] flex items-center justify-center">
        <div className="relative z-20 max-w-6xl mx-auto px-4 py-20">
          <FadeUpOnScroll className="text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="inline-block"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium">
                <PersonIcon className="w-4 h-4" />
                Meet Fred Cary
              </span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              <GradientText from="from-primary" via="via-blue-500" to="to-purple-500">
                Empowering Founders
              </GradientText>
              <br />
              <span className="text-foreground">Through Better Decisions</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              After coaching <HighlightText color="primary">10,000+ founders</HighlightText> over two decades,
              I built the AI-powered decision system I wish I had when starting my first company.
            </p>

            <div className="flex flex-wrap gap-4 justify-center pt-6">
              <Button size="lg" asChild className="group">
                <Link href="#story">
                  Read My Story
                  <motion.span
                    className="ml-2"
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    →
                  </motion.span>
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#mission">Our Mission</Link>
              </Button>
            </div>
          </FadeUpOnScroll>
        </div>
      </ParallaxHero>

      {/* Stats Section */}
      <section className="relative py-20 border-y bg-card/50 backdrop-blur-sm">
        <FloatingOrbs />
        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <StaggerItem key={index}>
                <ScaleOnScroll className="text-center">
                  <div className="space-y-2">
                    <div className="text-4xl md:text-5xl font-bold">
                      <GradientText>
                        <CountUp end={stat.value} suffix={stat.suffix} duration={2.5} />
                      </GradientText>
                    </div>
                    <p className="text-sm md:text-base text-muted-foreground font-medium">
                      {stat.label}
                    </p>
                  </div>
                </ScaleOnScroll>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Story Section */}
      <section id="story" className="relative py-32">
        <div className="max-w-4xl mx-auto px-4">
          <FadeInSection>
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-4xl md:text-5xl font-bold">
                The <GradientText>Journey</GradientText>
              </h2>
              <p className="text-xl text-muted-foreground">
                From founder to coach to AI pioneer
              </p>
            </div>
          </FadeInSection>

          <div className="space-y-8">
            <FadeUpOnScroll>
              <Card className="border-2 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors">
                <CardContent className="p-8 space-y-4">
                  <p className="text-lg leading-relaxed">
                    I started my first company in 1999, fresh out of college with more passion than sense.
                    Like most founders, I made decisions by gut feeling, copying what worked for others,
                    and hoping for the best. Some decisions turned out brilliantly. Others nearly sank the company.
                  </p>
                  <p className="text-lg leading-relaxed">
                    After successfully exiting that startup, I became obsessed with understanding{" "}
                    <span className="font-semibold text-primary">why some founders consistently made better decisions than others</span>.
                    Was it pattern recognition? Mental models? Or something else entirely?
                  </p>
                </CardContent>
              </Card>
            </FadeUpOnScroll>

            <Parallax speed={0.3}>
              <FadeUpOnScroll delay={0.2}>
                <Card className="border-2 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors">
                  <CardContent className="p-8 space-y-4">
                    <p className="text-lg leading-relaxed">
                      Over the next 20 years, I had the privilege of coaching over 10,000 founders.
                      I noticed patterns emerging - certain decision frameworks worked consistently across
                      industries, stages, and founder personalities. I codified these into a systematic approach.
                    </p>
                    <p className="text-lg leading-relaxed">
                      But there was a problem: <HighlightText color="primary">scaling one-on-one coaching was impossible</HighlightText>.
                      The founders who needed help most couldn't access it. That's when I realized AI could change everything.
                    </p>
                  </CardContent>
                </Card>
              </FadeUpOnScroll>
            </Parallax>

            <FadeUpOnScroll delay={0.3}>
              <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5 backdrop-blur-sm">
                <CardContent className="p-8 space-y-4">
                  <p className="text-lg leading-relaxed">
                    <span className="font-bold text-xl text-primary">The Founder Decision OS</span> is the culmination
                    of this journey. It combines two decades of founder coaching insights with cutting-edge AI to
                    give every founder access to world-class decision-making frameworks.
                  </p>
                  <p className="text-lg leading-relaxed">
                    Not as a replacement for human judgment, but as a tool to enhance it.
                    To help you see patterns faster, avoid common pitfalls, and make decisions with confidence.
                  </p>
                </CardContent>
              </Card>
            </FadeUpOnScroll>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="relative py-32 bg-card/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4">
          <FadeInSection>
            <div className="text-center space-y-4 mb-20">
              <h2 className="text-4xl md:text-5xl font-bold">
                <GradientText>Timeline</GradientText> of Impact
              </h2>
              <p className="text-xl text-muted-foreground">
                Key milestones in the journey to Decision OS
              </p>
            </div>
          </FadeInSection>

          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/0 via-primary/50 to-primary/0 hidden md:block" />

            <div className="space-y-20">
              {timeline.map((item, index) => (
                <SlideReveal
                  key={index}
                  direction={index % 2 === 0 ? "left" : "right"}
                >
                  <div className={`flex items-center gap-8 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                    {/* Content */}
                    <div className="flex-1">
                      <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/10">
                        <CardHeader>
                          <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 rounded-lg bg-primary/10">
                              <item.icon className="w-6 h-6 text-primary" />
                            </div>
                            <span className="text-sm font-bold text-primary">{item.year}</span>
                          </div>
                          <CardTitle className="text-2xl">{item.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground leading-relaxed">
                            {item.description}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Timeline Dot */}
                    <div className="hidden md:flex items-center justify-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="w-4 h-4 rounded-full bg-primary ring-4 ring-background shadow-lg shadow-primary/50"
                      />
                    </div>

                    {/* Spacer */}
                    <div className="flex-1 hidden md:block" />
                  </div>
                </SlideReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section id="mission" className="relative py-32">
        <div className="max-w-6xl mx-auto px-4">
          <FadeInSection>
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-4xl md:text-5xl font-bold">
                Our <GradientText>Mission</GradientText>
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Democratize access to world-class decision-making frameworks for every founder
              </p>
            </div>
          </FadeInSection>

          <ScaleOnScroll className="mb-16">
            <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5 backdrop-blur-sm">
              <CardContent className="p-12 text-center space-y-6">
                <p className="text-2xl md:text-3xl font-semibold leading-relaxed">
                  "Every founder deserves access to the decision-making frameworks that
                  billion-dollar companies use - not just the privileged few."
                </p>
                <p className="text-lg text-muted-foreground">
                  — Fred Cary, Founder
                </p>
              </CardContent>
            </Card>
          </ScaleOnScroll>

          <StaggerContainer className="grid md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <StaggerItem key={index}>
                <ScaleOnScroll scaleFrom={0.9} scaleTo={1}>
                  <Card className="h-full border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/10 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
                        <value.icon className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-2xl">{value.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">
                        {value.description}
                      </p>
                    </CardContent>
                  </Card>
                </ScaleOnScroll>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Vision Section */}
      <section className="relative py-32 bg-card/30 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4">
          <FadeInSection>
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-4xl md:text-5xl font-bold">
                The <GradientText>Vision</GradientText>
              </h2>
            </div>
          </FadeInSection>

          <FadeUpOnScroll>
            <div className="space-y-6 text-lg leading-relaxed">
              <p>
                Imagine a world where every founder has instant access to decision frameworks
                refined by thousands of successful entrepreneurs. Where you can get clarity on
                your hardest decisions in minutes, not months.
              </p>
              <p>
                Where AI doesn't replace your judgment but enhances it - helping you see blind spots,
                identify patterns, and make decisions with confidence backed by data from 10,000+ founder journeys.
              </p>
              <p className="text-xl font-semibold text-primary">
                That's the world we're building with the Founder Decision OS.
              </p>
            </div>
          </FadeUpOnScroll>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32">
        <FloatingOrbs />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <ScaleOnScroll>
            <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-purple-500/5 to-blue-500/10 backdrop-blur-sm">
              <CardContent className="p-12 space-y-8">
                <h2 className="text-3xl md:text-5xl font-bold">
                  Ready to <GradientText>Transform</GradientText> Your Decision-Making?
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Join thousands of founders who are making better, faster decisions
                  with AI-powered insights.
                </p>
                <div className="flex flex-wrap gap-4 justify-center pt-4">
                  <Button size="lg" asChild>
                    <Link href="/#pricing">
                      Get Started Today
                      <motion.span
                        className="ml-2"
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        →
                      </motion.span>
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/#features">Explore Features</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </ScaleOnScroll>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
