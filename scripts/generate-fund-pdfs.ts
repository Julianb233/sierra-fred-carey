import React from 'react'
import { Document, Page, Text, View, StyleSheet, renderToFile } from '@react-pdf/renderer'

const BRAND = '#ff6a1a'
const DARK = '#1a1a1a'
const GRAY = '#666666'
const LIGHT_GRAY = '#f5f5f5'
const WHITE = '#ffffff'

// ─── Investor Deck (Landscape) ───────────────────────────────────────────────

const deckStyles = StyleSheet.create({
  page: {
    width: '100%',
    height: '100%',
    backgroundColor: WHITE,
    fontFamily: 'Helvetica',
    padding: 40,
    position: 'relative',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: BRAND,
  },
  branding: {
    fontSize: 10,
    color: BRAND,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 20,
    letterSpacing: 1,
  },
  slideNumber: {
    position: 'absolute',
    bottom: 20,
    right: 40,
    fontSize: 9,
    color: GRAY,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: GRAY,
    marginBottom: 20,
  },
  body: {
    fontSize: 13,
    color: DARK,
    lineHeight: 1.6,
  },
  bullet: {
    fontSize: 13,
    color: DARK,
    lineHeight: 1.8,
    marginLeft: 12,
  },
  bigNumber: {
    fontSize: 60,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    marginVertical: 8,
  },
  medNumber: {
    fontSize: 36,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
  },
  sectionHeader: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  box: {
    border: `1.5px solid ${BRAND}`,
    borderRadius: 4,
    padding: 14,
    marginVertical: 8,
  },
  accentBox: {
    backgroundColor: LIGHT_GRAY,
    borderRadius: 4,
    padding: 14,
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row' as const,
    gap: 16,
    marginVertical: 8,
  },
  col: {
    flex: 1,
  },
  quote: {
    fontSize: 20,
    fontFamily: 'Helvetica-Oblique',
    color: BRAND,
    marginVertical: 16,
    paddingLeft: 16,
    borderLeft: `3px solid ${BRAND}`,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  statRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    marginVertical: 16,
  },
  statBlock: {
    alignItems: 'center' as const,
  },
  tableRow: {
    flexDirection: 'row' as const,
    borderBottom: '1px solid #e0e0e0',
    paddingVertical: 6,
  },
  tableHeader: {
    flexDirection: 'row' as const,
    borderBottom: `2px solid ${BRAND}`,
    paddingVertical: 6,
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
    color: DARK,
  },
  tableCellBold: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },
})

function SlideWrapper({ num, children }: React.PropsWithChildren<{ num: number }>) {
  return React.createElement(
    Page,
    { size: 'LETTER', orientation: 'landscape', style: deckStyles.page },
    React.createElement(View, { style: deckStyles.topBar }),
    React.createElement(Text, { style: deckStyles.branding }, 'A START UP BIZ'),
    children,
    React.createElement(Text, { style: deckStyles.slideNumber }, `${num} / 25`)
  )
}

function DeckTitle({ text }: { text: string }) {
  return React.createElement(Text, { style: deckStyles.title }, text)
}

function DeckSubtitle({ text }: { text: string }) {
  return React.createElement(Text, { style: deckStyles.subtitle }, text)
}

function Body({ text }: { text: string }) {
  return React.createElement(Text, { style: deckStyles.body }, text)
}

function Bullet({ items }: { items: string[] }) {
  return React.createElement(
    View,
    null,
    ...items.map((item, i) =>
      React.createElement(Text, { key: i, style: deckStyles.bullet }, `\u2022  ${item}`)
    )
  )
}

function BigNum({ text }: { text: string }) {
  return React.createElement(Text, { style: deckStyles.bigNumber }, text)
}

function MedNum({ text }: { text: string }) {
  return React.createElement(Text, { style: deckStyles.medNumber }, text)
}

function SectionHead({ text }: { text: string }) {
  return React.createElement(Text, { style: deckStyles.sectionHeader }, text)
}

function Box({ children }: { children: React.ReactNode }) {
  return React.createElement(View, { style: deckStyles.box }, children)
}

function AccentBox({ children }: { children: React.ReactNode }) {
  return React.createElement(View, { style: deckStyles.accentBox }, children)
}

function Quote({ text }: { text: string }) {
  return React.createElement(Text, { style: deckStyles.quote }, `"${text}"`)
}

function Row({ children }: { children: React.ReactNode }) {
  return React.createElement(View, { style: deckStyles.row }, children)
}

function Col({ children }: { children: React.ReactNode }) {
  return React.createElement(View, { style: deckStyles.col }, children)
}

function StatBlock({ num, label }: { num: string; label: string }) {
  return React.createElement(
    View,
    { style: deckStyles.statBlock },
    React.createElement(Text, { style: deckStyles.medNumber }, num),
    React.createElement(Text, { style: { fontSize: 11, color: GRAY, marginTop: 4 } }, label)
  )
}

