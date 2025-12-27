import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Upload, TrendingUp, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

export default function PitchDeckReviewPage() {
  const overallScore = 74;

  const slides = [
    {
      name: 'Title Slide',
      score: 85,
      feedback: [
        'Strong company name and tagline',
        'Consider adding founder credentials'
      ],
      status: 'good'
    },
    {
      name: 'Problem Slide',
      score: 78,
      feedback: [
        'Clear problem statement',
        'Add more quantifiable pain points'
      ],
      status: 'good'
    },
    {
      name: 'Solution Slide',
      score: 70,
      feedback: [
        'Solution is well-explained',
        'Missing competitive differentiation'
      ],
      status: 'needs-work'
    },
    {
      name: 'Market Size Slide',
      score: 65,
      feedback: [
        'TAM/SAM/SOM breakdown needed',
        'Market growth rate missing'
      ],
      status: 'critical'
    }
  ];

  const objections = [
    {
      objection: 'How will you acquire customers at scale?',
      response: 'Our multi-channel strategy includes partnerships with industry leaders, content marketing, and a referral program that has shown 40% conversion in beta testing.'
    },
    {
      objection: 'What prevents competitors from copying your solution?',
      response: 'We have filed 3 patents on our core technology, built proprietary datasets over 2 years, and established exclusive partnerships with key suppliers.'
    },
    {
      objection: 'Your burn rate seems high - when will you be profitable?',
      response: 'We project profitability by Q3 2026 based on current growth trajectory. Our unit economics show positive contribution margin at 65% customer LTV/CAC ratio.'
    }
  ];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'good':
        return {
          badge: 'Good',
          variant: 'default' as const,
          icon: CheckCircle2,
          color: 'text-green-600'
        };
      case 'needs-work':
        return {
          badge: 'Needs Work',
          variant: 'secondary' as const,
          icon: AlertTriangle,
          color: 'text-yellow-600'
        };
      case 'critical':
        return {
          badge: 'Critical',
          variant: 'destructive' as const,
          icon: XCircle,
          color: 'text-red-600'
        };
      default:
        return {
          badge: 'Unknown',
          variant: 'outline' as const,
          icon: AlertTriangle,
          color: 'text-gray-600'
        };
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">Pitch Deck Review</h1>
          <Badge
            style={{ backgroundColor: '#ff6a1a' }}
            className="text-white"
          >
            Pro
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Get expert AI feedback on your pitch deck slide by slide.
        </p>
      </div>

      {/* Upload Area */}
      <Card>
        <CardContent className="pt-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-[#ff6a1a] transition-colors cursor-pointer">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium mb-2">
              Drag and drop your deck or click to browse
            </p>
            <p className="text-sm text-muted-foreground">
              Supports PDF, PPT, PPTX up to 50MB
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" style={{ color: '#ff6a1a' }} />
            Overall Deck Score
          </CardTitle>
          <CardDescription>
            Based on investor readiness criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold" style={{ color: '#ff6a1a' }}>
              {overallScore}
            </div>
            <div className="text-2xl text-muted-foreground">/100</div>
          </div>
          <Progress
            value={overallScore}
            className="mt-4 h-3"
            style={{
              // @ts-ignore
              '--progress-background': '#ff6a1a'
            }}
          />
          <p className="text-sm text-muted-foreground mt-2">
            Your deck is above average but needs refinement in key areas
          </p>
        </CardContent>
      </Card>

      {/* Slide-by-Slide Analysis */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Slide-by-Slide Analysis</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {slides.map((slide, index) => {
            const statusConfig = getStatusConfig(slide.status);
            const StatusIcon = statusConfig.icon;

            return (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{slide.name}</CardTitle>
                    <Badge variant={statusConfig.variant}>
                      {statusConfig.badge}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Score</span>
                        <span className="text-sm font-bold">{slide.score}%</span>
                      </div>
                      <Progress value={slide.score} className="h-2" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {slide.feedback.map((item, i) => (
                      <div key={i} className="flex gap-2 text-sm">
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Common Objections */}
      <Card>
        <CardHeader>
          <CardTitle>Common Investor Objections</CardTitle>
          <CardDescription>
            Be prepared for these questions with our suggested responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {objections.map((item, index) => (
            <div key={index} className="border-l-4 pl-4 py-2" style={{ borderColor: '#ff6a1a' }}>
              <p className="font-semibold mb-2">{item.objection}</p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium" style={{ color: '#ff6a1a' }}>Suggested Response: </span>
                {item.response}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Upgrade CTA */}
      <Card className="border-2" style={{ borderColor: '#ff6a1a' }}>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-bold">Unlock Full Deck Analysis</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get detailed feedback on all slides, investor-ready recommendations,
              competitive analysis, and personalized coaching to perfect your pitch.
            </p>
            <Button
              size="lg"
              style={{ backgroundColor: '#ff6a1a' }}
              className="text-white hover:opacity-90"
            >
              Upgrade to Pro - $49/month
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
