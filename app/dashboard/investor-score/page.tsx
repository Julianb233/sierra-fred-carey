"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  PersonIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  RocketIcon,
  TargetIcon,
  LightningBoltIcon,
  BarChartIcon,
  LayersIcon,
  StarIcon,
  CubeIcon,
  CalendarIcon,
  ArrowRightIcon,
  ReloadIcon,
} from "@radix-ui/react-icons"

interface StartupProfile {
  team: {
    founders: string
    experience: string
    advisors: string
  }
  traction: {
    revenue: string
    users: string
    growth: string
  }
  market: {
    tam: string
    competition: string
    timing: string
  }
  product: {
    differentiation: string
    moat: string
    roadmap: string
  }
  financials: {
    unitEconomics: string
    runway: string
    projections: string
  }
  legal: {
    capTable: string
    ip: string
    compliance: string
  }
  materials: {
    pitchDeck: string
    dataRoom: string
    references: string
  }
  network: {
    investors: string
    warmIntros: string
  }
}

interface ScoreResults {
  overall_score: number
  dimensions: Array<{
    name: string
    score: number
    feedback: string
    status: string
  }>
  action_items: Array<{
    priority: string
    item: string
    dimension: string
  }>
}

export default function InvestorScorePage() {
  const [step, setStep] = useState<'form' | 'results'>('form')
  const [calculating, setCalculating] = useState(false)
  const [profile, setProfile] = useState<StartupProfile>({
    team: { founders: '', experience: '', advisors: '' },
    traction: { revenue: '', users: '', growth: '' },
    market: { tam: '', competition: '', timing: '' },
    product: { differentiation: '', moat: '', roadmap: '' },
    financials: { unitEconomics: '', runway: '', projections: '' },
    legal: { capTable: '', ip: '', compliance: '' },
    materials: { pitchDeck: '', dataRoom: '', references: '' },
    network: { investors: '', warmIntros: '' }
  })
  const [results, setResults] = useState<ScoreResults | null>(null)

  const handleCalculateScore = async () => {
    setCalculating(true)
    try {
      const response = await fetch('/api/investor-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile })
      })
      const data = await response.json()

      if (data.success) {
        setResults(data.score)
        setStep('results')
        toast.success('Investor score calculated successfully!')
      } else {
        toast.error(data.error || 'Failed to calculate score')
      }
    } catch (error) {
      console.error('Error calculating score:', error)
      toast.error('Failed to calculate score. Please try again.')
    } finally {
      setCalculating(false)
    }
  }

  const updateProfile = (section: keyof StartupProfile, field: string, value: string) => {
    setProfile(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-500"
    if (score >= 60) return "text-yellow-500"
    return "text-red-500"
  }

  const getProgressColor = (score: number) => {
    if (score >= 75) return "bg-green-500"
    if (score >= 60) return "bg-yellow-500"
    return "bg-red-500"
  }

  const getPriorityBadgeColor = (priority: string) => {
    if (priority === "High") return "bg-red-500/10 text-red-500 border-red-500/20"
    if (priority === "Medium") return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
    return "bg-blue-500/10 text-blue-500 border-blue-500/20"
  }

  const getDimensionIcon = (name: string) => {
    const iconMap: Record<string, any> = {
      "Team Strength": PersonIcon,
      "Market Opportunity": TargetIcon,
      "Product-Market Fit": RocketIcon,
      "Traction & Metrics": BarChartIcon,
      "Business Model": LayersIcon,
      "Competitive Advantage": StarIcon,
      "Financials": CubeIcon,
      "Fundraising Readiness": LightningBoltIcon,
    }
    return iconMap[name] || BarChartIcon
  }

  const countStatsFromResults = () => {
    if (!results) return { strengths: 0, needsWork: 0 }
    const strengths = results.dimensions.filter(d => d.score >= 70).length
    const needsWork = results.dimensions.filter(d => d.score < 60).length
    return { strengths, needsWork }
  }

  if (step === 'form') {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Investor Readiness Assessment</h1>
            <Badge className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90 text-white border-0">
              Pro
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Complete this comprehensive questionnaire to receive your personalized investor readiness score across 8 critical dimensions.
          </p>
        </div>

        {/* Questionnaire Form */}
        <Card className="p-6">
          <Tabs defaultValue="team" className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
              <TabsTrigger value="team">Team</TabsTrigger>
              <TabsTrigger value="traction">Traction</TabsTrigger>
              <TabsTrigger value="market">Market</TabsTrigger>
              <TabsTrigger value="product">Product</TabsTrigger>
              <TabsTrigger value="financials">Financials</TabsTrigger>
              <TabsTrigger value="legal">Legal</TabsTrigger>
              <TabsTrigger value="materials">Materials</TabsTrigger>
              <TabsTrigger value="network">Network</TabsTrigger>
            </TabsList>

            {/* Team Section */}
            <TabsContent value="team" className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="founders">Founding Team Background</Label>
                <Textarea
                  id="founders"
                  placeholder="Describe your founding team's background, expertise, and how the team came together. Include relevant experience, education, and prior successes..."
                  value={profile.team.founders}
                  onChange={(e) => updateProfile('team', 'founders', e.target.value)}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience">Relevant Experience</Label>
                <Textarea
                  id="experience"
                  placeholder="Detail the team's relevant industry experience, domain expertise, and technical capabilities. What makes your team uniquely qualified to solve this problem?"
                  value={profile.team.experience}
                  onChange={(e) => updateProfile('team', 'experience', e.target.value)}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="advisors">Advisors & Support Network</Label>
                <Textarea
                  id="advisors"
                  placeholder="List your advisors, mentors, and key supporters. Include their backgrounds and how they contribute to your success..."
                  value={profile.team.advisors}
                  onChange={(e) => updateProfile('team', 'advisors', e.target.value)}
                  rows={5}
                />
              </div>
            </TabsContent>

            {/* Traction Section */}
            <TabsContent value="traction" className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="revenue">Revenue Metrics</Label>
                <Textarea
                  id="revenue"
                  placeholder="Provide current MRR/ARR, revenue growth rate, pricing model, and revenue projections. Include historical data if available..."
                  value={profile.traction.revenue}
                  onChange={(e) => updateProfile('traction', 'revenue', e.target.value)}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="users">User/Customer Metrics</Label>
                <Textarea
                  id="users"
                  placeholder="Detail total users/customers, active users, customer acquisition cost (CAC), lifetime value (LTV), and retention rates..."
                  value={profile.traction.users}
                  onChange={(e) => updateProfile('traction', 'users', e.target.value)}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="growth">Growth Trajectory</Label>
                <Textarea
                  id="growth"
                  placeholder="Describe your growth rate, key growth drivers, and what's working. Include month-over-month or year-over-year metrics..."
                  value={profile.traction.growth}
                  onChange={(e) => updateProfile('traction', 'growth', e.target.value)}
                  rows={5}
                />
              </div>
            </TabsContent>

            {/* Market Section */}
            <TabsContent value="market" className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="tam">Market Size (TAM/SAM/SOM)</Label>
                <Textarea
                  id="tam"
                  placeholder="Define your Total Addressable Market (TAM), Serviceable Addressable Market (SAM), and Serviceable Obtainable Market (SOM). Include data sources..."
                  value={profile.market.tam}
                  onChange={(e) => updateProfile('market', 'tam', e.target.value)}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="competition">Competitive Landscape</Label>
                <Textarea
                  id="competition"
                  placeholder="Identify your main competitors, their strengths/weaknesses, and how you differentiate. Include market positioning..."
                  value={profile.market.competition}
                  onChange={(e) => updateProfile('market', 'competition', e.target.value)}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timing">Market Timing & Trends</Label>
                <Textarea
                  id="timing"
                  placeholder="Why is now the right time for your solution? What market trends, regulatory changes, or technological shifts support your thesis?"
                  value={profile.market.timing}
                  onChange={(e) => updateProfile('market', 'timing', e.target.value)}
                  rows={5}
                />
              </div>
            </TabsContent>

            {/* Product Section */}
            <TabsContent value="product" className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="differentiation">Product Differentiation</Label>
                <Textarea
                  id="differentiation"
                  placeholder="What makes your product unique? Describe your key features, value proposition, and why customers choose you over alternatives..."
                  value={profile.product.differentiation}
                  onChange={(e) => updateProfile('product', 'differentiation', e.target.value)}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="moat">Defensibility & Moat</Label>
                <Textarea
                  id="moat"
                  placeholder="Describe your competitive moat. What prevents others from copying you? (Network effects, proprietary tech, data, brand, patents, etc.)"
                  value={profile.product.moat}
                  onChange={(e) => updateProfile('product', 'moat', e.target.value)}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roadmap">Product Roadmap</Label>
                <Textarea
                  id="roadmap"
                  placeholder="Share your product vision and roadmap for the next 12-24 months. What features or capabilities will you build next?"
                  value={profile.product.roadmap}
                  onChange={(e) => updateProfile('product', 'roadmap', e.target.value)}
                  rows={5}
                />
              </div>
            </TabsContent>

            {/* Financials Section */}
            <TabsContent value="financials" className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="unitEconomics">Unit Economics</Label>
                <Textarea
                  id="unitEconomics"
                  placeholder="Detail your CAC, LTV, LTV/CAC ratio, gross margin, and contribution margin. Show that your business model is economically viable..."
                  value={profile.financials.unitEconomics}
                  onChange={(e) => updateProfile('financials', 'unitEconomics', e.target.value)}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="runway">Burn Rate & Runway</Label>
                <Textarea
                  id="runway"
                  placeholder="Current cash on hand, monthly burn rate, and runway. How long can you operate at current burn? What are your key expense drivers?"
                  value={profile.financials.runway}
                  onChange={(e) => updateProfile('financials', 'runway', e.target.value)}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projections">Financial Projections</Label>
                <Textarea
                  id="projections"
                  placeholder="Provide 3-year financial projections including revenue, expenses, headcount, and path to profitability. What are your key assumptions?"
                  value={profile.financials.projections}
                  onChange={(e) => updateProfile('financials', 'projections', e.target.value)}
                  rows={5}
                />
              </div>
            </TabsContent>

            {/* Legal Section */}
            <TabsContent value="legal" className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="capTable">Capitalization Table</Label>
                <Textarea
                  id="capTable"
                  placeholder="Current ownership structure, previous funding rounds, investor list, and equity distribution. Any convertible notes or SAFEs outstanding?"
                  value={profile.legal.capTable}
                  onChange={(e) => updateProfile('legal', 'capTable', e.target.value)}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ip">Intellectual Property</Label>
                <Textarea
                  id="ip"
                  placeholder="Patents filed or granted, trademarks, copyrights, trade secrets, and IP ownership. Are there any IP disputes or concerns?"
                  value={profile.legal.ip}
                  onChange={(e) => updateProfile('legal', 'ip', e.target.value)}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="compliance">Legal & Compliance Status</Label>
                <Textarea
                  id="compliance"
                  placeholder="Current legal entity structure, compliance status, pending litigation, regulatory requirements, and any legal risks or concerns..."
                  value={profile.legal.compliance}
                  onChange={(e) => updateProfile('legal', 'compliance', e.target.value)}
                  rows={5}
                />
              </div>
            </TabsContent>

            {/* Materials Section */}
            <TabsContent value="materials" className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="pitchDeck">Pitch Deck Quality</Label>
                <Textarea
                  id="pitchDeck"
                  placeholder="Describe your pitch deck. Is it up to date? Does it clearly articulate the problem, solution, market, traction, and ask? Link if available..."
                  value={profile.materials.pitchDeck}
                  onChange={(e) => updateProfile('materials', 'pitchDeck', e.target.value)}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataRoom">Data Room Organization</Label>
                <Textarea
                  id="dataRoom"
                  placeholder="Status of your data room. Do you have organized financials, legal docs, cap table, customer contracts, and other due diligence materials ready?"
                  value={profile.materials.dataRoom}
                  onChange={(e) => updateProfile('materials', 'dataRoom', e.target.value)}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="references">References & Social Proof</Label>
                <Textarea
                  id="references"
                  placeholder="Customer testimonials, case studies, press coverage, awards, and investor/advisor endorsements. Who can vouch for your success?"
                  value={profile.materials.references}
                  onChange={(e) => updateProfile('materials', 'references', e.target.value)}
                  rows={5}
                />
              </div>
            </TabsContent>

            {/* Network Section */}
            <TabsContent value="network" className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="investors">Investor Relationships</Label>
                <Textarea
                  id="investors"
                  placeholder="List investors you're already in conversation with, their level of interest, and any term sheets or LOIs received..."
                  value={profile.network.investors}
                  onChange={(e) => updateProfile('network', 'investors', e.target.value)}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warmIntros">Warm Introductions</Label>
                <Textarea
                  id="warmIntros"
                  placeholder="Who can introduce you to target investors? List mutual connections, advisors who will make intros, and your networking strategy..."
                  value={profile.network.warmIntros}
                  onChange={(e) => updateProfile('network', 'warmIntros', e.target.value)}
                  rows={5}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-8 flex justify-end">
            <Button
              onClick={handleCalculateScore}
              disabled={calculating}
              className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90 text-white"
              size="lg"
            >
              {calculating ? (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                  Calculating Score...
                </>
              ) : (
                <>
                  Calculate Investor Score
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Results View
  const stats = countStatsFromResults()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Investor Readiness Score</h1>
            <Badge className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90 text-white border-0">
              Pro
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Your comprehensive assessment across 8 critical dimensions that investors evaluate.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setStep('form')}
            variant="outline"
          >
            <ReloadIcon className="mr-2 h-4 w-4" />
            Recalculate
          </Button>
          <Button className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90 text-white">
            <ArrowRightIcon className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Overall Score</p>
              <p className={`text-3xl font-bold mt-1 ${getScoreColor(results?.overall_score || 0)}`}>
                {results?.overall_score || 0}/100
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <BarChartIcon className="h-6 w-6 text-yellow-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Strengths</p>
              <p className="text-3xl font-bold mt-1">{stats.strengths}/{results?.dimensions.length || 8}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircledIcon className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Areas to Improve</p>
              <p className="text-3xl font-bold mt-1">{stats.needsWork}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <CrossCircledIcon className="h-6 w-6 text-red-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="text-3xl font-bold mt-1">Today</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-[#ff6a1a]/10 flex items-center justify-center">
              <CalendarIcon className="h-6 w-6 text-[#ff6a1a]" />
            </div>
          </div>
        </Card>
      </div>

      {/* Dimensions Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Score Breakdown</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {results?.dimensions.map((dimension) => {
            const Icon = getDimensionIcon(dimension.name)
            return (
              <Card key={dimension.name} className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{dimension.name}</h3>
                      <span className={`font-bold ${getScoreColor(dimension.score)}`}>
                        {dimension.score}%
                      </span>
                    </div>
                    <Progress
                      value={dimension.score}
                      className="h-2"
                      indicatorClassName={getProgressColor(dimension.score)}
                    />
                    <p className="text-sm text-muted-foreground">
                      {dimension.feedback}
                    </p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Action Items */}
      {results?.action_items && results.action_items.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Recommended Actions</h2>
          <Card className="p-6">
            <div className="space-y-4">
              {results.action_items.map((action, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0"
                >
                  <Badge
                    variant="outline"
                    className={`shrink-0 ${getPriorityBadgeColor(action.priority)}`}
                  >
                    {action.priority}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium">{action.item}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Impact: {action.dimension}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ArrowRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Bottom CTA */}
      <Card className="p-6 bg-gradient-to-r from-[#ff6a1a]/10 to-transparent border-[#ff6a1a]/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg mb-1">Ready to improve your score?</h3>
            <p className="text-sm text-muted-foreground">
              Book a 1-on-1 session with an investor to get personalized feedback.
            </p>
          </div>
          <Button className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90 text-white">
            Book Session
          </Button>
        </div>
      </Card>
    </div>
  )
}