function Divider() {
  return React.createElement(View, { style: deckStyles.divider })
}

// ─── Slides ──────────────────────────────────────────────────────────────────

function Slide1() {
  return React.createElement(
    SlideWrapper,
    { num: 1 },
    React.createElement(View, { style: { flex: 1, justifyContent: 'center' } },
      React.createElement(Text, { style: { fontSize: 42, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 8 } }, 'Tory R Zweigle'),
      React.createElement(Text, { style: { fontSize: 18, color: BRAND, fontFamily: 'Helvetica-Bold', marginBottom: 24 } }, 'Founder — A Start Up Biz'),
      React.createElement(View, { style: deckStyles.divider }),
      React.createElement(View, { style: deckStyles.statRow },
        React.createElement(StatBlock, { num: '40+', label: 'Years Experience' }),
        React.createElement(StatBlock, { num: '100+', label: 'Businesses Started' }),
        React.createElement(StatBlock, { num: '5', label: 'Countries' })
      ),
      React.createElement(Body, { text: 'Serial entrepreneur, product designer, manufacturer, and author with international manufacturing experience across the US, China, Vietnam, Mexico, and India.' })
    )
  )
}

function Slide2() {
  return React.createElement(
    SlideWrapper,
    { num: 2 },
    React.createElement(DeckTitle, { text: 'Published Author' }),
    React.createElement(Row, null,
      React.createElement(Col, null,
        React.createElement(Box, null,
          React.createElement(SectionHead, { text: 'Book 1' }),
          React.createElement(Text, { style: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 6 } }, 'The Art and Soul of Common Sense in Business'),
          React.createElement(Body, { text: 'Practical thinking and real-world decision making over academic theories.' })
        )
      ),
      React.createElement(Col, null,
        React.createElement(Box, null,
          React.createElement(SectionHead, { text: 'Book 2' }),
          React.createElement(Text, { style: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 6 } }, 'Wantrepreneur VS Entrepreneur'),
          React.createElement(Body, { text: 'The intellectual foundation for A Start Up Biz.' }),
          React.createElement(Bullet, { items: ['84 chapters', '300+ photographs', '100+ graphs & statistics'] })
        )
      )
    ),
    React.createElement(AccentBox, null,
      React.createElement(Body, { text: 'Published in English, Mandarin, and Spanish' })
    )
  )
}

function Slide3() {
  return React.createElement(
    SlideWrapper,
    { num: 3 },
    React.createElement(DeckTitle, { text: 'The Problem With Business Consulting' }),
    React.createElement(Body, { text: 'Thousands of individuals present themselves as business consultants who have never actually started a business themselves.' }),
    React.createElement(View, { style: { marginTop: 16 } },
      React.createElement(SectionHead, { text: 'They sell:' }),
      React.createElement(Bullet, { items: ['Motivational courses', 'Online programs', 'Coaching packages', 'Startup seminars'] })
    ),
    React.createElement(View, { style: { marginTop: 20 } },
      React.createElement(AccentBox, null,
        React.createElement(Text, { style: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: BRAND } }, 'A Start Up Biz provides experience-based advice rather than motivational theory.')
      )
    )
  )
}

function Slide4() {
  return React.createElement(
    SlideWrapper,
    { num: 4 },
    React.createElement(DeckTitle, { text: 'Experience vs Theory' }),
    React.createElement(DeckSubtitle, { text: 'Business is learned through real-world practice, not textbooks.' }),
    React.createElement(Row, null,
      React.createElement(Col, null,
        React.createElement(Box, null,
          React.createElement(Bullet, { items: ['Real financial risk', 'Operational challenges', 'Competition in real markets', 'Trial and error'] })
        )
      ),
      React.createElement(Col, null,
        React.createElement(AccentBox, null,
          React.createElement(Text, { style: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 8 } }, 'A Start Up Biz is built entirely on real entrepreneurial experience.'),
          React.createElement(Body, { text: '40+ years of hands-on startup building, not classroom theory.' })
        )
      )
    )
  )
}

function Slide5() {
  return React.createElement(
    SlideWrapper,
    { num: 5 },
    React.createElement(DeckTitle, { text: 'The Reality of Entrepreneurship' }),
    React.createElement(View, { style: { flex: 1, justifyContent: 'center', alignItems: 'center' } },
      React.createElement(Text, { style: { fontSize: 22, color: DARK, textAlign: 'center', maxWidth: 500 } }, 'Most startup businesses fail. Many individuals invest their savings into companies that had little chance of success from the beginning.')
    )
  )
}

function Slide6() {
  return React.createElement(
    SlideWrapper,
    { num: 6 },
    React.createElement(DeckTitle, { text: 'Startup Failure Statistics' }),
    React.createElement(View, { style: deckStyles.statRow },
      React.createElement(StatBlock, { num: '90%', label: 'of startups fail' }),
      React.createElement(StatBlock, { num: '20%', label: 'fail in Year 1' }),
      React.createElement(StatBlock, { num: '50%', label: 'fail in 5 years' }),
      React.createElement(StatBlock, { num: '70%', label: 'fail in 10 years' })
    )
  )
}

function Slide7() {
  return React.createElement(
    SlideWrapper,
    { num: 7 },
    React.createElement(DeckTitle, { text: 'Average Startup Financial Loss' }),
    React.createElement(View, { style: { alignItems: 'center', marginVertical: 16 } },
      React.createElement(BigNum, { text: '$202,000' }),
      React.createElement(Text, { style: { fontSize: 14, color: GRAY } }, 'Average capital invested per entrepreneur')
    ),
    React.createElement(Divider, null),
    React.createElement(SectionHead, { text: 'Capital Sources' }),
    React.createElement(Bullet, { items: ['Personal savings', 'Retirement accounts', 'Home equity loans', 'Credit cards', 'Loans from friends and family'] }),
    React.createElement(View, { style: { marginTop: 12 } },
      React.createElement(Body, { text: 'When a business fails, most of this capital is completely lost.' })
    )
  )
}

function Slide8() {
  return React.createElement(
    SlideWrapper,
    { num: 8 },
    React.createElement(DeckTitle, { text: 'The Human Cost of Business Failure' }),
    React.createElement(View, { style: { marginTop: 16 } },
      React.createElement(Row, null,
        React.createElement(Col, null,
          React.createElement(Box, null,
            React.createElement(Bullet, { items: ['Bankruptcy', 'Divorce', 'Severe stress'] })
          )
        ),
        React.createElement(Col, null,
          React.createElement(Box, null,
            React.createElement(Bullet, { items: ['Health problems', 'Damaged credit'] })
          )
        )
      )
    )
  )
}

function Slide9() {
  return React.createElement(
    SlideWrapper,
    { num: 9 },
    React.createElement(DeckTitle, { text: 'The Philosophy of A Start Up Biz' }),
    React.createElement(View, { style: { flex: 1, justifyContent: 'center' } },
      React.createElement(Quote, { text: 'Most startups should never start.' }),
      React.createElement(View, { style: { marginTop: 24 } },
        React.createElement(Body, { text: 'Many failed businesses could have been prevented if entrepreneurs received honest expert feedback before investing their money.' })
      )
    )
  )
}

function Slide10() {
  return React.createElement(
    SlideWrapper,
    { num: 10 },
    React.createElement(DeckTitle, { text: 'Top 10 Reasons Startups Fail' }),
    React.createElement(Row, null,
      React.createElement(Col, null,
        React.createElement(Bullet, { items: [
          '1.  No real market demand',
          '2.  Running out of cash',
          '3.  Weak business model',
          '4.  Lack of industry experience',
          '5.  Poor management',
        ] })
      ),
      React.createElement(Col, null,
        React.createElement(Bullet, { items: [
          '6.  Strong competition',
          '7.  Pricing mistakes',
          '8.  Weak marketing strategy',
          '9.  Expanding too quickly',
          '10. Founder burnout',
        ] })
      )
    )
  )
}

function Slide11() {
  return React.createElement(
    SlideWrapper,
    { num: 11 },
    React.createElement(DeckTitle, { text: 'A Start Up Biz Consulting Model' }),
    React.createElement(DeckSubtitle, { text: 'Two consulting paths focused on preventing failure' }),
    React.createElement(Row, null,
      React.createElement(Col, null,
        React.createElement(Box, null,
          React.createElement(SectionHead, { text: 'Path 1' }),
          React.createElement(Text, { style: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: DARK } }, 'Startup Idea Evaluation'),
          React.createElement(Body, { text: 'Expert assessment of your business idea before you invest.' })
        )
      ),
      React.createElement(Col, null,
        React.createElement(Box, null,
          React.createElement(SectionHead, { text: 'Path 2' }),
          React.createElement(Text, { style: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: DARK } }, 'Alternative Investment Strategy'),
          React.createElement(Body, { text: 'Redirect capital into proven real estate investments.' })
        )
      )
    )
  )
}

function Slide12() {
  return React.createElement(
    SlideWrapper,
    { num: 12 },
    React.createElement(DeckTitle, { text: 'Startup Idea Evaluation' }),
    React.createElement(View, { style: deckStyles.statRow },
      React.createElement(StatBlock, { num: '$1,000', label: 'Consultation Fee' }),
      React.createElement(StatBlock, { num: '30', label: 'Minutes' }),
      React.createElement(StatBlock, { num: '25', label: 'Questions' })
    ),
    React.createElement(Divider, null),
    React.createElement(Body, { text: 'Client completes a 25-question startup evaluation form. Tory provides a direct answer: Good idea or bad idea.' })
  )
}

function Slide13() {
  return React.createElement(
    SlideWrapper,
    { num: 13 },
    React.createElement(DeckTitle, { text: '"Tory Insurance"' }),
    React.createElement(View, { style: { flex: 1, justifyContent: 'center', alignItems: 'center' } },
      React.createElement(Row, null,
        React.createElement(Col, null,
          React.createElement(View, { style: { alignItems: 'center' } },
            React.createElement(MedNum, { text: '$1,000' }),
            React.createElement(Text, { style: { fontSize: 13, color: GRAY, marginTop: 4 } }, 'Expert advice')
          )
        ),
        React.createElement(Col, null,
          React.createElement(View, { style: { alignItems: 'center' } },
            React.createElement(Text, { style: { fontSize: 30, color: DARK } }, 'saves')
          )
        ),
        React.createElement(Col, null,
          React.createElement(View, { style: { alignItems: 'center' } },
            React.createElement(MedNum, { text: '$202,000' }),
            React.createElement(Text, { style: { fontSize: 13, color: GRAY, marginTop: 4 } }, 'Average startup loss')
          )
        )
      ),
      React.createElement(View, { style: { marginTop: 24 } },
        React.createElement(AccentBox, null,
          React.createElement(Body, { text: 'Acts as a form of entrepreneurship insurance — protecting founders from catastrophic financial loss.' })
        )
      )
    )
  )
}

function Slide14() {
  return React.createElement(
    SlideWrapper,
    { num: 14 },
    React.createElement(DeckTitle, { text: 'Real Consulting Results' }),
    React.createElement(View, { style: { flex: 1, justifyContent: 'center' } },
      React.createElement(View, { style: { alignItems: 'center' } },
        React.createElement(BigNum, { text: '57' }),
        React.createElement(Text, { style: { fontSize: 16, color: DARK } }, 'Consultations completed')
      ),
      React.createElement(Divider, null),
      React.createElement(AccentBox, null,
        React.createElement(Text, { style: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: DARK, textAlign: 'center' } }, 'All 57 individuals were advised not to start their businesses.')
      )
    )
  )
}

function Slide15() {
  return React.createElement(
    SlideWrapper,
    { num: 15 },
    React.createElement(DeckTitle, { text: 'What Clients Asked Next' }),
    React.createElement(View, { style: { flex: 1, justifyContent: 'center' } },
      React.createElement(Quote, { text: 'What should we do with our money instead?' }),
      React.createElement(View, { style: { marginTop: 24 } },
        React.createElement(Body, { text: 'This question from consulting clients led directly to the creation of the second consulting path — alternative investment strategy.' })
      )
    )
  )
}

function Slide16() {
  return React.createElement(
    SlideWrapper,
    { num: 16 },
    React.createElement(DeckTitle, { text: 'Real Estate as an Alternative' }),
    React.createElement(DeckSubtitle, { text: 'A proven wealth-building strategy' }),
    React.createElement(Row, null,
      React.createElement(Col, null,
        React.createElement(Box, null,
          React.createElement(Bullet, { items: ['Rental income', 'Long-term appreciation'] })
        )
      ),
      React.createElement(Col, null,
        React.createElement(Box, null,
          React.createElement(Bullet, { items: ['Equity growth', 'Financial stability'] })
        )
      )
    )
  )
}

function Slide17() {
  return React.createElement(
    SlideWrapper,
    { num: 17 },
    React.createElement(DeckTitle, { text: 'Real Estate Investment Fund' }),
    React.createElement(View, { style: deckStyles.statRow },
      React.createElement(StatBlock, { num: '28', label: 'Interested Clients' }),
      React.createElement(StatBlock, { num: '$200K', label: 'Average Investment' }),
      React.createElement(StatBlock, { num: '$5.4M', label: 'Initial Capital Pool' })
    ),
    React.createElement(Divider, null),
    React.createElement(Body, { text: 'From the first 57 consultations, 28 clients expressed interest in a pooled real estate investment fund.' })
  )
}

function Slide18() {
  return React.createElement(
    SlideWrapper,
    { num: 18 },
    React.createElement(DeckTitle, { text: 'Investment Strategy' }),
    React.createElement(DeckSubtitle, { text: 'Small commercial warehouses' }),
    React.createElement(Box, null,
      React.createElement(Bullet, { items: [
        'Typical size: 1,000 - 2,000 square feet',
        'Target tenants: contractors, storage companies',
        'E-commerce businesses, small service companies',
        'Stable demand, lower volatility than residential',
      ] })
    )
  )
}

function Slide19() {
  return React.createElement(
    SlideWrapper,
    { num: 19 },
    React.createElement(DeckTitle, { text: 'Three Revenue Streams' }),
    React.createElement(Row, null,
      React.createElement(Col, null,
        React.createElement(Box, null,
          React.createElement(SectionHead, { text: 'Stream 1' }),
          React.createElement(Text, { style: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: DARK } }, 'Book Sales')
        )
      ),
      React.createElement(Col, null,
        React.createElement(Box, null,
          React.createElement(SectionHead, { text: 'Stream 2' }),
          React.createElement(Text, { style: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: DARK } }, 'Startup Consulting')
        )
      ),
      React.createElement(Col, null,
        React.createElement(Box, null,
          React.createElement(SectionHead, { text: 'Stream 3' }),
          React.createElement(Text, { style: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: DARK } }, 'RE Investment Fund')
        )
      )
    )
  )
}

function Slide20() {
  return React.createElement(
    SlideWrapper,
    { num: 20 },
    React.createElement(DeckTitle, { text: 'Book Revenue Model' }),
    React.createElement(View, { style: deckStyles.statRow },
      React.createElement(StatBlock, { num: '50K', label: 'Books / Month' }),
      React.createElement(StatBlock, { num: '$24.95', label: 'Retail Price' })
    ),
    React.createElement(Divider, null),
    React.createElement(View, { style: deckStyles.statRow },
      React.createElement(StatBlock, { num: '$1.25M', label: 'Monthly Revenue' }),
      React.createElement(StatBlock, { num: '$14.97M', label: 'Annual Revenue' })
    )
  )
}

function Slide21() {
  return React.createElement(
    SlideWrapper,
    { num: 21 },
    React.createElement(DeckTitle, { text: 'Consulting Revenue Model' }),
    React.createElement(View, { style: deckStyles.statRow },
      React.createElement(StatBlock, { num: '$1,000', label: 'Per Consultation' }),
      React.createElement(StatBlock, { num: '20/day', label: 'Max Capacity' }),
      React.createElement(StatBlock, { num: '400', label: 'Monthly Consults' })
    ),
    React.createElement(Divider, null),
    React.createElement(View, { style: deckStyles.statRow },
      React.createElement(StatBlock, { num: '$400K', label: 'Monthly Revenue' }),
      React.createElement(StatBlock, { num: '$4.8M', label: 'Annual Revenue' })
    )
  )
}

function Slide22() {
  return React.createElement(
    SlideWrapper,
    { num: 22 },
    React.createElement(DeckTitle, { text: 'Fund Growth Potential' }),
    React.createElement(View, { style: deckStyles.statRow },
      React.createElement(StatBlock, { num: '50%', label: 'Clients Who Invest' }),
      React.createElement(StatBlock, { num: '200', label: 'Investors / Month' }),
      React.createElement(StatBlock, { num: '$200K', label: 'Avg Investment' })
    ),
    React.createElement(Divider, null),
    React.createElement(View, { style: deckStyles.statRow },
      React.createElement(StatBlock, { num: '$40M', label: 'Monthly Capital' }),
      React.createElement(StatBlock, { num: '$480M', label: 'Annual Capital Raised' })
    )
  )
}

function Slide23() {
  return React.createElement(
    SlideWrapper,
    { num: 23 },
    React.createElement(DeckTitle, { text: 'Three-Year Financial Projection' }),
    React.createElement(View, { style: { marginTop: 16 } },
      // Header
      React.createElement(View, { style: deckStyles.tableHeader },
        React.createElement(Text, { style: deckStyles.tableCellBold }, ''),
        React.createElement(Text, { style: deckStyles.tableCellBold }, 'Year 1'),
        React.createElement(Text, { style: deckStyles.tableCellBold }, 'Year 2'),
        React.createElement(Text, { style: deckStyles.tableCellBold }, 'Year 3')
      ),
      React.createElement(View, { style: deckStyles.tableRow },
        React.createElement(Text, { style: deckStyles.tableCell }, 'Book Sales'),
        React.createElement(Text, { style: deckStyles.tableCell }, '$14,970,000'),
        React.createElement(Text, { style: deckStyles.tableCell }, '-'),
        React.createElement(Text, { style: deckStyles.tableCell }, '-')
      ),
      React.createElement(View, { style: deckStyles.tableRow },
        React.createElement(Text, { style: deckStyles.tableCell }, 'Consulting'),
        React.createElement(Text, { style: deckStyles.tableCell }, '$4,800,000'),
        React.createElement(Text, { style: deckStyles.tableCell }, '-'),
        React.createElement(Text, { style: deckStyles.tableCell }, '-')
      ),
      React.createElement(View, { style: deckStyles.tableRow },
        React.createElement(Text, { style: deckStyles.tableCell }, 'Fund Management'),
        React.createElement(Text, { style: deckStyles.tableCell }, '$2,000,000'),
        React.createElement(Text, { style: deckStyles.tableCell }, '-'),
        React.createElement(Text, { style: deckStyles.tableCell }, '-')
      ),
      React.createElement(View, { style: { ...deckStyles.tableRow, borderBottom: `2px solid ${BRAND}` } },
        React.createElement(Text, { style: deckStyles.tableCellBold }, 'Total Revenue'),
        React.createElement(Text, { style: { ...deckStyles.tableCellBold, color: BRAND } }, '$21,770,000'),
        React.createElement(Text, { style: { ...deckStyles.tableCellBold, color: BRAND } }, '$29,000,000'),
        React.createElement(Text, { style: { ...deckStyles.tableCellBold, color: BRAND } }, '$40,000,000')
      )
    )
  )
}

function Slide24() {
  return React.createElement(
    SlideWrapper,
    { num: 24 },
    React.createElement(DeckTitle, { text: 'Mission' }),
    React.createElement(View, { style: { flex: 1, justifyContent: 'center' } },
      React.createElement(Body, { text: 'Protect entrepreneurs from making catastrophic financial mistakes.' }),
      React.createElement(View, { style: { marginTop: 24 } },
        React.createElement(Row, null,
          React.createElement(Col, null,
            React.createElement(View, { style: { alignItems: 'center' } },
              React.createElement(MedNum, { text: '1,000' }),
              React.createElement(Text, { style: { fontSize: 12, color: GRAY, marginTop: 4 } }, 'Failed startups prevented / year')
            )
          ),
          React.createElement(Col, null,
            React.createElement(View, { style: { alignItems: 'center' } },
              React.createElement(MedNum, { text: '$200M+' }),
              React.createElement(Text, { style: { fontSize: 12, color: GRAY, marginTop: 4 } }, 'In capital saved')
            )
          )
        )
      )
    )
  )
}

function Slide25() {
  return React.createElement(
    SlideWrapper,
    { num: 25 },
    React.createElement(DeckTitle, { text: 'Vision' }),
    React.createElement(DeckSubtitle, { text: 'A Start Up Biz aims to become:' }),
    React.createElement(View, { style: { marginTop: 8 } },
      React.createElement(Box, null,
        React.createElement(Text, { style: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 4 } }, 'The world\'s most honest startup advisory platform')
      ),
      React.createElement(Box, null,
        React.createElement(Text, { style: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 4 } }, 'A global entrepreneurship education brand')
      ),
      React.createElement(Box, null,
        React.createElement(Text, { style: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 4 } }, 'A major real estate investment fund')
      )
    ),
    React.createElement(View, { style: { marginTop: 16 } },
      React.createElement(AccentBox, null,
        React.createElement(Text, { style: { fontSize: 12, color: GRAY } }, 'Contact: toryzz@msn.com')
      )
    )
  )
}

function InvestorDeck() {
  return React.createElement(
    Document,
    null,
    React.createElement(Slide1, null),
    React.createElement(Slide2, null),
    React.createElement(Slide3, null),
    React.createElement(Slide4, null),
    React.createElement(Slide5, null),
    React.createElement(Slide6, null),
    React.createElement(Slide7, null),
    React.createElement(Slide8, null),
    React.createElement(Slide9, null),
    React.createElement(Slide10, null),
    React.createElement(Slide11, null),
    React.createElement(Slide12, null),
    React.createElement(Slide13, null),
    React.createElement(Slide14, null),
    React.createElement(Slide15, null),
    React.createElement(Slide16, null),
    React.createElement(Slide17, null),
    React.createElement(Slide18, null),
    React.createElement(Slide19, null),
    React.createElement(Slide20, null),
    React.createElement(Slide21, null),
    React.createElement(Slide22, null),
    React.createElement(Slide23, null),
    React.createElement(Slide24, null),
    React.createElement(Slide25, null)
  )
}

// ─── Fund Overview (Portrait letterhead) ─────────────────────────────────────

const docStyles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    padding: 60,
    paddingTop: 80,
    paddingBottom: 60,
    fontSize: 11,
    color: DARK,
    lineHeight: 1.6,
    position: 'relative',
  },
  header: {
    position: 'absolute',
    top: 24,
    left: 60,
    right: 60,
  },
  headerText: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    letterSpacing: 2,
  },
  headerLine: {
    height: 2,
    backgroundColor: BRAND,
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 60,
    right: 60,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    borderTop: `1px solid ${BRAND}`,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: GRAY,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    marginTop: 20,
    marginBottom: 8,
  },
  body: {
    fontSize: 11,
    color: DARK,
    lineHeight: 1.6,
    marginBottom: 8,
  },
  bullet: {
    fontSize: 11,
    color: DARK,
    lineHeight: 1.7,
    marginLeft: 12,
  },
  tableRow: {
    flexDirection: 'row' as const,
    borderBottom: '1px solid #e0e0e0',
    paddingVertical: 4,
  },
  tableHeader: {
    flexDirection: 'row' as const,
    borderBottom: `2px solid ${BRAND}`,
    paddingVertical: 4,
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    color: DARK,
  },
  tableCellBold: {
    flex: 1,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },
})

function DocHeader() {
  return React.createElement(
    View,
    { style: docStyles.header, fixed: true },
    React.createElement(Text, { style: docStyles.headerText }, 'A START UP BIZ'),
    React.createElement(View, { style: docStyles.headerLine })
  )
}

function DocFooter() {
  return React.createElement(
    View,
    { style: docStyles.footer, fixed: true },
    React.createElement(Text, { style: docStyles.footerText }, 'toryzz@msn.com  |  A Start Up Biz'),
    React.createElement(
      Text,
      { style: docStyles.footerText, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Page ${pageNumber} of ${totalPages}` }
    )
  )
}

function DocSection({ title }: { title: string }) {
  return React.createElement(Text, { style: docStyles.sectionTitle }, title)
}

function DocBody({ text }: { text: string }) {
  return React.createElement(Text, { style: docStyles.body }, text)
}

function DocBullet({ items }: { items: string[] }) {
  return React.createElement(
    View,
    null,
    ...items.map((item, i) =>
      React.createElement(Text, { key: i, style: docStyles.bullet }, `\u2022  ${item}`)
    )
  )
}

function FundOverview() {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'LETTER', style: docStyles.page },
      React.createElement(DocHeader, null),
      React.createElement(DocFooter, null),

      // Executive Summary
      React.createElement(DocSection, { title: 'Executive Summary' }),
      React.createElement(DocBody, { text: 'A Start Up Biz is a startup advisory and investment company founded by Tory R Zweigle, a serial entrepreneur with over 40 years of real-world business experience and more than 100 businesses started across multiple industries and countries. The company provides honest, experience-based startup consulting and operates a pooled real estate investment fund for clients whose business ideas are not viable.' }),

      // About the Founder
      React.createElement(DocSection, { title: 'About the Founder' }),
      React.createElement(DocBody, { text: 'Tory R Zweigle began his entrepreneurial journey at age 11, selling avocados from his family\'s orchard in California. Over 40+ years, he has started more than 100 businesses spanning manufacturing, restaurants, hotels, construction, automotive, retail, product design, and consulting. He has international manufacturing and supply chain relationships in the US, China, Vietnam, Mexico, and India.' }),
      React.createElement(DocBody, { text: 'Tory is the author of two books published in English, Mandarin, and Spanish:' }),
      React.createElement(DocBullet, { items: [
        'The Art and Soul of Common Sense in Business',
        'Wantrepreneur VS Entrepreneur (84 chapters, 300+ photographs, 100+ graphs)',
      ] }),

      // The Opportunity
      React.createElement(DocSection, { title: 'The Opportunity' }),
      React.createElement(DocBody, { text: 'Approximately 90% of startups fail. The average entrepreneur invests $202,000 from personal savings, retirement accounts, home equity, credit cards, and loans from family and friends. When these businesses fail, the capital is almost entirely lost, often leading to bankruptcy, divorce, severe stress, and health problems.' }),
      React.createElement(DocBody, { text: 'The business consulting industry is dominated by individuals who have never started a business themselves, selling motivational courses and coaching packages rather than providing honest, experience-based guidance. There is a critical need for truthful startup evaluation.' }),

      // Consulting Model
      React.createElement(DocSection, { title: 'Our Consulting Model' }),
      React.createElement(DocBody, { text: 'A Start Up Biz offers a $1,000, 30-minute startup evaluation consultation. Clients complete a 25-question evaluation form, and Tory provides a direct assessment of whether the business idea is viable. This "Tory Insurance" model can save entrepreneurs from the average $202,000 startup loss.' }),
      React.createElement(DocBody, { text: 'Results to date: 57 consultations completed. All 57 individuals were advised not to start their businesses. This 100% deflection rate demonstrates the prevalence of non-viable startup ideas and validates the need for honest advisory services.' }),

      // Real Estate Fund
      React.createElement(DocSection, { title: 'Real Estate Investment Fund' }),
      React.createElement(DocBody, { text: 'When clients are advised against starting a business, they naturally ask what to do with their capital instead. A Start Up Biz plans to launch a pooled real estate investment fund focused on acquiring small commercial warehouses (1,000-2,000 sq ft) targeting contractors, storage companies, and e-commerce businesses.' }),
      React.createElement(DocBullet, { items: [
        '28 clients have expressed interest in investing',
        'Average investment: $200,000',
        'Potential initial capital pool: $5,400,000',
      ] }),
    ),

    React.createElement(
      Page,
      { size: 'LETTER', style: docStyles.page },
      React.createElement(DocHeader, null),
      React.createElement(DocFooter, null),

      // Revenue Model
      React.createElement(DocSection, { title: 'Revenue Model' }),
      React.createElement(DocBody, { text: 'A Start Up Biz generates revenue through three streams:' }),
      React.createElement(DocBullet, { items: [
        'Book Sales: 50,000 books/month at $24.95 = $14,970,000/year',
        'Startup Consulting: 400 consultations/month at $1,000 = $4,800,000/year',
        'Fund Management: estimated $2,000,000/year from fund operations',
      ] }),

      // Three-Year Projection
      React.createElement(DocSection, { title: 'Three-Year Financial Projection' }),
      React.createElement(View, { style: docStyles.tableHeader },
        React.createElement(Text, { style: docStyles.tableCellBold }, ''),
        React.createElement(Text, { style: docStyles.tableCellBold }, 'Year 1'),
        React.createElement(Text, { style: docStyles.tableCellBold }, 'Year 2'),
        React.createElement(Text, { style: docStyles.tableCellBold }, 'Year 3')
      ),
      React.createElement(View, { style: docStyles.tableRow },
        React.createElement(Text, { style: docStyles.tableCell }, 'Book Sales'),
        React.createElement(Text, { style: docStyles.tableCell }, '$14,970,000'),
        React.createElement(Text, { style: docStyles.tableCell }, '-'),
        React.createElement(Text, { style: docStyles.tableCell }, '-')
      ),
      React.createElement(View, { style: docStyles.tableRow },
        React.createElement(Text, { style: docStyles.tableCell }, 'Consulting'),
        React.createElement(Text, { style: docStyles.tableCell }, '$4,800,000'),
        React.createElement(Text, { style: docStyles.tableCell }, '-'),
        React.createElement(Text, { style: docStyles.tableCell }, '-')
      ),
      React.createElement(View, { style: docStyles.tableRow },
        React.createElement(Text, { style: docStyles.tableCell }, 'Fund Management'),
        React.createElement(Text, { style: docStyles.tableCell }, '$2,000,000'),
        React.createElement(Text, { style: docStyles.tableCell }, '-'),
        React.createElement(Text, { style: docStyles.tableCell }, '-')
      ),
      React.createElement(View, { style: { ...docStyles.tableRow, borderBottom: `2px solid ${BRAND}` } },
        React.createElement(Text, { style: docStyles.tableCellBold }, 'Total Revenue'),
        React.createElement(Text, { style: { ...docStyles.tableCellBold, color: BRAND } }, '$21,770,000'),
        React.createElement(Text, { style: { ...docStyles.tableCellBold, color: BRAND } }, '$29,000,000'),
        React.createElement(Text, { style: { ...docStyles.tableCellBold, color: BRAND } }, '$40,000,000')
      ),

      // Vision
      React.createElement(DocSection, { title: 'Our Vision' }),
      React.createElement(DocBody, { text: 'A Start Up Biz aims to become the world\'s most honest startup advisory platform, a global entrepreneurship education brand, and a major real estate investment fund. By preventing just 1,000 failed startups per year, the platform could save more than $200 million in lost capital.' }),

      // Contact
      React.createElement(DocSection, { title: 'Contact & Next Steps' }),
      React.createElement(DocBody, { text: 'To schedule a startup evaluation consultation or learn more about the investment fund, contact:' }),
      React.createElement(View, { style: { marginTop: 8 } },
        React.createElement(Text, { style: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: DARK } }, 'Tory R Zweigle'),
        React.createElement(Text, { style: { fontSize: 11, color: DARK } }, 'Founder, A Start Up Biz'),
        React.createElement(Text, { style: { fontSize: 11, color: BRAND } }, 'toryzz@msn.com'),
      )
    )
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

const OUTPUT_DIR = '/opt/agency-workspace/sierra-fred-carey/public/assets/tory'

async function main() {
  console.log('Generating investor-deck.pdf...')
  await renderToFile(
    React.createElement(InvestorDeck, null),
    `${OUTPUT_DIR}/investor-deck.pdf`
  )
  console.log('  -> investor-deck.pdf created')

  console.log('Generating fund-overview.pdf...')
  await renderToFile(
    React.createElement(FundOverview, null),
    `${OUTPUT_DIR}/fund-overview.pdf`
  )
  console.log('  -> fund-overview.pdf created')

  console.log('Done! Both PDFs saved to public/assets/tory/')
}

main().catch((err) => {
  console.error('Error generating PDFs:', err)
  process.exit(1)
})
